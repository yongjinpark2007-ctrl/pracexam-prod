// YouTube playlists -> Supabase `shorts_videos` sync. Pure planning logic + thin I/O.
// No dependencies: Node/Workers built-in fetch only. The service_role key is read from `env` (server side only).

const KEY_RE = /^[a-z0-9-]{3,80}$/;
const LANGS = ['en', 'ko'];

// ── PX line ─────────────────────────────────────────────────────────────
// "PX: key=ea1-filing-status-01; part=1; topic=Filing Status"
export function parsePx(description) {
  const text = String(description || '');
  const lines = text.split(/\r?\n/);
  let found = null;
  const rest = [];
  for (const line of lines) {
    if (found === null && /^\s*PX:/.test(line)) { found = line; continue; }
    if (/^\s*PX:/.test(line)) continue;           // drop any extra PX lines from the stored description
    rest.push(line);
  }
  const cleaned = rest.join('\n').trim();
  if (found === null) return { ok: false, reason: 'no PX line', cleaned };
  const pairs = {};
  for (const chunk of found.replace(/^\s*PX:/, '').split(';')) {
    const i = chunk.indexOf('=');
    if (i < 0) continue;
    pairs[chunk.slice(0, i).trim().toLowerCase()] = chunk.slice(i + 1).trim();
  }
  const key = pairs.key || '';
  if (!KEY_RE.test(key)) return { ok: false, reason: 'invalid key', cleaned };
  // part and topic are optional: when missing they are read from the video title (see indexLanguage)
  let part = null;
  if (pairs.part !== undefined && pairs.part !== '') {
    part = Number(pairs.part);
    if (![1, 2, 3].includes(part)) return { ok: false, reason: 'invalid part', cleaned };
  }
  const topic = pairs.topic || null;
  return { ok: true, key, part, topic, cleaned };
}

// "... | Part 1 Practice Question #tags" / "... | 파트 1 실전 문제" -> 1
export function partFromTitle(title) {
  const m = /(?:\bPart|파트)\s*([123])\b/i.exec(String(title || ''));
  return m ? Number(m[1]) : null;
}

