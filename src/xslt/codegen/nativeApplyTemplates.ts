import type { Instruction, StylesheetIR, TemplateRule, TemplateParam, WithParam } from '../compile/ir.js';
import type { PathExpression, StepExpression } from '../../xpath/parse/ast.js';
import { tsRawExpression, type TsExpression } from './ts-ir.js';
import { renderCommentedArrowFunction, renderTemplateProvenanceComment } from './provenance.js';
import {
  tryGetSupportedStepPositionPredicate,
} from './nativePositionPredicate.js';
import type { SimpleSelectPathStepPlan } from './nativePositionPlan.js';

interface RootApplyTemplatesShape {
  readonly rootTemplate: TemplateRule;
  readonly childTemplate: TemplateRule;
  readonly childMatchAbsolute: boolean;
  readonly childMatchPath: readonly string[];
}

interface RootApplyTemplatesNestedShape extends RootApplyTemplatesShape {
  readonly nestedChildTemplate: TemplateRule;
  readonly nestedChildMatchAbsolute: boolean;
  readonly nestedChildMatchPath: readonly string[];
}

interface TemplateMatchCandidate {
  readonly template: TemplateRule;
  readonly matchAbsolute: boolean;
  readonly matchPath: readonly string[];
  readonly priority: number;
  readonly templateIndex: number;
}

export interface ApplyTemplatesTemplatePlan {
  readonly template: TemplateRule;
  readonly matchAbsolute: boolean;
  readonly matchPath: readonly string[];
  readonly nestedPlans?: readonly ApplyTemplatesTemplatePlan[];
}

interface ApplyTemplatesInvocationContext {
  readonly positionExpression?: string;
  readonly lastExpression?: string;
  readonly variableBindings?: ReadonlyMap<string, TsExpression>;
}

interface NativeApplyTemplatesEmitOptions {
  readonly contextNodeIdentifier?: string;
  readonly positionExpression?: string;
  readonly lastExpression?: string;
  readonly variableBindings?: ReadonlyMap<string, TsExpression>;
  readonly renderApplyTemplates?: (
    instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
    contextNodeIdentifier: string,
    context: ApplyTemplatesInvocationContext,
  ) => TsExpression | undefined;
}

export function tryGetRootApplyTemplatesShape(ir: StylesheetIR): RootApplyTemplatesShape | undefined {
  if (ir.templates.length !== 2) {
    return undefined;
  }

  const rootTemplate = ir.templates.find((template) => isRootTemplateShape(template));
  const childTemplate = ir.templates.find((template) => template !== rootTemplate);
  if (rootTemplate === undefined || childTemplate === undefined) {
    return undefined;
  }

  const childMatchPath = getSimpleMatchPath(childTemplate);
  if (childMatchPath === undefined) {
    return undefined;
  }

  return {
    rootTemplate,
    childTemplate,
    childMatchAbsolute: childTemplate.match?.kind === 'path' ? childTemplate.match.absolute : false,
    childMatchPath,
  };
}

