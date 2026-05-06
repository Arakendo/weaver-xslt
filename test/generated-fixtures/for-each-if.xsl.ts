import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "for-each-if.xsl", digest: "b801810c" } as const;

/** match="/" (for-each-if.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = document;
  return {
    output:
      (
  /** literal items (for-each-if.xsl:1) */
  "<items>" +
    (
  /** xsl:for-each (for-each-if.xsl:1) */
  selectSimplePathNodes(document, ["root","item"]).map((currentNode) => (
  /** literal item (for-each-if.xsl:1) */
  "<item>" +
    (
  /** xsl:value-of (for-each-if.xsl:1) */
  escapeText(selectSimplePathText(currentNode, ["name"]))
) +
    (
  /** xsl:if (for-each-if.xsl:1) */
  (selectSimplePathExists(currentNode, ["flag"]) ? (
  /** literal flagged (for-each-if.xsl:1) */
  "<flagged>" +
    "</flagged>"
) : "")
) +
    "</item>"
)).join("")
) +
    "</items>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=for-each-if.xsl.map
