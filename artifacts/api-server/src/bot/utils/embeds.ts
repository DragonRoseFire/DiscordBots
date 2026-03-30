import { EmbedBuilder, Colors } from "discord.js";
import type { Task } from "@workspace/db";
import { formatGermanDate, getDueDateStatus } from "./dateParser.js";

export function buildTaskEmbed(task: Task): EmbedBuilder {
  const statusEmoji =
    task.status === "done" ? "✅" : task.status === "in_progress" ? "🔄" : "📋";
  const statusLabel =
    task.status === "done"
      ? "Erledigt"
      : task.status === "in_progress"
      ? "In Bearbeitung"
      : "Offen";

  const color =
    task.status === "done"
      ? Colors.Green
      : task.status === "in_progress"
      ? Colors.Blue
      : Colors.Orange;

  const embed = new EmbedBuilder()
    .setTitle(`${statusEmoji} Aufgabe #${task.id}: ${task.title}`)
    .setColor(color)
    .setTimestamp(task.createdAt);

  if (task.description) {
    embed.addFields({ name: "📝 Was genau?", value: task.description });
  }

  embed.addFields({ name: "📊 Status", value: statusLabel, inline: true });

  if (task.assignedTo) {
    embed.addFields({
      name: "👤 Zuständig",
      value: `<@${task.assignedTo}> (${task.assignedToName})`,
      inline: true,
    });
  } else {
    embed.addFields({ name: "👤 Zuständig", value: "Niemand (offen)", inline: true });
  }

  if (task.dueDate) {
    const dateStr = formatGermanDate(new Date(task.dueDate));
    const status = getDueDateStatus(new Date(task.dueDate));
    embed.addFields({
      name: "📅 Enddatum",
      value: `${dateStr}\n${status}`,
      inline: true,
    });
  }

  if (task.additionalPersons && task.additionalPersons.length > 0) {
    embed.addFields({
      name: "👥 Weitere Personen",
      value: task.additionalPersons.join(", "),
      inline: false,
    });
  }

  if (task.additionalInfo) {
    embed.addFields({ name: "ℹ️ Weitere Infos", value: task.additionalInfo });
  }

  embed.setFooter({
    text: `Erstellt von ${task.createdByName} | Aufgaben-ID: ${task.id}`,
  });

  return embed;
}

export function buildTaskListEmbed(
  tasks: Task[],
  title: string,
  description: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(Colors.Blurple)
    .setTimestamp();

  if (tasks.length === 0) {
    embed.setDescription("Keine Aufgaben gefunden.");
    return embed;
  }

  for (const task of tasks.slice(0, 25)) {
    const statusEmoji =
      task.status === "done" ? "✅" : task.status === "in_progress" ? "🔄" : "📋";
    const assignee = task.assignedToName ? ` → ${task.assignedToName}` : " → Niemand";
    const due = task.dueDate
      ? ` | 📅 ${new Date(task.dueDate).toLocaleDateString("de-DE")}`
      : "";
    const overdue =
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done"
        ? " 🔴"
        : "";

    embed.addFields({
      name: `${statusEmoji} #${task.id} ${task.title}${overdue}`,
      value: `${assignee}${due}`,
      inline: false,
    });
  }

  if (tasks.length > 25) {
    embed.setFooter({ text: `Zeige 25 von ${tasks.length} Aufgaben` });
  }

  return embed;
}
