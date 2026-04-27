import type { SourceSpan } from '../lex/lexer.js';

export type XPathAst =
  | BinaryExpression
  | ContextItemExpression
  | NumberLiteral
  | PathExpression
  | StringLiteral
  | UnaryExpression
  | VariableReference;

export type XPathAxis = 'attribute' | 'child' | 'descendant' | 'descendant-or-self' | 'self';

export type XPathBinaryOperator =
  | '+'
  | '-'
  | '*'
  | 'div'
  | 'mod'
  | '='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'and'
  | 'or';

export interface BinaryExpression {
  readonly kind: 'binary';
  readonly operator: XPathBinaryOperator;
  readonly left: XPathAst;
  readonly right: XPathAst;
  readonly span: SourceSpan;
}

export interface ContextItemExpression {
  readonly kind: 'contextItem';
  readonly span: SourceSpan;
}

export interface KindTest {
  readonly kind: 'kindTest';
  readonly name: 'node' | 'text';
  readonly span: SourceSpan;
}

export interface NameTest {
  readonly kind: 'nameTest';
  readonly name: string;
  readonly span: SourceSpan;
}

export interface NumberLiteral {
  readonly kind: 'number';
  readonly lexeme: string;
  readonly value: number;
  readonly span: SourceSpan;
}

export interface StringLiteral {
  readonly kind: 'string';
  readonly lexeme: string;
  readonly value: string;
  readonly span: SourceSpan;
}

export interface UnaryExpression {
  readonly kind: 'unary';
  readonly operator: '-';
  readonly operand: XPathAst;
  readonly span: SourceSpan;
}

export interface VariableReference {
  readonly kind: 'variable';
  readonly name: string;
  readonly span: SourceSpan;
}

export interface WildcardTest {
  readonly kind: 'wildcardTest';
  readonly span: SourceSpan;
}

export interface PathExpression {
  readonly kind: 'path';
  readonly absolute: boolean;
  readonly steps: readonly StepExpression[];
  readonly span: SourceSpan;
}

export interface StepExpression {
  readonly kind: 'step';
  readonly axis: XPathAxis;
  readonly nodeTest: KindTest | NameTest | WildcardTest;
  readonly predicates: readonly XPathAst[];
  readonly span: SourceSpan;
}
