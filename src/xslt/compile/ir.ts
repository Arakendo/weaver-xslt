/**
 * XSLT stylesheet intermediate representation.
 *
 * The compiler lowers the stylesheet DOM into this plain-data tree so the
 * evaluator never walks the stylesheet DOM at runtime. See DEC-005.
 *
 * Currently just the root shape — instruction kinds will be added.
 */

import type { XPathAst } from '../../xpath/parse/ast.js';
import type { SourceLocation } from '../../errors/index.js';

export interface StylesheetIR {
  readonly version: '3.0';
  readonly namespaces: Readonly<Record<string, string>>;
  readonly defaultElementNamespace: string;
  readonly templates: readonly TemplateRule[];
}

export interface AttributeInstruction {
  readonly name: string;
  readonly value: string;
}

export interface TemplateRule {
  /** Match pattern, pre-parsed. Undefined for named-only templates. */
  readonly match?: XPathAst;
  /** Original match pattern text for diagnostics. */
  readonly matchText?: string;
  /** Source location for the template declaration. */
  readonly location?: SourceLocation;
  /** Template name in Clark notation, if any. */
  readonly name?: string;
  /** Mode set; empty = default (unnamed) mode. */
  readonly modes: readonly string[];
  /** Priority; undefined means compute from pattern. */
  readonly priority?: number;
  /** Sequence of instructions to evaluate. */
  readonly body: readonly Instruction[];
}

export type Instruction =
  | {
      readonly kind: 'literalElement';
      readonly name: string;
      readonly attributes: readonly AttributeInstruction[];
      readonly body: readonly Instruction[];
    }
  | {
      readonly kind: 'literalText';
      readonly text: string;
    }
  | {
      readonly kind: 'valueOf';
      readonly select: XPathAst;
      readonly selectText: string;
      readonly location?: SourceLocation;
      readonly separator?: string;
    }
  | {
      readonly kind: 'applyTemplates';
      readonly selectText?: string;
      readonly select?: XPathAst;
      readonly location?: SourceLocation;
    };
