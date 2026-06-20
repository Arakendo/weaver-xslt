import type { GlobalParam, StylesheetIR } from '../compile/ir.js';
import { createEmitPlan, type EmitStylesheetModuleOptions } from './plan.js';
import { tryCreateNativeTransformPlan } from './emitInstructions.js';
import { renderTemplateProvenanceComment } from './provenance.js';
import { renderTsExpression, renderTsModule } from './ts-ir.js';

export function emitStylesheetModule(
  ir: StylesheetIR,
  options: EmitStylesheetModuleOptions,
): string {
  const plan = createEmitPlan(ir, options);
  const nativePlan = tryCreateNativeTransformPlan(plan.stylesheet, plan.sourcePath);
  const typeBlock = createStylesheetTypeBlock(ir);

  if (nativePlan !== undefined) {
    const defaultIsInitialTemplateExecution =
      nativePlan.initialTemplateName !== undefined &&
      nativePlan.initialTemplateEntryTemplate === undefined;
    const defaultNeedsTraceDocumentBinding = !nativePlan.needsCurrentNodeBinding;
    const defaultTraceNodeIdentifier = nativePlan.needsCurrentNodeBinding
      ? 'currentNode'
      : 'document';
    const defaultCurrentNodeIsDocument =
      renderTsExpression(nativePlan.currentNodeExpression) === 'document';
    const defaultTemplateInfo = JSON.stringify({
      ...(nativePlan.entryTemplate.matchText === undefined
        ? {}
        : { match: nativePlan.entryTemplate.matchText }),
      ...(nativePlan.entryTemplate.name === undefined
        ? {}
        : { name: nativePlan.entryTemplate.name }),
      location: nativePlan.entryTemplate.location,
    });
    const initialNeedsTraceDocumentBinding = !(
      nativePlan.initialTemplateNeedsCurrentNodeBinding ?? false
    );
    const initialTraceNodeIdentifier =
      (nativePlan.initialTemplateNeedsCurrentNodeBinding ?? false) ? 'currentNode' : 'document';
    const initialTemplateInfo =
      nativePlan.initialTemplateEntryTemplate === undefined
        ? undefined
        : JSON.stringify({
            ...(nativePlan.initialTemplateEntryTemplate.matchText === undefined
              ? {}
              : { match: nativePlan.initialTemplateEntryTemplate.matchText }),
            ...(nativePlan.initialTemplateEntryTemplate.name === undefined
              ? {}
              : { name: nativePlan.initialTemplateEntryTemplate.name }),
            location: nativePlan.initialTemplateEntryTemplate.location,
          });
    const initialModeGuardStatements = [
      '  if (ctx.initialMode !== undefined) {',
      '    throwUnsupportedNativeInitialMode(ctx.initialMode);',
      '  }',
    ];
    const missingInitialTemplateGuardStatements =
      nativePlan.initialTemplateName !== undefined
        ? []
        : [
            '  if (ctx.initialTemplate !== undefined) {',
            '    throwMissingNativeInitialTemplate(ctx.initialTemplate, []);',
            '  }',
          ];
    const initialTemplateValueStatements =
      nativePlan.initialTemplateName === undefined
        ? []
        : [
            '  const requestedInitialTemplate = ctx.initialTemplate === undefined',
            '    ? undefined',
            `    : normalizeNativeTemplateName(ctx.initialTemplate, ${JSON.stringify(ir.namespaces)}, ${JSON.stringify(ir.defaultElementNamespace)});`,
          ];
    const initialTemplateGuardStatements =
      nativePlan.initialTemplateName === undefined
        ? []
        : [
            '  if (requestedInitialTemplate !== undefined && requestedInitialTemplate !== ' +
              JSON.stringify(nativePlan.initialTemplateName) +
              ') {',
            '    throwMissingNativeInitialTemplate(ctx.initialTemplate, [' +
              JSON.stringify(nativePlan.initialTemplateName) +
              ']);',
            '  }',
          ];
    const defaultBodyStatements = [
      ...(nativePlan.setupStatements.length === 0 ? ['  void ctx;'] : []),
      ...(nativePlan.needsDocumentBinding || defaultNeedsTraceDocumentBinding
        ? ['  const document = createCompiledDocument(sourceXml);']
        : ['  createCompiledDocument(sourceXml);']),
      ...(!defaultIsInitialTemplateExecution &&
      defaultTraceNodeIdentifier !== 'document' &&
      !defaultCurrentNodeIsDocument
        ? ['  traceFocusEnter(document, ctx);']
        : []),
      ...nativePlan.setupStatements.map((statement) => `  ${statement}`),
      ...(nativePlan.needsCurrentNodeBinding
        ? [`  const currentNode = ${renderTsExpression(nativePlan.currentNodeExpression)};`]
        : []),
      ...(nativePlan.currentNodeMayBeNull
        ? ['  if (currentNode === null) {', '    return { output: "" };', '  }']
        : []),
      ...(defaultIsInitialTemplateExecution
        ? []
        : [`  traceFocusEnter(${defaultTraceNodeIdentifier}, ctx);`]),
      `  traceTemplateEnter(${defaultTraceNodeIdentifier}, ctx, ${defaultTemplateInfo});`,
      '  return {',
      '    output:',
      `      ${renderTsExpression(nativePlan.outputExpression)},`,
      '    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),',
      '  };',
    ];
    const wrappedDefaultBodyStatements =
      nativePlan.initialTemplateEntryTemplate !== undefined
        ? defaultBodyStatements
        : nativePlan.initialTemplateName === undefined
          ? defaultBodyStatements
          : [
              '  try {',
              ...defaultBodyStatements.map((statement) => `  ${statement.slice(2)}`),
              '  } catch (error) {',
              `    throw prependNativeInitialTemplateError(error, ${JSON.stringify(nativePlan.initialTemplateName)}, ${JSON.stringify(nativePlan.entryTemplate.location)});`,
              '  }',
            ];
    const initialTemplateBodyStatements =
      nativePlan.initialTemplateEntryTemplate === undefined
        ? []
        : [
            '  if (requestedInitialTemplate === ' +
              JSON.stringify(nativePlan.initialTemplateName) +
              ') {',
            '    try {',
            ...((nativePlan.initialTemplateSetupStatements ?? []).length === 0
              ? ['      void ctx;']
              : []),
            ...(nativePlan.needsDocumentBinding || initialNeedsTraceDocumentBinding
              ? ['      const document = createCompiledDocument(sourceXml);']
              : ['      createCompiledDocument(sourceXml);']),
            ...(nativePlan.initialTemplateSetupStatements ?? []).map(
              (statement) => `      ${statement}`,
            ),
            ...((nativePlan.initialTemplateNeedsCurrentNodeBinding ?? false)
              ? [
                  `      const currentNode = ${renderTsExpression(nativePlan.initialTemplateCurrentNodeExpression!)};`,
                ]
              : []),
            ...((nativePlan.initialTemplateCurrentNodeMayBeNull ?? false)
              ? ['      if (currentNode === null) {', '        return { output: "" };', '      }']
              : []),
            `      traceTemplateEnter(${initialTraceNodeIdentifier}, ctx, ${initialTemplateInfo!});`,
            '      return {',
            '        output:',
            `          ${renderTsExpression(nativePlan.initialTemplateOutputExpression!)},`,
            '        ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),',
            '      };',
            '    } catch (error) {',
            `      throw prependNativeInitialTemplateError(error, ${JSON.stringify(nativePlan.initialTemplateName)}, ${JSON.stringify(nativePlan.initialTemplateEntryTemplate.location)});`,
            '    }',
            '  }',
          ];
    return renderTsModule({
      statements: [
        `import { ${[...new Set(['throwMissingNativeInitialTemplate', 'throwUnsupportedNativeInitialMode', 'getRecordedTracePause', 'resetRecordedTracePause', 'traceFocusEnter', 'traceTemplateEnter', ...nativePlan.runtimeHelpers])].join(', ')} } from ${JSON.stringify(plan.moduleSpecifier)};`,
        `import type { TransformContext, TransformResult } from ${JSON.stringify(plan.moduleSpecifier)};`,
        ...typeBlock.importStatements,
        '',
        ...typeBlock.typeStatements,
        ...(typeBlock.typeStatements.length > 0 ? [''] : []),
        `export const source = { path: ${JSON.stringify(plan.sourcePath)}, digest: ${JSON.stringify(plan.digest)} } as const;`,
        '',
        renderTemplateProvenanceComment(nativePlan.entryTemplate, plan.sourcePath),
        `export function transform(sourceXml: string, ctx: ${typeBlock.transformContextTypeName} = {}): TransformResult {`,
        '  ctx = ctx.baseUri === undefined ? { ...ctx, baseUri: source.path } : ctx;',
        '  resetRecordedTracePause(ctx.trace);',
        ...initialModeGuardStatements,
        ...missingInitialTemplateGuardStatements,
        ...initialTemplateValueStatements,
        ...initialTemplateGuardStatements,
        ...initialTemplateBodyStatements,
        ...wrappedDefaultBodyStatements,
        '}',
        '',
        'export default { source, transform };',
      ],
    });
  }

  return renderTsModule({
    statements: [
      `import { transformCompiledStylesheet } from ${JSON.stringify(plan.moduleSpecifier)};`,
      `import type { StylesheetIR, TransformContext, TransformResult } from ${JSON.stringify(plan.moduleSpecifier)};`,
      ...typeBlock.importStatements,
      '',
      `const stylesheet = ${plan.serializedIr} satisfies StylesheetIR;`,
      '',
      ...typeBlock.typeStatements,
      ...(typeBlock.typeStatements.length > 0 ? [''] : []),
      `export const source = { path: ${JSON.stringify(plan.sourcePath)}, digest: ${JSON.stringify(plan.digest)} } as const;`,
      '',
      `export function transform(sourceXml: string, ctx: ${typeBlock.transformContextTypeName} = {}): TransformResult {`,
      '  ctx = ctx.baseUri === undefined ? { ...ctx, baseUri: source.path } : ctx;',
      '  return transformCompiledStylesheet(stylesheet, sourceXml, ctx);',
      '}',
      '',
      'export default { source, transform };',
    ],
  });
}

