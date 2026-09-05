import { nextSlot, extractPost } from "../../src/lib/autopilot.server";
const from = new Date("2026-09-05T07:30:00Z");
console.log("A", nextSlot([5,9,15], from).toISOString());
console.log("B", nextSlot([5], from).toISOString());
console.log("C", nextSlot([], from).toISOString());
console.log("D", nextSlot([5,5,9], new Date("2026-09-05T23:10:00Z")).toISOString());
const out = `1) **الفكرة**
نبيّن جودة التمر.

2) **نص المنشور النهائي**
كل تمرة عندنا اتقطفت الصبح 🌴
جرّبها مع قهوتك وقول لنا رأيك.

3) **الهاشتاقات**
#تمور #جدة #قهوة_الصباح

4) **وصف الصورة**
Close-up of fresh dates on a linen cloth, warm morning light.`;
console.log(JSON.stringify(extractPost(out), null, 2));
console.log("empty:", JSON.stringify(extractPost("مجرد نص بسيط بدون أقسام").caption));
