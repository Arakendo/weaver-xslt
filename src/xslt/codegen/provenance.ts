import type { SourceLocation } from '../../errors/index.js';
import type { ChooseWhenBranch, Instruction, TemplateRule } from '../compile/ir.js';

export function renderTemplateProvenanceComment(template: TemplateRule, sourcePath?: string): string {
  return renderLocationComment(
    template.matchText !== undefined
      ? `match=${JSON.stringify(template.matchText)}`
      : template.name !== undefined
        ? `name=${JSON.stringify(template.name)}`
        : 'template',
    template.location,
    sourcePath,
  );
}

export function renderInstructionProvenanceComment(instruction: Instruction, sourcePath?: string): string | undefined {
  const label = instructionLabel(instruction);
  if (label === undefined) {
    return undefined;
  }

  return renderLocationComment(label, instruction.location, sourcePath);
}

export function renderWhenProvenanceComment(branch: ChooseWhenBranch, sourcePath?: string): string {
  return renderLocationComment('xsl:when', branch.location, sourcePath);
}

export function renderOtherwiseProvenanceComment(location: SourceLocation | undefined, sourcePath?: string): string {
  return renderLocationComment('xsl:otherwise', location, sourcePath);
}

export function renderCommentedArrowFunction(comment: string, parameters: string, bodyCode: string): string {
  return `${parameters} => (\n  ${comment}\n  ${bodyCode}\n)`;
}

function renderLocationComment(label: string, location: SourceLocation | undefined, sourcePath?: string): string {
  const source = sourcePath ?? location?.source;
  const line = location?.line;
  const locationLabel = source === undefined
    ? undefined
    : line === undefined
      ? source
      : `${source}:${line}`;

  return locationLabel === undefined ? `/** ${label} */` : `/** ${label} (${locationLabel}) */`;
}

function instructionLabel(instruction: Instruction): string | undefined {
  switch (instruction.kind) {
    case 'literalElement':
      return `literal ${instruction.name}`;
    case 'comment':
      return 'xsl:comment';
    case 'valueOf':
      return 'xsl:value-of';
    case 'applyTemplates':
      return 'xsl:apply-templates';
    case 'if':
      return 'xsl:if';
    case 'forEach':
      return 'xsl:for-each';
    case 'callTemplate':
      return 'xsl:call-template';
    case 'choose':
      return 'xsl:choose';
    default:
      return undefined;
  }
}