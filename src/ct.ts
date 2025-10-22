// @ts-nocheck

// ct.ts implements codetext in ts
// it tries to stick closely to the go ct implementation of https://github.com/tnustrings/ct

import * as fs from "fs"

// debug offers turn-offable printing
function debug(s) {
    console.log(s)
}

// for each generated file, map its line numbers to the original line numbers in ct file
var ictmap = {}

// ict maps line numbers of a generated file to the original line numbers in ct file
export function ict(rootname: string, igen: number) {
    // rootname not there
    if (!(rootname in ictmap)) {
      return [-1, "there is no file named " + rootname]
    } else if (!(igen in ictmap[rootname])) { // linenumber not there
      return [-1, rootname + " doesn't have line " + igen]
    }
    return [ictmap[rootname][igen], null]
}


// from alias to filenames
var fileforalias = {} // actually the private signifier is #, but this screws up identation

// the root nodes
var roots = {}

// rootnames returns the names of the roots
export function rootnames() {
    return Object.keys(roots)
}

// the node at a ct line (if there is one)
var nodeatict = {}

// gotoparent gives the ict where a child is referenced in its parent
export function gotoparent(ict: number) : [number, string] {
  // get the node from where we start
  if (!(ict in nodeatict)) {
    return [-1, "there is no codechunk at this line"]
  }
  var child = nodeatict[ict]

  // get the child's parent
  var parent = child.cd[".."]
  if (parent == child) {
    return [-1, "this code-chunk has no parent"]
  }

  // get the child's index in parent
  var lip = child.iip

  // map from the line in parent to the line in ct
  return [parent.lines[lip].ict, null]
}

// gotochild gives the ict of the first line of a parent's child
export function gotochild(ict: number) : [number, string] {
  // get the node from where we start
  if (!(ict in nodeatict)) {
    return [-1, "there is no codechunk at this line"]
  }
  var parent = nodeatict[ict]

  // get the child
  if (!(ict in parent.caict)) {
    return [-1, "try going to a line that references a child node"]
  }
  var child = parent.caict[ict]
  
  // return the ct start line of the child
  return [child.lines[0].ict, null]
}

// ctwrite runs codetext and writes the assembled files
export function ctwrite(text: string, dir: string, ctfile: string) {

    // run codetext
    ct(text, ctfile)

    // write the assembled text for each root
    for (var filename of Object.keys(roots)) {
        // console.log(roottext[filename])
	fs.writeFile(dir + "/" + filename,
	  roottext[filename],
	  { flag: "w" }, // apparently needed to overwrite?
	  function (err) {
	    // is it good to throw the error?
	    if (err) { throw err; console.error(err) }
	  })
    }
}

// the assembled text of each root
var roottext = {}

