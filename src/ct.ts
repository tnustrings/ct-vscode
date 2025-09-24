// @ts-nocheck

// ct.ts implements codetext in ts
// it tries to stick closely to the go ct implementation of https://github.com/tnustrings/ct

import * as fs from "fs"

// debug offers turn-offable printing
function debug(s) {
    console.log(s)
}

// for each generated file, map its line numbers to the original line numbers in ct file
var ctlinenr = {}

// ctlinenumber map line numbers of a generated file to the original line numbers in ct file
export function ctlinenumber(rootname: string, genlinenr: number) {
    // rootname not there
    if (!(rootname in ctlinenr)) {
      return [-1, "there is no file named " + rootname]
    } else if (!(genlinenr in ctlinenr[rootname])) { // linenumber not there
      return [-1, rootname + " doesn't have line " + genlinenr]
    }
    return [ctlinenr[rootname][genlinenr], null]
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
var nodeatctline = {}

// gotoparent gives the ctlinenr where a child is referenced in its parent
export function gotoparent(ctline: number) {
  // get the node from where we start
  if (!(ctline in nodeatctline)) {
    return [-1, "there is no codechunk at this line"]
  }
  var child = nodeatctline[ctline]

  // get the child's parent
  var parent = child.cd[".."]
  if (parent == child) {
    return [-1, "this code-chunk has no parent"]
  }

  // get the child's line in parent
  var lip = child.lineinparent

  // map from the line in parent to the line in ct
  return [parent.ctlinenr[lip], null]
}

// gotochild gives the ctlinenr of the first line of a parent's child
export function gotochild(ctline: number) {
  // get the node from where we start
  if (!(ctline in nodeatctline)) {
    return [-1, "there is no codechunk at this line"]
  }
  var parent = nodeatctline[ctline]

  // get the line relative to the parent
  /*var p_start_ctline = parent.ctlinenr[0]
  var lip = ctline - p_start_ctline #bug, cause there can be in-between chunk text. probably just use parent.childatctline[ctline] to get to the child*/

  // get the child
  if (!(i in parent.childatctline)) {
    return [-1, "try going to a line that references a child node"]
  }
  var child = parent.childatctline[i]
  
  // return the ct start line of the child
  return [child.ctlinenr[0], null]
}

// ctwrite runs codetext and writes the assembled files
export function ctwrite(text: string, dir: string) {

    // run codetext
    ct(text)

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
export function ct(text: string) {

    // reset variables
    roots = {}
    roottext = {}
    ctlinenr = {}
    currentnode = null
    openghost = null
    nodeatctline = {}

    var lines = text.split("\n")


    // put in the chunks

    // are we in a chunk
    var inchunk = false
    
    // current chunk content
    var chunk = ""
    
    // current chunk name/path
    var path = null
    
    // start line of chunk in ct file
    var chunkstart = 0 

    // for (line of lines) {
    for (var i = 0; i < lines.length; i++) {
	var line = lines[i]
	//debug("line: '" + line + "'")
        
	// we can't decide for sure whether we're opening or closing a chunk by looking at the backticks alone, cause an unnamed chunk is opend the same way it is closed.  so in addition, check that inchunk is false.
        if (/^``[^`]*/.test(line) && !inchunk) {
        
	    // at the beginning of chunk remember its name
            inchunk = true
            
	    // remember its path
            path = getname(line)
            // debug("path: " + path)
            
	    // remember the start line of chunk in ct file
            // add two: one, for line numbers start with one not zero, another, for the chunk text starts in the next line, not this
	    chunkstart = i+2
	} else if (isdblticks(line)) {
        
            // we're not in a chunk anymore
	    inchunk = false

            // put in the last read chunk
            // print(f"calling put for: {path}")
            put(path, chunk, chunkstart)
            
            // reset variables
            chunk = ""
            path = null
            // print("")
	} else if(inchunk) { // when we're in chunk remember line
	    chunk += line + "\n"
	} else {
            // console.log(line) // for debugging
	}

    }

    /* in the end we need to exit all un-exited ghost nodes so that their
    named children end up as the named children of the last named parent
    where we can access them.  */

    cdroot(currentnode)

    // at the end, write the assembled text to roottext
    for (var filename of Object.keys(roots)) {
        // todo: add don't edit comment like before
        
        // assemble the code
        var [out, _] = assemble(roots[filename], "", filename, 1)
        // printtree(roots[filename])

	// and write it to file
        //debug("write " + filename)
	//debug(out)
	//fs.writeFile(filename, out, (err) => err && console.error(err))
	
	// save the generated text
	roottext[filename] = out
    }
}



// isdeclaration returns true if line is the declaration line of a code chunk
function isdeclaration(line: string) {
    // return line.match(/^<<[^\>]*$/)
    // the line needs start ticks and a wordchar after that
    var startticks = /^``[^`]*\n?$/.test(line)
    var wordchar = /^``.*\w+.*\n?$/.test(line) // why \n needed?
    return startticks && wordchar
}

// isname returns true if line is a referencing name line of a code chunk
function isname(line: string) {
    return /.*``.*``/.test(line) // todo couldbe be ``.+`` or?
}

// isdblticks says if the line consists of two ticks only (not considering programming-language hashtag)
// this could either be a start line of an unnamed chunk or an end line of a chunk
function isdblticks(line: string) {
    var ret = /^``(\s+#\w+)?$/.test(line)
    //debug(line)
    //debug("isdblticks: '" + line + "':" + ret)
    return ret
}


// getname gets the chunkname from a chunk-opening or in-chunk reference
function getname(line: string) {
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
function fromroot(name: string) {
    return /^\/\//.test(name)
}


// node code-chunks are represented as nodes in a tree. """
class Node {
    names;
    cd;
    lines;
    ghostchilds;
    ctlinenr;
    
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
	
	// the ghost children. why more than one?
        this.ghostchilds = []
	
	// for each text line, ctlinenr holds its original line nr in ct file
	this.ctlinenr = {}
	
        // has this node been declared by a colon ':'
        this.hasbeendeclared = false

	// at which line of the parent is the child?
	this.lineinparent = null

	// at these ct lines, there are children { int -> Node }
	this.childatctline = {}
    }
        
    // ls lists the named childs
    ls() {
	var out = []
        // return all except . and ..
	for (var k of Object.keys(this.cd)) {
	    if (k == "." || k == "..") { continue }
	    out.push(k)
	}
	return out
    }
}

var currentnode = null // the node we're currently at
var openghost = null // if the last chunk opened a ghostnode, its this one

    
// put puts text in tree under relative or absolute path
function put(path: string, text: string, ctlinenr: number) {

    //debug("put: " + path)
    //debug("put: " + text)
    
    // create a ghostnode if called for
    if ((path == "." || path == "") && openghost != null) {
        currentnode = openghost

        // we enter the ghost node for the first time here, this implicitly declares it
	currentnode.hasbeendeclared = true
        openghost = null // necessary?
	
    } else {
        // named node (new or append) or ghost node (append)

	
	// if the path would need a node to cling to but there isn't noe
        if (currentnode == null && !fromroot(path)) { 
            console.log("error (line " + ctlinenr + "): there's no file to attach '" + path + "' to, should it start with '//'?")
            process.exit()
	}

        // a colon at the path end indicates that this is a declaration
        var isdeclaration = /:\s*$/.test(path)

        // remove the colon from path
        path = path.replace(/:\s*$/, "")

        // find the node, if not there, create it
        var node = cdmk(currentnode, path, ctlinenr)

        // we'd like to check that a node needs to have been declared with : before text can be appended to it. for that, it doesn't help to check if a node is there, cause it might have already been created as a parent of a node. so we introduce a node.hasbeendeclared property.

        if (isdeclaration && node.hasbeendeclared) {
            console.log("error (line " + ctlinenr + "): chunk " + path + " has already been declared, maybe drop the colon ':'")
            process.exit()
	} else if (!isdeclaration && !node.hasbeendeclared) {
            console.log("error (line " + ctlinenr + "): chunk " + path + " needs to be declared with ':' before text is appended to it")
            process.exit()
	}

        // set that the node has been declared
        if (isdeclaration) {
            node.hasbeendeclared = true
	}

        // all should be well, we can set the node as the current node
        currentnode = node
    }

    // append the text to node
    concatcreatechilds(currentnode, text, ctlinenr)
}


// cdmk walks the path from node and creates nodes if needed along the way.
// it returns the node it ended up at
function cdmk(node: Node, path: string, ctlinenr: number) {

    // if our path is absolute (starting from a root), we can't just jump to the root, because when changing positions in the tree, we need to make sure that ghostnodes are exited properly.  cdone takes care of that, so we go backward node by node with cdone.  cdroot does this recursively.
    if (/^\//.test(path)) {
        // exit open ghost nodes along the way
        node = cdroot(node, ctlinenr)
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
		console.log("error (line " + ctlinenr + "): more than one nodes named " + elem + " in sub-tree of " + pwd(node))
		process.exit()
	    }
	    else if (res.length == 0) {
		console.log("error (line " + ctlinenr +"): no nodes named " + elem + " in sub-tree of " + pwd(node))
		process.exit()
	    }
	    else {
		node = res[0]
	    }
            continue
	}

	// standard:
        // walk one step
        var walk = cdone(node, elem, ctlinenr)
        // if child not there, create it
        if (walk == null) {
            walk = createadd(elem, node)
	}
        node = walk
    }
    // print("put return: " + str(node.name))
    return node // the node we ended up at
}

// concatcreatechilds concatenates text to node and creates children from text (named or ghost)
// this is the only place where text gets added to nodes
function concatcreatechilds(node: Node, text: string, ctlinenr: number) {

    openghost = null // why here? not so clear. but we need to reset it somewhere, that only the direct next code chunk can fill a ghost node

    // replace the last \n so that spli doesn't produce an empty line at the end
    text = text.replace(/\n$/, "")
    var newlines = text.split("\n")

    // map from the line number in node to original line number in ct (get existing line count before new lines are added to node)
    var N = node.lines.length
    for (var i = 0; i < newlines.length; i++) {
	node.ctlinenr[N+i] = ctlinenr + i

	// map from the ct line to the node
	nodeatctline[ctlinenr + i] = node
    }

    //node.text += text
    node.lines.push(...newlines)
    
    for (var i = 0; i < newlines.length; i++) {
        var line = newlines[i]
	if (!isname(line)) { continue }

	// why do we create the children when concating text? maybe because here we know where childs of ghost nodes end up in the tree. """

	// the newly created child
	var child = null 

	var name = getname(line)
	if (name == ".") {// ghost child
            // if we're not at the first ghost chunk here
            if (openghost != null) {
		console.log("error (line " + ctlinenr + i + "): only one ghost child per text chunk allowed")
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

	// at which line of the parent is the child?
	child.lineinparent = i+N

	// at this line, the parent has a child
	node.childatctline[ctlinenr + i] = child
    }
}

// createadd creates a named or ghost node and adds it to its parent
function createadd(name: string, parent: Node) {

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
function lastnamed(node: Node) {
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
function cdone(node: Node, step: string, ctlinenr: number) {
    if (step == GHOST) {
        // we may not walk into a ghost node via path
        console.log("error (line " + ctlinenr + "): don't use string '{GHOST}' in paths")
        process.exit()
    }
    if (step == "") {
        step = "."
    }
    if (step == "..") { // up the tree
        // print(f"call exitghost for {pwd(node)}")
        exitghost(node)
    }
    if (step in node.cd) {
        return node.cd[step]
    }
    return null
}

// cdroot cds back to root. side effect: ghosts are exited
function cdroot(node: Node, ctlinenr: number) {
    if (node == null) { return null }
    if (node.cd[".."] == node) { // we're at a root
        return node
    }
    // continue via the parent
    return cdroot(cdone(node, "..", ctlinenr)) // it's probably not very necessary to pass the ctlinenr here, cause it only check's that the step isn't a '#' that would walk into a ghostnode
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

function assemble(node: Node, shouldspace: string, rootname: string, genlinenr: number) {

    // debug("assemble node " + node.name)

    // if it's a ghost node, remember the last named parent up the tree
    if (node.name == GHOST) {
        var lnp = lastnamed(node)
    }

    //var out = ""
    //var lines = node.text.split("\n")

    /* 
    find out a first line how much this chunk is alredy indented
    and determine how much needs to be filled up
    */
    var alreadyspace
    // leading space already there
    if (node.lines.length > 0) {
	alreadyspace = node.lines[0].match(/^\s*/)[0]
    } else {
	alreadyspace = "" // no line, so no leading space already there
    }
    // space that needs to be added
    var addspace = shouldspace.replace(alreadyspace, "") // replace only the first of alreadyspace

    //debug("shouldspace: '" + shouldspace + "'")
    //debug("alreadyspace: '" + alreadyspace + "'")
    //debug("addspace: '" + addspace + "'")

    // if the rootname isn't in ctlinenr yet, put it there
    if (!(rootname in ctlinenr)) {
	ctlinenr[rootname] = {}
    }

    var out = ""
    var outnew = ""
    var ighost = 0 
    // for (var line of lines) {
    for (var i = 0; i < node.lines.length; i++) {
	var line = node.lines[i]
        if (isname(line)) {

            // remember leading whitespace
            var childshouldspace = line.match(/^\s*/)[0] + addspace
            // print("#getname 1")
	    var name = getname(line)
            if (name == ".") {  // assemble a ghost-child
		//debug("assemble ghost child " + ighost + " for " + node.name)
		var [outnew, linenrnew] = assemble(node.ghostchilds[ighost], childshouldspace, rootname, genlinenr)
		// append the text
		out += outnew
		genlinenr = linenrnew
                ighost += 1
	    } else {            // assemble a name child
	      	var child
                if (node.name == GHOST) {
                    // if at ghost node, we get to the child via the last named parent
		    child = lnp.cd[name]
		} else {
		    child = node.cd[name]
		}
                var [outnew, linenrnew] = assemble(child, childshouldspace, rootname, genlinenr)
		out += outnew
		genlinenr = linenrnew
	    }
	}
	else {  // not name line, normal line
	    // append the line
            out += addspace + line + "\n"

	    // map from the line number in the generated source to the original line number in the ct
	    ctlinenr[rootname][genlinenr] = node.ctlinenr[i]
	    
	    // we added one line to root, so count up
	    genlinenr += 1
	}
    }
    
    return [out, genlinenr]
}




// run main
//main()

