# Node audio server

---

This project aims to create a server and client for serving audio between Node.js and browser.

## API exposure

(more details soon)

- `createPlaylist` - method to create playlists, ie generate audio files and a `.json` manifest file). The `.json` file serves the same purpose as a DASH `.mpd` file or a HLS `.m3u8` file.
- `serveAudio` - function to get audio chunks with a very basic cache layer
- `startServer` - Not implemented yet. A node.js server implementation to serve audio.
- `player` - Not implemented yet, work in progress. Client side player.

## Where the project is at now:

Creating a prototype (PoC) player with some of the Roadmap functionality. WIP.

## Roadmap:

- [x] generate playlists with different bitrates from WAV files
- [x] middleware to serve audio chunks
- [x] test consuming sequential chunks using MSE api
- [x] client side player with basic functionality (prototype)
  - [x] load chunks on demand (no need to download all chunks if the player is paused)
  - [x] show what parts are downloaded in the progress bar
  - [x] enable seek
- [x] enable encryption in server-client audio data (clear key)
- [ ] use different bitrates depending on network performance
- [ ] audio play tracking and more DRM analytics
- [ ] use flac and opus (currently only .mp4 container is implemented)
- [ ] client side player
  - [ ] in React
  - [ ] in Vue.js
  - [ ] vanilla js

## How to contribute:

- feel free to reach out
- install, check the tests or check the dev-server with `npm run dev` and open `localhost:3000` in your favorite browser

## Dependencies

#### At file conversion time (`createPlaylist` API)

- [ffmpeg](https://ffmpeg.org/)
- [Bento4](https://github.com/axiomatic-systems/Bento4)
