const spawn = require("child_process").spawn;
const path = require("path");
const defaults = require("./defaults");

const DEBUG = false;

module.exports = async function generateChunks({
  segmentTime,
  numberOfChannels,
  frequencyRate,
  inputFileName,
  outputBaseName,
  outputFormatExtension,
  bitrate,
  codec,
}) {
  const outputFileName = `${outputBaseName}_%0${defaults.digitsInName}d.${outputFormatExtension}`;
  const args = [
    ["-i", inputFileName],
    "-vn",
    ["-ar", frequencyRate],
    ["-ac", numberOfChannels],
    bitrate ? ["-b:a", bitrate] : null,
    codec === "opus" ? ["-c:a", "libopus"] : null,
    ["-f", "segment"],
    ["-segment_time", segmentTime],
    outputFileName,
  ]
    .filter(Boolean)
    .flat();

  if (DEBUG) console.log("Running:", "ffmpeg", args.join(" "));

  return new Promise(function (resolve, rej) {
    const proc = spawn("ffmpeg", args);
    proc.on("error", (err) => rej(err));
    proc.on("close", function () {
      if (DEBUG) console.log("Closing......");
      resolve();
    });
  });
};
