"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Badge, Spinner, EmptyState } from "@/components/ui";
import { ACTION_LABELS } from "@/lib/audit-labels";

type Log = {
  id: string; action: string; actorRole: string; actorName: string;
  entity: string; entityId: string; meta: string; createdAt: string;
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "red", CLINIC: "teal", PATIENT: "sky", BOT: "violet", SYSTEM: "zinc",
};

export default function LogsPage() {
  const [data, setData] = useState<{ logs: Log[]; total: number; pages: number } | null>(null);
  const [action, setAction] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (action) p.set("action", action);
    if (role) p.set("role", role);
    p.set("page", String(page));
    api<{ logs: Log[]; total: number; pages: number }>(`/api/admin/logs?${p}`).then(setData);
  }, [action, role, page]);
  useEffect(load, [load]);

  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-xl font-extrabold">Harakatlar jurnali</h1>
      <p className="mb-4 text-[13px] text-zinc-500">Tizimdagi barcha muhim amallar ({data.total} ta yozuv)</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px]">
          <option value="">Barcha amallar</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px]">
          <option value="">Barcha rollar</option>
          <option value="ADMIN">Admin</option>
          <option value="CLINIC">Klinika</option>
          <option value="PATIENT">Bemor</option>
          <option value="BOT">Bot</option>
          <option value="SYSTEM">Tizim</option>
        </select>
      </div>

      {data.logs.length === 0 ? (
        <EmptyState icon="📋" title="Yozuvlar topilmadi" />
      ) : (
        <div className="space-y-1.5">
          {data.logs.map((l) => {
            let metaText = "";
            try {
              const m = JSON.parse(l.meta);
              metaText = Object.entries(m).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(",") : v}`).join(" · ");
            } catch { /* bo'sh */ }
            return (
              <div key={l.id} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-zinc-100 bg-white px-3.5 py-2.5 text-[13px]">
                <Badge color={ROLE_COLORS[l.actorRole] ?? "zinc"}>{l.actorRole}</Badge>
                <span className="font-semibold">{ACTION_LABELS[l.action] ?? l.action}</span>
                <span className="text-zinc-500">{l.actorName}</span>
                {metaText && <span className="min-w-0 flex-1 truncate text-zinc-400">{metaText}</span>}
                <span className="ml-auto shrink-0 text-[11.5px] text-zinc-400">
                  {new Date(l.createdAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-[13px] font-semibold disabled:opacity-40">← Oldingi</button>
          <span className="text-[13px] text-zinc-500">{page + 1} / {data.pages}</span>
          <button disabled={page >= data.pages - 1} onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-[13px] font-semibold disabled:opacity-40">Keyingi →</button>
        </div>
      )}
    </div>
  );
}