export function tryGetRootApplyTemplatesNestedShape(ir: StylesheetIR): RootApplyTemplatesNestedShape | undefined {
  if (ir.templates.length !== 3) {
    return undefined;
  }

  const rootTemplate = ir.templates.find((template) => isRootTemplateShape(template));
  if (rootTemplate === undefined) {
    return undefined;
  }

  const rootApplyTemplates = findSingleApplyTemplatesInstruction(rootTemplate.body);
  if (rootApplyTemplates === undefined) {
    return undefined;
  }

  const remainingTemplates = ir.templates.filter((template) => template !== rootTemplate);
  if (remainingTemplates.length !== 2) {
    return undefined;
  }

  const candidateTemplates = remainingTemplates.map((template, templateIndex) => {
    const matchPath = getSimpleMatchPath(template);
    if (matchPath === undefined) {
      return undefined;
    }

    return {
      template,
      matchAbsolute: template.match?.kind === 'path' ? template.match.absolute : false,
      matchPath,
      priority: getTemplatePriority(template),
      templateIndex,
    };
  });
  if (candidateTemplates.some((candidate) => candidate === undefined)) {
    return undefined;
  }

  const definedCandidates = candidateTemplates.filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== undefined);

  const matchingCandidates = rootApplyTemplates.select === undefined
    ? (() => {
        const absoluteCandidates = definedCandidates.filter((candidate) => candidate.matchAbsolute);
        if (absoluteCandidates.length > 0) {
          return absoluteCandidates;
        }

        const relativeCandidates = definedCandidates.filter((candidate) => !candidate.matchAbsolute);
        const maxLength = relativeCandidates.reduce((currentMax, candidate) => Math.max(currentMax, candidate.matchPath.length), 0);
        return relativeCandidates.filter((candidate) => candidate.matchPath.length === maxLength);
      })()
    : (() => {
        const selectPath = getSimpleSelectPath(rootApplyTemplates.select);
        if (selectPath === undefined) {
          return [];
        }

        return definedCandidates.filter((candidate) =>
          selectPathMatchesTemplate(selectPath.steps, candidate.matchPath, candidate.matchAbsolute),
        );
      })();
  const childCandidate = sortMatchingCandidates(matchingCandidates)[0];
  if (childCandidate === undefined) {
    return undefined;
  }

  const nestedCandidate = definedCandidates.find((candidate) => candidate.template !== childCandidate.template);
  if (nestedCandidate === undefined) {
    return undefined;
  }

  return {
    rootTemplate,
    childTemplate: childCandidate.template,
    childMatchAbsolute: childCandidate.matchAbsolute,
    childMatchPath: childCandidate.matchPath,
    nestedChildTemplate: nestedCandidate.template,
    nestedChildMatchAbsolute: nestedCandidate.matchAbsolute,
    nestedChildMatchPath: nestedCandidate.matchPath,
  };
}

export function emitRootApplyTemplatesInstruction(
  instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
  childTemplate: TemplateRule,
  childMatchAbsolute: boolean,
  childMatchPath: readonly string[],
  contextNodeIdentifier: string,
  runtimeHelpers: Set<string>,
  emitInstructionSequence: (
    instructions: readonly Instruction[],
    runtimeHelpers: Set<string>,
    options?: NativeApplyTemplatesEmitOptions,
  ) => TsExpression | undefined,
  tryGetSimpleChildPath: (
    ast: PathExpression | StepExpression | object,
  ) => { readonly absolute: boolean; readonly segments: readonly string[] } | undefined,
  sourcePath?: string,
  nestedOptions?: {
    readonly nestedChildTemplate: TemplateRule;
    readonly nestedChildMatchAbsolute: boolean;
    readonly nestedChildMatchPath: readonly string[];
  },
): TsExpression | undefined {
  if (instruction.withParams.length > 0) {
    return undefined;
  }

  // MVP+4 only plans the root apply-templates dispatch. Nested apply-templates
  // inside child template bodies still fall back through generic emission.
  const childBody = emitInstructionSequence(childTemplate.body, runtimeHelpers, nestedOptions === undefined
    ? {
        contextNodeIdentifier: 'templateNode',
      }
    : {
        contextNodeIdentifier: 'templateNode',
        renderApplyTemplates: (nestedInstruction, nestedContextNodeIdentifier) => emitRootApplyTemplatesInstruction(
          nestedInstruction,
          nestedOptions.nestedChildTemplate,
          nestedOptions.nestedChildMatchAbsolute,
          nestedOptions.nestedChildMatchPath,
          nestedContextNodeIdentifier,
          runtimeHelpers,
          emitInstructionSequence,
          tryGetSimpleChildPath,
          sourcePath,
        ),
      });
  if (childBody === undefined) {
    return undefined;
  }

  runtimeHelpers.add('traceFocusEnter');
  runtimeHelpers.add('traceTemplateEnter');

  const childTemplateCallback = renderCommentedArrowFunction(
    renderTemplateProvenanceComment(childTemplate, sourcePath),
    '(templateNode)',
    `(() => {\n  traceFocusEnter(templateNode, ctx);\n  traceTemplateEnter(templateNode, ctx, ${JSON.stringify({
      ...(childTemplate.matchText === undefined ? {} : { match: childTemplate.matchText }),
      ...(childTemplate.name === undefined ? {} : { name: childTemplate.name }),
      location: childTemplate.location,
    })});\n  return ${childBody.code};\n})()`,
  );

  if (instruction.select === undefined) {
    runtimeHelpers.add('applyBuiltInTemplatesByPath');
    runtimeHelpers.add('traceSelectedNodes');
    return tsRawExpression(
      childMatchAbsolute
        ? `applyBuiltInTemplatesByPath(document, ${JSON.stringify(childMatchPath)}, ${childTemplateCallback}, true, ctx, ${JSON.stringify({ kind: 'xsl:apply-templates', location: instruction.location })})`
        : `applyBuiltInTemplatesByPath(${contextNodeIdentifier}, ${JSON.stringify(childMatchPath)}, ${childTemplateCallback}, false, ctx, ${JSON.stringify({ kind: 'xsl:apply-templates', location: instruction.location })})`,
    );
  }

  const selectPath = tryGetSimpleChildPath(instruction.select);
  if (
    selectPath === undefined
    || !selectPathMatchesTemplate(selectPath.segments, childMatchPath, childMatchAbsolute)
  ) {
    return undefined;
  }

  runtimeHelpers.add('selectSimplePathNodes');
  runtimeHelpers.add('traceSelectedNodes');
  return tsRawExpression(
    `traceSelectedNodes(selectSimplePathNodes(${selectPath.absolute ? 'document' : contextNodeIdentifier}, ${JSON.stringify(selectPath.segments)}), ctx, ${JSON.stringify({ kind: 'xsl:apply-templates', location: instruction.location })}).map(${childTemplateCallback}).join("")`,
  );
}

