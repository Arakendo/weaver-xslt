import type { SourceLocation } from '../../errors/index.js';
import { assertValidDiagnostic, type DiagnosticFrame, type DiagnosticReport, type SourceSpan as DiagnosticSourceSpan } from '../../diagnostics/index.js';
import type { Element } from '@xmldom/xmldom';
import type { FlowBinding, LetBinding, PathExpression, StepExpression, XPathAst } from '../../xpath/parse/ast.js';
import type { SourceSpan as XPathSourceSpan } from '../../xpath/lex/lexer.js';
import { parseXml } from '../../xml/parse.js';
import { computeLevenshteinDistance } from '../diagnostics.js';

import type { GlobalBinding, Instruction, StylesheetIR, TemplateParam, TemplateRule, WithParam } from './ir.js';

export interface AnalyzeStylesheetOptions {
  readonly sampleDocument?: string;
}

export function analyzeStylesheet(ir: StylesheetIR, options: AnalyzeStylesheetOptions = {}): readonly DiagnosticReport[] {
  const reachableNamedTemplateNames = collectReachableNamedTemplateNames(ir);
  const reachableGlobalBindingNames = collectReachableGlobalBindingNames(ir);
  const templatePriorityConflictReports = collectTemplatePriorityConflictDiagnostics(ir);
  const sampleDocumentReports = collectSampleDocumentNameDiagnostics(ir, options.sampleDocument);

  const globalBindingReports = ir.globalBindings.flatMap((binding) => {
    if (reachableGlobalBindingNames.has(binding.name)) {
      return [];
    }

    return binding.kind === 'param'
      ? [createUnusedGlobalParamDiagnostic(binding)]
      : [createUnusedGlobalVariableDiagnostic(binding)];
  });

  const templateReports = ir.templates.flatMap((template) => {
    const reports: DiagnosticReport[] = [];

    if (template.name !== undefined && template.match === undefined && !reachableNamedTemplateNames.has(template.name)) {
      reports.push(createUnusedNamedTemplateDiagnostic(template));
    }

    const bindingUsage = collectTemplateBindingUsage(template);
    for (const param of template.params) {
      if (!bindingUsage.usedTemplateParamNames.has(param.name)) {
        reports.push(createUnusedTemplateParamDiagnostic(template, param));
      }
    }

    for (const variable of bindingUsage.unusedLocalVariables) {
      reports.push(createUnusedLocalVariableDiagnostic(template, variable));
    }

    return reports;
  });

  return [...globalBindingReports, ...templatePriorityConflictReports, ...sampleDocumentReports, ...templateReports];
}

type ScopeBinding =
  | { readonly kind: 'templateParam'; readonly name: string }
  | { readonly kind: 'localVariable'; readonly id: number }
  | { readonly kind: 'xpathVariable' };

interface TemplateBindingUsage {
  readonly usedTemplateParamNames: ReadonlySet<string>;
  readonly unusedLocalVariables: readonly Extract<Instruction, { readonly kind: 'variable' }>[];
}

interface MutableTemplateBindingUsage {
  readonly usedTemplateParamNames: Set<string>;
  readonly localVariables: Array<{ readonly id: number; readonly instruction: Extract<Instruction, { readonly kind: 'variable' }> }>;
  readonly usedLocalVariableIds: Set<number>;
  nextLocalVariableId: number;
}

interface BindingUsageCallbacks {
  readonly onUnresolvedVariableReference?: (name: string) => void;
  readonly onCallTemplate?: (name: string) => void;
}

type ComparableTemplateMatchStep =
  | { readonly kind: 'name'; readonly name: string }
  | { readonly kind: 'wildcard' }
  | { readonly kind: 'node' }
  | { readonly kind: 'text' };

interface ComparableTemplateMatchPattern {
  readonly absolute: boolean;
  readonly steps: readonly ComparableTemplateMatchStep[];
}

interface AnalysisWarningInit {
  readonly code: string;
  readonly message: string;
  readonly primary: DiagnosticSourceSpan | undefined;
  readonly related?: DiagnosticReport['related'];
  readonly frames: DiagnosticReport['frames'];
  readonly details: DiagnosticReport['details'];
  readonly suggestions: DiagnosticReport['suggestions'];
}

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

