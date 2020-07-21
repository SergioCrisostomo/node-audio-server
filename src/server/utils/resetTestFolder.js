const fs = require("fs").promises;
const path = require("path");

const testPath = "../createPlaylist/test/";
const { OUTPUT_MEDIA_FOLDER } = require(testPath + "config");
const DEBUG = false;

module.exports = async () => {
  if (DEBUG) console.log("RESETING TEST FOLDER");
  const dir = path.join(__dirname, testPath, "/media/", OUTPUT_MEDIA_FOLDER);
  await fs.rmdir(dir, { recursive: true });
  return await fs.mkdir(dir);
};
