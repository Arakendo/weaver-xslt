import { describe, it } from 'vitest';

import { expectRuntimeModuleToMatchInterpreter } from './compile.support.js';

const FOR_EACH_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:if test="flag"><flagged/></xsl:if></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><flagged/></xsl:when><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:if test="detail"><flagged/></xsl:if></xsl:when><xsl:otherwise><xsl:if test="vip"><vip/></xsl:if></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><xsl:choose><xsl:when test="flag"><xsl:choose><xsl:when test="detail"><flagged/></xsl:when><xsl:otherwise><brief/></xsl:otherwise></xsl:choose></xsl:when><xsl:otherwise><xsl:choose><xsl:when test="vip"><vip/></xsl:when><xsl:otherwise><plain/></xsl:otherwise></xsl:choose></xsl:otherwise></xsl:choose></item></xsl:for-each></items></xsl:template></xsl:stylesheet>';
const FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><details><xsl:apply-templates select="detail"/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';
const FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><items><xsl:for-each select="/root/item"><item><xsl:value-of select="name"/><details><xsl:apply-templates/></details></item></xsl:for-each></items></xsl:template><xsl:template match="detail"><detail><xsl:value-of select="."/></detail></xsl:template></xsl:stylesheet>';

const RUNTIME_CASES = [
  {
    name: 'native xsl:for-each module',
    path: 'for-each.xsl',
    stylesheet: FOR_EACH_FIXTURE_STYLESHEET,
    sourceXml: '<root><item><name>apple</name></item><item><name>pear</name></item></root>',
  },
  {
    name: 'native xsl:for-each body containing xsl:if',
    path: 'for-each-if.xsl',
    stylesheet: FOR_EACH_IF_FIXTURE_STYLESHEET,
    sourceXml: '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>',
  },
  {
    name: 'native xsl:for-each body containing xsl:choose',
    path: 'for-each-choose.xsl',
    stylesheet: FOR_EACH_CHOOSE_FIXTURE_STYLESHEET,
    sourceXml: '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>',
  },
  {
    name: 'native xsl:for-each body containing xsl:choose without xsl:otherwise',
    path: 'for-each-choose-no-otherwise.xsl',
    stylesheet: FOR_EACH_CHOOSE_NO_OTHERWISE_FIXTURE_STYLESHEET,
    sourceXml: '<root><item><name>apple</name><flag/></item><item><name>pear</name></item></root>',
  },
  {
    name: 'native xsl:for-each body containing xsl:choose with multiple xsl:when branches',
    path: 'for-each-choose-multi-when.xsl',
    stylesheet: FOR_EACH_CHOOSE_MULTI_WHEN_FIXTURE_STYLESHEET,
    sourceXml: '<root><item><name>apple</name><flag/></item><item><name>pear</name><vip/></item><item><name>plum</name></item></root>',
  },
  {
    name: 'native xsl:for-each body containing nested xsl:if bodies inside xsl:choose branches',
    path: 'for-each-choose-nested-if.xsl',
    stylesheet: FOR_EACH_CHOOSE_NESTED_IF_FIXTURE_STYLESHEET,
    sourceXml: '<root><item><name>apple</name><flag/><detail/></item><item><name>pear</name><vip/></item><item><name>plum</name><flag/></item></root>',
  },
  {
    name: 'native xsl:for-each body containing nested xsl:choose blocks inside xsl:choose branches',
    path: 'for-each-choose-nested-choose.xsl',
    stylesheet: FOR_EACH_CHOOSE_NESTED_CHOOSE_FIXTURE_STYLESHEET,
    sourceXml: '<root><item><name>apple</name><flag/><detail/></item><item><name>pear</name><flag/></item><item><name>plum</name><vip/></item><item><name>berry</name></item></root>',
  },
  {
    name: 'native for-each nested xsl:apply-templates stylesheet',
    path: 'for-each-apply-templates.xsl',
    stylesheet: FOR_EACH_APPLY_TEMPLATES_FIXTURE_STYLESHEET,
    sourceXml: '<root><item><name>apple</name><detail>fresh</detail><detail>green</detail></item><item><name>pear</name><detail>ripe</detail></item></root>',
  },
  {
    name: 'native for-each nested xsl:apply-templates stylesheet without select',
    path: 'for-each-apply-templates-default.xsl',
    stylesheet: FOR_EACH_APPLY_TEMPLATES_DEFAULT_FIXTURE_STYLESHEET,
    sourceXml: '<root><item><name>apple</name><detail>fresh</detail><detail>green</detail></item><item><name>pear</name><detail>ripe</detail></item></root>',
  },
] as const;

describe('XSLT codegen for-each runtime surface', () => {
  for (const { name, path, stylesheet, sourceXml } of RUNTIME_CASES) {
    it(`executes a ${name} through the runtime surface`, () => {
      expectRuntimeModuleToMatchInterpreter(stylesheet, path, sourceXml);
    });
  }
});