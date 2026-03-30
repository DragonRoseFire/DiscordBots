# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Discord bot**: discord.js v14, @discordjs/voice, play-dl

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── discord-bot/        # Discord music bot
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Discord Music Bot (`artifacts/discord-bot`)

A full-featured Discord music bot with playlist management.

### Requirements
- `DISCORD_BOT_TOKEN` secret must be set
- `Message Content Intent` must be enabled in Discord Developer Portal
- `Server Members Intent` is optional

### Commands

**Playback:**
- `!play <song or URL>` — Search YouTube and play
- `!skip` — Skip current song
- `!stop` — Stop and clear queue
- `!pause` / `!resume` — Pause/resume
- `!queue` — Show queue
- `!nowplaying` — Show current song
- `!help` — Show all commands

**Playlists:**
- `!pl create <name>` — Create playlist (private by default)
- `!pl delete <name>` — Delete your playlist
- `!pl add <name> | <song>` — Add a song to a playlist
- `!pl remove <name> | <track #>` — Remove a track
- `!pl show` — List your playlists
- `!pl show <name>` — Show tracks in a playlist
- `!pl public` — List all public playlists in the server
- `!pl play <name>` — Play a playlist (yours or public)
- `!pl privacy <name> public|private` — Change visibility

### Database Tables
- `playlists` — Stores playlist metadata (owner, guild, visibility)
- `playlist_tracks` — Stores tracks per playlist

### Run
```bash
pnpm --filter @workspace/discord-bot run dev
```

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/`.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `pnpm --filter @workspace/db run push` — sync schema to DB

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen.

- `pnpm --filter @workspace/api-spec run codegen` — regenerate client
