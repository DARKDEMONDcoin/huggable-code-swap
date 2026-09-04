import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { executeSkill } from "@/lib/nour-run.server";
const c = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, { auth: { persistSession: false } });
const { data: ws } = await c.from("workspaces").select("id").limit(1).single();
const r = await executeSkill(c, { workspaceId: ws!.id, employeeId: "sonny", skillId: "day-themes",
  values: { business: "مطعم بلدنا للأكل الصحي", platform: "إنستغرام", dialect: "مصرية" }, origin: "فحص الطول" });
console.log("CHARS", r.output.length);
const lines = r.output.split("\n").filter(l => l.trim().length > 25);
console.log("LINES", lines.length, "UNIQUE", new Set(lines).size);
console.log("TAIL:", r.output.slice(-500));
process.exit(0);
