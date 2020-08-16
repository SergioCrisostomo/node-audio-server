const fs = require("fs").promises;
const path = require("path");
const spawn = require("./spawn");

const { digitsInName } = require("../defaults");

const wavToMp4 = (_, options) => {
  const outputFileName = `${options.outputBaseName}_${options.bitrate}.mp4`;

  const args = [
    ["-i", options.inputFileName],
    ["-ar", options.frequencyRate],
    ["-ac", options.numberOfChannels],
    options.bitrate ? ["-b:a", options.bitrate] : null,
    ["-strict", "experimental"],
    outputFileName,
  ]
    .filter(Boolean)
    .flat();

  return spawn(["ffmpeg", args]).then(() => outputFileName);
};

module.exports = wavToMp4;
