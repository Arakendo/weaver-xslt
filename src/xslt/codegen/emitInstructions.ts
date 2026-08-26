import type {
  AttributeInstruction,
  AttributeValueTemplatePart,
  Instruction,
  TemplateRule,
  TemplateParam,
  WithParam,
} from '../compile/ir.js';
import type {
  BinaryExpression,
  FunctionCallExpression,
  XPathAst,
} from '../../xpath/parse/ast.js';
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
  emitPathStringValueExpression,
  emitTracedValueOfPathStringExpression,
  resolveVariableBindingExpression,
  tryGetSimpleChildPath,
  tryResolveSimpleChildPath,
} from './nativePathExpressions.js';
import {
  renderCommentedArrowFunction,
  renderInstructionProvenanceComment,
  renderOtherwiseProvenanceComment,
  renderTemplateProvenanceComment,
  renderWhenProvenanceComment,
} from './provenance.js';

interface ApplyTemplatesRenderContext {
  readonly positionExpression?: string;
  readonly lastExpression?: string;
  readonly variableBindings?: ReadonlyMap<string, TsExpression>;
}

export function tryCreateTemplateInvocationSetup(
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
):
  | {
      readonly setupStatements: readonly string[];
      readonly variableBindings: ReadonlyMap<string, TsExpression>;
    }
  | undefined {
  if (params.length === 0 && withParams.length === 0) {
    return {
      setupStatements: [],
      variableBindings: new Map(parentBindings),
    };
  }

  runtimeHelpers.add('throwMissingNativeTemplateParameter');

  const setupStatements: string[] = [];
  const variableBindings = new Map(parentBindings);
  const providedBindings = new Map<string, TsExpression>();

  for (const [index, withParam] of withParams.entries()) {
    const identifier = `call_template_param_${sanitizeIdentifierFragment(withParam.name)}_${index}`;
    const valueExpression =
      withParam.body !== undefined
        ? emitTemporaryTreeBindingExpression(
            withParam.body,
            runtimeHelpers,
            callerContextNodeIdentifier,
            {
              ...(callerPositionExpression === undefined
                ? {}
                : { positionExpression: callerPositionExpression }),
              ...(callerLastExpression === undefined
                ? {}
                : { lastExpression: callerLastExpression }),
              ...(parentBindings === undefined ? {} : { variableBindings: parentBindings }),
            },
          )
        : withParam.select === undefined
          ? tsStringLiteral('')
          : emitVariableValueExpression(
              withParam.select,
              runtimeHelpers,
              callerContextNodeIdentifier,
              {
                ...(callerPositionExpression === undefined
                  ? {}
                  : { positionExpression: callerPositionExpression }),
                ...(callerLastExpression === undefined
                  ? {}
                  : { lastExpression: callerLastExpression }),
                ...(parentBindings === undefined ? {} : { variableBindings: parentBindings }),
              },
            );
    if (valueExpression === undefined) {
      return undefined;
    }

    setupStatements.push(`const ${identifier} = ${valueExpression.code};`);
    const bindingReference = tsRawExpression(identifier);
    providedBindings.set(withParam.name, bindingReference);
    if (!withParam.name.startsWith('{}')) {
      providedBindings.set(`{}${withParam.name}`, bindingReference);
    }
  }

  const providedNames = withParams.map((withParam) => withParam.name);

  for (const [index, param] of params.entries()) {
    const identifier = `template_param_${sanitizeIdentifierFragment(param.name)}_${index}`;
    const providedBinding =
      providedBindings.get(param.name) ??
      (param.name.startsWith('{}') ? undefined : providedBindings.get(`{}${param.name}`));

    if (providedBinding !== undefined) {
      setupStatements.push(`const ${identifier} = ${providedBinding.code};`);
    } else if (param.required) {
      setupStatements.push(
        `const ${identifier} = (() => { throwMissingNativeTemplateParameter(${JSON.stringify(param.name)}, ${JSON.stringify(providedNames)}, ${JSON.stringify(param.location)}); })();`,
      );
    } else {
      const valueExpression =
        param.body !== undefined
          ? emitTemporaryTreeBindingExpression(
              param.body,
              runtimeHelpers,
              calleeContextNodeIdentifier,
              {
                ...(calleePositionExpression === undefined
                  ? {}
                  : { positionExpression: calleePositionExpression }),
                ...(calleeLastExpression === undefined
                  ? {}
                  : { lastExpression: calleeLastExpression }),
                variableBindings,
              },
            )
          : param.select === undefined
            ? tsStringLiteral('')
            : emitVariableValueExpression(
                param.select,
                runtimeHelpers,
                calleeContextNodeIdentifier,
                {
                  ...(calleePositionExpression === undefined
                    ? {}
                    : { positionExpression: calleePositionExpression }),
                  ...(calleeLastExpression === undefined
                    ? {}
                    : { lastExpression: calleeLastExpression }),
                  variableBindings,
                },
              );
      if (valueExpression === undefined) {
        return undefined;
      }

      setupStatements.push(`const ${identifier} = ${valueExpression.code};`);
    }

    const bindingReference = tsRawExpression(identifier);
    variableBindings.set(param.name, bindingReference);
    if (!param.name.startsWith('{}')) {
      variableBindings.set(`{}${param.name}`, bindingReference);
    }
  }

  return {
    setupStatements,
    variableBindings,
  };
}

