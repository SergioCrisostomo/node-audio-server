import React, { PureComponent, createRef } from "react";

import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import "./Player.scss";

// import 'react-h5-audio-player/lib/styles.less' Use LESS
// import 'react-h5-audio-player/src/styles.scss' Use SASS

import { EnsureMediaKeysCreated, handleMessage } from "./utils";

const HARD_CODED_PLAYLIST = "192k";
const mimeType = 'audio/mp4; codecs="mp4a.40.2"';

/*
            onEnded={() => this.playNextInPlaylist()}
            playingISRC={this.state.playingISRC}

*/

const config = [
  {
    initDataTypes: ["cenc"], // keyids, cenc
    audioCapabilities: [{ contentType: mimeType }],
  },
];

const TIME_MARGIN = 15;

interface ChunkData {
  name: string;
  data: BufferSource | null;
  segmentTime: number;
  chunkIndex: number;
}

interface MediaSourcePlayerState {
  audioSrc: string;
  srcDuration: number;
}

interface MediaEncryptedEvent {
  target: HTMLAudioElement;
  initDataType: string;
  initData: BufferSource;
}

interface MediaSourcePlayerProps {
  onEnded: Function;
  playingISRC: string;
}
interface MediaSourcePlayer {
  props: MediaSourcePlayerProps;
  state: MediaSourcePlayerState;
}
type OnSeek = (audio: HTMLAudioElement, time: number) => Promise<void>;

interface MSEPropsObject {
  onSeek?: OnSeek;
  onEcrypted?: (e: any) => void;
  srcDuration?: number;
}

class MediaSourcePlayer extends PureComponent<MediaSourcePlayerProps, any> {
  player: any = createRef();
  mediaSource: MediaSource | null = null;
  loadingChunk = false;
  playlist: ChunkData[] = [];
  whenBufferUpdateEndCallbacks: Function[] = [];
  sourceBuffer: any = null;
  manifest: any = null;

  state: MediaSourcePlayerState = {
    audioSrc: "",
    srcDuration: 0,
  };

  componentDidUpdate(prevProps: MediaSourcePlayerProps) {
    const previousISRC = prevProps.playingISRC;

    if (previousISRC !== this.props.playingISRC) {
      this.setSong(this.props.playingISRC);
    }
  }

  onEncrypted = (ev: MediaEncryptedEvent): void => {
    const audio: HTMLAudioElement = ev.target;
    EnsureMediaKeysCreated(audio, "org.w3.clearkey", config).then(() => {
      const session = audio.mediaKeys!.createSession();
      session.addEventListener("message", (e) =>
        handleMessage(e, this.props.playingISRC)
      );

      return session.generateRequest(ev.initDataType, ev.initData);
    });
  };

  onSeek(audio: HTMLAudioElement, time: number): Promise<void> {
    const bufferIsCompleteUpToNewCurrentTime = this.playlist.every(
      (chunk, i) => {
        const chunkStartTime = chunk.segmentTime * i;
        return chunkStartTime > time || chunk.data;
      }
    );
    return new Promise((resolve) => {
      if (bufferIsCompleteUpToNewCurrentTime) {
        audio.currentTime = time;
        this.checkBufferLoad();
        resolve();
      } else {
        if (!audio.paused) audio.pause();

        let chunkEndTime = 0;
        const firstChunkInNewSegment =
          this.playlist.find((chunk, i) => {
            chunkEndTime += chunk.segmentTime;
            return chunkEndTime > time;
          }) || this.playlist[0];

        // this.onTimeUpdate();

        const cb = (): void => {
          audio.currentTime = time;
          this.checkBufferLoad();

          if (audio.paused) {
            audio.play().then(resolve);
          } else resolve();
        };
        this.whenBufferUpdateEndCallbacks.push(cb);

        // set the player time relative to the new time
        const timestampOffset =
          chunkEndTime - firstChunkInNewSegment.segmentTime;

        // use or fetch buffers
        this.loadChunk(firstChunkInNewSegment, timestampOffset);
      }
    });
  }

