# 작업 지시서 2단계 — 무게·횟수 추천 로직

> **선행:** `TASKS.md`의 7건을 먼저 끝내라. 특히 3번(YAML 이스케이프)과 4번(delta)은
> 이 단계의 8번 작업이 그 위에 붙는다.
>
> **원리와 판정 규칙은 `docs/PROGRESSION.md`에 있다. 작업 시작 전에 전부 읽어라.**
> 이 문서는 "어디에 무엇을 만들지"만 적는다. 규칙의 근거는 그 문서에 있다.
>
> 새로 만들지 말고 기존 코드 위에 붙인다. 빌드(`npm run build`)와 테스트(`npm test`)가
> 각 작업 끝에서 통과해야 한다.

---

## 작업 1 — 종목 타입 확장

**파일:** `src/types/workout.ts`

`Exercise`에 다음을 추가한다. 전부 필수 필드로 만들되, 기존 데이터를 위해 작업 2에서 채운다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `tier` | `'primary' \| 'secondary' \| 'isolation'` | 종목 등급 |
| `loadType` | `'barbell' \| 'dumbbell_pair' \| 'dumbbell_single' \| 'machine' \| 'cable' \| 'bodyweight' \| 'bodyweight_loaded'` | 기구 형태 |
| `incrementKg` | `number` | 이 종목에서 실제로 올릴 수 있는 최소 단위 |
| `repRangeLow` | `number` | 횟수 범위 하단 |
| `repRangeHigh` | `number` | 횟수 범위 상단 |

`ExerciseTier`와 `LoadType`은 별도 타입으로 export 한다.

**완료 조건:** `npx tsc --noEmit`이 이 파일 때문에 실패하지 않는다(다른 파일의 오류는 작업 2에서 해소된다).

---

## 작업 2 — 기본값과 자동 분류

**파일:** `src/utils/progression.ts` (신규)

`docs/PROGRESSION.md` §3.1의 표를 상수로 옮긴다.

- `TIER_DEFAULTS` — 등급별 `repLow`, `repHigh`, `rpeLow`, `rpeHigh`, `restSeconds`
- `DEFAULT_INCREMENT` — 기구별 기본 증량 단위
- `classifyExercise(name, muscleGroup)` — 기존 종목의 `tier`를 추정한다.
  이름에 스쿼트·벤치·데드리프트·오버헤드가 들어가면 `primary`,
  `muscleGroup`이 이두·삼두·복근이면 `isolation`, 나머지는 `secondary`.

**파일:** `src/store/useWorkoutStore.ts`

`loadInitialState`에서 종목을 읽을 때 새 필드가 없으면 위 함수와 기본값으로 채운다.
이미 값이 있으면 덮어쓰지 않는다.

**완료 조건:** 기존 localStorage 데이터로 앱을 켜도 오류 없이 뜨고, 모든 종목에 다섯 필드가 채워져 있다.

---

## 작업 3 — 판정 로직 (핵심)

**파일:** `src/utils/progression.ts`

순수 함수만 만든다. store를 import 하지 않는다. 필요한 것은 전부 인자로 받는다.

### 3-1. 보조 함수

```
estimate1RM(weightKg, reps, rpe?) -> number
```
Epley 공식 `무게 × (1 + 유효횟수/30)`. 유효횟수 = `reps + RIR`, RIR = `10 - rpe`.
`rpe`가 없으면 RIR 2로 가정. 유효횟수는 **12로 상한**을 둔다(그 이상은 오차가 커진다).

```
roundToIncrement(kg, increment) -> number
setRpeTargets(tier, nSets) -> number[]
```
`setRpeTargets`는 등급 밴드를 세트 수에 걸쳐 선형 보간하고 0.5 단위로 반올림한다.
보조 운동 3세트면 `[8, 9, 10]`이 나와야 한다.

### 3-2. 지난 수행 읽기

```
lastPerformance(history, exerciseId) -> LastPerformance | null
```

`history`는 최신순이라고 가정한다. 이 종목이 나오는 **가장 최근 세션**에서:

- **작업 무게** = 완료 세트 중 가장 많이 나온 무게. 동률이면 무거운 쪽.
  (⚠️ 현재 코드처럼 `completedSets[0]`을 쓰면 안 된다 — `docs/PROGRESSION.md` §1 결함 3)
- 그 무게에서의 **세트별 횟수 배열**(세트 순서대로), 최소·최대
- 그 무게에서 **마지막 완료 세트의 RPE**
- 그 세션의 **최고 추정 1RM**

완료되지 않았거나 횟수가 0인 세트는 제외한다.

### 3-3. 정체 판정

```
isStalled(history, exerciseId, window = 3) -> boolean
```

최근 `window`개 세션의 최고 추정 1RM이 그 이전 최고치를 못 넘으면 참.
데이터가 `window + 1` 세션보다 적으면 **거짓**(판단하지 않는다).
0.5% 여유를 둔다.

### 3-4. 추천

```
recommend(exercise, history, opts?) -> Recommendation
```

`opts`: `{ setCount?: number (기본 3), deloadWeek?: boolean }`

