import * as vscode from 'vscode'
import * as codetext from "./codetext"
import * as path from 'path'
export function activate(context: vscode.ExtensionContext) {
  console.log("hi, the tryjump extension is now active")
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
      codetext.ctwrite(text, dir)
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
      codetext.ct(text)
  
      // get the names of the files assembled by codetext
      var rootnames = codetext.rootnames()
  
      // in which file should we go to line?
      var filepick = await vscode.window.showQuickPick(rootnames)
  
      // console.log("pick: " + filepick)
  
      // get the line number in the generated file
      var genline = await vscode.window.showInputBox({
        placeHolder: "go to line" //,
        //prompt: "option a\noptionb"
      })
      genline = parseInt(genline)
      // console.log("genline: " + genline)
  
      // get genline's position in the ct file
      var ctline = codetext.ctlinenr[filepick][genline]
  
      // make this a function jump_to_line(ctline)?
      // move the cursor. somehow we have to subtract one to get to the given line. why?
      editor.selections = [new vscode.Selection(ctline-1, 0, ctline-1, 0)]
      // scroll the cursor into view
      // what's the difference between a selection and range?
      var range = new vscode.Range(ctline-1, 0, ctline-1, 0)
      editor.revealRange(range)
    })
  
    context.subscriptions.push(go_to_line)
}
