import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.3","xsltVersion":"3.0","location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":111,"offset":110,"endLine":1,"endColumn":112,"endOffset":111}}],"location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"section","span":{"start":0,"end":7,"line":1,"column":1,"endLine":1,"endColumn":8}},"predicates":[],"span":{"start":0,"end":7,"line":1,"column":1,"endLine":1,"endColumn":8}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":8,"end":12,"line":1,"column":9,"endLine":1,"endColumn":13}},"predicates":[],"span":{"start":8,"end":12,"line":1,"column":9,"endLine":1,"endColumn":13}}],"span":{"start":0,"end":12,"line":1,"column":1,"endLine":1,"endColumn":13}},"matchText":"section/item","location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":219,"offset":218,"endLine":1,"endColumn":223,"endOffset":222}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"selectText":"detail","body":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":299,"offset":298,"endLine":1,"endColumn":300,"endOffset":299}}],"location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":293,"offset":292,"endLine":1,"endColumn":297,"endOffset":296}}],"otherwiseBody":[{"kind":"literalElement","name":"plain","attributes":[],"body":[],"location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":335,"offset":334,"endLine":1,"endColumn":336,"endOffset":335}}],"otherwiseLocation":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":320,"offset":319,"endLine":1,"endColumn":321,"endOffset":320},"location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":265,"offset":264,"endLine":1,"endColumn":266,"endOffset":265}}],"location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":219,"offset":218,"endLine":1,"endColumn":223,"endOffset":222}}],"location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":226,"offset":225,"endLine":1,"endColumn":227,"endOffset":226}}],"location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":191,"offset":190,"endLine":1,"endColumn":192,"endOffset":191}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-nested-match-default-for-each-choose.xsl", digest: "78a8f2f8" } as const;

/** match="/" (apply-templates-nested-match-default-for-each-choose.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  applyBuiltInTemplatesByPath(document, ["section","item"], (templateNode, templateIndex, templateNodes) => (
  /** match="section/item" (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"section/item","location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":219,"offset":218,"endLine":1,"endColumn":223,"endOffset":222}}))
) +
    (
  /** literal details (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":219,"offset":218,"endLine":1,"endColumn":223,"endOffset":222}}).map((currentNode) => (
  /** xsl:choose (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  (
  /** literal flagged (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
)
) : (
  /** xsl:otherwise (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  (
  /** literal plain (apply-templates-nested-match-default-for-each-choose.xsl:1) */
  (() => {
  const body = "";
  return "<plain" + "" + ">" + body + "</plain>";
})()
)
))
)).join("")
);
  return "<details" + "" + ">" + body + "</details>";
})()
);
  return "<item" + "" + ">" + body + "</item>";
})()
);
})()
), false, ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-nested-match-default-for-each-choose.xsl","line":1,"column":111,"offset":110,"endLine":1,"endColumn":112,"endOffset":111}})
);
  return "<items" + "" + ">" + body + "</items>";
})()
),
    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),
  });
}

export default { source, transform };
//# sourceMappingURL=apply-templates-nested-match-default-for-each-choose.xsl.map
