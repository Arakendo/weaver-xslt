import type { Node } from '@xmldom/xmldom';

/** Discriminator for all XDM items. */
export type XdmItemKind = 'atomic' | 'node' | 'function' | 'map' | 'array';

/** Base marker for any XDM item. */
export interface XdmItem {
  readonly xdmKind: XdmItemKind;
}

export interface XdmAtomicValue extends XdmItem {
  readonly xdmKind: 'atomic';
  readonly type: 'xs:boolean' | 'xs:double' | 'xs:integer' | 'xs:QName' | 'xs:string';
  readonly value: boolean | number | string;
  readonly lexicalForm?: string;
}

export interface XdmNode extends XdmItem {
  readonly xdmKind: 'node';
  readonly node: Node;
}

export interface XdmMap extends XdmItem {
  readonly xdmKind: 'map';
  readonly entries: readonly {
    readonly key: XdmAtomicValue;
    readonly value: readonly XdmItem[];
  }[];
}

export interface XdmArray extends XdmItem {
  readonly xdmKind: 'array';
  readonly members: readonly (readonly XdmItem[])[];
}

/** Engine-owned sequence abstraction used across XPath and XSLT layers. */
export interface XdmSequence extends Iterable<XdmItem> {
  readonly size: number;
  toArray(): readonly XdmItem[];
}

export function createXdmBoolean(value: boolean): XdmAtomicValue {
  return { xdmKind: 'atomic', type: 'xs:boolean', value };
}

export function createXdmNumber(value: number, lexicalForm?: string): XdmAtomicValue {
  return lexicalForm === undefined
    ? { xdmKind: 'atomic', type: 'xs:double', value }
    : { xdmKind: 'atomic', type: 'xs:double', value, lexicalForm };
}

export function createXdmInteger(value: number): XdmAtomicValue {
  return { xdmKind: 'atomic', type: 'xs:integer', value };
}

export function createXdmString(value: string): XdmAtomicValue {
  return { xdmKind: 'atomic', type: 'xs:string', value };
}

export function createXdmQName(value: string): XdmAtomicValue {
  return { xdmKind: 'atomic', type: 'xs:QName', value };
}

export function createXdmNode(node: Node): XdmNode {
  return { xdmKind: 'node', node };
}

/** Returns the XPath Data Model string value for a DOM-backed node. */
export function getNodeStringValue(node: Node): string {
  if (
    node.nodeType === node.DOCUMENT_NODE ||
    node.nodeType === node.DOCUMENT_FRAGMENT_NODE ||
    node.nodeType === node.ELEMENT_NODE
  ) {
    return getDescendantTextValue(node);
  }

  if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) {
    return node.nodeValue ?? '';
  }

  return node.nodeValue ?? '';
}

function getDescendantTextValue(node: Node): string {
  let value = '';
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child === null) {
      continue;
    }
    if (child.nodeType === child.TEXT_NODE || child.nodeType === child.CDATA_SECTION_NODE) {
      if (node.nodeType !== node.DOCUMENT_NODE) {
        value += child.nodeValue ?? '';
      }
      continue;
    }
    if (child.nodeType === child.ELEMENT_NODE) {
      value += getDescendantTextValue(child);
    }
  }
  return value;
}

export function createXdmMap(entries: XdmMap['entries']): XdmMap {
  return { xdmKind: 'map', entries };
}

export function createXdmArray(members: readonly (readonly XdmItem[])[]): XdmArray {
  return { xdmKind: 'array', members };
}
