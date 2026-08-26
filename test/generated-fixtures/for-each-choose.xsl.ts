import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.3","xsltVersion":"3.0","location":{"source":"for-each-choose.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}},"selectText":"/root/item","body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"for-each-choose.xsl","line":1,"column":133,"offset":132,"endLine":1,"endColumn":143,"endOffset":142}},{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"for-each-choose.xsl","line":1,"column":214,"offset":213,"endLine":1,"endColumn":215,"endOffset":214}}],"location":{"source":"for-each-choose.xsl","line":1,"column":208,"offset":207,"endLine":1,"endColumn":212,"endOffset":211}}],"otherwiseBody":[{"kind":"literalElement","name":"plain","attributes":[],"body":[],"location":{"source":"for-each-choose.xsl","line":1,"column":250,"offset":249,"endLine":1,"endColumn":251,"endOffset":250}}],"otherwiseLocation":{"source":"for-each-choose.xsl","line":1,"column":235,"offset":234,"endLine":1,"endColumn":236,"endOffset":235},"location":{"source":"for-each-choose.xsl","line":1,"column":180,"offset":179,"endLine":1,"endColumn":181,"endOffset":180}}],"location":{"source":"for-each-choose.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":146,"endOffset":145}}],"location":{"source":"for-each-choose.xsl","line":1,"column":133,"offset":132,"endLine":1,"endColumn":143,"endOffset":142}}],"location":{"source":"for-each-choose.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]}]} satisfies StylesheetIR;

export const source = { path: "for-each-choose.xsl", digest: "a4b81805" } as const;

/** match="/" (for-each-choose.xsl:1) */
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
  const currentNode = document;
  traceFocusEnter(currentNode, ctx);
  traceTemplateEnter(currentNode, ctx, {"match":"/","location":{"source":"for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (for-each-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (for-each-choose.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(document, ["root","item"]), ctx, {"kind":"xsl:for-each","location":{"source":"for-each-choose.xsl","line":1,"column":133,"offset":132,"endLine":1,"endColumn":143,"endOffset":142}}).map((currentNode) => (
  /** literal item (for-each-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (for-each-choose.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"for-each-choose.xsl","line":1,"column":133,"offset":132,"endLine":1,"endColumn":143,"endOffset":142}}))
) +
    (
  /** xsl:choose (for-each-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (for-each-choose.xsl:1) */
  (
  /** literal flagged (for-each-choose.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
)
) : (
  /** xsl:otherwise (for-each-choose.xsl:1) */
  (
  /** literal plain (for-each-choose.xsl:1) */
  (() => {
  const body = "";
  return "<plain" + "" + ">" + body + "</plain>";
})()
)
))
);
  return "<item" + "" + ">" + body + "</item>";
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
//# sourceMappingURL=for-each-choose.xsl.map
