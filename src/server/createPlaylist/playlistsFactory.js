const path = require("path");
const fs = require("fs").promises;
const spawn = require("child_process").spawn;
const getFileDuration = require("./getFileDuration");
const generateChunks = require("./generateChunks");

const defaults = require("./defaults");

const FLAC = "flac";
const DEBUG = false;

const chunkNames = (codec, numberOfChunks, outputBaseName) =>
  [...Array(numberOfChunks)].map((_, i) => {
    const index = ("0".repeat(defaults.digitsInName) + i).slice(
      -defaults.digitsInName
    );
    return `${outputBaseName}_${index}.${codec}`;
  });

// ffmpeg -i somefile.mp3 -f segment -segment_time 3 -c copy out%03d.mp3
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
    playlists: {
      flac: chunkNames(FLAC, numberOfChunks, outputBaseName),
    },
  };

  const flacSettings = {
    ...config,
    numberOfChannels,
    outputFormatExtension: FLAC,
  };
  if (DEBUG) console.log("Would process", bitrate, settings);

  await generateChunks(flacSettings);

  const generators = bitrates.map((bitrate) => {
    const opusBitrateSettings = {
      ...config,
      bitrate,
      codec: "opus",
      numberOfChannels,
      outputFormatExtension: defaults.outputFormatExtension,
    };
    // console.log("Would process", bitrate, settings);

    manifest.playlists[bitrate] = chunkNames(
      defaults.outputFormatExtension,
      numberOfChunks,
      outputBaseName
    );
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
