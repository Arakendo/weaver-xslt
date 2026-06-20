import { describe, expect, it } from 'vitest';

import { diagnosticReportFromError, formatDiagnostic } from '../../src/diagnostics/index.js';
import { compileStylesheetToTs, XsltProcessor } from '../../src/index.js';
import { captureError } from '../helpers/captureError.js';

import { NATIVE_DIRECT_PARITY_TAG, compileAndLoadGeneratedModule } from './compile.support.js';

describe('codegen diagnostic parity', () => {
  it('matches interpreter static diagnostics for unsupported compile-time instruction features', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/root/item" mode="special"/></out>',
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
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and codegen diagnostics for undeclared xsl:call-template targets`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="missing"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceName = 'diagnostics-native-call-template-missing.xsl';

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>');
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>', { execution: 'native' });
    });
    const codegenError = captureError(() => {
      compileStylesheetToTs(stylesheet, { path: sourceName });
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} preserves call-template typo suggestions under explicit native execution`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="mian"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceName = 'diagnostics-native-call-template-typo.xsl';

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>');
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>', { execution: 'native' });
    });
    const codegenError = captureError(() => {
      compileStylesheetToTs(stylesheet, { path: sourceName });
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and codegen diagnostics for undeclared xsl:call-template parameters`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target">',
      '      <xsl:with-param name="extra" select="1"/>',
      '    </xsl:call-template>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceName = 'diagnostics-native-call-template-extra-param.xsl';

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>');
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>', { execution: 'native' });
    });
    const codegenError = captureError(() => {
      compileStylesheetToTs(stylesheet, { path: sourceName });
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} preserves call-template parameter typo suggestions under explicit native execution`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <xsl:param name="value"/>',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target">',
      '      <xsl:with-param name="vaule" select="1"/>',
      '    </xsl:call-template>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceName = 'diagnostics-native-call-template-param-typo.xsl';

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>');
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>', { execution: 'native' });
    });
    const codegenError = captureError(() => {
      compileStylesheetToTs(stylesheet, { path: sourceName });
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and codegen diagnostics for missing required xsl:call-template parameters`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="target">',
      '    <xsl:param name="required" required="yes"/>',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="target"/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceName = 'diagnostics-native-call-template-missing-param.xsl';

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>');
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>', { execution: 'native' });
    });
    const codegenError = captureError(() => {
      compileStylesheetToTs(stylesheet, { path: sourceName });
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and codegen diagnostics for duplicate named templates`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '  <xsl:template name="main">',
      '    <other/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceName = 'diagnostics-native-duplicate-named-template.xsl';

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>');
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>', { execution: 'native' });
    });
    const codegenError = captureError(() => {
      compileStylesheetToTs(stylesheet, { path: sourceName });
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and codegen diagnostics for duplicate global bindings`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting"/>',
      '  <xsl:variable name="greeting" select="\'hi\'"/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceName = 'diagnostics-native-duplicate-global-binding.xsl';

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>');
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>', { execution: 'native' });
    });
    const codegenError = captureError(() => {
      compileStylesheetToTs(stylesheet, { path: sourceName });
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
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
    expect(formatDiagnostic(codegenReport, '"tea" + 1')).toBe(
      formatDiagnostic(interpreterReport, '"tea" + 1'),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and direct-native failures for malformed source XML`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const input = '<root>';
    const sourceName = 'diagnostics-native-malformed-input.xsl';
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
    expect(interpreterReport).toMatchObject({
      code: 'WEAVER_XML_SOURCE_PARSE_ERROR',
      phase: 'runtime',
      category: 'syntax',
      message: 'Source XML is not well-formed: unclosed xml tag(s): root.',
      primary: {
        uri: '<source-xml>',
        lineStart: 1,
        columnStart: 1,
      },
      suggestions: [
        {
          kind: 'fix',
          label: 'supply a well-formed XML source document',
          confidence: 1,
        },
      ],
    });
    expect(formatDiagnostic(nativeReport, input)).toBe(formatDiagnostic(interpreterReport, input));
    expect(formatDiagnostic(codegenReport, input)).toBe(formatDiagnostic(interpreterReport, input));
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and codegen diagnostics for malformed stylesheet XML`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '</xsl:stylesheet>',
    ].join('\n');
    const sourceName = 'diagnostics-native-malformed-stylesheet.xsl';

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>');
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform('<root/>', { execution: 'native' });
    });
    const codegenError = captureError(() => {
      compileStylesheetToTs(stylesheet, { path: sourceName });
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(interpreterReport).toMatchObject({
      code: 'WEAVER_XML_STYLESHEET_PARSE_ERROR',
      phase: 'compile',
      category: 'syntax',
      message:
        'Stylesheet XML is not well-formed: Opening and ending tag mismatch: "xsl:template" != "xsl:stylesheet".',
      primary: {
        uri: sourceName,
        lineStart: 2,
        columnStart: 27,
      },
      suggestions: [
        {
          kind: 'fix',
          label: 'fix the XML well-formedness error in the stylesheet document',
          confidence: 1,
        },
      ],
    });
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and direct-native diagnostics when initialTemplate is missing from a native root-match plan`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const input = '<root/>';
    const options = {
      initialTemplate: 'main',
    };
    const sourceName = 'diagnostics-native-missing-initial-template-root-match.xsl';
    const { exports } = compileAndLoadGeneratedModule(stylesheet, sourceName);
    const generatedModule = exports as {
      readonly transform: (sourceXml: string, ctx?: typeof options) => { readonly output: string };
    };

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, options);
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, {
        ...options,
        execution: 'native',
      });
    });
    const codegenError = captureError(() => {
      generatedModule.transform(input, options);
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and direct-native runtime diagnostics for circular top-level variables`, () => {
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
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and direct-native runtime diagnostics for missing required stylesheet parameters`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting" required="yes"/>',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const input = '<root/>';
    const sourceName = 'diagnostics-native-required-param-runtime.xsl';
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
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} preserves missing required stylesheet parameter suggestions when transform options use a typo`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting" required="yes"/>',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const input = '<root/>';
    type RuntimeOptions = {
      readonly parameters: {
        readonly greting: string;
      };
    };
    const options: RuntimeOptions = {
      parameters: {
        greting: 'hello',
      },
    };
    const sourceName = 'diagnostics-native-required-param-typo-runtime.xsl';
    const { exports } = compileAndLoadGeneratedModule(stylesheet, sourceName);
    const generatedModule = exports as {
      readonly transform: (
        sourceXml: string,
        options?: RuntimeOptions,
      ) => { readonly output: string };
    };

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, options);
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, {
        ...options,
        execution: 'native',
      });
    });
    const codegenError = captureError(() => {
      generatedModule.transform(input, options);
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and direct-native runtime diagnostics for missing required template parameters`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" required="yes"/>',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const input = '<root/>';
    const options = {
      initialTemplate: 'main',
    };
    const sourceName = 'diagnostics-native-required-template-param-runtime.xsl';
    const { exports } = compileAndLoadGeneratedModule(stylesheet, sourceName);
    const generatedModule = exports as {
      readonly transform: (sourceXml: string, ctx?: typeof options) => { readonly output: string };
    };

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, options);
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, {
        ...options,
        execution: 'native',
      });
    });
    const codegenError = captureError(() => {
      generatedModule.transform(input, options);
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and direct-native diagnostics for invalid initialTemplate names`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const input = '<root/>';
    const options = {
      initialTemplate: 'mian',
    };
    const sourceName = 'diagnostics-native-invalid-initial-template.xsl';
    const { exports } = compileAndLoadGeneratedModule(stylesheet, sourceName);
    const generatedModule = exports as {
      readonly transform: (sourceXml: string, ctx?: typeof options) => { readonly output: string };
    };

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, options);
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, {
        ...options,
        execution: 'native',
      });
    });
    const codegenError = captureError(() => {
      generatedModule.transform(input, options);
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} matches interpreter and direct-native diagnostics for unsupported initialMode options`, () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const input = '<root/>';
    const options = {
      initialMode: 'special',
    };
    const sourceName = 'diagnostics-native-initial-mode.xsl';
    const { exports } = compileAndLoadGeneratedModule(stylesheet, sourceName);
    const generatedModule = exports as {
      readonly transform: (sourceXml: string, ctx?: typeof options) => { readonly output: string };
    };

    const interpreterError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, options);
    });
    const nativeError = captureError(() => {
      new XsltProcessor(stylesheet, { sourceName }).transform(input, {
        ...options,
        execution: 'native',
      });
    });
    const codegenError = captureError(() => {
      generatedModule.transform(input, options);
    });

    const interpreterReport = diagnosticReportFromError(interpreterError);
    const nativeReport = diagnosticReportFromError(nativeError);
    const codegenReport = diagnosticReportFromError(codegenError);

    expect(nativeReport).toEqual(interpreterReport);
    expect(codegenReport).toEqual(interpreterReport);
    expect(formatDiagnostic(nativeReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
    expect(formatDiagnostic(codegenReport, stylesheet)).toBe(
      formatDiagnostic(interpreterReport, stylesheet),
    );
  });
});
