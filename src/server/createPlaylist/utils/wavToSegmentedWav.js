const spawn = require("./spawn");
const { digitsInName } = require("../defaults");

const wavToSegmentedWav = (_, options) => {
  const { segmentTime, outputBaseName, duration } = options;

  const segmentIndex = segmentTime !== Infinity ? `%0${digitsInName}d` : "000";
  const outputFileName = `${outputBaseName}_${segmentIndex}.wav`;

  const args = [
    ["-i", options.inputFileName],
    ["-ar", options.frequencyRate],
    ["-ac", options.numberOfChannels],
    segmentTime !== Infinity && ["-f", "segment", "-segment_time", segmentTime],
    outputFileName,
  ]
    .filter(Boolean)
    .flat();

  return spawn(["ffmpeg", args])
    .then(() => {
      return [...Array(options.numberOfChunks)].map(
        (_, i) => `${outputBaseName}_${("00" + i).slice(-3)}.wav`
      );
    })
    .catch((err) => console.log("Error segmenting wav files", err));
};

module.exports = wavToSegmentedWav;