// "Enrolled Agent EA Exam: Filing Status for Year of Death | Part 1 Question #eaexam" -> "Filing Status for Year of Death"
export function topicFromTitle(title) {
  let t = String(title || '').replace(/#\S+/g, ' ').split('|')[0];
  // RE (2026-10-29): "Real Estate Agent Exam: …" / "미국 부동산 중개인 시험: …"
  const i = t.search(/(?:EA\s*Exam|EA\s*시험|Real\s*Estate(?:\s*Agent)?\s*Exam|부동산\s*중개인\s*시험)\s*:/i);
  if (i >= 0) t = t.slice(t.indexOf(':', i) + 1);
  t = t.replace(/\s+/g, ' ').trim();
  return t || null;
}

// videos: [{ id, title, description, publishedAt, privacyStatus }] for ONE language.
// Returns { byKey: Map(key -> {id,title,description,publishedAt,part,topic}), skipped: [], warnings: [] }
// opts.access        'free' (default) | 'members'  - tag stored on each entry
// opts.allowUnlisted  members playlists hold UNLISTED videos on purpose; the free playlists stay public-only
// opts.defaultPart    used when neither the PX line nor the title names a part (RE titles carry no part: 1 = National)
export function indexLanguage(videos, lang, opts = {}) {
  const access = opts.access || 'free';
  const byKey = new Map();
  const skipped = [];
  const warnings = [];
  for (const v of videos) {
    if (!v) continue;
    const okStatus = v.privacyStatus === 'public' || (opts.allowUnlisted && v.privacyStatus === 'unlisted');
    if (!okStatus) continue;                                // private / deleted (and unlisted unless allowed)
    const px = parsePx(v.description);
    if (!px.ok) { skipped.push(`skipped: no/invalid PX line (${v.id})`); continue; }
    const part = px.part ?? partFromTitle(v.title) ?? (opts.defaultPart || null);
    const topic = px.topic ?? topicFromTitle(v.title);
    if (!part || !topic) { skipped.push(`skipped: no part/topic in PX line or title (${v.id})`); continue; }
    const entry = { id: v.id, title: v.title || null, description: px.cleaned || null,
                    publishedAt: v.publishedAt, part, topic, access };
    const prev = byKey.get(px.key);
    if (!prev) { byKey.set(px.key, entry); continue; }
    // same key twice in the same language: keep the earlier one
    if (entry.publishedAt < prev.publishedAt) {
      warnings.push(`duplicate ${lang} key ${px.key}: kept ${entry.id}, ignored ${prev.id}`);
      byKey.set(px.key, entry);
    } else {
      warnings.push(`duplicate ${lang} key ${px.key}: kept ${prev.id}, ignored ${entry.id}`);
    }
  }
  return { byKey, skipped, warnings };
}

const day = (iso) => String(iso).slice(0, 10);

// Free playlist map + members playlist map -> one map for a language.
// A key present in BOTH is an operator slip: keep it as 'members' (withholding is the safe side) and warn.
export function mergeTiers(freeMap, membersMap, lang, warnings = []) {
  if (!membersMap) return freeMap;
  const out = new Map(freeMap || []);
  for (const [k, v] of membersMap) {
    if (out.has(k)) warnings.push(`${lang} key ${k} is in both the free and the members playlist: treated as members`);
    out.set(k, { ...v, access: 'members' });
  }
  return out;
}

// existing: Map(slug -> row) of ALL rows. fetched: { en: Map|null, ko: Map|null } (null = fetch failed).
// Returns { creates: [row], patches: [{slug, fields}], unpublished: n, warnings: [], errors: [] }
// noRemove: Set of languages whose members playlist failed to load - never remove for them this run.
export function planSync({ existing, fetched, now, noRemove = new Set() }) {
  const creates = [];
  const patches = [];
  const warnings = [];
  const errors = [];
  let unpublished = 0;
  const ts = (now instanceof Date ? now : new Date(now || Date.now())).toISOString();

  const keys = new Set();
  for (const l of LANGS) if (fetched[l]) for (const k of fetched[l].keys()) keys.add(k);

  // ── add / update ──
  for (const key of keys) {
    const ex = existing.get(key);
    const en = fetched.en && fetched.en.get(key);
    const ko = fetched.ko && fetched.ko.get(key);
    if (ex && ex.source === 'manual') {
      warnings.push(`manual row protected: ${key} (not overwritten)`);
      continue;
    }
    const base = en || ko;
    if (en && ko && (en.part !== ko.part || en.topic !== ko.topic)) {
      warnings.push(`part/topic differ between EN and KO for ${key}: using EN`);
    }
    const fields = {};
    const dates = [];
    for (const [l, v] of [['en', en], ['ko', ko]]) {
      if (!v) continue;                      // other language: never touched
      fields['youtube_id_' + l] = v.id;
      fields['title_' + l] = v.title;
      fields['description_' + l] = v.description;
      dates.push(day(v.publishedAt));
    }
    if (ex && ex.published_at) dates.push(String(ex.published_at).slice(0, 10));
    fields.published_at = dates.sort()[0];
    fields.ea_part = base.part;
    fields.topic = base.topic;
    const acc = [en, ko].filter(Boolean).map((v) => v.access || 'free');
    if (new Set(acc).size > 1) warnings.push(`access differs between EN and KO for ${key}: using members`);
    fields.access = acc.includes('members') ? 'members' : 'free';
    fields.last_synced_at = ts;
    if (ex) {
      patches.push({ slug: key, fields });     // is_published is never sent for existing rows
    } else {
      creates.push({ slug: key, source: 'youtube-sync', is_published: true, ...fields });
    }
  }

  // ── removals (only for youtube-sync rows and only for languages fetched successfully) ──
  for (const [slug, ex] of existing) {
    if (ex.source !== 'youtube-sync') continue;
    const fields = {};
    for (const l of LANGS) {
      if (!ex['youtube_id_' + l]) continue;
      const map = fetched[l];
      if (!map || noRemove.has(l)) continue;               // fetch failed -> never remove
      if (map.size === 0) {                                // empty playlist but DB has videos -> suspicious
        errors.push(`${l} playlist returned 0 videos but DB has some: removal skipped`);
        continue;
      }
      if (!map.has(slug)) fields['_gone_' + l] = true;
    }
    const gone = LANGS.filter((l) => fields['_gone_' + l]);
    if (!gone.length) continue;
    const patch = {};
    const remaining = LANGS.filter((l) => ex['youtube_id_' + l] && !gone.includes(l));
    if (remaining.length) {
      // one language is still there: clear only the vanished one
      for (const l of gone) {
        patch['youtube_id_' + l] = null; patch['title_' + l] = null; patch['description_' + l] = null;
      }
    } else {
      // Nothing left. The table's CHECK (at least one YouTube ID) forbids nulling both,
      // so keep the last IDs and hide the row instead.
      patch.is_published = false;
      if (ex.is_published) unpublished++;
    }
    patch.last_synced_at = ts;
    patches.push({ slug, fields: patch });
  }
  // one patch per slug (an update and a removal can hit the same row)
  const merged = new Map();
  for (const p of patches) merged.set(p.slug, { slug: p.slug, fields: { ...(merged.get(p.slug)?.fields || {}), ...p.fields } });
  return { creates, patches: [...merged.values()], unpublished, warnings, errors };
}

// ── YouTube API ─────────────────────────────────────────────────────────
async function yt(fetchFn, path, params, apiKey) {
  const u = new URL('https://www.googleapis.com/youtube/v3/' + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('key', apiKey);
  const r = await fetchFn(u.toString());
  if (!r.ok) throw new Error(`YouTube ${path} HTTP ${r.status}`);
  return r.json();
}

export async function fetchPlaylistVideos(fetchFn, playlistId, apiKey) {
  const ids = [];
  let pageToken = '';
  do {
    const p = { part: 'contentDetails', maxResults: '50', playlistId };
    if (pageToken) p.pageToken = pageToken;
    const j = await yt(fetchFn, 'playlistItems', p, apiKey);
    for (const it of j.items || []) if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId);
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await yt(fetchFn, 'videos', { part: 'snippet,status', id: ids.slice(i, i + 50).join(',') }, apiKey);
    for (const v of j.items || []) {
      out.push({ id: v.id, title: v.snippet?.title, description: v.snippet?.description,
                 publishedAt: v.snippet?.publishedAt, privacyStatus: v.status?.privacyStatus });
    }
  }
  return out;
}

// ── Supabase REST ───────────────────────────────────────────────────────
function sbHeaders(env, extra) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
           'Content-Type': 'application/json', ...extra };
}