export function emitStylesheetDeclarationModule(
  ir: StylesheetIR,
  options: EmitStylesheetModuleOptions,
): string {
  const plan = createEmitPlan(ir, options);
  const typeBlock = createStylesheetTypeBlock(ir);
  const statements: string[] = [
    `import type { TransformContext, TransformResult } from ${JSON.stringify(plan.moduleSpecifier)};`,
  ];

  statements.push(...typeBlock.importStatements);

  statements.push('');
  statements.push(
    `export declare const source: { readonly path: ${JSON.stringify(plan.sourcePath)}; readonly digest: ${JSON.stringify(plan.digest)}; };`,
  );
  statements.push('');
  statements.push(
    ...typeBlock.typeStatements.map((statement) =>
      statement
        .replace('export interface', 'export interface')
        .replace('export type', 'export type'),
    ),
  );

  statements.push('');
  statements.push(
    'export declare function transform(sourceXml: string, ctx?: StylesheetTransformContext): TransformResult;',
  );
  statements.push('');
  statements.push('declare const _default: {');
  statements.push('  readonly source: typeof source;');
  statements.push('  readonly transform: typeof transform;');
  statements.push('};');
  statements.push('');
  statements.push('export default _default;');

  return renderTsModule({ statements });
}

function mapStylesheetParamTypeToTs(
  declaredType: string | undefined,
  xmldomTypes: Set<string>,
): string {
  if (declaredType === undefined) {
    return 'unknown';
  }

  const trimmedType = declaredType.trim();
  const occurrence = trimmedType.at(-1);
  const baseType =
    occurrence === '?' || occurrence === '*' || occurrence === '+'
      ? trimmedType.slice(0, -1).trim()
      : trimmedType;

  const mappedBaseType = mapStylesheetBaseTypeToTs(baseType, xmldomTypes);
  if (occurrence === '*' || occurrence === '+') {
    return mappedBaseType.includes('|')
      ? `readonly (${mappedBaseType})[]`
      : `readonly ${mappedBaseType}[]`;
  }

  return mappedBaseType;
}

