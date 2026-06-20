import { throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-root.xsl", digest: "3daffecc" } as const;

/** match="/root" (matched-root.xsl:3) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  ctx = ctx.baseUri === undefined ? { ...ctx, baseUri: source.path } : ctx;
  resetRecordedTracePause(ctx.trace);
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
    return { output: "" };
  }
  traceFocusEnter(currentNode, ctx);
  traceTemplateEnter(currentNode, ctx, {"match":"/root","location":{"source":"matched-root.xsl","line":3,"column":30,"offset":116,"endLine":3,"endColumn":35,"endOffset":121}});
  return {
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
  };
}

export default { source, transform };
//# sourceMappingURL=matched-root.xsl.map
