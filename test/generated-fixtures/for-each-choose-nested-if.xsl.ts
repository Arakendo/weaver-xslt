import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "for-each-choose-nested-if.xsl", digest: "9887b70c" } as const;

/** match="/" (for-each-choose-nested-if.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = document;
  return {
    output:
      (
  /** literal items (for-each-choose-nested-if.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (for-each-choose-nested-if.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((currentNode) => (
  /** literal item (for-each-choose-nested-if.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (for-each-choose-nested-if.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    (
  /** xsl:choose (for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["detail"]) ? (
  /** literal flagged (for-each-choose-nested-if.xsl:1) */
  "<flagged>" +
    "</flagged>"
) : "")
)
) : (
  /** xsl:otherwise (for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** literal vip (for-each-choose-nested-if.xsl:1) */
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
//# sourceMappingURL=for-each-choose-nested-if.xsl.map
