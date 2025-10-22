# ct for vscode

codetext extension for vscode.

codetext lets you embed code in text like images or figures floating
in a document. it's a bit like jupyter notebooks with the addition
that code chunks are named and you can use the names to nest chunks.

here's a mini example:

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

ct: generate (`ctrl-alt-g`): generate code\
ct: go to line (`ctrl-alt-l`): go to a line from a generated file in the source .ct file\
ct: go to parent (`ctrl-alt-p`): go to the parent code-chunk\
ct: go to child (`ctrl-alt-c`): go to the child code-chunk

## more codetext

for a codetext walkthrough, see [`foo.ct`](https://github.com/tnustrings/ct-vscode/blob/main/try/foo.ct).

for some 'real world' codetext, see for example [this extension's
code](https://github.com/tnustrings/ct-vscode/blob/main/src/extension.ct)
or [code from
tagid](https://github.com/tnustrings/tagid/blob/main/tagid.ct), a
language help program.

## credit

the syntax highlighting part of this extension is based on [vscode
org mode](https://github.com/vscode-org-mode/vscode-org-mode).

## dev

for development, see [`dev.md`](https://github.com/tnustrings/ct-vscode/blob/main/dev.md).

