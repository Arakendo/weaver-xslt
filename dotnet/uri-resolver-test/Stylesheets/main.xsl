<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0">
  <xsl:import href="imported.xsl"/>
  <xsl:include href="included.xsl"/>

  <xsl:template match="/">
    <root>
      <xsl:copy-of select="document('data/doc.xml')/doc"/>
      <xsl:call-template name="from-included"/>
      <xsl:call-template name="from-imported"/>
    </root>
  </xsl:template>
</xsl:stylesheet>
