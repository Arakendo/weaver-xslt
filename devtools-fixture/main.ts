import { compile } from '../src/workbench.ts';

const sourceXml = '<root><name>world</name></root>';
const stylesheet = [
  '<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
  '  <xsl:template match="/">',
  '    <message>',
  '      <xsl:value-of select="/root/name"/>',
  '    </message>',
  '  </xsl:template>',
  '</xsl:stylesheet>',
].join('\n');

const outputElement = document.querySelector<HTMLPreElement>('#output');
const progressElement = document.querySelector<HTMLPreElement>('#progress');
const renderButton = document.querySelector<HTMLButtonElement>('#render');

if (outputElement === null || progressElement === null || renderButton === null) {
  throw new Error('DevTools fixture DOM did not initialize correctly.');
}

function renderProgress(messages: readonly string[]): void {
  progressElement.textContent = messages.join('\n');
}

function renderTransform(): void {
  const progressMessages: string[] = [];
  renderProgress(progressMessages);
  outputElement.textContent = '';

  const compileResult = compile({
    stylesheet: {
      uri: 'memory:/devtools-fixture/demo.xsl',
      text: stylesheet,
    },
    options: {
      onProgress: (message) => {
        progressMessages.push(message);
        renderProgress(progressMessages);
      },
    },
  });

  if (!compileResult.ok) {
    outputElement.textContent = compileResult.diagnostics
      .map((diagnostic) => diagnostic.message)
      .join('\n');
    return;
  }

  const result = compileResult.stylesheet.transform({
    uri: 'memory:/devtools-fixture/input.xml',
    text: sourceXml,
  });
  outputElement.textContent = result.ok
    ? result.output
    : result.diagnostics.map((diagnostic) => diagnostic.message).join('\n');
}

renderButton.addEventListener('click', renderTransform);
renderTransform();
