# ct for vscode

codetext extension for vscode.

codetext lets you embed code in text like images or figures floating
in a document. it's a bit like jupyter notebooks with the addition
that code chunks are named and you can use the names to nest chunks.

this is a mini codetext example:

```
open a file named greeting.py

``//greeting.py: #py
import sys
name = sys.argv[1]
``say hi``
``

and say hi in the `say hi` chunk:

``/say hi: #py
print("hi " + name)
``
```

codetext for vscode gives the following commands in the command
palette (`ctrl-shift-p`):

`ct: assemble (ctrl-alt-a)`: assemble code\
`ct: go to line (ctrl-alt-g)`: given a line from a generated file, go to its line in the source .ct file\
`ct: go to parent (ctrl-alt-p)`: go to parent code-chunk\
`ct: go to child (ctrl-alt-c)`: go to child code-chunk

## more codetext

for a codetext example, see [`foo.ct`](https://github.com/tnustrings/ct-vscode/blob/main/try/foo.ct).

## dev

for development, see [`dev.md`](https://github.com/tnustrings/ct-vscode/blob/main/dev.md).

