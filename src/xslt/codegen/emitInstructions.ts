import type { AttributeInstruction, GlobalBinding, Instruction, StylesheetIR, TemplateRule } from '../compile/ir.js';
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
import {
  emitPlannedApplyTemplatesInstruction,
  tryGetRootApplyTemplatesPlan,
  tryGetRootApplyTemplatesShape,
  type ApplyTemplatesTemplatePlan,
} from './nativeApplyTemplates.js';
import {
  renderCommentedArrowFunction,
  renderInstructionProvenanceComment,
  renderOtherwiseProvenanceComment,
  renderTemplateProvenanceComment,
  renderWhenProvenanceComment,
} from './provenance.js';

export interface NativeTransformPlan {
  readonly entryTemplate: TemplateRule;
  readonly currentNodeExpression: TsExpression;
  readonly currentNodeMayBeNull: boolean;
  readonly needsCurrentNodeBinding: boolean;
  readonly setupStatements: readonly string[];
  readonly outputExpression: TsExpression;
  readonly runtimeHelpers: readonly string[];
}

export function tryCreateNativeTransformPlan(ir: StylesheetIR, sourcePath?: string): NativeTransformPlan | undefined {
  const singleTemplatePlan = tryCreateSingleTemplateNativePlan(ir, sourcePath);
  if (singleTemplatePlan !== undefined) {
    return singleTemplatePlan;
  }

  const rootApplyTemplatesPlan = tryCreateRootApplyTemplatesNativePlan(ir, sourcePath);
  if (rootApplyTemplatesPlan !== undefined) {
    return rootApplyTemplatesPlan;
  }

  return tryCreateMatchedTemplateApplyTemplatesNativePlan(ir, sourcePath);
}