function collectReachableNamedTemplateNames(ir: StylesheetIR): ReadonlySet<string> {
  const namedTemplates = new Map(
    ir.templates.flatMap((template) => template.name === undefined ? [] : [[template.name, template] as const]),
  );
  const reachableNamedTemplateNames = new Set<string>();

  const visitTemplate = (template: TemplateRule): void => {
    visitTemplateParams(template.params);
    visitInstructions(template.body);
  };

  const visitTemplateParams = (params: readonly TemplateParam[]): void => {
    for (const param of params) {
      if (param.body !== undefined) {
        visitInstructions(param.body);
      }
    }
  };

  const visitWithParams = (withParams: readonly WithParam[]): void => {
    for (const withParam of withParams) {
      if (withParam.body !== undefined) {
        visitInstructions(withParam.body);
      }
    }
  };

  const visitGlobalBinding = (binding: GlobalBinding): void => {
    if (binding.body !== undefined) {
      visitInstructions(binding.body);
    }
  };

  const visitNamedTemplateByName = (name: string): void => {
    if (reachableNamedTemplateNames.has(name)) {
      return;
    }

    const namedTemplate = namedTemplates.get(name);
    if (namedTemplate === undefined) {
      return;
    }

    reachableNamedTemplateNames.add(name);
    visitTemplate(namedTemplate);
  };

  const visitInstructions = (instructions: readonly Instruction[]): void => {
    for (const instruction of instructions) {
      switch (instruction.kind) {
        case 'literalElement':
        case 'comment':
        case 'if':
        case 'forEach':
          visitInstructions(instruction.body);
          break;
        case 'choose':
          for (const branch of instruction.whenBranches) {
            visitInstructions(branch.body);
          }
          if (instruction.otherwiseBody !== undefined) {
            visitInstructions(instruction.otherwiseBody);
          }
          break;
        case 'variable':
          if (instruction.body !== undefined) {
            visitInstructions(instruction.body);
          }
          break;
        case 'callTemplate':
          visitWithParams(instruction.withParams);
          visitNamedTemplateByName(instruction.name);
          break;
        case 'applyTemplates':
          visitWithParams(instruction.withParams);
          break;
        default:
          break;
      }
    }
  };

  for (const binding of ir.globalBindings) {
    visitGlobalBinding(binding);
  }

  for (const template of ir.templates) {
    if (template.match !== undefined) {
      visitTemplate(template);
    }
  }

  return reachableNamedTemplateNames;
}

function collectReachableGlobalBindingNames(ir: StylesheetIR): ReadonlySet<string> {
  const globalBindings = new Map(ir.globalBindings.map((binding) => [binding.name, binding] as const));
  const namedTemplates = new Map(
    ir.templates.flatMap((template) => template.name === undefined ? [] : [[template.name, template] as const]),
  );
  const reachableGlobalBindingNames = new Set<string>();
  const visitedTemplates = new Set<TemplateRule>();

  const visitNamedTemplateByName = (name: string): void => {
    const template = namedTemplates.get(name);
    if (template === undefined) {
      return;
    }

    visitTemplate(template);
  };

  const visitGlobalBindingByName = (name: string): void => {
    if (reachableGlobalBindingNames.has(name)) {
      return;
    }

    const binding = globalBindings.get(name);
    if (binding === undefined) {
      return;
    }

    reachableGlobalBindingNames.add(name);
    visitGlobalBinding(binding);
  };

  const callbacks: BindingUsageCallbacks = {
    onUnresolvedVariableReference: visitGlobalBindingByName,
    onCallTemplate: visitNamedTemplateByName,
  };

  const visitTemplate = (template: TemplateRule): void => {
    if (visitedTemplates.has(template)) {
      return;
    }

    visitedTemplates.add(template);
    collectTemplateBindingUsage(template, callbacks);
  };

  const visitGlobalBinding = (binding: GlobalBinding): void => {
    const usage = createMutableTemplateBindingUsage();
    const initialScope: ReadonlyMap<string, ScopeBinding> = new Map();

    if (binding.select !== undefined) {
      visitXPathForBindingUsage(binding.select, initialScope, usage, callbacks);
    }
    if (binding.body !== undefined) {
      visitInstructionsForBindingUsage(binding.body, initialScope, usage, callbacks);
    }
  };

  for (const template of ir.templates) {
    if (template.match !== undefined) {
      visitTemplate(template);
    }
  }

  return reachableGlobalBindingNames;
}

function collectTemplatePriorityConflictDiagnostics(ir: StylesheetIR): readonly DiagnosticReport[] {
  const priorTemplates: Array<{
    readonly template: TemplateRule;
    readonly priority: number;
    readonly pattern: ComparableTemplateMatchPattern;
  }> = [];
  const reports: DiagnosticReport[] = [];

  for (const template of ir.templates) {
    const pattern = getComparableTemplateMatchPattern(template, ir);
    if (pattern === undefined) {
      continue;
    }

    const priority = getTemplateEffectivePriority(template);
    const shadowingTemplate = findLastShadowingTemplateWithMinimumPriority(priorTemplates, pattern, priority);
    if (shadowingTemplate !== undefined) {
      reports.push(createUnreachableTemplateMatchDiagnostic(template, shadowingTemplate, priority));
    }

    const conflictingTemplate = findLastOverlappingTemplateWithPriority(priorTemplates, pattern, priority);
    if (conflictingTemplate !== undefined) {
      reports.push(createTemplatePriorityConflictDiagnostic(template, conflictingTemplate, priority));
    }

    priorTemplates.push({ template, priority, pattern });
  }

  return reports;
}

