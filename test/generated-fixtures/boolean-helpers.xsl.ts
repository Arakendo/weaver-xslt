import { createCompiledDocument, selectSimplePathExists } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "boolean-helpers.xsl", digest: "1b5a2d3c" } as const;

/** match="/" (boolean-helpers.xsl:3) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = document;
  return {
    output:
      (
  /** literal out (boolean-helpers.xsl:4) */
  "<out>" +
    (
  /** xsl:if (boolean-helpers.xsl:5) */
  ((!selectSimplePathExists(currentNode, ["root","flag"])) ? (
  /** literal missing (boolean-helpers.xsl:5) */
  "<missing>" +
    "</missing>"
) : "")
) +
    (
  /** xsl:if (boolean-helpers.xsl:6) */
  (true ? (
  /** literal always (boolean-helpers.xsl:6) */
  "<always>" +
    "</always>"
) : "")
) +
    (
  /** xsl:if (boolean-helpers.xsl:7) */
  (false ? (
  /** literal never (boolean-helpers.xsl:7) */
  "<never>" +
    "</never>"
) : "")
) +
    "</out>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=boolean-helpers.xsl.map