반환값에 담을 것:
- `action` — `'first_time' | 'deload' | 'back_off' | 'hold' | 'increase_load' | 'increase_reps' | 'add_external_load'`
- `sets` — 세트별 `{ weightKg, reps, targetRpe }`
- `restSeconds`
- `reason` — **한국어 한 문장.** 화면과 마크다운 양쪽에 그대로 쓴다
- `stalled` — boolean
- `basis` — 판정 근거(지난 날짜·작업 무게·세트별 횟수·마지막 RPE·추정 1RM)

**판정 순서는 `docs/PROGRESSION.md` §3.2 표를 그대로 따른다.** 위에서부터 먼저 걸리는 것이 이긴다. 임의로 순서를 바꾸지 마라.

맨몸(`bodyweight`)은 증량 자리에서 `add_external_load`로 갈라진다.

### 3-5. 세션 안 교정

```
adjustRemaining(exercise, completedSet, targetRpe, remainingSets) -> SetTarget[]
```

`docs/PROGRESSION.md` §3.3 표. 목표와의 차이가 ±1이면 그대로, 2 이상 힘들었으면 −10%,
2 이상 쉬웠으면 +5%. 결과는 `roundToIncrement`로 반올림한다.

**완료 조건:** `src/utils/__tests__/progression.test.ts`에 아래가 전부 통과한다.

| 케이스 | 입력 | 기대 |
|---|---|---|
| 첫 기록 | history 비어 있음 | `first_time`, 횟수 = 하단 |
| 상단 도달 | 보조, 8–12, 50kg × 12/12/12 | `increase_load`, 52.5kg × 8 |
| 상단 미달 | 보조, 8–12, 50kg × 10/10/9 | `increase_reps`, 50kg, 세트별 11/11/10 |
| 하단 미달 | 보조, 8–12, 50kg × 7/6/6 | `hold`, 50kg × 8 |
| 너무 쉬움 | 보조, 8–12, 50kg × 9/9/9, 마지막 RPE 6 | `increase_load` |
| 너무 힘듦 | 보조, 8–12, 50kg × 8/8/8, 마지막 RPE 11.5 상당 | `back_off`, 45kg |
| 큰 점프 | 고립, 10–15, **10kg 덤벨 × 15/15/15**, 증량 단위 2kg (= 20%, 임계 15% 초과) | 증량하지 않고 `increase_reps`. 상단이 **18회**로 확장되고 목표는 16/16/16 |
| 작은 점프 | 고립, 10–15, **40kg 머신 × 15/15/15**, 증량 단위 5kg (= 12.5%) | `increase_load`, 45kg × 10 |
| 맨몸 | `bodyweight`, 상단 도달 | `add_external_load` |
| RPE 없음 | 위 케이스들에서 rpe 전부 undefined | 횟수 기반 판정은 그대로, RPE 기반 분기는 발동 안 함 |
| 정체 | 4세션 이상, 최근 3세션 최고 e1RM이 그 이전 이하 | `stalled === true` |
| 정체 판단 불가 | 세션 2개뿐 | `stalled === false` |

`npm test`가 전부 통과해야 한다.

---

## 작업 4 — RIR 게이지 (가장 중요)

**시안:** `design/` 폴더의 `Main.dc.html`(세트 전), `Record.dc.html`(세트 후),
`Gauge.dc.html`(눌러보는 컴포넌트 시트), `Volume.dc.html`(주간 볼륨).
브라우저로 직접 열어서 보고 그대로 따라 만들어라.

**파일:** `src/components/workout/RirGauge.tsx` (신규)

하나의 컴포넌트가 두 모드를 가진다.

| 모드 | 표시 | 동작 |
|---|---|---|
| `prescribe` | "N개 남기고 멈춘다", 목표 구간이 검게 칠해짐 | 읽기 전용 |
| `record` | "몇 개 더 됐을까?", 같은 트랙이 눌리는 상태 | 탭 → `onPick(rir)` |

**규칙:**
- 눈금은 `0 / 1 / 2 / 3 / 4+` 다섯 개. 0.5 단위 없음.
- 목표 구간은 **목표 ±1**. 목표 2면 칠해지는 구간은 1~3.
- **목표는 세트마다 다르다.** `setRpeTargets`가 준 값을 RIR로 바꿔 쓴다(RIR = 10 − RPE).
- 색은 `#111111`(잉크), `#f5f5f5`(트랙), `#ffffff`(선택 표시)만. 초록/빨강은
  **무게가 바뀔 때 결과 문장에서만** 쓴다(증량 `#007d48`, 감량 `#d30005`).
- 그림자 금지. 모서리 반경은 18 / 24 / 9999 셋만.
- `record` 모드의 기본 선택은 **그 세트의 목표 RIR**로 미리 맞춰 둔다.
- **건너뛰기를 허용한다.** RPE 없이도 로직이 돌아가야 한다.

**파일:** `src/components/workout/ActiveWorkoutView.tsx`

