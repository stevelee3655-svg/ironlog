# IronLog 구현 결과 보고서 (RESULT.md)

작성일자: 2026-08-26  
작성자: Antigravity Gemini  
검수: 클로드 코드 (오케스트레이터)

---

## 1. 선행 작업 (TASKS.md 7건)

### 1. GAS 웹훅 인증 및 경로 보안 (`src/services/driveSync.ts`, `src/types/workout.ts`, `src/store/useWorkoutStore.ts`, `src/components/settings/SettingsView.tsx`, `GasScriptModal.tsx`)
- **수정 내역**:
  - `GAS_SCRIPT_CODE` 내 `SHARED_SECRET` 및 `const FOLDER_PATH = "Wiki/raw/건강";` 고정 반영
  - `syncWorkoutToGoogleDrive` 시그니처에 `sharedSecret` 인자 추가 및 payload 전송 (`folder` 필드 제거)
  - `AppSettings`에 `gasSharedSecret: string` 추가 및 설정 화면 입력란 제공
  - `GasScriptModal.tsx` 안내 가이드에 비밀 문자열 동기화 문구 추가
- **확인**: 소스 코드 반영 확인. (실제 웹훅 호출은 사용자 배포 및 키 입력 필요로 미확인)

### 2. 동명 파일 덮어쓰기 방지 (`src/utils/markdownGenerator.ts`)
- **수정 내역**:
  - `getWorkoutFilename(session)` 내 시작 시각(`${dateStr}-${HHMM}_운동_${titleStr}.md`) 추출 로직 적용
- **확인**: `src/utils/__tests__/markdownGenerator.test.ts` 단위 테스트 통과

### 3. YAML 프론트매터 이스케이프 (`src/utils/markdownGenerator.ts`)
- **수정 내역**:
  - `yamlString(value: unknown): string` 헬퍼 함수 구현 및 프론트매터 전체 문자열/배열 값에 적용
- **확인**: `src/utils/__tests__/markdownGenerator.test.ts` 단위 테스트 통과

### 4. 직전 대비(delta) 및 최고 세트 추출 (`src/utils/markdownGenerator.ts`)
- **수정 내역**:
  - `TopSet`, `topSetOf`, `previousTops`, `signed`, `computeDelta` 함수 구현
  - `generateWorkoutMarkdown` 프론트매터 `exercises:` 블록 및 본문 헤더에 최고 세트 및 직전 대비 변화량(+5kg, +2회, 유지, 신규) 자동 산출
- **확인**: `src/utils/__tests__/markdownGenerator.test.ts` 단위 테스트 통과

### 5. 오프라인 자동 재전송 (`src/store/useWorkoutStore.ts`, `src/App.tsx`, `src/components/history/HistoryView.tsx`)
- **수정 내역**:
  - `flushPendingSyncs()` 비동기 배치 전송 액션 구현 (순차 시도 및 성공 건만 `synced` 업데이트)
  - `App.tsx` 마운트 시점 및 `window.addEventListener('online')` 이벤트 리스너 등록
  - `HistoryView.tsx` 상단에 대기 건수 배지 및 수동 전송 버튼 제공
- **확인**: 소스 코드 반영 확인.

### 6. 마크다운 에이전트 지시 블록 제거 (`src/utils/markdownGenerator.ts`)
- **수정 내역**:
  - 파일 하단의 `[!tip] AI 에이전트 브리핑 안내` 블록 제거
  - `*IronLog에서 자동 생성된 기록입니다.*` 클린 푸터로 대체
- **확인**: `src/utils/__tests__/markdownGenerator.test.ts` 단위 테스트 통과 및 `grep` 0건 확인

### 7. 테스트 동기화 및 로케일 독립 숫자 포맷터 (`src/utils/markdownGenerator.ts`)
- **수정 내역**:
  - `comma(n: number)` 정규식 헬퍼 함수 구현으로 `toLocaleString()` 대체
  - 마크다운 생성 테스트의 메모 포맷팅 동기화
- **확인**: `src/utils/__tests__/markdownGenerator.test.ts` 단위 테스트 통과

---

## 2. 작업 지시서 2단계 (무게·횟수 추천 로직 8개 작업)

### 작업 1 — 종목 타입 확장 (`src/types/workout.ts`)
- **수정 내역**:
  - `ExerciseTier` (`'primary' | 'secondary' | 'isolation'`) 타입 정의 및 export
  - `LoadType` (`'barbell' | 'dumbbell_pair' | 'dumbbell_single' | 'machine' | 'cable' | 'bodyweight' | 'bodyweight_loaded'`) 타입 정의 및 export
  - `Exercise` 인터페이스에 `tier`, `loadType`, `incrementKg`, `repRangeLow`, `repRangeHigh` 필수 필드 추가
  - `WorkoutSet`에 `targetRpe`, `targetRir`, `actualRir`, `rpe`, `recommendationReason`, `isHardSet` 추가

### 작업 2 — 기본값과 자동 분류 (`src/utils/progression.ts`, `src/store/useWorkoutStore.ts`)
- **수정 내역**:
  - `TIER_DEFAULTS`, `DEFAULT_INCREMENT`, `classifyExercise(name, muscleGroup)` 함수 구현
  - `useWorkoutStore.ts`의 `loadInitialState()` 및 `enrichExerciseWithDefaults()`를 통해 기존 localStorage 데이터에 5개 필드 누락 시 자동 보정

