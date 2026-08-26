/**
 * XPath static + dynamic context scaffolding.
 *
 * Expanded as the engine grows. Kept minimal so other modules can type
 * against it today.
 */

export interface StaticContext {
  /** Prefix → namespace URI map in scope at parse time. */
  readonly namespaces: ReadonlyMap<string, string>;
  /** Default element namespace, or '' if none. */
  readonly defaultElementNamespace: string;
  /** Base URI, used by resolve-uri() etc. */
  readonly baseUri?: string;
}

export interface DynamicContext {
  readonly staticContext: StaticContext;
  /** Current context item (null for no focus). */
  readonly contextItem: unknown;
  /** XSLT current() anchor, fixed across nested predicate focus changes. */
  readonly currentItem?: unknown;
  /** 1-based position in the current focus. */
  readonly contextPosition: number;
  /** Size of the current focus. */
  readonly contextSize: number;
  /** In-scope variable bindings, keyed by "{uri}local". */
  readonly variables: ReadonlyMap<string, unknown>;
}
