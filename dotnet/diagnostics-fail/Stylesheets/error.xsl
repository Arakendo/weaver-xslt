<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0">
  <!-- Intentionally include a missing file to trigger a diagnostics error -->
  <xsl:include href="missing.xsl"/>

  <xsl:template match="/">
    <root/>
  </xsl:template>
</xsl:stylesheet>
