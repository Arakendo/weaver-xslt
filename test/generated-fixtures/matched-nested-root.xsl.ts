import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-nested-root.xsl", digest: "a393a704" } as const;

/** match="/root/section/item" (matched-nested-root.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = selectSimplePathNode(document, ["root","section","item"]);
  if (currentNode === null) {
    return { output: "" };
  }
  return {
    output:
      (
  /** literal item (matched-nested-root.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (matched-nested-root.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    (
  /** xsl:if (matched-nested-root.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** literal flagged (matched-nested-root.xsl:1) */
  "<flagged>" +
    "</flagged>"
) : "")
) +
    "</item>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=matched-nested-root.xsl.map
