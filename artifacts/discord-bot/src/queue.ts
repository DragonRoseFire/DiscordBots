import {
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnection,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import { Message, TextChannel } from "discord.js";
import play from "play-dl";
import { spawn } from "child_process";

export interface Track {
  url: string;
  title: string;
  duration: string;
  requestedBy: string;
}

interface GuildQueue {
  tracks: Track[];
  player: AudioPlayer;
  connection: VoiceConnection;
  textChannel: TextChannel;
  isPlaying: boolean;
  volume: number;
}

const queues = new Map<string, GuildQueue>();

export function getQueue(guildId: string): GuildQueue | undefined {
  return queues.get(guildId);
}

export async function joinChannel(message: Message): Promise<GuildQueue | null> {
  const member = message.member;
  if (!member?.voice.channel) {
    await message.reply("You need to be in a voice channel first!");
    return null;
  }

  const voiceChannel = member.voice.channel;
  const guildId = message.guild!.id;

  let queue = queues.get(guildId);

  if (!queue) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: message.guild!.voiceAdapterCreator,
    });

    const player = createAudioPlayer();

    queue = {
      tracks: [],
      player,
      connection,
      textChannel: message.channel as TextChannel,
      isPlaying: false,
      volume: 100,
    };

    connection.subscribe(player);
    queues.set(guildId, queue);

    player.on(AudioPlayerStatus.Idle, () => {
      const q = queues.get(guildId);
      if (!q) return;
      q.tracks.shift();
      if (q.tracks.length > 0) {
        playNext(guildId);
      } else {
        q.isPlaying = false;
        q.textChannel.send("Queue finished. Leaving voice channel.");
        q.connection.destroy();
        queues.delete(guildId);
      }
    });

    player.on("error", (err) => {
      console.error("Audio player error:", err);
      const q = queues.get(guildId);
      if (q) {
        q.textChannel.send(`Error playing audio: ${err.message}`);
        q.tracks.shift();
        if (q.tracks.length > 0) {
          playNext(guildId);
        }
      }
    });
  }

  return queue;
}

export async function addToQueue(
  message: Message,
  query: string,
  silent = false
): Promise<void> {
  const guildId = message.guild!.id;
  const queue = queues.get(guildId);
  if (!queue) return;

  if (!silent) {
    await message.reply(`🔍 Searching for: **${query}**`);
  }

  try {
    let trackInfo: Track;

    if (play.yt_validate(query) === "video") {
      const info = await play.video_info(query);
      trackInfo = {
        url: query,
        title: info.video_details.title ?? "Unknown Title",
        duration: formatDuration(info.video_details.durationInSec ?? 0),
        requestedBy: message.author.username,
      };
    } else {
      const results = await play.search(query, { source: { youtube: "video" }, limit: 1 });
      if (!results || results.length === 0) {
        if (!silent) await message.reply("No results found for your search.");
        return;
      }
      const video = results[0];
      const videoUrl = video.url || `https://www.youtube.com/watch?v=${video.id}`;
      trackInfo = {
        url: videoUrl,
        title: video.title ?? "Unknown Title",
        duration: formatDuration(video.durationInSec ?? 0),
        requestedBy: message.author.username,
      };
    }

    queue.tracks.push(trackInfo);

    if (!queue.isPlaying) {
      playNext(guildId);
    } else if (!silent) {
      await message.channel.send(
        `✅ Added to queue: **${trackInfo.title}** [${trackInfo.duration}] — position #${queue.tracks.length}`
      );
    }
  } catch (err) {
    console.error("Error searching for track:", err);
    if (!silent) {
      await message.reply("Could not find or play that track. Try a different search or URL.");
    }
  }
}

