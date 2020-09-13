export const EnsureMediaKeysCreated = (() => {
  let pendingPromise;

  return function _EnsureMediaKeysCreated(el, keySystem, options) {
    if (pendingPromise) {
      return pendingPromise;
    }

    pendingPromise = navigator
      .requestMediaKeySystemAccess(keySystem, options)
      .then((keySystemAccess) => keySystemAccess.createMediaKeys())
      .then((mediaKeys) => el.setMediaKeys(mediaKeys));

    return pendingPromise;
  };
})();

export function ArrayBufferToString(arr) {
  let str = "";
  const view = new Uint8Array(arr);
  for (let i = 0; i < view.length; i++) {
    str += String.fromCharCode(view[i]);
  }
  return str;
}

export function StringToArrayBuffer(str) {
  const arr = new ArrayBuffer(str.length);
  const view = new Uint8Array(arr);
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i);
  }
  return arr;
}

export function HexToBase64(hex) {
  let bin = "";
  for (let i = 0; i < hex.length; i += 2) {
    bin += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return window
    .btoa(bin)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function Base64ToHex(str) {
  const bin = window.atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  let res = "";
  for (let i = 0; i < bin.length; i++) {
    res += ("0" + bin.charCodeAt(i).toString(16)).substr(-2);
  }
  return res;
}

export function handleMessage(ev, manifestURL) {
  // If you had a license server, you would make an asynchronous XMLHttpRequest
  // with event.message as the body. The response from the server, as a
  // Uint8Array, would then be passed to session.update().
  // Instead, we will generate the license synchronously on the client, using
  // the hard-coded KEY.

  const msgStr = JSON.parse(ArrayBufferToString(ev.message));
  const kids = msgStr.kids.map(Base64ToHex);

  const isrc = manifestURL.split("/").pop();
  fetch("/trackkey/" + isrc, {
    method: "POST",
    body: JSON.stringify({ kids }),
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then(({ key, kid }) => {
      const outKeys = [];
      outKeys.push({
        kty: "oct",
        alg: "A128KW",
        kid: HexToBase64(kid),
        k: HexToBase64(key),
      });
      const update = JSON.stringify({
        keys: outKeys,
        type: msgStr.type,
      });

      ev.target
        .update(StringToArrayBuffer(update))
        .catch((err) => console.log("MediaKeySession update failed", err));
    })
    .catch((err) => console.log("Error fetching key", err));
}
