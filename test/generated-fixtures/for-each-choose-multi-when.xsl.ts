import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "for-each-choose-multi-when.xsl", digest: "a149ad80" } as const;

export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = document;
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","item"]).map((currentNode) => "<item>" +
    escapeText(selectSimplePathText(currentNode, ["name"])) +
    (selectSimplePathExists(currentNode, ["flag"]) ? "<flagged>" +
    "</flagged>" : (selectSimplePathExists(currentNode, ["vip"]) ? "<vip>" +
    "</vip>" : "<plain>" +
    "</plain>")) +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };