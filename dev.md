## dev

install npm packages:

```
npm install
```

open as folder in vscode:

```
code .
```

then ctrl-shift-p > debug: start debugging.

compile on command line:

```
npm run compile
```

package with vsce:

```
vsce package
```

publish with vsce:

```
vsce login tnustrings
vsce publish
```

## debug

use `cli.js` to run ct.ts on command line:

```
make && npm run compile && node cli.js try/try.ct
```

## access tokens

sign in to the azure marketplace https://dev.azure.com/tnustrings/

how to create access tokens:

https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token

## notes
        
get vsce package to work?: https://stackoverflow.com/a/48798945

that didn't do it

mv eslint.config.mjs eslint.config.mjs.backup

that did something.

maybe stick to js files and say "checkJs": false      https://stackoverflow.com/a/54571297

add `// @ts-ignore` at top of file to ignore ts checks

try codetext.ts:

node cli.js try/virus-prep.ct

## up next

maybe it could offer to indent
code-chunks based on their parent chunk.


