# gqlx for JavaScript Applications

[![Build Status](https://travis-ci.org/graphql-extended/gqlx-js.svg?branch=master)](https://travis-ci.org/graphql-extended/gqlx-js)
[![npm](https://img.shields.io/npm/v/gqlx.svg)](https://www.npmjs.com/package/gqlx)
[![node](https://img.shields.io/node/v/gqlx.svg)](https://www.npmjs.com/package/gqlx)
[![GitHub tag](https://img.shields.io/github/tag/graphql-extended/gqlx-js.svg)](https://github.com/graphql-extended/gqlx-js/releases)
[![GitHub issues](https://img.shields.io/github/issues/graphql-extended/gqlx-js.svg)](https://github.com/graphql-extended/gqlx-js/issues)

JavaScript tools for using the gqlx language.

![gqlx Logo](https://github.com/graphql-extended/gqlx-spec/raw/master/logo.png)

## Documentation

This library offers support for a new way of writing GraphQL schemas called **gqlx** (short of GraphQL eXtended). gqlx gives developers a possibility to mix the definitions of resolvers directly into their GraphQL type definitions. Additionally, more advanced capabilities to be utilized directly can be found in the language.

For more information on GraphQL and learning material, see [GraphQL College](https://www.graphql.college/practice-graphql/). The specification of the gqlx language is available [on GitHub](https://github.com/graphql-extended/gqlx-spec). Herein we will only present a few examples.

### Resolver Syntax

Defining a resolver is as simple as writing a little bit of JavaScript (ES6 to be precise).

```plain
type Query {
  foo: String {
    get('api/foo')
  }
}
```

The part between the curly braces after a Query, Mutation, or Subscription field definition is a simple JavaScript expression. Keep in mind it has to be an expression - no statements (e.g., instructions separated by `;`) are allowed.

There are more restrictions to the allowed JavaScript. We also cannot use:

- `delete` expressions
- Declarations of new functions (`function foo ...`)
- Using `function` (need to use `=>`)
- The `this` keyword cannot be used

Besides the restrictions the syntax also offers new special (inbuilt) functions.

### Inbuilt Functions

The following functions are available *internally* and will be expanded during evaluation.

#### either

Uses the given value or a default value.

```typescript
interface either<T> {
  (givenValue: T | undefined, defaultValue: T): T;
}
```

Does not perform type consistency checks at runtime.

```js
either(x, 10) // -> ((x === undefined) ? 10 : x)
```

This helper is very useful to apply a default value (second argument) if the given variable is not set (first argument).

#### use

Uses the value on the first argument as input for a function passed in as second argument.

```typescript
interface use<T, U> {
  (value: T, cb: (val: T) => U): U;
}
```

Asynchronous calls are - as usual - handled properly if the API is set up properly.

```js
use(get('/api/foo'), ({ name }) => name.length)
```

Quite handy to circumvent the single expression limitation instead of applying an immediately invoked function expression (IIFE).

#### cq

Concats a query to an URL. Correctly encodes the URI parts.

```typescript
interface cq {
  (url: string, query: { [name: string]: any }): string;
}
```

Only appends existing (i.e., non `null` or `undefined`) values.

```js
cq('/foo', {}) // -> /foo
cq('/foo', { bar: null }) // -> /foo
cq('/foo', { bar: 5 }) // -> /foo?bar=5
cq('/foo', { bar: 5, qux: undefined }) // -> /foo?bar=5
cq('/foo', { bar: 5, qux: '#hey yo' }) // -> /foo?bar=5&qux=%23hey+yo
```

## Contributing

We are totally open for contribution and appreciate any feedback, bug reports, or feature requests. More detailed information on contributing incl. a code of conduct are soon to be presented.

## FAQ

*How much can be customized?*

The core language is pretty much defined by GraphQL and JavaScript (officially ECMAScript version 6, abbr. ES6). Currently, all customizations need to take place within the ECMAScript layer, e.g., by defining new / changing existing API functions or inbuilt functions (i.e., macros).

## Changelog

This project adheres to [semantic versioning](https://semver.org).

You can find the changelog in the [CHANGELOG.md](CHANGELOG.md) file.

## License

gqlx-js is released using the MIT license. For more information see the [LICENSE file](LICENSE).
