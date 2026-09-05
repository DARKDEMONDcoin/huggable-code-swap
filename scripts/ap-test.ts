import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { runAutopilotRow, nextRun, runDueAutopilots } from "@/lib/autopilot.server";

const admin = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, { auth: { persistSession: false } });
const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
const wsId = ws!.id;

const payload = {
  workspace_id: wsId, employee_id: "sonny", active: true,
  providers: ["instagram", "facebook", "linkedin", "x"],
  brief: "مطعم أكل صحي بالقاهرة", dialect: "مصرية",
  slots: ["06:45", "13:20", "22:05"], days: [0,1,2,3,4,5,6], timezone: "Africa/Cairo",
  hours: [6,13,22], posts_per_day: 3, mode: "review", with_image: false,
  next_run_at: nextRun({ slots: ["06:45","13:20","22:05"], days: [0,1,2,3,4,5,6], timezone: "Africa/Cairo" }).toISOString(),
  locked_at: null, paused_reason: null,
} as never;
const { data: row, error } = await admin.from("social_autopilot").upsert(payload, { onConflict: "workspace_id" }).select("*").single();
if (error) throw error;
console.log("saved slots:", (row as any).slots, (row as any).timezone, "next:", row!.next_run_at);

const rep = await runAutopilotRow(admin, row!, new Date());
console.log("review-mode run:", rep);
const { data: after } = await admin.from("social_autopilot").select("next_run_at,last_status").eq("workspace_id", wsId).single();
console.log("after:", after);
const { count } = await admin.from("tasks").select("id", { count: "exact", head: true }).eq("workspace_id", wsId);
console.log("tasks total:", count);
console.log("due batch:", (await runDueAutopilots(admin)).length);