export function emitInstructionSequence(
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
      context: ApplyTemplatesRenderContext,
    ) => TsExpression | undefined;
  } = {},
): TsExpression | undefined {
  const expressions: TsExpression[] = [];
  const contextNodeIdentifier = options.contextNodeIdentifier ?? 'currentNode';

  for (const instruction of instructions) {
    if (instruction.kind === 'variable') {
      const bindingExpression = emitVariableBindingExpression(
        instruction,
        runtimeHelpers,
        contextNodeIdentifier,
        options,
      );
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

      const outputExpression =
        expressions.length === 0
          ? remainingExpression
          : tsConcatExpression([...expressions, remainingExpression]);
      return tsRawExpression(
        `(() => { const ${variableIdentifier} = ${bindingExpression.code}; return ${outputExpression.code}; })()`,
      );
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
      context: ApplyTemplatesRenderContext,
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

      const emittedAttributes = emitAttributesExpression(
        instruction.attributes,
        runtimeHelpers,
        contextNodeIdentifier,
        options,
      );
      if (emittedAttributes === undefined) {
        return undefined;
      }

      const closeTag = `</${instruction.name}>`;
      return annotateInstruction(
        tsRawExpression(`(() => {
  const body = ${body.code};
  return ${JSON.stringify(`<${instruction.name}`)} + ${emittedAttributes.code} + ${JSON.stringify('>')} + body + ${JSON.stringify(closeTag)};
})()`),
      );
    }
    case 'attribute': {
      return undefined;
    }
    case 'literalText':
      return tsStringLiteral(
        instruction.disableOutputEscaping === true
          ? instruction.text
          : escapeTextLiteral(instruction.text),
      );
    case 'comment': {
      if (instruction.select !== undefined) {
        return undefined;
      }
      const body = emitInstructionSequence(instruction.body ?? [], runtimeHelpers, {
        ...options,
        contextNodeIdentifier,
      });
      if (body === undefined) {
        return undefined;
      }

      return annotateInstruction(
        tsConcatExpression([tsStringLiteral('<!--'), body, tsStringLiteral('-->')]),
      );
    }
    case 'copy':
      return undefined;
    case 'valueOf': {
      const valueOfInstructionInfo = JSON.stringify({
        kind: 'xsl:value-of',
        location: instruction.location,
      });

      if (instruction.select.kind === 'contextItem') {
        runtimeHelpers.add('escapeText');
        runtimeHelpers.add('traceStringValueOfNode');

        return tsCallExpression('escapeText', [
          tsCallExpression('traceStringValueOfNode', [
            tsRawExpression(contextNodeIdentifier),
            tsRawExpression('ctx'),
            tsRawExpression(valueOfInstructionInfo),
          ]),
        ]);
      }

      if (instruction.select.kind === 'variable') {
        const variableExpression = resolveVariableBindingExpression(
          instruction.select.name,
          options.variableBindings,
        );
        if (variableExpression === undefined) {
          return undefined;
        }

        runtimeHelpers.add('escapeText');
        runtimeHelpers.add('stringValueOfNativeValue');
        return annotateInstruction(
          tsCallExpression('escapeText', [
            tsCallExpression('stringValueOfNativeValue', [variableExpression]),
          ]),
        );
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
          return annotateInstruction(
            tsCallExpression('escapeText', [tsRawExpression(`String(${numericExpression})`)]),
          );
        }

        if (instruction.select.callee === 'name') {
          runtimeHelpers.add('escapeText');
          runtimeHelpers.add('nameOfNode');
          return annotateInstruction(
            tsCallExpression('escapeText', [
              tsCallExpression('nameOfNode', [tsRawExpression(contextNodeIdentifier)]),
            ]),
          );
        }

        if (instruction.select.callee === 'local-name') {
          runtimeHelpers.add('escapeText');
          runtimeHelpers.add('localNameOfNode');
          return annotateInstruction(
            tsCallExpression('escapeText', [
              tsCallExpression('localNameOfNode', [tsRawExpression(contextNodeIdentifier)]),
            ]),
          );
        }
      }

      if (instruction.select.kind === 'functionCall' && instruction.select.arguments.length === 1) {
        const [argument] = instruction.select.arguments;
        if (argument !== undefined && argument.kind === 'path') {
          const simplePath = tryResolveSimpleChildPath(
            argument,
            contextNodeIdentifier,
            options.variableBindings,
          );
          if (simplePath !== undefined) {
            if (instruction.select.callee === 'name') {
              runtimeHelpers.add('escapeText');
              runtimeHelpers.add('nameOfNode');
              runtimeHelpers.add('selectSimplePathNode');
              return annotateInstruction(
                tsCallExpression('escapeText', [
                  tsCallExpression('nameOfNode', [
                    tsCallExpression('selectSimplePathNode', [
                      simplePath.startNodeExpression,
                      tsRawExpression(JSON.stringify(simplePath.segments)),
                    ]),
                  ]),
                ]),
              );
            }

            if (instruction.select.callee === 'local-name') {
              runtimeHelpers.add('escapeText');
              runtimeHelpers.add('localNameOfNode');
              runtimeHelpers.add('selectSimplePathNode');
              return annotateInstruction(
                tsCallExpression('escapeText', [
                  tsCallExpression('localNameOfNode', [
                    tsCallExpression('selectSimplePathNode', [
                      simplePath.startNodeExpression,
                      tsRawExpression(JSON.stringify(simplePath.segments)),
                    ]),
                  ]),
                ]),
              );
            }

            if (instruction.select.callee === 'count') {
              runtimeHelpers.add('escapeText');
              runtimeHelpers.add('selectSimplePathNodes');
              return annotateInstruction(
                tsCallExpression('escapeText', [
                  tsRawExpression(
                    `String(selectSimplePathNodes(${simplePath.startNodeExpression.code}, ${JSON.stringify(simplePath.segments)}).length)`,
                  ),
                ]),
              );
            }
          }
        }
      }

      if (instruction.select.kind !== 'path') {
        return undefined;
      }

      const tracedPathValue = emitTracedValueOfPathStringExpression(
        instruction.select,
        runtimeHelpers,
        contextNodeIdentifier,
        valueOfInstructionInfo,
        options.variableBindings,
      );
      if (tracedPathValue !== undefined) {
        runtimeHelpers.add('escapeText');
        return annotateInstruction(tsCallExpression('escapeText', [tracedPathValue]));
      }

      const pathValue = emitPathStringValueExpression(
        instruction.select,
        runtimeHelpers,
        contextNodeIdentifier,
        options.variableBindings,
      );
      if (pathValue === undefined) {
        return undefined;
      }

      runtimeHelpers.add('escapeText');
      return annotateInstruction(tsCallExpression('escapeText', [pathValue]));
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

      return annotateInstruction(
        tsConditionalExpression(testExpression, body, tsStringLiteral('')),
      );
    }
    case 'choose': {
      const annotateBranchBody = (comment: string, body: TsExpression): TsExpression =>
        tsRawExpression(`(
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
          body: annotateBranchBody(
            renderWhenProvenanceComment(branch, options.sourcePath),
            bodyExpression,
          ),
        });
      }

      if (branches.length === 0) {
        return undefined;
      }

      let otherwiseExpression =
        instruction.otherwiseBody === undefined
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

        otherwiseExpression = tsConditionalExpression(
          branch.test,
          branch.body,
          otherwiseExpression,
        );
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
      runtimeHelpers.add('traceSelectedNodes');
      const startNode = simplePath.absolute ? 'document' : contextNodeIdentifier;
      const callbackParameters =
        body.code.includes('currentIndex') || body.code.includes('currentNodes.length')
          ? '(currentNode, currentIndex, currentNodes)'
          : '(currentNode)';
      return annotateInstruction(
        tsRawExpression(
          `traceSelectedNodes(selectSimplePathNodes(${startNode}, ${JSON.stringify(simplePath.segments)}), ctx, ${JSON.stringify({ kind: 'xsl:for-each', location: instruction.location })}).map(${callbackParameters} => ${body.code}).join("")`,
        ),
      );
    }
    case 'callTemplate': {
      const namedTemplate = options.namedTemplates?.get(instruction.name);
      if (
        namedTemplate === undefined ||
        namedTemplate.match !== undefined ||
        namedTemplate.modes.length > 0
      ) {
        return undefined;
      }

      const activeNamedTemplateNames = options.activeNamedTemplateNames ?? [];
      if (activeNamedTemplateNames.includes(instruction.name)) {
        return undefined;
      }

      const invocationSetup = tryCreateTemplateInvocationSetup(
        namedTemplate.params,
        instruction.withParams,
        runtimeHelpers,
        options.variableBindings,
        contextNodeIdentifier,
        contextNodeIdentifier,
        options.positionExpression,
        options.lastExpression,
        options.positionExpression,
        options.lastExpression,
      );
      if (invocationSetup === undefined) {
        return undefined;
      }

      const body = emitInstructionSequence(namedTemplate.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier,
        activeNamedTemplateNames: [...activeNamedTemplateNames, instruction.name],
        variableBindings: invocationSetup.variableBindings,
      });
      if (body === undefined) {
        return undefined;
      }

      const invocationBody =
        invocationSetup.setupStatements.length === 0
          ? body.code
          : `(() => {\n${invocationSetup.setupStatements.map((statement) => `  ${statement}`).join('\n')}\n  return ${body.code};\n})()`;

      return annotateInstruction(
        tsRawExpression(
          `(${renderCommentedArrowFunction(
            renderTemplateProvenanceComment(namedTemplate, options.sourcePath),
            '()',
            invocationBody,
          )})()`,
        ),
      );
    }
    case 'applyTemplates':
      return annotateInstruction(
        options.renderApplyTemplates?.(instruction, contextNodeIdentifier, {
          ...(options.positionExpression === undefined
            ? {}
            : { positionExpression: options.positionExpression }),
          ...(options.lastExpression === undefined
            ? {}
            : { lastExpression: options.lastExpression }),
          ...(options.variableBindings === undefined
            ? {}
            : { variableBindings: options.variableBindings }),
        }),
      );
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
      return emitBinaryTestExpression(
        ast,
        runtimeHelpers,
        contextNodeIdentifier,
        positionExpression,
        lastExpression,
      );
    case 'functionCall':
      return emitFunctionCallTestExpression(
        ast,
        runtimeHelpers,
        contextNodeIdentifier,
        positionExpression,
        lastExpression,
      );
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

  const testExpression = emitTestExpression(
    argument,
    runtimeHelpers,
    contextNodeIdentifier,
    positionExpression,
    lastExpression,
  );
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
    const left = emitTestExpression(
      ast.left,
      runtimeHelpers,
      contextNodeIdentifier,
      positionExpression,
      lastExpression,
    );
    const right = emitTestExpression(
      ast.right,
      runtimeHelpers,
      contextNodeIdentifier,
      positionExpression,
      lastExpression,
    );
    if (left === undefined || right === undefined) {
      return undefined;
    }

    return tsBinaryExpression(left, ast.operator === 'and' ? '&&' : '||', right);
  }

  const operator = mapComparisonOperator(ast.operator);
  if (operator === undefined) {
    return undefined;
  }

  const left = emitComparisonOperand(
    ast.left,
    runtimeHelpers,
    contextNodeIdentifier,
    positionExpression,
    lastExpression,
  );
  const right = emitComparisonOperand(
    ast.right,
    runtimeHelpers,
    contextNodeIdentifier,
    positionExpression,
    lastExpression,
  );
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
      const pathValue = emitPathStringValueExpression(ast, runtimeHelpers, contextNodeIdentifier);
      if (pathValue === undefined) {
        return undefined;
      }

      return {
        kind: 'string',
        expression: pathValue,
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

function mapComparisonOperator(
  operator: BinaryExpression['operator'],
): '===' | '!==' | '<' | '<=' | '>' | '>=' | undefined {
  switch (operator) {
    case '=':
    case 'eq':
      return '===';
    case '!=':
    case 'ne':
      return '!==';
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

function emitAttributesExpression(
  attributes: readonly AttributeInstruction[],
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  options: {
    readonly positionExpression?: string;
    readonly lastExpression?: string;
    readonly variableBindings?: ReadonlyMap<string, TsExpression>;
  },
): TsExpression | undefined {
  const attributeExpressions: TsExpression[] = [];

  for (const attribute of attributes) {
    const valueExpression = emitAttributeValueExpression(
      attribute,
      runtimeHelpers,
      contextNodeIdentifier,
      options,
    );
    if (valueExpression === undefined) {
      return undefined;
    }

    attributeExpressions.push(
      tsConcatExpression([
        tsStringLiteral(` ${attribute.name}="`),
        valueExpression,
        tsStringLiteral('"'),
      ]),
    );
  }

  return tsConcatExpression(attributeExpressions);
}

