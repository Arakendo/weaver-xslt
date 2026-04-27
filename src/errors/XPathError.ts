import { XdmError, type ErrorDetails, type SourceLocation } from './XdmError.js';
import type { ErrorCode } from './codes.js';

/** Errors raised by the XPath lexer, parser, or evaluator. */
export class XPathError extends XdmError {
  constructor(code: ErrorCode, message: string, location?: SourceLocation, details?: ErrorDetails) {
    super(code, message, location, details);
    this.name = 'XPathError';
  }
}