function findLastOverlappingTemplateWithPriority(
  templates: readonly {
    readonly template: TemplateRule;
    readonly priority: number;
    readonly pattern: ComparableTemplateMatchPattern;
  }[],
  pattern: ComparableTemplateMatchPattern,
  priority: number,
): TemplateRule | undefined {
  for (let index = templates.length - 1; index >= 0; index -= 1) {
    if (templates[index]?.priority === priority && templateMatchPatternsOverlap(templates[index]!.pattern, pattern)) {
      return templates[index]?.template;
    }
  }

  return undefined;
}

function findLastShadowingTemplateWithMinimumPriority(
  templates: readonly {
    readonly template: TemplateRule;
    readonly priority: number;
    readonly pattern: ComparableTemplateMatchPattern;
  }[],
  pattern: ComparableTemplateMatchPattern,
  minimumPriorityExclusive: number,
): TemplateRule | undefined {
  for (let index = templates.length - 1; index >= 0; index -= 1) {
    if (
      (templates[index]?.priority ?? Number.NEGATIVE_INFINITY) > minimumPriorityExclusive
      && templateMatchPatternSubsumes(templates[index]!.pattern, pattern)
    ) {
      return templates[index]?.template;
    }
  }

  return undefined;
}

function getComparableTemplateMatchPattern(template: TemplateRule, ir: StylesheetIR): ComparableTemplateMatchPattern | undefined {
  if (template.match === undefined || template.match.kind !== 'path') {
    return undefined;
  }

  const match = template.match;
  if (match.base !== undefined) {
    return undefined;
  }

  const steps: ComparableTemplateMatchStep[] = [];
  for (const step of match.steps) {
    if (step.kind !== 'step' || step.axis !== 'child' || step.predicates.length > 0) {
      return undefined;
    }

    const stepKey = getComparableTemplateMatchStep(step, ir);
    if (stepKey === undefined) {
      return undefined;
    }
    steps.push(stepKey);
  }

  return {
    absolute: match.absolute,
    steps,
  };
}

function getComparableTemplateMatchStep(
  step: StepExpression,
  ir: StylesheetIR,
): ComparableTemplateMatchStep | undefined {
  if (step.nodeTest.kind === 'wildcardTest') {
    return step.nodeTest.prefix === undefined && step.nodeTest.localName === undefined
      ? { kind: 'wildcard' }
      : undefined;
  }

  if (step.nodeTest.kind === 'kindTest') {
    return step.nodeTest.name === 'node' || step.nodeTest.name === 'text'
      ? { kind: step.nodeTest.name }
      : undefined;
  }

  if (step.nodeTest.kind !== 'nameTest') {
    return undefined;
  }

  return { kind: 'name', name: normalizeTemplateMatchName(step.nodeTest.name, ir) };
}

function templateMatchPatternsOverlap(
  left: ComparableTemplateMatchPattern,
  right: ComparableTemplateMatchPattern,
): boolean {
  if (left.absolute && right.absolute) {
    return left.steps.length === right.steps.length && comparableStepSequencesOverlap(left.steps, right.steps);
  }

  if (left.absolute) {
    return absoluteAndRelativePatternsOverlap(left, right);
  }

  if (right.absolute) {
    return absoluteAndRelativePatternsOverlap(right, left);
  }

  return suffixComparablePatternsOverlap(left.steps, right.steps);
}

function templateMatchPatternSubsumes(
  earlier: ComparableTemplateMatchPattern,
  later: ComparableTemplateMatchPattern,
): boolean {
  if (earlier.absolute) {
    return later.absolute
      && earlier.steps.length === later.steps.length
      && comparableStepSequenceSubsumes(earlier.steps, later.steps);
  }

  if (earlier.steps.length > later.steps.length) {
    return false;
  }

  return comparableStepSequenceSubsumes(
    earlier.steps,
    later.steps.slice(later.steps.length - earlier.steps.length),
  );
}

function absoluteAndRelativePatternsOverlap(
  absolutePattern: ComparableTemplateMatchPattern,
  relativePattern: ComparableTemplateMatchPattern,
): boolean {
  if (relativePattern.steps.length > absolutePattern.steps.length) {
    return false;
  }

  return comparableStepSequencesOverlap(
    absolutePattern.steps.slice(absolutePattern.steps.length - relativePattern.steps.length),
    relativePattern.steps,
  );
}

