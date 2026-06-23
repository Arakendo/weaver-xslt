import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export interface SyntheticBenchmarkFixture {
  readonly stylesheetPaths: readonly string[];
  readonly cleanupDirs: readonly string[];
}

export function createSyntheticBenchmarkFixture(name: string): SyntheticBenchmarkFixture {
  switch (name) {
    case 'vision-guardrail':
      return createSyntheticVisionGuardrailFixture();
    default:
      throw new Error(`Unknown synthetic benchmark fixture ${JSON.stringify(name)}.`);
  }
}

function createSyntheticVisionGuardrailFixture(): SyntheticBenchmarkFixture {
  const tempDir = mkdtempSync(join(tmpdir(), 'weaver-benchmark-vision-guardrail-'));
  const sharedPath = join(tempDir, 'shared.xsl');
  const stylesheetPath = join(tempDir, 'main.xsl');
  const wrapperCount = 24;
  const generatedTemplateCount = 72;

  writeFileSync(sharedPath, createSyntheticSharedStylesheet(generatedTemplateCount), 'utf8');

  for (let index = 1; index <= wrapperCount; index += 1) {
    const wrapperPath = join(tempDir, `wrapper-${String(index).padStart(2, '0')}.xsl`);
    writeFileSync(
      wrapperPath,
      [
        '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:import href="shared.xsl"/>',
        '</xsl:stylesheet>',
      ].join('\n'),
      'utf8',
    );
  }

  const imports = Array.from({ length: wrapperCount }, (_, index) => {
    const fileName = `wrapper-${String(index + 1).padStart(2, '0')}.xsl`;
    return `  <xsl:import href="${fileName}"/>`;
  });

  const applyTargets = Array.from(
    { length: generatedTemplateCount },
    (_, index) => `node${String(index + 1).padStart(3, '0')}`,
  );

  writeFileSync(
    stylesheetPath,
    [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      ...imports,
      '  <xsl:template match="/">',
      '    <out>',
      `      <xsl:apply-templates select="/root/${applyTargets.join(' | /root/')}"/>`,
      '    </out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n'),
    'utf8',
  );

  return {
    stylesheetPaths: [stylesheetPath],
    cleanupDirs: [tempDir],
  };
}

function createSyntheticSharedStylesheet(generatedTemplateCount: number): string {
  const lines = [
    '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
    '  <xsl:template name="emitLabel">',
    '    <xsl:param name="label"/>',
    '    <label><xsl:value-of select="$label"/></label>',
    '  </xsl:template>',
    '  <xsl:template match="detail">',
    '    <detail><xsl:value-of select="."/></detail>',
    '  </xsl:template>',
    '  <xsl:template match="note">',
    '    <note><xsl:value-of select="."/></note>',
    '  </xsl:template>',
  ];

  for (let index = 1; index <= generatedTemplateCount; index += 1) {
    const name = `node${String(index).padStart(3, '0')}`;
    lines.push(`  <xsl:template match="${name}">`);
    lines.push('    <item>');
    lines.push(`      <name>${name}</name>`);
    lines.push('      <xsl:variable name="kind" select="@kind"/>');
    lines.push(
      '      <xsl:variable name="label" select="concat(name(), \'-\', position(), \'-\', string(@kind))"/>',
    );
    lines.push('      <xsl:choose>');
    lines.push('        <xsl:when test="@priority = \'high\'">');
    lines.push('          <xsl:call-template name="emitLabel">');
    lines.push('            <xsl:with-param name="label" select="$label"/>');
    lines.push('          </xsl:call-template>');
    lines.push('        </xsl:when>');
    lines.push('        <xsl:when test="detail">');
    lines.push('          <xsl:apply-templates select="detail"/>');
    lines.push('        </xsl:when>');
    lines.push('        <xsl:otherwise>');
    lines.push('          <xsl:value-of select="$kind"/>');
    lines.push('        </xsl:otherwise>');
    lines.push('      </xsl:choose>');
    lines.push('      <xsl:if test="note">');
    lines.push('        <xsl:apply-templates select="note"/>');
    lines.push('      </xsl:if>');
    lines.push('      <xsl:if test="@flag">');
    lines.push('        <flag><xsl:value-of select="@flag"/></flag>');
    lines.push('      </xsl:if>');
    lines.push('    </item>');
    lines.push('  </xsl:template>');
  }

  lines.push('</xsl:stylesheet>');
  return lines.join('\n');
}
