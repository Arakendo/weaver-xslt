import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-match-default.xsl", digest: "4e1dfe56" } as const;

/** match="/" (apply-templates-absolute-match-default.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-absolute-match-default.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-absolute-match-default.xsl:1) */
  applyBuiltInTemplatesByPath(document, ["root","item"], (templateNode) => (
  /** match="/root/item" (apply-templates-absolute-match-default.xsl:1) */
  (
  /** literal item (apply-templates-absolute-match-default.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-absolute-match-default.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
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
//# sourceMappingURL=apply-templates-absolute-match-default.xsl.map
