import { createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates.xsl", digest: "fe1d2a18" } as const;

/** match="/" (apply-templates.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((templateNode) => (
  /** match="item" (apply-templates.xsl:1) */
  (
  /** literal item (apply-templates.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates.xsl:1) */
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
//# sourceMappingURL=apply-templates.xsl.map
