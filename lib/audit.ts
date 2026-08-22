import { db } from "./db";

/**
 * Harakatlar jurnali — barcha muhim amallar shu yerdan yoziladi.
 * Xato bo'lsa asosiy oqimni to'xtatmaydi (jurnal — yordamchi tizim).
 */
export function audit(entry: {
  actorId?: string | null;
  actorRole?: string;
  actorName?: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  void db.auditLog
    .create({
      data: {
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? "SYSTEM",
        actorName: entry.actorName ?? "",
        action: entry.action,
        entity: entry.entity ?? "",
        entityId: entry.entityId ?? "",
        meta: JSON.stringify(entry.meta ?? {}),
      },
    })
    .catch((e) => console.error("Audit yozishda xato:", e));
}

export { ACTION_LABELS } from "./audit-labels";
