import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-relative-for-each-choose-nested-if.xsl", digest: "16807f97" } as const;

/** match="/" (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((templateNode) => (
  /** match="item" (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  (
  /** literal item (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** literal details (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  "<details>" +
    (
  /** xsl:for-each (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) => (
  /** xsl:choose (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["marker"]) ? (
  /** literal flagged (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  "<flagged>" +
    "</flagged>"
) : "")
)
) : (
  /** xsl:otherwise (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** literal vip (apply-templates-relative-for-each-choose-nested-if.xsl:1) */
  "<vip>" +
    "</vip>"
) : "")
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
//# sourceMappingURL=apply-templates-relative-for-each-choose-nested-if.xsl.map
