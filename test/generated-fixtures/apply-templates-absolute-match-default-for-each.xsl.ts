import { throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, traceFocusEnter, traceTemplateEnter, applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-match-default-for-each.xsl", digest: "cb68fcf5" } as const;

/** match="/" (apply-templates-absolute-match-default-for-each.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  ctx = ctx.baseUri === undefined ? { ...ctx, baseUri: source.path } : ctx;
  resetRecordedTracePause(ctx.trace);
  if (ctx.initialMode !== undefined) {
    throwUnsupportedNativeInitialMode(ctx.initialMode);
  }
  if (ctx.initialTemplate !== undefined) {
    throwMissingNativeInitialTemplate(ctx.initialTemplate, []);
  }
  void ctx;
  const document = createCompiledDocument(sourceXml);
  traceFocusEnter(document, ctx);
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-absolute-match-default-for-each.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return {
    output:
      (
  /** literal items (apply-templates-absolute-match-default-for-each.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-absolute-match-default-for-each.xsl:1) */
  applyBuiltInTemplatesByPath(document, ["root","item"], (templateNode, templateIndex, templateNodes) => (
  /** match="/root/item" (apply-templates-absolute-match-default-for-each.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"/root/item","location":{"source":"apply-templates-absolute-match-default-for-each.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-absolute-match-default-for-each.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-absolute-match-default-for-each.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-absolute-match-default-for-each.xsl","line":1,"column":217,"offset":216,"endLine":1,"endColumn":221,"endOffset":220}}))
) +
    (
  /** literal details (apply-templates-absolute-match-default-for-each.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-absolute-match-default-for-each.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-absolute-match-default-for-each.xsl","line":1,"column":217,"offset":216,"endLine":1,"endColumn":221,"endOffset":220}}).map((currentNode) => (
  /** literal detail (apply-templates-absolute-match-default-for-each.xsl:1) */
  (() => {
  const body = escapeText(traceStringValueOfNode(currentNode, ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-absolute-match-default-for-each.xsl","line":1,"column":217,"offset":216,"endLine":1,"endColumn":221,"endOffset":220}}));
  return "<detail" + "" + ">" + body + "</detail>";
})()
)).join("")
);
  return "<details" + "" + ">" + body + "</details>";
})()
);
  return "<item" + "" + ">" + body + "</item>";
})()
);
})()
), true, ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-absolute-match-default-for-each.xsl","line":1,"column":111,"offset":110,"endLine":1,"endColumn":112,"endOffset":111}})
);
  return "<items" + "" + ">" + body + "</items>";
})()
),
    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),
  };
}

export default { source, transform };
//# sourceMappingURL=apply-templates-absolute-match-default-for-each.xsl.map
