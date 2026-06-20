import type {
  AttributeInstruction,
  AttributeValueTemplatePart,
  GlobalBinding,
  Instruction,
  StylesheetIR,
  TemplateRule,
  TemplateParam,
  WithParam,
} from '../compile/ir.js';
import type {
  BinaryExpression,
  FunctionCallExpression,
  PathExpression,
  StepExpression,
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
  readonly initialTemplateName?: string;
  readonly initialTemplateEntryTemplate?: TemplateRule;
  readonly needsDocumentBinding: boolean;
  readonly currentNodeExpression: TsExpression;
  readonly currentNodeMayBeNull: boolean;
  readonly needsCurrentNodeBinding: boolean;
  readonly setupStatements: readonly string[];
  readonly outputExpression: TsExpression;
  readonly initialTemplateCurrentNodeExpression?: TsExpression;
  readonly initialTemplateCurrentNodeMayBeNull?: boolean;
  readonly initialTemplateNeedsCurrentNodeBinding?: boolean;
  readonly initialTemplateSetupStatements?: readonly string[];
  readonly initialTemplateOutputExpression?: TsExpression;
  readonly runtimeHelpers: readonly string[];
}

interface ApplyTemplatesRenderContext {
  readonly positionExpression?: string;
  readonly lastExpression?: string;
  readonly variableBindings?: ReadonlyMap<string, TsExpression>;
}

export function tryCreateNativeTransformPlan(
  ir: StylesheetIR,
  sourcePath?: string,
): NativeTransformPlan | undefined {
  const namedInitialTemplatePlan = tryCreateNamedInitialTemplateNativePlan(ir, sourcePath);
  if (namedInitialTemplatePlan !== undefined) {
    return namedInitialTemplatePlan;
  }

  const mixedInitialTemplatePlan = tryCreateSingleTemplateWithNamedInitialTemplateNativePlan(
    ir,
    sourcePath,
  );
  if (mixedInitialTemplatePlan !== undefined) {
    return mixedInitialTemplatePlan;
  }

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

function tryCreateNamedInitialTemplateNativePlan(
  ir: StylesheetIR,
  sourcePath?: string,
): NativeTransformPlan | undefined {
  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === undefined) {
    return undefined;
  }

  if (ir.templates.length !== 1) {
    return undefined;
  }

  const [template] = ir.templates;
  if (
    template === undefined ||
    template.name === undefined ||
    template.match !== undefined ||
    template.modes.length > 0
  ) {
    return undefined;
  }

  const templateParamSetup = tryCreateTemplateParamSetup(
    template.params,
    runtimeHelpers,
    globalBindingSetup.variableBindings,
    'document',
  );
  if (templateParamSetup === undefined) {
    return undefined;
  }

  runtimeHelpers.add('normalizeNativeTemplateName');
  runtimeHelpers.add('prependNativeInitialTemplateError');
  runtimeHelpers.add('throwMissingNativeInitialTemplate');
  runtimeHelpers.add('throwUnsupportedNativeInitialMode');

  const bodyExpression = emitInstructionSequence(template.body, runtimeHelpers, {
    contextNodeIdentifier: 'document',
    variableBindings: templateParamSetup.variableBindings,
    ...(sourcePath === undefined ? {} : { sourcePath }),
  });
  if (bodyExpression === undefined) {
    return undefined;
  }

  const outputExpression = tsRawExpression(
    `(() => { try { return ${bodyExpression.code}; } catch (error) { throw prependNativeInitialTemplateError(error, ${JSON.stringify(template.name)}, ${JSON.stringify(template.location)}); } })()`,
  );
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [
    outputExpression.code,
    ...templateParamSetup.setupStatements,
  ]);

  const needsDocumentBinding = hasDocumentReference([
    outputExpression.code,
    ...templateParamSetup.setupStatements,
    ...finalizedGlobalBindingSetup,
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add('createCompiledDocument');
  }

  return {
    entryTemplate: template,
    initialTemplateName: template.name,
    needsDocumentBinding,
    currentNodeExpression: tsRawExpression('document'),
    currentNodeMayBeNull: false,
    needsCurrentNodeBinding: false,
    setupStatements: [...finalizedGlobalBindingSetup, ...templateParamSetup.setupStatements],
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function tryCreateSingleTemplateWithNamedInitialTemplateNativePlan(
  ir: StylesheetIR,
  sourcePath?: string,
): NativeTransformPlan | undefined {
  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === undefined) {
    return undefined;
  }
  if (ir.templates.length !== 2) {
    return undefined;
  }

  const defaultTemplates = ir.templates.filter(
    (template) =>
      template.name === undefined && template.modes.length === 0 && template.params.length === 0,
  );
  if (defaultTemplates.length !== 1) {
    return undefined;
  }

  const [defaultTemplate] = defaultTemplates;
  const initialTemplate = ir.templates.find((template) => template !== defaultTemplate);
  if (
    defaultTemplate === undefined ||
    initialTemplate === undefined ||
    initialTemplate.name === undefined ||
    initialTemplate.match !== undefined ||
    initialTemplate.modes.length > 0
  ) {
    return undefined;
  }

  const defaultContext = createTemplateContextPlan(defaultTemplate, runtimeHelpers);
  if (defaultContext === undefined) {
    return undefined;
  }

  const defaultOutputExpression = emitInstructionSequence(defaultTemplate.body, runtimeHelpers, {
    variableBindings: globalBindingSetup.variableBindings,
    ...(sourcePath === undefined ? {} : { sourcePath }),
  });
  if (defaultOutputExpression === undefined) {
    return undefined;
  }

  const templateParamSetup = tryCreateTemplateParamSetup(
    initialTemplate.params,
    runtimeHelpers,
    globalBindingSetup.variableBindings,
    'document',
  );
  if (templateParamSetup === undefined) {
    return undefined;
  }

  runtimeHelpers.add('normalizeNativeTemplateName');
  runtimeHelpers.add('prependNativeInitialTemplateError');
  runtimeHelpers.add('throwMissingNativeInitialTemplate');
  runtimeHelpers.add('throwUnsupportedNativeInitialMode');

  const initialBodyExpression = emitInstructionSequence(initialTemplate.body, runtimeHelpers, {
    contextNodeIdentifier: 'document',
    variableBindings: templateParamSetup.variableBindings,
    ...(sourcePath === undefined ? {} : { sourcePath }),
  });
  if (initialBodyExpression === undefined) {
    return undefined;
  }

  const initialOutputExpression = tsRawExpression(
    `(() => { try { return ${initialBodyExpression.code}; } catch (error) { throw prependNativeInitialTemplateError(error, ${JSON.stringify(initialTemplate.name)}, ${JSON.stringify(initialTemplate.location)}); } })()`,
  );
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [
    defaultContext.currentNodeExpression.code,
    defaultOutputExpression.code,
    initialOutputExpression.code,
    ...templateParamSetup.setupStatements,
  ]);
  const needsDefaultCurrentNodeBinding =
    defaultContext.currentNodeMayBeNull || defaultOutputExpression.code.includes('currentNode');

  const needsDocumentBinding = hasDocumentReference([
    ...(needsDefaultCurrentNodeBinding ? [defaultContext.currentNodeExpression.code] : []),
    defaultOutputExpression.code,
    initialOutputExpression.code,
    ...templateParamSetup.setupStatements,
    ...finalizedGlobalBindingSetup,
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add('createCompiledDocument');
  }

  return {
    entryTemplate: defaultTemplate,
    initialTemplateName: initialTemplate.name,
    initialTemplateEntryTemplate: initialTemplate,
    needsDocumentBinding,
    currentNodeExpression: defaultContext.currentNodeExpression,
    currentNodeMayBeNull: defaultContext.currentNodeMayBeNull,
    needsCurrentNodeBinding: needsDefaultCurrentNodeBinding,
    setupStatements: finalizedGlobalBindingSetup,
    outputExpression: defaultOutputExpression,
    initialTemplateCurrentNodeExpression: tsRawExpression('document'),
    initialTemplateCurrentNodeMayBeNull: false,
    initialTemplateNeedsCurrentNodeBinding: false,
    initialTemplateSetupStatements: [
      ...finalizedGlobalBindingSetup,
      ...templateParamSetup.setupStatements,
    ],
    initialTemplateOutputExpression: initialOutputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function tryCreateSingleTemplateNativePlan(
  ir: StylesheetIR,
  sourcePath?: string,
): NativeTransformPlan | undefined {
  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === undefined) {
    return undefined;
  }
  if (ir.templates.length === 0) {
    return undefined;
  }

  const primaryTemplates = ir.templates.filter(
    (template) =>
      template.name === undefined && template.modes.length === 0 && template.params.length === 0,
  );
  if (primaryTemplates.length !== 1) {
    return undefined;
  }

  const [template] = primaryTemplates;
  if (template === undefined) {
    return undefined;
  }

  const namedTemplates = new Map<string, TemplateRule>();
  for (const candidate of ir.templates) {
    if (candidate === template) {
      continue;
    }

    if (
      candidate.name === undefined ||
      candidate.match !== undefined ||
      candidate.modes.length > 0
    ) {
      return undefined;
    }

    namedTemplates.set(candidate.name, candidate);
  }

  const templateContext = createTemplateContextPlan(template, runtimeHelpers);
  if (templateContext === undefined) {
    return undefined;
  }

  const outputExpression = emitInstructionSequence(
    template.body,
    runtimeHelpers,
    namedTemplates.size === 0
      ? {
          variableBindings: globalBindingSetup.variableBindings,
        }
      : {
          namedTemplates,
          activeNamedTemplateNames: [],
          variableBindings: globalBindingSetup.variableBindings,
          ...(sourcePath === undefined ? {} : { sourcePath }),
        },
  );
  if (outputExpression === undefined) {
    return undefined;
  }
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [
    templateContext.currentNodeExpression.code,
    outputExpression.code,
  ]);
  const needsCurrentNodeBinding =
    templateContext.currentNodeMayBeNull || outputExpression.code.includes('currentNode');

  const needsDocumentBinding = hasDocumentReference([
    ...(needsCurrentNodeBinding ? [templateContext.currentNodeExpression.code] : []),
    outputExpression.code,
    ...finalizedGlobalBindingSetup,
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add('createCompiledDocument');
  }

  return {
    entryTemplate: template,
    needsDocumentBinding,
    currentNodeExpression: templateContext.currentNodeExpression,
    currentNodeMayBeNull: templateContext.currentNodeMayBeNull,
    needsCurrentNodeBinding,
    setupStatements: finalizedGlobalBindingSetup,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function tryCreateRootApplyTemplatesNativePlan(
  ir: StylesheetIR,
  sourcePath?: string,
): NativeTransformPlan | undefined {
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
  const childPlans: readonly ApplyTemplatesTemplatePlan[] | undefined =
    shape === undefined
      ? recursivePlan?.childPlans
      : [
          {
            template: shape.childTemplate,
            matchAbsolute: shape.childMatchAbsolute,
            matchPath: shape.childMatchPath,
          },
        ];
  if (rootTemplate === undefined || childPlans === undefined) {
    return undefined;
  }

  const outputExpression = emitInstructionSequence(rootTemplate.body, runtimeHelpers, {
    contextNodeIdentifier: 'document',
    variableBindings: globalBindingSetup.variableBindings,
    renderApplyTemplates: (instruction, contextNodeIdentifier, context) =>
      emitPlannedApplyTemplatesInstruction(
        instruction,
        childPlans,
        contextNodeIdentifier,
        runtimeHelpers,
        emitInstructionSequence,
        tryGetSimpleChildPath,
        tryCreateTemplateInvocationSetup,
        context,
        sourcePath,
      ),
  });
  if (outputExpression === undefined) {
    return undefined;
  }
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [
    outputExpression.code,
  ]);

  const needsDocumentBinding = hasDocumentReference([
    outputExpression.code,
    ...finalizedGlobalBindingSetup,
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add('createCompiledDocument');
  }

  return {
    entryTemplate: rootTemplate,
    needsDocumentBinding,
    currentNodeExpression: tsRawExpression('document'),
    currentNodeMayBeNull: false,
    needsCurrentNodeBinding: false,
    setupStatements: finalizedGlobalBindingSetup,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

function tryCreateMatchedTemplateApplyTemplatesNativePlan(
  ir: StylesheetIR,
  sourcePath?: string,
): NativeTransformPlan | undefined {
  const runtimeHelpers = new Set<string>(['createCompiledDocument']);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === undefined) {
    return undefined;
  }
  if (ir.templates.length !== 2) {
    return undefined;
  }

  const primaryTemplate = ir.templates.find(
    (template) =>
      template.name === undefined &&
      template.modes.length === 0 &&
      template.params.length === 0 &&
      template.match !== undefined &&
      template.match.kind === 'path' &&
      template.match.absolute &&
      template.match.base === undefined,
  );
  const childTemplate = ir.templates.find((template) => template !== primaryTemplate);
  if (primaryTemplate === undefined || childTemplate === undefined) {
    return undefined;
  }

  if (
    childTemplate.name !== undefined ||
    childTemplate.modes.length > 0 ||
    childTemplate.match === undefined ||
    childTemplate.match.kind !== 'path' ||
    childTemplate.match.absolute ||
    childTemplate.match.base !== undefined
  ) {
    return undefined;
  }

  const childMatchSegments = childTemplate.match.steps.map((step) => {
    if (
      step.kind !== 'step' ||
      step.axis !== 'child' ||
      step.predicates.length > 0 ||
      step.nodeTest.kind !== 'nameTest' ||
      step.nodeTest.name.includes(':')
    ) {
      return undefined;
    }

    return step.nodeTest.name;
  });
  const childMatchPath = childMatchSegments.filter(
    (segment): segment is string => segment !== undefined,
  );
  if (childMatchPath.length === 0 || childMatchPath.length !== childMatchSegments.length) {
    return undefined;
  }

  const templateContext = createTemplateContextPlan(primaryTemplate, runtimeHelpers);
  if (templateContext === undefined) {
    return undefined;
  }

  const outputExpression = emitInstructionSequence(primaryTemplate.body, runtimeHelpers, {
    variableBindings: globalBindingSetup.variableBindings,
    renderApplyTemplates: (instruction, contextNodeIdentifier, context) =>
      emitPlannedApplyTemplatesInstruction(
        instruction,
        [
          {
            template: childTemplate,
            matchAbsolute: false,
            matchPath: childMatchPath,
          },
        ],
        contextNodeIdentifier,
        runtimeHelpers,
        emitInstructionSequence,
        tryGetSimpleChildPath,
        tryCreateTemplateInvocationSetup,
        context,
        sourcePath,
      ),
  });
  if (outputExpression === undefined) {
    return undefined;
  }
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [
    templateContext.currentNodeExpression.code,
    outputExpression.code,
  ]);
  const needsCurrentNodeBinding =
    templateContext.currentNodeMayBeNull || outputExpression.code.includes('currentNode');

  const needsDocumentBinding = hasDocumentReference([
    ...(needsCurrentNodeBinding ? [templateContext.currentNodeExpression.code] : []),
    outputExpression.code,
    ...finalizedGlobalBindingSetup,
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add('createCompiledDocument');
  }

  return {
    entryTemplate: primaryTemplate,
    needsDocumentBinding,
    currentNodeExpression: templateContext.currentNodeExpression,
    currentNodeMayBeNull: templateContext.currentNodeMayBeNull,
    needsCurrentNodeBinding,
    setupStatements: finalizedGlobalBindingSetup,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort(),
  };
}

interface GlobalBindingSetupPlan {
  readonly getterIdentifier: string;
  readonly setupStatements: readonly string[];
}

function tryCreateGlobalBindingSetup(
  bindings: readonly GlobalBinding[],
  runtimeHelpers: Set<string>,
):
  | {
      readonly bindingPlans: readonly GlobalBindingSetupPlan[];
      readonly variableBindings: ReadonlyMap<string, TsExpression>;
    }
  | undefined {
  if (bindings.length === 0) {
    return {
      bindingPlans: [],
      variableBindings: new Map(),
    };
  }

  const variableBindings = new Map<string, TsExpression>();
  const bindingSetupPlans: GlobalBindingSetupPlan[] = [];

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
  runtimeHelpers.add('throwMissingNativeStylesheetParameter');

  for (const plan of bindingPlans) {
    const { binding, identifier, getterIdentifier, stateIdentifier, cacheIdentifier } = plan;
    const setupStatements: string[] = [];
    const defaultValueExpression =
      binding.body !== undefined
        ? emitTemporaryTreeBindingExpression(binding.body, runtimeHelpers, 'document', {
            variableBindings,
          })
        : binding.select === undefined
          ? tsStringLiteral('')
          : emitVariableValueExpression(binding.select, runtimeHelpers, 'document', {
              variableBindings,
            });
    if (defaultValueExpression === undefined) {
      return undefined;
    }

    setupStatements.push(`let ${stateIdentifier} = 0;`);
    setupStatements.push(`const ${cacheIdentifier} = new Map();`);
    setupStatements.push(`function ${getterIdentifier}() {`);
    setupStatements.push(
      `  if (${stateIdentifier} === 2) { return ${cacheIdentifier}.get("value"); }`,
    );
    setupStatements.push(
      `  if (${stateIdentifier} === 1) { throwCircularNativeGlobalBinding(${JSON.stringify(binding.kind)}, ${JSON.stringify(binding.name)}, ${JSON.stringify(binding.location)}); }`,
    );
    setupStatements.push(`  ${stateIdentifier} = 1;`);
    setupStatements.push('  try {');

    if (binding.kind === 'param') {
      setupStatements.push(
        `    const raw_${identifier} = ctx.parameters?.[${JSON.stringify(binding.name)}] ?? ctx.parameters?.[${JSON.stringify(binding.name.startsWith('{}') ? binding.name : `{}${binding.name}`)}];`,
      );
      if (binding.required) {
        setupStatements.push(
          `    if (raw_${identifier} === undefined) { throwMissingNativeStylesheetParameter(${JSON.stringify(binding.name)}, Object.keys(ctx.parameters ?? {}), ${JSON.stringify(binding.location)}); }`,
        );
        setupStatements.push(`    ${cacheIdentifier}.set("value", String(raw_${identifier}));`);
      } else {
        setupStatements.push(
          `    ${cacheIdentifier}.set("value", raw_${identifier} === undefined ? ${defaultValueExpression.code} : String(raw_${identifier}));`,
        );
      }
    } else {
      setupStatements.push(`    ${cacheIdentifier}.set("value", ${defaultValueExpression.code});`);
    }

    setupStatements.push(`    ${stateIdentifier} = 2;`);
    setupStatements.push(`    return ${cacheIdentifier}.get("value");`);
    setupStatements.push('  } catch (error) {');
    setupStatements.push(`    ${stateIdentifier} = 0;`);
    setupStatements.push(
      `    throw prependNativeGlobalBindingError(error, ${JSON.stringify(binding.kind)}, ${JSON.stringify(binding.name)}, ${JSON.stringify(binding.selectText)}, ${JSON.stringify(binding.location)});`,
    );
    setupStatements.push('  }');
    setupStatements.push('}');
    bindingSetupPlans.push({ getterIdentifier, setupStatements });
  }

  return {
    bindingPlans: bindingSetupPlans,
    variableBindings,
  };
}

function finalizeGlobalBindingSetup(
  setup: { readonly bindingPlans: readonly GlobalBindingSetupPlan[] },
  referenceSources: readonly string[],
): readonly string[] {
  if (setup.bindingPlans.length === 0) {
    return [];
  }

  const selectedGetters = new Set<string>();
  const pendingGetters: string[] = [];

  const enqueueGetter = (getterIdentifier: string): void => {
    if (selectedGetters.has(getterIdentifier)) {
      return;
    }

    selectedGetters.add(getterIdentifier);
    pendingGetters.push(getterIdentifier);
  };

  for (const plan of setup.bindingPlans) {
    if (referenceSources.some((source) => source.includes(`${plan.getterIdentifier}(`))) {
      enqueueGetter(plan.getterIdentifier);
    }
  }

  while (pendingGetters.length > 0) {
    const getterIdentifier = pendingGetters.pop();
    const plan = setup.bindingPlans.find(
      (candidate) => candidate.getterIdentifier === getterIdentifier,
    );
    if (plan === undefined) {
      continue;
    }

    const setupSource = plan.setupStatements.join('\n');
    for (const dependencyPlan of setup.bindingPlans) {
      if (setupSource.includes(`${dependencyPlan.getterIdentifier}(`)) {
        enqueueGetter(dependencyPlan.getterIdentifier);
      }
    }
  }

  return setup.bindingPlans
    .filter((plan) => selectedGetters.has(plan.getterIdentifier))
    .flatMap((plan) => plan.setupStatements);
}

function hasDocumentReference(referenceSources: readonly string[]): boolean {
  return referenceSources.some((source) => /\bdocument\b/.test(source));
}

function tryCreateTemplateParamSetup(
  params: TemplateRule['params'],
  runtimeHelpers: Set<string>,
  parentBindings: ReadonlyMap<string, TsExpression>,
  contextNodeIdentifier: string,
):
  | {
      readonly setupStatements: readonly string[];
      readonly variableBindings: ReadonlyMap<string, TsExpression>;
    }
  | undefined {
  if (params.length === 0) {
    return {
      setupStatements: [],
      variableBindings: new Map(parentBindings),
    };
  }

  runtimeHelpers.add('throwMissingNativeTemplateParameter');

  const setupStatements: string[] = [];
  const variableBindings = new Map(parentBindings);

  for (const [index, param] of params.entries()) {
    const identifier = `template_param_${sanitizeIdentifierFragment(param.name)}_${index}`;
    if (param.required) {
      setupStatements.push(
        `const ${identifier} = (() => { throwMissingNativeTemplateParameter(${JSON.stringify(param.name)}, [], ${JSON.stringify(param.location)}); })();`,
      );
    } else {
      const valueExpression =
        param.body !== undefined
          ? emitTemporaryTreeBindingExpression(param.body, runtimeHelpers, contextNodeIdentifier, {
              variableBindings,
            })
          : param.select === undefined
            ? tsStringLiteral('')
            : emitVariableValueExpression(param.select, runtimeHelpers, contextNodeIdentifier, {
                variableBindings,
              });
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

function tryCreateTemplateInvocationSetup(
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

function createTemplateContextPlan(
  template: TemplateRule,
  runtimeHelpers: Set<string>,
):
  | { readonly currentNodeExpression: TsExpression; readonly currentNodeMayBeNull: boolean }
  | undefined {
  if (template.match === undefined || template.match.kind !== 'path') {
    return undefined;
  }

  if (
    template.match.absolute &&
    template.match.base === undefined &&
    template.match.steps.length === 0
  ) {
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
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
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

function tryGetSimpleMatchPath(ast: PathExpression): readonly string[] | undefined {
  if (!ast.absolute || ast.base !== undefined || ast.steps.length === 0) {
    return undefined;
  }

  const path: string[] = [];
  for (const step of ast.steps) {
    if (
      step.kind !== 'step' ||
      step.axis !== 'child' ||
      step.predicates.length > 0 ||
      step.nodeTest.kind !== 'nameTest' ||
      step.nodeTest.name.includes(':')
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

  const segments = tryGetSimpleChildSegments(ast);
  if (segments === undefined) {
    return undefined;
  }

  return {
    absolute: ast.absolute,
    segments,
  };
}

function tryResolveSimpleChildPath(
  ast: PathExpression,
  contextNodeIdentifier: string,
  variableBindings: ReadonlyMap<string, TsExpression> | undefined,
):
  | { readonly startNodeExpression: TsExpression; readonly segments: readonly string[] }
  | undefined {
  const segments = tryGetSimpleChildSegments(ast);
  if (segments === undefined) {
    return undefined;
  }

  if (ast.base === undefined) {
    return {
      startNodeExpression: ast.absolute
        ? tsRawExpression('document')
        : tsRawExpression(contextNodeIdentifier),
      segments,
    };
  }

  if (ast.base.kind !== 'variable') {
    return undefined;
  }

  const variableExpression = resolveVariableBindingExpression(ast.base.name, variableBindings);
  if (variableExpression === undefined) {
    return undefined;
  }

  return {
    startNodeExpression: variableExpression,
    segments,
  };
}

function tryGetSimpleChildSegments(ast: PathExpression): readonly string[] | undefined {
  const names: string[] = [];
  for (const step of ast.steps) {
    if (step.kind !== 'step' || step.axis !== 'child' || step.predicates.length > 0) {
      return undefined;
    }

    if (step.nodeTest.kind === 'nameTest') {
      if (step.nodeTest.name.includes(':')) {
        return undefined;
      }

      names.push(step.nodeTest.name);
      continue;
    }

    if (step.nodeTest.kind === 'wildcardTest') {
      names.push('*');
      continue;
    }

    return undefined;
  }

  return names;
}

function emitTracedValueOfPathStringExpression(
  ast: PathExpression,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  instructionInfoCode: string,
  variableBindings?: ReadonlyMap<string, TsExpression>,
): TsExpression | undefined {
  if (variableBindings === undefined) {
    const simplePath = tryGetSimpleChildPath(ast);
    if (simplePath !== undefined) {
      runtimeHelpers.add('selectSimplePathNode');
      runtimeHelpers.add('traceStringValueOfNode');
      return tsCallExpression('traceStringValueOfNode', [
        tsCallExpression('selectSimplePathNode', [
          tsRawExpression(simplePath.absolute ? 'document' : contextNodeIdentifier),
          tsRawExpression(JSON.stringify(simplePath.segments)),
        ]),
        tsRawExpression('ctx'),
        tsRawExpression(instructionInfoCode),
      ]);
    }
  } else {
    const simplePath = tryResolveSimpleChildPath(ast, contextNodeIdentifier, variableBindings);
    if (simplePath !== undefined) {
      runtimeHelpers.add('selectSimplePathNode');
      runtimeHelpers.add('traceStringValueOfNode');
      return tsCallExpression('traceStringValueOfNode', [
        tsCallExpression('selectSimplePathNode', [
          simplePath.startNodeExpression,
          tsRawExpression(JSON.stringify(simplePath.segments)),
        ]),
        tsRawExpression('ctx'),
        tsRawExpression(instructionInfoCode),
      ]);
    }
  }

  const descendantPath = tryGetSimpleDescendantNamePath(ast);
  if (descendantPath === undefined) {
    return undefined;
  }

  runtimeHelpers.add('selectDescendantElementsByName');
  runtimeHelpers.add('traceStringValueOfNode');
  return tsCallExpression('traceStringValueOfNode', [
    tsRawExpression(
      `selectDescendantElementsByName(${descendantPath.absolute ? 'document' : contextNodeIdentifier}, ${JSON.stringify(descendantPath.localName)})[0] ?? null`,
    ),
    tsRawExpression('ctx'),
    tsRawExpression(instructionInfoCode),
  ]);
}

function emitPathStringValueExpression(
  ast: PathExpression,
  runtimeHelpers: Set<string>,
  contextNodeIdentifier: string,
  variableBindings?: ReadonlyMap<string, TsExpression>,
): TsExpression | undefined {
  if (variableBindings === undefined) {
    const simplePath = tryGetSimpleChildPath(ast);
    if (simplePath !== undefined) {
      runtimeHelpers.add('selectSimplePathText');
      return tsCallExpression('selectSimplePathText', [
        tsRawExpression(simplePath.absolute ? 'document' : contextNodeIdentifier),
        tsRawExpression(JSON.stringify(simplePath.segments)),
      ]);
    }
  } else {
    const simplePath = tryResolveSimpleChildPath(ast, contextNodeIdentifier, variableBindings);
    if (simplePath !== undefined) {
      runtimeHelpers.add('selectSimplePathText');
      return tsCallExpression('selectSimplePathText', [
        simplePath.startNodeExpression,
        tsRawExpression(JSON.stringify(simplePath.segments)),
      ]);
    }
  }

  const descendantPath = tryGetSimpleDescendantNamePath(ast);
  if (descendantPath === undefined) {
    return undefined;
  }

  runtimeHelpers.add('selectDescendantElementTextByName');
  return tsCallExpression('selectDescendantElementTextByName', [
    tsRawExpression(descendantPath.absolute ? 'document' : contextNodeIdentifier),
    tsStringLiteral(descendantPath.localName),
  ]);
}

function tryGetSimpleDescendantNamePath(
  ast: PathExpression,
): { readonly absolute: boolean; readonly localName: string } | undefined {
  if (ast.base !== undefined || ast.steps.length !== 2) {
    return undefined;
  }

  const [leadingStep, terminalStep] = ast.steps;
  if (
    leadingStep === undefined ||
    leadingStep.kind !== 'step' ||
    leadingStep.axis !== 'descendant-or-self' ||
    leadingStep.predicates.length > 0 ||
    leadingStep.nodeTest.kind !== 'kindTest' ||
    leadingStep.nodeTest.name !== 'node' ||
    terminalStep === undefined ||
    terminalStep.kind !== 'step' ||
    terminalStep.axis !== 'child' ||
    terminalStep.predicates.length > 0 ||
    terminalStep.nodeTest.kind !== 'nameTest' ||
    terminalStep.nodeTest.name.includes(':')
  ) {
    return undefined;
  }

  return {
    absolute: ast.absolute,
    localName: terminalStep.nodeTest.name,
  };
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

function emitTemporaryTreeBindingExpression(
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

function resolveVariableBindingExpression(
  name: string,
  variableBindings: ReadonlyMap<string, TsExpression> | undefined,
): TsExpression | undefined {
  if (variableBindings === undefined) {
    return undefined;
  }

  return (
    variableBindings.get(name) ??
    (name.startsWith('{}') ? undefined : variableBindings.get(`{}${name}`))
  );
}

function sanitizeIdentifierFragment(name: string): string {
  return name.replaceAll(/[^A-Za-z0-9_]/g, '_');
}
