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
      "long_input_44100_192k_000.mp4",
      "long_input_44100_192k_001.mp4",
      "short_input_48000_192k_000.mp4",
    ];
    const bitrates = [{ bitrate: "192k", extension: "mp4" }];
    await createPlaylists({ inputPath, targetPath, bitrates });
    const generatedFiles = await fs.readdir(targetPath);
    const expectedFilesAreThere = expected.every((file) =>
      generatedFiles.includes(file)
    );
    assert.equal(expectedFilesAreThere, true);
  });

  it("Should create json manifest", async () => {
    const expected = ["long_input_44100.json", "short_input_48000.json"];
    const bitrates = [{ bitrate: "192k", extension: "mp4" }];
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
