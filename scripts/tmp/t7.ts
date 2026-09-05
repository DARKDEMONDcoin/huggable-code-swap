import { supabaseAdmin as a } from "../../src/integrations/supabase/client.server";
import { runDueSocialPosts } from "../../src/lib/social-queue.server";
const WS="2912523e-49af-4b9b-8ab8-11477c48d0b3";
for (const p of ["facebook","instagram"]) await a.from("pipedream_accounts").upsert({workspace_id:WS,provider:p,app_slug:p,account_id:"apn_test_"+p,account_name:"TEST",status:"connected"},{onConflict:"workspace_id,provider,account_id"});
await a.from("social_posts").update({status:"scheduled",attempts:0,locked_at:null,last_error:null}).eq("workspace_id",WS);
for (let i=1;i<=3;i++){
  const r=await runDueSocialPosts(a);
  console.log("جولة",i,JSON.stringify(r.map(x=>({p:x.provider,ok:x.ok}))));
}
console.log((await a.from("social_posts").select("provider,status,attempts,last_error").eq("workspace_id",WS)).data);
