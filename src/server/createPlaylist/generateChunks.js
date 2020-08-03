const path = require("path");
const fs = require("fs").promises;
const ffmpeg = require("./ffmpeg");
const { digitsInName } = require("./defaults");
const spawn = require("./utils/spawn");
const { KEY, KID, IV } = require("../../../dev/testKeys.json");

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
      KEY,
      "-encryption_kid",
      KID,
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

const encryptFilesBento4 = (files) => {
  // https://stackoverflow.com/questions/45681264/how-to-build-xcode-project-from-the-command-line
  // /Users/sergiocrisostomo/Library/Developer/Xcode/DerivedData/Bento4-cwwmyqadyamwvnfrwnsmlidmtxnm/Build/Products/Debug/mp4encrypt
  // mp4encrypt --method MPEG-CENC --key 1:a0a1a2a3a4a5a6a7a8a9aaabacadaeaf:0123456789abcdef --property 1:KID:121a0fca0f1b475b8910297fa8e0a07e --key 2:a0a1a2a3a4a5a6a7a8a9aaabacadaeaf:aaaaaaaabbbbbbbb --property 2:KID:121a0fca0f1b475b8910297fa8e0a07e hbb_578kbps.mp4 hbb_578kbps-cenc.mp4
  const bento4Path =
    "/Users/sergiocrisostomo/Library/Developer/Xcode/DerivedData/Bento4-cwwmyqadyamwvnfrwnsmlidmtxnm/Build/Products/Debug/mp4encrypt";
  // --key 1:7f412f0575f44f718259beef56ec7771:0a8d9e58502141c3 --property 1:KID:2fef8ad812df429783e9bf6e5e493e53

  const encryptions = files.map((file) => {
    const args = [
      "--method",
      "MPEG-CENC",
      "--key",
      `1:${KEY}:${IV}`,
      "--property",
      `1:KID:${KID}`,
      ["--global-option", "mpeg-cenc.eme-pssh:true"],
      file,
      file.slice(0, -4) + "_encrypted.mp4",
    ]
      .filter(Boolean)
      .flat();

    return spawn([bento4Path, args], false);
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
    .then(encryptFilesBento4);
};
