// @ts-ignore
import * as vscode from 'vscode'
import * as ct from "./ct"
import * as path from 'path'

var ppo = {} // dict of string-arrays

export function activate(context: vscode.ExtensionContext) {
  //console.log("hi, the codetext extension is now active")
  /*  vscode.commands.executeCommand(
      "vscode.openWith",
      vscode.Uri.parse("file:///home/max/codetext/foo.py"),
      "default",
      vscode.ViewColumn.Beside
    )*/
    var p = "file:///home/max/codetext/zoo.py"
    vscode.workspace.openTextDocument(p).then(doc =>
    {
      vscode.window.showTextDocument(
        doc,
        {
          preserveFocus: true, // keep the focus in the old document
  	preview: true, // does this have an effect?
  	viewColumn: vscode.ViewColumn.Beside // show beside the current document
        }
      )
    })
    // does a second one replace the first?
    p = "file:///home/max/codetext/foo.py"
    vscode.workspace.openTextDocument(p).then(doc =>
    {
      vscode.window.showTextDocument(
        doc,
        {
          preserveFocus: true, // keep the focus in the old document
  	preview: true, // does this have an effect?
  	viewColumn: vscode.ViewColumn.Beside // show beside the current document
        }
      )
    })
  
    
  const generate = vscode.commands.registerCommand(
    'ct.generate', async () => {
      var editor = vscode.window.activeTextEditor
      var text = editor.document.getText()
      var mypath = editor.document.fileName
      var dir = path.dirname(mypath)
  
      console.log("dir: " + dir)
      ct.ctwrite(text, dir, path.basename(mypath))
      var rootnames = ct.rootnames()
      vscode.window.showInformationMessage("generated " + rootnames.join(", ") + ".")
    }
  )
    context.subscriptions.push(generate)
  const go_to_line = vscode.commands.registerCommand(
    'ct.go_to_line', async () => {
      var editor = vscode.window.activeTextEditor
      var text = editor.document.getText()
      // console.log("text: " + text)
      ct.ct(text, "")
      var rootnames = ct.rootnames()
      var filename = editor.document.fileName
      sortbyppo(rootnames, ppo[filename])
      var filepick
      if (rootnames.length > 1) {
          filepick = await vscode.window.showQuickPick(
  	  rootnames,
  	  { placeHolder: "go to line in" }
  	)
      }
      else if (rootnames.length == 1) {
          filepick = rootnames[0]
      } else {
          // no root name
          return
      }
      if (filepick == undefined) {
        return
      }
      putfirst(rootnames, filepick)
      ppo[filename] = rootnames
      // console.log("pick: " + filepick)    
      var genline = await vscode.window.showInputBox({
        placeHolder: "line number in " + filepick //,
        //prompt: "option a\noptionb"
      })
      if (genline == undefined) {
        return
      }
      var genlineint = parseInt(genline)
      //var ctline = ct.ctlinenr[filepick][genlineint]
      var [ict, errmsg] = ct.ict(filepick, genlineint)
  
      if (ict == -1) {
        vscode.window.showInformationMessage(errmsg)
        return
      }
      jumptoline(editor, ict)
    }
  )
    context.subscriptions.push(go_to_line)
  const go_to_child = vscode.commands.registerCommand(
    'ct.go_to_child', async () => {
      var editor = vscode.window.activeTextEditor
      var ict = currentline(editor)
      if (ict == -1) { return } // no cursor in editor
      // display a message box
      // vscode.window.showInformationMessage("current line: " + ict)    
      var text = editor.document.getText()
      ct.ct(text, "")
      var [newline, errmsg] = ct.gotochild(ict)
  
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
  
      var ict = currentline(editor)
  
      if (ict == -1) { return } // no cursor in editor
      
      // display a message box
      // vscode.window.showInformationMessage("current line: " + ict)
      var text = editor.document.getText()
      ct.ct(text, "")
      var [newline, errmsg] = ct.gotoparent(ict)
  
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
  revealline(editor, line)  
}
function revealline(editor: vscode.TextEditor, line: number) {
  var range = new vscode.Range(line-1, 0, line-1, 0)
  editor.revealRange(range)
}
