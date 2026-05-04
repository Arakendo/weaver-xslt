import type { AttributeInstruction, Instruction, StylesheetIR, TemplateRule } from '../compile/ir.js';
import type { BinaryExpression, FunctionCallExpression, PathExpression, StepExpression, XPathAst } from '../../xpath/parse/ast.js';
import {
  tsBinaryExpression,
  tsCallExpression,
  tsConcatExpression,
  tsConditionalExpression,
  tsRawExpression,
  tsStringLiteral,
  type TsExpression,
} from './ts-ir.js';
import { emitRootApplyTemplatesInstruction, tryGetRootApplyTemplatesShape } from './nativeApplyTemplates.js';

export interface NativeTransformPlan {
  readonly currentNodeExpression: TsExpression;
  readonly currentNodeMayBeNull: boolean;
  readonly needsCurrentNodeBinding: boolean;
  readonly outputExpression: TsExpression;
  readonly runtimeHelpers: readonly string[];
}

export function tryCreateNativeTransformPlan(ir: StylesheetIR): NativeTransformPlan | undefined {
  if (ir.globalBindings.length > 0) {
    return undefined;
  }

  const singleTemplatePlan = tryCreateSingleTemplateNativePlan(ir);
  if (singleTemplatePlan !== undefined) {
    return singleTemplatePlan;
  }

  const rootApplyTemplatesPlan = tryCreateRootApplyTemplatesNativePlan(ir);
  if (rootApplyTemplatesPlan !== undefined) {
    return rootApplyTemplatesPlan;
  }

  return tryCreateMatchedTemplateApplyTemplatesNativePlan(ir);
}

