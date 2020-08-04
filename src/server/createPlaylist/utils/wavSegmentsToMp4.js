const fs = require("fs").promises;
const path = require("path");
const spawn = require("./spawn");

const { digitsInName } = require("../defaults");

const wavSegmentsToMp4 = (files, options) => {
  const { bitrate } = options;
  const convertions = files.map((file) => {
    const basename = file.slice(0, -4); // remove ".wav"
    const filename = basename.slice(0, -4); // remove segment index "_\d\d\d"
    const segmentIndex = basename.slice(-digitsInName); // extract segment index
    const outputFileName = `${filename}_${bitrate}_${segmentIndex}.mp4`;
    const args = [
      ["-i", file],
      bitrate ? ["-b:a", bitrate] : null,
      ["-strict", "experimental"],
      outputFileName,
    ]
      .filter(Boolean)
      .flat();

    return spawn(["ffmpeg", args])
      .then(() => fs.unlink(file))
      .then(() => outputFileName);
  });

  return Promise.all(convertions).catch((err) =>
    console.log("Error converting wavSegmentsToMp4", err)
  );
};

module.exports = wavSegmentsToMp4;