function suffixComparablePatternsOverlap(
  left: readonly ComparableTemplateMatchStep[],
  right: readonly ComparableTemplateMatchStep[],
): boolean {
  const [longer, shorter] = left.length >= right.length ? [left, right] : [right, left];
  return comparableStepSequencesOverlap(longer.slice(longer.length - shorter.length), shorter);
}

function comparableStepSequencesOverlap(
  left: readonly ComparableTemplateMatchStep[],
  right: readonly ComparableTemplateMatchStep[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (!comparableStepsOverlap(left[index]!, right[index]!)) {
      return false;
    }
  }

  return true;
}

function comparableStepSequenceSubsumes(
  earlier: readonly ComparableTemplateMatchStep[],
  later: readonly ComparableTemplateMatchStep[],
): boolean {
  if (earlier.length !== later.length) {
    return false;
  }

  for (let index = 0; index < earlier.length; index += 1) {
    if (!comparableStepSubsumes(earlier[index]!, later[index]!)) {
      return false;
    }
  }

  return true;
}

function comparableStepsOverlap(left: ComparableTemplateMatchStep, right: ComparableTemplateMatchStep): boolean {
  if (left.kind === 'node' || right.kind === 'node') {
    return true;
  }

  if (left.kind === 'text' || right.kind === 'text') {
    return left.kind === 'text' && right.kind === 'text';
  }

  if (left.kind === 'wildcard' || right.kind === 'wildcard') {
    return true;
  }

  return left.name === right.name;
}

function comparableStepSubsumes(earlier: ComparableTemplateMatchStep, later: ComparableTemplateMatchStep): boolean {
  if (earlier.kind === 'node') {
    return true;
  }

  if (earlier.kind === 'text') {
    return later.kind === 'text';
  }

  if (earlier.kind === 'wildcard') {
    return later.kind === 'wildcard' || later.kind === 'name';
  }

  return later.kind === 'name' && earlier.name === later.name;
}

function normalizeTemplateMatchName(name: string, ir: StylesheetIR): string {
  const eqName = tryNormalizeEqName(name);
  if (eqName !== undefined) {
    return eqName;
  }

  const separator = name.indexOf(':');
  if (separator < 0) {
    return ir.defaultElementNamespace.length === 0 ? name : `{${ir.defaultElementNamespace}}${name}`;
  }

  const prefix = name.slice(0, separator);
  const localName = name.slice(separator + 1);
  const namespaceUri = ir.namespaces[prefix];
  return namespaceUri === undefined ? name : `{${namespaceUri}}${localName}`;
}

function tryNormalizeEqName(name: string): string | undefined {
  if (!name.startsWith('Q{')) {
    return undefined;
  }

  const endBrace = name.indexOf('}');
  if (endBrace < 0) {
    return undefined;
  }

  const namespaceUri = name.slice(2, endBrace);
  const localName = name.slice(endBrace + 1);
  if (localName.length === 0) {
    return undefined;
  }

  return namespaceUri.length === 0 ? localName : `{${namespaceUri}}${localName}`;
}

function isRootTemplateRule(template: TemplateRule): boolean {
  return template.match?.kind === 'path'
    && template.match.absolute
    && template.match.base === undefined
    && template.match.steps.length === 0;
}

