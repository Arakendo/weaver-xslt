import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.0","xsltVersion":"3.0","location":{"source":"matched-nested-root.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"section","span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}},"predicates":[],"span":{"start":6,"end":13,"line":1,"column":7,"endLine":1,"endColumn":14}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"item","span":{"start":14,"end":18,"line":1,"column":15,"endLine":1,"endColumn":19}},"predicates":[],"span":{"start":14,"end":18,"line":1,"column":15,"endLine":1,"endColumn":19}}],"span":{"start":0,"end":18,"line":1,"column":1,"endLine":1,"endColumn":19}},"matchText":"/root/section/item","location":{"source":"matched-nested-root.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":119,"endOffset":118},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"item","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"matched-nested-root.xsl","line":1,"column":149,"offset":148,"endLine":1,"endColumn":153,"endOffset":152}},{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"matched-nested-root.xsl","line":1,"column":176,"offset":175,"endLine":1,"endColumn":177,"endOffset":176}}],"location":{"source":"matched-nested-root.xsl","line":1,"column":170,"offset":169,"endLine":1,"endColumn":174,"endOffset":173}}],"location":{"source":"matched-nested-root.xsl","line":1,"column":121,"offset":120,"endLine":1,"endColumn":122,"endOffset":121}}]}]} satisfies StylesheetIR;

export const source = { path: "matched-nested-root.xsl", digest: "a393a704" } as const;

/** match="/root/section/item" (matched-nested-root.xsl:1) */
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
  const currentNode = selectSimplePathNode(document, ["root","section","item"]);
  if (currentNode === null) {
    return finish({ output: "" });
  }
  traceFocusEnter(currentNode, ctx);
  traceTemplateEnter(currentNode, ctx, {"match":"/root/section/item","location":{"source":"matched-nested-root.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":119,"endOffset":118}});
  return finish({
    output:
      (
  /** literal item (matched-nested-root.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (matched-nested-root.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"matched-nested-root.xsl","line":1,"column":149,"offset":148,"endLine":1,"endColumn":153,"endOffset":152}}))
) +
    (
  /** xsl:if (matched-nested-root.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** literal flagged (matched-nested-root.xsl:1) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
})()
) : "")
);
  return "<item" + "" + ">" + body + "</item>";
})()
),
    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),
  });
}

export default { source, transform };
//# sourceMappingURL=matched-nested-root.xsl.map
