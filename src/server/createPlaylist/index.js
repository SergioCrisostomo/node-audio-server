const path = require("path");
const fs = require("fs").promises;
const getFiles = require("../utils/getFiles");
const WaveFile = require("wavefile").WaveFile;
const playlistsFactory = require("./playlistsFactory");
const { digitsInName, segmentTime, frequencyRate } = require("./defaults");

const DEBUG = false;

const requiredOptions = ["inputPath", "targetPath", "bitrates"];

module.exports = async (options = {}) => {
  for (const option of requiredOptions) {
    if (typeof options[option] === "undefined") {
      console.error("Missing option ", option);
      return;
    }
  }

  const { inputPath, targetPath } = options;

  const wavFiles = await getFiles(inputPath, "wav");

  const generators = wavFiles.map(async (inputFileName) => {
    if (DEBUG) console.log(inputFileName);
    const waveFile = await fs.readFile(inputFileName);
    const wav = new WaveFile(waveFile);
    const numberOfChannels = wav.fmt.numChannels;

    const outputBaseName = path.join(
      targetPath,
      path.basename(inputFileName).slice(0, -path.extname(inputFileName).length)
    );

    const config = {
      segmentTime,
      numberOfChannels,
      frequencyRate,
      inputFileName,
      outputBaseName,
      ...options,
    };
    return await playlistsFactory(config);
  });
  return Promise.all(generators).catch((err) =>
    console.error("::: Error creating generators", err)
  );
};
