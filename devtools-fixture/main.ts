import { transform } from './demo.xsl';

const sourceXml = '<root><name>world</name></root>';
const outputElement = document.querySelector<HTMLPreElement>('#output');
const renderButton = document.querySelector<HTMLButtonElement>('#render');

if (outputElement === null || renderButton === null) {
  throw new Error('DevTools fixture DOM did not initialize correctly.');
}

function renderTransform(): void {
  const result = transform(sourceXml);
  outputElement.textContent = result.output;
}

renderButton.addEventListener('click', renderTransform);
renderTransform();