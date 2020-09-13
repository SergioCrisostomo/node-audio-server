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
const secToMMSS = (sec) =>
  [sec / 60, sec % 60].map((nr) => ("0" + Math.floor(nr)).slice(-2)).join(":");

const PLAY = "play";
const PAUSE = "pause";
const SLIDER_CORRECTION = 4; // just so the circle of the slider gets its center in the edges
const HARD_CODED_PLAYLIST = "192k";
const mimeType = 'audio/mp4; codecs="mp4a.40.2"';

const { KEY, KID, iv } = {
  KEY: "7f412f0575f44f718259beef56ec7771",
  KID: "2fef8ad812df429783e9bf6e5e493e53",
  IV: "random",
};

export default class Player {
  constructor(el, options) {
    this.wrapper = el;
    this.audio = elFrom("audio", null, el);
    this.audio.addEventListener("progress", (e) => {
      for (let i = 0; i < this.audio.buffered.length; i++) {
        const bufferedStart = this.audio.buffered.start(i);
        const bufferedEnd = this.audio.buffered.end(i);
      }
    });
    attachEME(this.audio);
    this.options = options;

    this.manifest = null;
    this.sourceBuffer = null;
    this.mediaSource = null;
    this.loadingChunk = false;
    this.whenBufferUpdateEndCallbacks = [];

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
    const timeDisplay = elFrom("div", ".time-display", this.wrapper);
    this.elapsedTimeEl = elFrom("div", ".elapsed-time", timeDisplay);
    this.remainingTimeEl = elFrom("div", ".remaining-time", timeDisplay);

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
    this.updateTime();
    this.updateSliderPosition();
    this.checkBufferLoad();
  };
  updateTime = (tempCurrentTime) => {
    this.currentTime = tempCurrentTime || this.audio.currentTime;

    this.elapsedTimeEl.textContent =
      "Elapsed time: " + secToMMSS(this.currentTime);
    this.remainingTimeEl.textContent =
      "Remaining time: " +
      secToMMSS(this.manifest.duration / 1000 - this.currentTime);
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
        this.loadChunk(
          playlist[futureNotLoadedChunkIndex],
          nearestUnloadedChunkStartTime
        );
      }
    }
  };

  updateSliderPosition = () => {
    const duration = this.manifest.duration / 1000;
    const position =
      (this.currentTime * (this.sliderCoordinates.width + SLIDER_CORRECTION)) /
      duration;
    this.progressSlider.style.left = position + "px";
    this.updateSliderTime;
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

    this.whenBufferUpdateEndCallbacks.forEach((fn) => fn());
    this.whenBufferUpdateEndCallbacks = [];
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
      // const mimeType = "audio/mp4";
      this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
      await fetchManifest;

      const playlist = this.manifest.playlists[HARD_CODED_PLAYLIST];
      this.loadChunk(playlist.slice().shift(), 0);

      this.sourceBuffer.addEventListener("updateend", () => {
        this.onChunkLoad(playlist);
      });
    });
  }
  loadChunk(next, timestampOffset) {
    if (!next) return;
    this.loadingChunk = true;
    const path = "/chunk/" + next.name;
    fetch(path)
      .then((res) => res.arrayBuffer())
      .then((data) => {
        next.data = data;
        if (typeof timestampOffset !== "undefined") {
          this.sourceBuffer.timestampOffset = timestampOffset;
        }
        this.sourceBuffer.appendBuffer(data);

        // We've loaded all available segments, so tell MediaSource there are
        // no more buffers which will be appended.
        // TODO: mediaSource.endOfStream();
      });
  }

  onToggle = (force) => {
    this.state = force || (this.state === PAUSE ? PLAY : PAUSE);
    this.toggleButton.textContent = this.state === PAUSE ? PLAY : PAUSE;

    if (this.state === PLAY) this.checkBufferLoad();
    if (this.state === PAUSE && this.audio.paused === true) return;

    const action = this.audio[this.state](); // play|pause
    Promise.resolve(action).catch((err) =>
      console.log("Error changing to", this.state, "\n", err)
    );
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
        -SLIDER_CORRECTION / 2,
        sliderPosition,
        this.sliderCoordinates.right -
          SLIDER_CORRECTION / 2 -
          this.sliderPointerDown
      ) + "px";
    const newCurrentTime =
      (parseInt(this.progressSlider.style.left, 10) *
        (this.manifest.duration / 1000)) /
      this.sliderCoordinates.width;
    this.updateTime(newCurrentTime);
  };

  onPointerUp = () => {
    const newCurrentTime =
      (parseInt(this.progressSlider.style.left, 10) *
        (this.manifest.duration / 1000)) /
      this.sliderCoordinates.width;

    const playlist = this.manifest.playlists[HARD_CODED_PLAYLIST];
    const bufferIsCompleteUpToNewCurrentTime = playlist.every((chunk, i) => {
      const chunkStartTime = chunk.segmentTime * i;
      return chunkStartTime > newCurrentTime || chunk.data;
    });

    if (bufferIsCompleteUpToNewCurrentTime) {
      this.currentTime = newCurrentTime;
      this.audio.currentTime = this.currentTime;
    } else {
      // empty buffers and make some magic

      // add buffers starting on the nearest
      const firstChunkInNewSegment = playlist.find((chunk, i) => {
        const chunkEndTime = chunk.segmentTime * (i + 1);
        return chunkEndTime > newCurrentTime;
      });

      // set the player time relative to the new time
      const segmentStartTime =
        firstChunkInNewSegment.segmentTime * firstChunkInNewSegment.chunkIndex;
      this.sliderTimeOffset = segmentStartTime;
      const adjustedCurrentTime = newCurrentTime - segmentStartTime;

      this.whenBufferUpdateEndCallbacks.push(() => {
        this.audio.currentTime = newCurrentTime;
        this.onTimeUpdate();
      });

      // use or fetch buffers
      const timestampOffset = segmentStartTime;
      this.loadChunk(firstChunkInNewSegment, timestampOffset);
    }

    this.progressSlider.classList.remove("dragging");

    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
  };
}
let ensurePromise;

