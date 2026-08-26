import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

import { expect, test } from 'vitest';

import { compileStylesheetArtifacts } from '../../src/compile.js';
import { XsltProcessor } from '../../src/index.js';
import { bundleJs } from '../../src/processor/bundleJs.js';
import { transpileTsToJs } from '../../src/processor/emitJs.js';
import type { TransformOptions } from '../../src/processor/types.js';

// Minimal XSLT stylesheet for testing JS emission
const MINIMAL_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html><body><xsl:value-of select="/"/></body></html>
  </xsl:template>
</xsl:stylesheet>`;

// Simple stylesheet with multiple template rules
const MULTI_TEMPLATE_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <root><xsl:apply-templates/></root>
  </xsl:template>
  <xsl:template match="item">
    <li><xsl:value-of select="."/></li>
  </xsl:template>
</xsl:stylesheet>`;

const DOCUMENT_FUNCTION_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <out><xsl:value-of select="document('other.xml')/root/name"/></out>
  </xsl:template>
</xsl:stylesheet>`;

const PARAMETERIZED_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:param name="greeting" select="'hello'"/>
  <xsl:template match="/root">
    <out><xsl:value-of select="$greeting"/></out>
  </xsl:template>
</xsl:stylesheet>`;

const INITIAL_TEMPLATE_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:t="urn:test">
  <xsl:template match="/root"><wrong/></xsl:template>
  <xsl:template name="t:main">
    <out>ok</out>
  </xsl:template>
</xsl:stylesheet>`;

const REPRESENTATIVE_PARITY_CASES = [
  {
    name: 'minimal',
    stylesheet: MINIMAL_XSL,
    sourceXml: '<root/>',
  },
  {
    name: 'multi-template',
    stylesheet: MULTI_TEMPLATE_XSL,
    sourceXml: '<root><item>first</item><item>second</item></root>',
  },
] as const;

// Test helper: compile and transpile to JS
function compileAndTranspile(
  xsl: string,
  baseName: string,
): {
  js: string;
  sourceMap: string;
  digest: string;
  diagnosticsCount: number;
} {
  const artifacts = compileStylesheetArtifacts(xsl, {
    path: baseName,
    emitTargets: ['js'],
  });

  const jsResult = transpileTsToJs(artifacts.module, { sourcePath: baseName });

  return {
    js: jsResult.js,
    sourceMap: jsResult.sourceMap,
    digest: artifacts.digest,
    diagnosticsCount: artifacts.diagnostics.length,
  };
}

// Test helper: verify source map is valid JSON
function isValidSourceMap(sourceMap: string): boolean {
  try {
    const parsed = JSON.parse(sourceMap);
    return parsed.version === 3 && typeof parsed.mappings === 'string';
  } catch {
    return false;
  }
}

function createRuntimeSpecifier(tempDir: string): string {
  const relativePath = relative(tempDir, join(process.cwd(), 'src/runtime/index.ts')).replaceAll(
    '\\',
    '/',
  );
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

async function emitJsModule(
  stylesheet: string,
  baseName: string,
  tempDir: string,
): Promise<{
  readonly artifacts: ReturnType<typeof compileStylesheetArtifacts>;
  readonly module: {
    readonly source: { readonly path: string; readonly digest: string };
    readonly transform: (
      xml: string,
      ctx?: TransformOptions,
    ) => ReturnType<XsltProcessor['transform']>;
  };
}> {
  const artifacts = compileStylesheetArtifacts(stylesheet, {
    path: `${baseName}.xsl`,
    emitTargets: ['js'],
    runtimeModuleSpecifier: createRuntimeSpecifier(tempDir),
  });
  const jsResult = transpileTsToJs(artifacts.module, { sourcePath: `${baseName}.xsl` });
  const jsPath = join(tempDir, `${baseName}.xsl.js`);
  const jsMapPath = join(tempDir, `${baseName}.xsl.js.map`);

  writeFileSync(jsPath, jsResult.js, 'utf8');
  writeFileSync(jsMapPath, jsResult.sourceMap, 'utf8');

  const module = (await import(/* @vite-ignore */ decodeURI(pathToFileURL(jsPath).href))) as {
    readonly source: { readonly path: string; readonly digest: string };
    readonly transform: (
      xml: string,
      ctx?: TransformOptions,
    ) => ReturnType<XsltProcessor['transform']>;
  };

  return { artifacts, module };
}

async function emitBundleModule(
  stylesheet: string,
  baseName: string,
  tempDir: string,
): Promise<{
  readonly artifacts: ReturnType<typeof compileStylesheetArtifacts>;
  readonly bundle: ReturnType<typeof bundleJs>;
  readonly module: {
    readonly source: { readonly path: string; readonly digest: string };
    readonly transform: (
      xml: string,
      ctx?: TransformOptions,
    ) => ReturnType<XsltProcessor['transform']>;
  };
}> {
  const artifacts = compileStylesheetArtifacts(stylesheet, {
    path: `${baseName}.xsl`,
    emitTargets: ['bundle'],
  });
  const jsResult = transpileTsToJs(artifacts.module, { sourcePath: `${baseName}.xsl` });
  const bundle = bundleJs({
    jsModule: jsResult.js,
    sourcePath: join(tempDir, `${baseName}.xsl`),
  });
  const bundlePath = join(tempDir, `${baseName}.xsl.bundle.js`);
  const bundleMapPath = join(tempDir, `${baseName}.xsl.bundle.js.map`);

  writeFileSync(
    bundlePath,
    `${bundle.js}\n//# sourceMappingURL=${bundleMapPath.split('/').pop()}\n`,
    'utf8',
  );
  writeFileSync(bundleMapPath, bundle.sourceMap, 'utf8');

  const module = (await import(/* @vite-ignore */ decodeURI(pathToFileURL(bundlePath).href))) as {
    readonly source: { readonly path: string; readonly digest: string };
    readonly transform: (
      xml: string,
      ctx?: TransformOptions,
    ) => ReturnType<XsltProcessor['transform']>;
  };

  return { artifacts, bundle, module };
}

