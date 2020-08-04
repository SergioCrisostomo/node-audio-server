const spawn = require("./spawn");
const path = require("path");

const encryptFilesBento4 = (files, options) => {
  const { KEY, KID, IV } = options.encryptionKeys;

  const bento4Path = path.join(
    options.dependencyLibrariesPath.bento4Path || "",
    "mp4encrypt"
  );

  const encryptions = files.map((file) => {
    const outputFileName = file.slice(0, -4) + "_encrypted.mp4";
    const args = [
      "--method",
      "MPEG-CENC",
      "--key",
      `1:${KEY}:${IV}`,
      "--property",
      `1:KID:${KID}`,
      ["--global-option", "mpeg-cenc.eme-pssh:true"],
      file,
      outputFileName,
    ]
      .filter(Boolean)
      .flat();

    return spawn([bento4Path, args], false).then(() => outputFileName);
  });

  return Promise.all(encryptions)
  .catch((err) => console.log("Error encrypting files", err));
};

module.exports = encryptFilesBento4;
