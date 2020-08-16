const path = require("path");
const fs = require("fs").promises;
const spawn = require("child_process").spawn;
const getFileDuration = require("./getFileDuration");
const generateChunks = require("./generateChunks");

const { digitsInName } = require("./defaults");

const DEBUG = false;

const makePlaylist = ({
  extension,
  bitrate,
  numberOfChunks,
  outputBaseName,
  segmentTime,
  encryptionKeys,
}) =>
  [...Array(numberOfChunks)].map((_, i) => {
    const name = (() => {
      const chunkBaseName = path.basename(outputBaseName);
      const index =
        segmentTime !== Infinity
          ? ("0".repeat(digitsInName) + i).slice(-digitsInName)
          : "000";
      const encryptionTag = encryptionKeys ? "_cenc" : "";
      const outputFileName = `${chunkBaseName}_${bitrate}_${index}${encryptionTag}.${extension}`;
      return outputFileName;
    })();

    return {
      name,
      bitrate,
      segmentTime,
      chunkIndex: i,
      data: null, // can be added in client
    };
  });

// ffmpeg -i input.wav -vn -ar 44100 -ac 2 -b:a 192k output.mp3
module.exports = async function generatePlayLists(config) {
  const {
    segmentTime,
    inputFileName,
    numberOfChannels,
    outputBaseName,
  } = config;

  const decimalDuration = await getFileDuration(inputFileName);
  const duration = Math.floor(decimalDuration * 1000); // rounded to ms
  const numberOfChunks =
    segmentTime === Infinity ? 1 : Math.ceil(duration / 1000 / segmentTime);

  const options = {
    ...config,
    duration,
    numberOfChunks,
  };

  const manifest = {
    name: path.basename(inputFileName),
    chunkDuration: segmentTime === Infinity ? duration : segmentTime,
    numberOfChunks,
    duration,
    urlRoot: options.urlRoot,
    playlists: {},
  };
  if (options.meta) {
    manifest.meta = options.meta;
  }

  const generators = options.bitrates.map((bitrateSettings) => {
    const settings = {
      ...options,
      ...bitrateSettings,
    };

    manifest.playlists[bitrateSettings.bitrate] = makePlaylist(settings);

    return generateChunks(settings);
  });

  if (DEBUG) {
    console.log(manifest);
    console.log("Manifest output path: ", outputBaseName + ".json");
  }

  return Promise.all(generators)
    .then(() => {
      if (DEBUG) {
        console.log(
          "Saving manifest file for ",
          outputBaseName + ".json",
          manifest
        );
      }

      return fs.writeFile(
        outputBaseName + ".json",
        JSON.stringify(manifest, null, 4)
      );
    })
    .catch((err) => console.log("::: Error generating bitrate chunks", err));
};
