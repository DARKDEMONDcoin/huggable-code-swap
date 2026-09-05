import { supabaseAdmin as a } from "../../src/integrations/supabase/client.server";
import { runAutopilotRow, nextSlot } from "../../src/lib/autopilot.server";
const WS = "2912523e-49af-4b9b-8ab8-11477c48d0b3"; // نخلة للتمور
// حسابات وهمية لاختبار المسار كاملاً حتى خطوة النشر
for (const p of ["facebook","instagram"]) {
  await a.from("pipedream_accounts").upsert({ workspace_id: WS, provider: p, app_slug: p, account_id: "apn_test_"+p, account_name: "TEST", status: "connected" }, { onConflict: "workspace_id,provider,account_id" });
}
const { data: row, error } = await a.from("social_autopilot").upsert({
  workspace_id: WS, employee_id: "sonny", active: true,
  providers: ["facebook","instagram"], brief: "محمصة تمور فاخرة في المدينة المنورة، نبيع علب هدايا واشتراك شهري، الجمهور عائلات ٣٠–٥٠.",
  dialect: "خليجية", posts_per_day: 1, hours: [6], mode: "auto", with_image: true,
  next_run_at: new Date().toISOString(),
}, { onConflict: "workspace_id" }).select("*").single();
if (error) throw error;
const t = Date.now();
const rep = await runAutopilotRow(a, row!);
console.log("report", rep, "in", ((Date.now()-t)/1000).toFixed(1)+"s");
const posts = await a.from("social_posts").select("provider,status,body,image_url").eq("workspace_id", WS);
for (const p of posts.data ?? []) console.log("\n===", p.provider, p.status, "img:", (p.image_url??"none").slice(0,80), "\n", p.body);
console.log("\nnext:", (await a.from("social_autopilot").select("next_run_at,last_status").eq("workspace_id",WS).single()).data);