export function tryGetRootApplyTemplatesPlan(
  ir: StylesheetIR,
): { readonly rootTemplate: TemplateRule; readonly childPlans: readonly ApplyTemplatesTemplatePlan[] } | undefined {
  const rootTemplate = ir.templates.find((template) => isRootTemplateShape(template));
  if (rootTemplate === undefined) {
    return undefined;
  }

  const rootApplyTemplates = findSingleApplyTemplatesInstruction(rootTemplate.body);
  if (rootApplyTemplates === undefined) {
    return undefined;
  }

  const remainingTemplates = ir.templates.filter((template) => template !== rootTemplate);
  if (remainingTemplates.length === 0) {
    return undefined;
  }

  const childPlan = tryBuildApplyTemplatesTemplatePlan(rootApplyTemplates, remainingTemplates);
  if (childPlan === undefined) {
    return undefined;
  }

  return {
    rootTemplate,
    childPlans: childPlan.plans,
  };
}

export function emitPlannedApplyTemplatesInstruction(
  instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
  childPlans: readonly ApplyTemplatesTemplatePlan[],
  contextNodeIdentifier: string,
  runtimeHelpers: Set<string>,
  emitInstructionSequence: (
    instructions: readonly Instruction[],
    runtimeHelpers: Set<string>,
    options?: NativeApplyTemplatesEmitOptions,
  ) => TsExpression | undefined,
  tryGetSimpleChildPath: (
    ast: PathExpression | StepExpression | object,
  ) => { readonly absolute: boolean; readonly segments: readonly string[] } | undefined,
  createTemplateInvocationSetup: (
    params: readonly TemplateParam[],
    withParams: readonly WithParam[],
    runtimeHelpers: Set<string>,
    parentBindings: ReadonlyMap<string, TsExpression> | undefined,
    callerContextNodeIdentifier: string,
    calleeContextNodeIdentifier: string,
    callerPositionExpression?: string,
    callerLastExpression?: string,
    calleePositionExpression?: string,
    calleeLastExpression?: string,
  ) => { readonly setupStatements: readonly string[]; readonly variableBindings: ReadonlyMap<string, TsExpression> } | undefined,
  context: ApplyTemplatesInvocationContext = {},
  sourcePath?: string,
): TsExpression | undefined {
  if (childPlans.length === 0) {
    return undefined;
  }

  const childTemplateCallbacks = childPlans.map((childPlan) => {
    const invocationSetup = createTemplateInvocationSetup(
      childPlan.template.params,
      instruction.withParams,
      runtimeHelpers,
      context.variableBindings,
      contextNodeIdentifier,
      'templateNode',
      context.positionExpression,
      context.lastExpression,
    );
    if (invocationSetup === undefined) {
      return undefined;
    }

    const nestedPlans = childPlan.nestedPlans;
    const childCallbackParameters = '(templateNode, templateIndex, templateNodes)';
    const childBody = emitInstructionSequence(childPlan.template.body, runtimeHelpers, nestedPlans === undefined
      ? {
          contextNodeIdentifier: 'templateNode',
          positionExpression: '(templateIndex + 1)',
          lastExpression: 'templateNodes.length',
          variableBindings: invocationSetup.variableBindings,
        }
      : {
          contextNodeIdentifier: 'templateNode',
          positionExpression: '(templateIndex + 1)',
          lastExpression: 'templateNodes.length',
          variableBindings: invocationSetup.variableBindings,
          renderApplyTemplates: (nestedInstruction, nestedContextNodeIdentifier, nestedContext) => emitPlannedApplyTemplatesInstruction(
            nestedInstruction,
            nestedPlans,
            nestedContextNodeIdentifier,
            runtimeHelpers,
            emitInstructionSequence,
            tryGetSimpleChildPath,
            createTemplateInvocationSetup,
            {
              ...(nestedContext.positionExpression === undefined ? {} : { positionExpression: nestedContext.positionExpression }),
              ...(nestedContext.lastExpression === undefined ? {} : { lastExpression: nestedContext.lastExpression }),
              variableBindings: invocationSetup.variableBindings,
            },
            sourcePath,
          ),
        });
    if (childBody === undefined) {
      return undefined;
    }

    runtimeHelpers.add('traceFocusEnter');
    runtimeHelpers.add('traceTemplateEnter');

    const callbackBody = invocationSetup.setupStatements.length === 0
      ? childBody.code
      : `(() => {\n${invocationSetup.setupStatements.map((statement) => `  ${statement}`).join('\n')}\n  return ${childBody.code};\n})()`;
    const tracedCallbackBody = `(() => {\n  traceFocusEnter(templateNode, ctx);\n  traceTemplateEnter(templateNode, ctx, ${JSON.stringify({
      ...(childPlan.template.matchText === undefined ? {} : { match: childPlan.template.matchText }),
      ...(childPlan.template.name === undefined ? {} : { name: childPlan.template.name }),
      location: childPlan.template.location,
    })});\n  return ${callbackBody};\n})()`;

    return {
      plan: childPlan,
      callback: renderCommentedArrowFunction(
        renderTemplateProvenanceComment(childPlan.template, sourcePath),
        childCallbackParameters,
        tracedCallbackBody,
      ),
    };
  });
  if (childTemplateCallbacks.some((callback) => callback === undefined)) {
    return undefined;
  }

  const definedCallbacks = childTemplateCallbacks.filter((callback): callback is NonNullable<typeof callback> => callback !== undefined);
  const renderMatchedNode = definedCallbacks.length === 1
    ? definedCallbacks[0]!.callback
    : (() => {
        runtimeHelpers.add('matchesTemplatePath');
        const dispatchLines = definedCallbacks.map(({ plan, callback }) =>
          `if (matchesTemplatePath(templateNode, ${JSON.stringify(plan.matchPath)}, ${plan.matchAbsolute ? 'true' : 'false'})) { return (${callback})(templateNode); }`
        );
        return ['(templateNode) => {', ...dispatchLines.map((line) => `  ${line}`), '  return "";', '}'].join('\n');
      })();

  if (instruction.select === undefined) {
    runtimeHelpers.add('applyBuiltInTemplatesByPath');
    runtimeHelpers.add('traceSelectedNodes');
    return tsRawExpression(
      childPlans.every((childPlan) => childPlan.matchAbsolute)
        ? `applyBuiltInTemplatesByPath(document, ${JSON.stringify(childPlans[0]!.matchPath)}, ${renderMatchedNode}, true, ctx, ${JSON.stringify({ kind: 'xsl:apply-templates', location: instruction.location })})`
        : `applyBuiltInTemplatesByPath(${contextNodeIdentifier}, ${JSON.stringify(childPlans[0]!.matchPath)}, ${renderMatchedNode}, false, ctx, ${JSON.stringify({ kind: 'xsl:apply-templates', location: instruction.location })})`,
    );
  }

  const selectPath = getSimpleSelectPath(instruction.select);
  if (
    selectPath === undefined
    || !childPlans.some((childPlan) => selectPathMatchesTemplate(selectPath.steps, childPlan.matchPath, childPlan.matchAbsolute))
  ) {
    return undefined;
  }

  runtimeHelpers.add('selectSimplePathNodesByStepPlan');
  runtimeHelpers.add('traceSelectedNodes');
  return tsRawExpression(
    `traceSelectedNodes(selectSimplePathNodesByStepPlan(${selectPath.absolute ? 'document' : contextNodeIdentifier}, ${JSON.stringify(selectPath.steps)}), ctx, ${JSON.stringify({ kind: 'xsl:apply-templates', location: instruction.location })}).map(${renderMatchedNode}).join("")`,
  );
}

