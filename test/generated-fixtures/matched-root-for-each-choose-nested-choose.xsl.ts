import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-root-for-each-choose-nested-choose.xsl", digest: "ca5cc4b0" } as const;

/** match="/root" (matched-root-for-each-choose-nested-choose.xsl:1) */
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
  /** literal items (matched-root-for-each-choose-nested-choose.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (matched-root-for-each-choose-nested-choose.xsl:1) */
  selectSimplePathNodes(currentNode, ["item"]).map((currentNode) => (
  /** literal item (matched-root-for-each-choose-nested-choose.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (matched-root-for-each-choose-nested-choose.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    (
  /** xsl:choose (matched-root-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (matched-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** xsl:choose (matched-root-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["detail"]) ? (
  /** xsl:when (matched-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal flagged (matched-root-for-each-choose-nested-choose.xsl:1) */
  "<flagged>" +
    "</flagged>"
)
) : (
  /** xsl:otherwise (matched-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal brief (matched-root-for-each-choose-nested-choose.xsl:1) */
  "<brief>" +
    "</brief>"
)
))
)
) : (
  /** xsl:otherwise (matched-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** xsl:choose (matched-root-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** xsl:when (matched-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal vip (matched-root-for-each-choose-nested-choose.xsl:1) */
  "<vip>" +
    "</vip>"
)
) : (
  /** xsl:otherwise (matched-root-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal plain (matched-root-for-each-choose-nested-choose.xsl:1) */
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
//# sourceMappingURL=matched-root-for-each-choose-nested-choose.xsl.map
