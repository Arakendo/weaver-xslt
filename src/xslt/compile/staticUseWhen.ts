import type { Element } from '@xmldom/xmldom';

import { XSLT_NAMESPACE } from './xsltElementHelpers.js';

const SIMPLE_VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9._-]*$/;
const SIMPLE_VARIABLE_REFERENCE = /^\$([A-Za-z_][A-Za-z0-9._-]*)$/;

/**
 * Reduces the deliberately narrow static-use-when slice currently owned by
 * Weaver: a unique top-level static variable whose select is true() or false(),
 * followed by top-level declarations guarded by a reference to that variable.
 *
 * Unsupported static expressions and guards are left untouched so the normal
 * attribute validation path continues to reject them explicitly.
 */
export function reduceSupportedStaticUseWhen(root: Element): void {
  const children = childElements(root);
  const candidates = new Map<string, { readonly element: Element; readonly value: boolean }[]>();

  for (const child of children) {
    if (!isXsltElement(child, 'variable') || child.getAttribute('static') !== 'yes') {
      continue;
    }

    const name = child.getAttribute('name');
    const select = child.getAttribute('select')?.trim();
    if (name === null || !SIMPLE_VARIABLE_NAME.test(name)) {
      continue;
    }

    const value = select === 'true()' ? true : select === 'false()' ? false : undefined;
    if (value === undefined) {
      continue;
    }

    const bindings = candidates.get(name) ?? [];
    bindings.push({ element: child, value });
    candidates.set(name, bindings);
  }

  const staticValues = new Map<string, boolean>();
  for (const [name, bindings] of candidates) {
    if (bindings.length !== 1) {
      continue;
    }

    const binding = bindings[0]!;
    binding.element.removeAttribute('static');
    staticValues.set(name, binding.value);
  }

  for (const child of children) {
    const useWhen = child.getAttribute('use-when');
    if (useWhen === null) {
      continue;
    }

    const reference = SIMPLE_VARIABLE_REFERENCE.exec(useWhen.trim());
    const value = reference === null ? undefined : staticValues.get(reference[1]!);
    if (value === undefined) {
      continue;
    }

    if (value) {
      child.removeAttribute('use-when');
    } else {
      root.removeChild(child);
    }
  }
}

function childElements(element: Element): Element[] {
  const result: Element[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (child?.nodeType === child?.ELEMENT_NODE) {
      result.push(child as Element);
    }
  }
  return result;
}

function isXsltElement(element: Element, localName: string): boolean {
  return element.namespaceURI === XSLT_NAMESPACE && element.localName === localName;
}
