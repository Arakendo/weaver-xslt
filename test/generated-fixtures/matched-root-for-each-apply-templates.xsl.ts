import { createCompiledDocument, escapeText, selectSimplePathNode, selectSimplePathNodes, selectSimplePathText, stringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "matched-root-for-each-apply-templates.xsl", digest: "b2b31d1f" } as const;

/** match="/root" (matched-root-for-each-apply-templates.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  const currentNode = selectSimplePathNode(document, ["root"]);
  if (currentNode === null) {
    return { output: "" };
  }
  return {
    output:
      "<items>" +
    selectSimplePathNodes(currentNode, ["item"]).map((currentNode) => "<item>" +
    escapeText(selectSimplePathText(currentNode, ["name"])) +
    "<details>" +
    selectSimplePathNodes(currentNode, ["detail"]).map((templateNode) => (
  /** match="detail" (matched-root-for-each-apply-templates.xsl:1) */
  "<detail>" +
    escapeText(stringValueOfNode(templateNode)) +
    "</detail>"
)).join("") +
    "</details>" +
    "</item>").join("") +
    "</items>",
  };
}

export default { source, transform };
