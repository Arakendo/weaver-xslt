import { createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-nested-match-for-each-apply-templates.xsl", digest: "0a3236a3" } as const;

/** match="/" (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  selectSimplePathNodes(document, ["root","section","item"]).map((templateNode) => (
  /** match="/root/section/item" (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  (
  /** literal item (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** literal details (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  "<details>" +
    (
  /** xsl:for-each (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  selectSimplePathNodes(templateNode, ["group"]).map((currentNode) => (
  /** xsl:apply-templates (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  selectSimplePathNodes(currentNode, ["detail"]).map((templateNode) => (
  /** match="detail" (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  (
  /** literal detail (apply-templates-absolute-nested-match-for-each-apply-templates.xsl:1) */
  "<detail>" +
    escapeText(stringValueOfNode(templateNode)) +
    "</detail>"
)
)).join("")
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
//# sourceMappingURL=apply-templates-absolute-nested-match-for-each-apply-templates.xsl.map