function mapStylesheetBaseTypeToTs(baseType: string, xmldomTypes: Set<string>): string {
  switch (baseType) {
    case 'xs:string':
      return 'string';
    case 'xs:integer':
    case 'xs:double':
    case 'xs:decimal':
    case 'xs:float':
      return 'number';
    case 'xs:boolean':
      return 'boolean';
    case 'element()':
    case 'element(*)':
      xmldomTypes.add('Element');
      return 'Element';
    case 'document-node()':
    case 'document-node(element())':
    case 'document-node(element(*))':
      xmldomTypes.add('Document');
      return 'Document';
    case 'node()':
      xmldomTypes.add('Node');
      return 'Node';
    default:
      return 'unknown';
  }
}

interface StylesheetTypeBlock {
  readonly importStatements: readonly string[];
  readonly typeStatements: readonly string[];
  readonly transformContextTypeName: string;
}

function createStylesheetTypeBlock(ir: StylesheetIR): StylesheetTypeBlock {
  const parameters = ir.globalBindings.filter(
    (binding): binding is GlobalParam => binding.kind === 'param',
  );
  if (parameters.length === 0) {
    return {
      importStatements: [],
      typeStatements: [],
      transformContextTypeName: 'TransformContext',
    };
  }

  const xmldomTypes = new Set<string>();
  const parameterLines = parameters.map((parameter) => {
    const typeText = mapStylesheetParamTypeToTs(parameter.asType, xmldomTypes);
    const optionalToken = parameter.required ? '' : '?';
    return `  readonly ${JSON.stringify(parameter.name)}${optionalToken}: ${typeText};`;
  });

  return {
    importStatements:
      xmldomTypes.size > 0
        ? [`import type { ${[...xmldomTypes].sort().join(', ')} } from '@xmldom/xmldom';`]
        : [],
    typeStatements: [
      'export interface StylesheetParameters extends Readonly<Record<string, unknown>> {',
      ...parameterLines,
      '}',
      '',
      'export type StylesheetTransformContext = Omit<TransformContext, "parameters"> & {',
      '  readonly parameters?: StylesheetParameters;',
      '};',
    ],
    transformContextTypeName: 'StylesheetTransformContext',
  };
}
