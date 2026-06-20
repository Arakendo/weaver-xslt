import { throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathNode, selectSimplePathNodes, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-root-for-each-apply-templates.xsl", digest: "b2b31d1f" } as const;

/** match="/root" (matched-root-for-each-apply-templates.xsl:1) */
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
  const currentNode = selectSimplePathNode(document, ["root"]);
  if (currentNode === null) {
    return { output: "" };
  }
  traceFocusEnter(currentNode, ctx);
  traceTemplateEnter(currentNode, ctx, {"match":"/root","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":106,"endOffset":105}});
  return {
    output:
      (
  /** literal items (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (matched-root-for-each-apply-templates.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(currentNode, ["item"]), ctx, {"kind":"xsl:for-each","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}).map((currentNode) => (
  /** literal item (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (matched-root-for-each-apply-templates.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}))
) +
    (
  /** literal details (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (matched-root-for-each-apply-templates.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(currentNode, [{"name":"detail"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="detail" (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"detail","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":106,"endOffset":105}});
  return (
  /** literal detail (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  const body = escapeText(traceStringValueOfNode(templateNode, ctx, {"kind":"xsl:value-of","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}));
  return "<detail" + "" + ">" + body + "</detail>";
})()
);
})()
)).join("")
);
  return "<details" + "" + ">" + body + "</details>";
})()
);
  return "<item" + "" + ">" + body + "</item>";
})()
)).join("")
);
  return "<items" + "" + ">" + body + "</items>";
})()
),
    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),
  };
}

export default { source, transform };
//# sourceMappingURL=matched-root-for-each-apply-templates.xsl.map
