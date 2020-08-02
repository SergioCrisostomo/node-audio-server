const path = require("path");
const fs = require("fs").promises;
const ffmpeg = require("./ffmpeg");
const { digitsInName } = require("./defaults");
const spawn = require("child_process").spawn;

const DEBUG = false;
const BLUE = "\x1b[34m";
const BLACK = "\x1b[30m";
const RED = "\x1b[31m";

const codecs = {
  mp3: null,
  opus: ["-c:a", "libopus"],
  flac: null,
  mp4: ["-c:a", "aac"],
  copy: null,
};

/*
PIPE:::
 - wav to multiple wav
 - each wav to mp4
*/

const wavToSegmentedWav = (options) => {
  const { segmentTime, outputBaseName, duration } = options;

  const segmentIndex = segmentTime !== Infinity ? `%0${digitsInName}d` : "000";
  const outputFileName = `${outputBaseName}_${segmentIndex}.wav`;

  const args = [
    ["-i", options.inputFileName],
    ["-ar", options.frequencyRate],
    ["-ac", options.numberOfChannels],
    codecs.copy,
    segmentTime !== Infinity && ["-f", "segment", "-segment_time", segmentTime],
    outputFileName,
  ]
    .filter(Boolean)
    .flat();

  return ffmpeg(args)
    .then(() => {
      const nrOfChunks = Math.ceil(duration / 1000 / segmentTime);

      return [...Array(nrOfChunks)].map(
        (_, i) => `${outputBaseName}_${("00" + i).slice(-3)}.wav`
      );
    })
    .catch((err) => console.log("Error segmenting wav files", err));
};

const wavSegmentsToMp4 = (files) => {
  const convertions = files.map((file) => {
    const args = [
      ["-i", file],
      ["-strict", "experimental"],
      file.slice(0, -3) + "mp4",
    ]
      .filter(Boolean)
      .flat();

    return ffmpeg(args);
  });

  return Promise.all(convertions)
    .then(() => {
      return files.map((file) => file.slice(0, -3) + "mp4");
    })
    .catch((err) => console.log("Error converting wavSegmentsToMp4", err));
};

const mp4ToFragmentedMp4 = (fileName) => {
  console.log("fileName", fileName);
  return new Promise(function (resolve, rej) {
    const args = ["-dash", "10000", "-frag", "10000", "-rap", fileName];
    console.log(BLUE, "MP4Box", args.join(" "), BLACK);

    const proc = spawn("MP4Box", args, { cwd: path.dirname(fileName) });
    let stderr = "\n::::::::::::::::::::::\n";
    proc.stderr.on("data", function (data) {
      stderr += "\n" + data;
    });

    proc.on("error", (err) => rej(err));
    proc.on("close", function () {
      if (DEBUG) console.log("Closing MP4Box process......");
      stderr += "\n\n::::::::::::::::::::::\n";
      if (DEBUG) console.log(RED, stderr, BLACK);
      resolve();
    });
  }).catch((err) => console.log(err));
};

module.exports = async function generateChunks(options) {
  const { segmentTime, outputBaseName, extension, bitrate, codec } = options;

  const segmentIndex = segmentTime !== Infinity ? `%0${digitsInName}d` : "000";
  const outputFileName = `${outputBaseName}_${bitrate}_${segmentIndex}.${extension}`;

  return wavToSegmentedWav(options)
    .then(wavSegmentsToMp4)
    .then((files) => {
      // framgment files
      const processors = files.map(mp4ToFragmentedMp4);
      return Promise.all(processors)
        .then(() => files)
        .catch((err) => console.log("Error using mp4ToFragmentedMp4", err));
    })
    .then((files) => {
      // rename files
      const renames = files.map((fileName) => {
        const [name, ext] = fileName.split(".");
        const dashName = `${name}_dashinit.${ext}`;
        return fs.rename(dashName, fileName);
      });

      return Promise.all(renames).catch((err) =>
        console.log("Error renaming back files", err)
      );
    });
};
