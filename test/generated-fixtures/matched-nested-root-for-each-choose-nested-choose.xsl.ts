import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNode, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-nested-root-for-each-choose-nested-choose.xsl", digest: "0ff391cc" } as const;

/** match="/root/section" (matched-nested-root-for-each-choose-nested-choose.xsl:1) */
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
    "</flagged>" : "<brief>" +
    "</brief>") : (selectSimplePathExists(currentNode, ["vip"]) ? "<vip>" +
    "</vip>" : "<plain>" +
    "</plain>")) +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };
