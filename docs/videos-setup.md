# 무료 영상(Shorts) 설정 안내

사이트는 **Cloudflare Pages**라서, 자동 동기화는 Netlify 함수 대신 **Cloudflare Worker**(`workers/youtube-sync/`)로 만들었습니다.

## 내가 직접 할 일 (순서대로)

1. **Supabase**: SQL Editor에서 `supabase/shorts_videos.sql` 전체를 실행합니다.
   - 샘플 3행은 `is_published=false`라서 화면에 나오지 않습니다.
   - 화면 확인용으로 보고 싶으면 샘플 행에 진짜 11자리 YouTube ID를 넣고 `is_published=true`로 바꿉니다.
2. **YouTube**: 재생목록 2개(영어용, 한국어용)를 만들고 각 재생목록 ID(`PL...`)를 적어 둡니다. 공개 또는 일부 공개.
3. **Google Cloud**: YouTube Data API v3 키를 발급하고, API 제한을 "YouTube Data API v3"로 설정합니다.
4. **Worker 배포** (이 폴더에서 한 번):
   ```
   cd workers/youtube-sync
   npx wrangler login
   npx wrangler secret put YOUTUBE_API_KEY
   npx wrangler secret put YT_PLAYLIST_ID_EN
   npx wrangler secret put YT_PLAYLIST_ID_KO
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put SYNC_SECRET
   npx wrangler deploy
   ```
   - 비밀값 6개는 코드와 저장소에 넣지 않습니다. `SYNC_SECRET`은 아무 긴 문자열이면 됩니다.
   - `wrangler.toml`의 cron(`0 * * * *`)이 매시간 실행합니다.
5. **영상 설명란에 PX 줄 추가** (YouTube Studio 일괄 편집 가능, 새 영상은 올릴 때마다):
   ```
   PX: key=ea1-filing-status-01; part=1; topic=Filing Status
   ```
   - 영어판과 한국어판에 **같은 key**를 쓰면 한 카드로 묶입니다.
   - `key`는 영문 소문자·숫자·`-` 3~80자, `part`는 1·2·3, `topic`에는 `;`를 쓰지 않습니다.
   - PX 줄이 없거나 틀린 영상은 건너뜁니다(로그에 `skipped: no/invalid PX line`).
6. **먼저 시험 실행(dry run)**, 문제없으면 실제 실행:
   ```
   curl -H "x-sync-secret: <SYNC_SECRET>" "https://<worker주소>/?dry=1"
   curl -H "x-sync-secret: <SYNC_SECRET>" "https://<worker주소>/"
   ```
   - 비밀 없이 부르면 401이 나옵니다. `?dry=1`은 DB를 바꾸지 않고 변경 예정만 보여 줍니다.

## 동작 규칙 요약

- 사라진 영상: 해당 언어 칸(ID·제목·설명)을 비웁니다.
- 한쪽 언어만 남은 행이 그 언어마저 사라지면 행을 **숨김(`is_published=false`)** 으로 바꿉니다. 이때 ID는 지우지 않습니다(표의 "ID 최소 1개" 규칙 때문).
- 대시보드에서 숨긴 행은 동기화가 다시 공개하지 않습니다.
- `source='manual'` 행은 덮어쓰지 않습니다.
- YouTube API 오류나 빈 재생목록이면 삭제 단계를 건너뜁니다.

## 테스트

```
cd workers/youtube-sync
node --test test/sync.test.mjs
```
