import type { TemplateRule } from '../compile/ir.js';

export function renderTemplateProvenanceComment(template: TemplateRule, sourcePath?: string): string {
  const label = template.matchText !== undefined
    ? `match=${JSON.stringify(template.matchText)}`
    : template.name !== undefined
      ? `name=${JSON.stringify(template.name)}`
      : 'template';
  const source = sourcePath ?? template.location?.source;
  const line = template.location?.line;
  const location = source === undefined
    ? undefined
    : line === undefined
      ? source
      : `${source}:${line}`;

  return location === undefined ? `/** ${label} */` : `/** ${label} (${location}) */`;
}

export function renderCommentedArrowFunction(comment: string, parameters: string, bodyCode: string): string {
  return `${parameters} => (\n  ${comment}\n  ${bodyCode}\n)`;
}