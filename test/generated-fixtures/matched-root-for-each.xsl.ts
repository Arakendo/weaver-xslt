import { createCompiledDocument, escapeText, selectSimplePathNode, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-root-for-each.xsl", digest: "7eeacd0b" } as const;

/** match="/root" (matched-root-for-each.xsl:1) */
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
  /** literal items (matched-root-for-each.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (matched-root-for-each.xsl:1) */
  selectSimplePathNodes(currentNode, ["item"]).map((currentNode) => (
  /** literal item (matched-root-for-each.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (matched-root-for-each.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    "</item>"
)).join("")
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=matched-root-for-each.xsl.map
