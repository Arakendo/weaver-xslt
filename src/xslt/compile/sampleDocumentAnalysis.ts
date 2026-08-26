import type { Element } from '@xmldom/xmldom';

import type { SourceLocation } from '../../errors/index.js';
import type {
  DiagnosticFrame,
  DiagnosticReport,
  SourceSpan as DiagnosticSourceSpan,
} from '../../diagnostics/index.js';
import type { StepExpression, XPathAst } from '../../xpath/parse/ast.js';
import type { SourceSpan as XPathSourceSpan } from '../../xpath/lex/lexer.js';
import { parseXml } from '../../xml/parse.js';
import { computeLevenshteinDistance } from '../diagnostics.js';

import { createAnalysisWarning } from './analysisDiagnostics.js';
import type { Instruction, StylesheetIR, WithParam } from './ir.js';

interface SampleDocumentNameModel {
  readonly elementNames: ReadonlyMap<string, ReadonlySet<string>>;
  readonly attributeNames: ReadonlyMap<string, ReadonlySet<string>>;
}

interface XPathExpressionContext {
  readonly expression: XPathAst;
  readonly expressionText: string;
  readonly expressionLocation: SourceLocation | undefined;
  readonly ownerName: string;
  readonly attributeName: string;
  readonly frameKind?: DiagnosticFrame['kind'];
}

export function collectSampleDocumentNameDiagnostics(
  ir: StylesheetIR,
  sampleDocument: string | undefined,
): readonly DiagnosticReport[] {
  if (sampleDocument === undefined) {
    return [];
  }

  const sampleNames = collectSampleDocumentNames(sampleDocument);
  if (sampleNames.elementNames.size === 0 && sampleNames.attributeNames.size === 0) {
    return [];
  }

  const reports: DiagnosticReport[] = [];
  for (const context of collectXPathExpressionContexts(ir)) {
    visitXPathForSampleDocumentTypos(context.expression, (step) => {
      const report = createSampleDocumentNameDiagnostic(step, context, sampleNames, ir);
      if (report !== undefined) {
        reports.push(report);
      }
    });
  }

  return reports;
}

function collectSampleDocumentNames(sampleDocument: string): SampleDocumentNameModel {
  const document = parseXml(sampleDocument, {
    role: 'source-document',
    sourceName: '<sample-document>',
  });
  const elementNames = new Map<string, Set<string>>();
  const attributeNames = new Map<string, Set<string>>();

  const visitElement = (element: Element): void => {
    const elementName = element.localName ?? element.nodeName;
    if (elementName.length > 0) {
      addSampleDocumentName(elementNames, element.namespaceURI ?? '', elementName);
    }

    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index);
      const attributeName = attribute?.localName ?? attribute?.nodeName;
      if (
        attributeName !== undefined &&
        attributeName.length > 0 &&
        attributeName !== 'xmlns' &&
        attribute?.prefix !== 'xmlns'
      ) {
        addSampleDocumentName(attributeNames, attribute?.namespaceURI ?? '', attributeName);
      }
    }

    for (let index = 0; index < element.childNodes.length; index += 1) {
      const child = element.childNodes.item(index);
      if (child?.nodeType === 1) {
        visitElement(child as Element);
      }
    }
  };

  const root = document.documentElement;
  if (root !== null) {
    visitElement(root);
  }

  return {
    elementNames,
    attributeNames,
  };
}

function addSampleDocumentName(
  namesByNamespace: Map<string, Set<string>>,
  namespaceUri: string,
  localName: string,
): void {
  const names = namesByNamespace.get(namespaceUri);
  if (names !== undefined) {
    names.add(localName);
    return;
  }

  namesByNamespace.set(namespaceUri, new Set([localName]));
}

