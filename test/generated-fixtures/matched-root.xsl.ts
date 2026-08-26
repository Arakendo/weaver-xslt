import { appendCoverageWarnings, appendTraceSummary, throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, resetRecordedTraceSummary, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { StylesheetIR, TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

const stylesheet = {"version":"1.3","xsltVersion":"3.0","location":{"source":"matched-root.xsl","line":2,"column":7,"offset":7,"endLine":2,"endColumn":8,"endOffset":8},"namespaces":{"xsl":"http://www.w3.org/1999/XSL/Transform"},"defaultElementNamespace":"","globalBindings":[],"templates":[{"match":{"kind":"path","absolute":true,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"root","span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}},"predicates":[],"span":{"start":1,"end":5,"line":1,"column":2,"endLine":1,"endColumn":6}}],"span":{"start":0,"end":5,"line":1,"column":1,"endLine":1,"endColumn":6}},"matchText":"/root","location":{"source":"matched-root.xsl","line":3,"column":30,"offset":116,"endLine":3,"endColumn":35,"endOffset":121},"modes":[],"params":[],"body":[{"kind":"literalElement","name":"out","attributes":[],"body":[{"kind":"valueOf","select":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"name","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"selectText":"name","location":{"source":"matched-root.xsl","line":5,"column":35,"offset":174,"endLine":5,"endColumn":39,"endOffset":178}},{"kind":"if","test":{"kind":"path","absolute":false,"steps":[{"kind":"step","axis":"child","nodeTest":{"kind":"nameTest","name":"flag","span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"predicates":[],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}}],"span":{"start":0,"end":4,"line":1,"column":1,"endLine":1,"endColumn":5}},"testText":"flag","body":[{"kind":"literalElement","name":"flagged","attributes":[],"body":[],"location":{"source":"matched-root.xsl","line":6,"column":33,"offset":214,"endLine":6,"endColumn":34,"endOffset":215}}],"location":{"source":"matched-root.xsl","line":6,"column":27,"offset":208,"endLine":6,"endColumn":31,"endOffset":212}}],"location":{"source":"matched-root.xsl","line":4,"column":11,"offset":134,"endLine":4,"endColumn":12,"endOffset":135}}]}]} satisfies StylesheetIR;

export const source = { path: "matched-root.xsl", digest: "3daffecc" } as const;

/** match="/root" (matched-root.xsl:3) */
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
  traceTemplateEnter(currentNode, ctx, {"match":"/root","location":{"source":"matched-root.xsl","line":3,"column":30,"offset":116,"endLine":3,"endColumn":35,"endOffset":121}});
  return finish({
    output:
      (
  /** literal out (matched-root.xsl:4) */
  (() => {
  const body = (
  /** xsl:value-of (matched-root.xsl:5) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(currentNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"matched-root.xsl","line":5,"column":35,"offset":174,"endLine":5,"endColumn":39,"endOffset":178}}))
) +
    (
  /** xsl:if (matched-root.xsl:6) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** literal flagged (matched-root.xsl:6) */
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
//# sourceMappingURL=matched-root.xsl.map