function getTemplateEffectivePriority(template: TemplateRule): number {
  if (template.priority !== undefined) {
    return template.priority;
  }

  if (template.match === undefined || template.match.kind !== 'path') {
    return Number.NEGATIVE_INFINITY;
  }

  if (isRootTemplateRule(template)) {
    return 0.5;
  }

  const match = template.match as PathExpression;
  if (match.base !== undefined || match.steps.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  if (match.absolute) {
    return 0.5;
  }

  const step = match.steps[match.steps.length - 1];
  if (step?.kind !== 'step') {
    return Number.NEGATIVE_INFINITY;
  }

  if (step.nodeTest.kind === 'nameTest') {
    return 0;
  }

  if (step.nodeTest.kind === 'wildcardTest') {
    return -0.5;
  }

  if (step.nodeTest.kind === 'kindTest' && (step.nodeTest.name === 'node' || step.nodeTest.name === 'text')) {
    return -0.5;
  }

  return Number.NEGATIVE_INFINITY;
}

function collectTemplateBindingUsage(template: TemplateRule, callbacks: BindingUsageCallbacks = {}): TemplateBindingUsage {
  const usage = createMutableTemplateBindingUsage();
  let scope: ReadonlyMap<string, ScopeBinding> = new Map<string, ScopeBinding>();

  for (const param of template.params) {
    visitTemplateParamValue(param, scope, usage, callbacks);
    scope = extendScope(scope, param.name, { kind: 'templateParam', name: param.name });
  }

  visitInstructionsForBindingUsage(template.body, scope, usage, callbacks);

  return {
    usedTemplateParamNames: usage.usedTemplateParamNames,
    unusedLocalVariables: usage.localVariables
      .filter((variable) => !usage.usedLocalVariableIds.has(variable.id))
      .map((variable) => variable.instruction),
  };
}

function createMutableTemplateBindingUsage(): MutableTemplateBindingUsage {
  return {
    usedTemplateParamNames: new Set<string>(),
    localVariables: [],
    usedLocalVariableIds: new Set<number>(),
    nextLocalVariableId: 0,
  };
}

function visitTemplateParamValue(
  param: TemplateParam,
  scope: ReadonlyMap<string, ScopeBinding>,
  usage: MutableTemplateBindingUsage,
  callbacks: BindingUsageCallbacks,
): void {
  if (param.select !== undefined) {
    visitXPathForBindingUsage(param.select, scope, usage, callbacks);
  }
  if (param.body !== undefined) {
    visitInstructionsForBindingUsage(param.body, scope, usage, callbacks);
  }
}

function visitInstructionsForBindingUsage(
  instructions: readonly Instruction[],
  initialScope: ReadonlyMap<string, ScopeBinding>,
  usage: MutableTemplateBindingUsage,
  callbacks: BindingUsageCallbacks,
): void {
  let scope = initialScope;

  for (const instruction of instructions) {
    switch (instruction.kind) {
      case 'literalElement':
      case 'comment':
        visitInstructionsForBindingUsage(instruction.body, scope, usage, callbacks);
        break;
      case 'if':
        visitXPathForBindingUsage(instruction.test, scope, usage, callbacks);
        visitInstructionsForBindingUsage(instruction.body, scope, usage, callbacks);
        break;
      case 'choose':
        for (const branch of instruction.whenBranches) {
          visitXPathForBindingUsage(branch.test, scope, usage, callbacks);
          visitInstructionsForBindingUsage(branch.body, scope, usage, callbacks);
        }
        if (instruction.otherwiseBody !== undefined) {
          visitInstructionsForBindingUsage(instruction.otherwiseBody, scope, usage, callbacks);
        }
        break;
      case 'forEach':
        visitXPathForBindingUsage(instruction.select, scope, usage, callbacks);
        visitInstructionsForBindingUsage(instruction.body, scope, usage, callbacks);
        break;
      case 'variable': {
        if (instruction.select !== undefined) {
          visitXPathForBindingUsage(instruction.select, scope, usage, callbacks);
        }
        if (instruction.body !== undefined) {
          visitInstructionsForBindingUsage(instruction.body, scope, usage, callbacks);
        }
        const id = usage.nextLocalVariableId;
        usage.nextLocalVariableId += 1;
        usage.localVariables.push({ id, instruction });
        scope = extendScope(scope, instruction.name, { kind: 'localVariable', id });
        break;
      }
      case 'callTemplate':
        visitWithParamsForBindingUsage(instruction.withParams, scope, usage, callbacks);
        callbacks.onCallTemplate?.(instruction.name);
        break;
      case 'applyTemplates':
        if (instruction.select !== undefined) {
          visitXPathForBindingUsage(instruction.select, scope, usage, callbacks);
        }
        visitWithParamsForBindingUsage(instruction.withParams, scope, usage, callbacks);
        break;
      case 'valueOf':
        visitXPathForBindingUsage(instruction.select, scope, usage, callbacks);
        break;
      default:
        break;
    }
  }
}

function visitWithParamsForBindingUsage(
  withParams: readonly WithParam[],
  scope: ReadonlyMap<string, ScopeBinding>,
  usage: MutableTemplateBindingUsage,
  callbacks: BindingUsageCallbacks,
): void {
  for (const withParam of withParams) {
    if (withParam.select !== undefined) {
      visitXPathForBindingUsage(withParam.select, scope, usage, callbacks);
    }
    if (withParam.body !== undefined) {
      visitInstructionsForBindingUsage(withParam.body, scope, usage, callbacks);
    }
  }
}

function visitXPathForBindingUsage(
  expression: XPathAst,
  scope: ReadonlyMap<string, ScopeBinding>,
  usage: MutableTemplateBindingUsage,
  callbacks: BindingUsageCallbacks,
): void {
  switch (expression.kind) {
    case 'array':
      for (const member of expression.members) {
        visitXPathForBindingUsage(member, scope, usage, callbacks);
      }
      break;
    case 'binary':
      visitXPathForBindingUsage(expression.left, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.right, scope, usage, callbacks);
      break;
    case 'filter':
      visitXPathForBindingUsage(expression.base, scope, usage, callbacks);
      for (const predicate of expression.predicates) {
        visitXPathForBindingUsage(predicate, scope, usage, callbacks);
      }
      break;
    case 'functionCall':
      for (const argument of expression.arguments) {
        visitXPathForBindingUsage(argument, scope, usage, callbacks);
      }
      break;
    case 'if':
      visitXPathForBindingUsage(expression.test, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.thenBranch, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.elseBranch, scope, usage, callbacks);
      break;
    case 'let': {
      const letScope = visitScopedBindings(expression.bindings, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.returnExpr, letScope, usage, callbacks);
      break;
    }
    case 'for': {
      const forScope = visitScopedBindings(expression.bindings, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.returnExpr, forScope, usage, callbacks);
      break;
    }
    case 'quantified': {
      const quantifiedScope = visitScopedBindings(expression.bindings, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.satisfiesExpr, quantifiedScope, usage, callbacks);
      break;
    }
    case 'path':
      if (expression.base !== undefined) {
        visitXPathForBindingUsage(expression.base, scope, usage, callbacks);
      }
      for (const step of expression.steps) {
        if (step.kind === 'step') {
          for (const predicate of step.predicates) {
            visitXPathForBindingUsage(predicate, scope, usage, callbacks);
          }
        } else {
          visitXPathForBindingUsage(step, scope, usage, callbacks);
        }
      }
      break;
    case 'sequence':
      for (const item of expression.items) {
        visitXPathForBindingUsage(item, scope, usage, callbacks);
      }
      break;
    case 'unary':
      visitXPathForBindingUsage(expression.operand, scope, usage, callbacks);
      break;
    case 'variable': {
      const binding = scope.get(expression.name);
      if (binding?.kind === 'templateParam') {
        usage.usedTemplateParamNames.add(binding.name);
      }
      if (binding?.kind === 'localVariable') {
        usage.usedLocalVariableIds.add(binding.id);
      }
      if (binding === undefined) {
        callbacks.onUnresolvedVariableReference?.(expression.name);
      }
      break;
    }
    default:
      break;
  }
}

function visitScopedBindings(
  bindings: readonly LetBinding[] | readonly FlowBinding[],
  initialScope: ReadonlyMap<string, ScopeBinding>,
  usage: MutableTemplateBindingUsage,
  callbacks: BindingUsageCallbacks,
): ReadonlyMap<string, ScopeBinding> {
  let scope = initialScope;

  for (const binding of bindings) {
    visitXPathForBindingUsage(binding.value, scope, usage, callbacks);
    scope = extendScope(scope, binding.name, { kind: 'xpathVariable' });
  }

  return scope;
}

function extendScope(
  scope: ReadonlyMap<string, ScopeBinding>,
  name: string,
  binding: ScopeBinding,
): ReadonlyMap<string, ScopeBinding> {
  return new Map(scope).set(name, binding);
}

function createUnusedNamedTemplateDiagnostic(template: TemplateRule): DiagnosticReport {
  const primary = toSourceSpan(template.location);
  const frame = createTemplateFrame(template, primary);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNUSED_TEMPLATE',
    message: `Named template ${template.name ?? '<anonymous>'} is never called from any matched template.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: template.name === undefined ? [] : [{ key: 'templateName', value: template.name }],
    suggestions: [{
      kind: 'hint',
      label: 'remove the template or add an xsl:call-template that reaches it from a matched template',
      confidence: 1,
    }],
  });
}

function createUnusedTemplateParamDiagnostic(template: TemplateRule, param: TemplateParam): DiagnosticReport {
  const primary = toSourceSpan(param.location);
  const frame = createTemplateFrame(template, primary);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNUSED_TEMPLATE_PARAM',
    message: `Template parameter ${param.name} is never referenced within its template.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [{ key: 'paramName', value: param.name }],
    suggestions: [{
      kind: 'hint',
      label: `remove the parameter or reference $${param.name} from the template body or parameter defaults`,
      confidence: 1,
    }],
  });
}

