import { describe, it } from 'vitest';

import { expectGeneratedFixtureToMatch } from './compile.support.js';

const FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><hello><xsl:value-of select="/root/name"/></hello></xsl:template></xsl:stylesheet>';
const CONDITIONAL_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><out><xsl:if test="/root/name = &apos;world&apos;"><yes/></xsl:if><xsl:choose><xsl:when test="/root/role = &apos;admin&apos;"><role>admin</role></xsl:when><xsl:otherwise><role>user</role></xsl:otherwise></xsl:choose></out></xsl:template></xsl:stylesheet>';
const RELATIVE_FIXTURE_STYLESHEET = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:value-of select="root/name"/>
            <xsl:if test="root/flag"><flagged/></xsl:if>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
const BOOLEAN_HELPERS_FIXTURE_STYLESHEET = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:if test="not(root/flag)"><missing/></xsl:if>
            <xsl:if test="true()"><always/></xsl:if>
            <xsl:if test="false()"><never/></xsl:if>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
const APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:apply-templates select="/root/item"/></items></xsl:template><xsl:template match="item"><item><xsl:value-of select="name"/></item></xsl:template></xsl:stylesheet>';

const FIXTURE_CASES = [
  { name: 'hello', path: 'hello.xsl', stylesheet: FIXTURE_STYLESHEET },
  { name: 'conditional', path: 'conditional.xsl', stylesheet: CONDITIONAL_FIXTURE_STYLESHEET },
  { name: 'relative', path: 'relative.xsl', stylesheet: RELATIVE_FIXTURE_STYLESHEET },
  { name: 'boolean-helpers', path: 'boolean-helpers.xsl', stylesheet: BOOLEAN_HELPERS_FIXTURE_STYLESHEET },
  { name: 'apply-templates', path: 'apply-templates.xsl', stylesheet: APPLY_TEMPLATES_FIXTURE_STYLESHEET },
] as const;

describe('XSLT codegen core generated fixtures', () => {
  for (const { name, path, stylesheet } of FIXTURE_CASES) {
    it(`matches the checked-in generated fixture for the ${name} stylesheet`, () => {
      expectGeneratedFixtureToMatch(stylesheet, path);
    });
  }
});