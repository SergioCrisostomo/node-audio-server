const elFrom = (tagId, classes = "", parent) => {
  const [tag, id] = tagId.split("#");
  const el = document.createElement(tag);
  if (id) el.id = id;
  classes = (classes || "").split(".").filter(Boolean);
  el.classList.add(...classes);
  parent.appendChild(el);
  return el;
};

const clamp = (min, nr, max) => Math.min(Math.max(nr, min), max);

const PLAY = "play";
const PAUSE = "pause";
const SLIDER_CORRECTION = 4; // just so the circle of the slider gets its center in the edges
const HARD_CODED_PLAYLIST = "192k";

export default class Player {
  constructor(el, options) {
    this.wrapper = el;
    this.audio = elFrom("audio", null, el);
    this.options = options;

    this.manifest = null;
    this.sourceBuffer = null;
    this.mediaSource = null;
    this.loadingChunk = false;

    this.state = PAUSE; // playing || paused
    this.currentTime = 0; // seconds

    this.sliderPointerDown = 0;
    this.sliderWidth = 0;

    this.mount();
  }

  mount() {
    const controlsWrapper = elFrom("div", ".controls-wrapper", this.wrapper);
    this.toggleButton = elFrom("div", ".toggle-button", controlsWrapper);
    this.progressBar = elFrom("div", ".progress-bar", controlsWrapper);
    this.progressSlider = elFrom("div", ".progress-slider", this.progressBar);

    this.toggleButton.addEventListener("click", () => this.onToggle());
    window.addEventListener(
      "keydown",
      (e) => e.code === "Space" && this.onToggle()
    );
    this.toggleButton.textContent = PLAY;
    this.progressSlider.addEventListener("pointerdown", this.onPointerDown);
    this.sliderCoordinates = this.progressBar.getBoundingClientRect();

    this.audio.addEventListener("timeupdate", this.onTimeUpdate);
  }

  mountChunkAvailability = () => {
    [...Array(this.manifest.numberOfChunks)].forEach((_, i) => {
      const el = elFrom("div", ".unloaded-chunk.chunk-state", this.progressBar);
      const chunkWidth =
        (this.manifest.chunkDuration * 100) / (this.manifest.duration / 1000);

      el.style.left = chunkWidth * i + "%";
      el.style.width = chunkWidth + "%";
    });
  };

  onTimeUpdate = (e) => {
    this.currentTime = this.audio.currentTime;

    this.updateSliderPosition();

    this.checkBufferLoad();
  };

  checkBufferLoad = () => {
    if (this.loadingChunk) return;
    const playlist = this.manifest.playlists[HARD_CODED_PLAYLIST];
    const allDataLoaded = playlist.every((chunk) => chunk.data);
    if (allDataLoaded) return;
    const chunkLength = playlist[0].segmentTime;

    const futureNotLoadedChunkIndex = playlist.findIndex((chunk, i) => {
      const chunkstartTime = chunkLength * i;
      return chunkstartTime > this.currentTime && !chunk.data;
    });
    const nearestUnloadedChunkStartTime =
      futureNotLoadedChunkIndex * chunkLength;

    const remainingBufferToUse =
      nearestUnloadedChunkStartTime - this.currentTime;
    const bufferIsTooShort = remainingBufferToUse < Math.max(chunkLength, 5);

    if (bufferIsTooShort) {
      if (
        !this.sourceBuffer.updating &&
        this.mediaSource.readyState === "open"
      ) {
        this.loadChunk(playlist[futureNotLoadedChunkIndex]);
      }
    }
  };

  updateSliderPosition = () => {
    const duration = this.manifest.duration / 1000;
    const position =
      (this.currentTime *
        (this.sliderCoordinates.width +
          SLIDER_CORRECTION +
          SLIDER_CORRECTION)) /
      duration;
    this.progressSlider.style.left = position + "px";
  };

  onChunkLoad = (playlist) => {
    this.loadingChunk = false;
    // calculate chunk width
    const chunkWidth =
      ((this.manifest.duration / this.manifest.chunkDuration) * 100) /
      this.manifest.duration;

    [...this.progressBar.querySelectorAll(".chunk-state")].forEach(
      (el, i, arr) => {
        const chunkIsLoaded = Boolean(playlist[i].data);
        el.classList.toggle("unloaded-chunk", !chunkIsLoaded);
        el.classList.toggle("loaded-chunk", chunkIsLoaded);
      }
    );
  };

  async setPlaylist(manifestUrl) {
    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);

    const fetchManifest = fetch(manifestUrl)
      .then((res) => res.json())
      .then((manifest) => {
        this.manifest = manifest;
        this.mountChunkAvailability();
      })
      .catch((err) => console.log("Error loading manifest", manifestUrl));

    this.mediaSource.addEventListener("sourceopen", async () => {
      URL.revokeObjectURL(this.audio.src);
      const mimeType = "audio/mpeg";
      this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
      await fetchManifest;

      const playlist = this.manifest.playlists[HARD_CODED_PLAYLIST];
      this.loadChunk(playlist.slice().shift());

      this.sourceBuffer.addEventListener("updateend", () => {
        this.onChunkLoad(playlist);
      });
    });
  }

  loadChunk(next) {
    if (!next) return;
    this.loadingChunk = true;

    fetch("/chunk/" + next.name)
      .then((res) => res.arrayBuffer())
      .then((data) => {
        next.data = data;
        this.sourceBuffer.appendBuffer(data);
      });
  }

  onToggle = (force) => {
    this.state = force || (this.state === PAUSE ? PLAY : PAUSE);
    this.toggleButton.textContent = this.state === PAUSE ? PLAY : PAUSE;

    if (this.state === PLAY) this.checkBufferLoad();
    if (this.state === PAUSE && this.audio.paused === true) return;

    this.audio[this.state](); // play|pause
  };

  onPointerDown = (e) => {
    this.onToggle(PAUSE);
    this.sliderPointerDown = e.clientX;
    this.progressSlider.classList.add("dragging");

    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
  };

  onPointerMove = (e) => {
    const sliderPosition = e.clientX - this.sliderCoordinates.left;
    this.progressSlider.style.left =
      clamp(
        -SLIDER_CORRECTION,
        sliderPosition,
        this.sliderCoordinates.right -
          SLIDER_CORRECTION -
          this.sliderPointerDown
      ) + "px";
  };

  onPointerUp = () => {
    const newCurrentTime =
      (parseInt(this.progressSlider.style.left, 10) *
        (this.manifest.duration / 1000)) /
      this.sliderCoordinates.width;

    this.currentTime = newCurrentTime;
    this.audio.currentTime = this.currentTime;

    this.progressSlider.classList.remove("dragging");

    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
  };
}