function emitAttributeValueExpression(
  attribute: AttributeInstruction,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  options: {
    readonly positionExpression?: string;
    readonly lastExpression?: string;
    readonly variableBindings?: ReadonlyMap<string, TsExpression>;
  },
): TsExpression | undefined {
  if (attribute.valueTemplate === undefined) {
    return tsStringLiteral(escapeAttributeLiteral(attribute.value));
  }

  const partExpressions: TsExpression[] = [];
  for (const part of attribute.valueTemplate) {
    const partExpression = emitAttributeValueTemplatePartExpression(
      part,
      runtimeHelpers,
      contextNodeIdentifier,
      options,
    );
    if (partExpression === undefined) {
      return undefined;
    }

    partExpressions.push(partExpression);
  }

  return tsConcatExpression(partExpressions);
}

function emitAttributeValueTemplatePartExpression(
  part: AttributeValueTemplatePart,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  options: {
    readonly positionExpression?: string;
    readonly lastExpression?: string;
    readonly variableBindings?: ReadonlyMap<string, TsExpression>;
  },
): TsExpression | undefined {
  if (part.kind === 'text') {
    return tsStringLiteral(escapeAttributeLiteral(part.text));
  }

  const expression = emitVariableValueExpression(
    part.expression,
    runtimeHelpers,
    contextNodeIdentifier,
    options,
  );
  if (expression === undefined) {
    return undefined;
  }

  runtimeHelpers.add('escapeAttribute');
  return tsCallExpression('escapeAttribute', [expression]);
}

function escapeTextLiteral(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttributeLiteral(value: string): string {
  return escapeTextLiteral(value).replaceAll('"', '&quot;');
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
  if (instruction.body !== undefined) {
    return emitTemporaryTreeBindingExpression(
      instruction.body,
      runtimeHelpers,
      contextNodeIdentifier,
      options,
    );
  }

  if (instruction.select === undefined) {
    return tsStringLiteral('');
  }

  return emitVariableValueExpression(
    instruction.select,
    runtimeHelpers,
    contextNodeIdentifier,
    options,
  );
}

export function emitTemporaryTreeBindingExpression(
  body: readonly Instruction[],
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  options: {
    readonly positionExpression?: string;
    readonly lastExpression?: string;
    readonly variableBindings?: ReadonlyMap<string, TsExpression>;
  },
): TsExpression | undefined {
  const serializedBody = emitInstructionSequence(body, runtimeHelpers, {
    contextNodeIdentifier,
    ...(options.positionExpression === undefined
      ? {}
      : { positionExpression: options.positionExpression }),
    ...(options.lastExpression === undefined ? {} : { lastExpression: options.lastExpression }),
    ...(options.variableBindings === undefined
      ? {}
      : { variableBindings: options.variableBindings }),
  });
  if (serializedBody === undefined) {
    return undefined;
  }

  runtimeHelpers.add('createTemporaryTreeNode');
  return tsCallExpression('createTemporaryTreeNode', [serializedBody]);
}

export function emitVariableValueExpression(
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
      const pathValue = emitPathStringValueExpression(ast, runtimeHelpers, contextNodeIdentifier);
      if (pathValue === undefined) {
        return undefined;
      }

      return pathValue;
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
          return tsRawExpression(
            `String(selectSimplePathNodes(${startNode}, ${JSON.stringify(simplePath.segments)}).length)`,
          );
        }
      }

      return undefined;
    }
    default:
      return undefined;
  }
}

export function sanitizeIdentifierFragment(name: string): string {
  return name.replaceAll(/[^A-Za-z0-9_]/g, '_');
}
