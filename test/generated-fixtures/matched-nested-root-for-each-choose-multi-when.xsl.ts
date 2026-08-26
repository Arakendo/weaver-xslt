import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.0","xsltVersion":"3.0","location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"section","span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}},"predicates":[],"span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}}],"span":{"start":0,"end":13,"line":1,"column":1,"endLine":1,"endColumn":14}},"matchText":"/root/section","location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":114,"endOffset":113},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"item","body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}},{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":220,"offset":219,"endLine":1,"endColumn":221,"endOffset":220}}],"location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":214,"offset":213,"endLine":1,"endColumn":218,"endOffset":217}},{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"vip","span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"predicates":[],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}}],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"testText":"vip","body":[{"kind":"literalElement","name":"vip","attributes":[],"body":[],"location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":262,"offset":261,"endLine":1,"endColumn":263,"endOffset":262}}],"location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":214,"offset":213,"endLine":1,"endColumn":218,"endOffset":217}}],"otherwiseBody":[{"kind":"literalElement","name":"plain","attributes":[],"body":[],"location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":294,"offset":293,"endLine":1,"endColumn":295,"endOffset":294}}],"otherwiseLocation":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":279,"offset":278,"endLine":1,"endColumn":280,"endOffset":279},"location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":186,"offset":185,"endLine":1,"endColumn":187,"endOffset":186}}],"location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":151,"offset":150,"endLine":1,"endColumn":152,"endOffset":151}}],"location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}}],"location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":116,"offset":115,"endLine":1,"endColumn":117,"endOffset":116}}]}]} satisfies StylesheetIR;

export const source = { path: "matched-nested-root-for-each-choose-multi-when.xsl", digest: "e2973792" } as const;

/** match="/root/section" (matched-nested-root-for-each-choose-multi-when.xsl:1) */
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
  const currentNode = selectSimplePathNode(document, ["root","section"]);
  if (currentNode === null) {
    return finish({ output: "" });
  }
  traceFocusEnter(currentNode, ctx);
  traceTemplateEnter(currentNode, ctx, {"match":"/root/section","location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":114,"endOffset":113}});
  return finish({
    output:
      (
  /** literal items (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(currentNode, ["item"]), ctx, {"kind":"xsl:for-each","location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}}).map((currentNode) => (
  /** literal item (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"matched-nested-root-for-each-choose-multi-when.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}}))
) +
    (
  /** xsl:choose (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  (
  /** literal flagged (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
)
) : (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** xsl:when (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  (
  /** literal vip (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<vip" + "" + ">" + body + "</vip>";
})()
)
) : (
  /** xsl:otherwise (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  (
  /** literal plain (matched-nested-root-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<plain" + "" + ">" + body + "</plain>";
})()
)
)))
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
//# sourceMappingURL=matched-nested-root-for-each-choose-multi-when.xsl.map
