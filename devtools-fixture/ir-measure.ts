import { transformCompiledStylesheet, type StylesheetIR } from '../src/runtime/index.ts';

const form = document.querySelector<HTMLFormElement>('#measure-form');
const assetInput = document.querySelector<HTMLInputElement>('#asset-url');
const sourceXmlInput = document.querySelector<HTMLTextAreaElement>('#source-xml');
const status = document.querySelector<HTMLDivElement>('#status');
const metrics = document.querySelector<HTMLTableSectionElement>('#metrics');
const output = document.querySelector<HTMLPreElement>('#output');

if (
  form === null ||
  assetInput === null ||
  sourceXmlInput === null ||
  status === null ||
  metrics === null ||
  output === null
) {
  throw new Error('IR measure fixture DOM did not initialize correctly.');
}

const params = new URLSearchParams(window.location.search);
const initialAsset = params.get('asset');
if (initialAsset !== null) {
  assetInput.value = initialAsset;
}

function heapUsed(): number | undefined {
  const performanceWithMemory = performance as Performance & {
    readonly memory?: { readonly usedJSHeapSize?: number };
  };
  return performanceWithMemory.memory?.usedJSHeapSize;
}

function formatMs(ms: number): string {
  return `${ms.toFixed(1)} ms`;
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) {
    return 'n/a';
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function setMetricRows(rows: ReadonlyArray<readonly [string, string]>): void {
  metrics.innerHTML = rows
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function measureIr(assetUrl: string, sourceXml: string): Promise<void> {
  status.textContent = `Loading ${assetUrl} ...`;
  output.textContent = '';
  setMetricRows([]);

  const heapBeforeFetch = heapUsed();
  const fetchStartedAt = performance.now();
  const response = await fetch(assetUrl, { cache: 'force-cache' });
  const fetchHeadersAt = performance.now();
  const text = await response.text();
  const fetchCompletedAt = performance.now();
  const heapAfterFetch = heapUsed();

  const parseStartedAt = performance.now();
  const ir = JSON.parse(text) as StylesheetIR;
  const parseCompletedAt = performance.now();
  const heapAfterParse = heapUsed();

  const transformStartedAt = performance.now();
  const result = transformCompiledStylesheet(ir, sourceXml, {});
  const transformCompletedAt = performance.now();
  const heapAfterTransform = heapUsed();

  output.textContent = result.output;
  status.textContent = response.ok
    ? `Loaded ${assetUrl}`
    : `Request completed with ${response.status} ${response.statusText}`;

  setMetricRows([
    ['Fetch headers', formatMs(fetchHeadersAt - fetchStartedAt)],
    ['Fetch body', formatMs(fetchCompletedAt - fetchHeadersAt)],
    ['Fetch total', formatMs(fetchCompletedAt - fetchStartedAt)],
    ['JSON.parse', formatMs(parseCompletedAt - parseStartedAt)],
    ['First transform', formatMs(transformCompletedAt - transformStartedAt)],
    ['End-to-end', formatMs(transformCompletedAt - fetchStartedAt)],
    ['Response text size', formatBytes(new TextEncoder().encode(text).byteLength)],
    ['Heap before fetch', formatBytes(heapBeforeFetch)],
    ['Heap after fetch', formatBytes(heapAfterFetch)],
    ['Heap after parse', formatBytes(heapAfterParse)],
    ['Heap after transform', formatBytes(heapAfterTransform)],
    [
      'Heap delta parse',
      heapAfterParse === undefined || heapAfterFetch === undefined
        ? 'n/a'
        : formatBytes(heapAfterParse - heapAfterFetch),
    ],
    [
      'Heap delta total',
      heapAfterTransform === undefined || heapBeforeFetch === undefined
        ? 'n/a'
        : formatBytes(heapAfterTransform - heapBeforeFetch),
    ],
  ]);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const assetUrl = assetInput.value.trim();
  if (assetUrl.length === 0) {
    status.textContent = 'Provide an IR asset URL first.';
    return;
  }

  void measureIr(assetUrl, sourceXmlInput.value).catch((error: unknown) => {
    status.textContent = error instanceof Error ? error.message : String(error);
    output.textContent = '';
    setMetricRows([]);
  });
});

if (assetInput.value.trim().length > 0) {
  void measureIr(assetInput.value.trim(), sourceXmlInput.value).catch((error: unknown) => {
    status.textContent = error instanceof Error ? error.message : String(error);
  });
}