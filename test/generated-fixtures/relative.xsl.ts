import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "relative.xsl", digest: "9edf8c88" } as const;

export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = document;
  return {
    output:
      "<out>" +
    escapeText(selectSimplePathText(currentNode, ["root","name"])) +
    (selectSimplePathExists(currentNode, ["root","flag"]) ? "<flagged>" +
    "</flagged>" : "") +
    "</out>",
  };
}

export default { source, transform };
