import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.1","xsltVersion":"3.0","location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"items","attributes":[],"body":[{"kind":"applyTemplates","withParams":[],"modes":[],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":111,"offset":110,"endLine":1,"endColumn":112,"endOffset":111}}],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]},{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"section","span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}},"predicates":[],"span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":14,"end":18,"line":1,"column":15,"endLine":1,"endColumn":19}},"predicates":[],"span":{"start":14,"end":18,"line":1,"column":15,"endLine":1,"endColumn":19}}],"span":{"start":0,"end":18,"line":1,"column":1,"endLine":1,"endColumn":19}},"matchText":"/root/section/item","location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":225,"offset":224,"endLine":1,"endColumn":229,"endOffset":228}},{"kind":"literalElement","name":"details","attributes":[],"body":[{"kind":"forEach","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"detail","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"selectText":"detail","body":[{"kind":"choose","whenBranches":[{"test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"marker","span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"predicates":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}}],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"testText":"marker","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":327,"offset":326,"endLine":1,"endColumn":328,"endOffset":327}}],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":299,"offset":298,"endLine":1,"endColumn":303,"endOffset":302}}],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":299,"offset":298,"endLine":1,"endColumn":303,"endOffset":302}}],"otherwiseBody":[{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"vip","span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"predicates":[],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}}],"span":{"start":0,"end":3,"line":1,"column":1,"endLine":1,"endColumn":4}},"testText":"vip","body":[{"kind":"literalElement","name":"vip","attributes":[],"body":[],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":391,"offset":390,"endLine":1,"endColumn":392,"endOffset":391}}],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":299,"offset":298,"endLine":1,"endColumn":303,"endOffset":302}}],"otherwiseLocation":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":357,"offset":356,"endLine":1,"endColumn":358,"endOffset":357},"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":271,"offset":270,"endLine":1,"endColumn":272,"endOffset":271}}],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":225,"offset":224,"endLine":1,"endColumn":229,"endOffset":228}}],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":232,"offset":231,"endLine":1,"endColumn":233,"endOffset":232}}],"location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":197,"offset":196,"endLine":1,"endColumn":198,"endOffset":197}}]}]} satisfies StylesheetIR;

export const source = { path: "apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl", digest: "2042f366" } as const;

/** match="/" (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal items (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) => (
  /** match="/root/section/item" (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"/root/section/item","location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":225,"offset":224,"endLine":1,"endColumn":229,"endOffset":228}}))
) +
    (
  /** literal details (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["detail"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":225,"offset":224,"endLine":1,"endColumn":229,"endOffset":228}}).map((currentNode) => (
  /** xsl:choose (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["marker"]) ? (
  /** literal flagged (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
) : "")
)
) : (
  /** xsl:otherwise (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** literal vip (apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl:1) */
  (() => {
  const body = "";
  return "<vip" + "" + ">" + body + "</vip>";
})()
) : "")
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
), true, ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl","line":1,"column":111,"offset":110,"endLine":1,"endColumn":112,"endOffset":111}})
);
  return "<items" + "" + ">" + body + "</items>";
})()
),
    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),
  });
}

export default { source, transform };
//# sourceMappingURL=apply-templates-absolute-nested-match-default-for-each-choose-nested-if.xsl.map
