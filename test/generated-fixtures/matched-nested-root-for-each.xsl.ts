import { createCompiledDocument, escapeText, selectSimplePathNode, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-nested-root-for-each.xsl", digest: "525796b7" } as const;

/** match="/root/section" (matched-nested-root-for-each.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = selectSimplePathNode(document, ["root","section"]);
  if (currentNode === null) {
    return { output: "" };
  }
  return {
    output:
      (
  /** literal items (matched-nested-root-for-each.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (matched-nested-root-for-each.xsl:1) */
  selectSimplePathNodes(currentNode, ["item"]).map((currentNode) => (
  /** literal item (matched-nested-root-for-each.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (matched-nested-root-for-each.xsl:1) */
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
//# sourceMappingURL=matched-nested-root-for-each.xsl.map