export async function addAndPlay(message: Message, query: string): Promise<void> {
  const queue = await joinChannel(message);
  if (!queue) return;
  await message.reply(`🔍 Searching for: **${query}**`);

  try {
    let trackInfo: Track;

    if (play.yt_validate(query) === "video") {
      const info = await play.video_info(query);
      trackInfo = {
        url: query,
        title: info.video_details.title ?? "Unknown Title",
        duration: formatDuration(info.video_details.durationInSec ?? 0),
        requestedBy: message.author.username,
      };
    } else {
      const results = await play.search(query, { source: { youtube: "video" }, limit: 1 });
      if (!results || results.length === 0) {
        await message.reply("No results found for your search.");
        return;
      }
      const video = results[0];
      const videoUrl = video.url || `https://www.youtube.com/watch?v=${video.id}`;
      trackInfo = {
        url: videoUrl,
        title: video.title ?? "Unknown Title",
        duration: formatDuration(video.durationInSec ?? 0),
        requestedBy: message.author.username,
      };
    }

    queue.tracks.push(trackInfo);

    if (!queue.isPlaying) {
      playNext(queue.connection.joinConfig.guildId);
    } else {
      await message.channel.send(
        `✅ Added to queue: **${trackInfo.title}** [${trackInfo.duration}] — position #${queue.tracks.length}`
      );
    }
  } catch (err) {
    console.error("Error searching for track:", err);
    await message.reply("Could not find or play that track. Try a different search or URL.");
  }
}

async function playNext(guildId: string): Promise<void> {
  const queue = queues.get(guildId);
  if (!queue || queue.tracks.length === 0) return;

  const track = queue.tracks[0];
  queue.isPlaying = true;

  if (!track.url) {
    console.error("Track URL is missing:", track);
    queue.textChannel.send(`❌ Failed to play **${track.title}**: Invalid track data.`).catch(() => {});
    queue.tracks.shift();
    if (queue.tracks.length > 0) {
      playNext(guildId);
    }
    return;
  }

  try {
    const playdlStream = await play.stream(track.url, { quality: 2 });

    const ffmpeg = spawn("ffmpeg", [
      "-i", "pipe:0",
      "-analyzeduration", "0",
      "-loglevel", "warning",
      "-acodec", "libopus",
      "-f", "ogg",
      "-ar", "48000",
      "-ac", "2",
      "-b:a", "128k",
      "pipe:1",
    ], { stdio: ["pipe", "pipe", "pipe"] });

    playdlStream.stream.pipe(ffmpeg.stdin!);

    ffmpeg.stderr?.on("data", (d: Buffer) => {
      const msg = d.toString().trim();
      if (msg) console.log("[ffmpeg music]", msg);
    });

    const resource = createAudioResource(ffmpeg.stdout!, {
      inputType: StreamType.OggOpus,
    });

    queue.player.play(resource);
    await entersState(queue.player, AudioPlayerStatus.Playing, 10_000);

    await queue.textChannel.send(
      `🎵 Now playing: **${track.title}** [${track.duration}] — requested by ${track.requestedBy}`
    );
  } catch (err) {
    console.error("Error starting playback:", err);
    await queue.textChannel.send(`Failed to play **${track.title}**. Skipping...`);
    queue.tracks.shift();
    if (queue.tracks.length > 0) {
      playNext(guildId);
    } else {
      queue.isPlaying = false;
      queue.connection.destroy();
      queues.delete(guildId);
    }
  }
}

export function skipTrack(guildId: string): boolean {
  const queue = queues.get(guildId);
  if (!queue || !queue.isPlaying) return false;
  queue.player.stop();
  return true;
}

export function stopQueue(guildId: string): boolean {
  const queue = queues.get(guildId);
  if (!queue) return false;
  queue.tracks = [];
  queue.player.stop();
  queue.connection.destroy();
  queues.delete(guildId);
  return true;
}

export function pauseQueue(guildId: string): boolean {
  const queue = queues.get(guildId);
  if (!queue || !queue.isPlaying) return false;
  return queue.player.pause();
}

export function resumeQueue(guildId: string): boolean {
  const queue = queues.get(guildId);
  if (!queue) return false;
  return queue.player.unpause();
}

export function getQueueList(guildId: string): Track[] {
  return queues.get(guildId)?.tracks ?? [];
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