function tryBuildApplyTemplatesTemplatePlan(
  instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
  templates: readonly TemplateRule[],
): { readonly plans: readonly ApplyTemplatesTemplatePlan[]; readonly remainingTemplates: readonly TemplateRule[] } | undefined {
  const candidates = getTemplateMatchCandidates(templates);
  if (candidates === undefined) {
    return undefined;
  }

  const matchingCandidates = sortMatchingCandidates(getMatchingApplyTemplatesCandidates(instruction, candidates));
  if (matchingCandidates.length === 0) {
    return undefined;
  }

  const matchedTemplates = new Set(matchingCandidates.map((candidate) => candidate.template));
  const remainingTemplates = templates.filter((template) => !matchedTemplates.has(template));

  const plans: ApplyTemplatesTemplatePlan[] = [];
  for (const matchedCandidate of matchingCandidates) {
    const nestedInstruction = findSingleApplyTemplatesInstruction(matchedCandidate.template.body);
    if (nestedInstruction === undefined) {
      plans.push({
        template: matchedCandidate.template,
        matchAbsolute: matchedCandidate.matchAbsolute,
        matchPath: matchedCandidate.matchPath,
      });
      continue;
    }

    const nestedPlan = tryBuildApplyTemplatesTemplatePlan(nestedInstruction, remainingTemplates);
    if (nestedPlan === undefined) {
      return undefined;
    }

    plans.push({
      template: matchedCandidate.template,
      matchAbsolute: matchedCandidate.matchAbsolute,
      matchPath: matchedCandidate.matchPath,
      nestedPlans: nestedPlan.plans,
    });
  }

  return {
    plans,
    remainingTemplates,
  };
}

