import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "relative.xsl", digest: "9edf8c88" } as const;

/** match="/" (relative.xsl:3) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = document;
  return {
    output:
      (
  /** literal out (relative.xsl:4) */
  "<out>" +
    (
  /** xsl:value-of (relative.xsl:5) */
  escapeText(selectSimplePathText(currentNode, ["root","name"]))
) +
    (
  /** xsl:if (relative.xsl:6) */
  (selectSimplePathExists(currentNode, ["root","flag"]) ? (
  /** literal flagged (relative.xsl:6) */
  "<flagged>" +
    "</flagged>"
) : "")
) +
    "</out>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=relative.xsl.map
