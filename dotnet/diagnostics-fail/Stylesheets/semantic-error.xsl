<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0">
  <!-- Call a non-existent template to produce a compiler diagnostic -->
  <xsl:template match="/">
    <xsl:call-template name="no-such-template"/>
  </xsl:template>
</xsl:stylesheet>
