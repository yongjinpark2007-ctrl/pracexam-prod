import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePx, indexLanguage, planSync, syncShorts } from '../syncShorts.mjs';

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
  assert.equal(parsePx('PX: key=ok-key-1; part=1').ok, false);
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
