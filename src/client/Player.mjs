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

export default class Player {
  constructor(el, options) {
    this.wrapper = el;
    this.audio = elFrom("audio", null, el);
    this.options = options;
    this.manifest = null;
    this.loadingChunks = [];
    this.sourceBuffer = null;
    this.state = PAUSE; // playing || paused
    this.currentTime = 0; // seconds

    this.sliderPointerDown = 0;
    this.sliderWidth = 0;

    this.mount();
  }

  mount() {
    const controlsWrapper = elFrom("div", ".controls-wrapper", this.wrapper);
    this.toggleButton = elFrom("div", ".toggle-button", controlsWrapper);
    const progressBar = elFrom("div", ".progress-bar", controlsWrapper);
    this.progressSlider = elFrom("div", ".progress-slider", progressBar);

    this.toggleButton.addEventListener("click", () => this.onToggle());
    window.addEventListener(
      "keydown",
      (e) => e.code === "Space" && this.onToggle()
    );
    this.toggleButton.textContent = PLAY;
    this.progressSlider.addEventListener("pointerdown", this.onPointerDown);
    this.sliderCoordinates = progressBar.getBoundingClientRect();

    this.audio.addEventListener("timeupdate", (e) => {
      this.currentTime = this.audio.currentTime;
      const duration = this.manifest.duration / 1000;
      const position =
        (this.currentTime *
          (this.sliderCoordinates.width +
            SLIDER_CORRECTION +
            SLIDER_CORRECTION)) /
        duration;
      this.progressSlider.style.left = position + "px";
    });
  }

  async setPlaylist(manifestUrl) {
    this.loadingChunks = [];
    const mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(mediaSource);

    const fetchManifest = fetch(manifestUrl)
      .then((res) => res.json())
      .then((manifest) => (this.manifest = manifest))
      .catch((err) => console.log("Error loading manifest", manifestUrl));

    mediaSource.addEventListener("sourceopen", async () => {
      URL.revokeObjectURL(this.audio.src);
      const mimeType = "audio/mpeg";
      this.sourceBuffer = mediaSource.addSourceBuffer(mimeType);
      await fetchManifest;

      const playlist = this.manifest.playlists["192k"]; // TODO: hard coded for now
      this.loadingChunks = playlist.slice();
      this.loadChunk(this.loadingChunks.shift());

      this.sourceBuffer.addEventListener("updateend", () => {
        if (!this.sourceBuffer.updating && mediaSource.readyState === "open") {
          this.loadChunk(this.loadingChunks.shift());
        }
      });
    });
  }

  loadChunk(next) {
    if (!next) return;

    fetch("/chunk/" + next.name)
      .then((res) => res.arrayBuffer())
      .then((data) => {
        next.data = data;
        this.sourceBuffer.appendBuffer(data);
      });
  }

  onToggle = (force) => {
    this.state = force || (this.state === PAUSE ? PLAY : PAUSE);
    this.toggleButton.textContent = this.state !== PAUSE ? PLAY : PAUSE;

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
