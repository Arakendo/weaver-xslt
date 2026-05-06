import { createCompiledDocument, escapeText, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "hello.xsl", digest: "34f4c921" } as const;

/** match="/" (hello.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      (
  /** literal hello (hello.xsl:1) */
  "<hello>" +
    (
  /** xsl:value-of (hello.xsl:1) */
  escapeText(selectSimplePathText(document, ["root","name"]))
) +
    "</hello>"
),
  };
}

export default { source, transform };
//# sourceMappingURL=hello.xsl.map
