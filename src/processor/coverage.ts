import type { Element } from '@xmldom/xmldom';

import { parseXml } from '../xml/parse.js';
import type { StepExpression, XPathAst } from '../xpath/parse/ast.js';
import type {
  GlobalBinding,
  Instruction,
  StylesheetIR,
  TemplateParam,
  TemplateRule,
  WithParam,
} from '../xslt/compile/ir.js';
import { getComparableTemplateMatchPattern } from '../xslt/compile/analyze.js';
import { normalizeTemplateName } from '../xslt/eval/templateDispatch.js';

import type { TransformCoverageWarning, TransformOptions, TransformResult } from './types.js';

type NameBuckets = Map<string, Set<string>>;
type NameCounts = Map<string, Map<string, number>>;

interface CoverageManifest {
  readonly matchedElements: ReadonlyMap<string, ReadonlySet<string>>;
  readonly referencedElements: ReadonlyMap<string, ReadonlySet<string>>;
  readonly referencedAttributes: ReadonlyMap<string, ReadonlySet<string>>;
  readonly hasGenericElementHandling: boolean;
  readonly hasGenericAttributeHandling: boolean;
  readonly hasDefaultTemplateTraversal: boolean;
}

interface MutableCoverageManifest {
  readonly matchedElements: NameBuckets;
  readonly referencedElements: NameBuckets;
  readonly referencedAttributes: NameBuckets;
  hasGenericElementHandling: boolean;
  hasGenericAttributeHandling: boolean;
  hasDefaultTemplateTraversal: boolean;
}

interface SourceNameInventory {
  readonly elements: NameCounts;
  readonly attributes: NameCounts;
}

const manifestCache = new WeakMap<StylesheetIR, CoverageManifest>();

export function appendCoverageWarnings(
  ir: StylesheetIR,
  sourceXml: string,
  options: TransformOptions,
  result: TransformResult,
): TransformResult {
  if (options.coverage?.report !== true) {
    return result;
  }

  const warnings = collectCoverageWarnings(ir, sourceXml, options.coverage.minConfidence ?? 'high');
  if (warnings.length === 0) {
    return result;
  }

  return {
    ...result,
    coverageWarnings: warnings,
  };
}

function collectCoverageWarnings(
  ir: StylesheetIR,
  sourceXml: string,
  minConfidence: 'high' | 'medium',
): readonly TransformCoverageWarning[] {
  const manifest = getCoverageManifest(ir);
  const inventory = collectSourceNameInventory(sourceXml);
  const warnings: TransformCoverageWarning[] = [];

  warnings.push(...collectWarningsForNames(inventory.elements, 'element', manifest, minConfidence));
  warnings.push(
    ...collectWarningsForNames(inventory.attributes, 'attribute', manifest, minConfidence),
  );

  warnings.sort((left, right) => {
    const leftRank = confidenceRank(left.confidence);
    const rightRank = confidenceRank(right.confidence);
    if (leftRank !== rightRank) {
      return rightRank - leftRank;
    }

    if (left.nodeKind !== right.nodeKind) {
      return left.nodeKind.localeCompare(right.nodeKind);
    }

    if (left.namespaceUri !== right.namespaceUri) {
      return left.namespaceUri.localeCompare(right.namespaceUri);
    }

    return left.localName.localeCompare(right.localName);
  });

  return warnings;
}

function collectWarningsForNames(
  namesByNamespace: NameCounts,
  nodeKind: 'element' | 'attribute',
  manifest: CoverageManifest,
  minConfidence: 'high' | 'medium',
): readonly TransformCoverageWarning[] {
  const warnings: TransformCoverageWarning[] = [];

  for (const [namespaceUri, names] of namesByNamespace) {
    for (const [localName, count] of names) {
      const explicitCoverage =
        nodeKind === 'element'
          ? hasName(manifest.matchedElements, namespaceUri, localName) ||
            hasName(manifest.referencedElements, namespaceUri, localName)
          : hasName(manifest.referencedAttributes, namespaceUri, localName);
      if (explicitCoverage) {
        continue;
      }

      const confidence = classifyCoverageConfidence(nodeKind, manifest);
      if (confidenceRank(confidence) < confidenceRank(minConfidence)) {
        continue;
      }

      warnings.push({
        code: 'possible_unhandled_xml_tag',
        nodeKind,
        namespaceUri,
        localName,
        count,
        confidence,
        message: createCoverageWarningMessage(nodeKind, namespaceUri, localName, count, confidence),
      });
    }
  }

  return warnings;
}

function classifyCoverageConfidence(
  nodeKind: 'element' | 'attribute',
  manifest: CoverageManifest,
): 'high' | 'medium' {
  if (
    nodeKind === 'element'
      ? manifest.hasGenericElementHandling || manifest.hasDefaultTemplateTraversal
      : manifest.hasGenericAttributeHandling
  ) {
    return 'medium';
  }

  return 'high';
}

