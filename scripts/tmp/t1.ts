import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { executeSkill } from "@/lib/nour-run.server";

const client = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, { auth: { persistSession: false } });
const { data: ws } = await client.from("workspaces").select("id,name,industry").limit(1).single();
console.log("WS", ws);
const jobs = [
  ["social-post", { topic: "إطلاق وجبة فطار صحي", platform: "إنستغرام", cta: "اطلب من البايو", tone: "ودودة", dialect: "مصرية", audience: "أمهات ٢٥-٤٠" }],
  ["content-calendar", { goal: "زيادة الطلبات ١٥٪", platform: "إنستغرام", perWeek: "5", audience: "أمهات", tone: "ودودة", dialect: "مصرية" }],
  ["reel-script", { topic: "يوم في المطبخ", duration: "30", format: "خلف الكواليس", platform: "تيك توك", dialect: "مصرية" }],
] as const;
const res = await Promise.allSettled(jobs.map(([id, values]) =>
  executeSkill(client as any, { workspaceId: ws!.id, employeeId: "sonny", skillId: id, values: values as any, origin: "فحص الجودة" })));
res.forEach((r, i) => {
  console.log("\n\n=========== " + jobs[i]![0] + " ===========");
  console.log(r.status === "fulfilled" ? r.value.output : String((r as any).reason));
});
