import type { StylesheetIR } from '../compile/ir.js';
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

  if (nativePlan !== undefined) {
    return renderTsModule({
      statements: [
        `import { ${nativePlan.runtimeHelpers.join(', ')} } from ${JSON.stringify(plan.moduleSpecifier)};`,
        `import type { TransformContext, TransformResult } from ${JSON.stringify(plan.moduleSpecifier)};`,
        '',
        `export const source = { path: ${JSON.stringify(plan.sourcePath)}, digest: ${JSON.stringify(plan.digest)} } as const;`,
        '',
        renderTemplateProvenanceComment(nativePlan.entryTemplate, plan.sourcePath),
        'export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {',
        '  void ctx;',
        '  const document = createCompiledDocument(sourceXml);',
        ...(nativePlan.needsCurrentNodeBinding
          ? [`  const currentNode = ${renderTsExpression(nativePlan.currentNodeExpression)};`]
          : []),
        ...(nativePlan.currentNodeMayBeNull
          ? [
              '  if (currentNode === null) {',
              '    return { output: "" };',
              '  }',
            ]
          : []),
        '  return {',
        '    output:',
        `      ${renderTsExpression(nativePlan.outputExpression)},`,
        '  };',
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
      '',
      `const stylesheet = ${plan.serializedIr} satisfies StylesheetIR;`,
      '',
      `export const source = { path: ${JSON.stringify(plan.sourcePath)}, digest: ${JSON.stringify(plan.digest)} } as const;`,
      '',
      'export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {',
      '  return transformCompiledStylesheet(stylesheet, sourceXml, ctx);',
      '}',
      '',
      'export default { source, transform };',
    ],
  });
}