import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.0","xsltVersion":"3.0","location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149},"selectText":"/root/item","select":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}}}],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}},"matchText":"/root/item","location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"selectText":"detail","body":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"marker","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"testText":"marker","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":353,"offset":352,"endLine":1,"endColumn":354,"endOffset":353}}],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":311,"offset":310,"endLine":1,"endColumn":315,"endOffset":314}}],"otherwiseBody":[{"kind":"literalElement","name":"brief","attributes":[],"body":[],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":389,"offset":388,"endLine":1,"endColumn":390,"endOffset":389}}],"otherwiseLocation":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":374,"offset":373,"endLine":1,"endColumn":375,"endOffset":374},"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":317,"offset":316,"endLine":1,"endColumn":318,"endOffset":317}}],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":311,"offset":310,"endLine":1,"endColumn":315,"endOffset":314}}],"otherwiseBody":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"vip","span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"predicates":[],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}}],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"testText":"vip","body":[{"kind":"literalElement","name":"vip","attributes":[],"body":[],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":485,"offset":484,"endLine":1,"endColumn":486,"endOffset":485}}],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":311,"offset":310,"endLine":1,"endColumn":315,"endOffset":314}}],"otherwiseBody":[{"kind":"literalElement","name":"plain","attributes":[],"body":[],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":517,"offset":516,"endLine":1,"endColumn":518,"endOffset":517}}],"otherwiseLocation":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":502,"offset":501,"endLine":1,"endColumn":503,"endOffset":502},"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":452,"offset":451,"endLine":1,"endColumn":453,"endOffset":452}}],"otherwiseLocation":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":437,"offset":436,"endLine":1,"endColumn":438,"endOffset":437},"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":283,"offset":282,"endLine":1,"endColumn":284,"endOffset":283}}],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":244,"offset":243,"endLine":1,"endColumn":245,"endOffset":244}}],"location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":209,"offset":208,"endLine":1,"endColumn":210,"endOffset":209}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-absolute-match-for-each-choose-nested-choose.xsl", digest: "df6cb068" } as const;

/** match="/" (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  ctx = ctx.baseUri === undefined ? { ...ctx, baseUri: source.path } : ctx;
  const finish = (result: TransformResult): TransformResult => appendTraceSummary(ctx, appendCoverageWarnings(stylesheet, sourceXml, ctx, result));
  resetRecordedTracePause(ctx.trace);
  resetRecordedTraceSummary(ctx.trace);
  if (ctx.initialMode !== undefined) {
    throwUnsupportedNativeInitialMode(ctx.initialMode);
  }
  if (ctx.initialTemplate !== undefined) {
    throwMissingNativeInitialTemplate(ctx.initialTemplate, []);
  }
  void ctx;
  const document = createCompiledDocument(sourceXml);
  traceFocusEnter(document, ctx);
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="/root/item" (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"/root/item","location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}))
) +
    (
  /** literal details (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-absolute-match-for-each-choose-nested-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}).map((currentNode) => (
  /** xsl:choose (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** xsl:choose (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["marker"]) ? (
  /** xsl:when (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal flagged (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
)
) : (
  /** xsl:otherwise (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal brief (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (() => {
  const body = "";
  return "<brief" + "" + ">" + body + "</brief>";
})()
)
))
)
) : (
  /** xsl:otherwise (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** xsl:choose (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** xsl:when (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal vip (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (() => {
  const body = "";
  return "<vip" + "" + ">" + body + "</vip>";
})()
)
) : (
  /** xsl:otherwise (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal plain (apply-templates-absolute-match-for-each-choose-nested-choose.xsl:1) */
  (() => {
  const body = "";
  return "<plain" + "" + ">" + body + "</plain>";
})()
)
))
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
  });
}

export default { source, transform };
//# sourceMappingURL=apply-templates-absolute-match-for-each-choose-nested-choose.xsl.map
