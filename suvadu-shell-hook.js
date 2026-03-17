// @ts-check

/**
 * @typedef {object} InflightRun
 * @property {string} command
 * @property {string} cwd
 * @property {number} startedAt
 * @property {string} sessionID
 */

/** @type {Map<string, InflightRun>} */
const inflight = new Map()

/** @param {unknown} value */
function toInt(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value)
  return undefined
}

/** @param {unknown} metadata */
function extractExitCode(metadata) {
  if (!metadata || typeof metadata !== "object") return undefined
  const record = /** @type {Record<string, unknown>} */ (metadata)
  return toInt(record.exitCode) ?? toInt(record.exit_code) ?? toInt(record.statusCode) ?? toInt(record.status_code) ?? toInt(record.status) ?? toInt(record.code)
}

/** @param {unknown} args @param {string} fallback */
function extractCwd(args, fallback) {
  if (!args || typeof args !== "object") return fallback
  const record = /** @type {Record<string, unknown>} */ (args)
  if (typeof record.workdir === "string" && record.workdir.length > 0) return record.workdir
  if (typeof record.cwd === "string" && record.cwd.length > 0) return record.cwd
  return fallback
}

/** @param {string} command */
function isSuvaduCommand(command) {
  const trimmed = command.trim()
  return trimmed.startsWith("suv ") || trimmed.startsWith("suvadu ") || trimmed === "suv" || trimmed === "suvadu"
}

/** @type {import("@opencode-ai/plugin").Plugin} */
export const SuvaduShellHookPlugin = async ({ $, client, directory }) => {
  let suvAvailable = true
  try {
    await $`suv --version`.quiet()
  } catch {
    suvAvailable = false
    await client.app.log({
      body: {
        service: "suvadu-shell-hook",
        level: "warn",
        message: "suv binary not found; shell hook capture disabled",
      },
    })
  }

  return {
    "shell.env": async (input, output) => {
      output.env.OPENCODE_SESSION_ID = input.sessionID ?? ""
      output.env.SUVADU_EXECUTOR = "opencode"
    },

    "tool.execute.before": async (input, output) => {
      if (!suvAvailable || input.tool !== "bash") return

      const command = typeof output.args?.command === "string" ? output.args.command.trim() : ""
      if (!command || isSuvaduCommand(command)) return

      inflight.set(input.callID, {
        command,
        cwd: extractCwd(output.args, directory),
        startedAt: Date.now(),
        sessionID: `opencode-${input.sessionID}`,
      })
    },

    "tool.execute.after": async (input, output) => {
      if (!suvAvailable || input.tool !== "bash") return

      const run = inflight.get(input.callID)
      if (!run) return
      inflight.delete(input.callID)

      const endedAt = Date.now()
      const exitCode = extractExitCode(output.metadata)

      try {
        if (typeof exitCode === "number") {
          await $`suv add --session-id ${run.sessionID} --command ${run.command} --cwd ${run.cwd} --exit-code ${String(exitCode)} --started-at ${String(run.startedAt)} --ended-at ${String(endedAt)} --executor-type agent --executor opencode`.quiet()
        } else {
          await $`suv add --session-id ${run.sessionID} --command ${run.command} --cwd ${run.cwd} --started-at ${String(run.startedAt)} --ended-at ${String(endedAt)} --executor-type agent --executor opencode`.quiet()
        }
      } catch (error) {
        await client.app.log({
          body: {
            service: "suvadu-shell-hook",
            level: "warn",
            message: "failed to write command to suvadu",
            extra: {
              error: String(error),
              command: run.command,
            },
          },
        })
      }
    },
  }
}
