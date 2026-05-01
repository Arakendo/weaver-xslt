import { parseXml } from '../../xml/parse.js';
import { createXdmNode, type XdmNode } from '../../xdm/types.js';

export function buildTemporaryTree(serializedContent: string): XdmNode {
  const temporaryDocument = parseXml(`<temporary-root>${serializedContent}</temporary-root>`);
  const fragment = temporaryDocument.createDocumentFragment();
  const wrapper = temporaryDocument.documentElement;

  if (wrapper === null) {
    return createXdmNode(fragment);
  }

  while (wrapper.firstChild !== null) {
    fragment.appendChild(wrapper.firstChild);
  }

  return createXdmNode(fragment);
}