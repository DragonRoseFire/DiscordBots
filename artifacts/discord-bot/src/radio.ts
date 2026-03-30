import {
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnection,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import { Message, TextChannel } from "discord.js";
import { spawn } from "child_process";

export interface RadioStation {
  name: string;
  url: string;
  genre: string;
}

export const STATIONS: Record<string, RadioStation> = {
  "antenne bayern":       { name: "Antenne Bayern",       url: "https://s1-webradio.antenne.de/antenne",             genre: "Pop/Rock" },
  "antenne":              { name: "Antenne Bayern",       url: "https://s1-webradio.antenne.de/antenne",             genre: "Pop/Rock" },
  "1live":                { name: "1LIVE",                url: "https://wdr-1live-live.icecastssl.wdr.de/wdr/1live/live/mp3/128/stream.mp3", genre: "Pop/Rock" },
  "ndr":                  { name: "NDR 2",                url: "https://ndr-ndr2-live.sslcast.addradio.de/ndr/ndr2/live/mp3/128/stream.mp3", genre: "Pop" },
  "ndr 2":                { name: "NDR 2",                url: "https://ndr-ndr2-live.sslcast.addradio.de/ndr/ndr2/live/mp3/128/stream.mp3", genre: "Pop" },
  "swr3":                 { name: "SWR3",                 url: "https://liveradio.swr.de/sw282p3/swr3/play.mp3",     genre: "Pop/Rock" },
  "bayern 3":             { name: "Bayern 3",             url: "https://br-br3-live.cast.addradio.de/br/br3/live/mp3/128/stream.mp3", genre: "Pop" },
  "top 40":               { name: "Radio Top 40",         url: "https://streams.rautemusik.fm/top40",                genre: "Top 40" },
  "rautemusik":           { name: "RauteMusik",           url: "https://streams.rautemusik.fm/main",                 genre: "Mainstream" },
  "lounge":               { name: "RauteMusik Lounge",    url: "https://streams.rautemusik.fm/lounge",               genre: "Lounge/Chill" },
  "techno":               { name: "RauteMusik Techno",    url: "https://streams.rautemusik.fm/techno",               genre: "Techno" },
  "metal":                { name: "RauteMusik Metal",     url: "https://streams.rautemusik.fm/metal",                genre: "Metal" },
  "hardstyle":            { name: "RauteMusik Hardstyle", url: "https://streams.rautemusik.fm/hardstyle",            genre: "Hardstyle" },
  "schlager":             { name: "RauteMusik Schlager",  url: "https://streams.rautemusik.fm/schlager",             genre: "Schlager" },
  "jazz":                 { name: "Jazz Radio",           url: "https://streaming.radio.co/s774887f7b/listen",       genre: "Jazz" },
  "classical":            { name: "Classic FM",           url: "https://media-ice.musicradio.com/ClassicFMMP3",      genre: "Classical" },
  "klassik":              { name: "Classic FM",           url: "https://media-ice.musicradio.com/ClassicFMMP3",      genre: "Classical" },
  "chill":                { name: "Chillout Zone",        url: "https://streams.rautemusik.fm/lounge",               genre: "Chill" },
  "deep house":           { name: "RauteMusik House",     url: "https://streams.rautemusik.fm/deephouse",            genre: "Deep House" },
  "house":                { name: "RauteMusik House",     url: "https://streams.rautemusik.fm/deephouse",            genre: "House" },
  "hip hop":              { name: "RauteMusik Hip-Hop",   url: "https://streams.rautemusik.fm/hiphop",               genre: "Hip-Hop" },
  "hiphop":               { name: "RauteMusik Hip-Hop",   url: "https://streams.rautemusik.fm/hiphop",               genre: "Hip-Hop" },
  "rap":                  { name: "RauteMusik Hip-Hop",   url: "https://streams.rautemusik.fm/hiphop",               genre: "Hip-Hop" },
  "rock":                 { name: "RauteMusik Rock",      url: "https://streams.rautemusik.fm/rock",                 genre: "Rock" },
  "country":              { name: "RauteMusik Country",   url: "https://streams.rautemusik.fm/country",              genre: "Country" },
  "80s":                  { name: "RauteMusik 80er",      url: "https://streams.rautemusik.fm/80er",                 genre: "80s" },
  "80er":                 { name: "RauteMusik 80er",      url: "https://streams.rautemusik.fm/80er",                 genre: "80s" },
  "90s":                  { name: "RauteMusik 90er",      url: "https://streams.rautemusik.fm/90er",                 genre: "90s" },
  "90er":                 { name: "RauteMusik 90er",      url: "https://streams.rautemusik.fm/90er",                 genre: "90s" },
  "2000s":                { name: "RauteMusik 2000er",    url: "https://streams.rautemusik.fm/2000er",               genre: "2000s" },
  "2000er":               { name: "RauteMusik 2000er",    url: "https://streams.rautemusik.fm/2000er",               genre: "2000s" },
  "christmas":            { name: "Christmas Radio",      url: "https://streams.rautemusik.fm/weihnachten",          genre: "Christmas" },
  "weihnachten":          { name: "Weihnachtsradio",      url: "https://streams.rautemusik.fm/weihnachten",          genre: "Weihnachten" },
};

interface RadioState {
  player: AudioPlayer;
  connection: VoiceConnection;
  station: RadioStation;
  textChannel: TextChannel;
  ffmpegProcess: ReturnType<typeof spawn> | null;
}

const radioPlayers = new Map<string, RadioState>();

export function getRadioState(guildId: string): RadioState | undefined {
  return radioPlayers.get(guildId);
}

function createFfmpegStream(url: string) {
  const ffmpeg = spawn("ffmpeg", [
    "-reconnect", "1",
    "-reconnect_streamed", "1",
    "-reconnect_delay_max", "5",
    "-user_agent", "Mozilla/5.0 (compatible; DiscordBot)",
    "-i", url,
    "-analyzeduration", "0",
    "-loglevel", "warning",
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "pipe:1",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  ffmpeg.stderr?.on("data", (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.log("[ffmpeg radio]", msg);
  });

  return ffmpeg;
}

export async function playRadio(message: Message, stationKey: string): Promise<void> {
  if (!message.member?.voice.channel) {
    await message.reply("You need to be in a voice channel first!");
    return;
  }

  const station = STATIONS[stationKey.toLowerCase()];
  if (!station) {
    const available = listStations();
    await message.reply(
      `❌ Unknown station **${stationKey}**.\n\nAvailable stations:\n${available}\n\nUsage: \`!radio play <station>\``
    );
    return;
  }

  const guildId = message.guild!.id;

  const existing = radioPlayers.get(guildId);
  if (existing) {
    existing.ffmpegProcess?.kill("SIGKILL");
    existing.player.stop();
    existing.connection.destroy();
    radioPlayers.delete(guildId);
  }

  await message.reply(`📻 Connecting to **${station.name}** (${station.genre})...`);

  try {
    const ffmpeg = createFfmpegStream(station.url);

    if (!ffmpeg.stdout) {
      throw new Error("ffmpeg stdout unavailable");
    }

    const connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId,
      adapterCreator: message.guild!.voiceAdapterCreator,
    });

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
    });

    connection.subscribe(player);
    player.play(resource);

    await entersState(player, AudioPlayerStatus.Playing, 15_000);

    const state: RadioState = {
      player,
      connection,
      station,
      textChannel: message.channel as TextChannel,
      ffmpegProcess: ffmpeg,
    };
    radioPlayers.set(guildId, state);

    player.on(AudioPlayerStatus.Idle, () => {
      const s = radioPlayers.get(guildId);
      if (s) {
        s.textChannel.send(`📻 Radio stream ended for **${station.name}**.`).catch(() => {});
        s.ffmpegProcess?.kill("SIGKILL");
        s.connection.destroy();
        radioPlayers.delete(guildId);
      }
    });

    player.on("error", (err) => {
      console.error("Radio player error:", err.message);
      const s = radioPlayers.get(guildId);
      if (s) {
        s.textChannel.send(`❌ Radio error: ${err.message}`).catch(() => {});
        s.ffmpegProcess?.kill("SIGKILL");
        s.connection.destroy();
        radioPlayers.delete(guildId);
      }
    });

    ffmpeg.on("error", (err) => {
      console.error("ffmpeg process error:", err.message);
    });

    await (message.channel as TextChannel).send(
      `📻 Now streaming **${station.name}** — *${station.genre}*\nUse \`!radio stop\` to stop.`
    );
  } catch (err: any) {
    console.error("Radio connect error:", err.message);
    await message.reply(`❌ Failed to stream **${station.name}**: ${err.message}`);
  }
}

export function stopRadio(guildId: string): RadioStation | null {
  const state = radioPlayers.get(guildId);
  if (!state) return null;
  state.ffmpegProcess?.kill("SIGKILL");
  state.player.stop();
  state.connection.destroy();
  radioPlayers.delete(guildId);
  return state.station;
}

export function listStations(): string {
  const unique = Object.values(STATIONS).filter(
    (s, i, arr) => arr.findIndex((x) => x.name === s.name) === i
  );
  return unique.map((s) => `• **${s.name}** — ${s.genre}`).join("\n");
}
