import { throwMissingNativeInitialTemplate, throwUnsupportedNativeInitialMode, getRecordedTracePause, resetRecordedTracePause, traceFocusEnter, traceTemplateEnter, applyBuiltInTemplatesByPath, createCompiledDocument, escapeText, selectSimplePathNode, selectSimplePathNodes, traceSelectedNodes, traceStringValueOfNode } from "@arakendo/weaver-xslt/runtime";
import type { TransformContext, TransformResult } from "@arakendo/weaver-xslt/runtime";

export const source = { path: "apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl", digest: "b150d8fb" } as const;

/** match="/" (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
export function transform(sourceXml: string, ctx: TransformContext = {}): TransformResult {
  ctx = ctx.baseUri === undefined ? { ...ctx, baseUri: source.path } : ctx;
  resetRecordedTracePause(ctx.trace);
  if (ctx.initialMode !== undefined) {
    throwUnsupportedNativeInitialMode(ctx.initialMode);
  }
  if (ctx.initialTemplate !== undefined) {
    throwMissingNativeInitialTemplate(ctx.initialTemplate, []);
  }
  void ctx;
  const document = createCompiledDocument(sourceXml);
  traceFocusEnter(document, ctx);
  traceTemplateEnter(document, ctx, {"match":"/","location":{"source":"apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return {
    output:
      (
  /** literal items (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  (() => {
  const body = (
  /** xsl:apply-templates (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  applyBuiltInTemplatesByPath(document, ["root","section","item"], (templateNode, templateIndex, templateNodes) => (
  /** match="/root/section/item" (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"/root/section/item","location":{"source":"apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal item (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  (() => {
  const body = (
  /** xsl:value-of (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  escapeText(traceStringValueOfNode(selectSimplePathNode(templateNode, ["name"]), ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl","line":1,"column":225,"offset":224,"endLine":1,"endColumn":229,"endOffset":228}}))
) +
    (
  /** literal details (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  (() => {
  const body = (
  /** xsl:for-each (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  traceSelectedNodes(selectSimplePathNodes(templateNode, ["group"]), ctx, {"kind":"xsl:for-each","location":{"source":"apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl","line":1,"column":225,"offset":224,"endLine":1,"endColumn":229,"endOffset":228}}).map((currentNode) => (
  /** xsl:apply-templates (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  applyBuiltInTemplatesByPath(currentNode, ["detail"], (templateNode, templateIndex, templateNodes) => (
  /** match="detail" (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  (() => {
  traceFocusEnter(templateNode, ctx);
  traceTemplateEnter(templateNode, ctx, {"match":"detail","location":{"source":"apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl","line":1,"column":101,"offset":100,"endLine":1,"endColumn":102,"endOffset":101}});
  return (
  /** literal detail (apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl:1) */
  (() => {
  const body = escapeText(traceStringValueOfNode(templateNode, ctx, {"kind":"xsl:value-of","location":{"source":"apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl","line":1,"column":225,"offset":224,"endLine":1,"endColumn":229,"endOffset":228}}));
  return "<detail" + "" + ">" + body + "</detail>";
})()
);
})()
), false, ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl","line":1,"column":270,"offset":269,"endLine":1,"endColumn":271,"endOffset":270}})
)).join("")
);
  return "<details" + "" + ">" + body + "</details>";
})()
);
  return "<item" + "" + ">" + body + "</item>";
})()
);
})()
), true, ctx, {"kind":"xsl:apply-templates","location":{"source":"apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl","line":1,"column":111,"offset":110,"endLine":1,"endColumn":112,"endOffset":111}})
);
  return "<items" + "" + ">" + body + "</items>";
})()
),
    ...(getRecordedTracePause(ctx.trace) === undefined ? {} : { pause: getRecordedTracePause(ctx.trace) }),
  };
}

export default { source, transform };
//# sourceMappingURL=apply-templates-absolute-nested-match-default-for-each-apply-templates-default.xsl.map
