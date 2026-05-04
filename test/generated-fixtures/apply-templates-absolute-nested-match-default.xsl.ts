import { applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathText } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-nested-match-default.xsl", digest: "5aa74aa6" } as const;

/** match="/" (apply-templates-absolute-nested-match-default.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  void ctx;
  const document = createCompiledDocument(sourceXml);
  return {
    output:
      "<items>" +
    applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode) => (
  /** match="/root/section/item" (apply-templates-absolute-nested-match-default.xsl:1) */
  "<item>" +
    escapeText(selectSimplePathText(templateNode, ["name"])) +
    "</item>"
), true) +
    "</items>",
  };
}

export default { source, transform };
