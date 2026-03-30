import { ChatInputCommandInteraction, EmbedBuilder, Colors } from "discord.js";

export async function handleHilfe(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle("📋 Aufgaben-Bot – Hilfe")
    .setColor(Colors.Blurple)
    .setDescription("Mit diesem Bot kannst du Aufgaben direkt in Discord verwalten.")
    .addFields(
      {
        name: "📌 Aufgabe erstellen",
        value:
          "`/aufgabe titel:Titel beschreibung:Was? enddatum:31.12.2025 person:@User weitere_personen:Name1, Name2 info:Weitere Infos`\n" +
          "Erstellt eine neue Aufgabe. Nur `titel` ist Pflicht.",
        inline: false,
      },
      {
        name: "📋 Aufgaben anzeigen",
        value:
          "`/aufgaben` – Alle offenen Aufgaben\n" +
          "`/aufgaben filter:Meine Aufgaben` – Nur deine Aufgaben\n" +
          "`/aufgaben filter:Abgeschlossene` – Erledigte Aufgaben\n" +
          "`/aufgaben filter:Alle` – Alle Aufgaben",
        inline: false,
      },
      {
        name: "🔍 Aufgabe Details",
        value: "`/aufgabe-info id:5` – Zeigt alle Details zu Aufgabe #5",
        inline: false,
      },
      {
        name: "✋ Aufgabe übernehmen",
        value: "`/übernehmen id:5` – Übernimm Aufgabe #5 (du wirst als Zuständiger eingetragen)",
        inline: false,
      },
      {
        name: "✅ Aufgabe erledigen",
        value: "`/erledigt id:5` – Markiere Aufgabe #5 als erledigt",
        inline: false,
      },
      {
        name: "✏️ Aufgabe bearbeiten",
        value:
          "`/aufgabe-bearbeiten id:5 titel:Neuer Titel enddatum:01.02.2026`\n" +
          "Bearbeite eine bestehende Aufgabe (nur Ersteller oder Admins)",
        inline: false,
      },
      {
        name: "🗑️ Aufgabe löschen",
        value: "`/aufgabe-löschen id:5` – Löscht Aufgabe #5 (nur Ersteller oder Admins)",
        inline: false,
      },
      {
        name: "⏰ Erinnerungen",
        value: "Der Bot erinnert automatisch an Aufgaben, die in weniger als 24 Stunden fällig sind, und weist auf überfällige Aufgaben hin.",
        inline: false,
      },
      {
        name: "📅 Datumsformat",
        value: "Verwende `DD.MM.YYYY` oder `DD.MM.YYYY HH:MM` (z.B. `31.12.2025` oder `31.12.2025 18:00`)",
        inline: false,
      }
    )
    .setFooter({ text: "Aufgaben-Bot" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
