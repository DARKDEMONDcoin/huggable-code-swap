/**
 * دوال الخادم لإعدادات «الطيار الآلي»: القراءة، الحفظ، والتشغيل الفوري.
 * كل الدوال محمية بملكية مساحة العمل.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(
  supabase: {
    rpc: (
      fn: "owns_workspace",
      args: { _workspace_id: string },
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  },
  workspaceId: string,
) {
  const { data, error } = await supabase.rpc("owns_workspace", { _workspace_id: workspaceId });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Forbidden: لا تملك هذه مساحة العمل.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const idInput = z.object({ workspaceId: z.string().uuid() });

/** إعدادات الطيار الحالية (أو القيم الافتراضية إن لم تُضبط بعد). */
export const getAutopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("social_autopilot")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { autopilot: row };
  });

const saveInput = z.object({
  workspaceId: z.string().uuid(),
  active: z.boolean(),
  providers: z.array(z.string().min(1).max(40)).max(4),
  brief: z.string().max(600).default(""),
  dialect: z.string().min(2).max(20).default("خليجية"),
  postsPerDay: z.number().int().min(1).max(3),
  hours: z.array(z.number().int().min(0).max(23)).min(1).max(3),
  mode: z.enum(["auto", "review"]),
  withImage: z.boolean(),
});

/** حفظ الإعدادات وحساب الموعد القادم مباشرةً. */
export const saveAutopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertOwner(context.supabase, data.workspaceId);
    const { nextSlot } = await import("./autopilot.server");

    const hours = [...new Set(data.hours)].sort((a, b) => a - b).slice(0, data.postsPerDay);
    const { data: row, error } = await admin
      .from("social_autopilot")
      .upsert(
        {
          workspace_id: data.workspaceId,
          employee_id: "sonny",
          active: data.active,
          providers: data.providers,
          brief: data.brief,
          dialect: data.dialect,
          posts_per_day: hours.length,
          hours,
          mode: data.mode,
          with_image: data.withImage,
          next_run_at: nextSlot(hours).toISOString(),
          paused_reason: null,
          locked_at: null,
        },
        { onConflict: "workspace_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, autopilot: row };
  });

/** تشغيل الطيار الآن لمساحة العمل هذه — للاختبار أو لبدء أول منشور فوراً. */
export const runAutopilotNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertOwner(context.supabase, data.workspaceId);
    const { data: row, error } = await admin
      .from("social_autopilot")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("اضبط إعدادات الطيار واحفظها أولاً.");

    const { runAutopilotRow } = await import("./autopilot.server");
    const report = await runAutopilotRow(admin, row);
    return { ok: true as const, report };
  });
