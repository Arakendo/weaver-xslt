import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-match-for-each-choose-no-otherwise.xsl", digest: "24ded238" } as const;

/** match="/" (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((templateNode) => (
  /** match="/root/item" (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (
  /** literal item (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** literal details (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  "<details>" +
    (
  /** xsl:for-each (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) => (
  /** xsl:choose (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** xsl:when (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  (
  /** literal flagged (apply-templates-absolute-match-for-each-choose-no-otherwise.xsl:1) */
  "<flagged>" +
    "</flagged>"
)
) : "")
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
//# sourceMappingURL=apply-templates-absolute-match-for-each-choose-no-otherwise.xsl.map
