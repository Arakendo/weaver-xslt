import type { Node } from '@xmldom/xmldom';

import type { RelatedLocation } from '../../errors/index.js';
import type { TransformTraceOptions, XmlTraceEvent } from '../../processor/types.js';
import { createXmlNodeHandle } from '../../runtime/xmlNodeHandles.js';
import { emitTraceEvent as publishTraceEvent, isTraceEnabled } from '../../runtime/tracePause.js';
import type { XdmItem, XdmNode } from '../../xdm/types.js';

export function emitTraceEvent(
  trace: TransformTraceOptions | undefined,
  event: XmlTraceEvent,
): void {
  publishTraceEvent(trace, event);
}

export function tryCreateTraceNodeHandle(
  node: Node,
  trace: TransformTraceOptions | undefined,
  sourceDocumentUri: string,
) {
  if (!isTraceEnabled(trace)) {
    return undefined;
  }

  switch (node.nodeType) {
    case node.DOCUMENT_NODE:
    case node.ELEMENT_NODE:
    case node.ATTRIBUTE_NODE:
    case node.TEXT_NODE:
    case node.COMMENT_NODE:
    case node.PROCESSING_INSTRUCTION_NODE:
      return createXmlNodeHandle(node, sourceDocumentUri);
    default:
      return undefined;
  }
}

export function emitInstructionSelectEvents(
  items: readonly XdmItem[],
  trace: TransformTraceOptions | undefined,
  sourceDocumentUri: string,
  instructionKind: string,
  location: RelatedLocation['location'] | undefined,
): void {
  if (!isTraceEnabled(trace)) {
    return;
  }

  for (const item of items) {
    const nodeItem = asXdmNode(item);
    if (nodeItem === undefined) {
      continue;
    }

    const handle = tryCreateTraceNodeHandle(nodeItem.node, trace, sourceDocumentUri);
    if (handle === undefined) {
      continue;
    }

    emitTraceEvent(trace, {
      kind: 'instruction-select',
      node: handle,
      instruction: {
        kind: instructionKind,
        ...(location === undefined ? {} : { location }),
      },
    });
  }
}

export function emitValueReadEvents(
  items: readonly XdmItem[],
  trace: TransformTraceOptions | undefined,
  sourceDocumentUri: string,
  location: RelatedLocation['location'] | undefined,
): void {
  if (!isTraceEnabled(trace)) {
    return;
  }

  for (const item of items) {
    const nodeItem = asXdmNode(item);
    if (nodeItem === undefined) {
      continue;
    }

    const handle = tryCreateTraceNodeHandle(nodeItem.node, trace, sourceDocumentUri);
    if (handle === undefined) {
      continue;
    }

    emitTraceEvent(trace, {
      kind: 'value-read',
      node: handle,
      instruction: {
        kind: 'xsl:value-of',
        ...(location === undefined ? {} : { location }),
      },
    });
  }
}

function asXdmNode(item: unknown): XdmNode | undefined {
  return typeof item === 'object' && item !== null && (item as XdmItem).xdmKind === 'node'
    ? (item as XdmNode)
    : undefined;
}