function tryCreateSingleTemplateNativePlan(ir: StylesheetIR): NativeTransformPlan | undefined {
  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  if (ir.templates.length !== 1) {
    return undefined;
  }

  const [template] = ir.templates;
  if (
    template === undefined
    || template.name !== undefined
    || template.modes.length > 0
    || template.params.length > 0
  ) {
    return undefined;
  }

  const templateContext = createTemplateContextPlan(template, runtimeHelpers);
  if (templateContext === undefined) {
    return undefined;
  }

  const outputExpression = emitInstructionSequence(template.body, runtimeHelpers);
  if (outputExpression === undefined) {
    return undefined;
  }

  return {
    currentNodeExpression: templateContext.currentNodeExpression,
    currentNodeMayBeNull: templateContext.currentNodeMayBeNull,
    needsCurrentNodeBinding: templateContext.currentNodeMayBeNull || outputExpression.code.includes('currentNode'),
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function tryCreateRootApplyTemplatesNativePlan(ir: StylesheetIR): NativeTransformPlan | undefined {
  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  const shape = tryGetRootApplyTemplatesShape(ir);
  if (shape === undefined) {
    return undefined;
  }
  const { rootTemplate, childTemplate, childMatchAbsolute, childMatchPath } = shape;

  const outputExpression = emitInstructionSequence(rootTemplate.body, runtimeHelpers, {
    renderApplyTemplates: (instruction) => emitRootApplyTemplatesInstruction(
      instruction,
      childTemplate,
      childMatchAbsolute,
      childMatchPath,
      'currentNode',
      runtimeHelpers,
      emitInstructionSequence,
      tryGetSimpleChildPath,
    ),
  });
  if (outputExpression === undefined) {
    return undefined;
  }

  return {
    currentNodeExpression: tsRawExpression('document'),
    currentNodeMayBeNull: false,
    needsCurrentNodeBinding: false,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function tryCreateMatchedTemplateApplyTemplatesNativePlan(ir: StylesheetIR): NativeTransformPlan | undefined {
  if (ir.templates.length !== 2) {
    return undefined;
  }

  const primaryTemplate = ir.templates.find((template) =>
    template.name === undefined
    && template.modes.length === 0
    && template.params.length === 0
    && template.match !== undefined
    && template.match.kind === 'path'
    && template.match.absolute
    && template.match.base === undefined,
  );
  const childTemplate = ir.templates.find((template) => template !== primaryTemplate);
  if (primaryTemplate === undefined || childTemplate === undefined) {
    return undefined;
  }

  if (
    childTemplate.name !== undefined
    || childTemplate.modes.length > 0
    || childTemplate.params.length > 0
    || childTemplate.match === undefined
    || childTemplate.match.kind !== 'path'
    || childTemplate.match.absolute
    || childTemplate.match.base !== undefined
  ) {
    return undefined;
  }

  const childMatchPath = childTemplate.match.steps.map((step) => {
    if (
      step.kind !== 'step'
      || step.axis !== 'child'
      || step.predicates.length > 0
      || step.nodeTest.kind !== 'nameTest'
      || step.nodeTest.name.includes(':')
    ) {
      return undefined;
    }

    return step.nodeTest.name;
  });
  if (childMatchPath.length === 0 || childMatchPath.some((segment) => segment === undefined)) {
    return undefined;
  }

  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  const templateContext = createTemplateContextPlan(primaryTemplate, runtimeHelpers);
  if (templateContext === undefined) {
    return undefined;
  }

  const outputExpression = emitInstructionSequence(primaryTemplate.body, runtimeHelpers, {
    renderApplyTemplates: (instruction) => emitRootApplyTemplatesInstruction(
      instruction,
      childTemplate,
      false,
      childMatchPath,
      'currentNode',
      runtimeHelpers,
      emitInstructionSequence,
      tryGetSimpleChildPath,
    ),
  });
  if (outputExpression === undefined) {
    return undefined;
  }

  return {
    currentNodeExpression: templateContext.currentNodeExpression,
    currentNodeMayBeNull: templateContext.currentNodeMayBeNull,
    needsCurrentNodeBinding: templateContext.currentNodeMayBeNull || outputExpression.code.includes('currentNode'),
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function createTemplateContextPlan(
  template: TemplateRule,
  runtimeHelpers: Set<string>,
): { readonly currentNodeExpression: TsExpression; readonly currentNodeMayBeNull: boolean } | undefined {
  if (template.match === undefined || template.match.kind !== 'path') {
    return undefined;
  }

  if (template.match.absolute && template.match.base === undefined && template.match.steps.length === 0) {
    return {
      currentNodeExpression: tsRawExpression('document'),
      currentNodeMayBeNull: false,
    };
  }

  const matchPath = tryGetSimpleMatchPath(template.match);
  if (matchPath === undefined) {
    return undefined;
  }

  runtimeHelpers.add('selectSimplePathNode');
  return {
    currentNodeExpression: tsCallExpression('selectSimplePathNode', [
      tsRawExpression('document'),
      tsRawExpression(JSON.stringify(matchPath)),
    ]),
    currentNodeMayBeNull: true,
  };
}

function emitInstructionSequence(
  instructions: readonly Instruction[],
  runtimeHelpers: Set<string>,
  options: {
    readonly contextNodeIdentifier?: string;
    readonly renderApplyTemplates?: (
      instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
    ) => TsExpression | undefined;
  } = {},
): TsExpression | undefined {
  const expressions: TsExpression[] = [];
  const contextNodeIdentifier = options.contextNodeIdentifier ?? 'currentNode';

  for (const instruction of instructions) {
    const emitted = emitInstruction(instruction, runtimeHelpers, contextNodeIdentifier, options);
    if (emitted === undefined) {
      return undefined;
    }

    expressions.push(emitted);
  }

  return tsConcatExpression(expressions);
}

function emitInstruction(
  instruction: Instruction,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  options: {
    readonly contextNodeIdentifier?: string;
    readonly renderApplyTemplates?: (
      instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
    ) => TsExpression | undefined;
  },
): TsExpression | undefined {
  switch (instruction.kind) {
    case 'literalElement': {
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier,
      });
      if (body === undefined) {
        return undefined;
      }

      return tsConcatExpression([
        tsStringLiteral(`<${instruction.name}${emitAttributes(instruction.attributes)}>`),
        body,
        tsStringLiteral(`</${instruction.name}>`),
      ]);
    }
    case 'literalText':
      return tsStringLiteral(escapeTextLiteral(instruction.text));
    case 'valueOf': {
      if (instruction.select.kind === 'contextItem') {
        runtimeHelpers.add('escapeText');
        runtimeHelpers.add('stringValueOfNode');

        return tsCallExpression('escapeText', [
          tsCallExpression('stringValueOfNode', [
            tsRawExpression(contextNodeIdentifier),
          ]),
        ]);
      }

      const simplePath = tryGetSimpleChildPath(instruction.select);
      if (simplePath === undefined) {
        return undefined;
      }

      runtimeHelpers.add('escapeText');
      runtimeHelpers.add('selectSimplePathText');
      const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;
      return tsCallExpression('escapeText', [
        tsCallExpression('selectSimplePathText', [
          tsRawExpression(startNode),
          tsRawExpression(JSON.stringify(simplePath.segments)),
        ]),
      ]);
    }
    case 'if': {
      const testExpression = emitTestExpression(instruction.test, runtimeHelpers, contextNodeIdentifier);
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier,
      });
      if (testExpression === undefined || body === undefined) {
        return undefined;
      }

      return tsConditionalExpression(testExpression, body, tsStringLiteral(''));
    }
    case 'choose': {
      const branches: Array<{ readonly test: TsExpression; readonly body: TsExpression }> = [];

      for (const branch of instruction.whenBranches) {
        const testExpression = emitTestExpression(branch.test, runtimeHelpers, contextNodeIdentifier);
        const bodyExpression = emitInstructionSequence(branch.body, runtimeHelpers, {
          ...options,
          contextNodeIdentifier,
        });
        if (testExpression === undefined || bodyExpression === undefined) {
          return undefined;
        }

        branches.push({ test: testExpression, body: bodyExpression });
      }

      if (branches.length === 0) {
        return undefined;
      }

      let otherwiseExpression = instruction.otherwiseBody === undefined
        ? tsStringLiteral('')
        : emitInstructionSequence(instruction.otherwiseBody, runtimeHelpers, {
            ...options,
            contextNodeIdentifier,
          });
      if (otherwiseExpression === undefined) {
        return undefined;
      }

      for (let index = branches.length - 1; index >= 0; index -= 1) {
        const branch = branches[index];
        if (branch === undefined) {
          return undefined;
        }

        otherwiseExpression = tsConditionalExpression(branch.test, branch.body, otherwiseExpression);
      }

      return otherwiseExpression;
    }
    case 'forEach': {
      const simplePath = tryGetSimpleChildPath(instruction.select);
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier: 'currentNode',
      });
      if (simplePath === undefined || body === undefined) {
        return undefined;
      }

      runtimeHelpers.add('selectSimplePathNodes');
      const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;
      return tsRawExpression(
        `selectSimplePathNodes(${startNode}, ${JSON.stringify(simplePath.segments)}).map((currentNode) => ${body.code}).join("")`,
      );
    }
    case 'applyTemplates':
      return options.renderApplyTemplates?.(instruction);
    default:
      return undefined;
  }
}

