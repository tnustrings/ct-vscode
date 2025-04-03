// @ts-ignore
import * as vscode from 'vscode'
import * as ct from "./ct"
import * as path from 'path'
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
  
      // in which file should we go to line?
      var filepick
      
      // if more than one rootnames, pick which one
      if (rootnames.length > 1) {
          // todo msg 'go to line from file' or so
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
  
      // console.log("pick: " + filepick)
  
      // get the line number in the generated file
      var genline = await vscode.window.showInputBox({
        placeHolder: "go to line in " + filepick //,
        //prompt: "option a\noptionb"
      })
      var genlineint = parseInt(genline)
      // console.log("genline: " + genlineint)
  
      // get genline's position in the ct file
      //var ctline = ct.ctlinenr[filepick][genlineint]
      var ctline = ct.ctlinenumber(filepick, genlineint)
  
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
