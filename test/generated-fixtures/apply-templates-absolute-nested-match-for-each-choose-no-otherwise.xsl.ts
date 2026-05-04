import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-nested-match-for-each-choose-no-otherwise.xsl", digest: "10e28858" } as const;

/** match="/" (apply-templates-absolute-nested-match-for-each-choose-no-otherwise.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","section","item"]).map((templateNode) => (
  /** match="/root/section/item" (apply-templates-absolute-nested-match-for-each-choose-no-otherwise.xsl:1) */
  "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    "<details>" +
    selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) => (selectSimplePathExists(currentNode, ["flag"]) ? "<flagged>" +
    "</flagged>" : "")).join("") +
    "</details>" +
    "</item>"
)).join("") +
    "</items>",
  };
}

export default { source, transform };
