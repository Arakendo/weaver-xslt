import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-root.xsl", digest: "3daffecc" } as const;

/** match="/root" (matched-root.xsl:3) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = selectSimplePathNode(document, ["root"]);
  if (currentNode === null) {
    return { output: "" };
  }
  return {
    output:
      (
  /** literal out (matched-root.xsl:4) */
  "<out>" +
    (
  /** xsl:value-of (matched-root.xsl:5) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    (
  /** xsl:if (matched-root.xsl:6) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** literal flagged (matched-root.xsl:6) */
  "<flagged>" +
    "</flagged>"
) : "")
) +
    "</out>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=matched-root.xsl.map
