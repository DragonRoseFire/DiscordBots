import { ChatInputCommandInteraction } from "discord.js";
import { db, tasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { parseGermanDate } from "../utils/dateParser.js";
import { buildTaskEmbed } from "../utils/embeds.js";

export async function handleAufgabeBearbeiten(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const id = interaction.options.getInteger("id", true);
  const guildId = interaction.guildId!;

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.guildId, guildId)));

  if (!task) {
    await interaction.editReply({ content: `❌ Aufgabe **#${id}** wurde nicht gefunden.` });
    return;
  }

  // Only creator or admins can edit
  const member = await interaction.guild?.members.fetch(interaction.user.id);
  const isAdmin = member?.permissions.has("Administrator") || member?.permissions.has("ManageGuild");

  if (task.createdBy !== interaction.user.id && !isAdmin) {
    await interaction.editReply({
      content: "❌ Du kannst nur Aufgaben bearbeiten, die du selbst erstellt hast (oder wenn du Administrator-Rechte hast).",
    });
    return;
  }

  const titel = interaction.options.getString("titel");
  const beschreibung = interaction.options.getString("beschreibung");
  const enddatumStr = interaction.options.getString("enddatum");
  const person = interaction.options.getUser("person");
  const weiterePersonen = interaction.options.getString("weitere_personen");
  const info = interaction.options.getString("info");

  const updates: Partial<typeof tasksTable.$inferInsert> = { updatedAt: new Date() };

  if (titel) updates.title = titel;
  if (beschreibung) updates.description = beschreibung;
  if (info) updates.additionalInfo = info;

  if (enddatumStr) {
    const dueDate = parseGermanDate(enddatumStr);
    if (!dueDate) {
      await interaction.editReply({
        content:
          "❌ Ungültiges Datumsformat. Bitte verwende **DD.MM.YYYY** oder **DD.MM.YYYY HH:MM**",
      });
      return;
    }
    updates.dueDate = dueDate;
  }

  if (person) {
    updates.assignedTo = person.id;
    updates.assignedToName = person.username;
  }

  if (weiterePersonen) {
    const parts = weiterePersonen
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    updates.additionalPersons = parts;
  }

  const [updated] = await db
    .update(tasksTable)
    .set(updates)
    .where(eq(tasksTable.id, id))
    .returning();

  const embed = buildTaskEmbed(updated);
  const mentions: string[] = [];
  if (person) mentions.push(`<@${person.id}>`);

  await interaction.editReply({
    content: mentions.length > 0
      ? `✏️ Aufgabe **#${id}** wurde aktualisiert! ${mentions.join(", ")} – du wurdest neu zugewiesen.`
      : `✏️ Aufgabe **#${id}** wurde aktualisiert!`,
    embeds: [embed],
  });
}
