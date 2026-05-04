import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-nested-root-for-each-choose-nested-if.xsl", digest: "67acef1e" } as const;

/** match="/root/section" (matched-nested-root-for-each-choose-nested-if.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = selectSimplePathNode(document, ["root","section"]);
  if (currentNode === null) {
    return { output: "" };
  }
  return {
    output:
      "<items>" +
    selectSimplePathNodes(currentNode, ["item"]).map((currentNode) => "<item>" +
    escapeText(selectSimplePathText(currentNode, ["name"])) +
    (selectSimplePathExists(currentNode, ["flag"]) ? (selectSimplePathExists(currentNode, ["detail"]) ? "<flagged>" +
    "</flagged>" : "") : (selectSimplePathExists(currentNode, ["vip"]) ? "<vip>" +
    "</vip>" : "")) +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };
