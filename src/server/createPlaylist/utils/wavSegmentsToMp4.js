const spawn = require("./spawn");

const wavSegmentsToMp4 = (files) => {
  const convertions = files.map((file) => {
    const args = [
      ["-i", file],
      ["-strict", "experimental"],
      file.slice(0, -3) + "mp4",
    ]
      .filter(Boolean)
      .flat();

    return spawn(["ffmpeg", args]);
  });

  return Promise.all(convertions)
    .then(() => {
      return files.map((file) => file.slice(0, -3) + "mp4");
    })
    .catch((err) => console.log("Error converting wavSegmentsToMp4", err));
};

module.exports = wavSegmentsToMp4;