  onChunkLoad(): void {
    this.loadingChunk = false;

    // do logic after chunk is loaded
    this.whenBufferUpdateEndCallbacks.forEach((fn) => fn());
    this.whenBufferUpdateEndCallbacks = [];
  }

  checkBufferLoad(): void {
    if (this.loadingChunk) return;
    const { sourceBuffer, mediaSource } = this;

    if (!sourceBuffer) return;
    const allDataLoaded = this.playlist.every((chunk) => chunk.data);
    if (allDataLoaded && mediaSource!.readyState === "open") {
      mediaSource!.endOfStream();
    }
    if (allDataLoaded) return;

    const audio = this.player!.current!.audio.current;
    const time = audio.currentTime || 0;

    let remainingBufferToUse;
    let chunkstartTime = 0;
    let nextChunkToLoad = this.playlist[0];

    for (const chunk of this.playlist) {
      if (chunkstartTime > time && !chunk.data) {
        remainingBufferToUse = chunkstartTime - time;
        nextChunkToLoad = chunk;
        break;
      }
      chunkstartTime += chunk.segmentTime;
    }

    const bufferIsTooShort = remainingBufferToUse < TIME_MARGIN;

    if (bufferIsTooShort) {
      if (!sourceBuffer.updating && mediaSource!.readyState === "open") {
        this.loadChunk(nextChunkToLoad, chunkstartTime);
      }
    }
  }

  onTimeUpdate(): void {
    this.checkBufferLoad();
  }

  reset(): void {
    this.manifest = null;
    this.sourceBuffer = null;
    this.mediaSource = null;
    this.loadingChunk = false;
    this.whenBufferUpdateEndCallbacks = [];
  }

  async setSong(manifestUrl: string) {
    this.reset();
    await fetch(manifestUrl)
      .then((res) => res.json())
      .then((manifest) => (this.manifest = manifest))
      .catch((err) => console.log("Error loading manifest", manifestUrl));

    this.mediaSource = new MediaSource();
    const audioSrc = URL.createObjectURL(this.mediaSource);

    this.playlist = this.manifest.playlists[HARD_CODED_PLAYLIST];

    const totalDuration = this.playlist.reduce(
      (sum, { segmentTime }) => sum + segmentTime,
      0
    );

    this.setState({ audioSrc, srcDuration: totalDuration });

    this.mediaSource.addEventListener("sourceopen", () => {
      URL.revokeObjectURL(audioSrc);
      this.sourceBuffer = this.mediaSource!.addSourceBuffer(mimeType);

      this.loadChunk(this.playlist[0], 0);

      this.sourceBuffer.addEventListener("updateend", () => {
        this.onChunkLoad();
      });
    });
  }

  loadChunk(next: ChunkData, timestampOffset: number): void {
    if (!next) {
      this.mediaSource!.endOfStream();
      return;
    }
    this.loadingChunk = true;
    const { urlRoot } = this.manifest;
    const path = [urlRoot, next.name].join("/");

    fetch(path)
      .then((res) => res.arrayBuffer())
      .then((data) => {
        next.data = data;
        if (typeof timestampOffset !== "undefined") {
          this.sourceBuffer.timestampOffset = timestampOffset;
        }
        this.sourceBuffer.appendBuffer(data);
      });
  }

  render(): React.ReactNode {
    const useMSE: MSEPropsObject = {
      srcDuration: this.state.srcDuration,
      onEcrypted: this.onEncrypted,
      onSeek: (audio: HTMLAudioElement, time: number) =>
        this.onSeek(audio, time),
    };

    return (
      <div>
        <AudioPlayer
          autoPlayAfterSrcChange={false}
          ref={this.player}
          src={this.state.audioSrc}
          onEnded={(e) => this.props.onEnded(e)}
          useMSE={useMSE}
          onListen={() => this.onTimeUpdate()}
          listenInterval={250}
          volume={1}
          autoPlay={true}
        />
      </div>
    );
  }
}

export default MediaSourcePlayer;
