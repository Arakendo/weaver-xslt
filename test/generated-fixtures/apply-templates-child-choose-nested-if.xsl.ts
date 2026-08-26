import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.0","xsltVersion":"3.0","location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149},"selectText":"/root/item","select":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}}}],"location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"matchText":"item","location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}},{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"testText":"detail","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":294,"offset":293,"endLine":1,"endColumn":295,"endOffset":294}}],"location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":266,"offset":265,"endLine":1,"endColumn":270,"endOffset":269}}],"location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":266,"offset":265,"endLine":1,"endColumn":270,"endOffset":269}}],"otherwiseBody":[{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"vip","span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"predicates":[],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}}],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"testText":"vip","body":[{"kind":"literalElement","name":"vip","attributes":[],"body":[],"location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":358,"offset":357,"endLine":1,"endColumn":359,"endOffset":358}}],"location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":266,"offset":265,"endLine":1,"endColumn":270,"endOffset":269}}],"otherwiseLocation":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":324,"offset":323,"endLine":1,"endColumn":325,"endOffset":324},"location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":238,"offset":237,"endLine":1,"endColumn":239,"endOffset":238}}],"location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":203,"offset":202,"endLine":1,"endColumn":204,"endOffset":203}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-child-choose-nested-if.xsl", digest: "53eafda3" } as const;

/** match="/" (apply-templates-child-choose-nested-if.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-child-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-child-choose-nested-if.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="item" (apply-templates-child-choose-nested-if.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"item","location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-child-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-child-choose-nested-if.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-child-choose-nested-if.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}))
) +
    (
  /** xsl:choose (apply-templates-child-choose-nested-if.xsl:1) */
  (selectSimplePathExists(templateNode, ["flag"]) ? (
  /** xsl:when (apply-templates-child-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-child-choose-nested-if.xsl:1) */
  (selectSimplePathExists(templateNode, ["detail"]) ? (
  /** literal flagged (apply-templates-child-choose-nested-if.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
) : "")
)
) : (
  /** xsl:otherwise (apply-templates-child-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-child-choose-nested-if.xsl:1) */
  (selectSimplePathExists(templateNode, ["vip"]) ? (
  /** literal vip (apply-templates-child-choose-nested-if.xsl:1) */
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
//# sourceMappingURL=apply-templates-child-choose-nested-if.xsl.map
