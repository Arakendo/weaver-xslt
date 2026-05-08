/**
 * Weaver (`@arakendo/weaver-xslt`) — a TypeScript XSLT 3.0 engine.
 *
 * Public entry point. Keep this surface tiny and stable.
 * Internal modules should not be imported by consumers.
 */

export { XsltProcessor } from './processor/XsltProcessor.js';
export type {
	XmlNodeHandle,
	XmlTraceBreakpoint,
	XmlTraceEvent,
	XmlTraceEventKind,
	TransformExecutionFallbackReason,
	TransformExecutionFallbackReasonCode,
	TransformExecutionInfo,
	TransformExecutionMode,
	TransformTraceOptions,
	TransformOptions,
	TransformResult,
} from './processor/types.js';
export { XdmError, XPathError, XsltError, type SourceLocation } from './errors/index.js';
export { defineXsltFunctions } from './functions.js';
export {
	compileStylesheetArtifacts,
	compileStylesheetArtifactsFromFile,
	compileStylesheetToDts,
	compileStylesheetToTs,
} from './compile.js';
export { VERSION } from './version.js';
