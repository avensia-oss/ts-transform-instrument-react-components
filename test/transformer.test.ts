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

test('multiple exports gets instrumented correctly', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
export default function MyComp1(props: any) {
    return <p>Hello!</p>; 
}
export function MyComp2(props: any) {
    const x = <img />;
    return <div>{x}</div>;
}
    `,
  };

  const expected = {
    'component1.jsx': `
const __globalInstrumentationObject = Function("return this")();
__globalInstrumentationObject.reactInstrumentationDefinedComponents = __globalInstrumentationObject.reactInstrumentationDefinedComponents || {}
__globalInstrumentationObject.reactInstrumentationDefinedComponents["component1.tsx"] = ["default", "MyComp2"]
import * as React from 'react';
export default function MyComp1(props) {
    __globalInstrumentationObject.reactInstrumentationRenderedComponents = __globalInstrumentationObject.reactInstrumentationRenderedComponents || {};
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] = __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] || [];
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"].push("default");
    return <p>Hello!</p>;
}
export function MyComp2(props) {
    __globalInstrumentationObject.reactInstrumentationRenderedComponents = __globalInstrumentationObject.reactInstrumentationRenderedComponents || {};
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] = __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] || [];
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"].push("MyComp2");
    const x = <img />;
    return <div>{x}</div>;
}
    `,
  };

  expectEqual(expected, compile(code));
});

test('arrow function exports gets instrumented correctly', () => {
  const code = {
    'component1.tsx': `
import * as React from 'react';
export default (props: any) => <p>Hello!</p>; 
export const MyComp2 = (props: any) => {
    const x = <img />;
    return <div>{x}</div>;
}
    `,
  };

  const expected = {
    'component1.jsx': `
const __globalInstrumentationObject = Function("return this")();
__globalInstrumentationObject.reactInstrumentationDefinedComponents = __globalInstrumentationObject.reactInstrumentationDefinedComponents || {}
__globalInstrumentationObject.reactInstrumentationDefinedComponents["component1.tsx"] = ["MyComp2", "default"]
import * as React from 'react';
export default (props) => {
    __globalInstrumentationObject.reactInstrumentationRenderedComponents = __globalInstrumentationObject.reactInstrumentationRenderedComponents || {};
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] = __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] || [];
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"].push("default");
    return <p>Hello!</p>;
};
export const MyComp2 = (props) => {
    __globalInstrumentationObject.reactInstrumentationRenderedComponents = __globalInstrumentationObject.reactInstrumentationRenderedComponents || {};
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] = __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"] || [];
    __globalInstrumentationObject.reactInstrumentationRenderedComponents["component1.tsx"].push("MyComp2");
    const x = <img />;
    return <div>{x}</div>;
};
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