function createCoverageWarningMessage(
  nodeKind: 'element' | 'attribute',
  namespaceUri: string,
  localName: string,
  count: number,
  confidence: 'high' | 'medium',
): string {
  const namespaceSuffix =
    namespaceUri.length === 0 ? '' : ` in namespace ${JSON.stringify(namespaceUri)}`;
  const genericSuffix =
    confidence === 'medium' ? ' Only generic stylesheet handling was detected for this name.' : '';

  return `Input ${nodeKind} ${JSON.stringify(localName)}${namespaceSuffix} appeared ${count} time${count === 1 ? '' : 's'} without explicit stylesheet coverage.${genericSuffix}`;
}

function confidenceRank(value: 'high' | 'medium'): number {
  return value === 'high' ? 2 : 1;
}

function hasName(
  namesByNamespace: ReadonlyMap<string, ReadonlySet<string>>,
  namespaceUri: string,
  localName: string,
): boolean {
  return namesByNamespace.get(namespaceUri)?.has(localName) === true;
}

function getCoverageManifest(ir: StylesheetIR): CoverageManifest {
  const cached = manifestCache.get(ir);
  if (cached !== undefined) {
    return cached;
  }

  const manifest = buildCoverageManifest(ir);
  manifestCache.set(ir, manifest);
  return manifest;
}

function buildCoverageManifest(ir: StylesheetIR): CoverageManifest {
  const manifest: MutableCoverageManifest = {
    matchedElements: new Map<string, Set<string>>(),
    referencedElements: new Map<string, Set<string>>(),
    referencedAttributes: new Map<string, Set<string>>(),
    hasGenericElementHandling: false,
    hasGenericAttributeHandling: false,
    hasDefaultTemplateTraversal: false,
  };

  for (const globalBinding of ir.globalBindings) {
    visitGlobalBinding(globalBinding, manifest, ir);
  }

  for (const template of ir.templates) {
    visitTemplateCoverage(template, manifest, ir);
  }

  return {
    matchedElements: freezeNameBuckets(manifest.matchedElements),
    referencedElements: freezeNameBuckets(manifest.referencedElements),
    referencedAttributes: freezeNameBuckets(manifest.referencedAttributes),
    hasGenericElementHandling: manifest.hasGenericElementHandling,
    hasGenericAttributeHandling: manifest.hasGenericAttributeHandling,
    hasDefaultTemplateTraversal: manifest.hasDefaultTemplateTraversal,
  };
}

function freezeNameBuckets(
  namesByNamespace: NameBuckets,
): ReadonlyMap<string, ReadonlySet<string>> {
  return new Map(
    [...namesByNamespace.entries()]
      .sort(([leftNamespace], [rightNamespace]) => leftNamespace.localeCompare(rightNamespace))
      .map(([namespaceUri, names]) => [namespaceUri, new Set([...names].sort())]),
  );
}

function visitGlobalBinding(
  binding: GlobalBinding,
  manifest: MutableCoverageManifest,
  ir: StylesheetIR,
): void {
  if (binding.select !== undefined) {
    visitXPathCoverage(binding.select, manifest, ir);
  }
  if (binding.body !== undefined) {
    visitInstructionsCoverage(binding.body, manifest, ir);
  }
}

function visitTemplateCoverage(
  template: TemplateRule,
  manifest: MutableCoverageManifest,
  ir: StylesheetIR,
): void {
  const comparablePattern = getComparableTemplateMatchPattern(template, ir);
  if (comparablePattern !== undefined) {
    collectComparableMatchPatternCoverage(comparablePattern, manifest);
  }

  for (const param of template.params) {
    visitTemplateParamCoverage(param, manifest, ir);
  }

  visitInstructionsCoverage(template.body, manifest, ir);
}

function visitTemplateParamCoverage(
  param: TemplateParam,
  manifest: MutableCoverageManifest,
  ir: StylesheetIR,
): void {
  if (param.select !== undefined) {
    visitXPathCoverage(param.select, manifest, ir);
  }
  if (param.body !== undefined) {
    visitInstructionsCoverage(param.body, manifest, ir);
  }
}

