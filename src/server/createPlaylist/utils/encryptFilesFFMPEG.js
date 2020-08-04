const spawn = require("./spawn");

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
      fragment && ["-frag_duration", "10000"],
      file.slice(0, -4) + "_encrypted.mp4",
    ]
      .filter(Boolean)
      .flat();

    return spawn(["ffmpeg", args], false);
  });

  return Promise.all(encryptions)
    .then(() => {
      return files.map((file) => file.slice(0, -3) + "mp4");
    })
    .catch((err) => console.log("Error encrypting files", err));
};

module.exports = encryptFilesFFMPEG;
