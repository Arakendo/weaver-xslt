import { describe, it } from 'vitest';

import { expectGeneratedFixtureToMatch } from './compile.support.js';

const MATCHED_ROOT_FIXTURE_STYLESHEET = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="name"/>
            <xsl:if test="flag"><flagged/></xsl:if>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
const MATCHED_ROOT_FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:if test="detail"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="detail"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates select="detail"/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section/item"><item><xsl:value-of select="name"/><xsl:if test="flag"><flagged/></xsl:if></item></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:if test="detail"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="detail"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates select="detail"/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const MATCHED_NESTED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/root/section"><items><xsl:for-each select="item"><item><xsl:value-of select="name"/><details><xsl:apply-templates/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';

const FIXTURE_CASES = [
  { name: 'matched-root', path: 'matched-root.xsl', stylesheet: MATCHED_ROOT_FIXTURE_STYLESHEET },
  { name: 'matched-root-for-each', path: 'matched-root-for-each.xsl', stylesheet: MATCHED_ROOT_FOR_EACH_FIXTURE_STYLESHEET },
  { name: 'matched-root-for-each-choose', path: 'matched-root-for-each-choose.xsl', stylesheet: MATCHED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET },
  { name: 'matched-root-for-each-choose-no-otherwise', path: 'matched-root-for-each-choose-no-otherwise.xsl', stylesheet: MATCHED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET },
  { name: 'matched-root-for-each-choose-multi-when', path: 'matched-root-for-each-choose-multi-when.xsl', stylesheet: MATCHED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET },
  { name: 'matched-root-for-each-choose-nested-if', path: 'matched-root-for-each-choose-nested-if.xsl', stylesheet: MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET },
  { name: 'matched-root-for-each-choose-nested-choose', path: 'matched-root-for-each-choose-nested-choose.xsl', stylesheet: MATCHED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET },
  { name: 'matched-root-for-each-apply-templates', path: 'matched-root-for-each-apply-templates.xsl', stylesheet: MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET },
  { name: 'matched-root-for-each-apply-templates-default', path: 'matched-root-for-each-apply-templates-default.xsl', stylesheet: MATCHED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET },
  { name: 'matched-nested-root-for-each', path: 'matched-nested-root-for-each.xsl', stylesheet: MATCHED_NESTED_ROOT_FOR_EACH_FIXTURE_STYLESHEET },
  { name: 'matched-nested-root-for-each-choose', path: 'matched-nested-root-for-each-choose.xsl', stylesheet: MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_FIXTURE_STYLESHEET },
  { name: 'matched-nested-root-for-each-choose-no-otherwise', path: 'matched-nested-root-for-each-choose-no-otherwise.xsl', stylesheet: MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET },
  { name: 'matched-nested-root-for-each-choose-multi-when', path: 'matched-nested-root-for-each-choose-multi-when.xsl', stylesheet: MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET },
  { name: 'matched-nested-root-for-each-choose-nested-if', path: 'matched-nested-root-for-each-choose-nested-if.xsl', stylesheet: MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET },
  { name: 'matched-nested-root-for-each-choose-nested-choose', path: 'matched-nested-root-for-each-choose-nested-choose.xsl', stylesheet: MATCHED_NESTED_ROOT_FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET },
  { name: 'matched-nested-root-for-each-apply-templates', path: 'matched-nested-root-for-each-apply-templates.xsl', stylesheet: MATCHED_NESTED_ROOT_FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET },
  { name: 'matched-nested-root-for-each-apply-templates-default', path: 'matched-nested-root-for-each-apply-templates-default.xsl', stylesheet: MATCHED_NESTED_ROOT_FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET },
  { name: 'matched-nested-root', path: 'matched-nested-root.xsl', stylesheet: MATCHED_NESTED_ROOT_FIXTURE_STYLESHEET },
] as const;

describe('XSLT codegen matched-root fixtures', () => {
  for (const { name, path, stylesheet } of FIXTURE_CASES) {
    it(`matches the checked-in generated fixture for the ${name} stylesheet`, () => {
      expectGeneratedFixtureToMatch(stylesheet, path);
    });
  }
});