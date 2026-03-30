import { Message, TextChannel, PermissionFlagsBits } from "discord.js";
import { playRadio, stopRadio, listStations, getRadioState } from "./radio.js";
import {
  addAndPlay,
  skipTrack,
  stopQueue,
  pauseQueue,
  resumeQueue,
  getQueueList,
  getQueue,
} from "./queue.js";
import {
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  showPlaylist,
  listPublicPlaylists,
  setPlaylistVisibility,
  playPlaylist,
} from "./playlist.js";

const HELP_TEXT = `
🎵 **Music Bot Commands**

**Radio**
\`!radio play <station>\` — Stream a live radio station in your voice channel
\`!radio stop\` — Stop the radio
\`!radio list\` — Show all available stations
\`!radio now\` — Show what's currently on

**Moderation**
\`!clear <1-100>\` — Delete the last X messages in this channel (default: 10)

**Playback**
\`!play <song or URL>\` — Search and play a song
\`!skip\` — Skip the current song
\`!stop\` — Stop and clear the queue
\`!pause\` — Pause playback
\`!resume\` — Resume playback
\`!queue\` — Show the current queue
\`!nowplaying\` — Show what's currently playing

**Playlists**
\`!pl create <name>\` — Create a new playlist
\`!pl delete <name>\` — Delete your playlist
\`!pl add <name> | <song>\` — Add a song to a playlist
\`!pl remove <name> | <track #>\` — Remove a track from a playlist
\`!pl show\` — List your playlists
\`!pl show <name>\` — Show tracks in a playlist
\`!pl public\` — List all public playlists in this server
\`!pl play <name>\` — Play a playlist (yours or public)
\`!pl privacy <name> public|private\` — Change playlist visibility

\`!help\` — Show this message
`.trim();

