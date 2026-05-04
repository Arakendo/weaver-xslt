import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-match-default-for-each-choose-nested-if.xsl", digest: "e8f56b16" } as const;

/** match="/" (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    applyBuiltInTemplatesByPath(document, ["root","item"], (templateNode) => (
  /** match="/root/item" (apply-templates-absolute-match-default-for-each-choose-nested-if.xsl:1) */
  "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    "<details>" +
    selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) => (selectSimplePathExists(currentNode, ["flag"]) ? (selectSimplePathExists(currentNode, ["marker"]) ? "<flagged>" +
    "</flagged>" : "") : (selectSimplePathExists(currentNode, ["vip"]) ? "<vip>" +
    "</vip>" : ""))).join("") +
    "</details>" +
    "</item>"
), true) +
    "</items>",
  };
}

export default { source, transform };
