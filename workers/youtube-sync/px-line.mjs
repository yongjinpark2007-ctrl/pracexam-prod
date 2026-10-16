// Prints the PX line to paste into BOTH the English and the Korean video description.
//   node px-line.mjs <English YouTube Shorts URL or 11-char video ID>
// Uses YouTube's public oEmbed (no API key, nothing is written anywhere).
import { topicFromTitle, partFromTitle } from './syncShorts.mjs';

export function slugFromTopic(topic) {
  const s = String(topic || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
  return s.length >= 3 ? s : '';
}

export function idFromInput(input) {
  const m = /(?:shorts\/|v=|youtu\.be\/)([\w-]{11})/.exec(input) || /^([\w-]{11})$/.exec(input.trim());
  return m ? m[1] : null;
}

async function main() {
  const id = idFromInput(process.argv[2] || '');
  if (!id) { console.error('Usage: node px-line.mjs <English Shorts URL or video ID>'); process.exit(1); }
  const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/shorts/' + id));
  if (!r.ok) { console.error('Could not read the video (HTTP ' + r.status + '). Is it public?'); process.exit(1); }
  const title = (await r.json()).title;
  const slug = slugFromTopic(topicFromTitle(title));
  if (!slug) { console.error('Could not make a key from the title: ' + title); process.exit(1); }
  console.log('Title: ' + title);
  console.log('Part (read from title): ' + (partFromTitle(title) ?? 'NOT FOUND - add "; part=1" yourself'));
  console.log('\nPaste this line at the end of BOTH descriptions (English and Korean):\n');
  console.log('PX: key=' + slug);
}

if (import.meta.url === new URL(process.argv[1], 'file://').href || process.argv[1]?.endsWith('px-line.mjs')) main();