export async function handleCommand(
  command: string,
  args: string[],
  message: Message
): Promise<void> {
  if (!message.guild) {
    await message.reply("This bot only works in servers!");
    return;
  }

  const guildId = message.guild.id;

  switch (command) {
    case "radio": {
      const sub = args.shift()?.toLowerCase();
      switch (sub) {
        case "play": {
          const stationKey = args.join(" ").trim();
          if (!stationKey) {
            await message.reply(
              `Please specify a station. Usage: \`!radio play <station>\`\n\nType \`!radio list\` to see all available stations.`
            );
            return;
          }
          await playRadio(message, stationKey);
          break;
        }
        case "stop": {
          const stopped = stopRadio(guildId);
          if (stopped) {
            await message.reply(`📻 Stopped radio: **${stopped.name}**.`);
          } else {
            await message.reply("No radio is playing right now.");
          }
          break;
        }
        case "list":
        case "stations": {
          await message.reply(`📻 **Available Radio Stations:**\n${listStations()}\n\nPlay one with \`!radio play <station name>\``);
          break;
        }
        case "now":
        case "np": {
          const state = getRadioState(guildId);
          if (!state) {
            await message.reply("No radio is playing right now.");
          } else {
            await message.reply(`📻 Currently streaming: **${state.station.name}** — *${state.station.genre}*`);
          }
          break;
        }
        default:
          await message.reply(
            "Usage:\n`!radio play <station>` — Start a station\n`!radio stop` — Stop radio\n`!radio list` — Show all stations\n`!radio now` — Current station"
          );
      }
      break;
    }

    case "clear":
    case "purge":
    case "prune": {
      const channel = message.channel as TextChannel;

      if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.reply("❌ You need the **Manage Messages** permission to use this command.");
        return;
      }

      const botMember = message.guild!.members.me;
      if (!botMember?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.reply("❌ I need the **Manage Messages** permission to delete messages.");
        return;
      }

      const amount = args[0] ? parseInt(args[0], 10) : 10;

      if (isNaN(amount) || amount < 1 || amount > 100) {
        await message.reply("Please provide a number between 1 and 100. Usage: `!clear <1-100>`");
        return;
      }

      try {
        const deleted = await channel.bulkDelete(amount + 1, true);
        const count = deleted.size - 1;
        const reply = await channel.send(
          `🗑️ Deleted **${count}** message${count !== 1 ? "s" : ""}.`
        );
        setTimeout(() => reply.delete().catch(() => {}), 5000);
      } catch (err: any) {
        if (err?.code === 50034) {
          await message.reply("❌ Cannot delete messages older than 14 days.");
        } else {
          await message.reply("❌ Failed to delete messages.");
          console.error("bulkDelete error:", err);
        }
      }
      break;
    }

    case "play":
    case "p": {
      if (args.length === 0) {
        await message.reply("Please provide a song name or YouTube URL. Usage: `!play <song>`");
        return;
      }
      await addAndPlay(message, args.join(" "));
      break;
    }

    case "skip":
    case "s": {
      const skipped = skipTrack(guildId);
      if (skipped) {
        await message.reply("⏭️ Skipped.");
      } else {
        await message.reply("Nothing is playing right now.");
      }
      break;
    }

    case "stop": {
      const stopped = stopQueue(guildId);
      if (stopped) {
        await message.reply("⏹️ Stopped and cleared the queue.");
      } else {
        await message.reply("Nothing is playing right now.");
      }
      break;
    }

    case "pause": {
      const paused = pauseQueue(guildId);
      if (paused) {
        await message.reply("⏸️ Paused.");
      } else {
        await message.reply("Nothing is playing right now.");
      }
      break;
    }

    case "resume":
    case "r": {
      const resumed = resumeQueue(guildId);
      if (resumed) {
        await message.reply("▶️ Resumed.");
      } else {
        await message.reply("Nothing to resume.");
      }
      break;
    }

    case "queue":
    case "q": {
      const tracks = getQueueList(guildId);
      if (tracks.length === 0) {
        await message.reply("The queue is empty.");
        return;
      }
      const list = tracks
        .map(
          (t, i) =>
            `${i === 0 ? "▶️" : `${i + 1}.`} **${t.title}** [${t.duration}] — ${t.requestedBy}`
        )
        .join("\n");
      await message.reply(`🎶 **Current Queue (${tracks.length} tracks):**\n${list}`);
      break;
    }

    case "nowplaying":
    case "np": {
      const queue = getQueue(guildId);
      if (!queue || !queue.isPlaying || queue.tracks.length === 0) {
        await message.reply("Nothing is playing right now.");
        return;
      }
      const current = queue.tracks[0];
      await message.reply(
        `🎵 **Now Playing:** ${current.title} [${current.duration}] — requested by ${current.requestedBy}`
      );
      break;
    }

    case "pl":
    case "playlist": {
      const sub = args.shift()?.toLowerCase();
      if (!sub) {
        await message.reply("Usage: `!pl <create|delete|add|remove|show|play|privacy|public>`\nType `!help` for full details.");
        return;
      }
      switch (sub) {
        case "create":
          await createPlaylist(message, args);
          break;
        case "delete":
        case "del":
          await deletePlaylist(message, args);
          break;
        case "add":
          await addTrackToPlaylist(message, args);
          break;
        case "remove":
        case "rm":
          await removeTrackFromPlaylist(message, args);
          break;
        case "show":
        case "list":
          await showPlaylist(message, args);
          break;
        case "public":
          await listPublicPlaylists(message);
          break;
        case "privacy":
          await setPlaylistVisibility(message, args);
          break;
        case "play":
          await playPlaylist(message, args);
          break;
        default:
          await message.reply(`Unknown playlist command \`${sub}\`. Type \`!help\` for details.`);
      }
      break;
    }

    case "help":
    case "h": {
      await message.reply(HELP_TEXT);
      break;
    }

    default:
      await message.reply(`Unknown command \`!${command}\`. Type \`!help\` for a list of commands.`);
  }
}
