import type { DiagnosticReport } from '../../diagnostics/index.js';
import type { FlowBinding, LetBinding, XPathAst } from '../../xpath/parse/ast.js';

import {
  createAnalysisWarning,
  createGlobalBindingFrame,
  createTemplateFrame,
  toSourceSpan,
} from './analysisDiagnostics.js';
import type {
  GlobalBinding,
  Instruction,
  StylesheetIR,
  TemplateParam,
  TemplateRule,
  WithParam,
} from './ir.js';

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
  readonly localVariables: Array<{
    readonly id: number;
    readonly instruction: Extract<Instruction, { readonly kind: 'variable' }>;
  }>;
  readonly usedLocalVariableIds: Set<number>;
  nextLocalVariableId: number;
}

interface BindingUsageCallbacks {
  readonly onUnresolvedVariableReference?: (name: string) => void;
  readonly onCallTemplate?: (name: string) => void;
}

export interface TemplateReachabilityAnalysis {
  readonly globalBindingReports: readonly DiagnosticReport[];
  readonly templateReports: readonly DiagnosticReport[];
}

export function analyzeTemplateReachability(ir: StylesheetIR): TemplateReachabilityAnalysis {
  const reachableNamedTemplateNames = collectReachableNamedTemplateNames(ir);
  const reachableGlobalBindingNames = collectReachableGlobalBindingNames(ir);

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

    if (
      template.name !== undefined &&
      template.match === undefined &&
      !reachableNamedTemplateNames.has(template.name)
    ) {
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

  return { globalBindingReports, templateReports };
}

function collectReachableNamedTemplateNames(ir: StylesheetIR): ReadonlySet<string> {
  const namedTemplates = new Map(
    ir.templates.flatMap((template) =>
      template.name === undefined ? [] : [[template.name, template] as const],
    ),
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
        case 'conditionalContent':
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
  const globalBindings = new Map(
    ir.globalBindings.map((binding) => [binding.name, binding] as const),
  );
  const namedTemplates = new Map(
    ir.templates.flatMap((template) =>
      template.name === undefined ? [] : [[template.name, template] as const],
    ),
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

function collectTemplateBindingUsage(
  template: TemplateRule,
  callbacks: BindingUsageCallbacks = {},
): TemplateBindingUsage {
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
      case 'conditionalContent':
        if (instruction.select !== undefined) {
          visitXPathForBindingUsage(instruction.select, scope, usage, callbacks);
        }
        if (instruction.body !== undefined) {
          visitInstructionsForBindingUsage(instruction.body, scope, usage, callbacks);
        }
        break;
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
    suggestions: [
      {
        kind: 'hint',
        label:
          'remove the template or add an xsl:call-template that reaches it from a matched template',
        confidence: 1,
      },
    ],
  });
}

function createUnusedTemplateParamDiagnostic(
  template: TemplateRule,
  param: TemplateParam,
): DiagnosticReport {
  const primary = toSourceSpan(param.location);
  const frame = createTemplateFrame(template, primary);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNUSED_TEMPLATE_PARAM',
    message: `Template parameter ${param.name} is never referenced within its template.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [{ key: 'paramName', value: param.name }],
    suggestions: [
      {
        kind: 'hint',
        label: `remove the parameter or reference $${param.name} from the template body or parameter defaults`,
        confidence: 1,
      },
    ],
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
    suggestions: [
      {
        kind: 'hint',
        label: `remove the variable or reference $${variable.name} later in the same scope`,
        confidence: 1,
      },
    ],
  });
}

function createUnusedGlobalParamDiagnostic(
  binding: Extract<GlobalBinding, { readonly kind: 'param' }>,
): DiagnosticReport {
  const primary = toSourceSpan(binding.location);
  const frame = createGlobalBindingFrame(binding, primary);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNUSED_GLOBAL_PARAM',
    message: `Stylesheet parameter ${binding.name} is never referenced from any reachable template or global binding.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [{ key: 'paramName', value: binding.name }],
    suggestions: [
      {
        kind: 'hint',
        label: `remove the stylesheet parameter or reference $${binding.name} from a reachable template or global binding`,
        confidence: 1,
      },
    ],
  });
}

function createUnusedGlobalVariableDiagnostic(
  binding: Extract<GlobalBinding, { readonly kind: 'variable' }>,
): DiagnosticReport {
  const primary = toSourceSpan(binding.location);
  const frame = createGlobalBindingFrame(binding, primary);

  return createAnalysisWarning({
    code: 'WEAVER_ANALYZE_UNUSED_GLOBAL_VARIABLE',
    message: `Stylesheet variable ${binding.name} is never referenced from any reachable template or global binding.`,
    primary,
    frames: frame === undefined ? [] : [frame],
    details: [{ key: 'variableName', value: binding.name }],
    suggestions: [
      {
        kind: 'hint',
        label: `remove the stylesheet variable or reference $${binding.name} from a reachable template or global binding`,
        confidence: 1,
      },
    ],
  });
}
