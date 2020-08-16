const spawn = require("./spawn");
const { digitsInName } = require("../defaults");

const mp4ToSegmentedMp4 = (inputPath, options) => {
  const inputBasename = inputPath.slice(0, -4);
  const { segmentTime, duration } = options;

  const segmentIndex = segmentTime !== Infinity ? `%0${digitsInName}d` : "000";
  const outputFileName = `${inputBasename}_${segmentIndex}.mp4`;

  const args = [
    ["-i", inputPath],
    ["-c", "copy"],
    segmentTime !== Infinity && ["-f", "segment", "-segment_time", segmentTime],
    outputFileName,
  ]
    .filter(Boolean)
    .flat();

  return spawn(["ffmpeg", args])
    .then(() => {
      return [...Array(options.numberOfChunks)].map(
        (_, i) => `${inputBasename}_${("00" + i).slice(-3)}.mp4`
      );
    })
    .catch((err) => console.log("Error segmenting mp4 files", err));
};

module.exports = mp4ToSegmentedMp4;
