import type { GlobalBinding, StylesheetIR, TemplateRule } from '../compile/ir.js';
import { tsCallExpression, tsRawExpression, tsStringLiteral, type TsExpression } from './ts-ir.js';
import {
  emitPlannedApplyTemplatesInstruction,
  tryGetRootApplyTemplatesPlan,
  tryGetRootApplyTemplatesShape,
  type ApplyTemplatesTemplatePlan,
} from './nativeApplyTemplates.js';
import { tryGetSimpleChildPath, tryGetSimpleMatchPath } from './nativePathExpressions.js';
import {
  emitInstructionSequence,
  emitTemporaryTreeBindingExpression,
  emitVariableValueExpression,
  sanitizeIdentifierFragment,
  tryCreateTemplateInvocationSetup,
} from './emitInstructions.js';

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
