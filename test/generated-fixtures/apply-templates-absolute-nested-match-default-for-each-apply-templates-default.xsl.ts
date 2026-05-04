import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl", digest: "b150d8fb" } as const;

/** match="/" (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode) => (
  /** match="/root/section/item" (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    "<details>" +
    selectSimplePathNodes(templateNode, ["group"]).map((currentNode) => applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode) => (
  /** match="detail" (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  "<detail>" +
    escapeText(stringValueOfNode(templateNode)) +
    "</detail>"
))).join("") +
    "</details>" +
    "</item>"
), true) +
    "</items>",
  };
}

export default { source, transform };
