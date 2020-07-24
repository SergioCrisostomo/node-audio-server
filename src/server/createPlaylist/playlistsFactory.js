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
  duration,
}) =>
  [...Array(numberOfChunks)].map((_, i) => {
    const name = (() => {
      const chunkBaseName = path.basename(outputBaseName);
      const index = ("0".repeat(digitsInName) + i).slice(-digitsInName);
      return `${chunkBaseName}_${bitrate}_${index}.${extension}`;
    })();

    return {
      name,
      bitrate,
      duration,
    };
  });

// ffmpeg -i input.wav -vn -ar 44100 -ac 2 -b:a 192k output.mp3
module.exports = async function generatePlayLists(config) {
  const {
    segmentTime,
    inputFileName,
    numberOfChannels,
    outputBaseName,
    bitrates,
  } = config;

  const decimalDuration = await getFileDuration(inputFileName);
  const duration = Math.floor(decimalDuration * 1000); // rounded to ms

  const numberOfChunks = Math.ceil(duration / 1000 / segmentTime);

  const manifest = {
    name: path.basename(inputFileName),
    duration,
    playlists: {},
  };

  const generators = bitrates.map((bitrateSettings) => {
    const opusBitrateSettings = {
      ...config,
      ...bitrateSettings,
      numberOfChannels,
    };
    // console.log("Would process", bitrate, settings);

    manifest.playlists[bitrateSettings.bitrate] = makePlaylist({
      ...bitrateSettings,
      duration,
      numberOfChunks,
      outputBaseName,
    });
    return generateChunks(opusBitrateSettings);
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
