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
      "<out>" +
    ((!selectSimplePathExists(currentNode, ["root","flag"])) ? "<missing>" +
    "</missing>" : "") +
    (true ? "<always>" +
    "</always>" : "") +
    (false ? "<never>" +
    "</never>" : "") +
    "</out>",
  };
}

export default { source, transform };
