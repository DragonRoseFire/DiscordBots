import { Message } from "discord.js";
import { db } from "@workspace/db";
import { playlistsTable, playlistTracksTable } from "@workspace/db/schema";
import { eq, and, or } from "drizzle-orm";
import { addToQueue, joinChannel } from "./queue.js";
import play from "play-dl";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function resolveTrackInfo(query: string): Promise<{ url: string; title: string; duration: string } | null> {
  try {
    if (play.yt_validate(query) === "video") {
      const info = await play.video_info(query);
      return {
        url: query,
        title: info.video_details.title ?? "Unknown Title",
        duration: formatDuration(info.video_details.durationInSec ?? 0),
      };
    } else {
      const results = await play.search(query, { source: { youtube: "video" }, limit: 1 });
      if (!results || results.length === 0) return null;
      const video = results[0];
      return {
        url: video.url,
        title: video.title ?? "Unknown Title",
        duration: formatDuration(video.durationInSec ?? 0),
      };
    }
  } catch {
    return null;
  }
}

export async function createPlaylist(message: Message, args: string[]): Promise<void> {
  const name = args.join(" ").trim();
  if (!name) {
    await message.reply("Usage: `!pl create <playlist name>`");
    return;
  }

  const guildId = message.guild!.id;

  const existing = await db
    .select()
    .from(playlistsTable)
    .where(and(eq(playlistsTable.guildId, guildId), eq(playlistsTable.ownerId, message.author.id), eq(playlistsTable.name, name)));

  if (existing.length > 0) {
    await message.reply(`You already have a playlist named **${name}**.`);
    return;
  }

  await db.insert(playlistsTable).values({
    name,
    ownerId: message.author.id,
    ownerName: message.author.username,
    guildId,
    isPublic: false,
  });

  await message.reply(`✅ Playlist **${name}** created (private). Use \`!pl add ${name} | <song>\` to add songs.`);
}

export async function deletePlaylist(message: Message, args: string[]): Promise<void> {
  const name = args.join(" ").trim();
  if (!name) {
    await message.reply("Usage: `!pl delete <playlist name>`");
    return;
  }

  const guildId = message.guild!.id;

  const playlist = await db
    .select()
    .from(playlistsTable)
    .where(and(eq(playlistsTable.guildId, guildId), eq(playlistsTable.ownerId, message.author.id), eq(playlistsTable.name, name)));

  if (playlist.length === 0) {
    await message.reply(`You don't have a playlist named **${name}**.`);
    return;
  }

  await db.delete(playlistsTable).where(eq(playlistsTable.id, playlist[0].id));
  await message.reply(`🗑️ Playlist **${name}** deleted.`);
}

export async function addTrackToPlaylist(message: Message, args: string[]): Promise<void> {
  const combined = args.join(" ");
  const parts = combined.split("|");
  if (parts.length < 2) {
    await message.reply("Usage: `!pl add <playlist name> | <song name or YouTube URL>`");
    return;
  }

  const playlistName = parts[0].trim();
  const query = parts[1].trim();
  const guildId = message.guild!.id;

  const playlists = await db
    .select()
    .from(playlistsTable)
    .where(and(eq(playlistsTable.guildId, guildId), eq(playlistsTable.ownerId, message.author.id), eq(playlistsTable.name, playlistName)));

  if (playlists.length === 0) {
    await message.reply(`You don't have a playlist named **${playlistName}**.`);
    return;
  }

  const playlist = playlists[0];
  await message.reply(`🔍 Searching for: **${query}**`);

  const track = await resolveTrackInfo(query);
  if (!track) {
    await message.reply("Could not find that song. Try a different search term or YouTube URL.");
    return;
  }

  const existingTracks = await db
    .select()
    .from(playlistTracksTable)
    .where(eq(playlistTracksTable.playlistId, playlist.id));

  await db.insert(playlistTracksTable).values({
    playlistId: playlist.id,
    url: track.url,
    title: track.title,
    duration: track.duration,
    addedBy: message.author.username,
    position: existingTracks.length + 1,
  });

  await message.reply(`✅ Added **${track.title}** [${track.duration}] to playlist **${playlistName}**.`);
}

export async function removeTrackFromPlaylist(message: Message, args: string[]): Promise<void> {
  const combined = args.join(" ");
  const parts = combined.split("|");
  if (parts.length < 2) {
    await message.reply("Usage: `!pl remove <playlist name> | <track number>`");
    return;
  }

  const playlistName = parts[0].trim();
  const trackNum = parseInt(parts[1].trim(), 10);
  const guildId = message.guild!.id;

  if (isNaN(trackNum) || trackNum < 1) {
    await message.reply("Please provide a valid track number.");
    return;
  }

  const playlists = await db
    .select()
    .from(playlistsTable)
    .where(and(eq(playlistsTable.guildId, guildId), eq(playlistsTable.ownerId, message.author.id), eq(playlistsTable.name, playlistName)));

  if (playlists.length === 0) {
    await message.reply(`You don't have a playlist named **${playlistName}**.`);
    return;
  }

  const playlist = playlists[0];
  const tracks = await db
    .select()
    .from(playlistTracksTable)
    .where(eq(playlistTracksTable.playlistId, playlist.id));

  if (trackNum > tracks.length) {
    await message.reply(`Track #${trackNum} doesn't exist. The playlist has ${tracks.length} tracks.`);
    return;
  }

  const track = tracks[trackNum - 1];
  await db.delete(playlistTracksTable).where(eq(playlistTracksTable.id, track.id));
  await message.reply(`🗑️ Removed **${track.title}** from playlist **${playlistName}**.`);
}

