import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-nested-root-for-each-choose-nested-if.xsl", digest: "67acef1e" } as const;

/** match="/root/section" (matched-nested-root-for-each-choose-nested-if.xsl:1) */
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
  /** literal items (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  selectSimplePathNodes(currentNode, ["item"]).map((currentNode) => (
  /** literal item (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    (
  /** xsl:choose (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["detail"]) ? (
  /** literal flagged (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  "<flagged>" +
    "</flagged>"
) : "")
)
) : (
  /** xsl:otherwise (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** literal vip (matched-nested-root-for-each-choose-nested-if.xsl:1) */
  "<vip>" +
    "</vip>"
) : "")
)
))
) +
    "</item>"
)).join("")
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=matched-nested-root-for-each-choose-nested-if.xsl.map
