import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.3","xsltVersion":"3.0","location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148},"selectText":"root/item","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}},"predicates":[],"span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}}],"span":{"start":0,"end":9,"line":1,"column":1,"endLine":1,"endColumn":10}}}],"location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}},"matchText":"/root/item","location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"selectText":"detail","body":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":316,"offset":315,"endLine":1,"endColumn":317,"endOffset":316}}],"location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":310,"offset":309,"endLine":1,"endColumn":314,"endOffset":313}}],"location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":282,"offset":281,"endLine":1,"endColumn":283,"endOffset":282}}],"location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}],"location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":243,"offset":242,"endLine":1,"endColumn":244,"endOffset":243}}],"location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":208,"offset":207,"endLine":1,"endColumn":209,"endOffset":208}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl", digest: "9d931fcb" } as const;

/** match="/" (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="/root/item" (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"/root/item","location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}))
) +
    (
  /** literal details (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}).map((currentNode) => (
  /** xsl:choose (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (
  /** literal flagged (apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
)
) : "")
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
//# sourceMappingURL=apply-templates-relative-absolute-match-for-each-choose-no-otherwise.xsl.map
