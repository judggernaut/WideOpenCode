import { app } from "electron"

type Channel = "local" | "dev" | "beta" | "prod"

const raw = import.meta.env.OPENCODE_CHANNEL

export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const VERSION = app.isPackaged ? app.getVersion() : (process.env.OPENCODE_VERSION ?? app.getVersion())

const appNames: Record<string, string> = {
  dev: "WideOpenCode Dev",
  beta: "WideOpenCode Beta",
  prod: "WideOpenCode",
}

const appIDs: Record<string, string> = {
  dev: "ai.wideopencode.desktop.dev",
  beta: "ai.wideopencode.desktop.beta",
  prod: "ai.wideopencode.desktop",
}

// Local renderer/server mode keeps the dev application identity.
export const APP_NAME = app.isPackaged ? appNames[CHANNEL] : "WideOpenCode Dev"

export const APP_ID = app.isPackaged ? appIDs[CHANNEL] : "ai.wideopencode.desktop.dev"
