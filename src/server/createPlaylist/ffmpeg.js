const spawn = require("./utils/spawn");

module.exports = (args, debug) => {
  return spawn(["ffmpeg", args], debug);
};
