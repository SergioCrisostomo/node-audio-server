const spawn = require("child_process").spawn;
const path = require("path");
const { digitsInName } = require("./defaults");

const DEBUG = false;
const BLUE = "\x1b[34m";
const BLACK = "\x1b[30m";
const RED = "\x1b[31m";

module.exports = async function generateChunks({
  segmentTime,
  numberOfChannels,
  frequencyRate,
  inputFileName,
  outputBaseName,
  extension,
  bitrate,
  codec,
}) {
  const outputFileName = `${outputBaseName}_${bitrate}_%0${digitsInName}d.${extension}`;
  const codecs = {
    mp3: [],
    opus: ["-c:a", "libopus"],
    flac: null,
  };
  const args = [
    ["-i", inputFileName],
    "-vn",
    ["-ar", frequencyRate],
    ["-ac", numberOfChannels],
    bitrate ? ["-b:a", bitrate] : null,
    codecs[codec],
    ["-f", "segment"],
    ["-segment_time", segmentTime],
    outputFileName,
  ]
    .filter(Boolean)
    .flat();

  if (DEBUG) console.log(BLUE, "Running:", "ffmpeg", args.join(" "), BLACK);

  return new Promise(function (resolve, rej) {
    const proc = spawn("ffmpeg", args);
    let stderr = "\n\n::::::::::::::::::::::\n";
    proc.stderr.on("data", function (data) {
      stderr += "\n" + data;
    });

    proc.on("error", (err) => rej(err));
    proc.on("close", function () {
      if (DEBUG) console.log("Closing......");
      stderr += "\n\n::::::::::::::::::::::\n";
      if (DEBUG) console.log(RED, stderr, BLACK);
      resolve();
    });
  }).catch((err) => console.log(err));
};
