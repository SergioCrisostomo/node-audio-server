const path = require("path");
const assert = require("assert");
const fs = require("fs").promises;
const resetTestFolder = require("../../utils/resetTestFolder");
const createPlaylists = require("./../index");
const { OUTPUT_MEDIA_FOLDER } = require("./config");

const inputPath = path.join(__dirname, "./media/");
const targetPath = path.join(inputPath, OUTPUT_MEDIA_FOLDER);

describe("Playlist creation", () => {
  beforeEach(resetTestFolder);
  afterEach(resetTestFolder);

  it("Should create files for a playlist", async () => {
    const expected = [
      "long_input_44100_1411k_000.flac",
      "long_input_44100_1411k_001.flac",
      "short_input_48000_1411k_000.flac",
    ];
    const bitrates = [{ codec: "flac", bitrate: "1411k", extension: "flac" }];
    await createPlaylists({ inputPath, targetPath, bitrates });
    const generatedFiles = await fs.readdir(targetPath);
    const audioFiles = generatedFiles.filter((file) => !file.includes(".json"));
    assert.equal(JSON.stringify(audioFiles), JSON.stringify(expected));
  });

  it("Should create json manifest", async () => {
    const expected = ["long_input_44100.json", "short_input_48000.json"];
    const bitrates = [{ codec: "flac", bitrate: "1411k", extension: "flac" }];
    await createPlaylists({ inputPath, targetPath, bitrates });
    const generatedFiles = await fs.readdir(targetPath);
    const jsonFiles = generatedFiles.filter((file) => file.includes(".json"));
    assert.equal(JSON.stringify(jsonFiles), JSON.stringify(expected));
  });

  it("Should clear generated files during testing", async () => {
    const generatedFiles = await fs.readdir(targetPath);
    assert.equal(JSON.stringify(generatedFiles), "[]");
  });
});
