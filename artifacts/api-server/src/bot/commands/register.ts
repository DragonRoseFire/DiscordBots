import {
  Client,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("aufgabe")
    .setDescription("Aufgabe erstellen")
    .addStringOption((opt) =>
      opt.setName("titel").setDescription("Titel der Aufgabe").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("beschreibung").setDescription("Was genau muss gemacht werden?").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("enddatum").setDescription("Enddatum (z.B. 31.12.2025 oder 31.12.2025 18:00)").setRequired(false)
    )
    .addUserOption((opt) =>
      opt.setName("person").setDescription("Wer muss die Aufgabe machen?").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("weitere_personen").setDescription("Weitere beteiligte Personen (kommagetrennte @Erwähnungen oder Namen)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("info").setDescription("Weitere Informationen").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("aufgaben")
    .setDescription("Aufgaben anzeigen")
    .addStringOption((opt) =>
      opt
        .setName("filter")
        .setDescription("Welche Aufgaben anzeigen?")
        .addChoices(
          { name: "Alle offenen", value: "open" },
          { name: "Meine Aufgaben", value: "mine" },
          { name: "Abgeschlossene", value: "done" },
          { name: "Alle", value: "all" }
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("übernehmen")
    .setDescription("Eine Aufgabe übernehmen")
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("Aufgaben-ID").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("erledigt")
    .setDescription("Eine Aufgabe als erledigt markieren")
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("Aufgaben-ID").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("aufgabe-info")
    .setDescription("Details einer Aufgabe anzeigen")
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("Aufgaben-ID").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("aufgabe-löschen")
    .setDescription("Eine Aufgabe löschen")
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("Aufgaben-ID").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("aufgabe-bearbeiten")
    .setDescription("Eine Aufgabe bearbeiten")
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("Aufgaben-ID").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("titel").setDescription("Neuer Titel").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("beschreibung").setDescription("Neue Beschreibung").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("enddatum").setDescription("Neues Enddatum (z.B. 31.12.2025 oder 31.12.2025 18:00)").setRequired(false)
    )
    .addUserOption((opt) =>
      opt.setName("person").setDescription("Neue zuständige Person").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("weitere_personen").setDescription("Neue weitere Personen").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("info").setDescription("Neue weitere Informationen").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("hilfe")
    .setDescription("Zeigt alle verfügbaren Befehle"),
];

export async function registerCommands(client: Client) {
  const token = process.env.DISCORD_BOT_TOKEN!;
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    // Register as global commands (works on all servers the bot is in)
    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands.map((c) => c.toJSON()) }
    );
    console.log(`✅ Befehle global registriert (kann bis zu 1 Stunde dauern, bis sie erscheinen)`);

    // Also register guild-specific for immediate availability on cached guilds
    const guilds = client.guilds.cache;
    for (const [guildId] of guilds) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(client.user!.id, guildId),
          { body: commands.map((c) => c.toJSON()) }
        );
        console.log(`✅ Befehle sofort für Server ${guildId} registriert`);
      } catch (err) {
        console.error(`❌ Fehler beim Registrieren für Server ${guildId}:`, err);
      }
    }
  } catch (err) {
    console.error("❌ Fehler beim Registrieren der Befehle:", err);
  }
}