function createUnusedLocalVariableDiagnostic(
  template: TemplateRule,
  variable: Extract<Instruction, { readonly kind: 'variable' }>,
): DiagnosticReport {
  const primary = toSourceSpan(variable.location);
  const frame = createTemplateFrame(template, primary);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNUSED_VARIABLE',
    message: `Local variable ${variable.name} is never referenced within its scope.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [{ key: 'variableName', value: variable.name }],
    suggestions: [{
      kind: 'hint',
      label: `remove the variable or reference $${variable.name} later in the same scope`,
      confidence: 1,
    }],
  });
}

function createUnusedGlobalParamDiagnostic(binding: Extract<GlobalBinding, { readonly kind: 'param' }>): DiagnosticReport {
  const primary = toSourceSpan(binding.location);
  const frame = createGlobalBindingFrame(binding, primary);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNUSED_GLOBAL_PARAM',
    message: `Stylesheet parameter ${binding.name} is never referenced from any reachable template or global binding.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [{ key: 'paramName', value: binding.name }],
    suggestions: [{
      kind: 'hint',
      label: `remove the stylesheet parameter or reference $${binding.name} from a reachable template or global binding`,
      confidence: 1,
    }],
  });
}

function createUnusedGlobalVariableDiagnostic(binding: Extract<GlobalBinding, { readonly kind: 'variable' }>): DiagnosticReport {
  const primary = toSourceSpan(binding.location);
  const frame = createGlobalBindingFrame(binding, primary);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNUSED_GLOBAL_VARIABLE',
    message: `Stylesheet variable ${binding.name} is never referenced from any reachable template or global binding.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [{ key: 'variableName', value: binding.name }],
    suggestions: [{
      kind: 'hint',
      label: `remove the stylesheet variable or reference $${binding.name} from a reachable template or global binding`,
      confidence: 1,
    }],
  });
}

function createTemplatePriorityConflictDiagnostic(
  template: TemplateRule,
  earlierTemplate: TemplateRule,
  priority: number,
): DiagnosticReport {
  const primary = toSourceSpan(template.location);
  const frame = createTemplateFrame(template, primary);
  const earlierSpan = toSourceSpan(earlierTemplate.location);
  const earlierPriority = getTemplateEffectivePriority(earlierTemplate);
  const earlierRelatedLabel = createEarlierTemplateRelatedLabel('earlier overlapping template', earlierTemplate);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_PRIORITY_CONFLICT',
    message: `Template match ${JSON.stringify(template.matchText ?? '<unknown>')} has the same effective priority ${priority} as an earlier overlapping template; declaration order decides which one wins.`,
    related: earlierSpan === undefined
      ? []
      : [{ label: earlierRelatedLabel, span: earlierSpan }],
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [
      ...(template.matchText === undefined ? [] : [{ key: 'matchPattern', value: template.matchText }]),
      { key: 'priority', value: priority },
      ...(earlierTemplate.matchText === undefined ? [] : [{ key: 'earlierMatchPattern', value: earlierTemplate.matchText }]),
      { key: 'earlierPriority', value: earlierPriority },
    ],
    suggestions: [{
      kind: 'hint',
      label: 'set an explicit priority or narrow one of the overlapping match patterns',
      confidence: 1,
    }],
  });
}

function createUnreachableTemplateMatchDiagnostic(
  template: TemplateRule,
  shadowingTemplate: TemplateRule,
  priority: number,
): DiagnosticReport {
  const primary = toSourceSpan(template.location);
  const frame = createTemplateFrame(template, primary);
  const shadowingSpan = toSourceSpan(shadowingTemplate.location);
  const shadowingPriority = getTemplateEffectivePriority(shadowingTemplate);
  const shadowingRelatedLabel = createEarlierTemplateRelatedLabel('shadowing template', shadowingTemplate);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNREACHABLE_TEMPLATE_MATCH',
    message: `Template match ${JSON.stringify(template.matchText ?? '<unknown>')} is unreachable because an earlier overlapping template has higher effective priority ${shadowingPriority}.`,
    related: shadowingSpan === undefined
      ? []
      : [{ label: shadowingRelatedLabel, span: shadowingSpan }],
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [
      ...(template.matchText === undefined ? [] : [{ key: 'matchPattern', value: template.matchText }]),
      { key: 'priority', value: priority },
      ...(shadowingTemplate.matchText === undefined ? [] : [{ key: 'shadowingMatchPattern', value: shadowingTemplate.matchText }]),
      { key: 'shadowingPriority', value: shadowingPriority },
    ],
    suggestions: [{
      kind: 'hint',
      label: 'raise the template priority or narrow the earlier overlapping match pattern',
      confidence: 1,
    }],
  });
}

function createAnalysisWarning(
  report: AnalysisWarningInit,
): DiagnosticReport {
  const normalizedReport: DiagnosticReport = {
    code: report.code,
    phase: 'compile',
    severity: 'warning',
    category: 'analysis',
    message: report.message,
    ...(report.primary === undefined ? {} : { primary: report.primary }),
    related: report.related ?? [],
    frames: report.frames,
    details: report.details,
    suggestions: report.suggestions,
    causes: [],
  };

  assertValidDiagnostic(normalizedReport);
  return normalizedReport;
}

function collectSampleDocumentNameDiagnostics(
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
  const document = parseXml(sampleDocument);
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
      if (attributeName !== undefined && attributeName.length > 0 && attributeName !== 'xmlns' && attribute?.prefix !== 'xmlns') {
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

function addSampleDocumentName(namesByNamespace: Map<string, Set<string>>, namespaceUri: string, localName: string): void {
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
          pushContext(instruction.test, instruction.testText, instruction.location, 'xsl:if', 'test');
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
          pushContext(instruction.select, instruction.selectText, instruction.location, 'xsl:for-each', 'select');
          visitInstructions(instruction.body);
          break;
        case 'variable':
          pushContext(instruction.select, instruction.selectText, instruction.location, 'xsl:variable', 'select');
          if (instruction.body !== undefined) {
            visitInstructions(instruction.body);
          }
          break;
        case 'callTemplate':
          visitWithParams(instruction.withParams);
          break;
        case 'applyTemplates':
          pushContext(instruction.select, instruction.selectText, instruction.location, 'xsl:apply-templates', 'select');
          visitWithParams(instruction.withParams);
          break;
        case 'valueOf':
          pushContext(instruction.select, instruction.selectText, instruction.location, 'xsl:value-of', 'select');
          break;
        default:
          break;
      }
    }
  };

  const visitWithParams = (withParams: readonly WithParam[]): void => {
    for (const withParam of withParams) {
      pushContext(withParam.select, withParam.selectText, withParam.location, 'xsl:with-param', 'select');
      if (withParam.body !== undefined) {
        visitInstructions(withParam.body);
      }
    }
  };

  for (const binding of ir.globalBindings) {
    pushContext(binding.select, binding.selectText, binding.location, `xsl:${binding.kind}`, 'select');
    if (binding.body !== undefined) {
      visitInstructions(binding.body);
    }
  }

  for (const template of ir.templates) {
    pushContext(template.match, template.matchText, template.location, 'xsl:template', 'match', 'template');
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

  const candidateNames = getSampleDocumentCandidateNames(step.axis, nameInfo.namespaceUri, sampleDocument);
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
    code: step.axis === 'attribute'
      ? 'WEAVER_ANALYZE_UNKNOWN_SAMPLE_ATTRIBUTE_NAME'
      : 'WEAVER_ANALYZE_UNKNOWN_SAMPLE_ELEMENT_NAME',
    message: `XPath ${kindLabel} name test ${JSON.stringify(step.nodeTest.name)} does not appear in the supplied sample document.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [
      { key: 'nameTest', value: step.nodeTest.name },
      { key: 'suggestedName', value: suggestedName },
    ],
    suggestions: [{
      kind: 'fix',
      label: `did you mean ${JSON.stringify(suggestedName)}?`,
      replacement: suggestedName,
      confidence: nearest.distance === 0 ? 1 : 1 - (nearest.distance / suggestedName.length),
    }],
  });
}

