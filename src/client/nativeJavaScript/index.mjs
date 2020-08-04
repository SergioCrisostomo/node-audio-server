import Player from "/nativeJavaScript/Player.mjs";

const playerContainer = document.querySelector(".audio-player-container");
const player = new Player(playerContainer);
player.setPlaylist("/media/long_input_44100.wav");
