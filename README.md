# ts-transform-instrument-react-components

_Note! This transformer is currently experimental_

A TypeScript custom transformer that instruments React components to report which components exists in your bundle and which gets rendered. This information can then be used to optimize your bundle and load unrendered components lazily.

## How to extract the information

This transformer modifies all files that contains components to define a global variable called `reactInstrumentationDefinedComponents`. This is an array of objects which will contain all of the components that your file contains. The objects in the array is of the type `{file: string, name: string}` where the file is the full path to your file.

Another array of the same type is created which is called `reactInstrumentationRenderedComponents`. That will contain a list of the same type of objects of components that have been rendered.

In order to know which components your file includes that doesn't get rendered you'd run this transform on your code, load the code in Node.js and call `ReactDOM.renderToString()` on your main components and then check the diff of `reactInstrumentationDefinedComponents` and `reactInstrumentationRenderedComponents`.

## Other useful transform

If you find this transform useful you might want to use these ones as well: https://github.com/avensia-oss/ts-transform-export-const-folding and https://github.com/avensia-oss/ts-transform-async-import

# Installation

```
yarn add @avensia-oss/ts-transform-async-import
```

## Usage with webpack

Unfortunately TypeScript doesn't let you specifiy custom transformers in `tsconfig.json`. If you're using `ts-loader` with webpack you can specify it like this:
https://github.com/TypeStrong/ts-loader#getcustomtransformers-----before-transformerfactory-after-transformerfactory--

The default export of this module is a function which expects a `ts.Program` an returns a transformer function. Your config should look something like this:

```
const instrumentReactComponentsTransform = require('@avensia-oss/ts-transform-instrument-react-components');

return {
  ...
  options: {
    getCustomTransformers: (program) => ({
      before: [instrumentReactComponentsTransform(program)]
    })
  }
  ...
};
```
