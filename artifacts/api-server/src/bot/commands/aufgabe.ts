import { ChatInputCommandInteraction } from "discord.js";
import { db, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { parseGermanDate } from "../utils/dateParser.js";
import { buildTaskEmbed } from "../utils/embeds.js";

export async function handleAufgabe(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const titel = interaction.options.getString("titel", true);
  const beschreibung = interaction.options.getString("beschreibung");
  const enddatumStr = interaction.options.getString("enddatum");
  const person = interaction.options.getUser("person");
  const weiterePersonen = interaction.options.getString("weitere_personen");
  const info = interaction.options.getString("info");

  let dueDate: Date | null = null;
  if (enddatumStr) {
    dueDate = parseGermanDate(enddatumStr);
    if (!dueDate) {
      await interaction.editReply({
        content:
          "❌ Ungültiges Datumsformat. Bitte verwende **DD.MM.YYYY** oder **DD.MM.YYYY HH:MM** (z.B. `31.12.2025` oder `31.12.2025 18:00`)",
      });
      return;
    }
  }

  const additionalPersons: string[] = [];
  if (weiterePersonen) {
    const parts = weiterePersonen
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    additionalPersons.push(...parts);
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      guildId: interaction.guildId!,
      channelId: interaction.channelId,
      title: titel,
      description: beschreibung ?? undefined,
      dueDate: dueDate ?? undefined,
      assignedTo: person?.id ?? undefined,
      assignedToName: person?.username ?? undefined,
      additionalPersons: additionalPersons.length > 0 ? additionalPersons : undefined,
      additionalInfo: info ?? undefined,
      status: "open",
      createdBy: interaction.user.id,
      createdByName: interaction.user.username,
    })
    .returning();

  const embed = buildTaskEmbed(task);

  const mentions: string[] = [];
  if (person) mentions.push(`<@${person.id}>`);

  const content =
    mentions.length > 0
      ? `📋 Neue Aufgabe erstellt! ${mentions.join(", ")} – du wurdest zugewiesen.`
      : "📋 Neue Aufgabe erstellt!";

  const msg = await interaction.editReply({ content, embeds: [embed] });

  await db
    .update(tasksTable)
    .set({ messageId: msg.id })
    .where(eq(tasksTable.id, task.id));
}
