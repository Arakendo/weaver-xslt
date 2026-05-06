import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-child-for-each-apply-templates-default.xsl", digest: "cf5b7261" } as const;

/** match="/" (apply-templates-child-for-each-apply-templates-default.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((templateNode) => (
  /** match="item" (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  (
  /** literal item (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** literal details (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  "<details>" +
    (
  /** xsl:for-each (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  selectSimplePathNodes(templateNode, ["group"]).map((currentNode) => (
  /** xsl:apply-templates (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode) => (
  /** match="detail" (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  (
  /** literal detail (apply-templates-child-for-each-apply-templates-default.xsl:1) */
  "<detail>" +
    escapeText(stringValueOfNode(templateNode)) +
    "</detail>"
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
//# sourceMappingURL=apply-templates-child-for-each-apply-templates-default.xsl.map
