import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-child-choose-multi-when.xsl", digest: "2031b82d" } as const;

/** match="/" (apply-templates-child-choose-multi-when.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal items (apply-templates-child-choose-multi-when.xsl:1) */
  "<items>" +
    (
  /** xsl:apply-templates (apply-templates-child-choose-multi-when.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((templateNode) => (
  /** match="item" (apply-templates-child-choose-multi-when.xsl:1) */
  (
  /** literal item (apply-templates-child-choose-multi-when.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (apply-templates-child-choose-multi-when.xsl:1) */
  escapeText(selectSimplePathText(templateNode, ["name"]))
) +
    (
  /** xsl:choose (apply-templates-child-choose-multi-when.xsl:1) */
  (selectSimplePathExists(templateNode, ["flag"]) ? (
  /** xsl:when (apply-templates-child-choose-multi-when.xsl:1) */
  (
  /** literal flagged (apply-templates-child-choose-multi-when.xsl:1) */
  "<flagged>" +
    "</flagged>"
)
) : (selectSimplePathExists(templateNode, ["vip"]) ? (
  /** xsl:when (apply-templates-child-choose-multi-when.xsl:1) */
  (
  /** literal vip (apply-templates-child-choose-multi-when.xsl:1) */
  "<vip>" +
    "</vip>"
)
) : (
  /** xsl:otherwise (apply-templates-child-choose-multi-when.xsl:1) */
  (
  /** literal plain (apply-templates-child-choose-multi-when.xsl:1) */
  "<plain>" +
    "</plain>"
)
)))
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
//# sourceMappingURL=apply-templates-child-choose-multi-when.xsl.map
