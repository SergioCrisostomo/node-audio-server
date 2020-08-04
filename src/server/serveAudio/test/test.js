const assert = require("assert");
const path = require("path");
const fs = require("fs").promises;
const resetTestFolder = require("../../utils/resetTestFolder");
const serveAudio = require("../index");

const createPlaylistFolder = path.join(__dirname, "../../createPlaylist/");
const createPlaylists = require(createPlaylistFolder + "index");

const testFolder = path.join(createPlaylistFolder, "/test/");
const { OUTPUT_MEDIA_FOLDER } = require(testFolder + "config");
const inputPath = path.join(testFolder, "./media/");
const targetPath = path.join(inputPath, OUTPUT_MEDIA_FOLDER);

const getChunkData = serveAudio({
  mediaFolder: targetPath,
  cacheLifetime: 2,
});

describe("Serve audio", () => {
  beforeEach(resetTestFolder);
  afterEach(resetTestFolder);

  it("Should serve the expected audio chunk", async () => {
    const ID = "long_input_44100_192k_000.mp4";
    const bitrates = [{ bitrate: "192k", extension: "mp4" }];
    await createPlaylists({ inputPath, targetPath, bitrates });
    const expected = await fs.readFile(path.join(targetPath, ID));
    const output = await getChunkData(ID);
    assert.equal(output.toString().length > 0, true);
    assert.equal(output.toString(), expected.toString());
  });

  it("Should cache audio chunks", async () => {
    const ID = "long_input_44100_128k_000.mp4";
    // create new to have its own empty cache
    const getChunkData = serveAudio({
      mediaFolder: targetPath,
      cacheLifetime: 2,
    });

    const bitrates = [{ bitrate: "128k", extension: "mp4" }];

    await createPlaylists({ inputPath, targetPath, bitrates });
    const start = Date.now();
    const expected = await fs.readFile(path.join(targetPath, ID));
    const fileReadTime = Date.now() - start;
    const output = await getChunkData(ID);

    const firstGetCall = Date.now() - fileReadTime - start;
    const output2 = await getChunkData(ID);
    const secondGetCall = Date.now() - fileReadTime - firstGetCall - start;

    const readTimesAreSimilar = fileReadTime / firstGetCall < 2;
    const cacheTimeIsMuchFaster =
      firstGetCall / Math.min(secondGetCall, 0.1) > 10; // at least 10x faster

    assert.equal(readTimesAreSimilar, true);
    assert.equal(cacheTimeIsMuchFaster, true);
  });
});
