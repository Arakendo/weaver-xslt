/**
 * Lazy sequence helpers.
 *
 * XDM sequences are flat, ordered, heterogeneous. Operations should stay
 * lazy (generator-based) unless count / random access is explicitly needed.
 */

import type { XdmItem, XdmSequence } from './types.js';

class ArraySequence implements XdmSequence {
  readonly #items: readonly XdmItem[];

  constructor(items: Iterable<XdmItem>) {
    this.#items = Array.from(items);
  }

  get size(): number {
    return this.#items.length;
  }

  toArray(): readonly XdmItem[] {
    return this.#items;
  }

  [Symbol.iterator](): Iterator<XdmItem> {
    return this.#items[Symbol.iterator]();
  }
}

export function createSequence(items: Iterable<XdmItem>): XdmSequence {
  return new ArraySequence(items);
}

export function emptySequence(): XdmSequence {
  return createSequence([]);
}

export function singleton(item: XdmItem): XdmSequence {
  return createSequence([item]);
}

/** Materialize a sequence into an array. Use sparingly. */
export function materialize(seq: XdmSequence): readonly XdmItem[] {
  return seq.toArray();
}
