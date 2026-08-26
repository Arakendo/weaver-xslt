import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.4","xsltVersion":"3.0","location":{"source":"relative.xsl","line":2,"column":7,"offset":7,"endLine":2,"endColumn":8,"endOffset":8},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[],"span":{"start":0,"end":1,"line":1,"column":1,"endLine":1,"endColumn":2}},"matchText":"/","location":{"source":"relative.xsl","line":3,"column":30,"offset":116,"endLine":3,"endColumn":31,"endOffset":117},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"out","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}},"predicates":[],"span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}}],"span":{"start":0,"end":9,"line":1,"column":1,"endLine":1,"endColumn":10}},"selectText":"root/name","location":{"source":"relative.xsl","line":5,"column":35,"offset":170,"endLine":5,"endColumn":44,"endOffset":179}},{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}},"predicates":[],"span":{"start":5,"end":9,"line":1,"column":6,"endLine":1,"endColumn":10}}],"span":{"start":0,"end":9,"line":1,"column":1,"endLine":1,"endColumn":10}},"testText":"root/flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"relative.xsl","line":6,"column":38,"offset":220,"endLine":6,"endColumn":39,"endOffset":221}}],"location":{"source":"relative.xsl","line":6,"column":27,"offset":209,"endLine":6,"endColumn":36,"endOffset":218}}],"location":{"source":"relative.xsl","line":4,"column":11,"offset":130,"endLine":4,"endColumn":12,"endOffset":131}}]}]} satisfies StylesheetIR;

export const source = { path: "relative.xsl", digest: "9edf8c88" } as const;

/** match="/" (relative.xsl:3) */
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
  traceTemplateEnter(currentNode, ctx, {"match":"/","location":{"source":"relative.xsl","line":3,"column":30,"offset":116,"endLine":3,"endColumn":31,"endOffset":117}});
  return finish({
    output:
      (
  /** literal out (relative.xsl:4) */
  (() => {
  const body = (
  /** xsl:value-of (relative.xsl:5) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["root","name"]), ctx, {"kind":"xsl:value-of","location":{"source":"relative.xsl","line":5,"column":35,"offset":170,"endLine":5,"endColumn":44,"endOffset":179}}))
) +
    (
  /** xsl:if (relative.xsl:6) */
  (selectSimplePathExists(currentNode, ["root","flag"]) ? (
  /** literal flagged (relative.xsl:6) */
  (() => {
  const body = "";
  return "<flagged" + "" + ">" + body + "</flagged>";
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
//# sourceMappingURL=relative.xsl.map
