## dev

install npm packages:

```
$ npm install
```

open as folder in vscode, then ctrl-shift-p > debug: start debugging.

compile on command line:

```
$ npm run compile
```

package or publish with vsce:

```
$ vsce package
$ vsce publish
```

## notes

        
get vsce package to work?: https://stackoverflow.com/a/48798945

that didn't do it

mv eslint.config.mjs eslint.config.mjs.backup

that did something.

maybe stick to js files and say "checkJs": false      https://stackoverflow.com/a/54571297

add `// @ts-ignore` at top of file to ignore ts checks

try codetext.ts:

$ node cli.js try/virus-prep.ct


## up next

maybe it could offer to indent
code-chunks based on their parent chunk.