async function loadExisting(env, fetchFn, table = 'shorts_videos') {
  const r = await fetchFn(`${env.SUPABASE_URL}/rest/v1/${table}?select=*`, { headers: sbHeaders(env) });
  if (!r.ok) throw new Error('Supabase read HTTP ' + r.status);
  return new Map((await r.json()).map((row) => [row.slug, row]));
}

// ── main ────────────────────────────────────────────────────────────────
// target (optional): { table, lists:{en,ko}, memberLists:{en,ko}, defaultPart }. Unset = the EA playlists -> shorts_videos.
export async function syncShorts(env, { dry = false, fetchFn = fetch, now = new Date(), target = null } = {}) {
  const summary = { fetchedEn: 0, fetchedKo: 0, fetchedMembers: 0, upserted: 0, unpublished: 0, skipped: 0, warnings: [], errors: [], dry };
  const fetched = { en: null, ko: null };
  const table = (target && target.table) || 'shorts_videos';
  const lists = (target && target.lists) || { en: env.YT_PLAYLIST_ID_EN, ko: env.YT_PLAYLIST_ID_KO };
  // Optional members-only playlists (UNLISTED videos). Empty / unset = feature off, behaviour exactly as before.
  const memberLists = (target && target.memberLists) || { en: env.YT_PLAYLIST_ID_MEMBERS_EN, ko: env.YT_PLAYLIST_ID_MEMBERS_KO };
  const idxOpts = (target && target.defaultPart) ? { defaultPart: target.defaultPart } : {};
  const noRemove = new Set();

  // both languages in parallel; a failure only disables removal for that language
  await Promise.all(LANGS.map(async (l) => {
    try {
      const vids = await fetchPlaylistVideos(fetchFn, lists[l], env.YOUTUBE_API_KEY);
      const idx = indexLanguage(vids, l, idxOpts);
      fetched[l] = idx.byKey;
      summary['fetched' + (l === 'en' ? 'En' : 'Ko')] = vids.length;
      summary.skipped += idx.skipped.length;
      for (const s of idx.skipped) console.log(s);
      summary.warnings.push(...idx.warnings);
    } catch (e) {
      summary.errors.push(`${l} fetch failed: ${e.message}`);
      return;
    }
    if (!memberLists[l]) return;                           // members playlist not configured
    try {
      const mvids = await fetchPlaylistVideos(fetchFn, memberLists[l], env.YOUTUBE_API_KEY);
      const midx = indexLanguage(mvids, l, { ...idxOpts, access: 'members', allowUnlisted: true });
      fetched[l] = mergeTiers(fetched[l], midx.byKey, l, summary.warnings);
      summary.fetchedMembers += mvids.length;
      summary.skipped += midx.skipped.length;
      for (const s of midx.skipped) console.log(s);
      summary.warnings.push(...midx.warnings);
    } catch (e) {
      noRemove.add(l);                                     // free videos still sync; nothing is removed for this language
      summary.errors.push(`${l} members fetch failed: ${e.message}`);
    }
  }));

  let existing;
  try {
    existing = await loadExisting(env, fetchFn, table);
  } catch (e) {
    summary.errors.push(e.message);
    console.log(JSON.stringify(summary));
    return summary;
  }

  const plan = planSync({ existing, fetched, now, noRemove });
  summary.warnings.push(...plan.warnings);
  summary.errors.push(...plan.errors);
  summary.unpublished = plan.unpublished;
  summary.upserted = plan.creates.length + plan.patches.length;
  summary.plan = dry ? plan : undefined;

  if (!dry) {
    const base = `${env.SUPABASE_URL}/rest/v1/${table}`;
    // One request per row: a bulk upsert with different key sets would null the missing columns.
    const jobs = [
      ...plan.creates.map((row) => fetchFn(`${base}?on_conflict=slug`, {
        method: 'POST', headers: sbHeaders(env, { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(row) })),
      ...plan.patches.map((p) => fetchFn(`${base}?slug=eq.${encodeURIComponent(p.slug)}`, {
        method: 'PATCH', headers: sbHeaders(env, { Prefer: 'return=minimal' }), body: JSON.stringify(p.fields) })),
    ];
    const res = await Promise.all(jobs.map((j) => j.catch((e) => ({ ok: false, status: e.message }))));
    res.forEach((r) => { if (!r.ok) summary.errors.push('Supabase write HTTP ' + r.status); });
  }
  // one-line summary, no secrets, no description text
  const { plan: _p, ...line } = summary;
  console.log(JSON.stringify({ table, ...line }));
  return summary;
}

// EA, then Real Estate (2026-10-29). RE runs only when an RE playlist is set; it writes to its own table
// re_shorts_videos so EA pages never see RE videos. A failure in one never stops the other.
export async function syncAll(env, opts = {}) {
  const out = { ea: null, re: null };
  try { out.ea = await syncShorts(env, opts); } catch (e) { out.ea = { errors: ['ea sync crashed: ' + e.message] }; }
  if (env.YT_PLAYLIST_ID_RE_EN || env.YT_PLAYLIST_ID_RE_KO) {
    const target = { table: 're_shorts_videos', defaultPart: 1, memberLists: {},
                     lists: { en: env.YT_PLAYLIST_ID_RE_EN, ko: env.YT_PLAYLIST_ID_RE_KO } };
    try { out.re = await syncShorts(env, { ...opts, target }); } catch (e) { out.re = { errors: ['re sync crashed: ' + e.message] }; }
  }
  return out;
}
