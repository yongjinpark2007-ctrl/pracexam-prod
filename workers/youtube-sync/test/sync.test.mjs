import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePx, indexLanguage, planSync, syncShorts, partFromTitle, topicFromTitle } from '../syncShorts.mjs';

const NOW = new Date('2026-10-16T12:00:00Z');
const vid = (id, key, date, extra = {}) => ({
  id, title: 't-' + id, publishedAt: date + 'T00:00:00Z', privacyStatus: 'public',
  description: `hello\nPX: key=${key}; part=1; topic=Filing Status\nbye`, ...extra,
});
const maps = (en, ko) => ({
  en: en && indexLanguage(en, 'en').byKey, ko: ko && indexLanguage(ko, 'ko').byKey,
});

test('PX line: normal, case/space variants', () => {
  const a = parsePx('intro\nPX: key=ea1-x-01; part=2; topic=Basis\nmore');
  assert.deepEqual([a.ok, a.key, a.part, a.topic], [true, 'ea1-x-01', 2, 'Basis']);
  assert.equal(a.cleaned, 'intro\nmore');                       // PX line removed from description
  const b = parsePx('  PX:  KEY = ea1-x-01 ;PART=3;  Topic =  S Corp  ');
  assert.deepEqual([b.ok, b.key, b.part, b.topic], [true, 'ea1-x-01', 3, 'S Corp']);
});

test('PX line: missing / malformed', () => {
  assert.equal(parsePx('nothing here').ok, false);
  assert.equal(parsePx('PX: key=Bad_Key; part=1; topic=x').ok, false);
  assert.equal(parsePx('PX: key=ok-key-1; part=9; topic=x').ok, false);
  assert.equal(parsePx('PX: key=ok-key-1; part=1').ok, true);        // topic is now optional (read from title)
  assert.equal(parsePx('PX: part=1; topic=x').ok, false);             // key is required
});

test('key-only PX line: part and topic come from the title', () => {
  assert.equal(partFromTitle('Enrolled Agent EA Exam: Filing Status for Year of Death | Part 1 Question #eaexam'), 1);
  assert.equal(partFromTitle('미국 세무사 EA 시험: 배우자 사망 연도의 신고 지위 | 파트 1 실전 문제'), 1);
  assert.equal(partFromTitle('no part here'), null);
  assert.equal(topicFromTitle('Enrolled Agent EA Exam: Filing Status for Year of Death | Part 1 Question #eaexam #eaexamprep'), 'Filing Status for Year of Death');
  const r = indexLanguage([{ id: 'EN000000001', publishedAt: '2026-01-01T00:00:00Z', privacyStatus: 'public',
    title: 'Enrolled Agent EA Exam: Filing Status for Year of Death | Part 1 Question', description: 'PX: key=filing-status-death' }], 'en');
  const e = r.byKey.get('filing-status-death');
  assert.deepEqual([e.part, e.topic], [1, 'Filing Status for Year of Death']);
  const bad = indexLanguage([{ id: 'EN000000002', publishedAt: '2026-01-01T00:00:00Z', privacyStatus: 'public',
    title: 'Random title', description: 'PX: key=some-key' }], 'en');
  assert.equal(bad.byKey.size, 0);                                    // no part in PX or title -> skipped, not guessed
  assert.match(bad.skipped[0], /no part\/topic/);
});

test('videos without PX or not public are skipped', () => {
  const r = indexLanguage([vid('a', 'k-one', '2026-01-01'), vid('b', 'k-two', '2026-01-02', { description: 'no px' }),
    vid('c', 'k-three', '2026-01-03', { privacyStatus: 'private' })], 'en');
  assert.equal(r.byKey.size, 1);
  assert.equal(r.skipped.length, 1);
  assert.match(r.skipped[0], /skipped: no\/invalid PX line \(b\)/);
});

test('same key, same language twice: earlier one wins + warning', () => {
  const r = indexLanguage([vid('late', 'k-one', '2026-03-01'), vid('early', 'k-one', '2026-01-01')], 'en');
  assert.equal(r.byKey.get('k-one').id, 'early');
  assert.equal(r.warnings.length, 1);
});

test('EN exists, KO arrives later: EN columns untouched, row not re-published', () => {
  const existing = new Map([['k-one', { slug: 'k-one', source: 'youtube-sync', is_published: false,
    youtube_id_en: 'EN000000001', youtube_id_ko: null, published_at: '2026-01-05' }]]);
  const p = planSync({ existing, fetched: maps(null, [vid('KO000000001', 'k-one', '2026-02-01')]), now: NOW });
  assert.equal(p.creates.length, 0);
  const f = p.patches[0].fields;
  assert.equal(f.youtube_id_ko, 'KO000000001');
  assert.ok(!('youtube_id_en' in f));
  assert.ok(!('is_published' in f));                 // never flipped back to true
  assert.equal(f.published_at, '2026-01-05');        // earliest date kept
});

