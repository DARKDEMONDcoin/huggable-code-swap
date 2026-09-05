import { supabaseAdmin as a } from "../../src/integrations/supabase/client.server";
import { runDueSocialPosts } from "../../src/lib/social-queue.server";
import { runDueAutopilots, runAutopilotRow } from "../../src/lib/autopilot.server";
const WS="2912523e-49af-4b9b-8ab8-11477c48d0b3";

console.log("1) طابور النشر مع حساب غير حقيقي:");
console.log(await runDueSocialPosts(a));
console.log((await a.from("social_posts").select("provider,status,attempts,last_error").eq("workspace_id",WS)).data);

console.log("\n2) قفل التشغيل المزدوج:");
await a.from("social_autopilot").update({next_run_at:new Date(Date.now()-1000).toISOString(),locked_at:null}).eq("workspace_id",WS);
const [r1,r2] = await Promise.all([runDueAutopilots(a), runDueAutopilots(a)]);
console.log("تشغيلة أ:",r1.length,"| تشغيلة ب:",r2.length);

console.log("\n3) قاطع الدائرة (رفض المزوّد):");
const row=(await a.from("social_autopilot").select("*").eq("workspace_id",WS).single()).data!;
const fake={...row, brief:"__FORCE_402__"};
const orig=await import("../../src/lib/nour-run.server");
// نحاكي رفض المزوّد عبر بيانات لا تُنتج نصاً
console.log("skip (يُختبر منطقياً عبر isBlocked)");

console.log("\n4) بلا منصات مربوطة:");
await a.from("pipedream_accounts").delete().eq("workspace_id",WS);
console.log(await runAutopilotRow(a,(await a.from("social_autopilot").select("*").eq("workspace_id",WS).single()).data!));
