const path = require("path");
const fs = require("fs").promises;
const spawn = require("./spawn");

const mp4ToFragmentedMp4 = async (files) => {
  // framgment files
  await Promise.all(
    files.map((fileName) => {
      const args = ["-dash", "10000", "-frag", "10000", "-rap", fileName];
      return spawn(["MP4Box", args, { cwd: path.dirname(fileName) }], false);
    })
  ).catch((err) => console.log("Error using MP4Box on", fileName, err));

  // rename files since MP4Box cannot re-write same file name
  await Promise.all(
    files.map((fileName) => {
      const [name, ext] = fileName.split(".");
      const dashName = `${name}_dashinit.${ext}`;
      return fs.rename(dashName, fileName);
    })
  ).catch((err) => console.log("Error renaming back files", err));

  // delete extra dash .mpd files
  await Promise.all(
    files.map((fileName) => {
      const [name] = fileName.split(".");
      const dashMpd = `${name}_dash.mpd`;
      return fs.unlink(dashMpd);
    })
  ).catch((err) => console.log("Error deleting .mpd files", err));

  return files;
};

module.exports = mp4ToFragmentedMp4;
