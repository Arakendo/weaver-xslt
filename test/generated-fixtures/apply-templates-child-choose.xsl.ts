import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-child-choose.xsl", digest: "2f559fee" } as const;

export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","item"]).map((templateNode) => "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    (selectSimplePathExists(templateNode, ["flag"]) ? "<flagged>" +
    "</flagged>" : "<plain>" +
    "</plain>") +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };