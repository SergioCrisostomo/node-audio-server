const spawn = require("child_process").spawn;

const DEBUG = false;
const BLUE = "\x1b[34m";
const BLACK = "\x1b[30m";
const RED = "\x1b[31m";

module.exports = (spawnArguments, debug) => {
  return new Promise(function (resolve, rej) {
    const [cmd, args, options = {}] = spawnArguments;
    if (DEBUG || debug) console.log(BLUE, cmd, args.join(" "), BLACK);

    const proc = spawn(cmd, args, options);
    let stderr = "\n::::::::::::::::::::::\n";
    proc.stderr.on("data", function (data) {
      stderr += "\n" + data;
    });

    proc.on("error", (err) => rej(err));
    proc.on("close", function () {
      if (DEBUG || debug) console.log(`Closing ${cmd} process......`);
      stderr += "\n\n::::::::::::::::::::::\n";
      if (DEBUG || debug) console.log(RED, stderr, BLACK);
      resolve();
    });
  }).catch((err) => console.log(err));
};
