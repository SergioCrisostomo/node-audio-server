const path = require("path");
const assert = require("assert");
const fs = require("fs").promises;
const resetTestFolder = require("../../utils/resetTestFolder");
const createPlaylists = require("./../index");
const { OUTPUT_MEDIA_FOLDER } = require("./config");

const testMediaFolder = path.join(__dirname, "./media/");
const outputMediaFolder = path.join(testMediaFolder, OUTPUT_MEDIA_FOLDER);

describe("Playlist creation", () => {
  beforeEach(resetTestFolder);
  afterEach(resetTestFolder);

  it("Should create playlists", async () => {
    const expected = [
      "long_input_44100_000.flac",
      "long_input_44100_000.opus",
      "long_input_44100_001.flac",
      "long_input_44100_001.opus",
      "short_input_48000_000.flac",
      "short_input_48000_000.opus",
    ];
    await createPlaylists(testMediaFolder, outputMediaFolder);
    const generatedFiles = await fs.readdir(outputMediaFolder);
    const audioFiles = generatedFiles.filter((file) => !file.includes(".json"));
    assert.equal(JSON.stringify(audioFiles), JSON.stringify(expected));
  });

  it("Should create json manifest", async () => {
    const expected = ["long_input_44100.json", "short_input_48000.json"];
    await createPlaylists(testMediaFolder, outputMediaFolder);
    const generatedFiles = await fs.readdir(outputMediaFolder);
    const jsonFiles = generatedFiles.filter((file) => file.includes(".json"));
    assert.equal(JSON.stringify(jsonFiles), JSON.stringify(expected));
  });

  it("Should clear generated files during testing", async () => {
    const generatedFiles = await fs.readdir(outputMediaFolder);
    assert.equal(JSON.stringify(generatedFiles), "[]");
  });
});
