import type { DiagnosticReport } from '../../diagnostics/index.js';
import type { PathExpression, StepExpression } from '../../xpath/parse/ast.js';

import {
  createAnalysisWarning,
  createEarlierTemplateRelatedLabel,
  createTemplateFrame,
  toSourceSpan,
} from './analysisDiagnostics.js';
import type { StylesheetIR, TemplateRule } from './ir.js';

type ComparableTemplateMatchStep =
  | { readonly kind: 'name'; readonly name: string }
  | { readonly kind: 'wildcard' }
  | { readonly kind: 'node' }
  | { readonly kind: 'text' };

interface ComparableTemplateMatchPattern {
  readonly absolute: boolean;
  readonly steps: readonly ComparableTemplateMatchStep[];
}

export function collectTemplatePriorityConflictDiagnostics(
  ir: StylesheetIR,
): readonly DiagnosticReport[] {
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
    const shadowingTemplate = findLastShadowingTemplateWithMinimumPriority(
      priorTemplates,
      pattern,
      priority,
    );
    if (shadowingTemplate !== undefined) {
      reports.push(createUnreachableTemplateMatchDiagnostic(template, shadowingTemplate, priority));
    }

    const conflictingTemplate = findLastOverlappingTemplateWithPriority(
      priorTemplates,
      pattern,
      priority,
    );
    if (conflictingTemplate !== undefined) {
      reports.push(
        createTemplatePriorityConflictDiagnostic(template, conflictingTemplate, priority),
      );
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
    if (
      templates[index]?.priority === priority &&
      templateMatchPatternsOverlap(templates[index]!.pattern, pattern)
    ) {
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
      (templates[index]?.priority ?? Number.NEGATIVE_INFINITY) > minimumPriorityExclusive &&
      templateMatchPatternSubsumes(templates[index]!.pattern, pattern)
    ) {
      return templates[index]?.template;
    }
  }

  return undefined;
}

export function getComparableTemplateMatchPattern(
  template: TemplateRule,
  ir: StylesheetIR,
): ComparableTemplateMatchPattern | undefined {
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
    return (
      left.steps.length === right.steps.length &&
      comparableStepSequencesOverlap(left.steps, right.steps)
    );
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
    return (
      later.absolute &&
      earlier.steps.length === later.steps.length &&
      comparableStepSequenceSubsumes(earlier.steps, later.steps)
    );
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

function comparableStepsOverlap(
  left: ComparableTemplateMatchStep,
  right: ComparableTemplateMatchStep,
): boolean {
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

function comparableStepSubsumes(
  earlier: ComparableTemplateMatchStep,
  later: ComparableTemplateMatchStep,
): boolean {
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
    return ir.defaultElementNamespace.length === 0
      ? name
      : `{${ir.defaultElementNamespace}}${name}`;
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
  return (
    template.match?.kind === 'path' &&
    template.match.absolute &&
    template.match.base === undefined &&
    template.match.steps.length === 0
  );
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

  if (
    step.nodeTest.kind === 'kindTest' &&
    (step.nodeTest.name === 'node' || step.nodeTest.name === 'text')
  ) {
    return -0.5;
  }

  return Number.NEGATIVE_INFINITY;
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
  const earlierRelatedLabel = createEarlierTemplateRelatedLabel(
    'earlier overlapping template',
    earlierTemplate,
  );

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_PRIORITY_CONFLICT',
    message: `Template match ${JSON.stringify(template.matchText ?? '<unknown>')} has the same effective priority ${priority} as an earlier overlapping template; declaration order decides which one wins.`,
    related: earlierSpan === undefined ? [] : [{ label: earlierRelatedLabel, span: earlierSpan }],
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [
      ...(template.matchText === undefined
        ? []
        : [{ key: 'matchPattern', value: template.matchText }]),
      { key: 'priority', value: priority },
      ...(earlierTemplate.matchText === undefined
        ? []
        : [{ key: 'earlierMatchPattern', value: earlierTemplate.matchText }]),
      { key: 'earlierPriority', value: earlierPriority },
    ],
    suggestions: [
      {
        kind: 'hint',
        label: 'set an explicit priority or narrow one of the overlapping match patterns',
        confidence: 1,
      },
    ],
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
  const shadowingRelatedLabel = createEarlierTemplateRelatedLabel(
    'shadowing template',
    shadowingTemplate,
  );

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNREACHABLE_TEMPLATE_MATCH',
    message: `Template match ${JSON.stringify(template.matchText ?? '<unknown>')} is unreachable because an earlier overlapping template has higher effective priority ${shadowingPriority}.`,
    related:
      shadowingSpan === undefined ? [] : [{ label: shadowingRelatedLabel, span: shadowingSpan }],
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [
      ...(template.matchText === undefined
        ? []
        : [{ key: 'matchPattern', value: template.matchText }]),
      { key: 'priority', value: priority },
      ...(shadowingTemplate.matchText === undefined
        ? []
        : [{ key: 'shadowingMatchPattern', value: shadowingTemplate.matchText }]),
      { key: 'shadowingPriority', value: shadowingPriority },
    ],
    suggestions: [
      {
        kind: 'hint',
        label: 'raise the template priority or narrow the earlier overlapping match pattern',
        confidence: 1,
      },
    ],
  });
}
