import { supabaseAdmin as a } from "../../src/integrations/supabase/client.server";
const WS="2912523e-49af-4b9b-8ab8-11477c48d0b3";
const t = await a.from("tasks").select("output").eq("workspace_id",WS).order("created_at",{ascending:false}).limit(1).single();
console.log(JSON.stringify(t.data?.output?.slice(0,2500)));
