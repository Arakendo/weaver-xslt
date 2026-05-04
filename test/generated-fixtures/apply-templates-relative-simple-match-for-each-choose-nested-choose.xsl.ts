import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-relative-simple-match-for-each-choose-nested-choose.xsl", digest: "ebc20ba5" } as const;

/** match="/" (apply-templates-relative-simple-match-for-each-choose-nested-choose.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","section","item"]).map((templateNode) => (
  /** match="item" (apply-templates-relative-simple-match-for-each-choose-nested-choose.xsl:1) */
  "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    "<details>" +
    selectSimplePathNodes(templateNode, ["detail"]).map((currentNode) => (selectSimplePathExists(currentNode, ["flag"]) ? (selectSimplePathExists(currentNode, ["marker"]) ? "<flagged>" +
    "</flagged>" : "<brief>" +
    "</brief>") : (selectSimplePathExists(currentNode, ["vip"]) ? "<vip>" +
    "</vip>" : "<plain>" +
    "</plain>"))).join("") +
    "</details>" +
    "</item>"
)).join("") +
    "</items>",
  };
}

export default { source, transform };
