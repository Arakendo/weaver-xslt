import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.4","xsltVersion":"3.0","location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":158,"endOffset":157},"selectText":"/root/section/item","select":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"section","span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}},"predicates":[],"span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":14,"end":18,"line":1,"column":15,"endLine":1,"endColumn":19}},"predicates":[],"span":{"start":14,"end":18,"line":1,"column":15,"endLine":1,"endColumn":19}}],"span":{"start":0,"end":18,"line":1,"column":1,"endLine":1,"endColumn":19}}}],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"section","span":{"start":0,"end":7,"line":1,"column":1,"endLine":1,"endColumn":8}},"predicates":[],"span":{"start":0,"end":7,"line":1,"column":1,"endLine":1,"endColumn":8}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":8,"end":12,"line":1,"column":9,"endLine":1,"endColumn":13}},"predicates":[],"span":{"start":8,"end":12,"line":1,"column":9,"endLine":1,"endColumn":13}}],"span":{"start":0,"end":12,"line":1,"column":1,"endLine":1,"endColumn":13}},"matchText":"section/item","location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":158,"endOffset":157}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"selectText":"detail","body":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":327,"offset":326,"endLine":1,"endColumn":328,"endOffset":327}}],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":321,"offset":320,"endLine":1,"endColumn":325,"endOffset":324}},{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"vip","span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"predicates":[],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}}],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"testText":"vip","body":[{"kind":"literalElement","name":"vip","attributes":[],"body":[],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":369,"offset":368,"endLine":1,"endColumn":370,"endOffset":369}}],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":321,"offset":320,"endLine":1,"endColumn":325,"endOffset":324}}],"otherwiseBody":[{"kind":"literalElement","name":"plain","attributes":[],"body":[],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":401,"offset":400,"endLine":1,"endColumn":402,"endOffset":401}}],"otherwiseLocation":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":386,"offset":385,"endLine":1,"endColumn":387,"endOffset":386},"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":293,"offset":292,"endLine":1,"endColumn":294,"endOffset":293}}],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":158,"endOffset":157}}],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":254,"offset":253,"endLine":1,"endColumn":255,"endOffset":254}}],"location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":219,"offset":218,"endLine":1,"endColumn":220,"endOffset":219}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-nested-match-for-each-choose-multi-when.xsl", digest: "c5e2b40d" } as const;

/** match="/" (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"section"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":158,"endOffset":157}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="section/item" (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"section/item","location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":158,"endOffset":157}}))
) +
    (
  /** literal details (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-nested-match-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":158,"endOffset":157}}).map((currentNode) => (
  /** xsl:choose (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (
  /** literal flagged (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
)
) : (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** xsl:when (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (
  /** literal vip (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<vip" + "" + ">" + body + "</vip>";
})()
)
) : (
  /** xsl:otherwise (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (
  /** literal plain (apply-templates-nested-match-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<plain" + "" + ">" + body + "</plain>";
})()
)
)))
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
//# sourceMappingURL=apply-templates-nested-match-for-each-choose-multi-when.xsl.map
