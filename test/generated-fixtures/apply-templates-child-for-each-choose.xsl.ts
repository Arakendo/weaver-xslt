import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.3","xsltVersion":"3.0","location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149},"selectText":"/root/item","select":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}}}],"location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"matchText":"item","location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"selectText":"detail","body":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":311,"offset":310,"endLine":1,"endColumn":312,"endOffset":311}}],"location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":305,"offset":304,"endLine":1,"endColumn":309,"endOffset":308}}],"otherwiseBody":[{"kind":"literalElement","name":"plain","attributes":[],"body":[],"location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":347,"offset":346,"endLine":1,"endColumn":348,"endOffset":347}}],"otherwiseLocation":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":332,"offset":331,"endLine":1,"endColumn":333,"endOffset":332},"location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":277,"offset":276,"endLine":1,"endColumn":278,"endOffset":277}}],"location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}],"location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":238,"offset":237,"endLine":1,"endColumn":239,"endOffset":238}}],"location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":203,"offset":202,"endLine":1,"endColumn":204,"endOffset":203}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-child-for-each-choose.xsl", digest: "24c680cc" } as const;

/** match="/" (apply-templates-child-for-each-choose.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-child-for-each-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-child-for-each-choose.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="item" (apply-templates-child-for-each-choose.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"item","location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-child-for-each-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-child-for-each-choose.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}))
) +
    (
  /** literal details (apply-templates-child-for-each-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-child-for-each-choose.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-child-for-each-choose.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}).map((currentNode) => (
  /** xsl:choose (apply-templates-child-for-each-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-child-for-each-choose.xsl:1) */
  (
  /** literal flagged (apply-templates-child-for-each-choose.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
)
) : (
  /** xsl:otherwise (apply-templates-child-for-each-choose.xsl:1) */
  (
  /** literal plain (apply-templates-child-for-each-choose.xsl:1) */
  (() => {
  const body = "";
  return "<plain" + "" + ">" + body + "</plain>";
})()
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
//# sourceMappingURL=apply-templates-child-for-each-choose.xsl.map
