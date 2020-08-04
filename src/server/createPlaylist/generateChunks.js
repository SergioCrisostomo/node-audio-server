// const encryptFilesFFMPEG = require('./utils/encryptFilesFFMPEG')
const wavToSegmentedWav = require("./utils/wavToSegmentedWav");
const wavSegmentsToMp4 = require("./utils/wavSegmentsToMp4");
const mp4ToFragmentedMp4 = require("./utils/mp4ToFragmentedMp4");
const encryptFilesBento4 = require("./utils/encryptFilesBento4");

module.exports = async function generateChunks(options) {
  // options will always be the second argument...
  const runWithOptions = (fn) => (res) => fn(res, options);

  console.log("Starting file processing pipeline for ", options.inputFileName);
  let pipeline = Promise.resolve()
    .then(runWithOptions(wavToSegmentedWav))
    .then(runWithOptions(wavSegmentsToMp4))
    .then(runWithOptions(mp4ToFragmentedMp4));

  if (options.encryptionKeys) {
    pipeline = pipeline.then(runWithOptions(encryptFilesBento4));
  }

  return pipeline
    .then(() =>
      console.log(
        "Finished file processing pipeline for ",
        options.inputFileName
      )
    )
    .catch((err) =>
      console.log("Pipeline problems... uncaught error inside", err)
    );
};
