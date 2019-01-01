import compile from './compile';

type Code = { [fileName: string]: string };

test('default export function gets instrumented correctly', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
export default function MyComp1(props: any) {
    return <p>Hello!</p>; 
}
    `,
  };

  const expected = {
    'component1.jsx': `
const __globalInstrumentationObject = Function("return this")();
__globalInstrumentationObject.reactInstrumentationDefinedComponents = __globalInstrumentationObject.reactInstrumentationDefinedComponents || {}
__globalInstrumentationObject.reactInstrumentationDefinedComponents["component1.tsx"] = ["default"]
import * as React from 'react';
export default function MyComp1(props) {
    __globalInstrumentationObject.reactInstrumentationRenderedComponents = __globalInstrumentationObject.reactInstrumentationRenderedComponents || {};
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] = __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] || [];
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"].push("default");
    return <p>Hello!</p>;
}
    `,
  };

  expectEqual(expected, compile(code));
});

function expectEqual(expected: Code, compiled: Code) {
  Object.keys(expected).forEach(fileName => {
    expect(fileName + ':\n' + (compiled[fileName] || '').trim()).toBe(
      fileName + ':\n' + (expected[fileName] || '').trim(),
    );
  });
}
