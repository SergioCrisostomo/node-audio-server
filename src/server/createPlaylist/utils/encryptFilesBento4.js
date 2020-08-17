const path = require("path");
const fs = require("fs").promises;
const spawn = require("./spawn");

const encryptFilesBento4 = (files, options) => {
  const bento4Path = path.join(
    options.dependencyLibrariesPath.bento4Path || "",
    "mp4encrypt"
  );

  const encryptions = files.map((file, i, arr) => {
    const { KEY, KID, IV } = options.encryptionKeys(
      options.inputFileName,
      i + 1,
      arr.length
    );

    const outputFileName = file.slice(0, -4) + "_cenc.mp4";
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

    return spawn([bento4Path, args], false)
      .then(() => fs.unlink(file))
      .then(() => outputFileName);
  });

  return Promise.all(encryptions).catch((err) =>
    console.log("Error encrypting files", err)
  );
};

module.exports = encryptFilesBento4;
