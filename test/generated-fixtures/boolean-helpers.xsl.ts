import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, selectSimplePathExists } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.4","xsltVersion":"3.0","location":{"source":"boolean-helpers.xsl","line":2,"column":7,"offset":7,"endLine":2,"endColumn":8,"endOffset":8},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"boolean-helpers.xsl","line":3,"column":30,"offset":116,"endLine":3,"endColumn":31,"endOffset":117},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"out","attributes":[],"body":[{"kind":"if","test":{"kind":"functionCall","callee":"not","arguments":[{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":4,"end":8,"line":1,"column":5,"endLine":1,"endColumn":9}},"predicates":[],"span":{"start":4,"end":8,"line":1,"column":5,"endLine":1,"endColumn":9}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":9,"end":13,"line":1,"column":10,"endLine":1,"endColumn":14}},"predicates":[],"span":{"start":9,"end":13,"line":1,"column":10,"endLine":1,"endColumn":14}}],"span":{"start":4,"end":13,"line":1,"column":5,"endLine":1,"endColumn":14}}],"span":{"start":0,"end":14,"line":1,"column":1,"endLine":1,"endColumn":15}},"testText":"not(root/flag)","body":[{"kind":"literalElement","name":"missing","attributes":[],"body":[],"location":{"source":"boolean-helpers.xsl","line":5,"column":43,"offset":178,"endLine":5,"endColumn":44,"endOffset":179}}],"location":{"source":"boolean-helpers.xsl","line":5,"column":27,"offset":162,"endLine":5,"endColumn":41,"endOffset":176}},{"kind":"if","test":{"kind":"functionCall","callee":"true","arguments":[],"span":{"start":0,"end":6,"line":1,"column":1,"endLine":1,"endColumn":7}},"testText":"true()","body":[{"kind":"literalElement","name":"always","attributes":[],"body":[],"location":{"source":"boolean-helpers.xsl","line":6,"column":35,"offset":232,"endLine":6,"endColumn":36,"endOffset":233}}],"location":{"source":"boolean-helpers.xsl","line":6,"column":27,"offset":224,"endLine":6,"endColumn":33,"endOffset":230}},{"kind":"if","test":{"kind":"functionCall","callee":"false","arguments":[],"span":{"start":0,"end":7,"line":1,"column":1,"endLine":1,"endColumn":8}},"testText":"false()","body":[{"kind":"literalElement","name":"never","attributes":[],"body":[],"location":{"source":"boolean-helpers.xsl","line":7,"column":36,"offset":286,"endLine":7,"endColumn":37,"endOffset":287}}],"location":{"source":"boolean-helpers.xsl","line":7,"column":27,"offset":277,"endLine":7,"endColumn":34,"endOffset":284}}],"location":{"source":"boolean-helpers.xsl","line":4,"column":11,"offset":130,"endLine":4,"endColumn":12,"endOffset":131}}]}]} satisfies StylesheetIR;

export const source = { path: "boolean-helpers.xsl", digest: "1b5a2d3c" } as const;

/** match="/" (boolean-helpers.xsl:3) */
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
  const currentNode = document;
  traceFocusEnter(currentNode, ctx);
  traceTemplateEnter(currentNode, ctx, {"match":"/","location":{"source":"boolean-helpers.xsl","line":3,"column":30,"offset":116,"endLine":3,"endColumn":31,"endOffset":117}});
  return finish({
    output:
      (
  /** literal out (boolean-helpers.xsl:4) */
  (() => {
  const body = (
  /** xsl:if (boolean-helpers.xsl:5) */
  ((!selectSimplePathExists(currentNode, ["root","flag"])) ? (
  /** literal missing (boolean-helpers.xsl:5) */
  (() => {
  const body = "";
  return "<missing" + "" + ">" + body + "</missing>";
})()
) : "")
) +
    (
  /** xsl:if (boolean-helpers.xsl:6) */
  (true ? (
  /** literal always (boolean-helpers.xsl:6) */
  (() => {
  const body = "";
  return "<always" + "" + ">" + body + "</always>";
})()
) : "")
) +
    (
  /** xsl:if (boolean-helpers.xsl:7) */
  (false ? (
  /** literal never (boolean-helpers.xsl:7) */
  (() => {
  const body = "";
  return "<never" + "" + ">" + body + "</never>";
})()
) : "")
);
  return "<out" + "" + ">" + body + "</out>";
})()
),
    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),
  });
}

export default { source, transform };
//# sourceMappingURL=boolean-helpers.xsl.map