// ct assembles codetext without writing files
// return a string with an error message, if errors happened.
export function ct(text: string, ctfile: string) : string {

    console.log("hello ct")

    var conf = loadconf()

    // reset variables
    roots = {}
    roottext = {}
    ictmap = {}
    currentnode = null
    openghost = null
    nodeatict = {}

    // take care of dos line breaks \r\n
    text = text.replaceAll("\r\n", "\n")
    //console.log("text: " + text)
    var lines = text.split("\n")
    // put the \n that split removed back to each line, text concat in nodes relies on that.
    for (var i = 0; i < lines.length; i++) {
        //console.log("lines[i]: " + lines[i])
        lines[i] += "\n"
    }


    // put in the chunks

    // are we in a chunk
    var inchunk = false
    
    // current chunk content
    var chunk = ""
    
    // current chunk name/path
    var path = null
    
    // start line of chunk in ct file
    var ichunkstart = 0

    // the text preceeding a chunk
    var prevtxt = ""

    // for (line of lines) {
    for (var i = 0; i < lines.length; i++) {
	var line = lines[i]
	//console.log("line: '" + line + "'")
        //console.log("isdblticks: " + isdblticks(line))
	// we can't decide for sure whether we're opening or closing a chunk by looking at the backticks alone, cause an unnamed chunk is opend the same way it is closed.  so in addition, check that inchunk is false.
        if (/^``[^`]*/.test(line) && !inchunk) {
        
	    // at the beginning of chunk remember its name
            inchunk = true
            
	    // remember its path
            path = getname(line)
            // debug("path: " + path)
            
	    // remember the start line of chunk in ct file
            // add two: one, for line numbers start with one not zero, another, for the chunk text starts in the next line, not this
	    ichunkstart = i+2
	} else if (isdblticks(line)) {
        
            // we're not in a chunk anymore
	    inchunk = false

            // put in the last read chunk
            // print(f"calling put for: {path}")
            put(path, chunk, ichunkstart, prevtxt)
            
            // reset variables
            chunk = ""
            path = null
	    prevtxt = ""
            // print("")
	} else if(inchunk) { // when we're in chunk remember line
	    chunk += line // + "\n"
	} else { // remember text between chunks
	    prevtxt += line // + "\n"
            // console.log(line) // for debugging
	}

    }

    /* in the end we need to exit all un-exited ghost nodes so that their
    named children end up as the named children of the last named parent
    where we can access them.  */

    cdroot(currentnode)

    // check that no references or declarations are missing.
    var refok = true
    var declok = true
    var ok, err, msg
    /*for (var key in roots) {
        [ok, err] = checkref(roots[key])
	if (!ok) { refok = false }
	msg = err
	[ok, err] = checkdecl(roots[key])
	if (!ok) { declok = false }
	msg += "\n" + err
    }*/
    // don't continue if something's wrong.
    if (!refok || !declok) {
        console.log("chunk refs not working out.") // todo return error
        return msg
    }

    // at the end, write the assembled text to roottext
    for (var filename of Object.keys(roots)) {
        // todo: add don't edit comment like before

        // get the proglang. for now from the filename, maybe later also from hashtag, in case filename has no suffix
	var proglang = ""
	if (/\./.test(filename)) {
    	    var a = filename.split(".")
	    proglang = a[a.length-1]
	}
        
        // assemble the code
        var [out, _] = assemble(roots[filename], "", filename, proglang, 1, ctfile, conf)
        // printtree(roots[filename])

	// and write it to file
        //debug("write " + filename)
	//debug(out)
	//fs.writeFile(filename, out, (err) => err && console.error(err))
	
	// save the generated text
	roottext[filename] = out
    }
    return null // no error
}

// checkref checks that each node except root nodes has been referenced.
function checkref(node: Node) : boolean {
    var ok = true
    // if the node is not root and hasn't been referenced, error
    if (!node.isroot() && !n.r) {
        console.log("error: node %s hasn't been referenced from another node.\n", pwd(node)) // todo give line number? what about empty chunks where n.ict[0] wouldn't work? could put pass the ctline of the chunk opening, and node save this in a property, in case no lines get added to the node?
	ok = false
    }
    // check the children
    for (var key in node.cd) {
        var childok = checkref(node.cd[key])
	if (!childok) {
            ok = false
	}
    }
    return ok
}

// checkdecl checks that each node except ghost nodes has been declared
// doubles with checks in put(), but necessary, cause there could just be a reference to a chunk that's never opened, put() wouldn't catch this.
function checkdecl(node: Node) : boolean {
    var ok = true
    if (!node.d) {
        console.log("error: node %s hasn't been declared.\n", pwd(node))
	ok = false
    }
    // check the childs
    for (var key in node.cd) {
        var childok = checkdecl(node.cd[key])
	if (!childok) {
	    ok = false
	}
    }
    return ok // is the tree hanging on this node ok?
}


// isdeclaration returns true if line is the declaration line of a code chunk
/*function isdeclaration(line: string) : boolean {
    // return line.match(/^<<[^\>]*$/)
    // the line needs start ticks and a wordchar after that
    var startticks = /^``[^`]*\n?$/.test(line)
    var wordchar = /^``.*\w+.*\n?$/.test(line) // why \n needed?
    return startticks && wordchar
}*/

// isname returns true if line is a referencing name line of a code chunk
function isname(line: string) : boolean {
    return /.*``.*``/.test(line) // todo couldbe be ``.+`` or?
}

// isdblticks says if the line consists of two ticks only (not considering programming-language hashtag)
// this could either be a start line of an unnamed chunk or an end line of a chunk
function isdblticks(line: string) : boolean {
    var ret = /^``(\s+#\w+)?\s*$/.test(line)
    //debug(line)
    //debug("isdblticks: '" + line + "':" + ret)
    return ret
}


// getname gets the chunkname from a chunk-opening or in-chunk reference
function getname(line: string) : string {
    // remove the leading ticks (openings and references)
    var name = line.replace(/^[^`]*``/, "") // replace only first
    
    // remove the trailing ticks (references only)
    name = name.replace(/``.*/, "") // chunk declarations do not have this
    
    // remove the newline (openings only)
    name = name.replace(/\n$/, "")
    
    // replace programming language hash tag if there (openings only)
    name = name.replace(/\s+\#\w+$/, "")

    // don't remove the declaration colon, we need it in put()
    
    // debug(f"getname({line}): '{name}'")

    return name
}

// fromroot says whether the name starts from a root
function fromroot(name: string) : boolean {
    return /^\/\//.test(name)
}

// Line holds the text of a line and its index in the ct file
class Line {
    txt: string
    ict: number

    constructor(txt: string, ict: number) {
        this.txt = txt
	this.ict = ict
    }
}

// node code-chunks are represented as nodes in a tree. 
class Node {
    name: string
    cd: { [key:string]:Node }
    lines: line[]
    prevlines: line[]
    ghostchilds: Node[]
    d: boolean
    r: boolean
    iip: number
    caict // map[int]Node
    
    constructor(name, parent) {
        this.name = name
        this.cd = {}
        this.cd["."] = this
        if (parent == null) {
            this.cd[".."] = this
	} else {
            this.cd[".."] = parent
	}
	
        //self.parent = parent
        //this.text = ""
	
	// keep the text as lines, cause splitting on '\n' on empty text gives length 1 (length 0 is wanted)
	this.lines = []

	// prevlines: the previous lines for each chunk in this node, accessed by the index of the first chunk line.
	this.prevlines = []
	
	// the ghost children. why more than one?
        this.ghostchilds = []
	
        // has this node been declared by a colon ':'
        this.d = false

	// r: has this node been referenced. every node except root nodes needs to have been referenced.
    	this.r = false

	// at which index of the parent is the child?
	this.iip = null

	// caict (child-at-ict) at these ct lines, there are children { int -> Node }
	this.caict = {}
    }
        
    // ls lists the named childs
    ls() : string[] {
	var out = []
        // return all except . and ..
	for (var k of Object.keys(this.cd)) {
	    if (k == "." || k == "..") { continue }
	    out.push(k)
	}
	return out
    }

    // isroot says wether the node is a root, that is whether its parent is nil
    isroot() : boolean {
        if (this.cd[".."] == this) {
           return true
        }
        return false
    }
}

var currentnode = null // the node we're currently at
var openghost = null // if the last chunk opened a ghostnode, its this one

    
// put puts text in tree under relative or absolute path
function put(path: string, text: string, ict: number, prevtxt: string) {

    //debug("put: " + path)
    //debug("put: " + text)
    
    // create a ghostnode if called for
    if ((path == "." || path == "") && openghost != null) {
        currentnode = openghost

        // we enter the ghost node for the first time here, this implicitly declares it
	currentnode.d = true
        openghost = null // necessary?
	
    } else {
        // named node (new or append) or ghost node (append)

	
	// if the path would need a node to cling to but there isn't noe
        if (currentnode == null && !fromroot(path)) { 
            console.log("error (line " + ict + "): there's no file to attach '" + path + "' to, should it start with '//'?")
            process.exit()
	}

        // a colon at the path end indicates that this is a declaration
        var isdeclaration = /:\s*$/.test(path)

        // remove the colon from path
        path = path.replace(/:\s*$/, "")

        // find the node, if not there, create it
        var node = cdmk(currentnode, path, ict)

        // we'd like to check that a node needs to have been declared with : before text can be appended to it. for that, it doesn't help to check if a node is there, cause it might have already been created as a parent of a node. so we introduce a node.d property.

        if (isdeclaration && node.d) {
            console.log("error (line " + ict + "): chunk " + path + " has already been declared, maybe drop the colon ':'")
            process.exit()
	} else if (!isdeclaration && !node.d) {
            console.log("error (line " + ict + "): chunk " + path + " needs to be declared with ':' before text is appended to it, node.d: " + node.d)
            process.exit()
	}

        // set that the node has been declared
        if (isdeclaration) {
            node.d = true
	}

        // all should be well, we can set the node as the current node
        currentnode = node
    }

    // append the text to node
    concatcreatechilds(currentnode, text, ict, prevtxt)
}


// cdmk walks the path from node and creates nodes if needed along the way.
// it returns the node it ended up at
function cdmk(node: Node, path: string, ict: number) : Node {

    // if our path is absolute (starting from a root), we can't just jump to the root, because when changing positions in the tree, we need to make sure that ghostnodes are exited properly.  cdone takes care of that, so we go backward node by node with cdone.  cdroot does this recursively.
    if (/^\//.test(path)) {
        // exit open ghost nodes along the way
        node = cdroot(node, ict)
    }

    // if the path starts with // we might need to change roots.
    if (/^\/\//.test(path)) {

        // remove the leading // of root path
        path = path.replace(/^\/+/, "") // todo check
    
        // split the path
        var p = path.split("/")

        // the first part of the path is the rootname
        var rootname = p[0]

        // root not there? create it
        if (!(rootname in roots)) {
            roots[rootname] = new Node(rootname, null)
	}

        // set the node to the root
        node = roots[rootname]

        // stitch the rest of the path together to walk it
	path = p.slice(1).join("/") // slice(i): all elements including and after index i
    }

    // for absolute paths, we should be at the right root now

    // remove leading / of absolute path
    path = path.replace(/^\//, "")

    // follow the path
        
    var elems = path.split("/")

    var search = false // search for the next name

    for (var elem of elems) {
        // do we start a sub-tree search?
        if (elem == "*") {
            search = true
            continue
	}
	if (search == true) {
            // search for the current name
            search = false // reset
            var res = []
	    bfs(node, elem, res) // search elem in node's subtree
            if (res.length > 1) {
		console.log("error (line " + ict + "): more than one nodes named " + elem + " in sub-tree of " + pwd(node))
		process.exit()
	    }
	    else if (res.length == 0) {
		console.log("error (line " + ict +"): no nodes named " + elem + " in sub-tree of " + pwd(node))
		process.exit()
	    }
	    else {
		node = res[0]
	    }
            continue
	}

	// standard:
        // walk one step
        var walk = cdone(node, elem, ict)
        //console.log("walk: " + walk)
        // if child not there, create it
        if (walk == null) {
            walk = createadd(elem, node)
	}
        node = walk
    }
    return node // the node we ended up at
}

// concatcreatechilds concatenates text to node and creates children from text (named or ghost)
// this is the only place where text gets added to nodes
function concatcreatechilds(node: Node, text: string, ict: number, prevtxt: string) {

    // reset the open ghost. why here? not so clear. but we need to reset it somewhere, that only the direct next code chunk can fill a ghost node.
    openghost = null 

    // make line arrays for text and prevtxt.
    
    // replace the last \n so that split doesn't produce an empty line at the end.
    text = text.replace(/\n$/, "")
    var a = text.split("\n")
    var newlines = makelines(a, ict)
    //console.log(newlines)

    prevtxt = prevtxt.replace(/\n$/, "")
    a = prevtxt.split("\n")
    // get the ict of the first line in prevlines: remove 1 line for the chunk opening line and the number of previous lines.    
    var prevlines = makelines(a, ict - 1 - a.length)

    // filter empty lines at the end of prevlines
    var i = prevlines.length-1
    // count down n from the back until first non-empty line
    for ( ; i >= 0 && /^\s*$/.test(prevlines[i].txt); i--) { }
    prevlines = prevlines.slice(0, i+1)

    var N = node.lines.length

// remember the prevlines. function comments can be inserted from them at assembly later. for inserting function comments we need to know the programming language of the chunk, which is mostly inferred from the file extension of its root. the root is generally known for each chunk at put, cause the chunk has in some way to specify it, either explicitly in its path or implicitly because the root is somewhere before it in the text.  there is an edge case though when the root file doesn't have an extension, but the root chunk specifies the programming language via hashtag and comes after this chunk in the text (presumably quite rare).  in that case we'd need to wait after the root chunk is put to know the programming language of the current chunk. so for now, when inserting function comments, we pass the programming language down from the root node at assembly.

    node.prevlines[N] = prevlines

    // map from the ct line to the node.
    for (var i = 0; i < newlines.length; i++) {
      nodeatict[ict + i] = node
    }
    // also set node at index ct for the opening and the closing line of a chunk.
    // opening line.
    nodeatict[ict - 1] = node             
    // closing line
    nodeatict[ict + newlines.length /* +1 ? */] = node

    //node.text += text
    node.lines.push(...newlines)
    
    for (var i = 0; i < newlines.length; i++) {
        var line = newlines[i]
	if (!isname(line.txt)) { continue }

	// why do we create the children when concating text? maybe because here we know where childs of ghost nodes end up in the tree. """

	// the newly created child
	var child = null 

	var name = getname(line.txt)
	if (name == ".") {// ghost child
            // if we're not at the first ghost chunk here
            if (openghost != null) {
		console.log("error (line " + ict + i + "): only one ghost child per text chunk allowed")
		process.exit()
	    }
            // create the ghost chunk
            openghost = createadd(GHOST, node)
	    child = openghost
	} else {  // we're at a name
	    // if the name is not yet in child nodes
            if (!(name in node.ls())) {
		// create a new child node with the name and add it
		child = createadd(name, node)
	    }
	}

	// the child has been referenced.
	// (not technically necessary to set this for ghost childs?)
	child.r = true

	// at which line of the parent is the child?
	child.iip = i + N

	// at this line, the parent has a child
	node.caict[ict + i] = child
    }
}

// makelines turns an array of strings into an array of lines counting up their index in the ctfile
function makelines(a: string[], ict: int) : Line[] {
    var out: Line[] = []
    for (var i = 0; i < a.length; i++) {
      out.push(new Line(a[i], ict+i))
    }
    return out
}


// createadd creates a named or ghost node and adds it to its parent
function createadd(name: string, parent: Node) : Node {

    var node = new Node(name, parent)
    // print(f"createadd: {pwd(node)}")
    
    // if we're creating a ghost node
    if (node.name == GHOST) {
	// debug("creating a ghost child for " + parent.name)
        // add it to its parent's ghost nodes
        parent.ghostchilds.push(node)
    } else {
        // we're creating a name node
        
        /* if the parent is a ghost node, this node could have already been created before with its non-ghost path (an earlier chunk in the codetext might have declared it and put text into it, with children/ghost children, etc), then we move it as a named child from the last named parent to here */
	
        // if a node with this name is already child of last named parent, move it here
        if (parent.name == GHOST) {
            var lnp = lastnamed(node)
	    if (node.name in lnp.ls()) {
		node = lnp.cd[name]
                delete lnp.cd[name]
                node.cd[".."] = parent
	    }
	}


	// add named node to parent, if it was created or moved
        parent.cd[name] = node
    }

    return node
}

// lastnamed returns the last named parent node
function lastnamed(node: Node) : Node {
    if (node == null) { return null }
    if (node.name != GHOST) { return node }
    return lastnamed(node.cd[".."])
}


// bfs breath-first searches for all nodes named 'name' starting from 'node' and puts them in 'out'
function bfs(node: Node, name: string, out: Node[]) {
    //  print(f"bfs {node}")
    if (node.name == name) {
        out.push(node)
    }
    // search the node's childs
    for (var childname of node.ls()) {
        bfs(node.cd[childname], name, out)
    }
    // do we need to search the gostchilds?
    for (var child of node.ghostchilds) {
        bfs(child, name, out)
    }
}

// cdone walks one step from node
function cdone(node: Node, step: string, ict: number) : Node {
    //console.log("step: " + step.length)
    if (step == GHOST) {
        // we may not walk into a ghost node via path
        console.log("error (line " + ict + "): don't use string '{GHOST}' in paths")
        process.exit()
    }
    // step is only blank space? stay.
    if (/^\s*$/.test(step)) { //. == 0) { // quick fix? if (step == "") {
        step = "."
    }
    if (step == "..") { // up the tree
        // print(f"call exitghost for {pwd(node)}")
        exitghost(node)
    }
    //console.log("step: " + step)
    if (step in node.cd) {
        return node.cd[step]
    }
    return null
}

// cdroot cds back to root. side effect: ghosts are exited
function cdroot(node: Node, ict: number) : Node {
    if (node == null) { return null }
    if (node.cd[".."] == node) { // we're at a root
        return node
    }
    // continue via the parent
    return cdroot(cdone(node, "..", ict)) // it's probably not very necessary to pass the ict here, cause it only check's that the step isn't a '#' that would walk into a ghostnode
}

// exitghost moves ghost node's named children to last named parent. needs to be called after leaving a ghost node
function exitghost(ghost: Node) {
    // not a ghost? do nothing
    if (ghost == null || ghost.name != GHOST) {
        return
    }

    /* if we exit a ghost node, we move all its named childs to the ghost node's parent and let the ghostnode be the childs' ghostparent (from where they can get e.g. their indent) */
    // for name, child of node.namedchilds.items():
    for (var name of ghost.ls()) {
	var child = ghost.cd[name]
        child.ghostparent = ghost
        // set child's parent to ghost's parent
        child.cd[".."] = ghost.cd[".."]

	/* when putting the child in the parent's namedchilds, we don't need to worry about the name already being taken, because we moved every child that could be touched here that was already there inside the ghostnode upon creating it. */
        // hang the child to ghost's parent
        var parent = ghost.cd[".."]
	parent.cd[name] = child
        // delete child from ghost
        delete ghost.cd["name"]
    }
}

// the name of ghost nodes
var GHOST = "#" 

/* assemble assembles a codechunk recursively, filling up its leading
space to shouldspace. this way we can take chunks that are already
(or partly) indented with respect to their parent in the editor, and
chunks that are not.  */

function assemble(node: Node, shouldspace: string, rootname: string, proglang: string, igen: number, ctfile: string, conf) : [string, number] {

    //debug("assemble node " + node.name)

    // if it's a ghost node, remember the last named parent up the tree
    if (node.name == GHOST) {
        var lnp = lastnamed(node)
    }

    /* 
    find out a first line how much this chunk is alredy indented
    and determine how much needs to be filled up
    */
    var alreadyspace
    // leading space already there
    if (node.lines.length > 0) {
	alreadyspace = node.lines[0].txt.match(/^\s*/)[0]
    } else {
	alreadyspace = "" // no line, so no leading space already there
    }
    // space that needs to be added
    var addspace = shouldspace.replace(alreadyspace, "") // replace only the first of alreadyspace

    //debug("shouldspace: '" + shouldspace + "'")
    //debug("alreadyspace: '" + alreadyspace + "'")
    //debug("addspace: '" + addspace + "'")

     // insert comments from previous text nodes.  do this here because the programming language is now safe to be known after all the nodes have been put.  line referencing depends on whether lines were inserted, so do it here also.
    //var outlines = insertcmt(node.lines, node.prevlines, proglang, node.isroot(), ctfile, conf)
    var outlines = node.lines
    //debug("outlines: ")
    //debug(outlines)


    // if the rootname isn't in ict yet, put it there
    if (!(rootname in ictmap)) {
	ictmap[rootname] = {}
    }

    var out = ""
    var outnew = ""
    var ighost = 0 
    // for (var line of lines) {
    for (var i = 0; i < outlines.length; i++) {
	var line = outlines[i]//bm
        if (isname(line.txt)) {

            // remember leading whitespace
            var childshouldspace = line.txt.match(/^\s*/)[0] + addspace

	    // get the name
	    var name = getname(line.txt)

            var child

            if (name == ".") {
	    
                // assemble the next ghost-child.
		
		//debug("assemble ghost child " + ighost + " for " + node.name)
		child = node.ghostchilds[ighost]
		var [outnew, linenrnew] = assemble(child, childshouldspace, rootname, proglang, igen, ctfile, conf)
		// append the text
		out += outnew
		igen = linenrnew
                ighost += 1
	    } else {
	    
	        // assemble a name child.
		
                if (node.name == GHOST) {
                    // if at ghost node, we get to the child via the last named parent
		    child = lnp.cd[name]
		} else {
		    child = node.cd[name]
		}
                var [outnew, linenrnew] = assemble(child, childshouldspace, rootname, proglang, igen, ctfile, conf)
		out += outnew
		igen = linenrnew
	    }
	}
	else {  // not name line, normal line
	    // append the line
            out += addspace + line.txt + "\n"

	    // map from the line number in the generated source to the original line number in the ct
	    ictmap[rootname][igen] = line.ict
	    
	    // we added one line to root, so count up
	    igen += 1
	}
    }

    //debug("out: " + out)
    
    return [out, igen]
}

// insertcmt inserts function and don't-edit comments to node.
function insertcmt(lines: Line[], prevlines: Line[], proglang: string, isroot: boolean, ctfile: string, conf) : Line[] {

    var prog = getpl(conf, proglang)

     // don't do anything if no programming language or no function re given
     if (prog == null || prog.fncre == undefined) {
       return lines
     }
     // don't do anything if comment marks are not given.
     if (prog.cmtline == undefined || (prog.cmtopen == undefined && prog.Cmtclose == undefined)) {
       return lines
     }

     
    // make a regexp to recognize (and extract) function names for the node's programming language.
    var funcre = new RegExp(prog.fncre)

    // are comments inserted before or after function declaration?
    var cmtbefore = true
    if (prog.fnccmt == "after") { cmtbefore = false }

    var cmtindent = ""
    if (prog.cmtindent) { cmtindent = prog.cmtindent }

    // the text lines preceeding the current chunk
    var myprevlines: Line[] = []

    // leading space regexp
    var leadspacere = /^\s/

    var out: Line[] = []
    // map from the line number in the node to original line number in ct (get existing line count before new lines are added to node).
    // this loop inserts comment lines and sets ict for all lines (including inserted comments), nothing else.
    for (var i = 0; i < lines.length; i++) {

         // if this is a root chunk and the first line,
	 // insert a 'don't edit' message.
	 if (isroot && i == 0 && prog && prog.cmtline) {
	 
	   // make the comment and insert it as first line
	   var cmt = prog.cmtline + " automatically generated, DON'T EDIT. please edit " + ctfile + " from where this file stems."
	   out.push(new Line(cmt, -1))
	 }

         var line = lines[i]

         // go through the node's lines.
         
         // is this line the beginnig of a chunk?
	 // (subtracting the added lines, are there prevlines
	 // for this line index?)
         if (i in prevlines) {
             myprevlines = prevlines[i]
         }

        if (!funcre.test(line.txt)) {
	  // it's a normal line, append it.
	  out.push(line)
	} else {
            // this line is a function declaration. put in
            // prevtxt starting from a line that begins with
	    // the function name.

        
            // get the name of the function 
            var funcname = funcre.exec(line.txt)[1] // [0] holds the whole matched string, [1] holds the first matched group
	    //console.log("funcname: " + funcname)

            // comments need to inherit the identation of their function declaration line, cause that isn't added later.
            // this is done apart from alreadyspace in assemble, cause functions might not be declared on the first line of their chunk, which might be intended differently.
            var funcspace = line.txt.match(/^\s*/)[0]

            // make a regexp for lines beginning with the function name
            var funcnamere = new RegExp("^" + funcname)
            
            // skip the lines before a line starts with the function name.
	    var skip = 0
            for ( ; skip < myprevlines.length && !funcnamere.test(myprevlines[skip].txt); skip++) {
                // skip
            }

            // lencmt holds the length of the comment in myprevlines
            var lencmt = myprevlines.length - skip
	    
	    // if the function declaration comes before the comment,
	    // insert it here
	    if (!cmtbefore) {
	        out.push(line)
	    }
	    
            // insert opening comment mark, if given. 
            if (prog.cmtopen) {
	       var cmt = funcspace + cmtindent + prog.cmtopen
                out.push(new Line(cmt, -1))
            }
            // insert the comment lines
            for (var j = 0; j < lencmt; j++) {
	    	// figure out the comment mark during the comment. if it's a multiline comment, take cmtduring (if there). if it's not a multiline comment take cmtline.
		var cmtmark = ""
		if (prog.cmtopen) { // multiline comment
		   // insert a during mark, if there is one (the single stars at the beginnig of each line in javadoc).
		   if (prog.cmtduring) { cmtmark = prog.cmtduring + " " }
		} else { // single lines of comment
		   cmtmark = prog.cmtline + " "
		}
		
		// make the comment.
		var cmt = funcspace + cmtindent + cmtmark + myprevlines[skip + j].txt
                var ict = myprevlines[skip + j].ict
                
                // insert the comment line
                out.push(new Line(cmt, ict))
            }
            
            // insert the closing comment mark, if given. 
            if (prog.cmtclose) {
	        var cmt = funcspace + cmtindent + prog.cmtclose
                out.push(new Line(cmt, -1))
            }

	    // if the function declaration comes after the comment, insert it here
	    if (cmtbefore) {
	        out.push(line)
	    }
        } 
    }
    return out
}


// getpl gets the entry for a programming language from conf
function getpl(conf, pl: string) {
    for (var [key, prog] of Object.entries(conf.proglang)) {
        // does the name match?
        if (prog.name == pl) {
	    return prog
	}
	// do any of the extensions match?
	for (var ext of prog.ext) {
	    if (ext == pl) {
	        return prog
            }
	}
    }
    return null
}

// run main
//main()


// loadconf loads the configuration
function loadconf() {
    return {
    "proglang": [
	{
	    "name": "awk",
	    "ext": ["awk"],
	    "cmtline": "#"
	},
	{
	    "name": "bash",
	    "ext": ["sh", "bash"],
	    "cmtline": "#"
	},
	{
	    "name": "c",
	    "ext": ["c"],
	    "fncre": ".*\\s+([\\w\\d_]+)\\s*\\(.*\\)\\s*{",
	    "cmtline": "//",
	    "fnccmt": "before"
	    
	},
	{
	    "name": "go",
	    "ext": ["go"],
	    "fncre": "func\\s+([\\w\\d_]+).*\\(.*\\).*{", 
	    "cmtline": "//",
	    "fnccmt": "before"
	},
	{
	    "name": "html",
	    "ext": ["html"],
	    "cmtopen": "<!--",
	    "cmtclose": "-->"
	},
	{
	    "name": "java",
	    "ext": ["java"],
	    "fncre": ".*\\s+([\\w\\d_]+)\\s*\\(.*\\)\\s*{", // don't include (public|private|...) because that would count as a group
	    "cmtopen": "/**",
	    "cmtduring": "*",
	    "cmtclose": "*/",
	    "cmtline": "//",
	    "fnccmt": "before"
	},
	{
	    "name": "javascript",
	    "ext": ["js", "ts"],
	    "fncre": "(function)?\\s+([\\w\\d_]+).*\\(.*\\)\\s*{", 
	    "cmtline": "//",
	    "fnccmt": "before"
	},
	{
	    "name": "python",
	    "ext": ["py"],
	    "fncre": "def\\s+([\\w\\d_]+)\\s*\\(.*\\).*:",
            "cmtopen": "\"\"\"",
	    "cmtclose": "\"\"\"",
	    "cmtindent": "    ",
	    "cmtline": "#",
	    "fnccmt": "after"
	}
    ]
  }

    //return JSON.parse(s)
}