import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plane, Play, Save, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { AppIcon, appLabel } from "@/components/site/AppIcon";
import { useConnectedAccounts, useWorkspace } from "@/lib/data";
import { getAutopilot, runAutopilotNow, saveAutopilot } from "@/lib/autopilot.functions";

export const Route = createFileRoute("/app/autopilot")({
  head: () => ({
    meta: [
      { title: "الطيار الآلي | سهل" },
      {
        name: "description",
        content:
          "خلّ سِراج يشتغل لوحده: يكتب منشوراتك اليومية بصورها وينشرها على إنستجرام وفيسبوك ولينكدإن وإكس في مواعيدها.",
      },
      { property: "og:title", content: "الطيار الآلي | سهل" },
      { property: "og:description", content: "محتوى يومي يُكتب ويُنشر تلقائياً بلا تدخّل منك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AutopilotPage,
});

const PROVIDERS = ["instagram", "facebook", "linkedin", "x"] as const;
const DIALECTS = ["خليجية", "مصرية", "شامية", "مغربية", "فصحى"] as const;
/** ساعات النشر تُعرض بتوقيت مكة (UTC+3) وتُخزّن بـUTC. */
const OFFSET = 3;
const SLOT_HOURS = [8, 12, 15, 18, 21] as const;

function toLocal(utcHour: number) {
  return (utcHour + OFFSET + 24) % 24;
}
function toUtc(localHour: number) {
  return (localHour - OFFSET + 24) % 24;
}

function AutopilotPage() {
  const { data: workspace } = useWorkspace();
  const { data: accounts } = useConnectedAccounts(workspace?.id);
  const qc = useQueryClient();

  const settings = useQuery({
    queryKey: ["autopilot", workspace?.id],
    enabled: Boolean(workspace?.id),
    queryFn: () => getAutopilot({ data: { workspaceId: workspace!.id } }),
  });

  const [active, setActive] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [dialect, setDialect] = useState<string>("خليجية");
  const [hours, setHours] = useState<number[]>([9]);
  const [mode, setMode] = useState<"auto" | "review">("review");
  const [withImage, setWithImage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const row = settings.data?.autopilot ?? null;
  useEffect(() => {
    if (!row) return;
    setActive(row.active);
    setProviders(row.providers ?? []);
    setBrief(row.brief ?? "");
    setDialect(row.dialect ?? "خليجية");
    setHours((row.hours ?? [9]).map(Number));
    setMode(row.mode === "auto" ? "auto" : "review");
    setWithImage(row.with_image);
  }, [row]);

  const save = useMutation({
    mutationFn: () =>
      saveAutopilot({
        data: {
          workspaceId: workspace!.id,
          active,
          providers,
          brief,
          dialect,
          postsPerDay: Math.max(1, Math.min(3, hours.length)),
          hours,
          mode,
          withImage,
        },
      }),
    onSuccess: () => {
      setNote("تم الحفظ.");
      void qc.invalidateQueries({ queryKey: ["autopilot", workspace?.id] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "تعذّر الحفظ."),
  });

  const runNow = useMutation({
    mutationFn: () => runAutopilotNow({ data: { workspaceId: workspace!.id } }),
    onSuccess: (res) => {
      setNote(
        res.report.status === "generated"
          ? res.report.created
            ? `تم تجهيز ${res.report.created} منشوراً — تابعها في طابور النشر.`
            : "تم توليد المنشور — راجعه في صفحة الموافقات."
          : (res.report.note ?? "لم يُنتج شيء هذه المرة."),
      );
      void qc.invalidateQueries({ queryKey: ["autopilot", workspace?.id] });
      void qc.invalidateQueries({ queryKey: ["social-posts", workspace?.id] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "تعذّر التشغيل."),
  });

  const connected = new Set((accounts ?? []).map((a) => a.provider));
  const toggleProvider = (p: string) =>
    setProviders((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p].slice(0, 4)));
  const toggleHour = (localHour: number) => {
    const utc = toUtc(localHour);
    setHours((list) =>
      list.includes(utc)
        ? list.length > 1
          ? list.filter((h) => h !== utc)
          : list
        : [...list, utc].slice(0, 3).sort((a, b) => a - b),
    );
  };

  const busy = save.isPending || runNow.isPending;

  return (
    <AppShell
      title="الطيار الآلي"
      lead="سِراج يكتب وينشر لوحده — أنت تحدّد المنصات والمواعيد والأسلوب فقط."
    >
      {error ? (
        <p className="mb-4 rounded-2xl bg-destructive/10 p-4 text-sm font-bold text-destructive">{error}</p>
      ) : null}
      {note ? (
        <p className="mb-4 rounded-2xl bg-jade/12 p-4 text-sm font-bold text-jade-deep">{note}</p>
      ) : null}
      {row?.paused_reason ? (
        <p className="mb-4 inline-flex items-start gap-2 rounded-2xl bg-destructive/10 p-4 text-sm font-bold text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {row.paused_reason}
        </p>
      ) : null}

      <div className="grid gap-5">
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-ink-soft">
                <Plane className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-black">تشغيل الطيار</h2>
                <p className="text-sm text-ink-soft">
                  {row?.last_status ?? "لم يعمل بعد."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActive((v) => !v)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
                active ? "bg-jade text-background" : "bg-secondary text-ink-soft"
              }`}
            >
              {active ? "مُفعّل" : "متوقف"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-black">المنصات</h3>
          <p className="mt-1 text-sm text-ink-soft">
            المنصات المربوطة فقط تعمل. غير المربوط اربطه من{" "}
            <Link to="/app/integrations" className="font-bold underline">
              صفحة التكاملات
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PROVIDERS.map((p) => {
              const on = providers.includes(p);
              const linked = connected.has(p);
              return (
                <button
                  key={p}
                  onClick={() => toggleProvider(p)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                    on ? "border-transparent bg-foreground text-background" : "border-border text-ink-soft"
                  }`}
                >
                  <AppIcon name={p} className="size-4" />
                  {appLabel(p)}
                  {!linked ? <span className="text-xs opacity-70">(غير مربوط)</span> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-black">عمّا يكتب؟</h3>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="مثال: محمصة قهوة مختصة في جدة — نبيع حبوب مختصة واشتراكات شهرية، الجمهور شباب ٢٥–٤٠."
            className="mt-3 w-full rounded-2xl border border-border bg-background p-4 text-sm leading-relaxed outline-none focus:border-foreground"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">اللهجة:</span>
            {DIALECTS.map((d) => (
              <button
                key={d}
                onClick={() => setDialect(d)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${
                  dialect === d ? "bg-foreground text-background" : "bg-secondary text-ink-soft"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={withImage}
              onChange={(e) => setWithImage(e.target.checked)}
              className="size-4"
            />
            أرفق صورة مولّدة مع كل منشور (إنستجرام يتطلبها)
          </label>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-black">المواعيد</h3>
          <p className="mt-1 text-sm text-ink-soft">اختر حتى ٣ مواعيد يومياً (بتوقيت مكة).</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SLOT_HOURS.map((h) => {
              const on = hours.includes(toUtc(h));
              return (
                <button
                  key={h}
                  onClick={() => toggleHour(h)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    on ? "bg-foreground text-background" : "bg-secondary text-ink-soft"
                  }`}
                >
                  {String(h).padStart(2, "0")}:00
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            المختار الآن: {hours.map((h) => `${String(toLocal(h)).padStart(2, "0")}:00`).join(" · ")}
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-black">وضع التشغيل</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                { id: "auto", title: "ينشر لوحده", desc: "يكتب وينشر في الموعد بلا أي تدخّل منك." },
                { id: "review", title: "بانتظار موافقتك", desc: "يكتب ويجهّز، وأنت تعتمد قبل النشر." },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={`rounded-2xl border p-4 text-start transition-colors ${
                  mode === opt.id ? "border-foreground bg-secondary" : "border-border"
                }`}
              >
                <span className="block font-bold">{opt.title}</span>
                <span className="mt-1 block text-sm text-ink-soft">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setError(null);
              setNote(null);
              save.mutate();
            }}
            disabled={busy || !workspace?.id}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            احفظ الإعدادات
          </button>
          <button
            onClick={() => {
              setError(null);
              setNote(null);
              runNow.mutate();
            }}
            disabled={busy || !row}
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            {runNow.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            شغّله الآن للتجربة
          </button>
        </div>
      </div>
    </AppShell>
  );
}