export async function showPlaylist(message: Message, args: string[]): Promise<void> {
  const combined = args.join(" ").trim();
  const guildId = message.guild!.id;

  let playlists;

  if (!combined) {
    playlists = await db
      .select()
      .from(playlistsTable)
      .where(and(eq(playlistsTable.guildId, guildId), eq(playlistsTable.ownerId, message.author.id)));

    if (playlists.length === 0) {
      await message.reply("You have no playlists. Create one with `!pl create <name>`.");
      return;
    }

    const list = playlists
      .map((p) => `• **${p.name}** — ${p.isPublic ? "🌍 Public" : "🔒 Private"} | Owner: ${p.ownerName}`)
      .join("\n");
    await message.reply(`📋 **Your Playlists:**\n${list}`);
    return;
  }

  playlists = await db
    .select()
    .from(playlistsTable)
    .where(
      and(
        eq(playlistsTable.guildId, guildId),
        eq(playlistsTable.name, combined),
        or(eq(playlistsTable.ownerId, message.author.id), eq(playlistsTable.isPublic, true))
      )
    );

  if (playlists.length === 0) {
    await message.reply(`No accessible playlist named **${combined}** found.`);
    return;
  }

  const playlist = playlists[0];
  const tracks = await db
    .select()
    .from(playlistTracksTable)
    .where(eq(playlistTracksTable.playlistId, playlist.id));

  if (tracks.length === 0) {
    await message.reply(`Playlist **${playlist.name}** is empty. Add songs with \`!pl add ${playlist.name} | <song>\`.`);
    return;
  }

  const trackList = tracks
    .sort((a, b) => a.position - b.position)
    .map((t, i) => `${i + 1}. **${t.title}** [${t.duration}] — ${t.addedBy}`)
    .join("\n");

  const visibility = playlist.isPublic ? "🌍 Public" : "🔒 Private";
  await message.reply(`📋 **${playlist.name}** (${visibility}) by ${playlist.ownerName} — ${tracks.length} tracks:\n${trackList}`);
}

export async function listPublicPlaylists(message: Message): Promise<void> {
  const guildId = message.guild!.id;

  const playlists = await db
    .select()
    .from(playlistsTable)
    .where(and(eq(playlistsTable.guildId, guildId), eq(playlistsTable.isPublic, true)));

  if (playlists.length === 0) {
    await message.reply("No public playlists in this server yet.");
    return;
  }

  const list = playlists
    .map((p) => `• **${p.name}** by ${p.ownerName}`)
    .join("\n");
  await message.reply(`🌍 **Public Playlists in this server:**\n${list}\n\nPlay one with \`!pl play <name>\``);
}

export async function setPlaylistVisibility(message: Message, args: string[]): Promise<void> {
  if (args.length < 2) {
    await message.reply("Usage: `!pl privacy <playlist name> <public|private>`");
    return;
  }

  const visibility = args[args.length - 1].toLowerCase();
  if (visibility !== "public" && visibility !== "private") {
    await message.reply("Visibility must be `public` or `private`.");
    return;
  }

  const playlistName = args.slice(0, -1).join(" ").trim();
  const guildId = message.guild!.id;

  const playlists = await db
    .select()
    .from(playlistsTable)
    .where(and(eq(playlistsTable.guildId, guildId), eq(playlistsTable.ownerId, message.author.id), eq(playlistsTable.name, playlistName)));

  if (playlists.length === 0) {
    await message.reply(`You don't have a playlist named **${playlistName}**.`);
    return;
  }

  const isPublic = visibility === "public";
  await db
    .update(playlistsTable)
    .set({ isPublic, updatedAt: new Date() })
    .where(eq(playlistsTable.id, playlists[0].id));

  const icon = isPublic ? "🌍" : "🔒";
  await message.reply(`${icon} Playlist **${playlistName}** is now **${visibility}**.`);
}

export async function playPlaylist(message: Message, args: string[]): Promise<void> {
  const playlistName = args.join(" ").trim();
  if (!playlistName) {
    await message.reply("Usage: `!pl play <playlist name>`");
    return;
  }

  const guildId = message.guild!.id;

  const playlists = await db
    .select()
    .from(playlistsTable)
    .where(
      and(
        eq(playlistsTable.guildId, guildId),
        eq(playlistsTable.name, playlistName),
        or(eq(playlistsTable.ownerId, message.author.id), eq(playlistsTable.isPublic, true))
      )
    );

  if (playlists.length === 0) {
    await message.reply(`No accessible playlist named **${playlistName}** found. It may be private.`);
    return;
  }

  const playlist = playlists[0];
  const tracks = await db
    .select()
    .from(playlistTracksTable)
    .where(eq(playlistTracksTable.playlistId, playlist.id));

  if (tracks.length === 0) {
    await message.reply(`Playlist **${playlistName}** is empty.`);
    return;
  }

  const queue = await joinChannel(message);
  if (!queue) return;

  const sorted = tracks.sort((a, b) => a.position - b.position);

  await message.reply(`▶️ Loading playlist **${playlistName}** (${tracks.length} tracks)...`);

  for (const track of sorted) {
    await addToQueue(message, track.url, true);
  }

  await message.reply(`✅ Added all ${tracks.length} tracks from **${playlistName}** to the queue.`);
}