test('new key creates a published youtube-sync row', () => {
  const p = planSync({ existing: new Map(), fetched: maps([vid('EN000000001', 'k-new', '2026-02-01')], []), now: NOW });
  assert.equal(p.creates[0].is_published, true);
  assert.equal(p.creates[0].source, 'youtube-sync');
});

test('manual rows are protected', () => {
  const existing = new Map([['k-one', { slug: 'k-one', source: 'manual', is_published: true, youtube_id_en: 'MANUAL00001' }]]);
  const p = planSync({ existing, fetched: maps([vid('EN000000001', 'k-one', '2026-02-01')], []), now: NOW });
  assert.equal(p.patches.length + p.creates.length, 0);
  assert.match(p.warnings[0], /manual row protected/);
});

test('video removed from playlist: that language nulled; last one -> unpublished (IDs kept for the CHECK)', () => {
  const row = { slug: 'k-one', source: 'youtube-sync', is_published: true, youtube_id_en: 'EN000000001', youtube_id_ko: 'KO000000001' };
  // KO gone, EN still present (another key keeps the KO playlist non-empty)
  let p = planSync({ existing: new Map([['k-one', row]]), fetched: maps([vid('EN000000001', 'k-one', '2026-01-01')], [vid('X0000000001', 'k-other', '2026-01-01')]), now: NOW });
  const f = p.patches.find((x) => x.slug === 'k-one').fields;
  assert.equal(f.youtube_id_ko, null);
  assert.ok(!('is_published' in f));
  // both gone
  p = planSync({ existing: new Map([['k-one', row]]), fetched: maps([vid('E0000000002', 'k-other', '2026-01-01')], [vid('X0000000001', 'k-other', '2026-01-01')]), now: NOW });
  const g = p.patches.find((x) => x.slug === 'k-one').fields;
  assert.equal(g.is_published, false);
  assert.ok(!('youtube_id_en' in g));                 // not nulled: CHECK needs one ID
  assert.equal(p.unpublished, 1);
});

test('failed fetch or empty playlist: removal step skipped', () => {
  const row = { slug: 'k-one', source: 'youtube-sync', is_published: true, youtube_id_en: 'EN000000001', youtube_id_ko: null };
  let p = planSync({ existing: new Map([['k-one', row]]), fetched: { en: null, ko: new Map() }, now: NOW });
  assert.equal(p.patches.length, 0);
  p = planSync({ existing: new Map([['k-one', row]]), fetched: { en: new Map(), ko: new Map() }, now: NOW });
  assert.equal(p.patches.length, 0);
  assert.equal(p.errors.length, 1);
});

test('API failure end to end: nothing deleted, nothing written, idempotent plan', async () => {
  const calls = [];
  const fetchFn = async (url, opts = {}) => {
    calls.push((opts.method || 'GET') + ' ' + String(url).split('?')[0]);
    if (String(url).includes('googleapis.com')) return { ok: false, status: 503, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => [{ slug: 'k-one', source: 'youtube-sync', is_published: true, youtube_id_en: 'EN000000001', youtube_id_ko: null }] };
  };
  const env = { YOUTUBE_API_KEY: 'k', YT_PLAYLIST_ID_EN: 'a', YT_PLAYLIST_ID_KO: 'b', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 's' };
  const s = await syncShorts(env, { fetchFn, now: NOW });
  assert.equal(s.errors.length, 2);
  assert.ok(!calls.some((c) => c.startsWith('PATCH') || c.startsWith('POST')));
});

test('idempotent: same input twice gives the same plan', () => {
  const existing = new Map();
  const f = maps([vid('EN000000001', 'k-new', '2026-02-01')], [vid('KO000000001', 'k-new', '2026-02-02')]);
  assert.deepEqual(planSync({ existing, fetched: f, now: NOW }), planSync({ existing, fetched: f, now: NOW }));
});

// ── members-only tier (2026-10-17) ─────────────────────────────────────────
import { mergeTiers } from '../syncShorts.mjs';

test('unlisted videos: skipped in the free tier, accepted (as members) only when allowed', () => {
  const u = vid('EN0000000U1', 'secret-one', '2026-10-01', { privacyStatus: 'unlisted' });
  assert.equal(indexLanguage([u], 'en').byKey.size, 0);                                   // free playlist: still public-only
  const m = indexLanguage([u], 'en', { access: 'members', allowUnlisted: true });
  assert.equal(m.byKey.get('secret-one').access, 'members');
  const priv = vid('EN0000000P1', 'secret-two', '2026-10-01', { privacyStatus: 'private' });
  assert.equal(indexLanguage([priv], 'en', { access: 'members', allowUnlisted: true }).byKey.size, 0);   // private never
});