function getSampleDocumentCandidateNames(
  axis: StepExpression['axis'],
  namespaceUri: string,
  sampleDocument: SampleDocumentNameModel,
): ReadonlySet<string> | undefined {
  const namesByNamespace = axis === 'attribute'
    ? sampleDocument.attributeNames
    : sampleDocument.elementNames;
  return namesByNamespace.get(namespaceUri);
}

function resolveNameTestForSample(
  name: string,
  axis: StepExpression['axis'],
  ir: StylesheetIR,
): { readonly prefix: string; readonly localName: string; readonly namespaceUri: string } | undefined {
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
  if (location?.line === undefined || location.column === undefined || location.offset === undefined) {
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
  const label = context.frameKind === 'template'
    ? `${context.attributeName}=${JSON.stringify(context.expressionText)}`
    : `${context.ownerName} ${context.attributeName}=${JSON.stringify(context.expressionText)}`;

  return primary === undefined
    ? { kind: context.frameKind ?? 'instruction', label }
    : { kind: context.frameKind ?? 'instruction', label, span: primary };
}

function createTemplateFrame(template: TemplateRule, primary: DiagnosticSourceSpan | undefined): DiagnosticFrame | undefined {
  const label = template.name ?? template.matchText;
  if (label === undefined) {
    return undefined;
  }

  return primary === undefined
    ? { kind: 'template', label }
    : { kind: 'template', label, span: primary };
}

function createGlobalBindingFrame(binding: GlobalBinding, primary: DiagnosticSourceSpan | undefined): DiagnosticFrame | undefined {
  const label = `xsl:${binding.kind} name="${binding.name}"`;

  return primary === undefined
    ? { kind: 'instruction', label }
    : { kind: 'instruction', label, span: primary };
}

function createEarlierTemplateRelatedLabel(prefix: string, template: TemplateRule): string {
  return template.matchText === undefined
    ? prefix
    : `${prefix} match=${JSON.stringify(template.matchText)}`;
}

function toSourceSpan(location: SourceLocation | undefined): DiagnosticSourceSpan | undefined {
  if (location?.line === undefined || location.column === undefined || location.offset === undefined) {
    return undefined;
  }

  return {
    ...(location.source !== undefined ? { uri: location.source } : {}),
    offsetStart: location.offset,
    offsetEnd: location.endOffset ?? location.offset + 1,
    lineStart: location.line,
    columnStart: location.column,
    lineEnd: location.endLine ?? location.line,
    columnEnd: location.endColumn ?? location.column + 1,
  };
}