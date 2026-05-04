import type { Instruction, StylesheetIR, TemplateRule } from '../compile/ir.js';
import type { PathExpression, StepExpression } from '../../xpath/parse/ast.js';
import { tsRawExpression, type TsExpression } from './ts-ir.js';

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
  if (rootApplyTemplates === undefined || rootApplyTemplates.withParams.length > 0) {
    return undefined;
  }

  const remainingTemplates = ir.templates.filter((template) => template !== rootTemplate);
  if (remainingTemplates.length !== 2) {
    return undefined;
  }

  const candidateTemplates = remainingTemplates.map((template) => {
    const matchPath = getSimpleMatchPath(template);
    if (matchPath === undefined) {
      return undefined;
    }

    return {
      template,
      matchAbsolute: template.match?.kind === 'path' ? template.match.absolute : false,
      matchPath,
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
          selectPathMatchesTemplate(selectPath.segments, candidate.matchPath, candidate.matchAbsolute),
        );
      })();
  if (matchingCandidates.length !== 1) {
    return undefined;
  }

  const childCandidate = matchingCandidates[0];
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
    options?: {
      readonly contextNodeIdentifier?: string;
      readonly renderApplyTemplates?: (
        instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
        contextNodeIdentifier: string,
      ) => TsExpression | undefined;
    },
  ) => TsExpression | undefined,
  tryGetSimpleChildPath: (
    ast: PathExpression | StepExpression | object,
  ) => { readonly absolute: boolean; readonly segments: readonly string[] } | undefined,
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
        ),
      });
  if (childBody === undefined) {
    return undefined;
  }

  if (instruction.select === undefined) {
    runtimeHelpers.add('applyBuiltInTemplatesByPath');
    return tsRawExpression(
      childMatchAbsolute
        ? `applyBuiltInTemplatesByPath(document, ${JSON.stringify(childMatchPath)}, (templateNode) => ${childBody.code}, true)`
        : `applyBuiltInTemplatesByPath(${contextNodeIdentifier}, ${JSON.stringify(childMatchPath)}, (templateNode) => ${childBody.code})`,
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
  return tsRawExpression(
    `selectSimplePathNodes(${selectPath.absolute ? 'document' : contextNodeIdentifier}, ${JSON.stringify(selectPath.segments)}).map((templateNode) => ${childBody.code}).join("")`,
  );
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
    || template.params.length > 0
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
      || step.nodeTest.kind !== 'nameTest'
      || step.nodeTest.name.includes(':')
    ) {
      return undefined;
    }

    path.push(step.nodeTest.name);
  }

  return path;
}

function selectPathMatchesTemplate(
  selectPath: readonly string[],
  templatePath: readonly string[],
  templateIsAbsolute: boolean,
): boolean {
  if (templateIsAbsolute) {
    return selectPath.length === templatePath.length && endsWithPath(selectPath, templatePath);
  }

  return selectPath.length >= templatePath.length && endsWithPath(selectPath, templatePath);
}

function endsWithPath(path: readonly string[], suffix: readonly string[]): boolean {
  const offset = path.length - suffix.length;
  for (let index = 0; index < suffix.length; index += 1) {
    if (path[offset + index] !== suffix[index]) {
      return false;
    }
  }

  return true;
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
): { readonly absolute: boolean; readonly segments: readonly string[] } | undefined {
  if (!('kind' in ast) || ast.kind !== 'path' || ast.base !== undefined) {
    return undefined;
  }

  const segments: string[] = [];
  for (const step of ast.steps) {
    if (
      step.kind !== 'step'
      || step.axis !== 'child'
      || step.predicates.length > 0
      || step.nodeTest.kind !== 'nameTest'
      || step.nodeTest.name.includes(':')
    ) {
      return undefined;
    }

    segments.push(step.nodeTest.name);
  }

  return {
    absolute: ast.absolute,
    segments,
  };
}