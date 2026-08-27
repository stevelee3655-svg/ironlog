# IronLog 수정 지시서 — 7건

작성: 2026-08-26 · 작성자: Claude Code (설계·검토 담당) · 수행자: Antigravity Gemini

이 코드베이스는 이미 잘 돌아간다. 빌드가 통과하고(`npm run build` 성공, TS 오류 0),
기능도 충분하다. **새로 만들지 말고 아래 7건만 고친다.** 구조를 갈아엎지 않는다.

## 지켜야 할 것

- 기존 디자인·컴포넌트 구조·상태 관리 방식을 바꾸지 않는다. 요청한 것만 고친다.
- 한 건을 고칠 때마다 `npm run build`와 `npm run test`를 돌리고, 통과한 뒤 커밋한다.
- 커밋 메시지는 한국어로, 무엇을 왜 고쳤는지 한 줄로 적는다.
- **비밀 값(웹훅 URL, 공유 비밀)을 소스 코드나 커밋에 절대 넣지 않는다.**
- 작업 순서는 번호 순이다. 4번이 가장 중요하다.

---

## 1. GAS 웹훅에 인증이 없다 — 누구나 드라이브에 쓸 수 있다

**파일:** `src/services/driveSync.ts`

**문제.** `GAS_SCRIPT_CODE` 안의 배포 안내가 액세스 권한을 "모든 사용자(Anyone)"로 하라고
하는데, `doPost`에 어떤 확인도 없다. 게다가 저장 폴더가 요청 본문에서 온다:

```js
const folderPath = payload.folder || "Wiki/raw/건강";
```

그래서 이 URL을 아는 사람은 누구나 사용자의 구글 드라이브 루트에 **아무 폴더나 만들고
아무 파일이나 쓸 수 있다.** URL 하나가 유일한 자물쇠이고, 그것은 브라우저
`localStorage`에 평문으로 있다.

**고칠 것.**

(1) `GAS_SCRIPT_CODE`의 `doPost` 맨 앞에 공유 비밀 검사를 넣는다. 스크립트 상단에
사용자가 직접 값을 채우는 상수를 둔다:

```js
// [필수] 아무 문자열이나 길게 지어 넣으세요. 앱 설정에도 같은 값을 넣습니다.
const SHARED_SECRET = "여기에_긴_임의_문자열을_넣으세요";

function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    if (!SHARED_SECRET || payload.secret !== SHARED_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false, message: "인증 실패"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    // ... 이하 기존 코드
```

(2) **`folder`를 요청에서 받지 않는다.** GAS 안에 고정한다:

```js
const FOLDER_PATH = "Wiki/raw/건강";   // 상수. payload에서 받지 않는다.
```

`const folderPath = payload.folder || ...` 줄을 지우고 `FOLDER_PATH`를 쓴다.

(3) 앱에서 비밀을 함께 보낸다. `settings`에 `gasSharedSecret: string`을 추가하고
(`src/types/workout.ts`의 설정 타입, 스토어의 기본값·로드·저장 모두), 설정 화면
(`src/components/settings/SettingsView.tsx`)에 웹훅 URL 아래 입력란을 하나 더 만든다.
`syncWorkoutToGoogleDrive`의 시그니처를 바꿔 비밀을 받고 payload에 `secret`으로 싣는다.

```ts
export async function syncWorkoutToGoogleDrive(
  session: WorkoutSession,
  webhookUrl: string,
  sharedSecret: string
): Promise<SyncResponse> {
```

payload에서 `folder` 필드를 제거하고 `secret: sharedSecret`을 넣는다.
`testGasWebhookConnection`도 같이 고친다. 호출부를 모두 찾아 인자를 맞춘다.

(4) `GasScriptModal.tsx`의 안내 문구에 "이 비밀 문자열을 스크립트와 앱 양쪽에 똑같이
넣어야 한다"는 설명을 한 줄 추가한다.

**완료 조건:** 비밀 없이 POST하면 `success: false, message: "인증 실패"`가 오고,
`folder`를 payload에 넣어도 무시된다.

---

## 2. 같은 날 두 번 운동하면 첫 기록이 사라진다

**파일:** `src/utils/markdownGenerator.ts` (`getWorkoutFilename`)

