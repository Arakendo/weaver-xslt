export interface TransformContext {
  readonly initialTemplate?: string;
  readonly initialMode?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly baseUri?: string;
  readonly trace?: {
    readonly documentUri?: string;
    readonly breakpoints?: readonly unknown[];
    readonly onEvent?: (event: unknown) => void;
    readonly onPause?: (pause: unknown) => void;
  };
}

export interface TransformResult {
  readonly output: string;
  readonly secondaryOutputs?: Readonly<Record<string, string>>;
  readonly pause?: unknown;
}

export type StylesheetIR = unknown;
type NativeNode = unknown;

export function transformCompiledStylesheet(
  _ir: StylesheetIR,
  _sourceXml: string,
  _context: TransformContext = {},
): TransformResult {
  return { output: '' };
}

export function createCompiledDocument(_sourceXml: string): NativeNode {
  return {};
}

export function createTemporaryTreeNode(_serializedContent: string): NativeNode {
  return {};
}

export function escapeText(value: string): string {
  return value;
}

export function stringValueOfNativeValue(_value: unknown): string {
  return '';
}

export function stringValueOfNode(_node: NativeNode): string {
  return '';
}

export function selectSimplePathText(_startNode: NativeNode, _path: readonly string[]): string {
  return '';
}

export function selectSimplePathNode(_startNode: NativeNode, _path: readonly string[]): NativeNode | null {
  return null;
}

export function selectSimplePathNodes(_startNode: NativeNode, _path: readonly string[]): readonly NativeNode[] {
  return [];
}

export function selectSimplePathNodesByStepPlan(
  _startNode: NativeNode,
  _path: readonly ({ readonly name: string })[],
): readonly NativeNode[] {
  return [];
}

export function selectSimplePathExists(_startNode: NativeNode, _path: readonly string[]): boolean {
  return false;
}

export function selectDescendantElementsByName(_startNode: NativeNode, _name: string): readonly NativeNode[] {
  return [];
}

export function applyBuiltInTemplatesByPath(
  _startNode: NativeNode,
  _path: readonly string[],
  _renderTemplate: (templateNode: NativeNode, templateIndex: number, templateNodes: readonly NativeNode[]) => string,
  _absolute = false,
  _ctx?: TransformContext,
  _instruction?: unknown,
): string {
  return '';
}

export function getRecordedTracePause(_trace: TransformContext['trace']): unknown {
  return undefined;
}

export function resetRecordedTracePause(_trace: TransformContext['trace']): void {
  // noop in the test runtime shim
}

export function resetRecordedTraceSummary(_trace: TransformContext['trace']): void {
  // noop in the test runtime shim
}

export function appendCoverageWarnings(
  _ir: StylesheetIR,
  _sourceXml: string,
  _context: TransformContext,
  result: TransformResult,
): TransformResult {
  return result;
}

export function appendTraceSummary(
  _context: TransformContext,
  result: TransformResult,
): TransformResult {
  return result;
}

export function traceFocusEnter(node: NativeNode, _ctx?: TransformContext): NativeNode {
  return node;
}

export function traceTemplateEnter(node: NativeNode, _ctx?: TransformContext, _template?: unknown): NativeNode {
  return node;
}

export function traceSelectedNodes<TNode extends NativeNode>(
  nodes: readonly TNode[],
  _ctx?: TransformContext,
  _instruction?: unknown,
): readonly TNode[] {
  return nodes;
}

export function traceStringValueOfNode(
  node: NativeNode | null,
  _ctx?: TransformContext,
  _instruction?: unknown,
): string {
  return node === null ? '' : stringValueOfNode(node);
}

export function nameOfNode(_node: NativeNode | null): string {
  return '';
}

export function localNameOfNode(_node: NativeNode | null): string {
  return '';
}

export function matchesTemplatePath(_node: NativeNode, _path: readonly string[], _absolute = false): boolean {
  return false;
}

export function normalizeNativeTemplateName(templateName: string): string {
  return templateName;
}

export function throwCircularNativeGlobalBinding(
  _bindingKind: 'param' | 'variable',
  _variableName: string,
  _location?: unknown,
): never {
  throw new Error('runtime-shim');
}

export function throwMissingNativeStylesheetParameter(
  _parameterName: string,
  _providedNames: readonly string[] = [],
  _location?: unknown,
): never {
  throw new Error('runtime-shim');
}

export function throwMissingNativeTemplateParameter(
  _parameterName: string,
  _providedNames: readonly string[] = [],
  _location?: unknown,
): never {
  throw new Error('runtime-shim');
}

export function throwMissingNativeInitialTemplate(
  _templateName: string,
  _availableNames: readonly string[] = [],
): never {
  throw new Error('runtime-shim');
}

export function throwUnsupportedNativeInitialMode(_mode: string): never {
  throw new Error('runtime-shim');
}

export function prependNativeGlobalBindingError(
  error: unknown,
  _bindingKind: 'param' | 'variable',
  _variableName: string,
  _selectText?: string,
  _location?: unknown,
): never {
  throw error instanceof Error ? error : new Error('runtime-shim');
}

export function prependNativeInitialTemplateError(
  error: unknown,
  _templateName: string,
  _location?: unknown,
): never {
  throw error instanceof Error ? error : new Error('runtime-shim');
}
