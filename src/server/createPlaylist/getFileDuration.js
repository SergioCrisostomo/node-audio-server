const spawn = require("child_process").spawn;

module.exports = async function getFileDuration(file) {
  const args = `-i ${file} -show_entries format=duration`.split(" ");

  return new Promise((res, rej) => {
    const proc = spawn("ffprobe", args);
    let duration = null;

    proc.stdout.setEncoding("utf8");

    proc.stdout.on("data", function (data) {
      if (data.indexOf("duration") !== 0) {
        const [, durationString = 0] = data.match(/duration=([\d\.]+)/);
        duration = Number(durationString);
      }
    });

    proc.on("error", (err) => rej(err));
    proc.on("close", () => res(duration));
  }).catch((err) => console.log(":::::", err));
};
