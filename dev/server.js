const express = require("express");
const cors = require("cors");

const path = require("path");
const fs = require("fs").promises;
const api = require("../src/index");
const getFiles = require("../src/server/utils/getFiles");
const testKeys = require("./testKeys.json");
const dependencyLibrariesPath = require("./dependencyLibrariesPath");

const mediaFolder = path.join(__dirname, "media/output");
const getChunk = api.serveAudio({ mediaFolder });

const recompileCachedFiles = false;

if (recompileCachedFiles) {
  api
    .createPlaylist({
      inputPath: path.join(__dirname, "media"),
      targetPath: mediaFolder,
      segmentTime: 5,
      bitrates: [
        { bitrate: "192k", extension: "mp4" },
        // {bitrate: "8k", extension: "mp4" },
      ],
      encryptionKeys: testKeys,
      dependencyLibrariesPath,
    })
    .catch((err) => console.log("::: createPlaylist failed", err));
}

const app = express();
app.use(cors());
app.use((req, res, next) => {
  console.log("GET:", req.originalUrl);
  next();
});

app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
app.get(/\.mjs/, (req, res) => {
  const scriptPath = path.join(__dirname, "../src/client/", req.originalUrl);
  console.log(scriptPath);
  res.sendFile(scriptPath);
});

app.get("/media", async (req, res) => {
  // serve all manifest files
  const files = await getFiles(mediaFolder, "json");
  const manifests = files.map((file) => require(file));
  res.send(manifests);
});
app.get("/media/:name", async (req, res) => {
  const files = await getFiles(mediaFolder, "json");
  const manifests = files.map((file) => require(file));
  res.send(manifests.find(({ name }) => name === req.params.name));
});
app.get("/chunk/:name", async (req, res) => {
  const chunkName = req.params.name;
  const audio = await getChunk(chunkName);
  res.send(audio);
});

const server = app.listen(3000, () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log("App listening at http://%s:%s", host, port);
});
process.on("SIGINT", async () => {
  if (recompileCachedFiles) {
    console.info("SIGINT signal received. Deleting generated files.");
    const dir = path.join(__dirname, "/media/output/");

    try {
      await fs.rmdir(dir, { recursive: true });
      try {
        await fs.mkdir(dir);
      } catch (err) {
        if (err && err.code != "EEXIST") {
          console.log("Error creating media output folder");
        }
      }
    } catch (e) {
      console.log("Error after SIGINT was called", e);
    }
  }

  process.exit(0);
});
