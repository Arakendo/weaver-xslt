import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.2","xsltVersion":"3.0","location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}}],"span":{"start":0,"end":5,"line":1,"column":1,"endLine":1,"endColumn":6}},"matchText":"/root","location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":106,"endOffset":105},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"item","body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}},{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"testText":"detail","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":234,"offset":233,"endLine":1,"endColumn":235,"endOffset":234}}],"location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":206,"offset":205,"endLine":1,"endColumn":210,"endOffset":209}}],"location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":206,"offset":205,"endLine":1,"endColumn":210,"endOffset":209}}],"otherwiseBody":[{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"vip","span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"predicates":[],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}}],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"testText":"vip","body":[{"kind":"literalElement","name":"vip","attributes":[],"body":[],"location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":298,"offset":297,"endLine":1,"endColumn":299,"endOffset":298}}],"location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":206,"offset":205,"endLine":1,"endColumn":210,"endOffset":209}}],"otherwiseLocation":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":264,"offset":263,"endLine":1,"endColumn":265,"endOffset":264},"location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":178,"offset":177,"endLine":1,"endColumn":179,"endOffset":178}}],"location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":143,"offset":142,"endLine":1,"endColumn":144,"endOffset":143}}],"location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}],"location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":108,"offset":107,"endLine":1,"endColumn":109,"endOffset":108}}]}]} satisfies StylesheetIR;

export const source = { path: "matched-root-for-each-choose-nested-if.xsl", digest: "9b5cfc42" } as const;

/** match="/root" (matched-root-for-each-choose-nested-if.xsl:1) */
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
  const currentNode = selectSimplePathNode(document, ["root"]);
  if (currentNode === null) {
    return finish({ output: "" });
  }
  traceFocusEnter(currentNode, ctx);
  traceTemplateEnter(currentNode, ctx, {"match":"/root","location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":106,"endOffset":105}});
  return finish({
    output:
      (
  /** literal items (matched-root-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (matched-root-for-each-choose-nested-if.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(currentNode, ["item"]), ctx, {"kind":"xsl:for-each","location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}).map((currentNode) => (
  /** literal item (matched-root-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (matched-root-for-each-choose-nested-if.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"matched-root-for-each-choose-nested-if.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}))
) +
    (
  /** xsl:choose (matched-root-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (matched-root-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (matched-root-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["detail"]) ? (
  /** literal flagged (matched-root-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
) : "")
)
) : (
  /** xsl:otherwise (matched-root-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (matched-root-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** literal vip (matched-root-for-each-choose-nested-if.xsl:1) */
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
//# sourceMappingURL=matched-root-for-each-choose-nested-if.xsl.map
