import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.1","xsltVersion":"3.0","location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148},"selectText":"root/item","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}},"predicates":[],"span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}}],"span":{"start":0,"end":9,"line":1,"column":1,"endLine":1,"endColumn":10}}}],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"matchText":"item","location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"selectText":"detail","body":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":310,"offset":309,"endLine":1,"endColumn":311,"endOffset":310}}],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":304,"offset":303,"endLine":1,"endColumn":308,"endOffset":307}},{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"vip","span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"predicates":[],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}}],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"testText":"vip","body":[{"kind":"literalElement","name":"vip","attributes":[],"body":[],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":352,"offset":351,"endLine":1,"endColumn":353,"endOffset":352}}],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":304,"offset":303,"endLine":1,"endColumn":308,"endOffset":307}}],"otherwiseBody":[{"kind":"literalElement","name":"plain","attributes":[],"body":[],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":384,"offset":383,"endLine":1,"endColumn":385,"endOffset":384}}],"otherwiseLocation":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":369,"offset":368,"endLine":1,"endColumn":370,"endOffset":369},"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":276,"offset":275,"endLine":1,"endColumn":277,"endOffset":276}}],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":237,"offset":236,"endLine":1,"endColumn":238,"endOffset":237}}],"location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":202,"offset":201,"endLine":1,"endColumn":203,"endOffset":202}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-relative-for-each-choose-multi-when.xsl", digest: "9a87813c" } as const;

/** match="/" (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="item" (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"item","location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}))
) +
    (
  /** literal details (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-relative-for-each-choose-multi-when.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}).map((currentNode) => (
  /** xsl:choose (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (
  /** literal flagged (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
)
) : (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** xsl:when (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (
  /** literal vip (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<vip" + "" + ">" + body + "</vip>";
})()
)
) : (
  /** xsl:otherwise (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
  (
  /** literal plain (apply-templates-relative-for-each-choose-multi-when.xsl:1) */
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
//# sourceMappingURL=apply-templates-relative-for-each-choose-multi-when.xsl.map
