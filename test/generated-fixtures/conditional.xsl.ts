import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.4","xsltVersion":"3.0","location":{"source":"conditional.xsl","line":1,"column":1,"offset":0,"endLine":1,"endColumn":2,"endOffset":1},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"conditional.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"out","attributes":[],"body":[{"kind":"if","test":{"kind":"binary","operator":"=","left":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}},"right":{"kind":"string","lexeme":"'world'","value":"world","span":{"start":13,"end":20,"line":1,"column":14,"endLine":1,"endColumn":21}},"span":{"start":0,"end":20,"line":1,"column":1,"endLine":1,"endColumn":21}},"testText":"/root/name = 'world'","body":[{"kind":"literalElement","name":"yes","attributes":[],"body":[],"location":{"source":"conditional.xsl","line":1,"column":155,"offset":154,"endLine":1,"endColumn":156,"endOffset":155}}],"location":{"source":"conditional.xsl","line":1,"column":123,"offset":122,"endLine":1,"endColumn":153,"endOffset":152}},{"kind":"choose","whenBranches":[{"test":{"kind":"binary","operator":"=","left":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"role","span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}},"predicates":[],"span":{"start":6,"end":10,"line":1,"column":7,"endLine":1,"endColumn":11}}],"span":{"start":0,"end":10,"line":1,"column":1,"endLine":1,"endColumn":11}},"right":{"kind":"string","lexeme":"'admin'","value":"admin","span":{"start":13,"end":20,"line":1,"column":14,"endLine":1,"endColumn":21}},"span":{"start":0,"end":20,"line":1,"column":1,"endLine":1,"endColumn":21}},"testText":"/root/role = 'admin'","body":[{"kind":"literalElement","name":"role","attributes":[],"body":[{"kind":"literalText","text":"admin","location":{"source":"conditional.xsl","line":1,"column":236,"offset":235,"endLine":1,"endColumn":237,"endOffset":236}}],"location":{"source":"conditional.xsl","line":1,"column":230,"offset":229,"endLine":1,"endColumn":231,"endOffset":230}}],"location":{"source":"conditional.xsl","line":1,"column":123,"offset":122,"endLine":1,"endColumn":153,"endOffset":152}}],"otherwiseBody":[{"kind":"literalElement","name":"role","attributes":[],"body":[{"kind":"literalText","text":"user","location":{"source":"conditional.xsl","line":1,"column":280,"offset":279,"endLine":1,"endColumn":281,"endOffset":280}}],"location":{"source":"conditional.xsl","line":1,"column":274,"offset":273,"endLine":1,"endColumn":275,"endOffset":274}}],"otherwiseLocation":{"source":"conditional.xsl","line":1,"column":259,"offset":258,"endLine":1,"endColumn":260,"endOffset":259},"location":{"source":"conditional.xsl","line":1,"column":170,"offset":169,"endLine":1,"endColumn":171,"endOffset":170}}],"location":{"source":"conditional.xsl","line":1,"column":104,"offset":103,"endLine":1,"endColumn":105,"endOffset":104}}]}]} satisfies StylesheetIR;

export const source = { path: "conditional.xsl", digest: "8ff84c60" } as const;

/** match="/" (conditional.xsl:1) */
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
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"conditional.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return finish({
    output:
      (
  /** literal out (conditional.xsl:1) */
  (() => {
  const body = (
  /** xsl:if (conditional.xsl:1) */
  ((selectSimplePathText(document, ["root","name"]) === "world") ? (
  /** literal yes (conditional.xsl:1) */
  (() => {
  const body = "";
  return "<yes" + "" + ">" + body + "</yes>";
})()
) : "")
) +
    (
  /** xsl:choose (conditional.xsl:1) */
  ((selectSimplePathText(document, ["root","role"]) === "admin") ? (
  /** xsl:when (conditional.xsl:1) */
  (
  /** literal role (conditional.xsl:1) */
  (() => {
  const body = "admin";
  return "<role" + "" + ">" + body + "</role>";
})()
)
) : (
  /** xsl:otherwise (conditional.xsl:1) */
  (
  /** literal role (conditional.xsl:1) */
  (() => {
  const body = "user";
  return "<role" + "" + ">" + body + "</role>";
})()
)
))
);
  return "<out" + "" + ">" + body + "</out>";
})()
),
    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),
  });
}

export default { source, transform };
//# sourceMappingURL=conditional.xsl.map
