import { describe, expect, it } from 'vitest';

import { diagnosticReportFromError, formatDiagnostic, assertValidDiagnostic } from '../../src/diagnostics/index.js';
import { XsltProcessor } from '../../src/index.js';

function captureError(action: () => void): unknown {
  try {
    action();
    throw new Error('Expected the action to throw.');
  } catch (error) {
    return error;
  }
}

describe('XSLT diagnostics', () => {
  it('converts unsupported xsl:import declarations into XTSE0165 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:import href="base.xsl"/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0165',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet import declarations are not yet implemented in the current MVP+3 slice.',
      details: [{
        key: 'href',
        value: 'base.xsl',
      }],
      primary: {
        lineStart: 2,
        columnStart: 21,
        lineEnd: 2,
        columnEnd: 29,
      },
      suggestions: [{
        kind: 'fix',
        label: 'inline or remove xsl:import in the current MVP+3 slice',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0165]: Stylesheet import declarations are not yet implemented in the current MVP+3 slice.',
      '--> <stylesheet>:2:21',
      '2 |   <xsl:import href="base.xsl"/>',
      '  |                     ^^^^^^^^',
      '  = href: base.xsl',
      '  help: inline or remove xsl:import in the current MVP+3 slice',
    ].join('\n'));
  });

  it('converts unsupported xsl:include declarations into XTSE0165 diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:include href="common.xsl"/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0165',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet include declarations are not yet implemented in the current MVP+3 slice.',
      details: [{
        key: 'href',
        value: 'common.xsl',
      }],
      primary: {
        lineStart: 2,
        columnStart: 22,
        lineEnd: 2,
        columnEnd: 32,
      },
      suggestions: [{
        kind: 'fix',
        label: 'inline or remove xsl:include in the current MVP+3 slice',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0165]: Stylesheet include declarations are not yet implemented in the current MVP+3 slice.',
      '--> <stylesheet>:2:22',
      '2 |   <xsl:include href="common.xsl"/>',
      '  |                      ^^^^^^^^^^',
      '  = href: common.xsl',
      '  help: inline or remove xsl:include in the current MVP+3 slice',
    ].join('\n'));
  });

  it('converts missing initialTemplate options into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Initial template main is not declared in the current stylesheet.',
      details: [{
        key: 'initialTemplate',
        value: 'main',
      }],
      suggestions: [{
        kind: 'fix',
        label: 'declare xsl:template name="main" or omit initialTemplate',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Initial template main is not declared in the current stylesheet.',
      '  = initialTemplate: main',
      '  help: declare xsl:template name="main" or omit initialTemplate',
    ].join('\n'));
  });

  it('converts unsupported initialMode options into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialMode: 'special' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTDE0040',
      phase: 'runtime',
      category: 'execution',
      message: 'Initial modes are not yet implemented in the current MVP+3 slice.',
      details: [{
        key: 'mode',
        value: 'special',
      }],
      suggestions: [{
        kind: 'fix',
        label: 'omit initialMode and use the default mode in the current MVP+3 slice',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTDE0040]: Initial modes are not yet implemented in the current MVP+3 slice.',
      '  = mode: special',
      '  help: omit initialMode and use the default mode in the current MVP+3 slice',
    ].join('\n'));
  });

  it('converts required xsl:param declarations with select attributes into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" select="\'hello\'" required="yes"/>',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:param with required="yes" cannot also specify a select attribute.',
      details: [{
        key: 'paramName',
        value: 'greeting',
      }],
      suggestions: [{
        kind: 'fix',
        label: 'remove required="yes" or remove select="..." from xsl:param',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:param with required="yes" cannot also specify a select attribute.',
      '--> <stylesheet>:3:59',
      '3 |     <xsl:param name="greeting" select="\'hello\'" required="yes"/>',
      '  |                                                           ^^^',
      '  = paramName: greeting',
      '  help: remove required="yes" or remove select="..." from xsl:param',
    ].join('\n'));
  });

  it('converts required xsl:param declarations with content into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" required="yes">hello</xsl:param>',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:param with required="yes" cannot also specify a sequence constructor.',
      details: [{
        key: 'paramName',
        value: 'greeting',
      }],
      suggestions: [{
        kind: 'fix',
        label: 'remove required="yes" or remove xsl:param content',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:param with required="yes" cannot also specify a sequence constructor.',
      '--> <stylesheet>:3:42',
      '3 |     <xsl:param name="greeting" required="yes">hello</xsl:param>',
      '  |                                          ^^^',
      '  = paramName: greeting',
      '  help: remove required="yes" or remove xsl:param content',
    ].join('\n'));
  });

  it('converts xsl:param declarations with select attributes and content into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" select="\'hello\'">ignored</xsl:param>',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:param cannot specify both a select attribute and a sequence constructor.',
      details: [{
        key: 'paramName',
        value: 'greeting',
      }],
      suggestions: [{
        kind: 'fix',
        label: 'remove select="..." or remove xsl:param content',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:param cannot specify both a select attribute and a sequence constructor.',
      '--> <stylesheet>:3:40',
      '3 |     <xsl:param name="greeting" select="\'hello\'">ignored</xsl:param>',
      '  |                                        ^^^^^^^',
      '  = paramName: greeting',
      '  help: remove select="..." or remove xsl:param content',
    ].join('\n'));
  });

  it('converts top-level xsl:variable declarations with select attributes and content into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:variable name="greeting" select="\'hello\'">ignored</xsl:variable>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:variable cannot specify both a select attribute and a sequence constructor.',
      details: [{
        key: 'variableName',
        value: 'greeting',
      }],
      suggestions: [{
        kind: 'fix',
        label: 'remove select="..." or remove xsl:variable content',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:variable cannot specify both a select attribute and a sequence constructor.',
      '--> <stylesheet>:2:41',
      '2 |   <xsl:variable name="greeting" select="\'hello\'">ignored</xsl:variable>',
      '  |                                         ^^^^^^^',
      '  = variableName: greeting',
      '  help: remove select="..." or remove xsl:variable content',
    ].join('\n'));
  });

  it('converts xsl:with-param instructions with select attributes and content into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <xsl:call-template name="main">',
      '      <xsl:with-param name="greeting" select="\'hello\'">ignored</xsl:with-param>',
      '    </xsl:call-template>',
      '  </xsl:template>',
      '  <xsl:template name="main">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'xsl:with-param cannot specify both a select attribute and a sequence constructor.',
      details: [{
        key: 'paramName',
        value: 'greeting',
      }],
      suggestions: [{
        kind: 'fix',
        label: 'remove select="..." or remove xsl:with-param content',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:with-param cannot specify both a select attribute and a sequence constructor.',
      '--> <stylesheet>:4:47',
      '4 |       <xsl:with-param name="greeting" select="\'hello\'">ignored</xsl:with-param>',
      '  |                                               ^^^^^^^',
      '  = paramName: greeting',
      '  help: remove select="..." or remove xsl:with-param content',
    ].join('\n'));
  });

  it('converts missing required stylesheet parameters into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:param name="greeting" required="yes"/>',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTDE0050',
      phase: 'runtime',
      category: 'execution',
      message: 'Required stylesheet parameter $greeting was not supplied.',
      details: [{
        key: 'parameterName',
        value: 'greeting',
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTDE0050]: Required stylesheet parameter $greeting was not supplied.',
      '--> <stylesheet>:2:20',
      '2 |   <xsl:param name="greeting" required="yes"/>',
      '  |                    ^^^^^^^^',
      '  in instruction xsl:param name="greeting" (<stylesheet>:2:20)',
      'related:',
      '  top-level param (<stylesheet>:2:20)',
      '  = parameterName: greeting',
    ].join('\n'));
  });

  it('converts missing required template parameters into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <xsl:param name="greeting" required="yes"/>',
      '    <out><xsl:value-of select="$greeting"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' });
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTDE0700',
      phase: 'runtime',
      category: 'execution',
      message: 'Required template parameter $greeting was not supplied.',
      details: [{
        key: 'parameterName',
        value: 'greeting',
      }],
      frames: [{
        kind: 'template',
        label: 'name="main"',
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTDE0700]: Required template parameter $greeting was not supplied.',
      '--> <stylesheet>:3:22',
      '3 |     <xsl:param name="greeting" required="yes"/>',
      '  |                      ^^^^^^^^',
      '  in template name="main" (<stylesheet>:2:23)',
      'related:',
      '  initial template (<stylesheet>:2:23)',
      '  = parameterName: greeting',
    ].join('\n'));
  });

  it('allows named-only templates when selected via initialTemplate', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template name="main">',
      '    <out><xsl:value-of select="name(/root)"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    expect(new XsltProcessor(stylesheet).transform('<root/>', { initialTemplate: 'main' })).toEqual({
      output: '<out>root</out>',
    });
  });

  it('converts unsupported top-level literal result elements into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <out/>',
      '  <xsl:template match="/">',
      '    <ok/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Unsupported top-level stylesheet element out in current MVP+3 slice.',
      details: [{
        key: 'elementName',
        value: 'out',
      }],
      suggestions: [{
        kind: 'fix',
        label: 'move result elements inside xsl:template bodies in the current MVP+3 slice',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Unsupported top-level stylesheet element out in current MVP+3 slice.',
      '--> <stylesheet>:2:4',
      '2 |   <out/>',
      '  |    ^^^',
      '  = elementName: out',
      '  help: move result elements inside xsl:template bodies in the current MVP+3 slice',
    ].join('\n'));
  });

  it('converts unsupported top-level XSLT declarations into static diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:decimal-format name="comma" decimal-separator=","/>',
      '  <xsl:template match="/">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Unsupported top-level XSLT declaration xsl:decimal-format in current MVP+3 slice.',
      details: [{
        key: 'declarationName',
        value: 'xsl:decimal-format',
      }],
      suggestions: [{
        kind: 'fix',
        label: 'remove unsupported top-level declaration xsl:decimal-format in the current MVP+3 slice',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Unsupported top-level XSLT declaration xsl:decimal-format in current MVP+3 slice.',
      '--> <stylesheet>:2:4',
      '2 |   <xsl:decimal-format name="comma" decimal-separator=","/>',
      '  |    ^^^^^^^^^^^^^^^^^^',
      '  = declarationName: xsl:decimal-format',
      '  help: remove unsupported top-level declaration xsl:decimal-format in the current MVP+3 slice',
    ].join('\n'));
  });

  it('uses the version attribute span when the stylesheet version is empty', () => {
    const stylesheet = '<xsl:stylesheet version="" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0500',
      primary: {
        lineStart: 1,
        columnStart: 26,
        lineEnd: 1,
        columnEnd: 26,
      },
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0500]: Stylesheet module must declare a version attribute.',
      '--> <stylesheet>:1:26',
      '1 | <xsl:stylesheet version="" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>',
      '  |                          ^',
      '  help: add version="3.0" to the stylesheet document element',
    ].join('\n'));
  });

  it('converts a missing stylesheet version into XTSE0500', () => {
    const stylesheet = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0500',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet module must declare a version attribute.',
      suggestions: [{
        kind: 'fix',
        label: 'add version="3.0" to the stylesheet document element',
        replacement: 'version="3.0"',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0500]: Stylesheet module must declare a version attribute.',
      '--> <stylesheet>:1:1',
      '1 | <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>',
      '  | ^',
      '  help: add version="3.0" to the stylesheet document element',
    ].join('\n'));
  });

  it('converts an empty stylesheet source into a static diagnostic', () => {
    const stylesheet = '';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XTSE0010',
      phase: 'compile',
      category: 'analysis',
      message: 'Stylesheet source is empty.',
      suggestions: [{
        kind: 'fix',
        label: 'provide an xsl:stylesheet or xsl:transform document before running the transform',
        confidence: 1,
      }],
    });

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Stylesheet source is empty.',
      '  help: provide an xsl:stylesheet or xsl:transform document before running the transform',
    ].join('\n'));
  });

  it('adds a suggestion when the stylesheet root is not xsl:stylesheet', () => {
    const stylesheet = '<out/>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'wrap the stylesheet in an xsl:stylesheet or xsl:transform document element',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Stylesheet document element must be xsl:stylesheet or xsl:transform.',
      '--> <stylesheet>:1:1',
      '1 | <out/>',
      '  | ^',
      '  help: wrap the stylesheet in an xsl:stylesheet or xsl:transform document element',
    ].join('\n'));
  });

  it('adds a suggestion when a stylesheet has no templates', () => {
    const stylesheet = '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>';
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'add at least one xsl:template to the stylesheet',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Stylesheet must declare at least one xsl:template.',
      '--> <stylesheet>:1:1',
      '1 | <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>',
      '  | ^',
      '  help: add at least one xsl:template to the stylesheet',
    ].join('\n'));
  });

  it('adds a suggestion for unsupported template match patterns', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="item[@id]">',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item id="1"/></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'use one of the currently supported simple match patterns: /, /name, name, *, node(), or text()',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Unsupported template match pattern "item[@id]" in current MVP+3 slice.',
      '--> <stylesheet>:2:24',
      '2 |   <xsl:template match="item[@id]">',
      '  |                        ^^^^^^^^^',
      '  help: use one of the currently supported simple match patterns: /, /name, name, *, node(), or text()',
    ].join('\n'));
  });

  it('adds a suggestion when xsl:template is missing match and name', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template>',
      '    <out/>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'add match="..." or name="..." to xsl:template',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:template must declare either match or name.',
      '--> <stylesheet>:2:3',
      '2 |   <xsl:template>',
      '  |   ^',
      '  help: add match="..." or name="..." to xsl:template',
    ].join('\n'));
  });

  it('adds a suggestion when xsl:apply-templates uses mode', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/root/item" mode="special"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'remove mode="..." and use the default mode in the current MVP+3 slice',
        replacement: 'mode',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:apply-templates mode is not yet implemented in the current MVP+3 slice.',
      '--> <stylesheet>:3:57',
      '3 |     <out><xsl:apply-templates select="/root/item" mode="special"/></out>',
      '  |                                                         ^^^^^^^',
      '  help: remove mode="..." and use the default mode in the current MVP+3 slice',
    ].join('\n'));
  });

  it('adds a suggestion when xsl:value-of is missing select', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'add a select="..." attribute to xsl:value-of',
        replacement: 'select="..."',
        confidence: 1,
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: xsl:value-of requires a select attribute.',
      '--> <stylesheet>:3:10',
      '3 |     <out><xsl:value-of/></out>',
      '  |          ^',
      '  help: add a select="..." attribute to xsl:value-of',
    ].join('\n'));
  });

  it('adds a suggestion for near-miss unsupported XSLT instructions', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:vale-of select="/root/item"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.suggestions).toEqual([
      {
        kind: 'fix',
        label: 'did you mean xsl:value-of?',
        replacement: 'xsl:value-of',
        confidence: expect.any(Number),
      },
    ]);
    expect(report.details).toEqual([
      {
        key: 'instructionName',
        value: 'xsl:vale-of',
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Unsupported XSLT instruction xsl:vale-of in current MVP+3 slice.',
      '--> <stylesheet>:3:11',
      '3 |     <out><xsl:vale-of select="/root/item"/></out>',
      '  |           ^^^^^^^^^^^',
      '  = instructionName: xsl:vale-of',
      '  help: did you mean xsl:value-of?',
    ].join('\n'));
  });

  it('converts unsupported XSLT instructions into static diagnostics with stylesheet spans', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:copy-of select="/root/item"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchInlineSnapshot(`
      {
        "category": "analysis",
        "causes": [],
        "code": "XTSE0010",
        "details": [
          {
            "key": "instructionName",
            "value": "xsl:copy-of",
          },
        ],
        "frames": [],
        "message": "Unsupported XSLT instruction xsl:copy-of in current MVP+3 slice.",
        "phase": "compile",
        "primary": {
          "columnEnd": 22,
          "columnStart": 11,
          "lineEnd": 3,
          "lineStart": 3,
          "offsetEnd": 128,
          "offsetStart": 117,
          "uri": "<stylesheet>",
        },
        "related": [],
        "severity": "error",
        "suggestions": [],
      }
    `);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XTSE0010]: Unsupported XSLT instruction xsl:copy-of in current MVP+3 slice.',
      '--> <stylesheet>:3:11',
      '3 |     <out><xsl:copy-of select="/root/item"/></out>',
      '  |           ^^^^^^^^^^^',
      '  = instructionName: xsl:copy-of',
    ].join('\n'));
  });

  it('wraps xsl:value-of runtime failures with template and instruction frames', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="&quot;tea&quot; + 1"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.frames).toEqual([
      {
        kind: 'template',
        label: 'match="/"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        kind: 'instruction',
        label: 'xsl:value-of select=""tea" + 1"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 138,
          offsetEnd: 157,
          lineStart: 3,
          columnStart: 32,
          lineEnd: 3,
          columnEnd: 51,
        },
      },
    ]);
    expect(report.related).toEqual([
      {
        label: 'enclosing template',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        label: 'containing instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 138,
          offsetEnd: 157,
          lineStart: 3,
          columnStart: 32,
          lineEnd: 3,
          columnEnd: 51,
        },
      },
    ]);
    expect(report).toMatchInlineSnapshot(`
      {
        "category": "type",
        "causes": [
          {
            "category": "type",
            "causes": [],
            "code": "XPTY0004",
            "details": [
              {
                "key": "expectedType",
                "value": "xs:double or xs:integer",
              },
              {
                "key": "actualType",
                "value": "xs:string",
              },
            ],
            "frames": [],
            "message": "Expected a single numeric value.",
            "phase": "runtime",
            "primary": {
              "columnEnd": 6,
              "columnStart": 1,
              "lineEnd": 1,
              "lineStart": 1,
              "offsetEnd": 5,
              "offsetStart": 0,
              "uri": "<xpath>",
            },
            "related": [],
            "severity": "error",
            "suggestions": [],
          },
        ],
        "code": "XPTY0004",
        "details": [
          {
            "key": "expectedType",
            "value": "xs:double or xs:integer",
          },
          {
            "key": "actualType",
            "value": "xs:string",
          },
        ],
        "frames": [
          {
            "kind": "template",
            "label": "match=\"/\"",
            "span": {
              "columnEnd": 25,
              "columnStart": 24,
              "lineEnd": 2,
              "lineStart": 2,
              "offsetEnd": 104,
              "offsetStart": 103,
              "uri": "<stylesheet>",
            },
          },
          {
            "kind": "instruction",
            "label": "xsl:value-of select=\"\"tea\" + 1\"",
            "span": {
              "columnEnd": 51,
              "columnStart": 32,
              "lineEnd": 3,
              "lineStart": 3,
              "offsetEnd": 157,
              "offsetStart": 138,
              "uri": "<stylesheet>",
            },
          },
        ],
        "message": "Expected a single numeric value.",
        "phase": "runtime",
        "primary": {
          "columnEnd": 6,
          "columnStart": 1,
          "lineEnd": 1,
          "lineStart": 1,
          "offsetEnd": 5,
          "offsetStart": 0,
          "uri": "<xpath>",
        },
        "related": [
          {
            "label": "enclosing template",
            "span": {
              "columnEnd": 25,
              "columnStart": 24,
              "lineEnd": 2,
              "lineStart": 2,
              "offsetEnd": 104,
              "offsetStart": 103,
              "uri": "<stylesheet>",
            },
          },
          {
            "label": "containing instruction",
            "span": {
              "columnEnd": 51,
              "columnStart": 32,
              "lineEnd": 3,
              "lineStart": 3,
              "offsetEnd": 157,
              "offsetStart": 138,
              "uri": "<stylesheet>",
            },
          },
        ],
        "severity": "error",
        "suggestions": [],
      }
    `);

    expect(formatDiagnostic(report, '"tea" + 1')).toBe([
      'error[XPTY0004]: Expected a single numeric value.',
      '--> <xpath>:1:1',
      '1 | "tea" + 1',
      '  | ^^^^^',
      '  in template match="/" (<stylesheet>:2:24)',
      '  in instruction xsl:value-of select=""tea" + 1" (<stylesheet>:3:32)',
      'related:',
      '  enclosing template (<stylesheet>:2:24)',
      '  containing instruction (<stylesheet>:3:32)',
      '  = expectedType: xs:double or xs:integer',
      '  = actualType: xs:string',
    ].join('\n'));
  });

  it('converts non-node xsl:apply-templates selections into runtime diagnostics', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="1"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root/>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report).toMatchObject({
      code: 'XPTY0004',
      phase: 'runtime',
      category: 'type',
      message: 'xsl:apply-templates requires a sequence of nodes.',
      primary: {
        lineStart: 3,
        columnStart: 39,
        lineEnd: 3,
        columnEnd: 40,
      },
      details: [
        { key: 'expectedType', value: 'node()*' },
        { key: 'actualType', value: 'xs:double' },
      ],
      suggestions: [{
        kind: 'fix',
        label: 'use a node-selecting expression for xsl:apply-templates',
        confidence: 1,
      }],
    });
    expect(report.frames).toEqual([
      {
        kind: 'template',
        label: 'match="/"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        kind: 'instruction',
        label: 'xsl:apply-templates select="1"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 145,
          offsetEnd: 146,
          lineStart: 3,
          columnStart: 39,
          lineEnd: 3,
          columnEnd: 40,
        },
      },
    ]);
    expect(report.related).toEqual([
      {
        label: 'enclosing template',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        label: 'caller instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 145,
          offsetEnd: 146,
          lineStart: 3,
          columnStart: 39,
          lineEnd: 3,
          columnEnd: 40,
        },
      },
    ]);

    expect(formatDiagnostic(report, stylesheet)).toBe([
      'error[XPTY0004]: xsl:apply-templates requires a sequence of nodes.',
      '--> <stylesheet>:3:39',
      '3 |     <out><xsl:apply-templates select="1"/></out>',
      '  |                                       ^',
      '  in template match="/" (<stylesheet>:2:24)',
      '  in instruction xsl:apply-templates select="1" (<stylesheet>:3:39)',
      'related:',
      '  enclosing template (<stylesheet>:2:24)',
      '  caller instruction (<stylesheet>:3:39)',
      '  = expectedType: node()*',
      '  = actualType: xs:double',
      '  help: use a node-selecting expression for xsl:apply-templates',
    ].join('\n'));
  });

  it('preserves the caller chain through xsl:apply-templates', () => {
    const stylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/root/item"/></out>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <item><xsl:value-of select="&quot;tea&quot; + 1"/></item>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const error = captureError(() => {
      new XsltProcessor(stylesheet).transform('<root><item>apple</item></root>');
    });
    const report = diagnosticReportFromError(error);

    assertValidDiagnostic(report);
    expect(report.frames).toEqual([
      {
        kind: 'template',
        label: 'match="/"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        kind: 'instruction',
        label: 'xsl:apply-templates select="/root/item"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 145,
          offsetEnd: 155,
          lineStart: 3,
          columnStart: 39,
          lineEnd: 3,
          columnEnd: 49,
        },
      },
      {
        kind: 'template',
        label: 'match="item"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 206,
          offsetEnd: 210,
          lineStart: 5,
          columnStart: 24,
          lineEnd: 5,
          columnEnd: 28,
        },
      },
      {
        kind: 'instruction',
        label: 'xsl:value-of select=""tea" + 1"',
        span: {
          uri: '<stylesheet>',
          offsetStart: 245,
          offsetEnd: 264,
          lineStart: 6,
          columnStart: 33,
          lineEnd: 6,
          columnEnd: 52,
        },
      },
    ]);
    expect(report.related).toEqual([
      {
        label: 'enclosing template',
        span: {
          uri: '<stylesheet>',
          offsetStart: 103,
          offsetEnd: 104,
          lineStart: 2,
          columnStart: 24,
          lineEnd: 2,
          columnEnd: 25,
        },
      },
      {
        label: 'caller instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 145,
          offsetEnd: 155,
          lineStart: 3,
          columnStart: 39,
          lineEnd: 3,
          columnEnd: 49,
        },
      },
      {
        label: 'enclosing template',
        span: {
          uri: '<stylesheet>',
          offsetStart: 206,
          offsetEnd: 210,
          lineStart: 5,
          columnStart: 24,
          lineEnd: 5,
          columnEnd: 28,
        },
      },
      {
        label: 'containing instruction',
        span: {
          uri: '<stylesheet>',
          offsetStart: 245,
          offsetEnd: 264,
          lineStart: 6,
          columnStart: 33,
          lineEnd: 6,
          columnEnd: 52,
        },
      },
    ]);
    expect(report.causes).toHaveLength(1);
    expect(report.causes[0]).toMatchObject({
      code: 'XPTY0004',
      frames: [],
    });

    expect(formatDiagnostic(report, '"tea" + 1')).toBe([
      'error[XPTY0004]: Expected a single numeric value.',
      '--> <xpath>:1:1',
      '1 | "tea" + 1',
      '  | ^^^^^',
      '  in template match="/" (<stylesheet>:2:24)',
      '  in instruction xsl:apply-templates select="/root/item" (<stylesheet>:3:39)',
      '  in template match="item" (<stylesheet>:5:24)',
      '  in instruction xsl:value-of select=""tea" + 1" (<stylesheet>:6:33)',
      'related:',
      '  enclosing template (<stylesheet>:2:24)',
      '  caller instruction (<stylesheet>:3:39)',
      '  enclosing template (<stylesheet>:5:24)',
      '  containing instruction (<stylesheet>:6:33)',
      '  = expectedType: xs:double or xs:integer',
      '  = actualType: xs:string',
    ].join('\n'));
  });
});