function emitTestExpression(
  ast: XPathAst,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
): TsExpression | undefined {
  switch (ast.kind) {
    case 'binary':
      return emitBinaryTestExpression(ast, runtimeHelpers, contextNodeIdentifier);
    case 'functionCall':
      return emitFunctionCallTestExpression(ast, runtimeHelpers, contextNodeIdentifier);
    case 'path': {
      const simplePath = tryGetSimpleChildPath(ast);
      if (simplePath === undefined) {
        return undefined;
      }

      runtimeHelpers.add('selectSimplePathExists');
      const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;
      return tsCallExpression('selectSimplePathExists', [
        tsRawExpression(startNode),
        tsRawExpression(JSON.stringify(simplePath.segments)),
      ]);
    }
    default:
      return undefined;
  }
}

function emitFunctionCallTestExpression(
  ast: FunctionCallExpression,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
): TsExpression | undefined {
  if (ast.callee === 'true' && ast.arguments.length === 0) {
    return tsRawExpression('true');
  }

  if (ast.callee === 'false' && ast.arguments.length === 0) {
    return tsRawExpression('false');
  }

  if (ast.callee !== 'not' || ast.arguments.length !== 1) {
    return undefined;
  }

  const [argument] = ast.arguments;
  if (argument === undefined) {
    return undefined;
  }

  const testExpression = emitTestExpression(argument, runtimeHelpers, contextNodeIdentifier);
  if (testExpression === undefined) {
    return undefined;
  }

  return tsRawExpression(`(!${testExpression.code})`);
}