function EnsureMediaKeysCreated(el, keySystem, options, encryptedEvent) {
  // We may already have a MediaKeys object if we initialized EME for a
  // different MSE SourceBuffer's "encrypted" event, or the initialization
  // may still be in progress.
  if (ensurePromise) {
    return ensurePromise;
  }

  ensurePromise = navigator
    .requestMediaKeySystemAccess(keySystem, options)
    .then(
      function (keySystemAccess) {
        return keySystemAccess.createMediaKeys();
      },
      () => console.log("Failed to request key system access.")
    )

    .then(
      function (mediaKeys) {
        return el.setMediaKeys(mediaKeys);
      },
      () => console.log("failed to create MediaKeys object")
    );

  return ensurePromise;
}

// Convert Uint8Array into base64 using base64url alphabet, without padding.
function toBase64(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=*$/, "");
}
function ArrayBufferToString(arr) {
  var str = "";
  var view = new Uint8Array(arr);
  for (var i = 0; i < view.length; i++) {
    str += String.fromCharCode(view[i]);
  }
  return str;
}

function StringToArrayBuffer(str) {
  var arr = new ArrayBuffer(str.length);
  var view = new Uint8Array(arr);
  for (var i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i);
  }
  return arr;
}

function Base64ToHex(str) {
  var bin = window.atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  var res = "";
  for (var i = 0; i < bin.length; i++) {
    res += ("0" + bin.charCodeAt(i).toString(16)).substr(-2);
  }
  return res;
}

function HexToBase64(hex) {
  var bin = "";
  for (var i = 0; i < hex.length; i += 2) {
    bin += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return window
    .btoa(bin)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function attachEME(audio) {
  // Define a key: hardcoded in this example
  // – this corresponds to the key used for encryption
  const config = [
    {
      initDataTypes: ["cenc"], // keyids, cenc
      audioCapabilities: [{ contentType: mimeType }],
    },
  ];
  audio.sessions = [];
  audio.addEventListener("encrypted", (ev) => {
    EnsureMediaKeysCreated(audio, "org.w3.clearkey", config).then(() => {
      const session = audio.mediaKeys.createSession();
      audio.sessions.push(session);
      session.addEventListener("message", handleMessage);
      session.addEventListener("keystatuseschange", function KeysChange(event) {
        const session = event.target;

        const map = session.keyStatuses;
        for (let entry of map.entries()) {
          const keyId = entry[0];
          const status = entry[1];
          const base64KeyId = Base64ToHex(
            window.btoa(ArrayBufferToString(keyId))
          );
        }
      });

      return session
        .generateRequest(ev.initDataType, ev.initData)
        .catch(function (error) {
          console.error("Failed to generate a license request", error);
        });
    });
  });
  var keys = {
    "2fef8ad812df429783e9bf6e5e493e53": "7f412f0575f44f718259beef56ec7771",
  };
  function handleMessage(ev) {
    // If you had a license server, you would make an asynchronous XMLHttpRequest
    // with event.message as the body.  The response from the server, as a
    // Uint8Array, would then be passed to session.update().
    // Instead, we will generate the license synchronously on the client, using
    // the hard-coded KEY.

    var msgStr = ArrayBufferToString(ev.message);

    var msg = JSON.parse(msgStr);

    var outKeys = [];

    for (var i = 0; i < msg.kids.length; i++) {
      var id64 = msg.kids[i];
      var idHex = Base64ToHex(msg.kids[i]).toLowerCase();
      var key = keys[idHex];

      if (key) {
        outKeys.push({
          kty: "oct",
          alg: "A128KW",
          kid: id64,
          k: HexToBase64(key),
        });
      } else {
        console.log(" couldn't find key for key id " + idHex);
      }
    }

    var update = JSON.stringify({
      keys: outKeys,
      type: msg.type,
    });

    ev.target
      .update(StringToArrayBuffer(update))
      .catch(() => console.log(" MediaKeySession update failed"));
  }

  // This takes the place of a license server.
  // kids is an array of base64-encoded key IDs
  // keys is an array of base64-encoded keys
  function generateLicense(message) {
    // Parse the clearkey license request.
    var request = JSON.parse(new TextDecoder().decode(message));
    // We only know one key, so there should only be one key ID.
    // A real license server could easily serve multiple keys.

    var keyObj = {
      kty: "oct",
      alg: "A128KW",
      kid: toBase64(KID),
      k: toBase64(KEY),
    };
    return new TextEncoder().encode(
      JSON.stringify({
        keys: [keyObj],
      })
    );
  }
}
