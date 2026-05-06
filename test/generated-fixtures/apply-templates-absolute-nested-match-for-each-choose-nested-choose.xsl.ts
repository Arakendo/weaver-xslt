import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl", digest: "b3177408" } as const;

/** match="/" (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  selectSimplePathNodes(document, ["root","section","item"]).map((templateNode) => (
  /** match="/root/section/item" (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal item (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** literal details (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  "<details>" +
    (
  /** xsl:for-each (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) => (
  /** xsl:choose (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** xsl:choose (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["marker"]) ? (
  /** xsl:when (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal flagged (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  "<flagged>" +
    "</flagged>"
)
) : (
  /** xsl:otherwise (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal brief (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  "<brief>" +
    "</brief>"
)
))
)
) : (
  /** xsl:otherwise (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** xsl:choose (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** xsl:when (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal vip (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  "<vip>" +
    "</vip>"
)
) : (
  /** xsl:otherwise (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  (
  /** literal plain (apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl:1) */
  "<plain>" +
    "</plain>"
)
))
)
))
)).join("")
) +
    "</details>"
) +
    "</item>"
)
)).join("")
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=apply-templates-absolute-nested-match-for-each-choose-nested-choose.xsl.map
