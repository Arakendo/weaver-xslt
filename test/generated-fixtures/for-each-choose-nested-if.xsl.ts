import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.4","xsltVersion":"3.0","location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}},"selectText":"/root/item","body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":133,"offset":132,"endLine":1,"endColumn":143,"endOffset":142}},{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"testText":"detail","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":236,"offset":235,"endLine":1,"endColumn":237,"endOffset":236}}],"location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":208,"offset":207,"endLine":1,"endColumn":212,"endOffset":211}}],"location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":208,"offset":207,"endLine":1,"endColumn":212,"endOffset":211}}],"otherwiseBody":[{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"vip","span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"predicates":[],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}}],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"testText":"vip","body":[{"kind":"literalElement","name":"vip","attributes":[],"body":[],"location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":300,"offset":299,"endLine":1,"endColumn":301,"endOffset":300}}],"location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":208,"offset":207,"endLine":1,"endColumn":212,"endOffset":211}}],"otherwiseLocation":{"source":"for-each-choose-nested-if.xsl","line":1,"column":266,"offset":265,"endLine":1,"endColumn":267,"endOffset":266},"location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":180,"offset":179,"endLine":1,"endColumn":181,"endOffset":180}}],"location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":146,"endOffset":145}}],"location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":133,"offset":132,"endLine":1,"endColumn":143,"endOffset":142}}],"location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]}]} satisfies StylesheetIR;

export const source = { path: "for-each-choose-nested-if.xsl", digest: "9887b70c" } as const;

/** match="/" (for-each-choose-nested-if.xsl:1) */
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
  traceTemplateEnter(currentNode, ctx, {"match":"/","location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (for-each-choose-nested-if.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(document, ["root","item"]), ctx, {"kind":"xsl:for-each","location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":133,"offset":132,"endLine":1,"endColumn":143,"endOffset":142}}).map((currentNode) => (
  /** literal item (for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (for-each-choose-nested-if.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"for-each-choose-nested-if.xsl","line":1,"column":133,"offset":132,"endLine":1,"endColumn":143,"endOffset":142}}))
) +
    (
  /** xsl:choose (for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["detail"]) ? (
  /** literal flagged (for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
) : "")
)
) : (
  /** xsl:otherwise (for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** literal vip (for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = "";
  return "<vip" + "" + ">" + body + "</vip>";
})()
) : "")
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
//# sourceMappingURL=for-each-choose-nested-if.xsl.map
