import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "../../shared/schemas";
import type { Db } from "./db";
import { schema } from "./db";

/** Reads settings (defaults merged). doorCode is only included when `includeSecret` is true. */
export async function readSettings(db: Db, includeSecret: boolean): Promise<Settings> {
  const rows = await db.select().from(schema.settings);
  const raw: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      raw[r.key] = JSON.parse(r.value);
    } catch {
      /* ignore corrupt value */
    }
  }
  const parsed = settingsSchema.safeParse(raw);
  const s: Settings = parsed.success ? parsed.data : { ...DEFAULT_SETTINGS };
  if (!includeSecret) delete s.doorCode;
  return s;
}

export async function writeSettings(db: Db, patch: Partial<Settings>) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    await db
      .insert(schema.settings)
      .values({ key: k, value: JSON.stringify(v) })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: JSON.stringify(v) } });
  }
}
