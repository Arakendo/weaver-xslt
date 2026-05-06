import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "for-each-choose-multi-when.xsl", digest: "a149ad80" } as const;

/** match="/" (for-each-choose-multi-when.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = document;
  return {
    output:
      (
  /** literal items (for-each-choose-multi-when.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (for-each-choose-multi-when.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((currentNode) => (
  /** literal item (for-each-choose-multi-when.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (for-each-choose-multi-when.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    (
  /** xsl:choose (for-each-choose-multi-when.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (for-each-choose-multi-when.xsl:1) */
  (
  /** literal flagged (for-each-choose-multi-when.xsl:1) */
  "<flagged>" +
    "</flagged>"
)
) : (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** xsl:when (for-each-choose-multi-when.xsl:1) */
  (
  /** literal vip (for-each-choose-multi-when.xsl:1) */
  "<vip>" +
    "</vip>"
)
) : (
  /** xsl:otherwise (for-each-choose-multi-when.xsl:1) */
  (
  /** literal plain (for-each-choose-multi-when.xsl:1) */
  "<plain>" +
    "</plain>"
)
)))
) +
    "</item>"
)).join("")
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=for-each-choose-multi-when.xsl.map
