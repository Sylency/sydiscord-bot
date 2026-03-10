import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { GuildMember, VoiceBasedChannel } from "discord.js";
import { Readable } from "stream";
import { ReadableStream as NodeReadableStream } from "stream/web";

interface QueueItem {
  url: string;
  requestedBy: string;
}

interface GuildMusicState {
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: QueueItem[];
  nowPlaying: QueueItem | null;
}

export class MusicManager {
  private states = new Map<string, GuildMusicState>();

  async join(member: GuildMember, channel: VoiceBasedChannel): Promise<GuildMusicState> {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

    let state = this.states.get(channel.guild.id);
    if (!state) {
      const player = createAudioPlayer();
      state = { connection, player, queue: [], nowPlaying: null };
      this.states.set(channel.guild.id, state);

      player.on(AudioPlayerStatus.Idle, () => {
        void this.playNext(channel.guild.id);
      });

      player.on("error", () => {
        void this.playNext(channel.guild.id);
      });
    } else {
      state.connection = connection;
    }

    state.connection.subscribe(state.player);
    return state;
  }

  getState(guildId: string): GuildMusicState | null {
    return this.states.get(guildId) ?? null;
  }

  enqueue(guildId: string, item: QueueItem): void {
    const state = this.states.get(guildId);
    if (!state) return;
    state.queue.push(item);
  }

  async playNext(guildId: string): Promise<void> {
    const state = this.states.get(guildId);
    if (!state) return;

    const next = state.queue.shift();
    if (!next) {
      state.nowPlaying = null;
      return;
    }

    try {
      const stream = await this.fetchStream(next.url);
      const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
      state.nowPlaying = next;
      state.player.play(resource);
    } catch {
      state.nowPlaying = null;
      await this.playNext(guildId);
    }
  }

  skip(guildId: string): void {
    const state = this.states.get(guildId);
    if (!state) return;
    state.player.stop(true);
  }

  stop(guildId: string): void {
    const state = this.states.get(guildId);
    if (!state) return;
    state.queue = [];
    state.player.stop(true);
  }

  leave(guildId: string): void {
    const state = this.states.get(guildId);
    if (!state) return;
    state.queue = [];
    state.player.stop(true);
    state.connection.destroy();
    this.states.delete(guildId);
  }

  private async fetchStream(url: string): Promise<Readable> {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error("Failed to fetch stream");
    }
    const body = response.body as unknown as NodeReadableStream<Uint8Array>;
    return Readable.fromWeb(body);
  }
}