function visitInstructionsCoverage(
  instructions: readonly Instruction[],
  manifest: MutableCoverageManifest,
  ir: StylesheetIR,
): void {
  for (const instruction of instructions) {
    switch (instruction.kind) {
      case 'literalElement':
      case 'comment':
        visitInstructionsCoverage(instruction.body, manifest, ir);
        break;
      case 'attribute':
        if (instruction.select !== undefined) {
          visitXPathCoverage(instruction.select, manifest, ir);
        }
        if (instruction.body !== undefined) {
          visitInstructionsCoverage(instruction.body, manifest, ir);
        }
        break;
      case 'if':
        visitXPathCoverage(instruction.test, manifest, ir);
        visitInstructionsCoverage(instruction.body, manifest, ir);
        break;
      case 'choose':
        for (const branch of instruction.whenBranches) {
          visitXPathCoverage(branch.test, manifest, ir);
          visitInstructionsCoverage(branch.body, manifest, ir);
        }
        if (instruction.otherwiseBody !== undefined) {
          visitInstructionsCoverage(instruction.otherwiseBody, manifest, ir);
        }
        break;
      case 'forEach':
        visitXPathCoverage(instruction.select, manifest, ir);
        visitInstructionsCoverage(instruction.body, manifest, ir);
        break;
      case 'variable':
        if (instruction.select !== undefined) {
          visitXPathCoverage(instruction.select, manifest, ir);
        }
        if (instruction.body !== undefined) {
          visitInstructionsCoverage(instruction.body, manifest, ir);
        }
        break;
      case 'callTemplate':
        visitWithParamsCoverage(instruction.withParams, manifest, ir);
        break;
      case 'applyTemplates':
        if (instruction.select === undefined) {
          manifest.hasDefaultTemplateTraversal = true;
        } else {
          visitXPathCoverage(instruction.select, manifest, ir);
          if (hasBroadTraversal(instruction.select)) {
            manifest.hasDefaultTemplateTraversal = true;
          }
        }
        visitWithParamsCoverage(instruction.withParams, manifest, ir);
        break;
      case 'valueOf':
      case 'copyOf':
        visitXPathCoverage(instruction.select, manifest, ir);
        break;
      case 'number':
        visitXPathCoverage(instruction.count, manifest, ir);
        break;
      default:
        break;
    }
  }
}

function visitWithParamsCoverage(
  withParams: readonly WithParam[],
  manifest: MutableCoverageManifest,
  ir: StylesheetIR,
): void {
  for (const withParam of withParams) {
    if (withParam.select !== undefined) {
      visitXPathCoverage(withParam.select, manifest, ir);
    }
    if (withParam.body !== undefined) {
      visitInstructionsCoverage(withParam.body, manifest, ir);
    }
  }
}

function collectComparableMatchPatternCoverage(
  pattern: NonNullable<ReturnType<typeof getComparableTemplateMatchPattern>>,
  manifest: MutableCoverageManifest,
): void {
  for (const step of pattern.steps) {
    switch (step.kind) {
      case 'name': {
        const { namespaceUri, localName } = splitClarkName(step.name);
        addName(manifest.matchedElements, namespaceUri, localName);
        break;
      }
      case 'wildcard':
      case 'node':
        manifest.hasGenericElementHandling = true;
        break;
      case 'text':
        break;
      default:
        break;
    }
  }
}

function visitXPathCoverage(
  expression: XPathAst,
  manifest: MutableCoverageManifest,
  ir: StylesheetIR,
): void {
  switch (expression.kind) {
    case 'array':
      for (const member of expression.members) {
        visitXPathCoverage(member, manifest, ir);
      }
      break;
    case 'binary':
      visitXPathCoverage(expression.left, manifest, ir);
      visitXPathCoverage(expression.right, manifest, ir);
      break;
    case 'filter':
      visitXPathCoverage(expression.base, manifest, ir);
      for (const predicate of expression.predicates) {
        visitXPathCoverage(predicate, manifest, ir);
      }
      break;
    case 'functionCall':
      for (const argument of expression.arguments) {
        visitXPathCoverage(argument, manifest, ir);
      }
      break;
    case 'if':
      visitXPathCoverage(expression.test, manifest, ir);
      visitXPathCoverage(expression.thenBranch, manifest, ir);
      visitXPathCoverage(expression.elseBranch, manifest, ir);
      break;
    case 'for':
      for (const binding of expression.bindings) {
        visitXPathCoverage(binding.value, manifest, ir);
      }
      visitXPathCoverage(expression.returnExpr, manifest, ir);
      break;
    case 'let':
      for (const binding of expression.bindings) {
        visitXPathCoverage(binding.value, manifest, ir);
      }
      visitXPathCoverage(expression.returnExpr, manifest, ir);
      break;
    case 'path':
      if (expression.base !== undefined) {
        visitXPathCoverage(expression.base, manifest, ir);
      }
      for (const step of expression.steps) {
        if (step.kind === 'step') {
          collectStepCoverage(step, manifest, ir, 'reference');
          for (const predicate of step.predicates) {
            visitXPathCoverage(predicate, manifest, ir);
          }
        } else {
          visitXPathCoverage(step, manifest, ir);
        }
      }
      break;
    case 'quantified':
      for (const binding of expression.bindings) {
        visitXPathCoverage(binding.value, manifest, ir);
      }
      visitXPathCoverage(expression.satisfiesExpr, manifest, ir);
      break;
    case 'sequence':
      for (const item of expression.items) {
        visitXPathCoverage(item, manifest, ir);
      }
      break;
    case 'unary':
      visitXPathCoverage(expression.operand, manifest, ir);
      break;
    default:
      break;
  }
}

