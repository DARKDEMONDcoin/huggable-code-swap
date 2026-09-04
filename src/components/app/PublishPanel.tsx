import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Send, Link2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { AppIcon, appLabel } from "@/components/site/AppIcon";
import { useConnectedAccounts } from "@/lib/data";
import { publishSocialNow, scheduleSocialPost } from "@/lib/social-queue.functions";

/** المنصات التي يدعمها سِراج للنشر المباشر من داخل «سهل». */
const PUBLISHABLE = ["instagram", "facebook", "linkedin", "x", "youtube"] as const;

/** يلتقط أول صورة داخل المخرج (رابط مباشر أو صيغة ماركداون). */
export function imageFromOutput(text: string | null | undefined): string | null {
  if (!text) return null;
  const md = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/.exec(text);
  if (md?.[1]) return md[1];
  const raw = /(https?:\/\/\S+\.(?:png|jpe?g|webp))/i.exec(text);
  return raw?.[1] ?? null;
}

/** يزيل صيغ الماركداون من نص المنشور قبل إرساله للمنصة. */
function cleanBody(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .trim();
}

function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Props = {
  workspaceId: string;
  employeeId: string;
  taskId: string;
  channel: string;
  body: string;
  onPublished?: () => void;
};

/** لوحة النشر: تختار المنصة المربوطة ثم تنشر الآن أو تجدول لموعد. */
export function PublishPanel({
  workspaceId,
  employeeId,
  taskId,
  channel,
  body,
  onPublished,
}: Props) {
  const qc = useQueryClient();
  const { data: accounts, isLoading } = useConnectedAccounts(workspaceId);

  const connected = useMemo(
    () =>
      (accounts ?? [])
        .map((a) => a.provider)
        .filter((p): p is (typeof PUBLISHABLE)[number] =>
          (PUBLISHABLE as readonly string[]).includes(p),
        ),
    [accounts],
  );

  const [provider, setProvider] = useState<string>("");
  const active = provider || (connected.includes(channel as never) ? channel : connected[0]) || "";

  const [when, setWhen] = useState(() => localInputValue(new Date(Date.now() + 3_600_000)));
  const [busy, setBusy] = useState<"now" | "later" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const imageUrl = imageFromOutput(body);
  const text = cleanBody(body);

  const done = (message: string) => {
    setNote(message);
    void qc.invalidateQueries({ queryKey: ["social-posts", workspaceId] });
    void qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    onPublished?.();
  };

  const run = async (mode: "now" | "later") => {
    setBusy(mode);
    setNote(null);
    const base = {
      workspaceId,
      employeeId,
      taskId,
      provider: active,
      body: text,
      imageUrl: imageUrl ?? null,
    };
    try {
      if (mode === "now") {
        await publishSocialNow({ data: base });
        done(`تم النشر على ${appLabel(active)} ✅`);
      } else {
        const at = new Date(when);
        if (Number.isNaN(at.getTime())) throw new Error("موعد غير صالح.");
        await scheduleSocialPost({ data: { ...base, scheduledAt: at.toISOString() } });
        done(`تمت الجدولة على ${appLabel(active)} في ${at.toLocaleString("ar-EG")} ⏱`);
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : "تعذّر تنفيذ الطلب.");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> نتحقق من حساباتك المربوطة…
      </p>
    );
  }

  if (!connected.length) {
    return (
      <Link
        to="/app/integrations"
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold transition-colors hover:bg-secondary"
      >
        <Link2 className="size-4" /> اربط حساباتك للنشر المباشر
      </Link>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted-foreground">انشر على</span>
        {connected.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setProvider(p)}
            aria-pressed={active === p}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              active === p
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:bg-secondary"
            }`}
          >
            <AppIcon name={p} className="size-3.5" />
            {appLabel(p)}
          </button>
        ))}
      </div>

      {active === "instagram" && !imageUrl ? (
        <p className="mt-3 text-xs text-muted-foreground">
          إنستجرام يتطلّب صورة — اطلب من سِراج توليد صورة للمنشور أولاً.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void run("now")}
          disabled={!!busy || !active}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background disabled:opacity-60"
        >
          {busy === "now" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          انشر الآن
        </button>

        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          aria-label="موعد النشر"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm"
        />

        <button
          type="button"
          onClick={() => void run("later")}
          disabled={!!busy || !active}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {busy === "later" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CalendarClock className="size-4" />
          )}
          جدولة
        </button>
      </div>

      {note ? <p className="mt-3 text-xs font-bold text-ink-soft">{note}</p> : null}
    </div>
  );
}
