import { throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, traceFocusEnter, traceTemplateEnter, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "relative.xsl", digest: "9edf8c88" } as const;

/** match="/" (relative.xsl:3) */
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
  const currentNode = document;
  traceFocusEnter(currentNode, ctx);
  traceTemplateEnter(currentNode, ctx, {"match":"/","location":{"source":"relative.xsl","line":3,"column":30,"offset":116,"endLine":3,"endColumn":31,"endOffset":117}});
  return {
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
  };
}

export default { source, transform };
//# sourceMappingURL=relative.xsl.map