function tryCreateSingleTemplateNativePlan(ir: StylesheetIR, sourcePath?: string): NativeTransformPlan | undefined {
  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === undefined) {
    return undefined;
  }
  if (ir.templates.length === 0) {
    return undefined;
  }

  const primaryTemplates = ir.templates.filter((template) =>
    template.name === undefined
    && template.modes.length === 0
    && template.params.length === 0,
  );
  if (primaryTemplates.length !== 1) {
    return undefined;
  }

  const [template] = primaryTemplates;
  if (
    template === undefined
  ) {
    return undefined;
  }

  const namedTemplates = new Map<string, TemplateRule>();
  for (const candidate of ir.templates) {
    if (candidate === template) {
      continue;
    }

    if (
      candidate.name === undefined
      || candidate.match !== undefined
      || candidate.modes.length > 0
      || candidate.params.length > 0
    ) {
      return undefined;
    }

    namedTemplates.set(candidate.name, candidate);
  }

  const templateContext = createTemplateContextPlan(template, runtimeHelpers);
  if (templateContext === undefined) {
    return undefined;
  }

  const outputExpression = emitInstructionSequence(template.body, runtimeHelpers, namedTemplates.size === 0
    ? {
        variableBindings: globalBindingSetup.variableBindings,
      }
    : {
        namedTemplates,
        activeNamedTemplateNames: [],
        variableBindings: globalBindingSetup.variableBindings,
        ...(sourcePath === undefined ? {} : { sourcePath }),
      });
  if (outputExpression === undefined) {
    return undefined;
  }

  return {
    entryTemplate: template,
    currentNodeExpression: templateContext.currentNodeExpression,
    currentNodeMayBeNull: templateContext.currentNodeMayBeNull,
    needsCurrentNodeBinding: templateContext.currentNodeMayBeNull || outputExpression.code.includes('currentNode'),
    setupStatements: globalBindingSetup.setupStatements,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function tryCreateRootApplyTemplatesNativePlan(ir: StylesheetIR, sourcePath?: string): NativeTransformPlan | undefined {
  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === undefined) {
    return undefined;
  }
  const shape = tryGetRootApplyTemplatesShape(ir);
  const recursivePlan = shape === undefined ? tryGetRootApplyTemplatesPlan(ir) : undefined;
  if (shape === undefined && recursivePlan === undefined) {
    return undefined;
  }
  const rootTemplate = shape?.rootTemplate ?? recursivePlan?.rootTemplate;
  const childPlan: ApplyTemplatesTemplatePlan | undefined = shape === undefined
    ? recursivePlan?.childPlan
    : {
        template: shape.childTemplate,
        matchAbsolute: shape.childMatchAbsolute,
        matchPath: shape.childMatchPath,
      };
  if (rootTemplate === undefined || childPlan === undefined) {
    return undefined;
  }

  const outputExpression = emitInstructionSequence(rootTemplate.body, runtimeHelpers, {
    contextNodeIdentifier: 'document',
    variableBindings: globalBindingSetup.variableBindings,
    renderApplyTemplates: (instruction, contextNodeIdentifier) => emitPlannedApplyTemplatesInstruction(
      instruction,
      childPlan,
      contextNodeIdentifier,
      runtimeHelpers,
      emitInstructionSequence,
      tryGetSimpleChildPath,
      sourcePath,
    ),
  });
  if (outputExpression === undefined) {
    return undefined;
  }

  return {
    entryTemplate: rootTemplate,
    currentNodeExpression: tsRawExpression('document'),
    currentNodeMayBeNull: false,
    needsCurrentNodeBinding: false,
    setupStatements: globalBindingSetup.setupStatements,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function tryCreateMatchedTemplateApplyTemplatesNativePlan(ir: StylesheetIR, sourcePath?: string): NativeTransformPlan | undefined {
  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === undefined) {
    return undefined;
  }
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

  const childMatchSegments = childTemplate.match.steps.map((step) => {
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
  const childMatchPath = childMatchSegments.filter((segment): segment is string => segment !== undefined);
  if (childMatchPath.length === 0 || childMatchPath.length !== childMatchSegments.length) {
    return undefined;
  }

  const templateContext = createTemplateContextPlan(primaryTemplate, runtimeHelpers);
  if (templateContext === undefined) {
    return undefined;
  }

  const outputExpression = emitInstructionSequence(primaryTemplate.body, runtimeHelpers, {
    variableBindings: globalBindingSetup.variableBindings,
    renderApplyTemplates: (instruction, contextNodeIdentifier) => emitPlannedApplyTemplatesInstruction(
      instruction,
      {
        template: childTemplate,
        matchAbsolute: false,
        matchPath: childMatchPath,
      },
      contextNodeIdentifier,
      runtimeHelpers,
      emitInstructionSequence,
      tryGetSimpleChildPath,
      sourcePath,
    ),
  });
  if (outputExpression === undefined) {
    return undefined;
  }

  return {
    entryTemplate: primaryTemplate,
    currentNodeExpression: templateContext.currentNodeExpression,
    currentNodeMayBeNull: templateContext.currentNodeMayBeNull,
    needsCurrentNodeBinding: templateContext.currentNodeMayBeNull || outputExpression.code.includes('currentNode'),
    setupStatements: globalBindingSetup.setupStatements,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function tryCreateGlobalBindingSetup(
  bindings: readonly GlobalBinding[],
  runtimeHelpers: Set<string>,
): { readonly setupStatements: readonly string[]; readonly variableBindings: ReadonlyMap<string, TsExpression> } | undefined {
  if (bindings.length === 0) {
    return {
      setupStatements: [],
      variableBindings: new Map(),
    };
  }

  const setupStatements: string[] = [];
  const variableBindings = new Map<string, TsExpression>();

  const bindingPlans = bindings.map((binding, index) => ({
    binding,
    identifier: `global_${binding.kind}_${sanitizeIdentifierFragment(binding.name)}_${index}`,
    getterIdentifier: `get_global_${binding.kind}_${sanitizeIdentifierFragment(binding.name)}_${index}`,
    stateIdentifier: `global_${binding.kind}_${sanitizeIdentifierFragment(binding.name)}_${index}_state`,
    cacheIdentifier: `global_${binding.kind}_${sanitizeIdentifierFragment(binding.name)}_${index}_cache`,
  }));

  for (const plan of bindingPlans) {
    const bindingReference = tsRawExpression(`${plan.getterIdentifier}()`);
    variableBindings.set(plan.binding.name, bindingReference);
    if (!plan.binding.name.startsWith('{}')) {
      variableBindings.set(`{}${plan.binding.name}`, bindingReference);
    }
  }

  runtimeHelpers.add('prependNativeGlobalBindingError');
  runtimeHelpers.add('throwCircularNativeGlobalBinding');

  for (const plan of bindingPlans) {
    const { binding, identifier, getterIdentifier, stateIdentifier, cacheIdentifier } = plan;
    if (binding.body !== undefined || (binding.kind === 'param' && binding.required)) {
      return undefined;
    }

    const defaultValueExpression = binding.select === undefined
      ? tsStringLiteral('')
      : emitVariableValueExpression(binding.select, runtimeHelpers, 'document', { variableBindings });
    if (defaultValueExpression === undefined) {
      return undefined;
    }

    setupStatements.push(`let ${stateIdentifier} = 0;`);
    setupStatements.push(`let ${cacheIdentifier};`);
    setupStatements.push(`function ${getterIdentifier}() {`);
    setupStatements.push(`  if (${stateIdentifier} === 2) { return ${cacheIdentifier}; }`);
    setupStatements.push(`  if (${stateIdentifier} === 1) { throwCircularNativeGlobalBinding(${JSON.stringify(binding.kind)}, ${JSON.stringify(binding.name)}, ${JSON.stringify(binding.location)}); }`);
    setupStatements.push(`  ${stateIdentifier} = 1;`);
    setupStatements.push('  try {');

    if (binding.kind === 'param') {
      setupStatements.push(
        `    const raw_${identifier} = ctx.parameters?.[${JSON.stringify(binding.name)}] ?? ctx.parameters?.[${JSON.stringify(binding.name.startsWith('{}') ? binding.name : `{}${binding.name}`)}];`,
      );
      setupStatements.push(
        `    ${cacheIdentifier} = raw_${identifier} === undefined ? ${defaultValueExpression.code} : String(raw_${identifier});`,
      );
    } else {
      setupStatements.push(`    ${cacheIdentifier} = ${defaultValueExpression.code};`);
    }

    setupStatements.push(`    ${stateIdentifier} = 2;`);
    setupStatements.push(`    return ${cacheIdentifier};`);
    setupStatements.push('  } catch (error) {');
    setupStatements.push(`    ${stateIdentifier} = 0;`);
    setupStatements.push(`    throw prependNativeGlobalBindingError(error, ${JSON.stringify(binding.kind)}, ${JSON.stringify(binding.name)}, ${JSON.stringify(binding.selectText)}, ${JSON.stringify(binding.location)});`);
    setupStatements.push('  }');
    setupStatements.push('}');
  }

  return {
    setupStatements,
    variableBindings,
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
    readonly positionExpression?: string;
    readonly lastExpression?: string;
    readonly namedTemplates?: ReadonlyMap<string, TemplateRule>;
    readonly activeNamedTemplateNames?: readonly string[];
    readonly sourcePath?: string;
    readonly variableBindings?: ReadonlyMap<string, TsExpression>;
    readonly renderApplyTemplates?: (
      instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
        contextNodeIdentifier: string,
    ) => TsExpression | undefined;
  } = {},
): TsExpression | undefined {
  const expressions: TsExpression[] = [];
  const contextNodeIdentifier = options.contextNodeIdentifier ?? 'currentNode';

  for (const instruction of instructions) {
    if (instruction.kind === 'variable') {
      const bindingExpression = emitVariableBindingExpression(instruction, runtimeHelpers, contextNodeIdentifier, options);
      if (bindingExpression === undefined) {
        return undefined;
      }

      const variableIdentifier = `variable_${sanitizeIdentifierFragment(instruction.name)}_${expressions.length}`;
      const variableBindings = new Map(options.variableBindings ?? []);
      const bindingReference = tsRawExpression(variableIdentifier);
      variableBindings.set(instruction.name, bindingReference);
      if (!instruction.name.startsWith('{}')) {
        variableBindings.set(`{}${instruction.name}`, bindingReference);
      }

      const remainingExpression = emitInstructionSequence(
        instructions.slice(expressions.length + 1),
        runtimeHelpers,
        {
          ...options,
          contextNodeIdentifier,
          variableBindings,
        },
      );
      if (remainingExpression === undefined) {
        return undefined;
      }

      const outputExpression = expressions.length === 0
        ? remainingExpression
        : tsConcatExpression([...expressions, remainingExpression]);
      return tsRawExpression(`(() => { const ${variableIdentifier} = ${bindingExpression.code}; return ${outputExpression.code}; })()`);
    }

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
    readonly positionExpression?: string;
    readonly lastExpression?: string;
    readonly namedTemplates?: ReadonlyMap<string, TemplateRule>;
    readonly activeNamedTemplateNames?: readonly string[];
    readonly sourcePath?: string;
    readonly variableBindings?: ReadonlyMap<string, TsExpression>;
    readonly renderApplyTemplates?: (
      instruction: Extract<Instruction, { readonly kind: 'applyTemplates' }>,
        contextNodeIdentifier: string,
    ) => TsExpression | undefined;
  },
): TsExpression | undefined {
  const annotateInstruction = (expression: TsExpression | undefined): TsExpression | undefined => {
    if (expression === undefined) {
      return undefined;
    }

    const comment = renderInstructionProvenanceComment(instruction, options.sourcePath);
    if (comment === undefined) {
      return expression;
    }

    return tsRawExpression(`(\n  ${comment}\n  ${expression.code}\n)`);
  };

  switch (instruction.kind) {
    case 'literalElement': {
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier,
      });
      if (body === undefined) {
        return undefined;
      }

      return annotateInstruction(tsConcatExpression([
        tsStringLiteral(`<${instruction.name}${emitAttributes(instruction.attributes)}>`),
        body,
        tsStringLiteral(`</${instruction.name}>`),
      ]));
    }
    case 'literalText':
      return tsStringLiteral(escapeTextLiteral(instruction.text));
    case 'comment': {
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier,
      });
      if (body === undefined) {
        return undefined;
      }

      return annotateInstruction(tsConcatExpression([
        tsStringLiteral('<!--'),
        body,
        tsStringLiteral('-->'),
      ]));
    }
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

      if (instruction.select.kind === 'variable') {
        const variableExpression = resolveVariableBindingExpression(instruction.select.name, options.variableBindings);
        if (variableExpression === undefined) {
          return undefined;
        }

        runtimeHelpers.add('escapeText');
        return annotateInstruction(tsCallExpression('escapeText', [variableExpression]));
      }

      if (instruction.select.kind === 'functionCall' && instruction.select.arguments.length === 0) {
        let numericExpression: string | undefined;

        if (instruction.select.callee === 'position') {
          numericExpression = options.positionExpression ?? '1';
        }

        if (instruction.select.callee === 'last') {
          numericExpression = options.lastExpression ?? '1';
        }

        if (numericExpression !== undefined) {
          runtimeHelpers.add('escapeText');
          return annotateInstruction(tsCallExpression('escapeText', [
            tsRawExpression(`String(${numericExpression})`),
          ]));
        }

        if (instruction.select.callee === 'name') {
          runtimeHelpers.add('escapeText');
          runtimeHelpers.add('nameOfNode');
          return annotateInstruction(tsCallExpression('escapeText', [
            tsCallExpression('nameOfNode', [
              tsRawExpression(contextNodeIdentifier),
            ]),
          ]));
        }

        if (instruction.select.callee === 'local-name') {
          runtimeHelpers.add('escapeText');
          runtimeHelpers.add('localNameOfNode');
          return annotateInstruction(tsCallExpression('escapeText', [
            tsCallExpression('localNameOfNode', [
              tsRawExpression(contextNodeIdentifier),
            ]),
          ]));
        }
      }

      if (instruction.select.kind === 'functionCall' && instruction.select.arguments.length === 1) {
        const [argument] = instruction.select.arguments;
        if (argument !== undefined && argument.kind === 'path') {
          const simplePath = tryGetSimpleChildPath(argument);
          if (simplePath !== undefined) {
            const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;

            if (instruction.select.callee === 'name') {
              runtimeHelpers.add('escapeText');
              runtimeHelpers.add('nameOfNode');
              runtimeHelpers.add('selectSimplePathNode');
              return annotateInstruction(tsCallExpression('escapeText', [
                tsCallExpression('nameOfNode', [
                  tsCallExpression('selectSimplePathNode', [
                    tsRawExpression(startNode),
                    tsRawExpression(JSON.stringify(simplePath.segments)),
                  ]),
                ]),
              ]));
            }

            if (instruction.select.callee === 'local-name') {
              runtimeHelpers.add('escapeText');
              runtimeHelpers.add('localNameOfNode');
              runtimeHelpers.add('selectSimplePathNode');
              return annotateInstruction(tsCallExpression('escapeText', [
                tsCallExpression('localNameOfNode', [
                  tsCallExpression('selectSimplePathNode', [
                    tsRawExpression(startNode),
                    tsRawExpression(JSON.stringify(simplePath.segments)),
                  ]),
                ]),
              ]));
            }

            if (instruction.select.callee === 'count') {
              runtimeHelpers.add('escapeText');
              runtimeHelpers.add('selectSimplePathNodes');
              return annotateInstruction(tsCallExpression('escapeText', [
                tsRawExpression(`String(selectSimplePathNodes(${startNode}, ${JSON.stringify(simplePath.segments)}).length)`),
              ]));
            }
          }
        }
      }

      const simplePath = tryGetSimpleChildPath(instruction.select);
      if (simplePath === undefined) {
        return undefined;
      }

      runtimeHelpers.add('escapeText');
      runtimeHelpers.add('selectSimplePathText');
      const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;
      return annotateInstruction(tsCallExpression('escapeText', [
        tsCallExpression('selectSimplePathText', [
          tsRawExpression(startNode),
          tsRawExpression(JSON.stringify(simplePath.segments)),
        ]),
      ]));
    }
    case 'if': {
      const testExpression = emitTestExpression(
        instruction.test,
        runtimeHelpers,
        contextNodeIdentifier,
        options.positionExpression,
        options.lastExpression,
      );
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier,
      });
      if (testExpression === undefined || body === undefined) {
        return undefined;
      }

      return annotateInstruction(tsConditionalExpression(testExpression, body, tsStringLiteral('')));
    }
    case 'choose': {
      const annotateBranchBody = (comment: string, body: TsExpression): TsExpression => tsRawExpression(`(
  ${comment}
  ${body.code}
)`);
      const branches: Array<{ readonly test: TsExpression; readonly body: TsExpression }> = [];

      for (const branch of instruction.whenBranches) {
        const testExpression = emitTestExpression(
          branch.test,
          runtimeHelpers,
          contextNodeIdentifier,
          options.positionExpression,
          options.lastExpression,
        );
        const bodyExpression = emitInstructionSequence(branch.body, runtimeHelpers, {
          ...options,
          contextNodeIdentifier,
        });
        if (testExpression === undefined || bodyExpression === undefined) {
          return undefined;
        }

        branches.push({
          test: testExpression,
          body: annotateBranchBody(renderWhenProvenanceComment(branch, options.sourcePath), bodyExpression),
        });
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

      if (instruction.otherwiseBody !== undefined) {
        otherwiseExpression = annotateBranchBody(
          renderOtherwiseProvenanceComment(instruction.otherwiseLocation, options.sourcePath),
          otherwiseExpression,
        );
      }

      for (let index = branches.length - 1; index >= 0; index -= 1) {
        const branch = branches[index];
        if (branch === undefined) {
          return undefined;
        }

        otherwiseExpression = tsConditionalExpression(branch.test, branch.body, otherwiseExpression);
      }

      return annotateInstruction(otherwiseExpression);
    }
    case 'forEach': {
      const simplePath = tryGetSimpleChildPath(instruction.select);
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier: 'currentNode',
        positionExpression: '(currentIndex + 1)',
        lastExpression: 'currentNodes.length',
      });
      if (simplePath === undefined || body === undefined) {
        return undefined;
      }

      runtimeHelpers.add('selectSimplePathNodes');
      const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;
      const callbackParameters = body.code.includes('currentIndex') || body.code.includes('currentNodes.length')
        ? '(currentNode, currentIndex, currentNodes)'
        : '(currentNode)';
      return annotateInstruction(tsRawExpression(
        `selectSimplePathNodes(${startNode}, ${JSON.stringify(simplePath.segments)}).map(${callbackParameters} => ${body.code}).join("")`,
      ));
    }
    case 'callTemplate': {
      if (instruction.withParams.length > 0) {
        return undefined;
      }

      const namedTemplate = options.namedTemplates?.get(instruction.name);
      if (
        namedTemplate === undefined
        || namedTemplate.match !== undefined
        || namedTemplate.modes.length > 0
        || namedTemplate.params.length > 0
      ) {
        return undefined;
      }

      const activeNamedTemplateNames = options.activeNamedTemplateNames ?? [];
      if (activeNamedTemplateNames.includes(instruction.name)) {
        return undefined;
      }

      const body = emitInstructionSequence(namedTemplate.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier,
        activeNamedTemplateNames: [...activeNamedTemplateNames, instruction.name],
      });
      if (body === undefined) {
        return undefined;
      }

      return annotateInstruction(tsRawExpression(
        `(${renderCommentedArrowFunction(
          renderTemplateProvenanceComment(namedTemplate, options.sourcePath),
          '()',
          body.code,
        )})()`,
      ));
    }
    case 'applyTemplates':
      return annotateInstruction(options.renderApplyTemplates?.(instruction, contextNodeIdentifier));
    default:
      return undefined;
  }
}

