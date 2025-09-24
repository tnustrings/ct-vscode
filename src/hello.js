"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Goodbye = void 0;
exports.hello = hello;
exports.setgoodbye = setgoodbye;
exports.goodbye = goodbye;
function hello() {
    console.log("hello");
}
var goodbyemsg = "";
function setgoodbye(msg) {
    goodbyemsg = msg;
}
function goodbye() {
    console.log(goodbyemsg);
}
var Goodbye = /** @class */ (function () {
    function Goodbye() {
        this._msg = "tschau";
    }
    Goodbye.prototype.tschau = function () {
        console.log(this._msg);
    };
    return Goodbye;
}());
exports.Goodbye = Goodbye;
