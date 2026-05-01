import type { Node } from '@xmldom/xmldom';

import { FORG0001, FORG0006, XPTY0004 } from '../../errors/codes.js';
import {
  type XdmArray,
  type XdmAtomicValue,
  type XdmItem,
  type XdmNode,
} from '../../xdm/types.js';

type SpanLike = {
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly end: number;
};

type ComparisonHelperDependencies = {
  createXPathError(code: string, message: string, span: SpanLike, details?: Readonly<Record<string, unknown>>): Error;
  effectiveBooleanValue(items: readonly XdmItem[], span: SpanLike): boolean;
  describeItemsType(items: readonly XdmItem[]): string;
};

export function createComparisonHelpers(dependencies: ComparisonHelperDependencies): {
  compareGeneral(operator: '=' | '!=' | '<' | '<=' | '>' | '>=', leftItems: readonly XdmItem[], rightItems: readonly XdmItem[], span: SpanLike): boolean;
  atomizeItems(items: readonly XdmItem[]): readonly (boolean | number | string)[];
  atomizedNumericValues(items: readonly XdmItem[], span: SpanLike, functionName: string): number[];
  atomizedComparableValues(items: readonly XdmItem[], span: SpanLike, functionName: string): readonly (boolean | number | string)[];
  compareComparableValues(left: boolean | number | string, right: boolean | number | string): number;
  deepEqualSequences(leftItems: readonly XdmItem[], rightItems: readonly XdmItem[]): boolean;
  atomizeSingleton(items: readonly XdmItem[], span: SpanLike): boolean | number | string | undefined;
  compareValueOperands(operator: 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge', left: boolean | number | string, right: boolean | number | string, span: SpanLike): boolean;
} {
  function compareGeneral(
    operator: '=' | '!=' | '<' | '<=' | '>' | '>=',
    leftItems: readonly XdmItem[],
    rightItems: readonly XdmItem[],
    span: SpanLike,
  ): boolean {
    leftItems = expandArrayItems(leftItems);
    rightItems = expandArrayItems(rightItems);

    if (leftItems.length === 0 || rightItems.length === 0) {
      return false;
    }

    for (const leftItem of leftItems) {
      for (const rightItem of rightItems) {
        if (compareGeneralItems(operator, leftItem, rightItem, span)) {
          return true;
        }
      }
    }

    return false;
  }

  function compareGeneralItems(
    operator: '=' | '!=' | '<' | '<=' | '>' | '>=',
    leftItem: XdmItem,
    rightItem: XdmItem,
    span: SpanLike,
  ): boolean {
    const left = atomizeGeneralComparisonOperand(leftItem);
    const right = atomizeGeneralComparisonOperand(rightItem);

    if (left.source === 'qname' || right.source === 'qname') {
      throw dependencies.createXPathError(XPTY0004, 'General comparison requires comparable type families.', span, {
        expectedType: 'comparable general comparison operands',
        actualType: `${left.source} vs ${right.source}`,
      });
    }

    if (left.source === 'boolean' || right.source === 'boolean') {
      if (left.source === 'boolean' && right.source === 'boolean') {
        return compareScalars(operator, left.value, right.value);
      }

      if (left.source === 'boolean' && right.source === 'node') {
        return compareScalars(operator, left.value, dependencies.effectiveBooleanValue([rightItem], span));
      }
      if (left.source === 'node' && right.source === 'boolean') {
        return compareScalars(operator, dependencies.effectiveBooleanValue([leftItem], span), right.value);
      }

      throw dependencies.createXPathError(XPTY0004, 'General comparison requires comparable type families.', span, {
        expectedType: 'comparable general comparison operands',
        actualType: `${left.source} vs ${right.source}`,
      });
    }

    if (left.source === 'number' || right.source === 'number') {
      const numericLeft = toGeneralComparisonNumber(left, span);
      const numericRight = toGeneralComparisonNumber(right, span);
      return compareScalars(operator, numericLeft, numericRight);
    }

    return compareScalars(operator, left.value as string, right.value as string);
  }

  function atomizeGeneralComparisonOperand(item: XdmItem): {
    readonly value: boolean | number | string;
    readonly source: 'boolean' | 'number' | 'string' | 'node' | 'qname';
  } {
    if (item.xdmKind === 'node') {
      return {
        value: (item as XdmNode).node.textContent ?? '',
        source: 'node',
      };
    }

    const atomic = item as XdmAtomicValue;
    switch (atomic.type) {
      case 'xs:boolean':
        return { value: atomic.value as boolean, source: 'boolean' };
      case 'xs:double':
      case 'xs:integer':
        return { value: atomic.value as number, source: 'number' };
      case 'xs:QName':
        return { value: atomic.value as string, source: 'qname' };
      case 'xs:string':
        return { value: atomic.value as string, source: 'string' };
    }
  }

  function expandArrayItems(items: readonly XdmItem[]): XdmItem[] {
    const expanded: XdmItem[] = [];

    for (const item of items) {
      if (item.xdmKind === 'array') {
        for (const member of (item as XdmArray).members) {
          expanded.push(...expandArrayItems(member));
        }
        continue;
      }

      expanded.push(item);
    }

    return expanded;
  }

  function toGeneralComparisonNumber(
    operand: {
      readonly value: boolean | number | string;
      readonly source: 'boolean' | 'number' | 'string' | 'node' | 'qname';
    },
    span: SpanLike,
  ): number {
    if (operand.source === 'number') {
      return operand.value as number;
    }

    if (operand.source === 'node') {
      const coerced = coerceNumericValue(operand.value as string);
      if (coerced !== undefined) {
        return coerced;
      }
    }

    throw dependencies.createXPathError(XPTY0004, 'General comparison requires comparable type families.', span, {
      expectedType: 'matching comparable operands',
      actualType: operand.source,
    });
  }

  function atomizeItems(items: readonly XdmItem[]): readonly (boolean | number | string)[] {
    return expandArrayItems(items).map((item) => {
      if (item.xdmKind === 'node') {
        return (item as XdmNode).node.textContent ?? '';
      }

      return (item as XdmAtomicValue).value;
    });
  }

  function atomizedNumericValues(items: readonly XdmItem[], span: SpanLike, functionName: string): number[] {
    return expandArrayItems(items).map((item) => {
      if (item.xdmKind === 'node') {
        const numericValue = coerceNumericValue((item as XdmNode).node.textContent ?? '');
        if (numericValue === undefined) {
          throw dependencies.createXPathError(FORG0001, `Function ${functionName} could not convert an atomized value to a number.`, span, {
            functionName,
            expectedType: 'numeric lexical value after atomization',
            actualType: 'node()',
          });
        }

        return numericValue;
      }

      const atomic = item as XdmAtomicValue;
      if (atomic.type === 'xs:boolean') {
        throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires comparable values after atomization.`, span, {
          functionName,
          expectedType: 'numeric or string value after atomization',
          actualType: 'xs:boolean',
        });
      }

      if (atomic.type === 'xs:double' || atomic.type === 'xs:integer') {
        return atomic.value as number;
      }

      throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires comparable values after atomization.`, span, {
        functionName,
        expectedType: 'numeric value after atomization',
        actualType: atomic.type,
      });
    });
  }

  function atomizedComparableValues(
    items: readonly XdmItem[],
    span: SpanLike,
    functionName: string,
  ): readonly (boolean | number | string)[] {
    const values = expandArrayItems(items).map((item) => atomizeComparableItem(item, span, functionName));
    if (values.length <= 1) {
      const numericValues = values.map((value) => typeof value === 'boolean' ? undefined : typeof value === 'number' ? value : coerceNumericValue(value));
      return numericValues.every((value) => value !== undefined) ? numericValues as number[] : values;
    }

    const numericValues = values.map((value) => typeof value === 'boolean' ? undefined : typeof value === 'number' ? value : coerceNumericValue(value));
    if (numericValues.every((value) => value !== undefined)) {
      return numericValues as number[];
    }

    const sawBoolean = values.some((value) => typeof value === 'boolean');
    if (sawBoolean) {
      if (values.every((value) => typeof value === 'boolean')) {
        return values;
      }
      throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires values from a comparable type family.`, span, {
        functionName,
        expectedType: 'all numeric, all string-like, or all boolean values',
        actualType: values.map(describeAtomizedValueType).join(', '),
      });
    }

    const sawNumber = values.some((value) => typeof value === 'number');
    const sawString = values.some((value) => typeof value === 'string');
    if (sawNumber && sawString) {
      throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires values from a comparable type family.`, span, {
        functionName,
        expectedType: 'all numeric or all string-like values',
        actualType: values.map(describeAtomizedValueType).join(', '),
      });
    }

    return values;
  }

  function atomizeComparableItem(item: XdmItem, span: SpanLike, functionName: string): boolean | number | string {
    if (item.xdmKind === 'node') {
      return (item as XdmNode).node.textContent ?? '';
    }

    const atomic = item as XdmAtomicValue;
    if (atomic.type === 'xs:boolean') {
      return atomic.value as boolean;
    }
    if (atomic.type === 'xs:double' || atomic.type === 'xs:integer') {
      return atomic.value as number;
    }
    if (atomic.type === 'xs:string') {
      return atomic.value as string;
    }

    throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires comparable values after atomization.`, span, {
      functionName,
      expectedType: 'numeric or string value after atomization',
      actualType: atomic.type,
    });
  }

  function compareComparableValues(left: boolean | number | string, right: boolean | number | string): number {
    if (typeof left === 'boolean' && typeof right === 'boolean') {
      return Number(left) - Number(right);
    }
    if (typeof left === 'number' && typeof right === 'number') {
      if (Number.isNaN(left) || Number.isNaN(right)) {
        return Number.isNaN(left) ? Number.isNaN(right) ? 0 : -1 : 1;
      }
      return left === right ? 0 : left < right ? -1 : 1;
    }

    return left === right ? 0 : left < right ? -1 : 1;
  }

  function deepEqualSequences(leftItems: readonly XdmItem[], rightItems: readonly XdmItem[]): boolean {
    if (leftItems.length !== rightItems.length) {
      return false;
    }

    for (let index = 0; index < leftItems.length; index += 1) {
      if (!deepEqualItems(leftItems[index]!, rightItems[index]!)) {
        return false;
      }
    }

    return true;
  }

  function deepEqualItems(left: XdmItem, right: XdmItem): boolean {
    if (left.xdmKind !== right.xdmKind) {
      return false;
    }

    if (left.xdmKind === 'node' && right.xdmKind === 'node') {
      return deepEqualNodes((left as XdmNode).node, (right as XdmNode).node);
    }

    if (left.xdmKind === 'atomic' && right.xdmKind === 'atomic') {
      return deepEqualAtomicValues(left as XdmAtomicValue, right as XdmAtomicValue);
    }

    return left === right;
  }

  function deepEqualAtomicValues(left: XdmAtomicValue, right: XdmAtomicValue): boolean {
    if (left.type !== right.type) {
      return false;
    }

    if (left.type === 'xs:double' && right.type === 'xs:double') {
      return (Number.isNaN(left.value as number) && Number.isNaN(right.value as number))
        || left.value === right.value;
    }

    return left.value === right.value;
  }

  function deepEqualNodes(left: Node, right: Node): boolean {
    if (left.nodeType !== right.nodeType) {
      return false;
    }

    if ((left.namespaceURI ?? '') !== (right.namespaceURI ?? '')) {
      return false;
    }

    if ((left.nodeName ?? '') !== (right.nodeName ?? '')) {
      return false;
    }

    if ((left.nodeValue ?? '') !== (right.nodeValue ?? '')) {
      return false;
    }

    if (!deepEqualAttributes(left, right)) {
      return false;
    }

    const leftChildren = [...left.childNodes];
    const rightChildren = [...right.childNodes];
    if (leftChildren.length !== rightChildren.length) {
      return false;
    }

    for (let index = 0; index < leftChildren.length; index += 1) {
      if (!deepEqualNodes(leftChildren[index]!, rightChildren[index]!)) {
        return false;
      }
    }

    return true;
  }

  function deepEqualAttributes(left: Node, right: Node): boolean {
    const leftAttributes = getNodeAttributes(left);
    const rightAttributes = getNodeAttributes(right);
    const leftCount = leftAttributes?.length ?? 0;
    const rightCount = rightAttributes?.length ?? 0;
    if (leftCount !== rightCount) {
      return false;
    }

    for (let index = 0; index < leftCount; index += 1) {
      const leftAttribute = leftAttributes?.item(index);
      if (leftAttribute === null || leftAttribute === undefined) {
        return false;
      }

      const rightAttribute = leftAttribute.namespaceURI
        ? rightAttributes?.getNamedItemNS(leftAttribute.namespaceURI, leftAttribute.localName ?? leftAttribute.nodeName)
        : rightAttributes?.getNamedItem(leftAttribute.nodeName);
      if (rightAttribute === null || rightAttribute === undefined) {
        return false;
      }

      if ((leftAttribute.value ?? '') !== (rightAttribute.value ?? '')) {
        return false;
      }
    }

    return true;
  }

  function getNodeAttributes(node: Node): {
    readonly length: number;
    item(index: number): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
    getNamedItem(name: string): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
    getNamedItemNS(namespaceURI: string | null, localName: string): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
  } | undefined {
    const candidate = node as unknown as {
      attributes?: {
        readonly length: number;
        item(index: number): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
        getNamedItem(name: string): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
        getNamedItemNS(namespaceURI: string | null, localName: string): { readonly nodeName: string; readonly localName?: string | null; readonly namespaceURI?: string | null; readonly value?: string | null } | null;
      } | null;
    };

    return candidate.attributes ?? undefined;
  }

  function atomizeSingleton(
    items: readonly XdmItem[],
    span: SpanLike,
  ): boolean | number | string | undefined {
    items = expandArrayItems(items);

    if (items.length === 0) {
      return undefined;
    }

    if (items.length !== 1) {
      throw dependencies.createXPathError(XPTY0004, 'Value comparisons require singleton operands.', span, {
        expectedType: 'singleton operand',
        actualType: dependencies.describeItemsType(items),
      });
    }

    const [item] = items;
    if (item?.xdmKind === 'node') {
      return (item as XdmNode).node.textContent ?? '';
    }

    return (item as XdmAtomicValue).value;
  }

  function compareValueOperands(
    operator: 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge',
    left: boolean | number | string,
    right: boolean | number | string,
    span: SpanLike,
  ): boolean {
    if (typeof left === 'boolean' || typeof right === 'boolean') {
      if (typeof left !== 'boolean' || typeof right !== 'boolean') {
        throw dependencies.createXPathError(XPTY0004, 'Value comparisons require matching operand types.', span, {
          expectedType: 'matching operand types',
          actualType: `${describeAtomizedValueType(left)} vs ${describeAtomizedValueType(right)}`,
        });
      }

      return compareScalars(operator, left, right);
    }

    if (typeof left === 'number' || typeof right === 'number') {
      if (typeof left !== 'number' || typeof right !== 'number') {
        throw dependencies.createXPathError(XPTY0004, 'Value comparisons require matching operand types.', span, {
          expectedType: 'matching operand types',
          actualType: `${describeAtomizedValueType(left)} vs ${describeAtomizedValueType(right)}`,
        });
      }

      return compareScalars(operator, left, right);
    }

    return compareScalars(operator, left, right);
  }

  function coerceNumericValue(value: number | string): number | undefined {
    if (typeof value === 'number') {
      return value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  function compareScalars<T extends boolean | number | string>(
    operator: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge',
    left: T,
    right: T,
  ): boolean {
    switch (operator) {
      case '=':
      case 'eq':
        return left === right;
      case '!=':
      case 'ne':
        return left !== right;
      case '<':
      case 'lt':
        return left < right;
      case '<=':
      case 'le':
        return left <= right;
      case '>':
      case 'gt':
        return left > right;
      case '>=':
      case 'ge':
        return left >= right;
    }
  }

  function describeAtomizedValueType(value: boolean | number | string): string {
    if (typeof value === 'boolean') {
      return 'xs:boolean';
    }

    if (typeof value === 'number') {
      return 'xs:double';
    }

    return 'xs:string';
  }

  return {
    compareGeneral,
    atomizeItems,
    atomizedNumericValues,
    atomizedComparableValues,
    compareComparableValues,
    deepEqualSequences,
    atomizeSingleton,
    compareValueOperands,
  };
}