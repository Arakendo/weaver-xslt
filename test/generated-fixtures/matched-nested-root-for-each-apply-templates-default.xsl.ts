import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.0","xsltVersion":"3.0","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"section","span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}},"predicates":[],"span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}}],"span":{"start":0,"end":13,"line":1,"column":1,"endLine":1,"endColumn":14}},"matchText":"/root/section","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":114,"endOffset":113},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"item","body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":195,"offset":194,"endLine":1,"endColumn":196,"endOffset":195}}],"location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":186,"offset":185,"endLine":1,"endColumn":187,"endOffset":186}}],"location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":151,"offset":150,"endLine":1,"endColumn":152,"endOffset":151}}],"location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}}],"location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":116,"offset":115,"endLine":1,"endColumn":117,"endOffset":116}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"matchText":"detail","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":114,"endOffset":113},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"detail","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"contextItem","span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"selectText":".","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}}],"location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":301,"offset":300,"endLine":1,"endColumn":302,"endOffset":301}}]}]} satisfies StylesheetIR;

export const source = { path: "matched-nested-root-for-each-apply-templates-default.xsl", digest: "3e086e77" } as const;

/** match="/root/section" (matched-nested-root-for-each-apply-templates-default.xsl:1) */
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
  traceTemplateEnter(currentNode, ctx, {"match":"/root/section","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":114,"endOffset":113}});
  return finish({
    output:
      (
  /** literal items (matched-nested-root-for-each-apply-templates-default.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (matched-nested-root-for-each-apply-templates-default.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(currentNode, ["item"]), ctx, {"kind":"xsl:for-each","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}}).map((currentNode) => (
  /** literal item (matched-nested-root-for-each-apply-templates-default.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (matched-nested-root-for-each-apply-templates-default.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}}))
) +
    (
  /** literal details (matched-nested-root-for-each-apply-templates-default.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (matched-nested-root-for-each-apply-templates-default.xsl:1) */
  applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode, templateIndex, templateNodes) => (
  /** match="detail" (matched-nested-root-for-each-apply-templates-default.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"detail","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":114,"endOffset":113}});
  return (
  /** literal detail (matched-nested-root-for-each-apply-templates-default.xsl:1) */
  (() => {
  const body = escapeText(traceStringValueOfNode(templateNode, ctx, {"kind":"xsl:value-of","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":145,"offset":144,"endLine":1,"endColumn":149,"endOffset":148}}));
  return "<detail" + "" + ">" + body + "</detail>";
})()
);
})()
), false, ctx, {"kind":"xsl:apply-templates","location":{"source":"matched-nested-root-for-each-apply-templates-default.xsl","line":1,"column":195,"offset":194,"endLine":1,"endColumn":196,"endOffset":195}})
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
//# sourceMappingURL=matched-nested-root-for-each-apply-templates-default.xsl.map
