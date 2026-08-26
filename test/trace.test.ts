import { describe, expect, it } from 'vitest';

import type { XmlTraceEvent, XmlTracePause } from '../src/index.js';
import { createCompiledDocument, createXmlNodeHandle, XsltProcessor } from '../src/index.js';
import { compileAndLoadGeneratedModule } from './codegen/compile.support.js';

function createExpectedTraceEvents(): XmlTraceEvent[] {
  return [
    {
      kind: 'focus-enter',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'document',
        path: '/',
      },
    },
    {
      kind: 'template-enter',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'document',
        path: '/',
      },
      template: {
        match: '/',
        location: expect.any(Object),
      },
    },
    {
      kind: 'instruction-select',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[1]',
      },
      instruction: {
        kind: 'xsl:apply-templates',
        location: expect.any(Object),
      },
    },
    {
      kind: 'instruction-select',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[2]',
      },
      instruction: {
        kind: 'xsl:apply-templates',
        location: expect.any(Object),
      },
    },
    {
      kind: 'focus-enter',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[1]',
      },
    },
    {
      kind: 'template-enter',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[1]',
      },
      template: {
        match: 'item',
        location: expect.any(Object),
      },
    },
    {
      kind: 'instruction-select',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[1]',
      },
      instruction: {
        kind: 'xsl:value-of',
        location: expect.any(Object),
      },
    },
    {
      kind: 'value-read',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[1]',
      },
      instruction: {
        kind: 'xsl:value-of',
        location: expect.any(Object),
      },
    },
    {
      kind: 'focus-enter',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[2]',
      },
    },
    {
      kind: 'template-enter',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[2]',
      },
      template: {
        match: 'item',
        location: expect.any(Object),
      },
    },
    {
      kind: 'instruction-select',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[2]',
      },
      instruction: {
        kind: 'xsl:value-of',
        location: expect.any(Object),
      },
    },
    {
      kind: 'value-read',
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element',
        path: '/root[1]/item[2]',
      },
      instruction: {
        kind: 'xsl:value-of',
        location: expect.any(Object),
      },
    },
  ];
}

