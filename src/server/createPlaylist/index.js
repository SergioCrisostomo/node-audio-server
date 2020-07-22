const path = require("path");
const fs = require("fs").promises;
const getFiles = require("../utils/getFiles");
const WaveFile = require("wavefile").WaveFile;
const playlistsFactory = require("./playlistsFactory");
const defaults = require("./defaults");

const DEBUG = false;

module.exports = async (originPath, targetPath, options = {}) => {
  const wavFiles = await getFiles(originPath, "wav");

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
      segmentTime: defaults.segmentTime,
      numberOfChannels,
      frequencyRate: defaults.frequencyRate,
      inputFileName,
      outputBaseName,
      bitrates: defaults.bitrates,
      ...options,
    };
    return await playlistsFactory(config);
  });
  return Promise.all(generators).catch((err) =>
    console.error("::: Error creating generators", err)
  );
};
