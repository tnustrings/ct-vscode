export function hello() {
  console.log("hello")
}

var goodbyemsg = ""

export function setgoodbye(msg: string) {
  goodbyemsg = msg
}

export function goodbye() {
  console.log(goodbyemsg)
}

export class Goodbye {

  _msg = "tschau"
  
  tschau() {
    console.log(this._msg)
  }
}
