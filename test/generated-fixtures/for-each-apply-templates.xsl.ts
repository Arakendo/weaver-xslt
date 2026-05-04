import { createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "for-each-apply-templates.xsl", digest: "48d2d6c1" } as const;

export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","item"]).map((currentNode) => "<item>" +
    escapeText(selectSimplePathText(currentNode, ["name"])) +
    "<details>" +
    selectSimplePathNodes(currentNode, ["detail"]).map((templateNode) => "<detail>" +
    escapeText(stringValueOfNode(templateNode)) +
    "</detail>").join("") +
    "</details>" +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };
