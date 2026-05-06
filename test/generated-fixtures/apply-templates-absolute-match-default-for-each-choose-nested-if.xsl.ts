import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-match-default-for-each-choose-nested-if.xsl", digest: "e8f56b16" } as const;

/** match="/" (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  applyBuiltInTemplatesByPath(document, ["root","item"], (templateNode) => (
  /** match="/root/item" (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  (
  /** literal item (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** literal details (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  "<details>" +
    (
  /** xsl:for-each (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) => (
  /** xsl:choose (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["marker"]) ? (
  /** literal flagged (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  "<flagged>" +
    "</flagged>"
) : "")
)
) : (
  /** xsl:otherwise (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  (
  /** xsl:if (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["vip"]) ? (
  /** literal vip (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
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
), true)
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=apply-templates-absolute-match-default-for-each-choose-nested-if.xsl.map
