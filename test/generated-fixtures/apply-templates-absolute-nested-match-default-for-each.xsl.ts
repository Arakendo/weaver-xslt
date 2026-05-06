import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-nested-match-default-for-each.xsl", digest: "4c846ee5" } as const;

/** match="/" (apply-templates-absolute-nested-match-default-for-each.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-absolute-nested-match-default-for-each.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-absolute-nested-match-default-for-each.xsl:1) */
  applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode) => (
  /** match="/root/section/item" (apply-templates-absolute-nested-match-default-for-each.xsl:1) */
  (
  /** literal item (apply-templates-absolute-nested-match-default-for-each.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-absolute-nested-match-default-for-each.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** literal details (apply-templates-absolute-nested-match-default-for-each.xsl:1) */
  "<details>" +
    (
  /** xsl:for-each (apply-templates-absolute-nested-match-default-for-each.xsl:1) */
  selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) => (
  /** literal detail (apply-templates-absolute-nested-match-default-for-each.xsl:1) */
  "<detail>" +
    escapeText(stringValueOfNode(currentNode)) +
    "</detail>"
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
//# sourceMappingURL=apply-templates-absolute-nested-match-default-for-each.xsl.map
