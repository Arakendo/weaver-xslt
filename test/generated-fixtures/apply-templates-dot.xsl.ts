import { createCompiledDocument, escapeText, selectSimplePathNodes, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-dot.xsl", digest: "d69dbbc5" } as const;

/** match="/" (apply-templates-dot.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-dot.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-dot.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((templateNode) => (
  /** match="item" (apply-templates-dot.xsl:1) */
  (
  /** literal item (apply-templates-dot.xsl:1) */
  "<item>" +
    escapeText(stringValueOfNode(templateNode)) +
    "</item>"
)
)).join("")
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=apply-templates-dot.xsl.map
