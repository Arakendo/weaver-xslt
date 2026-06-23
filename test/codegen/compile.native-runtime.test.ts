import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

import { compileStylesheetToTs } from '../../src/compile.js';
import { XsltProcessor } from '../../src/index.js';

import {
  NATIVE_DIRECT_PARITY_TAG,
  compileAndLoadGeneratedModule,
  expectNativeRuntimeParity,
} from './compile.support.js';

describe('XSLT codegen MVP4 slice', () => {
  it('executes native temporary-tree local variable bindings through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:variable name="tree">
              <label><xsl:value-of select="name()"/></label>
            </xsl:variable>
            <xsl:value-of select="$tree/label"/>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(stylesheet, 'temporary-tree-local-variable.xsl', '<root/>');
  });

  it('executes native temporary-tree top-level bindings through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:param name="tree">
          <label>default</label>
        </xsl:param>
        <xsl:variable name="outer">
          <value><xsl:value-of select="$tree/label"/></value>
        </xsl:variable>
        <xsl:template match="/root">
          <out><xsl:value-of select="$outer/value"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(stylesheet, 'temporary-tree-top-level-bindings.xsl', '<root/>');
  });

  it('resolves document() against the stylesheet file path in generated modules', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver-native-document-resolution-'));

    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out><xsl:value-of select="count(document('../../Languages/English.resx')/root)"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    try {
      const stylesheetDir = join(tempDir, '.workbench', 'vision xslts', 'S1000D');
      const languagesDir = join(tempDir, '.workbench', 'Languages');
      const stylesheetPath = resolve(join(stylesheetDir, 'descriptive.xslt'));
      const documentPath = join(languagesDir, 'English.resx');

      mkdirSync(stylesheetDir, { recursive: true });
      mkdirSync(languagesDir, { recursive: true });
      writeFileSync(documentPath, '<root><entry>ok</entry></root>', 'utf8');

      const { diagnostics, exports } = compileAndLoadGeneratedModule(
        stylesheet,
        'descriptive.xsl',
        stylesheetPath,
      );

      expect(diagnostics).toEqual([]);

      const generatedModule = exports as {
        readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
      };
      const sourceXml = '<root/>';
      const interpreter = new XsltProcessor(stylesheet, { sourceName: stylesheetPath });

      expect(generatedModule.transform(sourceXml)).toEqual(interpreter.transform(sourceXml));
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('emits native code for a single-focus position() test', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <xsl:if test="position() = 1">
            <hello><xsl:value-of select="/root/name"/></hello>
          </xsl:if>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'conditional.xsl' });

    expect(emitted).toContain('traceStringValueOfNode(');
    expect(emitted).toContain('selectSimplePathNode(document, ["root","name"])');
    expect(emitted).not.toContain('selectSimplePathText(document, ["root","name"])');
    expect(emitted).toContain('1 === 1');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native position() and last() tests inside xsl:for-each through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:for-each select="item">
              <xsl:if test="position() = 1"><first><xsl:value-of select="."/></first></xsl:if>
              <xsl:if test="position() = last()"><last><xsl:value-of select="."/></last></xsl:if>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'position-last-for-each.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item><item>c</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="position()" and last() inside xsl:for-each', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:for-each select="item">
              <xsl:value-of select="position()"/>
              <xsl:text>/</xsl:text>
              <xsl:value-of select="last()"/>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'position-last-value-of.xsl' });

    expect(emitted).toContain('String((currentIndex + 1))');
    expect(emitted).toContain('String(currentNodes.length)');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of position() and last() inside xsl:for-each through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:for-each select="item">
              <entry>
                <xsl:value-of select="position()"/>
                <xsl:text>/</xsl:text>
                <xsl:value-of select="last()"/>
                <xsl:text>:</xsl:text>
                <xsl:value-of select="."/>
              </entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'position-last-value-of-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item><item>c</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="name()" on the current focus', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="name()"/>
            <xsl:for-each select="item">
              <entry><xsl:value-of select="name()"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'name-value-of.xsl' });

    expect(emitted).toContain('escapeText(nameOfNode(currentNode))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of name() on matched-root and for-each contexts through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="name()"/>
            <xsl:for-each select="item">
              <entry><xsl:value-of select="name()"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'name-value-of-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="name(/root)" and count(/root/item)', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:value-of select="name(/root)"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="count(/root/item)"/>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'name-count-value-of.xsl' });

    expect(emitted).toContain('nameOfNode(selectSimplePathNode(document, ["root"]))');
    expect(emitted).toContain('String(selectSimplePathNodes(document, ["root","item"]).length)');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of name(/root) and count(/root/item) through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out>
            <xsl:value-of select="name(/root)"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="count(/root/item)"/>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'name-count-value-of-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="local-name()" on the current focus', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="local-name()"/>
            <xsl:for-each select="item">
              <entry><xsl:value-of select="local-name()"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'local-name-value-of.xsl' });

    expect(emitted).toContain('escapeText(localNameOfNode(currentNode))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of local-name() on matched-root and for-each contexts through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:value-of select="local-name()"/>
            <xsl:for-each select="item">
              <entry><xsl:value-of select="local-name()"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'local-name-value-of-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for xsl:value-of select="local-name(/root)"', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out><xsl:value-of select="local-name(/root)"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'local-name-arg-value-of.xsl' });

    expect(emitted).toContain('localNameOfNode(selectSimplePathNode(document, ["root"]))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:value-of local-name(/root) through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <out><xsl:value-of select="local-name(/root)"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'local-name-arg-value-of-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for parameterless named templates with the current focus intact', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:call-template name="emit-root"/>
            <xsl:for-each select="item">
              <xsl:call-template name="emit-item"/>
            </xsl:for-each>
          </out>
        </xsl:template>
        <xsl:template name="emit-root">
          <root-name><xsl:value-of select="name()"/></root-name>
        </xsl:template>
        <xsl:template name="emit-item">
          <item>
            <xsl:value-of select="position()"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="."/>
          </item>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'named-template-focus.xsl' });

    expect(emitted).toContain('/** name="emit-root" (named-template-focus.xsl:11) */');
    expect(emitted).toContain('/** name="emit-item" (named-template-focus.xsl:14) */');
    expect(emitted).toContain('escapeText(nameOfNode(currentNode))');
    expect(emitted).toContain('String((currentIndex + 1))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native parameterless named templates with the current focus intact through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:call-template name="emit-root"/>
            <xsl:for-each select="item">
              <xsl:call-template name="emit-item"/>
            </xsl:for-each>
          </out>
        </xsl:template>
        <xsl:template name="emit-root">
          <root-name><xsl:value-of select="name()"/></root-name>
        </xsl:template>
        <xsl:template name="emit-item">
          <item>
            <xsl:value-of select="position()"/>
            <xsl:text>:</xsl:text>
            <xsl:value-of select="."/>
          </item>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'named-template-focus-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item><item>b</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('executes native named templates with xsl:param defaults and xsl:with-param overrides through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:call-template name="emit"/>
            <xsl:for-each select="item">
              <xsl:call-template name="emit">
                <xsl:with-param name="label" select="."/>
              </xsl:call-template>
            </xsl:for-each>
          </out>
        </xsl:template>
        <xsl:template name="emit">
          <xsl:param name="label" select="name()"/>
          <entry><xsl:value-of select="$label"/></entry>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'named-template-with-param.xsl',
      '<root><item>a</item><item>b</item></root>',
    );
  });

  it('executes native named templates with temporary-tree params through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:call-template name="emit"/>
            <xsl:call-template name="emit">
              <xsl:with-param name="tree">
                <label>override</label>
              </xsl:with-param>
            </xsl:call-template>
          </out>
        </xsl:template>
        <xsl:template name="emit">
          <xsl:param name="tree">
            <label>default</label>
          </xsl:param>
          <entry><xsl:value-of select="$tree/label"/></entry>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'named-template-with-param-temporary-tree.xsl',
      '<root/>',
    );
  });

  it('executes native xsl:apply-templates with temporary-tree params through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:variable name="tree">
              <label><xsl:value-of select="item"/></label>
            </xsl:variable>
            <xsl:apply-templates select="item">
              <xsl:with-param name="tree" select="$tree"/>
            </xsl:apply-templates>
          </out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:param name="tree"/>
          <xsl:param name="suffix">default</xsl:param>
          <entry>
            <xsl:value-of select="$tree/label"/>
            <xsl:text>, </xsl:text>
            <xsl:value-of select="$suffix"/>
          </entry>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-with-param-temporary-tree.xsl',
      '<root><item>test</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[1]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[1]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-first-position.xsl',
      '<root><item>a</item><item>b</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = 1]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = 1]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-first-position-function.xsl',
      '<root><item>a</item><item>b</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = last()]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = last()]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-last-position-function.xsl',
      '<root><item>a</item><item>b</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() >= 2]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() >= 2]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-greater-equal-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() != 1]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() != 1]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-equal-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() mod 2 = 0]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() mod 2 = 0]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-mod-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = last() - 1]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = last() - 1]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-last-minus-one-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() &lt; last()]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() &lt; last()]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-less-than-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() > 1 and position() &lt; last()]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() > 1 and position() &lt; last()]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-between-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = 1 or position() = last()]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = 1 or position() = last()]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-first-or-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = 1 or position() > 2]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = 1 or position() > 2]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-first-or-after-second-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = 1 or not(position() = last())]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = 1 or not(position() = last())]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-first-or-not-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() mod 2 = 0)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() mod 2 = 0)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-even-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() mod 2 = 0 or position() = 1)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() mod 2 = 0 or position() = 1)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-even-or-first-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() mod 2 = 0 or position() mod 3 = 0)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() mod 2 = 0 or position() mod 3 = 0)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-even-or-third-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item><item>e</item><item>f</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() = 1 or position() = 2)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() = 1 or position() = 2)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-first-or-second-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() = last() - 1)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() = last() - 1)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-second-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() = last() - 1 or position() = last() - 2)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() = last() - 1 or position() = last() - 2)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-second-or-third-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item><item>e</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() &lt; last() - 1)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() &lt; last() - 1)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-before-second-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() != last() - 1)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() != last() - 1)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-not-second-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() != last() - 1 or position() != 1)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() != last() - 1 or position() != 1)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-not-second-last-or-not-first-position-function.xsl',
      '<root><item>a</item><item>b</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() != 1 or position() &lt; last() - 1)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() != 1 or position() &lt; last() - 1)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-not-first-or-before-second-last-position-function.xsl',
      '<root><item>a</item><item>b</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() != last()]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() != last()]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() > last() - 1]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() > last() - 1]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-after-second-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() != last() - 1]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() != last() - 1]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-second-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = last() div 2]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = last() div 2]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-middle-by-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() != last() div 2]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() != last() div 2]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-middle-by-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() &lt; last() div 2]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() &lt; last() div 2]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-before-middle-by-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() &lt; last() div 2)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() &lt; last() div 2)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-before-middle-by-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = last() div 2 + 1]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = last() div 2 + 1]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-middle-plus-one-by-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() &lt; last() div 2 + 1]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() &lt; last() div 2 + 1]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-before-middle-plus-one-by-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = last() div 2 + last() div 4]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = last() div 2 + last() div 4]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-middle-by-summed-last-divisors-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() &lt; last() div 2 + last() div 4]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() &lt; last() div 2 + last() div 4]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-before-middle-by-summed-last-divisors-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() &lt; last() div 2 + last() div 4)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() &lt; last() div 2 + last() div 4)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-before-middle-by-summed-last-divisors-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = (last() div 2) * 2]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = (last() div 2) * 2]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-end-by-scaled-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() = (last() div 2) * (last() div 2)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() = (last() div 2) * (last() div 2)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-end-by-squared-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() != (last() div 2) * (last() div 2)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() != (last() div 2) * (last() div 2)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-end-by-squared-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() &lt; (last() div 2) * (last() div 2)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() &lt; (last() div 2) * (last() div 2)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-before-end-by-squared-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() &lt; (last() div 2) * (last() div 2))]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() &lt; (last() div 2) * (last() div 2))]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-before-end-by-squared-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() != last() div 2 + last() div 4]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() != last() div 2 + last() div 4]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-middle-by-summed-last-divisors-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() &lt; last() div 2 + 1)]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() &lt; last() div 2 + 1)]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-before-middle-plus-one-by-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[position() != last() div 2 + 1]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[position() != last() div 2 + 1]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-middle-plus-one-by-last-divisor-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
    );
  });

  it('executes native xsl:apply-templates select="item[not(position() = 1 or position() = last())]" through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates select="item[not(position() = 1 or position() = last())]"/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="."/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-not-first-or-last-position-function.xsl',
      '<root><item>a</item><item>b</item><item>c</item></root>',
    );
  });

  it('executes native default-select xsl:apply-templates position() through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out><xsl:apply-templates/></out>
        </xsl:template>
        <xsl:template match="item">
          <xsl:value-of select="position()"/>
        </xsl:template>
      </xsl:stylesheet>
    `;

    expectNativeRuntimeParity(
      stylesheet,
      'apply-templates-default-select-position.xsl',
      '<root><item/><item/></root>',
    );
  });

  it('emits native code for xsl:comment', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:comment><xsl:value-of select="name()"/></xsl:comment>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'comment.xsl' });

    expect(emitted).toContain('"<!--" +');
    expect(emitted).toContain('escapeText(nameOfNode(currentNode))');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native xsl:comment through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:comment><xsl:value-of select="name()"/></xsl:comment>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'comment-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item>a</item></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for select-only local xsl:variable bindings reused by xsl:value-of', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:variable name="label" select="name()"/>
            <xsl:value-of select="$label"/>
            <xsl:text>:</xsl:text>
            <xsl:for-each select="item">
              <xsl:variable name="index" select="position()"/>
              <entry><xsl:value-of select="$index"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'local-variable-value-of.xsl' });

    expect(emitted).toContain('const variable_label_0 = nameOfNode(currentNode);');
    expect(emitted).toContain('const variable_index_0 = String((currentIndex + 1));');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('executes native select-only local xsl:variable bindings through the runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root">
          <out>
            <xsl:variable name="label" select="name()"/>
            <xsl:value-of select="$label"/>
            <xsl:text>:</xsl:text>
            <xsl:for-each select="item">
              <xsl:variable name="index" select="position()"/>
              <entry><xsl:value-of select="$index"/></entry>
            </xsl:for-each>
          </out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'local-variable-value-of-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml = '<root><item/><item/></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it('emits native code for a top-level xsl:param default and runtime parameter override', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:param name="greeting" select="'hello'"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$greeting"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'global-param-native.xsl' });

    expect(emitted).toContain(
      'const raw_global_param_greeting_0 = ctx.parameters?.["greeting"] ?? ctx.parameters?.["{}greeting"];',
    );
    expect(emitted).toContain('function get_global_param_greeting_0() {');
    expect(emitted).toContain(
      'global_param_greeting_0_cache.set("value", raw_global_param_greeting_0 === undefined ? "hello" : String(raw_global_param_greeting_0));',
    );
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it('emits native code for a top-level xsl:variable select binding', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:variable name="greeting" select="'hello'"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$greeting"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'global-variable-native.xsl' });

    expect(emitted).toContain('function get_global_variable_greeting_0() {');
    expect(emitted).toContain('global_variable_greeting_0_cache.set("value", "hello");');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} executes native code for a top-level xsl:param default and runtime parameter override through the generated module surface`, () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:param name="greeting" select="'hello'"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$greeting"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml = '<root/>';
    expectNativeRuntimeParity(stylesheet, 'global-param-native-runtime.xsl', sourceXml, {
      parameters: {
        greeting: 'hi',
      },
    });
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} executes native code for a required top-level xsl:param when supplied through the generated module surface`, () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:param name="greeting" required="yes"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$greeting"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml = '<root/>';
    expectNativeRuntimeParity(stylesheet, 'global-required-param-native-runtime.xsl', sourceXml, {
      parameters: {
        greeting: 'hi',
      },
    });
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} executes native code for a top-level xsl:variable select binding through the generated module surface`, () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:variable name="greeting" select="'hello'"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$greeting"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml = '<root/>';
    expectNativeRuntimeParity(stylesheet, 'global-variable-native-runtime.xsl', sourceXml);
  });

  it('emits native code for forward-referenced top-level xsl:variable bindings using lazy getters', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:variable name="b" select="$a"/>
        <xsl:variable name="a" select="/root/item"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$b"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;

    const emitted = compileStylesheetToTs(stylesheet, { path: 'global-variable-forward-ref.xsl' });

    expect(emitted).toContain('function get_global_variable_b_0() {');
    expect(emitted).toContain('function get_global_variable_a_1() {');
    expect(emitted).toContain('return global_variable_a_1_cache.get("value");');
    expect(emitted).not.toContain('transformCompiledStylesheet(stylesheet, sourceXml, ctx)');
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} executes native code for forward-referenced top-level xsl:variable bindings through the generated module surface`, () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:variable name="b" select="$a"/>
        <xsl:variable name="a" select="/root/item"/>
        <xsl:template match="/root">
          <out><xsl:value-of select="$b"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml = '<root><item>ok</item></root>';
    expectNativeRuntimeParity(stylesheet, 'global-variable-forward-ref-runtime.xsl', sourceXml);
  });

  it('executes a three-hop apply-templates chain through the native runtime surface', () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <items><xsl:apply-templates select="/root/section/item"/></items>
        </xsl:template>
        <xsl:template match="section/item">
          <item>
            <name><xsl:value-of select="name"/></name>
            <details><xsl:apply-templates select="detail"/></details>
          </item>
        </xsl:template>
        <xsl:template match="detail">
          <detail><xsl:apply-templates select="marker"/></detail>
        </xsl:template>
        <xsl:template match="marker">
          <mark><xsl:value-of select="."/></mark>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'apply-templates-three-hop-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (source: string) => ReturnType<XsltProcessor['transform']>;
    };
    const sourceXml =
      '<root><section><item><name>alpha</name><detail><marker>one</marker><marker>two</marker></detail></item></section></root>';
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml);

    expect(generatedModule.transform(sourceXml)).toEqual(interpreterResult);
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} preserves nested apply-templates default behavior through matched child templates`, () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <items><xsl:apply-templates/></items>
        </xsl:template>
        <xsl:template match="section/item">
          <item>
            <xsl:value-of select="name"/>
            <details>
              <xsl:for-each select="group">
                <xsl:apply-templates/>
              </xsl:for-each>
            </details>
          </item>
        </xsl:template>
        <xsl:template match="detail">
          <detail><xsl:value-of select="."/></detail>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml =
      '<root><section><item><name>alpha</name><group><detail>one</detail><detail>two</detail></group></item></section></root>';

    expectNativeRuntimeParity(stylesheet, 'apply-templates-nested-default-runtime.xsl', sourceXml);
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} executes native code for named-only initial templates through the generated module surface`, () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template name="main">
          <out><xsl:value-of select="count(/root/item)"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml = '<root><item/><item/></root>';

    expectNativeRuntimeParity(stylesheet, 'initial-template-native-runtime.xsl', sourceXml, {
      initialTemplate: 'main',
    });
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} executes native code for mixed matched and named initial templates through the generated module surface`, () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/root"><wrong/></xsl:template>
        <xsl:template name="main">
          <out><xsl:value-of select="count(/root/item)"/></out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml = '<root><item/><item/></root>';

    expectNativeRuntimeParity(stylesheet, 'mixed-initial-template-native-runtime.xsl', sourceXml, {
      initialTemplate: 'main',
    });
  });

  it(`${NATIVE_DIRECT_PARITY_TAG} normalizes prefixed initialTemplate names through the generated module surface`, () => {
    const stylesheet = `
      <xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:t="urn:test">
        <xsl:template name="t:main">
          <out>ok</out>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const sourceXml = '<root/>';

    expectNativeRuntimeParity(
      stylesheet,
      'initial-template-prefixed-name-native-runtime.xsl',
      sourceXml,
      {
        initialTemplate: 't:main',
      },
    );
  });
});
