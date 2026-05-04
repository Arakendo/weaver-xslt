import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "for-each-apply-templates-default.xsl", digest: "d58458e5" } as const;

export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","item"]).map((currentNode) => "<item>" +
    escapeText(selectSimplePathText(currentNode, ["name"])) +
    "<details>" +
    applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode) => "<detail>" +
    escapeText(stringValueOfNode(templateNode)) +
    "</detail>") +
    "</details>" +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };
