import { describe, expect, it } from 'vitest';

import { diagnosticReportFromError, formatDiagnostic } from '../../src/diagnostics/index.js';
import { compileStylesheetToTs, XsltProcessor } from '../../src/index.js';
import { captureError } from '../helpers/captureError.js';

import { compileAndLoadGeneratedModule } from './compile.support.js';

describe('codegen diagnostic parity', () => {
  it('matches interpreter static diagnostics for unsupported instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:copy-of select="/root/item"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceName = 'diagnostics-static.xsl';

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root><item>apple</item></root>');
    });
    const codegenError = captureError(() => {
      compileStylesheetToTs(stylesheet, { path: sourceName });
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(formatDiagnostic(interpreterReport, stylesheet));
  });

  it('matches interpreter runtime diagnostics for expression failures', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="&quot;tea&quot; + 1"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const input = '<root/>';
    const sourceName = 'diagnostics-runtime.xsl';
    const { exports } = compileAndLoadGeneratedModule(stylesheet, sourceName);
    const generatedModule = exports as {
      readonly transform: (sourceXml: string) => { readonly output: string };
    };

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input);
    });
    const codegenError = captureError(() => {
      generatedModule.transform(input);
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(codegenReport, '"tea" + 1')).toBe(formatDiagnostic(interpreterReport, '"tea" + 1'));
  });

  it('matches interpreter and direct-native runtime diagnostics for circular top-level variables', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:variable name="a" select="$b"/>',
      '  <xsl:variable name="b" select="$a"/>',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="$a"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const input = '<root/>';
    const sourceName = 'diagnostics-native-cycle-runtime.xsl';
    const { exports } = compileAndLoadGeneratedModule(stylesheet, sourceName);
    const generatedModule = exports as {
      readonly transform: (sourceXml: string) => { readonly output: string };
    };

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input);
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, { execution: 'native' });
    });
    const codegenError = captureError(() => {
      generatedModule.transform(input);
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(formatDiagnostic(interpreterReport, stylesheet));
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(formatDiagnostic(interpreterReport, stylesheet));
  });
});