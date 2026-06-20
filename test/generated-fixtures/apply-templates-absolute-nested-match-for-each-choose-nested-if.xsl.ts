import { throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl", digest: "ae1012ee" } as const;

/** match="/" (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return {
    output:
      (
  /** literal items (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":158,"endOffset":157}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="/root/section/item" (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"/root/section/item","location":{"source":"apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":158,"endOffset":157}}))
) +
    (
  /** literal details (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":158,"endOffset":157}}).map((currentNode) => (
  /** xsl:choose (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["marker"]) ? (
  /** literal flagged (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
) : "")
)
) : (
  /** xsl:otherwise (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** literal vip (apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = "";
  return "<vip" + "" + ">" + body + "</vip>";
})()
) : "")
)
))
)).join("")
);
  return "<details" + "" + ">" + body + "</details>";
})()
);
  return "<item" + "" + ">" + body + "</item>";
})()
);
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
//# sourceMappingURL=apply-templates-absolute-nested-match-for-each-choose-nested-if.xsl.map
