import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-nested-match-default-for-each-apply-templates-default.xsl", digest: "c10c366d" } as const;

/** match="/" (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
  applyBuiltInTemplatesByPath(document, ["section","item"], (templateNode) => (
  /** match="section/item" (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
  (
  /** literal item (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** literal details (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
  "<details>" +
    (
  /** xsl:for-each (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
  selectSimplePathNodes(templateNode, ["group"]).map((currentNode) => (
  /** xsl:apply-templates (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
  applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode) => (
  /** match="detail" (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
  (
  /** literal detail (apply-templates-nested-match-default-for-each-apply-templates-default.xsl:1) */
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
))
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=apply-templates-nested-match-default-for-each-apply-templates-default.xsl.map