- 세트 완료 버튼을 누르면 게이지가 `record` 모드로 바뀐다.
- 탭하면 `WorkoutSet.rpe`에 `10 - rir`을 저장하고, `adjustRemaining`을 호출해
  **남은 세트의 무게를 즉시 갱신**한다. 무게가 바뀌면 그 셀을 색으로 표시한다.
- 워밍업 세트는 흐리게, **지금 할 세트만 흑백 반전**한다(시안 참고).

**완료 조건:** 세트를 완료하고 RIR을 탭하면 `activeSession`의 해당 세트에 `rpe`가 들어가고,
남은 세트의 `weightKg`이 §3.3 표대로 바뀐다. 탭하지 않고 넘어가도 오류가 없다.

---

## 작업 5 — 종목 편집 화면

**파일:** `src/components/exercises/` 아래 기존 편집 폼

작업 1에서 추가한 다섯 필드를 편집할 수 있게 한다. 작업 2의 자동 분류는 **추정일 뿐**이므로
사용자가 반드시 고칠 수 있어야 한다.

- `tier` — 세 개짜리 선택. 각 항목에 예시를 붙여라(주: 스쿼트·벤치·데드 / 보조: 랫풀다운·로우 / 고립: 컬·레이즈).
- `loadType` — 선택. 고르면 `incrementKg`가 기본값으로 채워지되, 사용자가 덮어쓸 수 있다.
- `repRangeLow` / `repRangeHigh` — 숫자. `tier`를 바꾸면 기본값이 따라온다.

**완료 조건:** 종목을 편집해 저장하면 값이 유지되고, 다음 세션 추천에 반영된다.

---

## 작업 6 — 세션 시작 시 추천 적용

**파일:** `src/store/useWorkoutStore.ts`

`startRoutineSession`과 `startEmptySession`의 무게·횟수 결정을 `recommend()` 호출로 교체한다.
현재의 `completedSets[0]` 복사 로직은 **삭제한다.**

각 `SessionExercise`에:
- `recommend()`가 준 `sets`로 세트를 만든다(`weightKg`, `reps`, `targetRpe`)
- `reason`과 `action`을 보관한다 — 화면의 "왜?" 한 줄과 마크다운에 쓴다
- `restSeconds`는 추천값을 쓴다(기존 90초 고정 대신)

`WorkoutSet`에 `targetRpe?: number`를 추가한다.

**완료 조건:** 과거 기록이 있는 종목으로 세션을 시작하면 무게/횟수가 지난번과 **다르게**
채워지고, 화면에 이유 한 줄이 뜬다.

---

## 작업 7 — 주간 볼륨 화면

**파일:** `src/utils/progression.ts`에 계산 함수, 화면은 새 컴포넌트

- `isHardSet(set, tier)` — 완료 세트 중 주 운동은 RPE 6 이상, 보조·고립은 7 이상.
  `rpe`가 없으면 **일단 세되 별도 카운트**로 표시한다("확인 불가 N세트").
- 부위별 주간 하드 세트 수를 센다. 주는 월요일 시작.
- 목표 대역은 `docs/PROGRESSION.md` §2.6 표. 하한 미달이면 "부족" 표시.
- `Volume.dc.html` 시안 그대로. **RIR 게이지와 같은 시각 언어**를 쓴다 —
  검은 구간이 목표 대역, 흰 점이 현재 위치.

**완료 조건:** 이번 주 세션이 있으면 부위별 세트 수와 대역이 보이고, 하한 미달 부위가 표시된다.

---

## 작업 8 — 마크다운 출력 확장

**파일:** `src/utils/markdownGenerator.ts`

> `TASKS.md` 4번(delta)이 이미 들어가 있어야 한다. 그 위에 붙인다.

프론트매터의 종목별 항목에 추가:

| 키 | 값 |
|---|---|
| `tier` | 종목 등급 |
| `top_set` | `"70kg x 8 @RIR2"` 형식 |
| `e1rm` | 추정 1RM (소수 첫째 자리) |
| `e1rm_delta` | 직전 세션 대비 변화 |
| `next` | 다음 세션 추천 (`"72.5kg x 6"`) |
| `next_reason` | `recommend()`의 `reason` |
| `stalled` | boolean |

주 단위 블록도 추가:

```
week:
  sets_by_muscle: { ... }
  under_target: [ ... ]
  rep_distribution: { low, moderate, high }   # 1~5 / 6~15 / 16~30 비율
deload:
  weeks_since_last: N
  stalled_exercises: [ ... ]
```

문자열은 전부 `TASKS.md` 3번의 `yamlString()`으로 이스케이프한다.

**완료 조건:** 생성된 마크다운 하나만 읽고도 "무엇이 늘었고 다음에 뭘 할지"를 알 수 있다.
기존 테스트가 통과하고, 새 필드에 대한 테스트가 추가돼 있다.

---

## 끝나고 할 것

`RESULT.md`에 작업별로 적어라.

- 무엇을 바꿨나 (파일과 함수)
- 완료 조건을 **어떻게 확인했나** (실행한 명령과 그 출력)
- 판단이 필요했던 지점과 무엇을 골랐나
- **확인하지 못한 것은 "확인하지 못했다"고 분명히 적어라. 넘겨짚지 마라.**
