const path = require("path");
const fs = require("fs").promises;
const ffmpeg = require("./ffmpeg");
const { digitsInName } = require("./defaults");
const spawn = require("./utils/spawn");

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
      return [...Array(options.numberOfChunks)].map(
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

const mp4ToFragmentedMp4 = (files) => {
  // framgment files
  const processors = files.map((fileName) => {
    const args = ["-dash", "10000", "-frag", "10000", "-rap", fileName];
    return spawn(["MP4Box", args, { cwd: path.dirname(fileName) }], false);
  });
  return Promise.all(processors)
    .then(() => files)
    .catch((err) => console.log("Error using mp4ToFragmentedMp4", err));
};

const encryptFilesFFMPEG = (files) => {
  const encryptions = files.map((file) => {
    const fragment = true;
    const args = [
      "-y",
      "-i",
      file,
      "-encryption_scheme",
      "cenc-aes-ctr",
      "-encryption_key",
      "76a6c65c5ea762046bd749a2e632ccbb",
      "-encryption_kid",
      "a7e61c373e219033c21091fa607bf3b8",
      //["-f", "mp4"],
      fragment && [/*"-movflags", "dash", */ "-frag_duration", "10000"], // -movflags dash
      file.slice(0, -4) + "_encrypted.mp4",
    ]
      .filter(Boolean)
      .flat();

    return ffmpeg(args, true);
  });

  return Promise.all(encryptions)
    .then(() => {
      return files.map((file) => file.slice(0, -3) + "mp4");
    })
    .catch((err) => console.log("Error encrypting files", err));
};

module.exports = async function generateChunks(options) {
  const { segmentTime, outputBaseName, extension, bitrate, codec } = options;

  const segmentIndex = segmentTime !== Infinity ? `%0${digitsInName}d` : "000";
  const outputFileName = `${outputBaseName}_${bitrate}_${segmentIndex}.${extension}`;

  return wavToSegmentedWav(options)
    .then(wavSegmentsToMp4)
    .then(mp4ToFragmentedMp4)
    .then((files) => {
      // rename files
      const renames = files.map((fileName) => {
        const [name, ext] = fileName.split(".");
        const dashName = `${name}_dashinit.${ext}`;
        return fs.rename(dashName, fileName);
      });

      return Promise.all(renames)
        .catch((err) => console.log("Error renaming back files", err))
        .then(() => files);
    })
    .then(encryptFilesFFMPEG);
};
