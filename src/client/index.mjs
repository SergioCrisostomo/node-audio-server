const buttonsWrapper = document.getElementById("buttons");
const info = document.getElementById("info");

let isControledStop = false;

const chunks = fetch("/media/long_input_44100.wav")
  .then((res) => res.json())
  .then((manifest) => {
    const chunks = manifest.playlists["flac"];
    const audioContexts = [...Array(chunks.length)];

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const updateInfo = () => {
      const playingChunk = audioContexts.findIndex(({ playing }) => playing);
      info.innerHTML =
        playingChunk > -1 ? "Playing chunk " + playingChunk : "Stopped";
    };
    const setSource = (index, buffer) => {
      const source = audioCtx.createBufferSource();
      source.connect(audioCtx.destination);
      const oldSource = audioContexts[index];
      if (oldSource && oldSource.playing) {
        oldSource.source.stop();
      }
      const oldBuffer = oldSource && oldSource.source.buffer;
      if (buffer || oldBuffer) source.buffer = buffer || oldBuffer;

      source.onended = () => {
        audioContexts[index].playing = false;

        const nextChunk = !isControledStop && audioContexts[index + 1];

        if (nextChunk && nextChunk.source.buffer) {
          nextChunk.source.start();
          nextChunk.playing = true;
          setSource(index);
        }

        isControledStop = false;
        updateInfo();
      };

      audioContexts[index] = {
        playing: false,
        source,
      };
    };

    /*

    */

    chunks.forEach((url, i) => {
      const flacChunk = "/chunk/" + url.split("/").pop();

      setSource(i);

      const btn = document.createElement("button");
      btn.style.margin = "5px";
      btn.innerHTML = "Play chunk " + i;
      btn.dataset.src = flacChunk;

      fetch(flacChunk)
        .then(function (response) {
          return response.arrayBuffer();
        })
        .then((audioData) => {
          const buffer = audioData.buffer;

          audioCtx.decodeAudioData(audioData, function (buffer) {
            audioContexts[i].source.buffer = buffer;
          });
        });

      btn.addEventListener("click", () => {
        isControledStop = true;
        audioContexts.forEach((node, j) => {
          if (node.playing) setSource(j);
        });
        audioContexts[i].source.start();
        audioContexts[i].playing = true;
        updateInfo();
      });
      buttonsWrapper.appendChild(btn);
    });
  });