function listFilesRecursively(rootPath: string): string[] {
  const entries = readdirSync(rootPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(entryPath));
      continue;
    }
    files.push(entryPath);
  }

  return files;
}

test('JS emission produces valid transpiled output', () => {
  const result = compileAndTranspile(MINIMAL_XSL, 'test.xsl');

  expect(result.js.length).toBeGreaterThan(0);
  expect(result.sourceMap.length).toBeGreaterThan(0);
  expect(result.digest.length).toBe(8);
  expect(result.diagnosticsCount).toBe(0);
});

test('transpiled JS preserves source and transform exports', () => {
  const result = compileAndTranspile(MINIMAL_XSL, 'test.xsl');

  // Check that the transpiled JS contains the expected export structure
  expect(result.js).toContain('source');
  expect(result.js).toContain('transform');
});

test('transpiled JS source map is valid', () => {
  const result = compileAndTranspile(MINIMAL_XSL, 'test.xsl');

  // Debug: print the source map to see what we got
  if (!isValidSourceMap(result.sourceMap)) {
    console.log('sourceMap:', result.sourceMap.slice(0, 500));
  }
  expect(isValidSourceMap(result.sourceMap)).toBe(true);
});

test('transpiled JS contains ES imports', () => {
  const result = compileAndTranspile(MINIMAL_XSL, 'test.xsl');

  // The transpiled JS should contain ES import statements
  expect(result.js.includes('import')).toBe(true);
});

test('multi-template stylesheet transpiles correctly', () => {
  const result = compileAndTranspile(MULTI_TEMPLATE_XSL, 'multi.xsl');

  expect(result.js.length).toBeGreaterThan(0);
  expect(result.digest.length).toBe(8);
  expect(isValidSourceMap(result.sourceMap)).toBe(true);
});

test('digest matches between TS and JS artifacts', () => {
  const tsOnly = compileStylesheetArtifacts(MINIMAL_XSL, { path: 'digest-test.xsl' });
  const withJs = compileStylesheetArtifacts(MINIMAL_XSL, {
    path: 'digest-test.xsl',
    emitTargets: ['js'],
  });

  expect(tsOnly.digest).toBe(withJs.digest);
});

test('emitTargets option passes through to compile pipeline', () => {
  // This test verifies that the emitTargets option is passed through correctly
  const result = compileStylesheetArtifacts(MINIMAL_XSL, {
    path: 'profile-test.xsl',
    emitTargets: ['js'],
  });

  expect(result.module.length).toBeGreaterThan(0);
  expect(result.digest.length).toBe(8);
});

test('bundle emission imports and runs without package runtime dependency', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'weaver-bundle-'));

  try {
    const artifacts = compileStylesheetArtifacts(MINIMAL_XSL, {
      path: 'bundle-test.xsl',
      emitTargets: ['bundle'],
    });
    const jsResult = transpileTsToJs(artifacts.module, { sourcePath: 'bundle-test.xsl' });
    const bundleResult = bundleJs({
      jsModule: jsResult.js,
      sourcePath: join(tempDir, 'bundle-test.xsl'),
    });
    const bundlePath = join(tempDir, 'bundle-test.xsl.bundle.js');
    const bundleMapPath = join(tempDir, 'bundle-test.xsl.bundle.js.map');

    writeFileSync(
      bundlePath,
      `${bundleResult.js}\n//# sourceMappingURL=${bundleMapPath.split('/').pop()}\n`,
      'utf8',
    );
    writeFileSync(bundleMapPath, bundleResult.sourceMap, 'utf8');

    const bundledModule = (await import(
      /* @vite-ignore */ decodeURI(pathToFileURL(bundlePath).href)
    )) as {
      readonly source: { readonly digest: string };
      readonly transform: (xml: string) => ReturnType<XsltProcessor['transform']>;
    };
    const interpreterResult = new XsltProcessor(MINIMAL_XSL).transform('<root/>');

    expect(bundleResult.js).not.toMatch(/from ['"]@arakendo\/weaver-xslt\/runtime['"]/);
    expect(bundleResult.js).not.toMatch(/from ['"]@xmldom\/xmldom['"]/);
    expect(bundledModule.source.digest).toBe(artifacts.digest);
    expect(bundledModule.transform('<root/>')).toEqual(interpreterResult);
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test('emitted js module returns the same transform result shape as the processor contract', async () => {
  const tempDir = mkdtempSync(join(process.cwd(), '.tmp-weaver-js-'));

  try {
    const { artifacts, module: emittedModule } = await emitJsModule(
      MINIMAL_XSL,
      'shape-test',
      tempDir,
    );
    const interpreterResult = new XsltProcessor(MINIMAL_XSL).transform('<root/>');
    const emittedResult = emittedModule.transform('<root/>');

    expect(emittedModule.source.digest).toBe(artifacts.digest);
    expect(emittedModule.source.path).toBe('shape-test.xsl');
    expect(emittedResult).toEqual(interpreterResult);
    expect(emittedResult).toHaveProperty('output');
    expect(emittedResult.output).toContain('<html><body>');
    expect('execution' in emittedResult).toBe(false);
    expect('secondaryOutputs' in emittedResult).toBe(false);
    expect('pause' in emittedResult).toBe(false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test('emitted js and bundle preserve parameter overrides through the generated module surface', async () => {
  const tempDir = mkdtempSync(join(process.cwd(), '.tmp-weaver-params-'));

  try {
    const sourceXml = '<root/>';
    const options = {
      parameters: {
        greeting: 'hi',
      },
    };
    const interpreterResult = new XsltProcessor(PARAMETERIZED_XSL).transform(sourceXml, options);
    const { module: jsModule } = await emitJsModule(PARAMETERIZED_XSL, 'params-js', tempDir);
    const { module: bundleModule } = await emitBundleModule(
      PARAMETERIZED_XSL,
      'params-bundle',
      tempDir,
    );

    expect(jsModule.transform(sourceXml, options)).toEqual(interpreterResult);
    expect(bundleModule.transform(sourceXml, options)).toEqual(interpreterResult);
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test('emitted js and bundle preserve prefixed initialTemplate selection through the generated module surface', async () => {
  const tempDir = mkdtempSync(join(process.cwd(), '.tmp-weaver-initial-template-'));

  try {
    const sourceXml = '<root/>';
    const options = {
      initialTemplate: 't:main',
    };
    const interpreterResult = new XsltProcessor(INITIAL_TEMPLATE_XSL).transform(sourceXml, options);
    const { module: jsModule } = await emitJsModule(
      INITIAL_TEMPLATE_XSL,
      'initial-template-js',
      tempDir,
    );
    const { module: bundleModule } = await emitBundleModule(
      INITIAL_TEMPLATE_XSL,
      'initial-template-bundle',
      tempDir,
    );

    expect(jsModule.transform(sourceXml, options)).toEqual(interpreterResult);
    expect(bundleModule.transform(sourceXml, options)).toEqual(interpreterResult);
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

for (const fixture of REPRESENTATIVE_PARITY_CASES) {
  test(`emitted js and bundle stay in parity for representative slice: ${fixture.name}`, async () => {
    const tempDir = mkdtempSync(join(process.cwd(), `.tmp-weaver-parity-${fixture.name}-`));

    try {
      const interpreterResult = new XsltProcessor(fixture.stylesheet).transform(fixture.sourceXml);
      const { artifacts: jsArtifacts, module: jsModule } = await emitJsModule(
        fixture.stylesheet,
        `${fixture.name}-js`,
        tempDir,
      );
      const {
        artifacts: bundleArtifacts,
        bundle,
        module: bundleModule,
      } = await emitBundleModule(fixture.stylesheet, `${fixture.name}-bundle`, tempDir);

      expect(jsArtifacts.digest).toBe(bundleArtifacts.digest);
      expect(jsModule.source.digest).toBe(jsArtifacts.digest);
      expect(bundleModule.source.digest).toBe(bundleArtifacts.digest);
      expect(jsModule.transform(fixture.sourceXml)).toEqual(interpreterResult);
      expect(bundleModule.transform(fixture.sourceXml)).toEqual(interpreterResult);
      expect(bundle.js).not.toMatch(/from ['"]@arakendo\/weaver-xslt\/runtime['"]/);
    } finally {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });
}

test('host can swap between two emitted renderer bundles for the same XML by id', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'weaver-renderer-swap-'));

  const firstStylesheet = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <hello>alpha</hello>
  </xsl:template>
</xsl:stylesheet>`;
  const secondStylesheet = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <hello>beta</hello>
  </xsl:template>
</xsl:stylesheet>`;

  try {
    const firstArtifacts = compileStylesheetArtifacts(firstStylesheet, {
      path: 'alpha.xsl',
      emitTargets: ['bundle'],
    });
    const secondArtifacts = compileStylesheetArtifacts(secondStylesheet, {
      path: 'beta.xsl',
      emitTargets: ['bundle'],
    });
    const firstBundle = bundleJs({
      jsModule: transpileTsToJs(firstArtifacts.module, { sourcePath: 'alpha.xsl' }).js,
      sourcePath: join(tempDir, 'alpha.xsl'),
    });
    const secondBundle = bundleJs({
      jsModule: transpileTsToJs(secondArtifacts.module, { sourcePath: 'beta.xsl' }).js,
      sourcePath: join(tempDir, 'beta.xsl'),
    });
    const firstBundlePath = join(tempDir, 'alpha.xsl.bundle.js');
    const firstBundleMapPath = join(tempDir, 'alpha.xsl.bundle.js.map');
    const secondBundlePath = join(tempDir, 'beta.xsl.bundle.js');
    const secondBundleMapPath = join(tempDir, 'beta.xsl.bundle.js.map');

    writeFileSync(
      firstBundlePath,
      `${firstBundle.js}\n//# sourceMappingURL=${firstBundleMapPath.split('/').pop()}\n`,
      'utf8',
    );
    writeFileSync(firstBundleMapPath, firstBundle.sourceMap, 'utf8');
    writeFileSync(
      secondBundlePath,
      `${secondBundle.js}\n//# sourceMappingURL=${secondBundleMapPath.split('/').pop()}\n`,
      'utf8',
    );
    writeFileSync(secondBundleMapPath, secondBundle.sourceMap, 'utf8');

    const alphaRenderer = (await import(
      /* @vite-ignore */ decodeURI(pathToFileURL(firstBundlePath).href)
    )) as {
      readonly source: { readonly digest: string };
      readonly transform: (xml: string) => ReturnType<XsltProcessor['transform']>;
    };
    const betaRenderer = (await import(
      /* @vite-ignore */ decodeURI(pathToFileURL(secondBundlePath).href)
    )) as {
      readonly source: { readonly digest: string };
      readonly transform: (xml: string) => ReturnType<XsltProcessor['transform']>;
    };

    const renderers = new Map([
      ['alpha', alphaRenderer],
      ['beta', betaRenderer],
    ]);
    const sourceXml = '<root/>';
    const alphaResult = renderers.get('alpha')?.transform(sourceXml);
    const betaResult = renderers.get('beta')?.transform(sourceXml);

    expect(alphaRenderer.source.digest).not.toBe(betaRenderer.source.digest);
    expect(alphaResult?.output).toContain('<hello>alpha</hello>');
    expect(betaResult?.output).toContain('<hello>beta</hello>');
    expect(alphaResult).not.toEqual(betaResult);
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test('src/xslt boundary stays free of bundler-only imports', () => {
  const xsltRoot = join(process.cwd(), 'src/xslt');
  const importPattern =
    /^\s*import\s+.*from\s+['"](esbuild|node:(?:fs|path|url|module))['"];?|\bimport\(\s*['"](esbuild|node:(?:fs|path|url|module))['"]\s*\)/m;
  const violations = listFilesRecursively(xsltRoot)
    .filter((filePath) => filePath.endsWith('.ts'))
    .filter((filePath) => importPattern.test(readFileSync(filePath, 'utf8')));

  expect(violations).toEqual([]);
});

test('emitted js and bundle artifacts do not introduce dynamic eval or network-capability APIs', async () => {
  const tempDir = mkdtempSync(join(process.cwd(), '.tmp-weaver-boundary-'));

  try {
    const { module: jsModule } = await emitJsModule(MINIMAL_XSL, 'boundary-js', tempDir);
    const { bundle } = await emitBundleModule(MINIMAL_XSL, 'boundary-bundle', tempDir);
    const forbiddenPattern =
      /\bnew Function\b|\beval\s*\(|\bfetch\s*\(|\bXMLHttpRequest\b|\bhttp\.request\b|\bhttps\.request\b/;
    const jsSource = readFileSync(join(tempDir, 'boundary-js.xsl.js'), 'utf8');

    expect(jsSource).not.toMatch(forbiddenPattern);
    expect(bundle.js).not.toMatch(forbiddenPattern);
    expect(jsModule.transform('<root/>').output).toContain('<html><body>');
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test('document()-using bundle preserves an explicit node:fs capability edge', async () => {
  const tempDir = mkdtempSync(join(process.cwd(), '.tmp-weaver-document-boundary-'));

  try {
    const { bundle } = await emitBundleModule(DOCUMENT_FUNCTION_XSL, 'document-boundary', tempDir);

    expect(bundle.js).toMatch(/from ['"]node:fs['"]|import ['"]node:fs['"]/);
    expect(bundle.js).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
