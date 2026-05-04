import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-child-apply-templates-default.xsl", digest: "8d246d32" } as const;

export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","item"]).map((templateNode) => "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    "<details>" +
    applyBuiltInTemplatesByPath(templateNode, ["detail"], (templateNode) => "<detail>" +
    escapeText(stringValueOfNode(templateNode)) +
    "</detail>") +
    "</details>" +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };
