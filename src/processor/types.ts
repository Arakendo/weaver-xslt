import type { ErrorFrame, ErrorSuggestion, SourceLocation } from '../errors/index.js';

/**
 * Options accepted by {@link XsltProcessor.transform}.
 */
export type TransformExecutionMode = 'interpreter' | 'native' | 'auto';

export type TransformExecutionFallbackReasonCode =
  | 'unsupported_stylesheet'
  | 'native_runtime_unavailable';

export interface XmlNodeHandle {
  documentUri: string;
  kind: 'document' | 'element' | 'attribute' | 'text' | 'comment' | 'pi';
  path: string;
}

export type XmlTraceEventKind =
  | 'focus-enter'
  | 'template-enter'
  | 'instruction-select'
  | 'value-read';

export interface XmlTraceTemplateInfo {
  match?: string;
  name?: string;
  location?: SourceLocation;
}

export interface XmlTraceInstructionInfo {
  kind: string;
  location?: SourceLocation;
}

export interface XmlTraceEvent {
  kind: XmlTraceEventKind;
  node: XmlNodeHandle;
  template?: XmlTraceTemplateInfo;
  instruction?: XmlTraceInstructionInfo;
}

export interface XmlTracePause {
  event: XmlTraceEvent;
  frames: readonly ErrorFrame[];
}

export interface XmlTraceBreakpoint {
  node: XmlNodeHandle;
  on: readonly XmlTraceEventKind[];
}

export interface TransformTraceOptions {
  /** Stable document identity for trace events within the current transform session. */
  documentUri?: string;
  /** Optional future-facing breakpoint predicates over node identity and event kinds. */
  breakpoints?: readonly XmlTraceBreakpoint[];
  /** Optional event sink for hosts that want runtime node-trace notifications. */
  onEvent?: (event: XmlTraceEvent) => void;
  /** Optional pause sink for hosts that want the first matching breakpoint payload. */
  onPause?: (pause: XmlTracePause) => void;
}

export interface TransformExecutionFallbackReason {
  /** Stable machine-readable reason for leaving the native path. */
  code: TransformExecutionFallbackReasonCode;
  /** Human-readable explanation of why native execution was not used. */
  message: string;
  /** Optional remediation hints for callers that want to surface fallback guidance. */
  suggestions?: readonly ErrorSuggestion[];
}

export interface TransformExecutionInfo {
  /** Requested execution strategy. */
  requested: TransformExecutionMode;
  /** Strategy actually used for the transform. */
  resolved: 'interpreter' | 'native';
  /** Present when the requested strategy could not stay on native execution. */
  fallbackReason?: TransformExecutionFallbackReason;
}

export interface TransformCoverageOptions {
  /** When true, collect runtime XML coverage warnings for the current transform. */
  report?: boolean;
  /** Minimum confidence level to include in the result. Defaults to high. */
  minConfidence?: 'high' | 'medium';
}

export interface TransformCoverageWarning {
  code: 'possible_unhandled_xml_tag';
  nodeKind: 'element' | 'attribute';
  namespaceUri: string;
  localName: string;
  count: number;
  confidence: 'high' | 'medium';
  message: string;
}

export interface TransformOptions {
  /** Initial template name (xsl:call-template equivalent). */
  initialTemplate?: string;
  /** Initial mode for apply-templates. */
  initialMode?: string;
  /** Requested execution strategy for the transform. */
  execution?: TransformExecutionMode;
  /** Stylesheet parameters (top-level xsl:param values). */
  parameters?: Readonly<Record<string, unknown>>;
  /** Base URI used to resolve document() / doc() calls. */
  baseUri?: string;
  /** Optional runtime XML coverage reporting for likely unhandled source names. */
  coverage?: TransformCoverageOptions;
  /** Optional runtime XML node trace configuration for hosts/debug tooling. */
  trace?: TransformTraceOptions;
}

/**
 * Result of a transformation.
 */
export interface TransformResult {
  /** Serialized primary result document. */
  output: string;
  /** Secondary result documents keyed by their href (xsl:result-document). */
  secondaryOutputs?: Readonly<Record<string, string>>;
  /** Runtime source-XML names that appeared uncovered by the stylesheet. */
  coverageWarnings?: readonly TransformCoverageWarning[];
  /** First matched XML-node trace pause for the current transform, when any breakpoint fired. */
  pause?: XmlTracePause;
  /** Execution strategy information when an explicit strategy was requested. */
  execution?: TransformExecutionInfo;
}
