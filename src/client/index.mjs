const audio = document.querySelector("audio");
const buttonsWrapper = document.getElementById("buttons");

const chunks = fetch("/media/long_input_44100.wav")
  .then((res) => res.json())
  .then((manifest) => {
    const opusChunks = manifest.playlists["192k"];
    opusChunks.forEach((url, i) => {
      const src = "/chunk/" + url.split("/").pop();
      const btn = document.createElement("button");
      btn.innerHTML = "Play chunk " + i;
      btn.dataset.src = src;
      btn.style.margin = "5px";
      btn.addEventListener("click", () => {
        audio.src = src;
        audio.play();
      });
      buttonsWrapper.appendChild(btn);
    });
  });

/*
import { clearKeyOptions, handleEncrypted } from "./config.mjs";
var video = document.querySelector("video");
video.addEventListener("encrypted", handleEncrypted, false);

navigator
  .requestMediaKeySystemAccess("org.w3.clearkey", clearKeyOptions)
  .then(function (keySystemAccess) {
    return keySystemAccess.createMediaKeys();
  })
  .then(function (createdMediaKeys) {
    return video.setMediaKeys(createdMediaKeys);
  })
  .catch(function (error) {
    console.error("Failed to set up MediaKeys", error);
  });
*/
