import { createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-nested-match.xsl", digest: "7452258c" } as const;

/** match="/" (apply-templates-nested-match.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-nested-match.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-nested-match.xsl:1) */
  selectSimplePathNodes(document, ["root","section","item"]).map((templateNode) => (
  /** match="section/item" (apply-templates-nested-match.xsl:1) */
  (
  /** literal item (apply-templates-nested-match.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-nested-match.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
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
//# sourceMappingURL=apply-templates-nested-match.xsl.map
