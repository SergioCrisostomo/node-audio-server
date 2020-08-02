const spawn = require("child_process").spawn;

const DEBUG = false;
const BLUE = "\x1b[34m";
const BLACK = "\x1b[30m";
const RED = "\x1b[31m";

module.exports = (args) => {
  return new Promise(function (resolve, rej) {
    if (DEBUG) console.log(BLUE, "ffmpeg", args.join(" "), BLACK);

    const proc = spawn("ffmpeg", args);
    let stderr = "\n\n::::::::::::::::::::::\n";
    proc.stderr.on("data", function (data) {
      stderr += "\n" + data;
    });

    proc.on("error", (err) => rej(err));
    proc.on("close", function () {
      if (DEBUG) console.log("Closing ffmpeg process......");
      stderr += "\n\n::::::::::::::::::::::\n";
      if (DEBUG) console.log(RED, stderr, BLACK);
      resolve();
    });
  }).catch((err) => console.log(err));
};
