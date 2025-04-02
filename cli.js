// try a little cli to test codetext

var ct = require("./src/codetext")
var fs = require("fs")

// get ctfile
var ctfile = process.argv[2]

// read ct file
var text = fs.readFileSync(ctfile).toString()

// generate source files
ct.ctwrite(text, ".")


                 