**문제.** 파일명이 `${날짜}_운동_${제목}.md`인데 GAS가 동명 파일에 `setContent`를 한다.
오전에 하체, 저녁에 또 하체를 하면 **오전 기록이 조용히 덮어써진다.**

**고칠 것.** 파일명에 시작 시각을 넣어 유일하게 만든다.

```ts
export function getWorkoutFilename(session: WorkoutSession): string {
  const dateStr = session.date || new Date().toISOString().split('T')[0];
  const titleStr = (session.title || session.routineName || '운동')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-');

  // 같은 날 두 번 운동해도 서로 덮어쓰지 않도록 시작 시각을 넣는다.
  let timeStr = '';
  if (session.startTime) {
    const d = new Date(session.startTime);
    if (!Number.isNaN(d.getTime())) {
      timeStr = `-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }

  return `${dateStr}${timeStr}_운동_${titleStr}.md`;
}
```

**완료 조건:** 시작 시각이 다른 두 세션이 서로 다른 파일명을 갖는다. 테스트를 하나 추가한다.

---

## 3. 이름에 큰따옴표가 있으면 프론트매터가 깨진다

**파일:** `src/utils/markdownGenerator.ts` (`generateWorkoutMarkdown`)

**문제.** 값을 그대로 큰따옴표 안에 넣는다.

```ts
routine_name: "${routine}"
```

루틴 이름이 `가슴 "폭파" 루틴`이면 결과는 이렇게 된다:

```yaml
routine_name: "가슴 "폭파" 루틴"
```

YAML 이중따옴표 스칼라 안의 이스케이프 안 된 `"`는 문법 위반이라, **옵시디언이 그 노트의
속성을 전부 읽지 못한다.** `title`, `condition`, `routine_name`, `start_time`, `end_time`,
그리고 `target_muscles` 목록 항목이 모두 해당된다.

**고칠 것.** 헬퍼를 만들어 모든 문자열 값에 쓴다.

```ts
function yamlString(value: unknown): string {
  const s = String(value ?? '');
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
```

프론트매터 생성부를 전부 이 헬퍼로 감싼다. 목록 항목도 마찬가지다:

```ts
const frontmatterMuscles = muscles.map(m => `  - ${yamlString(m)}`).join('\n');
```

**완료 조건:** 루틴 이름에 `"`가 들어간 세션으로 마크다운을 만들어도 프론트매터가
유효하다. 테스트를 추가한다.

---

## 4. 직전 대비(delta)가 없다 — **이게 가장 중요하다**

**파일:** `src/utils/markdownGenerator.ts`, `src/services/driveSync.ts`, 호출부

**문제.** 이 앱의 존재 이유는 "운동이 끝나는 즉시 LLM이 읽고 피드백을 주는 것"이다.
그런데 생성되는 마크다운에 **과거와의 비교가 한 글자도 없다.** 볼륨·세트·RPE는 다 있지만
"지난번보다 5kg 늘었다"가 없다. LLM이 그걸 말하려면 과거 파일을 전부 읽어야 하고,
그러면 파일 한 장으로 즉시 판단한다는 목적이 무너진다.

**고칠 것.** 아래 함수들을 `markdownGenerator.ts`에 추가한다. 이 로직은 별도로 테스트해
검증한 것이니 그대로 옮긴다.

```ts
export interface TopSet { weightKg: number; reps: number; }

/** 완료된 세트 중 최고 세트. 중량 우선, 같으면 횟수로 정한다. */
export function topSetOf(exercise: SessionExercise): TopSet | null {
  const done = exercise.sets.filter(s => s.isCompleted);
  if (done.length === 0) return null;

  let best = done[0];
  for (const s of done) {
    if (s.weightKg > best.weightKg) best = s;
    else if (s.weightKg === best.weightKg && s.reps > best.reps) best = s;
  }
  return { weightKg: best.weightKg, reps: best.reps };
}

/**
 * 이 세션 이전의 기록에서 종목별 최고 세트를 뽑는다.
 * history는 최신이 앞에 오는 배열이다.
 */
export function previousTops(
  history: WorkoutSession[],
  currentSessionId: string
): Record<string, TopSet> {
  const result: Record<string, TopSet> = {};

  // 현재 세션을 뺀 나머지를 최신순으로 훑으며, 처음 만난 종목의 값을 쓴다.
  for (const past of history) {
    if (past.id === currentSessionId) continue;
    for (const ex of past.exercises) {
      if (result[ex.exerciseId]) continue;      // 더 최근 기록이 이미 있다
      const top = topSetOf(ex);
      if (top) result[ex.exerciseId] = top;
    }
  }
  return result;
}

function signed(n: number, unit: string): string {
  const rounded = Math.round(n * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${rounded}${unit}`;
}

