import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-nested-root-for-each-choose-nested-choose.xsl", digest: "0ff391cc" } as const;

/** match="/root/section" (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
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
  /** literal items (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  selectSimplePathNodes(currentNode, ["item"]).map((currentNode) => (
  /** literal item (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    (
  /** xsl:choose (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** xsl:choose (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["detail"]) ? (
  /** xsl:when (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal flagged (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  "<flagged>" +
    "</flagged>"
)
) : (
  /** xsl:otherwise (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal brief (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  "<brief>" +
    "</brief>"
)
))
)
) : (
  /** xsl:otherwise (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** xsl:choose (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** xsl:when (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal vip (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  "<vip>" +
    "</vip>"
)
) : (
  /** xsl:otherwise (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal plain (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
  "<plain>" +
    "</plain>"
)
))
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
//# sourceMappingURL=matched-nested-root-for-each-choose-nested-choose.xsl.map
