const mp4ToFragmentedMp4 = require("./utils/mp4ToFragmentedMp4");
const wavToMp4 = require("./utils/wavToMp4");
const mp4ToSegmentedMp4 = require("./utils/mp4ToSegmentedMp4");
const encryptFilesBento4 = require("./utils/encryptFilesBento4");

const DEBUG = false;

module.exports = async function generateChunks(options) {
  const { inputFileName, encryptionKeys } = options;

  // options will always be the second argument...
  const runWithOptions = (fn, step) => (res) => {
    if (DEBUG) console.log(step, "for", options.inputFileName, "started");
    return fn(res, options)
      .then((res) => {
        if (DEBUG) console.log(step, "for", options.inputFileName, "complete");
        return res;
      })
      .catch((err) => {
        console.log(step, "failed with", err);
        throw new Error(err);
      });
  };

  if (DEBUG) {
    console.log("Starting file processing pipeline for ", inputFileName);
  }

  return Promise.resolve()
    .then(runWithOptions(wavToMp4, "Wave to mp4 convertion"))
    .then(runWithOptions(mp4ToSegmentedMp4, "mp4 split into segments"))
    .then(runWithOptions(mp4ToFragmentedMp4, "mp4 to fragmented mp4"))
    .then(
      encryptionKeys
        ? runWithOptions(encryptFilesBento4, "cenc encryption")
        : () => {}
    )
    .then(() => {
      if (DEBUG) {
        console.log("Finished file processing pipeline for ", inputFileName);
      }
    })
    .catch((err) =>
      console.log("Pipeline problems... uncaught error inside", err)
    );
};
