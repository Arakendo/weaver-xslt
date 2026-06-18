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

export const STYLESHEET_IR_VERSION = '1.0' as const;

export interface StylesheetIR {
  readonly version: typeof STYLESHEET_IR_VERSION;
  readonly xsltVersion: '3.0';
  readonly location?: SourceLocation;
  readonly namespaces: Readonly<Record<string, string>>;
  readonly defaultElementNamespace: string;
  readonly globalBindings: readonly GlobalBinding[];
  readonly templates: readonly TemplateRule[];
}

export interface AttributeInstruction {
  readonly name: string;
  readonly value: string;
  readonly location?: SourceLocation;
}

export interface ChooseWhenBranch {
  readonly test: XPathAst;
  readonly testText: string;
  readonly body: readonly Instruction[];
  readonly location?: SourceLocation;
}

export interface TemplateParam {
  readonly name: string;
  readonly asType?: string;
  readonly required?: boolean;
  readonly select?: XPathAst;
  readonly selectText?: string;
  readonly body?: readonly Instruction[];
  readonly location?: SourceLocation;
}

export interface GlobalVariable {
  readonly kind: 'variable';
  readonly name: string;
  readonly select?: XPathAst;
  readonly selectText?: string;
  readonly body?: readonly Instruction[];
  readonly location?: SourceLocation;
}

export interface GlobalParam {
  readonly kind: 'param';
  readonly name: string;
  readonly asType?: string;
  readonly required?: boolean;
  readonly select?: XPathAst;
  readonly selectText?: string;
  readonly body?: readonly Instruction[];
  readonly location?: SourceLocation;
}

export type GlobalBinding = GlobalVariable | GlobalParam;

export interface WithParam {
  readonly name: string;
  readonly select?: XPathAst;
  readonly selectText?: string;
  readonly body?: readonly Instruction[];
  readonly location?: SourceLocation;
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
  /** Leading xsl:param declarations for named/template invocation. */
  readonly params: readonly TemplateParam[];
  /** Sequence of instructions to evaluate. */
  readonly body: readonly Instruction[];
}

export type Instruction =
  | {
      readonly kind: 'literalElement';
      readonly name: string;
      readonly attributes: readonly AttributeInstruction[];
      readonly body: readonly Instruction[];
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'attribute';
      readonly name: string;
      readonly select?: XPathAst;
      readonly selectText?: string;
      readonly body?: readonly Instruction[];
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'literalText';
      readonly text: string;
      readonly disableOutputEscaping?: boolean;
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'comment';
      readonly body: readonly Instruction[];
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'variable';
      readonly name: string;
      readonly select?: XPathAst;
      readonly selectText?: string;
      readonly body?: readonly Instruction[];
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'if';
      readonly test: XPathAst;
      readonly testText: string;
      readonly body: readonly Instruction[];
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'choose';
      readonly whenBranches: readonly ChooseWhenBranch[];
      readonly otherwiseBody?: readonly Instruction[];
      readonly otherwiseLocation?: SourceLocation;
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'forEach';
      readonly select: XPathAst;
      readonly selectText: string;
      readonly body: readonly Instruction[];
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'callTemplate';
      readonly name: string;
      readonly withParams: readonly WithParam[];
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'valueOf';
      readonly select: XPathAst;
      readonly selectText: string;
      readonly location?: SourceLocation;
      readonly separator?: string;
      readonly disableOutputEscaping?: boolean;
    }
  | {
      readonly kind: 'copyOf';
      readonly select: XPathAst;
      readonly selectText: string;
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'number';
      readonly count: XPathAst;
      readonly countText: string;
      readonly level: 'single' | 'multiple' | 'any';
      readonly format: string;
      readonly location?: SourceLocation;
    }
  | {
      readonly kind: 'applyTemplates';
      readonly withParams: readonly WithParam[];
      readonly modes: readonly string[];
      readonly selectText?: string;
      readonly select?: XPathAst;
      readonly location?: SourceLocation;
    };
