import type { SourceSpan } from '../lex/lexer.js';

export type XPathAst =
  | BinaryExpression
  | ContextItemExpression
  | ForExpression
  | FunctionCallExpression
  | IfExpression
  | LetExpression
  | NumberLiteral
  | PathExpression
  | QuantifiedExpression
  | SequenceExpression
  | StringLiteral
  | UnaryExpression
  | VariableReference;

export type XPathAxis =
  | 'ancestor'
  | 'ancestor-or-self'
  | 'attribute'
  | 'child'
  | 'descendant'
  | 'descendant-or-self'
  | 'following'
  | 'following-sibling'
  | 'parent'
  | 'preceding'
  | 'preceding-sibling'
  | 'self';

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
  | 'eq'
  | 'ge'
  | 'gt'
  | 'is'
  | 'le'
  | 'lt'
  | 'ne'
  | '<<'
  | 'or'
  | 'to'
  | '>>';

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

export interface FunctionCallExpression {
  readonly kind: 'functionCall';
  readonly callee: string;
  readonly arguments: readonly XPathAst[];
  readonly span: SourceSpan;
}

export interface IfExpression {
  readonly kind: 'if';
  readonly test: XPathAst;
  readonly thenBranch: XPathAst;
  readonly elseBranch: XPathAst;
  readonly span: SourceSpan;
}

export interface LetBinding {
  readonly name: string;
  readonly value: XPathAst;
  readonly span: SourceSpan;
}

export interface FlowBinding {
  readonly name: string;
  readonly value: XPathAst;
  readonly span: SourceSpan;
}

export interface LetExpression {
  readonly kind: 'let';
  readonly bindings: readonly LetBinding[];
  readonly returnExpr: XPathAst;
  readonly span: SourceSpan;
}

export interface ForExpression {
  readonly kind: 'for';
  readonly bindings: readonly FlowBinding[];
  readonly returnExpr: XPathAst;
  readonly span: SourceSpan;
}

export interface QuantifiedExpression {
  readonly kind: 'quantified';
  readonly quantifier: 'some' | 'every';
  readonly bindings: readonly FlowBinding[];
  readonly satisfiesExpr: XPathAst;
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

export interface SequenceExpression {
  readonly kind: 'sequence';
  readonly items: readonly XPathAst[];
  readonly span: SourceSpan;
}
