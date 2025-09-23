// @ts-ignore
import * as vscode from 'vscode'
import * as ct from "./ct"
import * as path from 'path'

var ppo = {} // dict of string-arrays

export function activate(context: vscode.ExtensionContext) {
  //console.log("hi, the codetext extension is now active")
  const assemble = vscode.commands.registerCommand(
    'ct.assemble', async () => {
    }
  )
  
  get the editor.
  
  
  get the text.
  
  
  get the directory of the ct file.
  
  
  run codetext and write the generated files into dir.
  
  
  inform about the generated files.
  
  todo only do this if there were no errors?
  
  
  push the assemble function.
  
  ``/activate
    context.subscriptions.push(assemble)
  const go_to_line = vscode.commands.registerCommand(
    'ct.go_to_line', async () => {
      
      run codetext on the text.
      
      
      get the names of the files assembled by codetext.
      
      
      sort the rootnames by the previous pick order for this file.
      
      
      show a picker to chose from which of the generated files (rootnames)
      the line number is.
      
      if there is more than one rootnames, pick which one.
      
      
      if there is only one rootname, take it. if no root name, don't continue.
      
      
      put the picked file first in the rootnames list, and save it in ppo
      (previous-pick-order), so we can let it appear on top of the picker
      list next time.
      
      there seems to be no option to get which index was picked, so pass the
      string to putfirst().
      
      
      get the line number in the generated file.
      
      
      get genline's position in the ct file.
      
      
      go to the line.
      
      
      push go_to_line to the context.
      
      ``/activate
        context.subscriptions.push(go_to_line)
    }
  )
  
      // display a message box
      // vscode.window.showInformationMessage("try jump")
  
  get the editor and the text.
  
  const go_to_child = vscode.commands.registerCommand(
    'ct.go_to_child', async () => {
      var editor = vscode.window.activeTextEditor
      var ctline = currentline(editor)
      if (ctline == -1) { return } // no cursor in editor
      // display a message box
      // vscode.window.showInformationMessage("current line: " + ctline)    
      var text = editor.document.getText()
      ct.ct(text)
      var [newline, errmsg] = ct.gotochild(ctline)
  
      // there was an error
      if (newline == -1) {
        vscode.window.showInformationMessage(errmsg)
        return
      }
      jumptoline(editor, newline)
    }
  )
  const go_to_parent = vscode.commands.registerCommand(
    'ct.go_to_parent', async () => {
      var editor = vscode.window.activeTextEditor
  
      var ctline = currentline(editor)
  
      if (ctline == -1) { return } // no cursor in editor
      
      // display a message box
      // vscode.window.showInformationMessage("current line: " + ctline)
      var text = editor.document.getText()
      ct.ct(text)
      var [newline, errmsg] = ct.gotoparent(ctline)
  
      // there was an error
      if (newline == -1) {
        vscode.window.showInformationMessage(errmsg)
        return
      }
      jumptoline(editor, newline)
    }
  )
}

// helper functions
function sortbyppo(names: string[], ppo: string[]) {
  if (!ppo) { return }
  var idx = {}
  for (var i = 0; i < ppo.length; i++) {
    idx[ppo[i]] = i
  }
  names.sort(function(a: string, b: string) {
    if ((a in idx) && (b in idx)) {
      if (idx[a] < idx[b]) { return -1 } // a first
      else if (idx[a] > idx[b]) { return +1 } // b first
      else { return 0 } // shouldn't happen
    }
    else if (a in idx) { // only a
      return -1 // a first
    } else if (b in idx) { // only b
      return +1 // b first
    }
    else {
      return -1
    }
  })
}
function putfirst(a: string[], s: string) {
  var i_s = -1
  for (var i = 0; i < a.length; i++) {
    if (a[i] == s) { i_s = i; break }
  }
  for (var i = i_s; i > 0; i--) {
    var tmp = a[i]
    a[i] = a[i-1]
    a[i-1] = tmp
  }
}
function currentline(editor: vscode.TextEditor) {
  if (editor.selections.length < 1) {
    return -1
  }
  return editor.selections[0].start.line + 1
}
function jumptoline(editor: vscode.TextEditor, line: number) {
  editor.selections = [new vscode.Selection(line-1, 0, line-1, 0)]
  var range = new vscode.Range(line-1, 0, line-1, 0)
  editor.revealRange(range)
}
