import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathNode, selectSimplePathNodes, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.0","xsltVersion":"3.0","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148},"selectText":"root/item","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}},"predicates":[],"span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}}],"span":{"start":0,"end":9,"line":1,"column":1,"endLine":1,"endColumn":10}}}],"location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"matchText":"item","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"group","span":{"start":0,"end":5,"line":1,"column":1,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":0,"end":5,"line":1,"column":1,"endLine":1,"endColumn":6}}],"span":{"start":0,"end":5,"line":1,"column":1,"endLine":1,"endColumn":6}},"selectText":"group","body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148},"selectText":"detail","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}}],"location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}],"location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":237,"offset":236,"endLine":1,"endColumn":238,"endOffset":237}}],"location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":202,"offset":201,"endLine":1,"endColumn":203,"endOffset":202}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"matchText":"detail","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"detail","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"contextItem","span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"selectText":".","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}],"location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":389,"offset":388,"endLine":1,"endColumn":390,"endOffset":389}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-relative-for-each-apply-templates.xsl", digest: "696d425e" } as const;

/** match="/" (apply-templates-relative-for-each-apply-templates.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-relative-for-each-apply-templates.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-relative-for-each-apply-templates.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="item" (apply-templates-relative-for-each-apply-templates.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"item","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-relative-for-each-apply-templates.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-relative-for-each-apply-templates.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}))
) +
    (
  /** literal details (apply-templates-relative-for-each-apply-templates.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-relative-for-each-apply-templates.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["group"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}).map((currentNode) => (
  /** xsl:apply-templates (apply-templates-relative-for-each-apply-templates.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(currentNode, [{"name":"detail"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="detail" (apply-templates-relative-for-each-apply-templates.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"detail","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal detail (apply-templates-relative-for-each-apply-templates.xsl:1) */
  (() => {
  const body = escapeText(traceStringValueOfNode(templateNode, ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-relative-for-each-apply-templates.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":149,"endOffset":148}}));
  return "<detail" + "" + ">" + body + "</detail>";
})()
);
})()
)).join("")
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
//# sourceMappingURL=apply-templates-relative-for-each-apply-templates.xsl.map
