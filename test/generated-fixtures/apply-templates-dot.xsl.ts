import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.1","xsltVersion":"3.0","location":{"source":"apply-templates-dot.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-dot.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-dot.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149},"selectText":"/root/item","select":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}}}],"location":{"source":"apply-templates-dot.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"matchText":"item","location":{"source":"apply-templates-dot.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"contextItem","span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"selectText":".","location":{"source":"apply-templates-dot.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}],"location":{"source":"apply-templates-dot.xsl","line":1,"column":203,"offset":202,"endLine":1,"endColumn":204,"endOffset":203}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-dot.xsl", digest: "d69dbbc5" } as const;

/** match="/" (apply-templates-dot.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-dot.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-dot.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-dot.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(document, [{"name":"root"},{"name":"item"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-dot.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="item" (apply-templates-dot.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"item","location":{"source":"apply-templates-dot.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-dot.xsl:1) */
  (() => {
  const body = escapeText(traceStringValueOfNode(templateNode, ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-dot.xsl","line":1,"column":140,"offset":139,"endLine":1,"endColumn":150,"endOffset":149}}));
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
//# sourceMappingURL=apply-templates-dot.xsl.map
