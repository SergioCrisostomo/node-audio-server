import React from "react";
import ReactDOM from "react-dom";
import AudioPlayer from "../src/ReactPlayer/mse-player.tsx";

const container = document.querySelector(".audio-player-container");
const reactPlayerContainer = document.createElement("div");

container.appendChild(reactPlayerContainer);

console.log("Loading React Player!");

ReactDOM.render(<AudioPlayer />, reactPlayerContainer);
