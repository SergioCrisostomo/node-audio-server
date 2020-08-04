const path = require("path");
const fs = require("fs").promises;
const spawn = require("./spawn");

const mp4ToFragmentedMp4 = (files) => {
  // framgment files
  const processors = files.map((fileName) => {
    const args = ["-dash", "10000", "-frag", "10000", "-rap", fileName];
    return spawn(["MP4Box", args, { cwd: path.dirname(fileName) }], false);
  });
  return Promise.all(processors)
    .then(() => {
      // rename files since I'm not sure how to instruct MP4Box the output file name
      const renames = files.map((fileName) => {
        const [name, ext] = fileName.split(".");
        const dashName = `${name}_dashinit.${ext}`;
        return fs.rename(dashName, fileName);
      });

      return Promise.all(renames)
        .catch((err) => console.log("Error renaming back files", err))
        .then(() => files);
    })
    .catch((err) => console.log("Error using mp4ToFragmentedMp4", err));
};

module.exports = mp4ToFragmentedMp4;
