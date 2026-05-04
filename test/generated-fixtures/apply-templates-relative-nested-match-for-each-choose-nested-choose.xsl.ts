import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-relative-nested-match-for-each-choose-nested-choose.xsl", digest: "18c0be99" } as const;

export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","section","item"]).map((templateNode) => "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    "<details>" +
    selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) => (selectSimplePathExists(currentNode, ["flag"]) ? (selectSimplePathExists(currentNode, ["marker"]) ? "<flagged>" +
    "</flagged>" : "<brief>" +
    "</brief>") : (selectSimplePathExists(currentNode, ["vip"]) ? "<vip>" +
    "</vip>" : "<plain>" +
    "</plain>"))).join("") +
    "</details>" +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };
