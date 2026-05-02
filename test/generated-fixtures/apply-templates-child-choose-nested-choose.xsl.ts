import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-child-choose-nested-choose.xsl", digest: "308cd309" } as const;

export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","item"]).map((templateNode) => "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    (selectSimplePathExists(templateNode, ["flag"]) ? (selectSimplePathExists(templateNode, ["detail"]) ? "<flagged>" +
    "</flagged>" : "<brief>" +
    "</brief>") : (selectSimplePathExists(templateNode, ["vip"]) ? "<vip>" +
    "</vip>" : "<plain>" +
    "</plain>")) +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };