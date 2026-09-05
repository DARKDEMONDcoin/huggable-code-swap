import { supabaseAdmin as a } from "../../src/integrations/supabase/client.server";
const ws = await a.from("workspaces").select("id,name,industry").limit(5);
console.log("workspaces", ws.data, ws.error?.message);
const acc = await a.from("pipedream_accounts").select("workspace_id,provider,status");
console.log("accounts", acc.data, acc.error?.message);
const ap = await a.from("social_autopilot").select("*");
console.log("autopilot", ap.data, ap.error?.message);
const sp = await a.from("social_posts").select("id,provider,status,scheduled_at").limit(5);
console.log("posts", sp.data, sp.error?.message);