function getTemplateMatchCandidates(templates: readonly TemplateRule[]): readonly TemplateMatchCandidate[] | undefined {
  const candidates = templates.map((template, templateIndex) => {
    const matchPath = getSimpleMatchPath(template);
    if (matchPath === undefined) {
      return undefined;
    }

    return {
      template,
      matchAbsolute: template.match?.kind === 'path' ? template.match.absolute : false,
      matchPath,
      priority: getTemplatePriority(template),
      templateIndex,
    };
  });
  if (candidates.some((candidate) => candidate === undefined)) {
    return undefined;
  }

  return candidates.filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== undefined);
}

function getMatchingApplyTemplatesCandidates(
  instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
  candidates: readonly TemplateMatchCandidate[],
): readonly TemplateMatchCandidate[] {
  if (instruction.select === undefined) {
    const absoluteCandidates = candidates.filter((candidate) => candidate.matchAbsolute);
    if (absoluteCandidates.length > 0) {
      return absoluteCandidates;
    }

    const relativeCandidates = candidates.filter((candidate) => !candidate.matchAbsolute);
    const maxLength = relativeCandidates.reduce((currentMax, candidate) => Math.max(currentMax, candidate.matchPath.length), 0);
    return relativeCandidates.filter((candidate) => candidate.matchPath.length === maxLength);
  }

  const selectPath = getSimpleSelectPath(instruction.select);
  if (selectPath === undefined) {
    return [];
  }

  return candidates.filter((candidate) =>
    selectPathMatchesTemplate(selectPath.steps, candidate.matchPath, candidate.matchAbsolute),
  );
}

function sortMatchingCandidates(candidates: readonly TemplateMatchCandidate[]): readonly TemplateMatchCandidate[] {
  return [...candidates].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    return right.templateIndex - left.templateIndex;
  });
}


function isRootTemplateShape(template: TemplateRule): boolean {
  return template.name === undefined
    && template.modes.length === 0
    && template.params.length === 0
    && template.match !== undefined
    && template.match.kind === 'path'
    && template.match.absolute
    && template.match.base === undefined
    && template.match.steps.length === 0;
}