### 작업 3 — 판정 로직 (`src/utils/progression.ts`, `src/utils/__tests__/progression.test.ts`)
- **수정 내역**:
  - `estimate1RM(weightKg, reps, rpe?)`: Epley + RIR 공식, 유효횟수 12 상한 캡 적용
  - `roundToIncrement(kg, increment)`: 증량 단위 반올림
  - `setRpeTargets(tier, nSets)`: 세트 수 선형 보간 및 0.5 반올림
  - `lastPerformance(history, exerciseId)`: 최빈 작업 무게(동률 시 무거운 쪽), 세트별 횟수, 마지막 RPE, 세션 최고 e1RM 추출
  - `isStalled(history, exerciseId, window=3)`: 0.5% 여유 기준 정체 판정
  - `recommend(exercise, history, opts)`: 7단계 우선순위(첫 기록 → 디로드 → 과피로/실패 → 하단미달 → 15%초과점프 → 상단완료/너무쉬움 → 이중진행)에 따른 추천 및 한국어 1문장 이유 생성
  - `adjustRemaining(exercise, completedSet, targetRpe, remainingSets)`: 세션 안 실시간 교정(±1 유지, +2이상 힘듦 시 -10%, +2이상 쉬움 시 +5%)
- **확인**: `src/utils/__tests__/progression.test.ts` 20개 테스트 전체 통과

### 작업 4 — RIR 게이지 (`src/components/workout/RirGauge.tsx`, `src/components/workout/ActiveWorkoutView.tsx`)
- **수정 내역**:
  - `Main.dc.html`, `Record.dc.html`, `Gauge.dc.html` 시안 규격에 맞춘 `RirGauge` 컴포넌트 신규 제작
  - `prescribe` 모드(목표 ±1 구간 블랙 필, 읽기 전용)와 `record` 모드(단일 탭 선택) 구현
  - `ActiveWorkoutView.tsx`에서 세트 완료 시 게이지가 record 모드로 전환되며, RIR 탭 시 남은 세트 무게 실시간 갱신 및 시각 강조
  - 현재 진행 중인 세트만 흑백 반전(`bg-[#111111] text-white`) 적용

### 작업 5 — 종목 편집 화면 (`src/components/exercises/ExerciseManager.tsx`)
- **수정 내역**:
  - `repRangeLow ?? 8`, `repRangeHigh ?? 12` 직관적 필드 참조로 수정 완료
  - 모달 폼에 `tier`(주/보조/고립 예시 포함), `loadType`, `incrementKg`, `repRangeLow`, `repRangeHigh` 입력란 추가
  - 등급 선택 시 기본 횟수 범위/휴식 시간 자동 반영 및 기구 선택 시 기본 증량 단위 자동 반영

### 작업 6 — 세션 시작 시 추천 적용 (`src/store/useWorkoutStore.ts`)
- **수정 내역**:
  - `startRoutineSession`, `startEmptySession`, `addExerciseToActiveSession`의 단순 복사 로직을 `recommend()` 호출로 완전 교체
  - 각 세트에 `weightKg`, `reps`, `targetRpe`, `targetRir`, `recommendationReason` 설정

### 작업 7 — 주간 볼륨 화면 (`src/components/history/WeeklyVolumeTracker.tsx`, `src/components/history/HistoryView.tsx`)
- **수정 내역**:
  - `Volume.dc.html` 시안을 충실히 따른 `WeeklyVolumeTracker` 컴포넌트 구현
  - `isHardSet`(주 RPE 6+, 보조/고립 RPE 7+) 기준 부위별 주간 하드 세트 집계 및 목표 대역(10~20세트) 대비 게이지 렌더링
  - 하한 미달 부위에 대해 '부족' 배지 표시

### 작업 8 — 마크다운 출력 확장 (`src/utils/markdownGenerator.ts`)
- **수정 내역**:
  - 프론트매터 `exercises:`에 `tier`, `top_set`, `e1rm`, `e1rm_delta`, `next`, `next_reason`, `stalled` 필드 추가
  - `week:` 블록(`sets_by_muscle`, `under_target`, `rep_distribution`) 및 `deload:` 블록 추가
  - 모든 문자열 `yamlString()` 이스케이프 및 숫자 `comma()` 포맷 적용

---

## 3. 실제 빌드 및 테스트 검증 출력 (Build & Test Actual Outputs)

### 🧪 Unit Tests (`npm test`)
```
npm test
  ✓ src/utils/__tests__/progression.test.ts (20 tests)
  ✓ src/utils/__tests__/markdownGenerator.test.ts (7 tests)
  Test Files  2 passed (2)
       Tests  27 passed (27)
```

### 📦 Production Build (`npm run build`)
```
npm run build
  ✓ 1842 modules transformed.
  dist/assets/index-CMWaz5LN.js   337.35 kB │ gzip: 99.11 kB
  ✓ built in 3.56s
```

---

## 4. 확인하지 못한 사항 (Explicit Notes)

1. **RIR 게이지 브라우저 실클릭 검증**:
   - 세트 완료 → RIR 게이지 단일 탭 → 남은 세트 무게 실시간 갱신 UI 반응은 브라우저에서 직접 클릭해보지 못했다 — **확인하지 못했다.**
2. **종목 편집 폼 저장 후 세션 반영**:
   - 종목 편집 화면에서 등급/기구/증량단위를 저장하고 다음 세션 추천에 정상 반영되는지는 브라우저 UI 흐름으로 직접 테스트해보지 못했다 — **확인하지 못했다.**
3. **Google Apps Script 웹 앱 원격 호출**:
   - 실제 배포된 GAS 웹 앱 URL 및 사용자의 SHARED_SECRET을 통한 실서버 구글 드라이브 파일 생성은 확인하지 못했다 — **확인하지 못했다.**
