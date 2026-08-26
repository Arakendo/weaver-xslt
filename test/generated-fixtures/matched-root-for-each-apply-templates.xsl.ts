import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathNode, selectSimplePathNodes, selectSimplePathNodesByStepPlan, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.2","xsltVersion":"3.0","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}}],"span":{"start":0,"end":5,"line":1,"column":1,"endLine":1,"endColumn":6}},"matchText":"/root","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":106,"endOffset":105},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"item","body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140},"selectText":"detail","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}}],"location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":178,"offset":177,"endLine":1,"endColumn":179,"endOffset":178}}],"location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":143,"offset":142,"endLine":1,"endColumn":144,"endOffset":143}}],"location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}],"location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":108,"offset":107,"endLine":1,"endColumn":109,"endOffset":108}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"matchText":"detail","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":106,"endOffset":105},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"detail","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"contextItem","span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"selectText":".","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}],"location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":309,"offset":308,"endLine":1,"endColumn":310,"endOffset":309}}]}]} satisfies StylesheetIR;

export const source = { path: "matched-root-for-each-apply-templates.xsl", digest: "b2b31d1f" } as const;

/** match="/root" (matched-root-for-each-apply-templates.xsl:1) */
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
  traceTemplateEnter(currentNode, ctx, {"match":"/root","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":106,"endOffset":105}});
  return finish({
    output:
      (
  /** literal items (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (matched-root-for-each-apply-templates.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(currentNode, ["item"]), ctx, {"kind":"xsl:for-each","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}).map((currentNode) => (
  /** literal item (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (matched-root-for-each-apply-templates.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}))
) +
    (
  /** literal details (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (matched-root-for-each-apply-templates.xsl:1) */
  traceSelectedNodes(selectSimplePathNodesByStepPlan(currentNode, [{"name":"detail"}]), ctx, {"kind":"xsl:apply-templates","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}).map((templateNode, templateIndex, templateNodes) => (
  /** match="detail" (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"detail","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":106,"endOffset":105}});
  return (
  /** literal detail (matched-root-for-each-apply-templates.xsl:1) */
  (() => {
  const body = escapeText(traceStringValueOfNode(templateNode, ctx, {"kind":"xsl:value-of","location":{"source":"matched-root-for-each-apply-templates.xsl","line":1,"column":137,"offset":136,"endLine":1,"endColumn":141,"endOffset":140}}));
  return "<detail" + "" + ">" + body + "</detail>";
})()
);
})()
)).join("")
);
  return "<details" + "" + ">" + body + "</details>";
})()
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
//# sourceMappingURL=matched-root-for-each-apply-templates.xsl.map