function emitTestExpression(
  ast: XPathAst,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  positionExpression = '1',
  lastExpression = '1',
): TsExpression | undefined {
  switch (ast.kind) {
    case 'binary':
      return emitBinaryTestExpression(ast, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
    case 'functionCall':
      return emitFunctionCallTestExpression(ast, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
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
  positionExpression: string,
  lastExpression: string,
): TsExpression | undefined {
  if (ast.callee === 'true' && ast.arguments.length === 0) {
    return tsRawExpression('true');
  }

  if (ast.callee === 'false' && ast.arguments.length === 0) {
    return tsRawExpression('false');
  }

  if (ast.callee === 'position' && ast.arguments.length === 0) {
    return tsRawExpression(`(${positionExpression}) !== 0`);
  }

  if (ast.callee === 'last' && ast.arguments.length === 0) {
    return tsRawExpression(`(${lastExpression}) !== 0`);
  }

  if (ast.callee !== 'not' || ast.arguments.length !== 1) {
    return undefined;
  }

  const [argument] = ast.arguments;
  if (argument === undefined) {
    return undefined;
  }

  const testExpression = emitTestExpression(argument, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
  if (testExpression === undefined) {
    return undefined;
  }

  return tsRawExpression(`(!${testExpression.code})`);
}

function emitBinaryTestExpression(
  ast: BinaryExpression,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  positionExpression: string,
  lastExpression: string,
): TsExpression | undefined {
  if (ast.operator === 'and' || ast.operator === 'or') {
    const left = emitTestExpression(ast.left, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
    const right = emitTestExpression(ast.right, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
    if (left === undefined || right === undefined) {
      return undefined;
    }

    return tsBinaryExpression(left, ast.operator === 'and' ? '&&' : '||', right);
  }

  const operator = mapComparisonOperator(ast.operator);
  if (operator === undefined) {
    return undefined;
  }

  const left = emitComparisonOperand(ast.left, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
  const right = emitComparisonOperand(ast.right, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
  if (left === undefined || right === undefined || left.kind !== right.kind) {
    return undefined;
  }

  return tsBinaryExpression(left.expression, operator, right.expression);
}

function emitComparisonOperand(
  ast: XPathAst,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  positionExpression: string,
  lastExpression: string,
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
    case 'functionCall':
      if (ast.arguments.length !== 0) {
        return undefined;
      }

      if (ast.callee === 'position') {
        return {
          kind: 'number',
          expression: tsRawExpression(positionExpression),
        };
      }

      if (ast.callee === 'last') {
        return {
          kind: 'number',
          expression: tsRawExpression(lastExpression),
        };
      }

      return undefined;
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

function emitVariableBindingExpression(
  instruction: Extract<Instruction, { readonly kind: 'variable' }>,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  options: {
    readonly positionExpression?: string;
    readonly lastExpression?: string;
    readonly variableBindings?: ReadonlyMap<string, TsExpression>;
  },
): TsExpression | undefined {
  if (instruction.select === undefined) {
    return instruction.body === undefined ? tsStringLiteral('') : undefined;
  }

  return emitVariableValueExpression(instruction.select, runtimeHelpers, contextNodeIdentifier, options);
}

function emitVariableValueExpression(
  ast: XPathAst,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  options: {
    readonly positionExpression?: string;
    readonly lastExpression?: string;
    readonly variableBindings?: ReadonlyMap<string, TsExpression>;
  },
): TsExpression | undefined {
  switch (ast.kind) {
    case 'contextItem':
      runtimeHelpers.add('stringValueOfNode');
      return tsCallExpression('stringValueOfNode', [tsRawExpression(contextNodeIdentifier)]);
    case 'string':
      return tsStringLiteral(ast.value);
    case 'number':
      return tsRawExpression(`String(${ast.lexeme})`);
    case 'variable':
      return resolveVariableBindingExpression(ast.name, options.variableBindings);
    case 'path': {
      const simplePath = tryGetSimpleChildPath(ast);
      if (simplePath === undefined) {
        return undefined;
      }

      runtimeHelpers.add('selectSimplePathText');
      const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;
      return tsCallExpression('selectSimplePathText', [
        tsRawExpression(startNode),
        tsRawExpression(JSON.stringify(simplePath.segments)),
      ]);
    }
    case 'functionCall': {
      if (ast.arguments.length === 0) {
        if (ast.callee === 'position') {
          return tsRawExpression(`String(${options.positionExpression ?? '1'})`);
        }

        if (ast.callee === 'last') {
          return tsRawExpression(`String(${options.lastExpression ?? '1'})`);
        }

        if (ast.callee === 'name') {
          runtimeHelpers.add('nameOfNode');
          return tsCallExpression('nameOfNode', [tsRawExpression(contextNodeIdentifier)]);
        }

        if (ast.callee === 'local-name') {
          runtimeHelpers.add('localNameOfNode');
          return tsCallExpression('localNameOfNode', [tsRawExpression(contextNodeIdentifier)]);
        }
      }

      if (ast.arguments.length === 1) {
        const [argument] = ast.arguments;
        if (argument === undefined || argument.kind !== 'path') {
          return undefined;
        }

        const simplePath = tryGetSimpleChildPath(argument);
        if (simplePath === undefined) {
          return undefined;
        }

        const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;
        if (ast.callee === 'name') {
          runtimeHelpers.add('nameOfNode');
          runtimeHelpers.add('selectSimplePathNode');
          return tsCallExpression('nameOfNode', [
            tsCallExpression('selectSimplePathNode', [
              tsRawExpression(startNode),
              tsRawExpression(JSON.stringify(simplePath.segments)),
            ]),
          ]);
        }

        if (ast.callee === 'local-name') {
          runtimeHelpers.add('localNameOfNode');
          runtimeHelpers.add('selectSimplePathNode');
          return tsCallExpression('localNameOfNode', [
            tsCallExpression('selectSimplePathNode', [
              tsRawExpression(startNode),
              tsRawExpression(JSON.stringify(simplePath.segments)),
            ]),
          ]);
        }

        if (ast.callee === 'count') {
          runtimeHelpers.add('selectSimplePathNodes');
          return tsRawExpression(`String(selectSimplePathNodes(${startNode}, ${JSON.stringify(simplePath.segments)}).length)`);
        }
      }

      return undefined;
    }
    default:
      return undefined;
  }
}

function resolveVariableBindingExpression(
  name: string,
  variableBindings: ReadonlyMap<string, TsExpression> | undefined,
): TsExpression | undefined {
  if (variableBindings === undefined) {
    return undefined;
  }

  return variableBindings.get(name)
    ?? (name.startsWith('{}') ? undefined : variableBindings.get(`{}${name}`));
}

function sanitizeIdentifierFragment(name: string): string {
  return name.replaceAll(/[^A-Za-z0-9_]/g, '_');
}