function collectXPathExpressionContexts(ir: StylesheetIR): readonly XPathExpressionContext[] {
  const contexts: XPathExpressionContext[] = [];

  const pushContext = (
    expression: XPathAst | undefined,
    expressionText: string | undefined,
    expressionLocation: SourceLocation | undefined,
    ownerName: string,
    attributeName: string,
    frameKind?: DiagnosticFrame['kind'],
  ): void => {
    if (expression === undefined || expressionText === undefined) {
      return;
    }

    contexts.push({
      expression,
      expressionText,
      expressionLocation,
      ownerName,
      attributeName,
      ...(frameKind === undefined ? {} : { frameKind }),
    });
  };

  const visitInstructions = (instructions: readonly Instruction[]): void => {
    for (const instruction of instructions) {
      switch (instruction.kind) {
        case 'literalElement':
        case 'comment':
          visitInstructions(instruction.body);
          break;
        case 'if':
          pushContext(
            instruction.test,
            instruction.testText,
            instruction.location,
            'xsl:if',
            'test',
          );
          visitInstructions(instruction.body);
          break;
        case 'choose':
          for (const branch of instruction.whenBranches) {
            pushContext(branch.test, branch.testText, branch.location, 'xsl:when', 'test');
            visitInstructions(branch.body);
          }
          if (instruction.otherwiseBody !== undefined) {
            visitInstructions(instruction.otherwiseBody);
          }
          break;
        case 'forEach':
          pushContext(
            instruction.select,
            instruction.selectText,
            instruction.location,
            'xsl:for-each',
            'select',
          );
          visitInstructions(instruction.body);
          break;
        case 'variable':
          pushContext(
            instruction.select,
            instruction.selectText,
            instruction.location,
            'xsl:variable',
            'select',
          );
          if (instruction.body !== undefined) {
            visitInstructions(instruction.body);
          }
          break;
        case 'conditionalContent':
          pushContext(
            instruction.select,
            instruction.selectText,
            instruction.location,
            instruction.condition === 'empty' ? 'xsl:on-empty' : 'xsl:on-non-empty',
            'select',
          );
          if (instruction.body !== undefined) {
            visitInstructions(instruction.body);
          }
          break;
        case 'callTemplate':
          visitWithParams(instruction.withParams);
          break;
        case 'applyTemplates':
          pushContext(
            instruction.select,
            instruction.selectText,
            instruction.location,
            'xsl:apply-templates',
            'select',
          );
          visitWithParams(instruction.withParams);
          break;
        case 'valueOf':
          pushContext(
            instruction.select,
            instruction.selectText,
            instruction.location,
            'xsl:value-of',
            'select',
          );
          break;
        case 'sort':
          pushContext(
            instruction.select,
            instruction.selectText,
            instruction.location,
            'xsl:sort',
            'select',
          );
          break;
        default:
          break;
      }
    }
  };

  const visitWithParams = (withParams: readonly WithParam[]): void => {
    for (const withParam of withParams) {
      pushContext(
        withParam.select,
        withParam.selectText,
        withParam.location,
        'xsl:with-param',
        'select',
      );
      if (withParam.body !== undefined) {
        visitInstructions(withParam.body);
      }
    }
  };

  for (const binding of ir.globalBindings) {
    pushContext(
      binding.select,
      binding.selectText,
      binding.location,
      `xsl:${binding.kind}`,
      'select',
    );
    if (binding.body !== undefined) {
      visitInstructions(binding.body);
    }
  }

  for (const template of ir.templates) {
    pushContext(
      template.match,
      template.matchText,
      template.location,
      'xsl:template',
      'match',
      'template',
    );
    for (const param of template.params) {
      pushContext(param.select, param.selectText, param.location, 'xsl:param', 'select');
      if (param.body !== undefined) {
        visitInstructions(param.body);
      }
    }
    visitInstructions(template.body);
  }

  return contexts;
}

function visitXPathForSampleDocumentTypos(
  expression: XPathAst,
  onStep: (step: StepExpression) => void,
): void {
  switch (expression.kind) {
    case 'array':
      for (const member of expression.members) {
        visitXPathForSampleDocumentTypos(member, onStep);
      }
      break;
    case 'binary':
      visitXPathForSampleDocumentTypos(expression.left, onStep);
      visitXPathForSampleDocumentTypos(expression.right, onStep);
      break;
    case 'filter':
      visitXPathForSampleDocumentTypos(expression.base, onStep);
      for (const predicate of expression.predicates) {
        visitXPathForSampleDocumentTypos(predicate, onStep);
      }
      break;
    case 'functionCall':
      for (const argument of expression.arguments) {
        visitXPathForSampleDocumentTypos(argument, onStep);
      }
      break;
    case 'if':
      visitXPathForSampleDocumentTypos(expression.test, onStep);
      visitXPathForSampleDocumentTypos(expression.thenBranch, onStep);
      visitXPathForSampleDocumentTypos(expression.elseBranch, onStep);
      break;
    case 'let':
    case 'for':
      for (const binding of expression.bindings) {
        visitXPathForSampleDocumentTypos(binding.value, onStep);
      }
      visitXPathForSampleDocumentTypos(expression.returnExpr, onStep);
      break;
    case 'quantified':
      for (const binding of expression.bindings) {
        visitXPathForSampleDocumentTypos(binding.value, onStep);
      }
      visitXPathForSampleDocumentTypos(expression.satisfiesExpr, onStep);
      break;
    case 'path':
      if (expression.base !== undefined) {
        visitXPathForSampleDocumentTypos(expression.base, onStep);
      }
      for (const step of expression.steps) {
        if (step.kind === 'step') {
          onStep(step);
          for (const predicate of step.predicates) {
            visitXPathForSampleDocumentTypos(predicate, onStep);
          }
        } else {
          visitXPathForSampleDocumentTypos(step, onStep);
        }
      }
      break;
    case 'sequence':
      for (const item of expression.items) {
        visitXPathForSampleDocumentTypos(item, onStep);
      }
      break;
    case 'unary':
      visitXPathForSampleDocumentTypos(expression.operand, onStep);
      break;
    default:
      break;
  }
}

