export let clearKeyOptions = [
  {
    initDataTypes: ["keyids", "webm"],
    audioCapabilities: [
      { contentType: 'audio/webm; codecs="opus"' },
      { contentType: 'audio/webm; codecs="vorbis"' },
    ],
    videoCapabilities: [
      { contentType: 'video/webm; codecs="vp9"' },
      { contentType: 'video/webm; codecs="vp8"' },
    ],
  },
];

// Define a key: hardcoded in this example
// – this corresponds to the key used for encryption
export var KEY = new Uint8Array([
  0xeb,
  0xdd,
  0x62,
  0xf1,
  0x68,
  0x14,
  0xd2,
  0x7b,
  0x68,
  0xef,
  0x12,
  0x2a,
  0xfc,
  0xe4,
  0xae,
  0x3c,
]);

export function handleEncrypted(event) {
  var session = video.mediaKeys.createSession();
  session.addEventListener("message", handleMessage, false);
  session
    .generateRequest(event.initDataType, event.initData)
    .catch(function (error) {
      console.error("Failed to generate a license request", error);
    });
}

function handleMessage(event) {
  // If you had a license server, you would make an asynchronous XMLHttpRequest
  // with event.message as the body.  The response from the server, as a
  // Uint8Array, would then be passed to session.update().
  // Instead, we will generate the license synchronously on the client, using
  // the hard-coded KEY at the top.
  var license = generateLicense(event.message);

  var session = event.target;
  session.update(license).catch(function (error) {
    console.error("Failed to update the session", error);
  });
}

// Convert Uint8Array into base64 using base64url alphabet, without padding.
function toBase64(u8arr) {
  return btoa(String.fromCharCode.apply(null, u8arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=*$/, "");
}

// This takes the place of a license server.
// kids is an array of base64-encoded key IDs
// keys is an array of base64-encoded keys
function generateLicense(message) {
  // Parse the clearkey license request.
  var request = JSON.parse(new TextDecoder().decode(message));
  // We only know one key, so there should only be one key ID.
  // A real license server could easily serve multiple keys.
  console.assert(request.kids.length === 1);

  var keyObj = {
    kty: "oct",
    alg: "A128KW",
    kid: request.kids[0],
    k: toBase64(KEY),
  };
  return new TextEncoder().encode(
    JSON.stringify({
      keys: [keyObj],
    })
  );
}

export default clearKeyOptions;