function getSimpleMatchPath(template: TemplateRule): readonly string[] | undefined {
  if (
    template.name !== undefined
    || template.modes.length > 0
    || template.match === undefined
    || template.match.kind !== 'path'
    || template.match.base !== undefined
    || template.match.steps.length === 0
  ) {
    return undefined;
  }

  const path: string[] = [];
  for (const step of template.match.steps) {
    if (
      step.kind !== 'step'
      || step.axis !== 'child'
      || step.predicates.length > 0
    ) {
      return undefined;
    }

    if (step.nodeTest.kind === 'nameTest') {
      if (step.nodeTest.name.includes(':')) {
        return undefined;
      }

      path.push(step.nodeTest.name);
      continue;
    }

    if (step.nodeTest.kind === 'wildcardTest') {
      path.push('*');
      continue;
    }

    return undefined;
  }

  return path;
}

function getTemplatePriority(template: TemplateRule): number {
  if (template.priority !== undefined) {
    return template.priority;
  }

  if (template.match === undefined || template.match.kind !== 'path') {
    return Number.NEGATIVE_INFINITY;
  }

  if (isRootTemplateShape(template)) {
    return 0.5;
  }

  const match = template.match;
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

function selectPathMatchesTemplate(
  selectPath: readonly (string | SimpleSelectPathStepPlan)[],
  templatePath: readonly string[],
  templateIsAbsolute: boolean,
): boolean {
  const selectSegments = selectPath.map((step) => typeof step === 'string' ? step : step.name);

  if (templateIsAbsolute) {
    return selectSegments.length === templatePath.length && pathsOverlapAtOffset(selectSegments, templatePath, 0);
  }

  return selectSegments.length >= templatePath.length && pathsOverlapAtOffset(selectSegments, templatePath, selectSegments.length - templatePath.length);
}

function pathsOverlapAtOffset(path: readonly string[], suffix: readonly string[], offset: number): boolean {
  for (let index = 0; index < suffix.length; index += 1) {
    if (!segmentsOverlap(path[offset + index], suffix[index])) {
      return false;
    }
  }

  return true;
}

function segmentsOverlap(left: string | undefined, right: string | undefined): boolean {
  if (left === undefined || right === undefined) {
    return false;
  }

  return left === '*' || right === '*' || left === right;
}

function findSingleApplyTemplatesInstruction(
  instructions: readonly Instruction[],
): Extract<Instruction, { readonly kind: 'applyTemplates' }> | undefined {
  const matches: Array<Extract<Instruction, { readonly kind: 'applyTemplates' }>> = [];

  const visit = (items: readonly Instruction[]) => {
    for (const instruction of items) {
      switch (instruction.kind) {
        case 'applyTemplates':
          matches.push(instruction);
          break;
        case 'literalElement':
        case 'if':
        case 'forEach':
          visit(instruction.body);
          break;
        case 'conditionalContent':
          if (instruction.body !== undefined) {
            visit(instruction.body);
          }
          break;
        case 'choose':
          for (const branch of instruction.whenBranches) {
            visit(branch.body);
          }
          if (instruction.otherwiseBody !== undefined) {
            visit(instruction.otherwiseBody);
          }
          break;
        default:
          break;
      }
    }
  };

  visit(instructions);
  return matches.length === 1 ? matches[0] : undefined;
}

function getSimpleSelectPath(
  ast: PathExpression | StepExpression | object,
): { readonly absolute: boolean; readonly steps: readonly SimpleSelectPathStepPlan[] } | undefined {
  if (!('kind' in ast) || ast.kind !== 'path' || ast.base !== undefined) {
    return undefined;
  }

  const steps: SimpleSelectPathStepPlan[] = [];
  for (const step of ast.steps) {
    if (step.kind !== 'step' || step.axis !== 'child' || step.predicates.length > 1) {
      return undefined;
    }

    const predicate = step.predicates[0];
    const predicatePlan = predicate === undefined ? {} : tryGetSupportedStepPositionPredicate(predicate);
    if (predicate !== undefined && predicatePlan === undefined) {
      return undefined;
    }

    if (step.nodeTest.kind === 'nameTest') {
      if (step.nodeTest.name.includes(':')) {
        return undefined;
      }

      steps.push({ name: step.nodeTest.name, ...(predicatePlan ?? {}) });
      continue;
    }

    if (step.nodeTest.kind === 'wildcardTest') {
      steps.push({ name: '*', ...(predicatePlan ?? {}) });
      continue;
    }

    return undefined;
  }

  return {
    absolute: ast.absolute,
    steps,
  };
}