function collectStepCoverage(
  step: StepExpression,
  manifest: MutableCoverageManifest,
  ir: StylesheetIR,
  usage: 'match' | 'reference',
): void {
  const axis = step.axis;
  const isAttribute = axis === 'attribute';
  switch (step.nodeTest.kind) {
    case 'nameTest':
      addName(
        usage === 'match' && !isAttribute
          ? manifest.matchedElements
          : isAttribute
            ? manifest.referencedAttributes
            : manifest.referencedElements,
        normalizeCoverageNamespaceUri(step.nodeTest.name, ir, axis),
        normalizeCoverageLocalName(step.nodeTest.name),
      );
      break;
    case 'wildcardTest':
      if (isAttribute) {
        manifest.hasGenericAttributeHandling = true;
      } else {
        manifest.hasGenericElementHandling = true;
      }
      break;
    case 'kindTest':
      if (!isAttribute && step.nodeTest.name === 'node') {
        manifest.hasGenericElementHandling = true;
      }
      break;
    default:
      break;
  }
}

function addName(namesByNamespace: NameBuckets, namespaceUri: string, localName: string): void {
  const names = namesByNamespace.get(namespaceUri);
  if (names !== undefined) {
    names.add(localName);
    return;
  }

  namesByNamespace.set(namespaceUri, new Set([localName]));
}

function normalizeCoverageNamespaceUri(
  name: string,
  ir: StylesheetIR,
  axis: StepExpression['axis'],
): string {
  const normalized = normalizeTemplateName(name, {
    namespaces: new Map(Object.entries(ir.namespaces)),
    defaultElementNamespace: axis === 'attribute' ? '' : ir.defaultElementNamespace,
  });
  const extracted = splitClarkName(normalized);
  return extracted.namespaceUri;
}

function normalizeCoverageLocalName(name: string): string {
  const normalized = name.startsWith('Q{')
    ? normalizeTemplateName(name, { namespaces: new Map(), defaultElementNamespace: '' })
    : name;
  return splitClarkName(normalized).localName;
}

function splitClarkName(name: string): {
  readonly namespaceUri: string;
  readonly localName: string;
} {
  if (!name.startsWith('{')) {
    return { namespaceUri: '', localName: name };
  }

  const closingBrace = name.indexOf('}');
  if (closingBrace < 0) {
    return { namespaceUri: '', localName: name };
  }

  return {
    namespaceUri: name.slice(1, closingBrace),
    localName: name.slice(closingBrace + 1),
  };
}

function hasBroadTraversal(expression: XPathAst): boolean {
  if (expression.kind !== 'path') {
    return false;
  }

  for (const step of expression.steps) {
    if (step.kind !== 'step' || step.axis === 'attribute') {
      continue;
    }

    if (step.nodeTest.kind === 'wildcardTest') {
      return true;
    }

    if (step.nodeTest.kind === 'kindTest' && step.nodeTest.name === 'node') {
      return true;
    }
  }

  return false;
}

function collectSourceNameInventory(sourceXml: string): SourceNameInventory {
  const document = parseXml(sourceXml, {
    role: 'source-document',
    sourceName: '<source-xml>',
  });
  const elements: NameCounts = new Map<string, Map<string, number>>();
  const attributes: NameCounts = new Map<string, Map<string, number>>();

  const root = document.documentElement;
  if (root !== null) {
    visitSourceElement(root, elements, attributes);
  }

  return {
    elements,
    attributes,
  };
}

function visitSourceElement(element: Element, elements: NameCounts, attributes: NameCounts): void {
  addCount(elements, element.namespaceURI ?? '', element.localName ?? element.nodeName);

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    const localName = attribute?.localName ?? attribute?.nodeName;
    if (
      localName !== undefined &&
      localName.length > 0 &&
      localName !== 'xmlns' &&
      attribute?.prefix !== 'xmlns'
    ) {
      addCount(attributes, attribute?.namespaceURI ?? '', localName);
    }
  }

  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (child?.nodeType === child.ELEMENT_NODE) {
      visitSourceElement(child as Element, elements, attributes);
    }
  }
}

function addCount(countsByNamespace: NameCounts, namespaceUri: string, localName: string): void {
  const names = countsByNamespace.get(namespaceUri);
  if (names !== undefined) {
    names.set(localName, (names.get(localName) ?? 0) + 1);
    return;
  }

  countsByNamespace.set(namespaceUri, new Map([[localName, 1]]));
}
