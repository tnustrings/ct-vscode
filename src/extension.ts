// @ts-ignore
import * as vscode from 'vscode'
import * as ct from "./ct"
import * as path from 'path'

var ppo = {} // dict of string-arrays

export function activate(context: vscode.ExtensionContext) {
  //console.log("hi, the codetext extension is now active")
  const assemble = vscode.commands.registerCommand(
    'ct.assemble', async () => {
      // get the editor
      var editor = vscode.window.activeTextEditor
  
      // get the text
      var text = editor.document.getText()
  
      // get the directory of the ct file
      var p = editor.document.fileName
      var dir = path.dirname(p)
  
      console.log("dir: " + dir)
  
      // run codetext and write the generated files into dir
      ct.ctwrite(text, dir)
  
      // inform about the generated files
      // todo only do this if there were no errors?
      var rootnames = ct.rootnames()
      vscode.window.showInformationMessage("generated " + rootnames.join(", ") + ".")
  
    }
  )
  context.subscriptions.push(assemble)
  const go_to_line = vscode.commands.registerCommand(
    'ct.go_to_line', async () => {
  
      // display a message box
      // vscode.window.showInformationMessage("try jump")
  
      // get the editor
      var editor = vscode.window.activeTextEditor
  
      // get the text
      var text = editor.document.getText()
      // console.log("text: " + text)
  
      // run codetext on the text 
      ct.ct(text)
  
      // get the names of the files assembled by codetext
      var rootnames = ct.rootnames()
  
      // sort the rootnames by the previous pick order
      // get the file name for that
      var filename = editor.document.fileName
      sortbyppo(rootnames, ppo[filename])
  
      // in which file should we go to line?
      var filepick
      
      // if more than one rootnames, pick which one
      if (rootnames.length > 1) {
          filepick = await vscode.window.showQuickPick(
  	  rootnames,
  	  { placeHolder: "go to line in" }
  	)
      } else if (rootnames.length == 1) {
          // only one rootname, take this one
          filepick = rootnames[0]
      } else {
          // no root name, return
          return
      }
  
      // put the picked file first. there seems to be no option to get the picked index, so pass the string
      putfirst(rootnames, filepick)
  
      // set the previous pick order to the rootnames with the picked item on top
      ppo[filename] = rootnames
  
      // console.log("pick: " + filepick)
  
      // get the line number in the generated file
      var genline = await vscode.window.showInputBox({
        placeHolder: "line number in " + filepick //,
        //prompt: "option a\noptionb"
      })
      var genlineint = parseInt(genline)
      // console.log("genline: " + genlineint)
  
      // get genline's position in the ct file
      //var ctline = ct.ctlinenr[filepick][genlineint]
      var [ctline, errmsg] = ct.ctlinenumber(filepick, genlineint)
  
      if (ctline == -1) {
        vscode.window.showInformationMessage(errmsg)
        return
      }
  
      // go to the line
      jumptoline(editor, ctline)
    })
  
    context.subscriptions.push(go_to_line)
  const go_to_child = vscode.commands.registerCommand(
    'ct.go_to_child', async () => {
  
      // get the editor
      var editor = vscode.window.activeTextEditor
  
      var ctline = currentline(editor)
  
      if (ctline == -1) { return } // no cursor in editor
      
      // display a message box
      // vscode.window.showInformationMessage("current line: " + ctline)
  
      // get the text
      var text = editor.document.getText()
  
      // update codetext
      ct.ct(text)
  
      // get the line to jump to
      var [newline, errmsg] = ct.gotochild(ctline)
  
      // there was an error
      if (newline == -1) {
        vscode.window.showInformationMessage(errmsg)
        return
      }
  
      // go to the line
      jumptoline(editor, newline)
    }
  )
  const go_to_parent = vscode.commands.registerCommand(
    'ct.go_to_parent', async () => {
  
      // get the editor
      var editor = vscode.window.activeTextEditor
  
      var ctline = currentline(editor)
  
      if (ctline == -1) { return } // no cursor in editor
      
      // display a message box
      // vscode.window.showInformationMessage("current line: " + ctline)
  
      // get the text
      var text = editor.document.getText()
  
      // update codetext
      ct.ct(text)
  
      // get the line to jump to
      var [newline, errmsg] = ct.gotoparent(ctline)
  
      // there was an error
      if (newline == -1) {
        vscode.window.showInformationMessage(errmsg)
        return
      }
  
      // go to the line
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
    // both a and b are in the index
    if ((a in idx) && (b in idx)) {
      // which is first in the index?
      if (idx[a] < idx[b]) { return -1 } // a first
      else if (idx[a] > idx[b]) { return +1 } // b first
      else { return 0 } // shouldn't happen
    } else if (a in idx) { // only a is in the index
      return -1 // a first
    } else if (b in idx) { // only b is in the index
      return +1 // b first
    } else {
      // both a and b are not in the index, keep order
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
  // no active cursor?
  if (editor.selections.length < 1) {
    return -1
  }
  // start is a position, it has a line and a character
  // add 1, cause lines are zero-indexed
  return editor.selections[0].start.line + 1
}
function jumptoline(editor: vscode.TextEditor, line: number) {
  // move the cursor. somehow we have to subtract one to get to the given line. why?
  editor.selections = [new vscode.Selection(line-1, 0, line-1, 0)]
  // scroll the cursor into view
  // what's the difference between a selection and range?
  var range = new vscode.Range(line-1, 0, line-1, 0)
  editor.revealRange(range)
}