/** "+5kg" | "-5kg" | "+2회" | "유지" | "신규" | "" */
export function computeDelta(exercise: SessionExercise, prev?: TopSet): string {
  const top = topSetOf(exercise);
  if (!top) return '';
  if (!prev) return '신규';

  const dw = top.weightKg - prev.weightKg;
  if (dw !== 0) return signed(dw, 'kg');

  const dr = top.reps - prev.reps;
  if (dr !== 0) return signed(dr, '회');

  return '유지';
}
```

**그리고 마크다운에 실어야 한다.** `generateWorkoutMarkdown`의 시그니처를 바꾼다:

```ts
export function generateWorkoutMarkdown(
  session: WorkoutSession,
  prevTops: Record<string, TopSet> = {}
): string
```

프론트매터의 각 종목에 대해 아래 세 값을 **기계가 읽을 수 있게** 넣는다. 지금은 종목별
정보가 프론트매터에 전혀 없으므로 `exercises:` 블록을 새로 만든다 (본문 표와 별개로).

```yaml
exercises:
  - id: ex_123
    name: "바벨 스쿼트"
    muscle: "하체"
    sets: 3
    top_set: "70kg × 8"
    volume_kg: 1770
    delta: "+5kg"
```

본문의 종목 제목 줄에도 사람이 읽도록 함께 적는다:

```ts
md += `\n### ${idx + 1}. ${ex.exerciseName} (${ex.muscleGroup}) — 최고 ${topLabel}, 직전 대비 ${delta}\n`;
```

호출부(`driveSync.ts`의 `syncWorkoutToGoogleDrive`, `copyMarkdownToClipboard`,
`downloadMarkdownFile`, 그리고 `WorkoutSummaryModal`·`HistoryDetailModal`에서 부르는
곳)를 모두 찾아 `previousTops(history, session.id)`를 계산해 넘긴다. 스토어에서
`history`를 가져올 수 있다.

**완료 조건:**
- 같은 종목을 두 번째로 한 세션의 마크다운에 `delta: "+5kg"` 같은 값이 들어간다
- 처음 하는 종목은 `"신규"`, 똑같으면 `"유지"`
- 아래 경우를 테스트로 덮는다: 중량 증가 / 중량 감소 / 중량 같고 횟수 증가 / 완전 동일 /
  직전 기록 없음 / 완료되지 않은 세트는 최고 세트 계산에서 제외

---

## 5. 자동 재전송이 없다 — "전송 대기 중"이 라벨일 뿐이다

**파일:** `src/store/useWorkoutStore.ts`, `src/App.tsx`

**문제.** `syncStatus: 'pending'`이 저장되지만, `online` 이벤트 리스너도 재시도 루프도
없다(코드 전체를 검색해 확인했다). 헬스장에서 신호가 없어 전송이 실패하면, 사용자가
기록 탭에 들어가 손으로 "지금 전송"을 눌러야만 올라간다. **이 앱이 없애려던 바로 그
수동 단계다.**

**고칠 것.**

(1) 스토어에 밀린 것을 모두 보내는 액션을 추가한다:

```ts
flushPendingSyncs: async () => {
  const { history, settings, updateSessionSyncStatus } = get();
  if (!settings.gasWebhookUrl) return { sent: 0, failed: 0 };

  const pending = history.filter(
    s => s.syncStatus === 'pending' || s.syncStatus === 'failed'
  );

  let sent = 0;
  let failed = 0;

  for (const session of pending) {
    const prev = previousTops(history, session.id);
    const res = await syncWorkoutToGoogleDrive(
      session, settings.gasWebhookUrl, settings.gasSharedSecret, prev
    );
    if (res.success) {
      updateSessionSyncStatus(session.id, 'synced');
      sent += 1;
    } else {
      updateSessionSyncStatus(session.id, 'failed', res.message);
      failed += 1;
    }
  }

  return { sent, failed };
},
```

한 건이 실패해도 **나머지는 계속 시도한다.** 성공한 것만 `synced`가 된다.

(2) `App.tsx`에서 두 시점에 부른다 — 앱이 뜰 때, 그리고 통신이 돌아올 때:

```tsx
useEffect(() => {
  const flush = useWorkoutStore.getState().flushPendingSyncs;
  flush();                                   // 앱 시작 시 한 번
  const onOnline = () => { flush(); };
  window.addEventListener('online', onOnline);
  return () => window.removeEventListener('online', onOnline);
}, []);
```

(3) 홈/기록 화면 상단에 대기 건수를 보여준다. 이미 `HistoryView`에 동기화 표시가 있으니
같은 스타일을 따른다. **실패를 숨기지 않는다** — 대기 중이면 사용자가 볼 수 있어야 한다.

**완료 조건:** 개발자도구 Network를 Offline으로 두고 운동을 종료하면 `pending`으로 남고,
Online으로 바꾸면 자동으로 올라가 `synced`가 된다.

---

## 6. 마크다운이 다른 에이전트에게 지시한다

**파일:** `src/utils/markdownGenerator.ts` (맨 끝 블록)

**문제.** 생성되는 파일 끝에 이런 블록이 붙는다:

```
> [!tip] AI 에이전트 브리핑 안내
> ... LLM 에이전트는 ... `wiki/concepts/운동_분석.md`에 반영할 수 있습니다.
```

이 볼트는 여러 에이전트가 동시에 읽는다(클로드 코드 · 안티그래비티 · 오픈클로 아이리스 ·
웹 제미나이). 볼트의 규약 문서는 **"위키에 할 일을 적어 두면 다음에 오는 에이전트가
그것을 자기 임무로 읽고 실행해 버린다"**고 명시적으로 경고하며, 그래서 담당을 못박게
되어 있다. 데이터 파일이 에이전트에게 작업을 지시해서는 안 된다.

**고칠 것.** 그 `[!tip]` 블록을 통째로 지운다. 대신 사실만 한 줄 남긴다:

```ts
md += `\n---\n\n*IronLog에서 자동 생성된 기록입니다.*\n`;
```

**완료 조건:** 생성된 마크다운에 다른 에이전트에게 무엇을 하라고 지시하는 문장이 없다.

---

## 7. 실패하는 테스트와 로케일 의존 숫자

**파일:** `src/utils/__tests__/markdownGenerator.test.ts`, `src/utils/markdownGenerator.ts`

**문제 (1).** `npm run test`가 4개 중 1개 실패한다. 테스트는 `'메모: 마지막 세트...'`를
기대하는데 코드는 `- **메모:** 마지막 세트...`를 내보낸다.

**고칠 것.** 코드의 출력이 의도한 형식이므로 **테스트를 실제 출력에 맞춘다.**

```ts
expect(md).toContain('**메모:** 마지막 세트 드롭세트 느낌으로 쥐어짬');
```

**문제 (2).** `stats.completedVolume.toLocaleString()`을 데이터 파일에 쓰고 있다. 실행
환경의 로케일에 따라 숫자 표기가 달라져, 같은 기록이 기기마다 다르게 저장될 수 있다.

**고칠 것.** 직접 구현한다.

```ts
function comma(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
```

`toLocaleString()` 호출을 전부 이것으로 바꾼다.

**완료 조건:** `npm run test`가 전부 통과하고, 3번·4번에서 추가한 테스트도 함께 통과한다.

---

## 끝나면

1. `npm run build`와 `npm run test`가 모두 통과하는지 확인한다
2. 7건 각각에 대해 **무엇을 고쳤고 어떻게 확인했는지** 한 줄씩 정리해 `RESULT.md`에 쓴다
3. 확인하지 못한 것이 있으면 "확인하지 못했다"고 분명히 적는다. 넘겨짚지 않는다
