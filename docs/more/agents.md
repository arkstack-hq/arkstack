# AI Agent Support

Arkstack includes two agent-facing reference files at the repository root:

- `SKILLS.md` documents discrete capabilities an agent can call, including CLI commands, file operations, generation commands, and verification steps.
- `AGENTS.md` documents higher-order workflows that compose those capabilities, such as adding endpoints, database-backed features, views, middleware, and documentation.

These files are written for AI coding tools such as Claude, Codex, Cursor, and other agents that accept project knowledge, rules, or context. They help an agent work with Arkstack conventions instead of guessing folder names or hand-writing files that the CLI can generate.

## Raw URLs

Use the raw GitHub URLs when an agent asks for remote context:

```txt
https://raw.githubusercontent.com/arkstack-hq/arkstack/main/SKILLS.md
https://raw.githubusercontent.com/arkstack-hq/arkstack/main/AGENTS.md
```

If you are working from a release branch or fork, replace `main` with the branch, tag, or repository that matches your project.

## Claude

In Claude, add both files to project knowledge:

1. Open your Claude project.
2. Add the raw `SKILLS.md` URL or paste its contents as project knowledge.
3. Add the raw `AGENTS.md` URL or paste its contents as project knowledge.
4. Tell Claude that the files describe Arkstack project conventions and should be followed when editing your app.

For task-specific chats, you can also paste the two raw URLs into the conversation and ask Claude to read them before proposing changes.

## Codex

In Codex or Codex-powered IDE contexts, provide both files as repository context or prompt context before asking for code changes.

Useful instruction:

```txt
Read Arkstack SKILLS.md and AGENTS.md first, then use the documented CLI commands and workflows when editing this project.
```

When Codex has terminal access, it should still inspect the local `package.json`, route files, and nearby source because your scaffolded app may have custom commands or local conventions.

## Cursor

In Cursor, use the files as rules or context:

1. Add the raw URLs to Cursor docs/context if your setup supports remote docs.
2. Or create project rules that reference the contents of `SKILLS.md` and `AGENTS.md`.
3. Ask Cursor to prefer Arkstack CLI generators before creating controllers, resources, models, migrations, views, or commands manually.

The most important rule is to make the agent inspect local files first, then use the Arkstack workflow that matches the task.

## What Agents Can Do

With these files, an agent can usually perform these tasks out of the box:

- Inspect the app runtime and package manager.
- Run development, build, lint, test, and docs commands.
- List registered routes with `pnpm ark route:list`.
- Generate controllers, resources, and full API resource sets.
- Generate models, migrations, factories, and seeders in full templates.
- Run safe database workflows after confirming the target environment.
- Generate Edge views.
- Create custom console commands.
- Add middleware, services, resources, and tests using Arkstack conventions.
- Update VitePress documentation and sidebar entries.

## Agent-Friendly Conventions

Keep your project easy for agents to understand:

- Keep `package.json` scripts current.
- Keep generated Arkstack files in their conventional directories.
- Keep `.env.example` updated when adding configuration.
- Document custom stubs, custom console commands, and unusual bootstrap behavior.
- Add tests near the behavior they cover.
- Prefer services for business logic once controllers become more than simple request orchestration.
- Keep runtime-specific code near drivers, middleware, or bootstrap files.
- Avoid editing generated build output such as `dist`, `.arkstack/build`, or coverage files.

## Safety

Agents should ask before destructive operations, including:

- `pnpm ark migrate:fresh`
- broad migration rollbacks against non-local data
- forced storage links
- overwriting generated files with `--force`
- deleting files
- publishing packages or creating releases

When in doubt, ask the agent to show the exact command it plans to run before it runs it.
