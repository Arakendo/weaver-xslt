import { createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "for-each.xsl", digest: "ae5677e1" } as const;

/** match="/" (for-each.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = document;
  return {
    output:
      (
  /** literal items (for-each.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (for-each.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((currentNode) => (
  /** literal item (for-each.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (for-each.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    "</item>"
)).join("")
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=for-each.xsl.map
