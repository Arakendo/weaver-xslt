import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "for-each-choose-nested-if.xsl", digest: "9887b70c" } as const;

/** match="/" (for-each-choose-nested-if.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = document;
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","item"]).map((currentNode) => "<item>" +
    escapeText(selectSimplePathText(currentNode, ["name"])) +
    (selectSimplePathExists(currentNode, ["flag"]) ? (selectSimplePathExists(currentNode, ["detail"]) ? "<flagged>" +
    "</flagged>" : "") : (selectSimplePathExists(currentNode, ["vip"]) ? "<vip>" +
    "</vip>" : "")) +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };
