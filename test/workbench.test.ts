import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import * as stylesheetCompiler from '../src/xslt/compile/compiler.js';
import type { SourceSpan } from '../src/diagnostics.js';
import {
  CompiledStylesheet,
  compile,
  compileAndTransform,
  resolveSourceXmlNodeHandle,
  resolveSourceXmlNodeHandleAtOffset,
  resolveSourceXmlNodeHandleInRange,
  transform,
} from '../src/workbench.js';

describe('workbench boundary', () => {
  it('compiles in-memory source documents into inspectable artifacts', () => {
    const result = compile({
      stylesheet: {
        uri: 'memory:/hello.xsl',
        text: [
          '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
          '  <xsl:template match="/">',
          '    <hello><xsl:value-of select="/root/name"/></hello>',
          '  </xsl:template>',
          '</xsl:stylesheet>',
        ].join('\n'),
      },
    });

    expect(result).toMatchObject({
      ok: true,
      diagnostics: [],
    });
    if (!result.ok) {
      throw new Error('expected compile to succeed');
    }
    expect(result.stylesheet).toBeInstanceOf(CompiledStylesheet);
    expect(result.generatedTs).toContain('export function transform(');
    expect(result.sourceMap?.raw).toContain('"sources": [');
  });

  it('reports coarse compile progress through workbench callbacks', () => {
    const progressMessages: string[] = [];

    const result = compile({
      stylesheet: {
        uri: 'memory:/progress.xsl',
        text: [
          '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
          '  <xsl:template match="/">',
          '    <out/>',
          '  </xsl:template>',
          '</xsl:stylesheet>',
        ].join('\n'),
      },
      options: {
        onProgress: (message) => progressMessages.push(message),
      },
    });

    expect(result.ok).toBe(true);
    expect(progressMessages).toEqual([
      expect.stringContaining('Compiling stylesheet IR for memory:/progress.xsl'),
      expect.stringContaining('Emitting stylesheet module for memory:/progress.xsl'),
      expect.stringContaining('Analyzing stylesheet diagnostics for memory:/progress.xsl'),
      expect.stringContaining(
        'Generating stylesheet declaration and source map for memory:/progress.xsl',
      ),
    ]);
  });

  it('maps stylesheet instruction spans to generated TS lines and back', () => {
    const stylesheetText = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <hello><xsl:value-of select="/root/name"/></hello>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const result = compile({
      stylesheet: {
        uri: 'memory:/highlight.xsl',
        text: stylesheetText,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected compile to succeed');
    }

    const instructionSpan = findSpan(
      result.stylesheet.stylesheet,
      '<xsl:value-of select="/root/name"/>',
    );
    const generatedSpans = result.sourceMap?.mapSourceToGenerated(instructionSpan) ?? [];

    expect(generatedSpans.length).toBeGreaterThan(0);
    expect(generatedSpans[0]?.uri).toBe('memory:/highlight.xsl.ts');

    const generatedValueOfSpan = generatedSpans.find((span) => {
      const generatedText = sliceSpan(result.generatedTs ?? '', span);
      return generatedText.includes('traceStringValueOfNode');
    });
    expect(generatedValueOfSpan).toBeDefined();

    const roundTrippedSpans = result.sourceMap?.mapGeneratedToSource(generatedValueOfSpan!) ?? [];
    expect(roundTrippedSpans).toEqual([
      expect.objectContaining({
        uri: 'memory:/highlight.xsl',
        lineStart: instructionSpan.lineStart,
        lineEnd: instructionSpan.lineStart,
      }),
    ]);
  });

  it('does not recompile on first transform after compile', () => {
    const compileSpy = vi.spyOn(stylesheetCompiler, 'compileStylesheet');

    const compileResult = compile({
      stylesheet: {
        uri: 'memory:/single-compile.xsl',
        text: [
          '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
          '  <xsl:template match="/">',
          '    <hello><xsl:value-of select="/root/name"/></hello>',
          '  </xsl:template>',
          '</xsl:stylesheet>',
        ].join('\n'),
      },
    });
    expect(compileResult.ok).toBe(true);
    if (!compileResult.ok) {
      throw new Error('expected compile to succeed');
    }
    expect(compileSpy).toHaveBeenCalledTimes(1);

    const firstResult = transform({
      stylesheet: compileResult.stylesheet,
      sourceXml: {
        uri: 'memory:/first.xml',
        text: '<root><name>alpha</name></root>',
      },
    });

    expect(firstResult.ok).toBe(true);
    expect(compileSpy).toHaveBeenCalledTimes(1);
  });

  it('transforms repeatedly through a compiled stylesheet handle', () => {
    const compileResult = compile({
      stylesheet: {
        uri: 'memory:/reusable.xsl',
        text: [
          '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
          '  <xsl:template match="/">',
          '    <hello><xsl:value-of select="/root/name"/></hello>',
          '  </xsl:template>',
          '</xsl:stylesheet>',
        ].join('\n'),
      },
    });
    expect(compileResult.ok).toBe(true);
    if (!compileResult.ok) {
      throw new Error('expected compile to succeed');
    }

    const firstResult = transform({
      stylesheet: compileResult.stylesheet,
      sourceXml: {
        uri: 'memory:/first.xml',
        text: '<root><name>alpha</name></root>',
      },
    });
    const secondResult = transform({
      stylesheet: compileResult.stylesheet,
      sourceXml: {
        uri: 'memory:/second.xml',
        text: '<root><name>beta</name></root>',
      },
    });

    expect(firstResult).toMatchObject({
      ok: true,
      diagnostics: [],
      output: '<hello>alpha</hello>',
    });
    expect(secondResult).toMatchObject({
      ok: true,
      diagnostics: [],
      output: '<hello>beta</hello>',
    });
  });

  it('surfaces auto execution fallback metadata as a first-class warning notice for in-memory callers', () => {
    const result = compileAndTransform({
      stylesheet: {
        uri: 'memory:/fallback-warning.xsl',
        text: [
          '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
          '  <xsl:template match="/root">',
          '    <out><xsl:apply-templates select="item[position() &lt; (last() div 2) * (last() div 2) * (last() div 2)]"/></out>',
          '  </xsl:template>',
          '  <xsl:template match="item">',
          '    <xsl:value-of select="."/>',
          '  </xsl:template>',
          '</xsl:stylesheet>',
        ].join('\n'),
      },
      sourceXml: {
        uri: 'memory:/input.xml',
        text: '<root><item>a</item><item>b</item><item>c</item><item>d</item></root>',
      },
      options: {
        execution: 'auto',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      diagnostics: [],
      output: '<out>abcd</out>',
      execution: {
        requested: 'auto',
        resolved: 'interpreter',
        fallbackReason: {
          code: 'unsupported_stylesheet',
          message: 'The current stylesheet is outside the native-supported slice for M6.25.',
        },
      },
      notices: [
        {
          severity: 'warning',
          code: 'native_fallback',
          message: 'The current stylesheet is outside the native-supported slice for M6.25.',
          details: [
            { key: 'requestedExecution', value: 'auto' },
            { key: 'resolvedExecution', value: 'interpreter' },
            { key: 'fallbackCode', value: 'unsupported_stylesheet' },
          ],
          suggestions: [
            {
              kind: 'fix',
              label:
                'retry with execution="native" to get a hard unsupported-native error while simplifying the stylesheet',
              confidence: 1,
            },
            {
              kind: 'hint',
              label:
                'simplify the select/match shape toward the documented native slice if you want to stay on the native path',
              confidence: 0.9,
            },
          ],
        },
      ],
    });
    expect(result.generatedTs).toContain('export function transform(');
  });

  it('keeps simple descendant-name value-of selections on the native path', () => {
    const result = compileAndTransform({
      stylesheet: {
        uri: 'memory:/descendant-native.xsl',
        text: [
          '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
          '  <xsl:template match="/">',
          '    <hello><xsl:value-of select="//name"/></hello>',
          '  </xsl:template>',
          '</xsl:stylesheet>',
        ].join('\n'),
      },
      sourceXml: {
        uri: 'memory:/descendant-input.xml',
        text: '<root><wrapper><name>world</name></wrapper></root>',
      },
      options: {
        execution: 'auto',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      diagnostics: [],
      output: '<hello>world</hello>',
      execution: {
        requested: 'auto',
        resolved: 'native',
      },
    });
    expect(result.generatedTs).toContain('selectDescendantElementsByName');
    expect(result.generatedTs).toContain('traceStringValueOfNode');
  });

  it('resolves relative document() calls against the stylesheet file URI by default', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'weaver workbench '));

    try {
      writeFileSync(join(tempDir, 'lookup.xml'), '<lookup><value>ok</value></lookup>', 'utf8');

      const result = compileAndTransform({
        stylesheet: {
          uri: pathToFileURL(join(tempDir, 'doc function test.xsl')).href,
          text: [
            '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
            '  <xsl:template match="/">',
            `    <out><xsl:value-of select="document('lookup.xml')/lookup/value"/></out>`,
            '  </xsl:template>',
            '</xsl:stylesheet>',
          ].join('\n'),
        },
        sourceXml: {
          uri: 'memory:/input.xml',
          text: '<root/>',
        },
      });

      expect(result).toMatchObject({
        ok: true,
        diagnostics: [],
        output: '<out>ok</out>',
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('resolves a workbench source XML path into a trace handle', () => {
    const sourceXml = {
      uri: 'memory:/tracked.xml',
      text: '<root><section><para>alpha</para><para>beta</para></section></root>',
    };

    const result = resolveSourceXmlNodeHandle({
      sourceXml,
      path: '/root[1]/section[1]/para[2]',
    });

    expect(result).toEqual({
      ok: true,
      diagnostics: [],
      handle: {
        documentUri: 'memory:/tracked.xml',
        kind: 'element',
        path: '/root[1]/section[1]/para[2]',
      },
    });
  });

  it('returns an empty successful lookup when the workbench XML path does not resolve', () => {
    const result = resolveSourceXmlNodeHandle({
      sourceXml: {
        uri: 'memory:/tracked.xml',
        text: '<root><section><para>alpha</para></section></root>',
      },
      path: '/root[1]/section[1]/para[2]',
    });

    expect(result).toEqual({
      ok: true,
      diagnostics: [],
    });
  });

  it('resolves a workbench XML caret offset into the deepest matching trace handle', () => {
    const sourceXml = {
      uri: 'memory:/tracked.xml',
      text: '<root><section priority="high"><para>alpha</para><para>beta</para></section></root>',
    };
    const paraOffset = sourceXml.text.indexOf('<para>beta</para>') + 1;
    const attributeOffset = sourceXml.text.indexOf('high');
    const textOffset = sourceXml.text.indexOf('beta');

    expect(resolveSourceXmlNodeHandleAtOffset({ sourceXml, offset: paraOffset })).toEqual({
      ok: true,
      diagnostics: [],
      handle: {
        documentUri: 'memory:/tracked.xml',
        kind: 'element',
        path: '/root[1]/section[1]/para[2]',
      },
    });
    expect(resolveSourceXmlNodeHandleAtOffset({ sourceXml, offset: attributeOffset })).toEqual({
      ok: true,
      diagnostics: [],
      handle: {
        documentUri: 'memory:/tracked.xml',
        kind: 'attribute',
        path: '/root[1]/section[1]/@priority',
      },
    });
    expect(resolveSourceXmlNodeHandleAtOffset({ sourceXml, offset: textOffset })).toEqual({
      ok: true,
      diagnostics: [],
      handle: {
        documentUri: 'memory:/tracked.xml',
        kind: 'text',
        path: '/root[1]/section[1]/para[2]/text()[1]',
      },
    });
  });

  it('returns an empty successful lookup when the workbench XML caret offset misses a trace node', () => {
    const sourceXml = {
      uri: 'memory:/tracked.xml',
      text: '<root>  <section><para>alpha</para></section></root>',
    };
    const offset = sourceXml.text.indexOf('  ');

    const result = resolveSourceXmlNodeHandleAtOffset({
      sourceXml,
      offset,
    });

    expect(result).toEqual({
      ok: true,
      diagnostics: [],
    });
  });

  it('resolves a workbench XML selection range into the deepest matching trace handle', () => {
    const sourceXml = {
      uri: 'memory:/tracked.xml',
      text: '<root><section priority="high"><para>alpha</para><para>beta</para></section></root>',
    };
    const attributeValueStart = sourceXml.text.indexOf('high');
    const attributeValueEnd = attributeValueStart + 'high'.length;
    const paraNameStart = sourceXml.text.indexOf('<para>beta</para>') + 1;
    const paraNameEnd = paraNameStart + 'para'.length;
    const textStart = sourceXml.text.indexOf('beta');
    const textEnd = textStart + 'beta'.length;

    expect(
      resolveSourceXmlNodeHandleInRange({
        sourceXml,
        offsetStart: attributeValueStart,
        offsetEnd: attributeValueEnd,
      }),
    ).toEqual({
      ok: true,
      diagnostics: [],
      handle: {
        documentUri: 'memory:/tracked.xml',
        kind: 'attribute',
        path: '/root[1]/section[1]/@priority',
      },
    });
    expect(
      resolveSourceXmlNodeHandleInRange({
        sourceXml,
        offsetStart: paraNameStart,
        offsetEnd: paraNameEnd,
      }),
    ).toEqual({
      ok: true,
      diagnostics: [],
      handle: {
        documentUri: 'memory:/tracked.xml',
        kind: 'element',
        path: '/root[1]/section[1]/para[2]',
      },
    });
    expect(
      resolveSourceXmlNodeHandleInRange({
        sourceXml,
        offsetStart: textStart,
        offsetEnd: textEnd,
      }),
    ).toEqual({
      ok: true,
      diagnostics: [],
      handle: {
        documentUri: 'memory:/tracked.xml',
        kind: 'text',
        path: '/root[1]/section[1]/para[2]/text()[1]',
      },
    });
  });

  it('returns an empty successful lookup when the workbench XML selection range spans multiple trace nodes', () => {
    const sourceXml = {
      uri: 'memory:/tracked.xml',
      text: '<root><section><para>alpha</para><para>beta</para></section></root>',
    };
    const offsetStart = sourceXml.text.indexOf('alpha');
    const offsetEnd = sourceXml.text.indexOf('beta') + 'beta'.length;

    const result = resolveSourceXmlNodeHandleInRange({
      sourceXml,
      offsetStart,
      offsetEnd,
    });

    expect(result).toEqual({
      ok: true,
      diagnostics: [],
    });
  });

  it('surfaces XML parse failures through the workbench node resolver', () => {
    const result = resolveSourceXmlNodeHandle({
      sourceXml: {
        uri: 'memory:/broken.xml',
        text: '<root><section></root>',
      },
      path: '/root[1]/section[1]',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected resolveSourceXmlNodeHandle to fail');
    }
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      severity: 'error',
      message: expect.stringContaining('Source XML is not well-formed'),
    });
  });

  it('surfaces a tracked-node template-enter pause through compileAndTransform', () => {
    const sourceXml = {
      uri: 'memory:/input.xml',
      text: [
        '<root>',
        '  <section>',
        '    <para>alpha</para>',
        '    <para>beta</para>',
        '  </section>',
        '</root>',
      ].join(''),
    };
    const trackedParaNodeResult = resolveSourceXmlNodeHandleAtOffset({
      sourceXml,
      offset: sourceXml.text.indexOf('<para>beta</para>') + 1,
    });
    expect(trackedParaNodeResult.ok).toBe(true);
    if (!trackedParaNodeResult.ok || trackedParaNodeResult.handle === undefined) {
      throw new Error('expected tracked para handle');
    }
    const trackedParaNode = trackedParaNodeResult.handle;
    const result = compileAndTransform({
      stylesheet: {
        uri: 'memory:/trace-pause.xsl',
        text: [
          '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
          '  <xsl:template match="/">',
          '    <items><xsl:apply-templates select="/root/section/para"/></items>',
          '  </xsl:template>',
          '  <xsl:template match="para">',
          '    <entry><xsl:value-of select="."/></entry>',
          '  </xsl:template>',
          '</xsl:stylesheet>',
        ].join('\n'),
      },
      sourceXml,
      options: {
        execution: 'native',
        trace: {
          documentUri: sourceXml.uri,
          breakpoints: [
            {
              node: trackedParaNode,
              on: ['template-enter'],
            },
          ],
        },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      diagnostics: [],
      output: '<items><entry>alpha</entry><entry>beta</entry></items>',
      pause: {
        event: {
          kind: 'template-enter',
          node: trackedParaNode,
          template: {
            match: 'para',
            location: expect.any(Object),
          },
        },
        frames: [
          {
            kind: 'template',
            label: 'match="para"',
            location: expect.any(Object),
          },
        ],
      },
    });
  });
});

function findSpan(
  document: { readonly uri: string; readonly text: string },
  needle: string,
): SourceSpan {
  const offsetStart = document.text.indexOf(needle);
  if (offsetStart < 0) {
    throw new Error(`Could not find ${needle}.`);
  }

  const before = document.text.slice(0, offsetStart);
  const lineStart = before.length === 0 ? 1 : before.split('\n').length;
  const columnStart = offsetStart - before.lastIndexOf('\n');

  return {
    uri: document.uri,
    offsetStart,
    offsetEnd: offsetStart + needle.length,
    lineStart,
    columnStart,
    lineEnd: lineStart,
    columnEnd: columnStart + needle.length,
  };
}

function sliceSpan(text: string, span: SourceSpan): string {
  return text.slice(span.offsetStart, span.offsetEnd);
}
