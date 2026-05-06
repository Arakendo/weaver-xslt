import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "for-each-apply-templates-default.xsl", digest: "d58458e5" } as const;

/** match="/" (for-each-apply-templates-default.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (for-each-apply-templates-default.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (for-each-apply-templates-default.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((currentNode) => (
  /** literal item (for-each-apply-templates-default.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (for-each-apply-templates-default.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    (
  /** literal details (for-each-apply-templates-default.xsl:1) */
  "<details>" +
    (
  /** xsl:apply-templates (for-each-apply-templates-default.xsl:1) */
  applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode) => (
  /** match="detail" (for-each-apply-templates-default.xsl:1) */
  (
  /** literal detail (for-each-apply-templates-default.xsl:1) */
  "<detail>" +
    escapeText(stringValueOfNode(templateNode)) +
    "</detail>"
)
))
) +
    "</details>"
) +
    "</item>"
)).join("")
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=for-each-apply-templates-default.xsl.map
