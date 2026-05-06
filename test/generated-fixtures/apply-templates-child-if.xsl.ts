import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-child-if.xsl", digest: "9a05f229" } as const;

/** match="/" (apply-templates-child-if.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-child-if.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-child-if.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((templateNode) => (
  /** match="item" (apply-templates-child-if.xsl:1) */
  (
  /** literal item (apply-templates-child-if.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-child-if.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** xsl:if (apply-templates-child-if.xsl:1) */
  (selectSimplePathExists(templateNode, ["flag"]) ? (
  /** literal flagged (apply-templates-child-if.xsl:1) */
  "<flagged>" +
    "</flagged>"
) : "")
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
//# sourceMappingURL=apply-templates-child-if.xsl.map
