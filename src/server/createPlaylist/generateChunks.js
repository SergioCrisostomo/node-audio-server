// const encryptFilesFFMPEG = require('./utils/encryptFilesFFMPEG')
const wavToSegmentedWav = require("./utils/wavToSegmentedWav");
const wavSegmentsToMp4 = require("./utils/wavSegmentsToMp4");
const mp4ToFragmentedMp4 = require("./utils/mp4ToFragmentedMp4");
const encryptFilesBento4 = require("./utils/encryptFilesBento4");

module.exports = async function generateChunks(options) {
  // options will always be the second argument...
  const runWithOptions = (fn) => (res) => fn(res, options);

  return Promise.resolve()
    .then(runWithOptions(wavToSegmentedWav))
    .then(runWithOptions(wavSegmentsToMp4))
    .then(runWithOptions(mp4ToFragmentedMp4))
    .then(runWithOptions(encryptFilesBento4));
};