function emitBinaryTestExpression(
  ast: BinaryExpression,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
): TsExpression | undefined {
  if (ast.operator === 'and' || ast.operator === 'or') {
    const left = emitTestExpression(ast.left, runtimeHelpers, contextNodeIdentifier);
    const right = emitTestExpression(ast.right, runtimeHelpers, contextNodeIdentifier);
    if (left === undefined || right === undefined) {
      return undefined;
    }

    return tsBinaryExpression(left, ast.operator === 'and' ? '&&' : '||', right);
  }

  const operator = mapComparisonOperator(ast.operator);
  if (operator === undefined) {
    return undefined;
  }

  const left = emitComparisonOperand(ast.left, runtimeHelpers, contextNodeIdentifier);
  const right = emitComparisonOperand(ast.right, runtimeHelpers, contextNodeIdentifier);
  if (left === undefined || right === undefined || left.kind !== right.kind) {
    return undefined;
  }

  return tsBinaryExpression(left.expression, operator, right.expression);
}

function emitComparisonOperand(
  ast: XPathAst,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
): { readonly kind: 'number' | 'string'; readonly expression: TsExpression } | undefined {
  switch (ast.kind) {
    case 'number':
      return {
        kind: 'number',
        expression: tsRawExpression(ast.lexeme),
      };
    case 'string':
      return {
        kind: 'string',
        expression: tsStringLiteral(ast.value),
      };
    case 'path': {
      const simplePath = tryGetSimpleChildPath(ast);
      if (simplePath === undefined) {
        return undefined;
      }

      runtimeHelpers.add('selectSimplePathText');
      const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;
      return {
        kind: 'string',
        expression: tsCallExpression('selectSimplePathText', [
          tsRawExpression(startNode),
          tsRawExpression(JSON.stringify(simplePath.segments)),
        ]),
      };
    }
    default:
      return undefined;
  }
}

function mapComparisonOperator(operator: BinaryExpression['operator']): '===' | '!==' | '<' | '<=' | '>' | '>=' | undefined {
  switch (operator) {
    case '=':
    case 'eq':
      return '===';
    case '!=':
    case 'ne':
      return '!==' ;
    case '<':
    case 'lt':
      return '<';
    case '<=':
    case 'le':
      return '<=';
    case '>':
    case 'gt':
      return '>';
    case '>=':
    case 'ge':
      return '>=';
    default:
      return undefined;
  }
}

function emitAttributes(attributes: readonly AttributeInstruction[]): string {
  return attributes.map((attribute) => ` ${attribute.name}="${escapeAttributeLiteral(attribute.value)}"`).join('');
}

function tryGetSimpleMatchPath(ast: PathExpression): readonly string[] | undefined {
  if (!ast.absolute || ast.base !== undefined || ast.steps.length === 0) {
    return undefined;
  }

  const path: string[] = [];
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

    path.push(step.nodeTest.name);
  }

  return path;
}

function tryGetSimpleChildPath(
  ast: Instruction extends never ? never : PathExpression | StepExpression | object,
): { readonly absolute: boolean; readonly segments: readonly string[] } | undefined {
  if (!('kind' in ast) || ast.kind !== 'path' || ast.base !== undefined) {
    return undefined;
  }

  const names: string[] = [];
  for (const step of ast.steps) {
    if (step.kind !== 'step' || step.axis !== 'child' || step.predicates.length > 0 || step.nodeTest.kind !== 'nameTest') {
      return undefined;
    }

    if (step.nodeTest.name.includes(':')) {
      return undefined;
    }

    names.push(step.nodeTest.name);
  }

  return {
    absolute: ast.absolute,
    segments: names,
  };
}

function escapeTextLiteral(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttributeLiteral(value: string): string {
  return escapeTextLiteral(value)
    .replaceAll('"', '&quot;');
}