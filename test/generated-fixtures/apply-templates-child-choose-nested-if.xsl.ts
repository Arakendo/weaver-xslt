import { createCompiledDocument, escapeText, selectSimplePathExists, selectSimplePathNodes, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-child-choose-nested-if.xsl", digest: "53eafda3" } as const;

/** match="/" (apply-templates-child-choose-nested-if.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    selectSimplePathNodes(document, ["root","item"]).map((templateNode) => (
  /** match="item" (apply-templates-child-choose-nested-if.xsl:1) */
  "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    (selectSimplePathExists(templateNode, ["flag"]) ? (selectSimplePathExists(templateNode, ["detail"]) ? "<flagged>" +
    "</flagged>" : "") : (selectSimplePathExists(templateNode, ["vip"]) ? "<vip>" +
    "</vip>" : "")) +
    "</item>"
)).join("") +
    "</items>",
  };
}

export default { source, transform };
