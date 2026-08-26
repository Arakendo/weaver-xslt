import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.0","xsltVersion":"3.0","location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":111,"offset":110,"endLine":1,"endColumn":112,"endOffset":111}}],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}},"matchText":"/root/item","location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":217,"offset":216,"endLine":1,"endColumn":221,"endOffset":220}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"selectText":"detail","body":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":297,"offset":296,"endLine":1,"endColumn":298,"endOffset":297}}],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":291,"offset":290,"endLine":1,"endColumn":295,"endOffset":294}},{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"vip","span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"predicates":[],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}}],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"testText":"vip","body":[{"kind":"literalElement","name":"vip","attributes":[],"body":[],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":339,"offset":338,"endLine":1,"endColumn":340,"endOffset":339}}],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":291,"offset":290,"endLine":1,"endColumn":295,"endOffset":294}}],"otherwiseBody":[{"kind":"literalElement","name":"plain","attributes":[],"body":[],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":371,"offset":370,"endLine":1,"endColumn":372,"endOffset":371}}],"otherwiseLocation":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":356,"offset":355,"endLine":1,"endColumn":357,"endOffset":356},"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":263,"offset":262,"endLine":1,"endColumn":264,"endOffset":263}}],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":217,"offset":216,"endLine":1,"endColumn":221,"endOffset":220}}],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":224,"offset":223,"endLine":1,"endColumn":225,"endOffset":224}}],"location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":189,"offset":188,"endLine":1,"endColumn":190,"endOffset":189}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-absolute-match-default-for-each-choose-multi-when.xsl", digest: "425c79b3" } as const;

/** match="/" (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  applyBuiltInTemplatesByPath(document, ["root","item"], (templateNode, templateIndex, templateNodes) => (
  /** match="/root/item" (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"/root/item","location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":217,"offset":216,"endLine":1,"endColumn":221,"endOffset":220}}))
) +
    (
  /** literal details (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":217,"offset":216,"endLine":1,"endColumn":221,"endOffset":220}}).map((currentNode) => (
  /** xsl:choose (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (
  /** literal flagged (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
)
) : (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** xsl:when (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (
  /** literal vip (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<vip" + "" + ">" + body + "</vip>";
})()
)
) : (
  /** xsl:otherwise (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (
  /** literal plain (apply-templates-absolute-match-default-for-each-choose-multi-when.xsl:1) */
  (() => {
  const body = "";
  return "<plain" + "" + ">" + body + "</plain>";
})()
)
)))
)).join("")
);
  return "<details" + "" + ">" + body + "</details>";
})()
);
  return "<item" + "" + ">" + body + "</item>";
})()
);
})()
), true, ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-absolute-match-default-for-each-choose-multi-when.xsl","line":1,"column":111,"offset":110,"endLine":1,"endColumn":112,"endOffset":111}})
);
  return "<items" + "" + ">" + body + "</items>";
})()
),
    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),
  });
}

export default { source, transform };
//# sourceMappingURL=apply-templates-absolute-match-default-for-each-choose-multi-when.xsl.map
