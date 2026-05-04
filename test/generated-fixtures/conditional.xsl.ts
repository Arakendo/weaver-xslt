import { createCompiledDocument, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "conditional.xsl", digest: "8ff84c60" } as const;

/** match="/" (conditional.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<out>" +
    ((selectSimplePathText(document, ["root","name"]) === "world") ? "<yes>" +
    "</yes>" : "") +
    ((selectSimplePathText(document, ["root","role"]) === "admin") ? "<role>" +
    "admin" +
    "</role>" : "<role>" +
    "user" +
    "</role>") +
    "</out>",
  };
}

export default { source, transform };
