const buttonsWrapper = document.getElementById("buttons");
const info = document.getElementById("info");
const audio = document.querySelector("audio");

const mimeType = "audio/mpeg";
if (MediaSource.isTypeSupported(mimeType)) {
  const mediaSource = new MediaSource();
  audio.src = URL.createObjectURL(mediaSource);

  mediaSource.addEventListener("sourceopen", async function () {
    URL.revokeObjectURL(audio.src);

    const sourceBuffer = mediaSource.addSourceBuffer(mimeType);

    const manifest = await fetch("/media/long_input_44100.wav").then((res) =>
      res.json()
    );
    const flacChunks = manifest.playlists.flac;
    let count = 0;

    sourceBuffer.addEventListener("updateend", function () {
      count++;
      if (!sourceBuffer.updating && mediaSource.readyState === "open") {
        addChunk(flacChunks.shift());
      }
    });
    const addChunk = (next) => {
      if (!next) return;

      fetch("/chunk/" + next)
        .then((res) => res.arrayBuffer())
        .then((data) => {
          sourceBuffer.appendBuffer(data);
        });
    };

    addChunk(flacChunks.shift());
  });
} else {
  console.log("codec is not supported on this platform.");
}
