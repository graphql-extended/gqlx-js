# gqlx for JavaScript Applications Changelog

## 0.2.7

- Updated dependencies
- Included standard patch function

## 0.2.6

- Updated dependencies
- Improved inbuilt function generation
- Fixed bug with `cq` to normalize entries (#11)
- Improved calculation of computed props of objects

## 0.2.5

- Updated dependencies
- Fixed bug that awaited functions are not async

## 0.2.4

- Updated dependencies due to known CVEs
- Fixed missing async in map functions (#10)

## 0.2.3

- Extended with `inspect` utility stub
- Updated dependencies
- Fixed bug regarding awaitables in nested expressions

## 0.2.2

- Fixed bug that conditionals do not respect lazy loading (#6)
- Fixed bug related to broken array spread (#7)
- Fixed bug related to disrespected of local variable (#8)

## 0.2.1

- Support for UMD bundling

## 0.2.0

- Fixed bug in parenthesis evaluation
- Emit consistent error object incl. diagnostic information

## 0.1.6

- Updated dependencies due to CVE-2018-16469
- Fixed bug related to object with parentheses (#2)
- Fixed bug related to spread return (#3)
- Fixed bug related to assign property name (#4)
- Fixed bug related to nested `Promise.all` (#5)

## 0.1.5

- Specify browser capabilities for bundling in FE apps
- Include original sources in package

## 0.1.4

- Support for `if` / `for` / `while` in block statements
- Fixed unnecessary use of `await`
- Support for debugger mode

## 0.1.3

- Also support graphql@0.14.x as peer dependency
- Declare minimum Node engine version

## 0.1.2

- Allow using `Math`
- Removed `find` from default API
- Referenced the specification

## 0.1.1

- Changed package name

## 0.1.0

- Initial release
