> Depreacted: suvadu supports opencode natively now https://github.com/AppachiTech/suvadu/issues/8

# suvadu-opencode-hook

OpenCode plugin that logs OpenCode `bash` tool executions into [Suvadu](https://github.com/AppachiTech/suvadu), so AI-run shell commands show up in your command history and reports.

## Requirements

- OpenCode
- `suv` (Suvadu CLI) installed and available in `PATH`

## Install

### Option A: Global file plugin (simple)

```bash
mkdir -p ~/.config/opencode/plugins
cp ./suvadu-shell-hook.js ~/.config/opencode/plugins/
```

Restart OpenCode.

### Option B: Project-local plugin

```bash
mkdir -p .opencode/plugins
cp ./suvadu-shell-hook.js .opencode/plugins/
```

This keeps the plugin scoped to one repo/project.

### Option C: OpenCode config (`plugin`) via npm package

OpenCode can install plugins from npm through `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["<published-package-name>"]
}
```

For this repo, Option C works after publishing this plugin as an npm package.

## How it works

- Hooks OpenCode `tool.execute.before` and `tool.execute.after` for the `bash` tool.
- Captures command, cwd, timing, session id, and exit code (when available).
- Writes entries with:

```bash
suv add --executor-type agent --executor opencode ...
```

## Verify

Run a command through OpenCode bash tool (for example, `echo hello`), then check:

```bash
suv search --executor opencode
```

## License

MIT. See `LICENSE`.