describe('xml node tracing', () => {
  const stylesheet = [
    '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
    '  <xsl:template match="/">',
    '    <items><xsl:apply-templates select="/root/item"/></items>',
    '  </xsl:template>',
    '  <xsl:template match="item">',
    '    <entry><xsl:value-of select="."/></entry>',
    '  </xsl:template>',
    '</xsl:stylesheet>',
  ].join('\n');
  const sourceXml = '<root><item>alpha</item><item>beta</item></root>';

  it('emits focus-enter, template-enter, instruction-select, and value-read events on the interpreter path', () => {
    const events: XmlTraceEvent[] = [];
    const result = new XsltProcessor(stylesheet).transform(sourceXml, {
      execution: 'interpreter',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => events.push(event),
      },
    });

    expect(result.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(events).toEqual(createExpectedTraceEvents());
  });

  it('emits focus-enter, template-enter, instruction-select, and value-read events on the native path', () => {
    const events: XmlTraceEvent[] = [];
    const result = new XsltProcessor(stylesheet).transform(sourceXml, {
      execution: 'native',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => events.push(event),
      },
    });

    expect(result.execution?.resolved).toBe('native');
    expect(result.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(events).toEqual(createExpectedTraceEvents());
  });

  it('emits focus-enter, template-enter, instruction-select, and value-read events through the generated module path', () => {
    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'trace-native-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const events: XmlTraceEvent[] = [];
    const result = generatedModule.transform(sourceXml, {
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => events.push(event),
      },
    });

    expect(result.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(events).toEqual(createExpectedTraceEvents());
  });

  it('emits path-based xsl:value-of trace events on the native and generated-module paths', () => {
    const pathStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <items><xsl:apply-templates select="/root/item"/></items>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <entry><xsl:value-of select="name"/></entry>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const pathSourceXml =
      '<root><item><name>alpha</name></item><item><name>beta</name></item></root>';
    const expectedEvents: XmlTraceEvent[] = [
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
        template: {
          match: '/',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
        instruction: {
          kind: 'xsl:apply-templates',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
        instruction: {
          kind: 'xsl:apply-templates',
          location: expect.any(Object),
        },
      },
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
        template: {
          match: 'item',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]/name[1]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      {
        kind: 'value-read',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]/name[1]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
        template: {
          match: 'item',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]/name[1]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      {
        kind: 'value-read',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]/name[1]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
    ];

    const nativeEvents: XmlTraceEvent[] = [];
    const nativeResult = new XsltProcessor(pathStylesheet).transform(pathSourceXml, {
      execution: 'native',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => nativeEvents.push(event),
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(nativeEvents).toEqual(expectedEvents);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      pathStylesheet,
      'trace-path-value-of-native-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedEvents: XmlTraceEvent[] = [];
    const generatedResult = generatedModule.transform(pathSourceXml, {
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => generatedEvents.push(event),
      },
    });

    expect(generatedResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(generatedEvents).toEqual(expectedEvents);
  });

  it('emits xsl:for-each trace events on the interpreter, native, and generated-module paths', () => {
    const forEachStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <items><xsl:for-each select="/root/item"><entry><xsl:value-of select="."/></entry></xsl:for-each></items>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const expectedEvents: XmlTraceEvent[] = [
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
        template: {
          match: '/',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
        instruction: {
          kind: 'xsl:for-each',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
        instruction: {
          kind: 'xsl:for-each',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      {
        kind: 'value-read',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      {
        kind: 'value-read',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
    ];

    const interpreterEvents: XmlTraceEvent[] = [];
    const interpreterResult = new XsltProcessor(forEachStylesheet).transform(sourceXml, {
      execution: 'interpreter',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => interpreterEvents.push(event),
      },
    });

    expect(interpreterResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(interpreterEvents).toEqual(expectedEvents);

    const nativeEvents: XmlTraceEvent[] = [];
    const nativeResult = new XsltProcessor(forEachStylesheet).transform(sourceXml, {
      execution: 'native',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => nativeEvents.push(event),
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(nativeEvents).toEqual(expectedEvents);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      forEachStylesheet,
      'trace-for-each-native-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedEvents: XmlTraceEvent[] = [];
    const generatedResult = generatedModule.transform(sourceXml, {
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => generatedEvents.push(event),
      },
    });

    expect(generatedResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(generatedEvents).toEqual(expectedEvents);
  });

  it('emits default-select xsl:apply-templates trace events on the interpreter, native, and generated-module paths', () => {
    const defaultSelectStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <items><xsl:apply-templates/></items>',
      '  </xsl:template>',
      '  <xsl:template match="item">',
      '    <entry><xsl:value-of select="."/></entry>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const defaultSelectSourceXml = '<root><item>alpha</item><item>beta</item></root>';
    const expectedEvents: XmlTraceEvent[] = [
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
        template: {
          match: '/',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]',
        },
        instruction: {
          kind: 'xsl:apply-templates',
          location: expect.any(Object),
        },
      },
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]',
        },
      },
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
        template: {
          match: 'item',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      {
        kind: 'value-read',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[1]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
        template: {
          match: 'item',
          location: expect.any(Object),
        },
      },
      {
        kind: 'instruction-select',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      {
        kind: 'value-read',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]/item[2]',
        },
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
    ];

    const interpreterEvents: XmlTraceEvent[] = [];
    const interpreterResult = new XsltProcessor(defaultSelectStylesheet).transform(
      defaultSelectSourceXml,
      {
        execution: 'interpreter',
        trace: {
          documentUri: 'memory:/input.xml',
          onEvent: (event) => interpreterEvents.push(event),
        },
      },
    );

    expect(interpreterResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(interpreterEvents).toEqual(expectedEvents);

    const nativeEvents: XmlTraceEvent[] = [];
    const nativeResult = new XsltProcessor(defaultSelectStylesheet).transform(
      defaultSelectSourceXml,
      {
        execution: 'native',
        trace: {
          documentUri: 'memory:/input.xml',
          onEvent: (event) => nativeEvents.push(event),
        },
      },
    );

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(nativeEvents).toEqual(expectedEvents);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      defaultSelectStylesheet,
      'trace-default-select-native-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedEvents: XmlTraceEvent[] = [];
    const generatedResult = generatedModule.transform(defaultSelectSourceXml, {
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => generatedEvents.push(event),
      },
    });

    expect(generatedResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(generatedEvents).toEqual(expectedEvents);
  });

  it('captures a template-enter breakpoint as a pause payload on the interpreter, native, and generated-module paths', () => {
    const breakpoint = {
      node: {
        documentUri: 'memory:/input.xml',
        kind: 'element' as const,
        path: '/root[1]/item[2]',
      },
      on: ['template-enter'] as const,
    };
    const expectedPause: XmlTracePause = {
      event: {
        kind: 'template-enter',
        node: breakpoint.node,
        template: {
          match: 'item',
          location: expect.any(Object),
        },
      },
      frames: [
        {
          kind: 'template',
          label: 'match="item"',
          location: expect.any(Object),
        },
      ],
    };

    const interpreterPauses: XmlTracePause[] = [];
    const interpreterResult = new XsltProcessor(stylesheet).transform(sourceXml, {
      execution: 'interpreter',
      trace: {
        documentUri: 'memory:/input.xml',
        breakpoints: [breakpoint],
        onPause: (pause) => interpreterPauses.push(pause),
      },
    });

    expect(interpreterResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(interpreterResult.pause).toEqual(expectedPause);
    expect(interpreterResult.traceSummary).toEqual(
      expect.objectContaining({
        totalEvents: expect.any(Number),
        lastEvent: expect.objectContaining({ kind: expect.any(String) }),
        topTemplates: expect.arrayContaining([
          expect.objectContaining({ key: 'match="item"', count: expect.any(Number) }),
        ]),
      }),
    );
    expect(interpreterPauses).toEqual([expectedPause]);

    const nativePauses: XmlTracePause[] = [];
    const nativeResult = new XsltProcessor(stylesheet).transform(sourceXml, {
      execution: 'native',
      trace: {
        documentUri: 'memory:/input.xml',
        breakpoints: [breakpoint],
        onPause: (pause) => nativePauses.push(pause),
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(nativeResult.pause).toEqual(expectedPause);
    expect(nativeResult.traceSummary?.totalEvents).toBe(
      interpreterResult.traceSummary?.totalEvents,
    );
    expect(nativeResult.traceSummary?.eventCounts).toEqual(
      interpreterResult.traceSummary?.eventCounts,
    );
    expect(nativeResult.traceSummary?.topTemplates).toEqual(
      interpreterResult.traceSummary?.topTemplates,
    );
    expect(nativeResult.traceSummary?.topInstructions).toEqual(
      interpreterResult.traceSummary?.topInstructions,
    );
    expect(nativeResult.traceSummary?.lastEvent?.kind).toBe(
      interpreterResult.traceSummary?.lastEvent?.kind,
    );
    expect(nativePauses).toEqual([expectedPause]);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      stylesheet,
      'trace-breakpoint-native-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedPauses: XmlTracePause[] = [];
    const generatedResult = generatedModule.transform(sourceXml, {
      trace: {
        documentUri: 'memory:/input.xml',
        breakpoints: [breakpoint],
        onPause: (pause) => generatedPauses.push(pause),
      },
    });

    expect(generatedResult.output).toBe('<items><entry>alpha</entry><entry>beta</entry></items>');
    expect(generatedResult.pause).toEqual(expectedPause);
    expect(generatedResult.traceSummary?.totalEvents).toBe(
      interpreterResult.traceSummary?.totalEvents,
    );
    expect(generatedResult.traceSummary?.eventCounts).toEqual(
      interpreterResult.traceSummary?.eventCounts,
    );
    expect(generatedResult.traceSummary?.topTemplates).toEqual(
      interpreterResult.traceSummary?.topTemplates,
    );
    expect(generatedResult.traceSummary?.topInstructions).toEqual(
      interpreterResult.traceSummary?.topInstructions,
    );
    expect(generatedResult.traceSummary?.lastEvent?.kind).toBe(
      interpreterResult.traceSummary?.lastEvent?.kind,
    );
    expect(generatedPauses).toEqual([expectedPause]);
  });

  it('emits initial-template trace events without a synthetic focus-enter event', () => {
    const initialTemplateStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:t="urn:test">',
      '  <xsl:template name="t:main">',
      '    <out>ok</out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const expectedEvents: XmlTraceEvent[] = [
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
        template: {
          name: '{urn:test}main',
          location: expect.any(Object),
        },
      },
    ];

    const interpreterEvents: XmlTraceEvent[] = [];
    const interpreterResult = new XsltProcessor(initialTemplateStylesheet).transform('<root/>', {
      execution: 'interpreter',
      initialTemplate: 't:main',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => interpreterEvents.push(event),
      },
    });

    expect(interpreterResult.output).toBe('<out xmlns:t="urn:test">ok</out>');
    expect(interpreterEvents).toEqual(expectedEvents);

    const nativeEvents: XmlTraceEvent[] = [];
    const nativeResult = new XsltProcessor(initialTemplateStylesheet).transform('<root/>', {
      execution: 'native',
      initialTemplate: 't:main',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => nativeEvents.push(event),
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<out xmlns:t="urn:test">ok</out>');
    expect(nativeEvents).toEqual(expectedEvents);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      initialTemplateStylesheet,
      'trace-initial-template-native-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedEvents: XmlTraceEvent[] = [];
    const generatedResult = generatedModule.transform('<root/>', {
      initialTemplate: 't:main',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => generatedEvents.push(event),
      },
    });

    expect(generatedResult.output).toBe('<out xmlns:t="urn:test">ok</out>');
    expect(generatedEvents).toEqual(expectedEvents);
  });

  it('does not emit XML-node value-read events for name(/root) and local-name(/root)', () => {
    const functionArgStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:value-of select="name(/root)"/>:<xsl:value-of select="local-name(/root)"/></out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const expectedEvents: XmlTraceEvent[] = [
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
        template: {
          match: '/',
          location: expect.any(Object),
        },
      },
    ];

    const interpreterEvents: XmlTraceEvent[] = [];
    const interpreterResult = new XsltProcessor(functionArgStylesheet).transform('<root/>', {
      execution: 'interpreter',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => interpreterEvents.push(event),
      },
    });

    expect(interpreterResult.output).toBe('<out>root:root</out>');
    expect(interpreterEvents).toEqual(expectedEvents);

    const nativeEvents: XmlTraceEvent[] = [];
    const nativeResult = new XsltProcessor(functionArgStylesheet).transform('<root/>', {
      execution: 'native',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => nativeEvents.push(event),
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<out>root:root</out>');
    expect(nativeEvents).toEqual(expectedEvents);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      functionArgStylesheet,
      'trace-function-arg-value-of-native-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedEvents: XmlTraceEvent[] = [];
    const generatedResult = generatedModule.transform('<root/>', {
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => generatedEvents.push(event),
      },
    });

    expect(generatedResult.output).toBe('<out>root:root</out>');
    expect(generatedEvents).toEqual(expectedEvents);
  });

  it('emits document focus before matched-template entry on non-document native entry nodes', () => {
    const matchedStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/root">',
      '    <out>ok</out>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const expectedEvents: XmlTraceEvent[] = [
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'document',
          path: '/',
        },
      },
      {
        kind: 'focus-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]',
        },
      },
      {
        kind: 'template-enter',
        node: {
          documentUri: 'memory:/input.xml',
          kind: 'element',
          path: '/root[1]',
        },
        template: {
          match: '/root',
          location: expect.any(Object),
        },
      },
    ];

    const interpreterEvents: XmlTraceEvent[] = [];
    const interpreterResult = new XsltProcessor(matchedStylesheet).transform('<root/>', {
      execution: 'interpreter',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => interpreterEvents.push(event),
      },
    });

    expect(interpreterResult.output).toBe('<out>ok</out>');
    expect(interpreterEvents).toEqual(expectedEvents);

    const nativeEvents: XmlTraceEvent[] = [];
    const nativeResult = new XsltProcessor(matchedStylesheet).transform('<root/>', {
      execution: 'native',
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => nativeEvents.push(event),
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<out>ok</out>');
    expect(nativeEvents).toEqual(expectedEvents);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      matchedStylesheet,
      'trace-matched-entry-native-runtime.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedEvents: XmlTraceEvent[] = [];
    const generatedResult = generatedModule.transform('<root/>', {
      trace: {
        documentUri: 'memory:/input.xml',
        onEvent: (event) => generatedEvents.push(event),
      },
    });

    expect(generatedResult.output).toBe('<out>ok</out>');
    expect(generatedEvents).toEqual(expectedEvents);
  });

  it('tracks a selected para node through a focus-enter pause on the interpreter, native, and generated-module paths', () => {
    const trackedNodeStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/doc/section/para"/></out>',
      '  </xsl:template>',
      '  <xsl:template match="para">',
      '    <p><xsl:value-of select="."/></p>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const trackedNodeSourceXml = [
      '<doc>',
      '  <section>',
      '    <para>alpha</para>',
      '    <para>beta</para>',
      '  </section>',
      '</doc>',
    ].join('');
    const trackedNodeHandle = createTrackedElementHandle(
      trackedNodeSourceXml,
      'memory:/tracked-node.xml',
      'para',
      1,
    );
    const expectedPause: XmlTracePause = {
      event: {
        kind: 'focus-enter',
        node: trackedNodeHandle,
      },
      frames: [],
    };

    const interpreterResult = new XsltProcessor(trackedNodeStylesheet).transform(
      trackedNodeSourceXml,
      {
        execution: 'interpreter',
        trace: {
          documentUri: 'memory:/tracked-node.xml',
          breakpoints: [
            {
              node: trackedNodeHandle,
              on: ['focus-enter'],
            },
          ],
        },
      },
    );

    expect(interpreterResult.output).toBe('<out><p>alpha</p><p>beta</p></out>');
    expect(interpreterResult.pause).toEqual(expectedPause);

    const nativeResult = new XsltProcessor(trackedNodeStylesheet).transform(trackedNodeSourceXml, {
      execution: 'native',
      trace: {
        documentUri: 'memory:/tracked-node.xml',
        breakpoints: [
          {
            node: trackedNodeHandle,
            on: ['focus-enter'],
          },
        ],
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<out><p>alpha</p><p>beta</p></out>');
    expect(nativeResult.pause).toEqual(expectedPause);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      trackedNodeStylesheet,
      'trace-tracked-node-focus-pause.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedResult = generatedModule.transform(trackedNodeSourceXml, {
      trace: {
        documentUri: 'memory:/tracked-node.xml',
        breakpoints: [
          {
            node: trackedNodeHandle,
            on: ['focus-enter'],
          },
        ],
      },
    });

    expect(generatedResult.output).toBe('<out><p>alpha</p><p>beta</p></out>');
    expect(generatedResult.pause).toEqual(expectedPause);
  });

  it('tracks a selected para node through a template-enter pause on the interpreter, native, and generated-module paths', () => {
    const trackedNodeStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/doc/section/para"/></out>',
      '  </xsl:template>',
      '  <xsl:template match="para">',
      '    <p><xsl:value-of select="."/></p>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const trackedNodeSourceXml = [
      '<doc>',
      '  <section>',
      '    <para>alpha</para>',
      '    <para>beta</para>',
      '  </section>',
      '</doc>',
    ].join('');
    const trackedNodeHandle = createTrackedElementHandle(
      trackedNodeSourceXml,
      'memory:/tracked-node.xml',
      'para',
      1,
    );
    const expectedPause: XmlTracePause = {
      event: {
        kind: 'template-enter',
        node: trackedNodeHandle,
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
    };

    const interpreterResult = new XsltProcessor(trackedNodeStylesheet).transform(
      trackedNodeSourceXml,
      {
        execution: 'interpreter',
        trace: {
          documentUri: 'memory:/tracked-node.xml',
          breakpoints: [
            {
              node: trackedNodeHandle,
              on: ['template-enter'],
            },
          ],
        },
      },
    );

    expect(interpreterResult.output).toBe('<out><p>alpha</p><p>beta</p></out>');
    expect(interpreterResult.pause).toEqual(expectedPause);

    const nativeResult = new XsltProcessor(trackedNodeStylesheet).transform(trackedNodeSourceXml, {
      execution: 'native',
      trace: {
        documentUri: 'memory:/tracked-node.xml',
        breakpoints: [
          {
            node: trackedNodeHandle,
            on: ['template-enter'],
          },
        ],
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<out><p>alpha</p><p>beta</p></out>');
    expect(nativeResult.pause).toEqual(expectedPause);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      trackedNodeStylesheet,
      'trace-tracked-node-template-pause.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedResult = generatedModule.transform(trackedNodeSourceXml, {
      trace: {
        documentUri: 'memory:/tracked-node.xml',
        breakpoints: [
          {
            node: trackedNodeHandle,
            on: ['template-enter'],
          },
        ],
      },
    });

    expect(generatedResult.output).toBe('<out><p>alpha</p><p>beta</p></out>');
    expect(generatedResult.pause).toEqual(expectedPause);
  });

  it('tracks a selected para node through a value-read pause on the interpreter, native, and generated-module paths', () => {
    const trackedNodeStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/doc/section/para"/></out>',
      '  </xsl:template>',
      '  <xsl:template match="para">',
      '    <p><xsl:value-of select="."/></p>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const trackedNodeSourceXml = [
      '<doc>',
      '  <section>',
      '    <para>alpha</para>',
      '    <para>beta</para>',
      '  </section>',
      '</doc>',
    ].join('');
    const trackedNodeHandle = createTrackedElementHandle(
      trackedNodeSourceXml,
      'memory:/tracked-node.xml',
      'para',
      1,
    );
    const expectedPause: XmlTracePause = {
      event: {
        kind: 'value-read',
        node: trackedNodeHandle,
        instruction: {
          kind: 'xsl:value-of',
          location: expect.any(Object),
        },
      },
      frames: [
        {
          kind: 'instruction',
          label: 'xsl:value-of',
          location: expect.any(Object),
        },
      ],
    };

    const interpreterResult = new XsltProcessor(trackedNodeStylesheet).transform(
      trackedNodeSourceXml,
      {
        execution: 'interpreter',
        trace: {
          documentUri: 'memory:/tracked-node.xml',
          breakpoints: [
            {
              node: trackedNodeHandle,
              on: ['value-read'],
            },
          ],
        },
      },
    );

    expect(interpreterResult.output).toBe('<out><p>alpha</p><p>beta</p></out>');
    expect(interpreterResult.pause).toEqual(expectedPause);

    const nativeResult = new XsltProcessor(trackedNodeStylesheet).transform(trackedNodeSourceXml, {
      execution: 'native',
      trace: {
        documentUri: 'memory:/tracked-node.xml',
        breakpoints: [
          {
            node: trackedNodeHandle,
            on: ['value-read'],
          },
        ],
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<out><p>alpha</p><p>beta</p></out>');
    expect(nativeResult.pause).toEqual(expectedPause);

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      trackedNodeStylesheet,
      'trace-tracked-node-value-read-pause.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedResult = generatedModule.transform(trackedNodeSourceXml, {
      trace: {
        documentUri: 'memory:/tracked-node.xml',
        breakpoints: [
          {
            node: trackedNodeHandle,
            on: ['value-read'],
          },
        ],
      },
    });

    expect(generatedResult.output).toBe('<out><p>alpha</p><p>beta</p></out>');
    expect(generatedResult.pause).toEqual(expectedPause);
  });

  it('does not pause when a breakpoint targets a non-matching tracked node', () => {
    const trackedNodeStylesheet = [
      '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:template match="/">',
      '    <out><xsl:apply-templates select="/doc/section/para[1]"/></out>',
      '  </xsl:template>',
      '  <xsl:template match="para">',
      '    <p><xsl:value-of select="."/></p>',
      '  </xsl:template>',
      '</xsl:stylesheet>',
    ].join('\n');
    const trackedNodeSourceXml = [
      '<doc>',
      '  <section>',
      '    <para>alpha</para>',
      '    <para>beta</para>',
      '  </section>',
      '</doc>',
    ].join('');
    const nonMatchingHandle = createTrackedElementHandle(
      trackedNodeSourceXml,
      'memory:/tracked-node.xml',
      'para',
      1,
    );

    const interpreterResult = new XsltProcessor(trackedNodeStylesheet).transform(
      trackedNodeSourceXml,
      {
        execution: 'interpreter',
        trace: {
          documentUri: 'memory:/tracked-node.xml',
          breakpoints: [
            {
              node: nonMatchingHandle,
              on: ['focus-enter', 'template-enter', 'instruction-select', 'value-read'],
            },
          ],
        },
      },
    );

    expect(interpreterResult.output).toBe('<out><p>alpha</p></out>');
    expect(interpreterResult.pause).toBeUndefined();

    const nativeResult = new XsltProcessor(trackedNodeStylesheet).transform(trackedNodeSourceXml, {
      execution: 'native',
      trace: {
        documentUri: 'memory:/tracked-node.xml',
        breakpoints: [
          {
            node: nonMatchingHandle,
            on: ['focus-enter', 'template-enter', 'instruction-select', 'value-read'],
          },
        ],
      },
    });

    expect(nativeResult.execution?.resolved).toBe('native');
    expect(nativeResult.output).toBe('<out><p>alpha</p></out>');
    expect(nativeResult.pause).toBeUndefined();

    const { diagnostics, exports } = compileAndLoadGeneratedModule(
      trackedNodeStylesheet,
      'trace-tracked-node-non-match-pause.xsl',
    );

    expect(diagnostics).toEqual([]);

    const generatedModule = exports as {
      readonly transform: (
        source: string,
        ctx?: Parameters<XsltProcessor['transform']>[1],
      ) => ReturnType<XsltProcessor['transform']>;
    };
    const generatedResult = generatedModule.transform(trackedNodeSourceXml, {
      trace: {
        documentUri: 'memory:/tracked-node.xml',
        breakpoints: [
          {
            node: nonMatchingHandle,
            on: ['focus-enter', 'template-enter', 'instruction-select', 'value-read'],
          },
        ],
      },
    });

    expect(generatedResult.output).toBe('<out><p>alpha</p></out>');
    expect(generatedResult.pause).toBeUndefined();
  });
});

function createTrackedElementHandle(
  sourceXml: string,
  documentUri: string,
  localName: string,
  zeroBasedIndex: number,
) {
  const document = createCompiledDocument(sourceXml);
  const nodes = document.getElementsByTagName(localName);
  const node = nodes.item(zeroBasedIndex);
  if (node === null) {
    throw new Error(`Could not find ${localName}[${zeroBasedIndex + 1}] in ${documentUri}.`);
  }

  return createXmlNodeHandle(node, documentUri);
}
