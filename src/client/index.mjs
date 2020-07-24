const playerContainer = document.querySelector(".audio-player-container");

import Player from "/Player.mjs";

const player = new Player(playerContainer);
player.setPlaylist("/media/long_input_44100.wav");
