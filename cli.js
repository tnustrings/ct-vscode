// try a little cli to test codetext

var ct = require("./out/ct")
var fs = require("fs")

// get ctfile
var ctfile = process.argv[2]

// read ct file
var text = fs.readFileSync(ctfile).toString()

// generate source files
ct.ctwrite(text, ".")


// try go to parent
console.log("go to parent from line 18 (should be 10): " + ct.gotoparent(18)[0])

// try go to child
console.log("go to child from line 9 (should be 32): " + ct.gotochild(9)[0])

                 

// try array
function changea(a) {
    a[0] = 1
}

var b = ["a", "b", "c"]
changea(b)
console.log("b: " + b)
