import { supabaseAdmin as a } from "../../src/integrations/supabase/client.server";
import { runAutopilotRow } from "../../src/lib/autopilot.server";
const WS="2912523e-49af-4b9b-8ab8-11477c48d0b3";
await a.from("social_posts").delete().eq("workspace_id",WS);
const row = (await a.from("social_autopilot").update({next_run_at:new Date().toISOString()}).eq("workspace_id",WS).select("*").single()).data!;
const rep = await runAutopilotRow(a,row);
console.log("report",rep);
const posts=(await a.from("social_posts").select("provider,status,body,image_url").eq("workspace_id",WS)).data??[];
for(const p of posts){console.log("\n===",p.provider,"| img:",p.image_url?"نعم":"لا","| chars:",p.body.length,"\n"+p.body);}