function createSampleDocumentNameDiagnostic(
  step: StepExpression,
  context: XPathExpressionContext,
  sampleDocument: SampleDocumentNameModel,
  ir: StylesheetIR,
): DiagnosticReport | undefined {
  if (step.nodeTest.kind !== 'nameTest') {
    return undefined;
  }

  const nameInfo = resolveNameTestForSample(step.nodeTest.name, step.axis, ir);
  if (nameInfo === undefined) {
    return undefined;
  }

  const candidateNames = getSampleDocumentCandidateNames(
    step.axis,
    nameInfo.namespaceUri,
    sampleDocument,
  );
  if (candidateNames === undefined) {
    return undefined;
  }

  if (candidateNames.has(nameInfo.localName)) {
    return undefined;
  }

  const nearest = [...candidateNames]
    .map((candidate) => ({
      candidate,
      distance: computeLevenshteinDistance(nameInfo.localName, candidate),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearest === undefined || nearest.distance > 2) {
    return undefined;
  }

  const suggestedName = `${nameInfo.prefix}${nearest.candidate}`;
  const primary = mapXPathSpanToSourceSpan(context.expressionLocation, step.nodeTest.span);
  const frame = createXPathExpressionFrame(context, primary);
  const kindLabel = step.axis === 'attribute' ? 'attribute' : 'element';

  return createAnalysisWarning({
    code:
      step.axis === 'attribute'
        ? 'WEAVER_ANALYZE_UNKNOWN_SAMPLE_ATTRIBUTE_NAME'
        : 'WEAVER_ANALYZE_UNKNOWN_SAMPLE_ELEMENT_NAME',
    message: `XPath ${kindLabel} name test ${JSON.stringify(step.nodeTest.name)} does not appear in the supplied sample document.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [
      { key: 'nameTest', value: step.nodeTest.name },
      { key: 'suggestedName', value: suggestedName },
    ],
    suggestions: [
      {
        kind: 'fix',
        label: `did you mean ${JSON.stringify(suggestedName)}?`,
        replacement: suggestedName,
        confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / suggestedName.length,
      },
    ],
  });
}

function getSampleDocumentCandidateNames(
  axis: StepExpression['axis'],
  namespaceUri: string,
  sampleDocument: SampleDocumentNameModel,
): ReadonlySet<string> | undefined {
  const namesByNamespace =
    axis === 'attribute' ? sampleDocument.attributeNames : sampleDocument.elementNames;
  return namesByNamespace.get(namespaceUri);
}

function resolveNameTestForSample(
  name: string,
  axis: StepExpression['axis'],
  ir: StylesheetIR,
):
  | { readonly prefix: string; readonly localName: string; readonly namespaceUri: string }
  | undefined {
  if (name.startsWith('Q{')) {
    const endBrace = name.indexOf('}');
    if (endBrace >= 0) {
      return {
        prefix: name.slice(0, endBrace + 1),
        localName: name.slice(endBrace + 1),
        namespaceUri: name.slice(2, endBrace),
      };
    }
  }

  const separator = name.indexOf(':');
  if (separator < 0) {
    return {
      prefix: '',
      localName: name,
      namespaceUri: axis === 'attribute' ? '' : ir.defaultElementNamespace,
    };
  }

  const prefix = name.slice(0, separator);
  const namespaceUri = resolveSampleNameNamespacePrefix(prefix, ir);
  if (namespaceUri === undefined) {
    return undefined;
  }

  return {
    prefix: `${prefix}:`,
    localName: name.slice(separator + 1),
    namespaceUri,
  };
}

function resolveSampleNameNamespacePrefix(prefix: string, ir: StylesheetIR): string | undefined {
  if (prefix === 'xml') {
    return 'http://www.w3.org/XML/1998/namespace';
  }

  return ir.namespaces[prefix];
}

function mapXPathSpanToSourceSpan(
  location: SourceLocation | undefined,
  span: XPathSourceSpan,
): DiagnosticSourceSpan | undefined {
  if (
    location?.line === undefined ||
    location.column === undefined ||
    location.offset === undefined
  ) {
    return undefined;
  }

  return {
    ...(location.source === undefined ? {} : { uri: location.source }),
    offsetStart: location.offset + span.start,
    offsetEnd: location.offset + span.end,
    lineStart: location.line + span.line - 1,
    columnStart: span.line === 1 ? location.column + span.column - 1 : span.column,
    lineEnd: location.line + span.endLine - 1,
    columnEnd: span.endLine === 1 ? location.column + span.endColumn - 1 : span.endColumn,
  };
}

function createXPathExpressionFrame(
  context: XPathExpressionContext,
  primary: DiagnosticSourceSpan | undefined,
): DiagnosticFrame | undefined {
  const label =
    context.frameKind === 'template'
      ? `${context.attributeName}=${JSON.stringify(context.expressionText)}`
      : `${context.ownerName} ${context.attributeName}=${JSON.stringify(context.expressionText)}`;

  return primary === undefined
    ? { kind: context.frameKind ?? 'instruction', label }
    : { kind: context.frameKind ?? 'instruction', label, span: primary };
}
