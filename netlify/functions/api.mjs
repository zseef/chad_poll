import { getStore } from "@netlify/blobs";

export const config = { path: "/api" };

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let d;
  try { d = await req.json(); } catch { return json({ error: "bad" }, 400); }

  const polls = getStore("polls");
  const resp = getStore("responses");

  // ---- Nyilvános műveletek (a válaszolók használják) ----
  if (d.action === "getPoll") {
    const p = await polls.get(String(d.id), { type: "json" });
    if (!p) return json({ error: "notfound" }, 404);
    return json({ id: p.id, title: p.title, desc: p.desc, dates: p.dates });
  }
  if (d.action === "submit") {
    const p = await polls.get(String(d.poll), { type: "json" });
    if (!p) return json({ error: "notfound" }, 404);
    const name = String(d.name || "").trim().slice(0, 80);
    const dates = Array.isArray(d.dates) ? d.dates.filter((x) => p.dates.includes(x)) : [];
    if (!name || !dates.length) return json({ error: "bad" }, 400);
    // ugyanaz a név újra szavazva felülírja a korábbi választ
    await resp.setJSON(`${p.id}/${encodeURIComponent(name.toLowerCase())}`, {
      name, dates, ts: new Date().toISOString(),
    });
    return json({ ok: 1 });
  }

  // ---- Szervezői műveletek (jelszó kell) ----
  const secret = process.env.ADMIN_KEY;
  if (!secret || d.key !== secret) return json({ error: "auth" }, 401);

  if (d.action === "check") return json({ ok: 1 });

  if (d.action === "list") {
    const { blobs } = await polls.list();
    const all = await Promise.all(blobs.map((b) => polls.get(b.key, { type: "json" })));
    return json(all.filter(Boolean));
  }
  if (d.action === "savePoll") {
    const p = d.poll || {};
    if (!/^[a-z0-9]{4,20}$/.test(p.id || "") || !Array.isArray(p.dates) || !p.dates.every((x) => DATE.test(x)))
      return json({ error: "bad" }, 400);
    await polls.setJSON(p.id, {
      id: p.id, title: String(p.title || "").slice(0, 200),
      desc: String(p.desc || "").slice(0, 2000), dates: p.dates,
    });
    return json({ ok: 1 });
  }
  if (d.action === "results") {
    const { blobs } = await resp.list({ prefix: `${String(d.poll)}/` });
    const all = await Promise.all(blobs.map((b) => resp.get(b.key, { type: "json" })));
    return json(all.filter(Boolean).sort((a, b) => a.ts.localeCompare(b.ts)));
  }
  return json({ error: "bad" }, 400);
};
