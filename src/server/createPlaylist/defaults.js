const digitsInName = 3;
const segmentTime = 30;
const outputFormatExtension = "opus";
const bitrate = "192k"; // 96, 384
const frequencyRate = 48000;

module.exports = {
  // this object could be rewriten with getters so we can change the
  // values but keep the logic
  digitsInName,
  segmentTime,
  outputFormatExtension,
  bitrates: [bitrate],
  frequencyRate,
};
