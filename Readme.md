# Node audio server

---

This project aims to create a server and client for serving audio between Node.js and browser.

## API exposure

(more details soon)

- `createPlaylist` - method to create playlists (audio file chunks) and a `.json` manifest file. This serves the same purpose as a DASH `.mpd` file or a HLS `.m3u8` file.
- `serveAudio` - function to get audio chunks with a very basic cache layer
- `startServer` - Not implemented yet. A node.js server implementation to serve audio.
- `player` - Not implemented yet, work in progress. Client side player.

## Roadmap:

- [x] generate playlists with different bitrates from WAV files
- [x] middleware to serve audio chunks
- [ ] client side player with basic functionality
  - [ ] enable seek
  - [ ] use different bitrates depending on network performance
  - [ ] audio play tracking and more DRM analytics
- [ ] enable encryption in server-client audio data

## How to contribute:

- feel free to reach out
- install, check the tests or check the dev-server with `npm run dev` and open `localhost:3000` in your favorite browser