test('free entries default to access=free; planSync writes access on create and patch', () => {
  const f = maps([vid('EN000000001', 'k-free', '2026-10-01')], null);
  const plan = planSync({ existing: new Map(), fetched: { en: f.en, ko: null }, now: NOW });
  assert.equal(plan.creates[0].access, 'free');
  const m = indexLanguage([vid('EN0000000M1', 'k-mem', '2026-10-02', { privacyStatus: 'unlisted' })], 'en', { access: 'members', allowUnlisted: true }).byKey;
  const merged = mergeTiers(f.en, m, 'en');
  const p2 = planSync({ existing: new Map(), fetched: { en: merged, ko: null }, now: NOW });
  const bySlug = Object.fromEntries(p2.creates.map((r) => [r.slug, r.access]));
  assert.deepEqual(bySlug, { 'k-free': 'free', 'k-mem': 'members' });
});

test('same key in both tiers: treated as members, with a warning; EN/KO disagreement -> members', () => {
  const w = [];
  const free = indexLanguage([vid('EN000000001', 'dup', '2026-10-01')], 'en').byKey;
  const mem = indexLanguage([vid('EN0000000M2', 'dup', '2026-10-01', { privacyStatus: 'unlisted' })], 'en', { access: 'members', allowUnlisted: true }).byKey;
  const merged = mergeTiers(free, mem, 'en', w);
  assert.equal(merged.get('dup').access, 'members');
  assert.equal(w.length, 1);
  const ko = indexLanguage([vid('KO000000001', 'dup', '2026-10-01')], 'ko').byKey;   // KO says free
  const plan = planSync({ existing: new Map(), fetched: { en: merged, ko }, now: NOW });
  assert.equal(plan.creates[0].access, 'members');
  assert.ok(plan.warnings.some((x) => /access differs/.test(x)));
});

test('noRemove: a failed members fetch blocks removals for that language only', () => {
  const existing = new Map([['gone-1', { slug: 'gone-1', source: 'youtube-sync', is_published: true, youtube_id_en: 'EN000000099', youtube_id_ko: null, published_at: '2026-09-01' }]]);
  const other = indexLanguage([vid('EN000000001', 'still-here', '2026-10-01')], 'en').byKey;
  const blocked = planSync({ existing, fetched: { en: other, ko: null }, now: NOW, noRemove: new Set(['en']) });
  assert.equal(blocked.patches.filter((p) => p.slug === 'gone-1').length, 0);
  const normal = planSync({ existing, fetched: { en: other, ko: null }, now: NOW });
  assert.equal(normal.patches.filter((p) => p.slug === 'gone-1').length, 1);
});

test('end to end: members playlist configured, unlisted video lands as access=members; unset env = old behaviour', async () => {
  const mkFetch = () => async (url, opts) => {
    const u = String(url);
    if (u.includes('playlistItems')) {
      const pl = new URL(u).searchParams.get('playlistId');
      const id = { PLFREE: 'EN000000001', PLMEM: 'EN0000000M3' }[pl];
      return { ok: true, json: async () => ({ items: id ? [{ contentDetails: { videoId: id } }] : [] }) };
    }
    if (u.includes('/videos?')) {
      const ids = new URL(u).searchParams.get('id').split(',');
      return { ok: true, json: async () => ({ items: ids.map((id) => ({ id,
        snippet: { title: 'T-' + id, description: `PX: key=${id === 'EN000000001' ? 'free-a' : 'mem-a'}; part=1; topic=X`, publishedAt: '2026-10-01T00:00:00Z' },
        status: { privacyStatus: id === 'EN000000001' ? 'public' : 'unlisted' } })) }) };
    }
    if (u.includes('/rest/v1/shorts_videos') && !(opts && opts.method)) return { ok: true, json: async () => [] };
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const base = { YOUTUBE_API_KEY: 'k', SUPABASE_URL: 'https://x.test', SUPABASE_SERVICE_ROLE_KEY: 's', YT_PLAYLIST_ID_EN: 'PLFREE', YT_PLAYLIST_ID_KO: 'PLNONE' };
  const off = await syncShorts(base, { dry: true, fetchFn: mkFetch(), now: NOW });
  assert.deepEqual(off.plan.creates.map((r) => r.slug), ['free-a']);                                   // members id unset: nothing from it
  const on = await syncShorts({ ...base, YT_PLAYLIST_ID_MEMBERS_EN: 'PLMEM' }, { dry: true, fetchFn: mkFetch(), now: NOW });
  const acc = Object.fromEntries(on.plan.creates.map((r) => [r.slug, r.access]));
  assert.deepEqual(acc, { 'free-a': 'free', 'mem-a': 'members' });
  assert.equal(on.fetchedMembers, 1);
});
