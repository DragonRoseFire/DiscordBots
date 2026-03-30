import { Client, TextChannel } from "discord.js";
import { db, tasksTable } from "@workspace/db";
import { eq, and, lte, gt, ne } from "drizzle-orm";
import { buildTaskEmbed } from "../utils/embeds.js";

export function startReminderJob(client: Client) {
  // Check every hour for due tasks
  setInterval(async () => {
    await checkDueTasks(client);
  }, 60 * 60 * 1000);

  // Run once on startup after 10 seconds
  setTimeout(() => checkDueTasks(client), 10_000);
}

async function checkDueTasks(client: Client) {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueSoon = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          ne(tasksTable.status, "done"),
          lte(tasksTable.dueDate, in24h),
          gt(tasksTable.dueDate, now)
        )
      );

    for (const task of dueSoon) {
      try {
        const channel = await client.channels.fetch(task.channelId);
        if (!channel || !(channel instanceof TextChannel)) continue;

        const embed = buildTaskEmbed(task);
        const mention = task.assignedTo ? `<@${task.assignedTo}>` : "@here";
        await channel.send({
          content: `⏰ **Erinnerung:** ${mention} – Aufgabe **#${task.id}** ist in weniger als 24 Stunden fällig!`,
          embeds: [embed],
        });
      } catch {
        // channel might not be accessible, skip silently
      }
    }

    // Check overdue tasks
    const overdue = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          ne(tasksTable.status, "done"),
          lte(tasksTable.dueDate, now)
        )
      );

    for (const task of overdue) {
      try {
        const channel = await client.channels.fetch(task.channelId);
        if (!channel || !(channel instanceof TextChannel)) continue;

        const mention = task.assignedTo ? `<@${task.assignedTo}>` : "@here";
        await channel.send({
          content: `🔴 **ÜBERFÄLLIG:** ${mention} – Aufgabe **#${task.id}: ${task.title}** ist überfällig!`,
        });
      } catch {
        // skip silently
      }
    }
  } catch (err) {
    console.error("Fehler beim Reminder-Job:", err);
  }
}
