import { CardioMetric, Exercise, ExerciseTier, LoadType, MuscleGroup } from '../types/workout';
import { TIER_DEFAULTS } from '../utils/progression';

/**
 * 수환이 다니는 헬스장의 실제 기구와 거기서 하는 운동 (2026-08-26 본인 확인).
 * ## 이름 규칙: 제조사를 예외 없이 붙인다
 * 같은 동작이라도 기구가 다르면 저항 곡선이 달라, 파나타 버티컬 체스트 프레스와
 * 아틀란티스 버티컬 체스트 프레스를 한 종목으로 묶으면 진행 판정이 망가진다.
 * **"지금 한 대뿐이니 생략"은 하지 않는다** — 헬스장이 바뀌면 그 가정이 깨지고,
 * 그때는 이미 쌓인 기록을 어느 기구 것인지 되짚을 수 없다(수환 지시, 2026-08-26).
 *
 * 튜플: [id, 이름, 부위, 등급, 기구, 증량단위kg, 유산소지표?]
 *
 * ⚠️ id는 기록과 연결되므로 **한 번 정하면 바꾸지 않는다.** 항목은 뒤에 붙이고 새 id를 준다.
 *
 * ## 증량 단위 근거
 * 핀 스택은 **왓슨 하이 로우 · 펙 덱 계열 · 왓슨 애니멀 듀얼스택**, 그리고 프라임
 * 셀렉토라이즈드 기구들뿐이다. **나머지는 전부 원판 로딩**이다(사이벡스 MTS 숄더
 * 프레스도 핀이 아니다).
 *
 * ### 프라임(녹색) — 2026-08-26 현장 사진으로 확인
 * 스택 눈금이 파운드다. 10lb(4.5kg)에서 시작해 **한 칸이 20lb(9.07kg)**씩 뛴다
 * (30/13.6 · 50/22.7 · 70/31.7 · … · 250/113.4). 한 칸이 9kg면 너무 커서 점진적
 * 과부하가 안 되는데, 그래서 이 기구에는 **PULL & TURN 애드온 다이얼**이 달려 있고
 * 그게 **5lb(2.27kg)** 단위로 더해진다. 따라서 프라임에서 실제로 움직일 수 있는
 * 최소 단위는 9kg이 아니라 **2.27kg**이고, 앱은 그 값을 쓴다.
 *
 * ### 아틀란티스 스탠딩 레터럴 레이즈 — 2026-08-26 현장 사진 + 본인 확인
 * 이것도 핀 스택이었다(원판인 줄 알고 있었다). 역시 파운드고 **한 칸이 15lb(6.8kg)**다
 * (15/7 · 30/14 · 45/20 · … · 195/89). 대신 **2.3kg짜리 보조 추가 두 개** 얹혀 있어서
 * 칸 사이를 메울 수 있다 — 그래서 최소 조절 단위는 6.8kg이 아니라 **2.3kg**이다.
 * 레터럴 레이즈는 원래 잔 무게로 올려야 하는 종목이라 이 차이가 특히 크다.
 *
 * 아직 눈금판을 못 본 핀 기구(왓슨 하이 로우 · 왓슨 애니멀 듀얼스택 · 아틀란티스 펙 덱)는
 * 잠정 5kg다. 사진을 더 찍어 오면 그 기구만 고치면 된다.
 */
type Seed = [string, string, MuscleGroup, ExerciseTier, LoadType, number, CardioMetric[]?];

const PIN = 5;          // 핀 스택 한 칸 — 아직 눈금판을 못 본 기구의 잠정값
const PRIME_PIN = 2.27; // 프라임: PULL & TURN 애드온 5lb (2026-08-26 사진 확인)
const ATL_PIN = 2.3;    // 아틀란티스 스탠딩 레터럴 레이즈: 보조 추 2.3kg (2026-08-26 확인)
const PLATE = 2.5;      // 원판 로딩 (양쪽 1.25kg)

export const GYM_EQUIPMENT: Seed[] = [
  // ── 1. 등 ────────────────────────────────────────────────
  ['gym_pn_superlowrow',   '[파나타] 슈퍼 로우 로우',            '등',   'secondary', 'machine', PLATE],
  ['gym_pn_superpowerrow', '[파나타] 슈퍼 파워 로우',            '등',   'secondary', 'machine', PLATE],
  ['gym_pn_circularrow',   '[파나타] 서큘러 로잉',               '등',   'secondary', 'machine', PLATE],
  ['gym_pn_highrow3',      '[파나타] 3지창 하이 로우 (구형)',     '등',   'secondary', 'machine', PLATE],
  ['gym_pr_extremerow',    '[프라임] 익스트림 로우',             '등',   'secondary', 'machine', PLATE],
  ['gym_pr_pinseatedrow',  '[프라임] 핀 로드 시티드 로우',        '등',   'secondary', 'machine', PRIME_PIN],
  ['gym_at_pullover',      '[아틀란티스] 풀오버',                '등',   'isolation', 'machine', PLATE],
  ['gym_at_seatedtbar',    '[아틀란티스] 시티드 티바 로우',       '등',   'secondary', 'machine', PLATE],
  ['gym_at_standtbar',     '[아틀란티스] 스탠딩 티바 로우',       '등',   'secondary', 'machine', PLATE],
  ['gym_wt_highrow',       '[왓슨] 하이 로우',                   '등',   'secondary', 'machine', PIN],
  ['gym_wt_lateralrow',    '[왓슨] 레터럴 로우',                 '등',   'secondary', 'machine', PLATE],

  // ── 2. 가슴 ──────────────────────────────────────────────
  ['gym_pn_declinepress',  '[파나타] 디클라인 체스트 프레스',     '가슴', 'secondary', 'machine', PLATE],
  ['gym_pn_verticalpress', '[파나타] 버티컬 체스트 프레스',       '가슴', 'secondary', 'machine', PLATE],
  ['gym_pn_horizbench',    '[파나타] 호리존탈 벤치 프레스',       '가슴', 'secondary', 'machine', PLATE],
  ['gym_pr_inclinepress',  '[프라임] 인클라인 체스트 프레스',     '가슴', 'secondary', 'machine', PLATE],
  ['gym_pr_pecdeck',       '[프라임] 펙 덱 플라이',              '가슴', 'isolation', 'machine', PRIME_PIN],
  ['gym_pr_revpecdeck',    '[프라임] 리버스 펙 덱',              '어깨', 'isolation', 'machine', PRIME_PIN],
  ['gym_at_verticalpress', '[아틀란티스] 버티컬 체스트 프레스',   '가슴', 'secondary', 'machine', PLATE],
  ['gym_at_pecdeck',       '[아틀란티스] 펙 덱 플라이',          '가슴', 'isolation', 'machine', PIN],
  ['gym_wt_animalincline', '[왓슨] 애니멀 듀얼스택 인클라인 프레스', '가슴', 'secondary', 'machine', PIN],
  ['gym_nt_chestpress',    '[노틸러스] 체스트 프레스',           '가슴', 'secondary', 'machine', PLATE],

  // ── 3. 하체 ──────────────────────────────────────────────
  ['gym_cy_eaglenxlp',     '[사이벡스] 이글 NX 레그 프레스',      '하체', 'secondary', 'machine', PLATE],
  ['gym_cy_squatpress',    '[사이벡스] 스쿼트 프레스',           '하체', 'primary',   'machine', PLATE],
  ['gym_cy_1tonlp',        '[사이벡스] 1톤 레그 프레스 (구형)',   '하체', 'secondary', 'machine', PLATE],
  ['gym_cy_prestigecalf',  '[사이벡스] 프레스티지 카프',         '하체', 'isolation', 'machine', PLATE],
  ['gym_at_hacksquat',     '[아틀란티스] 핵 스쿼트',             '하체', 'primary',   'machine', PLATE],
  // 명판이 「PRONE LEG CURL」 — 사진에서 핀 스택 + PULL & TURN 애드온을 확인했다.
  ['gym_pr_lyinglegcurl',  '[프라임] 라잉 레그 컬',              '하체', 'isolation', 'machine', PRIME_PIN],
  ['gym_pr_seatedlegcurl', '[프라임] 시티드 레그 컬',            '하체', 'isolation', 'machine', PLATE],
  ['gym_pr_legextplate',   '[프라임] 레그 익스텐션 (플레이트)',   '하체', 'isolation', 'machine', PLATE],
  ['gym_pr_legextpin',     '[프라임] 레그 익스텐션 (핀)',        '하체', 'isolation', 'machine', PRIME_PIN],
  ['gym_wt_vsquat',        '[왓슨] 브이 스쿼트',                 '하체', 'primary',   'machine', PLATE],
  ['gym_wt_inoutthigh',    '[왓슨] 인아웃 타이',                 '하체', 'isolation', 'machine', PLATE],
  ['gym_rg_pendulumhip',   '[로저스 애슬레틱] 펜듈럼 힙 프레스',  '하체', 'primary',   'machine', PLATE],
  ['gym_g80_legpress',     '[짐80] 레그 프레스',                 '하체', 'secondary', 'machine', PLATE],
  ['gym_bb_hipthrust',     '[부티 빌더] 힙 쓰러스트 머신',        '하체', 'secondary', 'machine', PLATE],

  // ── 4. 어깨 및 팔 (머신) ─────────────────────────────────
  ['gym_pr_shoulderpress', '[프라임] 숄더 프레스',               '어깨', 'secondary', 'machine', PLATE],
  ['gym_pr_seatedlatraise','[프라임] 시티드 레터럴 레이즈',       '어깨', 'isolation', 'machine', PLATE],
  ['gym_pr_armcurl',       '[프라임] 암 컬',                     '이두', 'isolation', 'machine', PLATE],
  ['gym_pr_seateddips',    '[프라임] 시티드 딥스',               '삼두', 'secondary', 'machine', PLATE],
  // 핀 스택 15lb(6.8kg) 간격 + 2.3kg 보조 추 2개 → 실제 최소 단위는 2.3kg.
  ['gym_at_standlatraise', '[아틀란티스] 스탠딩 레터럴 레이즈',   '어깨', 'isolation', 'machine', ATL_PIN],
  ['gym_at_armcurl',       '[아틀란티스] 암 컬',                 '이두', 'isolation', 'machine', PLATE],
  ['gym_cy_mtsshoulder',   '[사이벡스] MTS 숄더 프레스',         '어깨', 'secondary', 'machine', PLATE],
  ['gym_wt_abdominal',     '[왓슨] 업도미널',                    '복근', 'isolation', 'machine', PLATE],

  // ── 5. 케이블 스테이션 ───────────────────────────────────
  // 왓슨 8~10 스테이션. 지금은 이 헬스장의 거의 유일한 케이블 스택이지만,
  // 그래도 제조사를 붙인다 — 헬스장이 바뀌면 "유일하니까 생략"이라는 가정이 깨진다.
  // 기구가 사라진 게 아니라, 그 한 대에서 하는 동작으로 쪼갠 것이다.
  ['gym_cb_latraise',      '[왓슨 케이블] 스탠딩 레터럴 레이즈',       '어깨', 'isolation', 'cable', PLATE],
  ['gym_cb_ezcurl',        '[왓슨 케이블] 이지바 이두 컬',            '이두', 'isolation', 'cable', PLATE],
  ['gym_cb_ohext',         '[왓슨 케이블] 오버헤드 익스텐션',          '삼두', 'isolation', 'cable', PLATE],
  ['gym_cb_ezrevcurl',     '[왓슨 케이블] 이지바 리버스 컬',          '전완', 'isolation', 'cable', PLATE],
  ['gym_cb_ropepushdown',  '[왓슨 케이블] 로프 푸쉬다운',             '삼두', 'isolation', 'cable', PLATE],
  ['gym_cb_barpushdown',   '[왓슨 케이블] 바 푸쉬다운',               '삼두', 'isolation', 'cable', PLATE],

  // ── 6. 스미스 머신 ───────────────────────────────────────
  // 세 대가 서로 다른 기구다. 왓슨은 카운터웨이트를 제거한 모델이라 바 자체 무게가
  // 다르고, 파나타는 듀얼 시스템이다. 같은 이름으로 묶으면 기록이 섞인다.
  // 파나타는 상체 전용이라 스쿼트가 없다 (본인 확인, 2026-08-26).
  ['gym_sm_inclinepress',  '[왓슨 스미스] 인클라인 프레스',       '가슴', 'secondary', 'barbell', PLATE],
  ['gym_sm_benchpress',    '[왓슨 스미스] 벤치프레스',            '가슴', 'secondary', 'barbell', PLATE],
  ['gym_sm_squat',         '[왓슨 스미스] 스쿼트',                '하체', 'primary',   'barbell', PLATE],
  ['gym_pnsm_inclinepress','[파나타 스미스] 인클라인 프레스',     '가슴', 'secondary', 'barbell', PLATE],
  ['gym_pnsm_benchpress',  '[파나타 스미스] 벤치프레스',          '가슴', 'secondary', 'barbell', PLATE],
  ['gym_cysm_inclinepress','[사이벡스 스미스] 인클라인 프레스',   '가슴', 'secondary', 'barbell', PLATE],
  ['gym_cysm_benchpress',  '[사이벡스 스미스] 벤치프레스',        '가슴', 'secondary', 'barbell', PLATE],
  ['gym_cysm_squat',       '[사이벡스 스미스] 스쿼트',            '하체', 'primary',   'barbell', PLATE],

  // ── 7. 파워 랙 ───────────────────────────────────────────
  ['gym_xm_racksquat',     '[엑스마스터] 파워랙 스쿼트',          '하체', 'primary',   'barbell', PLATE],

  // ── 8. 덤벨 ──────────────────────────────────────────────
  ['gym_db_hammercurl',    '[엑스마스터 덤벨] 해머컬',                      '이두', 'isolation', 'dumbbell_pair', 2],
  ['gym_db_curl',          '[엑스마스터 덤벨] 이두컬',                      '이두', 'isolation', 'dumbbell_pair', 2],
  ['gym_db_latraise',      '[엑스마스터 덤벨] 레터럴 레이즈',               '어깨', 'isolation', 'dumbbell_pair', 2],
  ['gym_db_shrug',         '[엑스마스터 덤벨] 슈러그',                      '등',   'isolation', 'dumbbell_pair', 2],
  ['gym_db_wristcurl',     '[엑스마스터 덤벨] 리스트컬',                    '전완', 'isolation', 'dumbbell_pair', 2],
  ['gym_db_wristhammer',   '[엑스마스터 덤벨] 리스트 해머컬',               '전완', 'isolation', 'dumbbell_pair', 2],
  ['gym_db_revwristcurl',  '[엑스마스터 덤벨] 리버스 리스트컬',             '전완', 'isolation', 'dumbbell_pair', 2],

  // ── 9. 이지바 ────────────────────────────────────────────
  ['gym_ez_curl',          '[이지바] 이두컬',                    '이두', 'isolation', 'barbell', PLATE],
  ['gym_ez_skullcrusher',  '[이지바] 스컬 크러셔',               '삼두', 'isolation', 'barbell', PLATE],
  ['gym_ez_wristcurl',     '[이지바] 리스트컬',                  '전완', 'isolation', 'barbell', PLATE],
  ['gym_ez_revwristcurl',  '[이지바] 리버스 리스트컬',           '전완', 'isolation', 'barbell', PLATE],
  ['gym_ez_revcurl',       '[이지바] 리버스 컬',                 '전완', 'isolation', 'barbell', PLATE],

  // ── 9-2. 스트레이트 바 ───────────────────────────────────
  // 이지바와 따로 있다. 본인은 **리스트 컬은 스트레이트 바, 일반 컬은 이지바**로 나눠 쓴다
  // (2026-08-27 확인). 다만 리스트컬·리버스컬을 슈퍼세트로 묶는 날은 이지바로도 한다.
  ['gym_sb_wristcurl',     '[스트레이트 바] 리스트컬',          '전완', 'isolation', 'barbell', PLATE],
  ['gym_sb_revwristcurl',  '[스트레이트 바] 리버스 리스트컬',    '전완', 'isolation', 'barbell', PLATE],

  // ── 9-3. 2026-08-27 루틴 대조로 드러난 기구 ──────────────
  // 플랜의 종목을 기구 목록과 맞추다가, 목록에 아예 없던 기구가 무더기로 나왔다.
  // 특히 **풀다운 계열이 통째로 빠져 있었다** — 등 기구를 열두 개 적어 주셨는데
  // 전부 로우 계열이라 내가 정리할 때 놓쳤다.
  ['gym_pn_widelatpull',   '[파나타] 와이드 랫풀다운',          '등',   'secondary', 'machine', PLATE],
  ['gym_ic_latpulldown',   '[이카리안] 랫풀다운',               '등',   'secondary', 'machine', PLATE],
  ['gym_cb_armpulldown',   '[왓슨 케이블] 암 풀다운',           '등',   'secondary', 'cable',   PLATE],
  ['gym_cb_kickback',      '[왓슨 케이블] 원 암 킥백',          '삼두', 'isolation', 'cable',   PLATE],
  ['gym_g80_neckpress',    '[짐80] 넥 프레스',                  '어깨', 'secondary', 'machine', PLATE],
  ['gym_pr_preachercurl',  '[프라임] 프리처 컬',                '이두', 'isolation', 'machine', PLATE],

  // 왓슨 듀얼스택 시티드 케이블 — 10스테이션 케이블과 **다른 기구**다.
  // 플랜에서 「암 컬 머신」이라 적힌 것은 전부 이 기구다(본인 확인). 팔을 뒤로 뺀
  // 베이지안 컬 자세로 하고, 가끔 같은 기구에서 가슴 플라이도 한다.
  ['gym_wd_bayesiancurl',  '[왓슨 듀얼 케이블] 베이지안 컬',    '이두', 'isolation', 'cable',   PLATE],
  ['gym_wd_chestfly',      '[왓슨 듀얼 케이블] 체스트 플라이',  '가슴', 'isolation', 'cable',   PLATE],

  // 부티 빌더 벨트 머신 — 허리에 벨트를 걸어 스쿼트도 되고 조절하면 데드리프트도 된다.
  // 본인이 루마니안 데드리프트를 이걸로 한다. **허리 통증 때문에** 바벨에서 옮긴 것이지
  // 어깨 석회성 건염 때문이 아니다(2026-08-27 정정). 이 기구로는 괜찮다고 했다.
  ['gym_bb_beltsquat',     '[부티 빌더] 벨트 스쿼트',           '하체', 'primary',   'machine', PLATE],
  ['gym_bb_beltrdl',       '[부티 빌더] 벨트 루마니안 데드리프트','등',  'secondary', 'machine', PLATE],

  // 어시스트 풀업은 **눈금의 뜻이 반대다** — 숫자를 올릴수록 도와주는 힘이 커져 더 쉬워진다.
  // 2026-08-27에 처리 방식을 정했다: ASSISTED_EQUIPMENT_IDS에 넣어 두면 앱이
  // 「실제 부하 = 체중 − 눈금」으로 환산해서 계산한다(progression.ts effectiveLoadKg).
  ['gym_nt_assistpullup',  '[뉴텍] 어시스트 풀업',              '등',   'secondary', 'machine', PIN],

  // ── 10. 유산소 ───────────────────────────────────────────
  // 무게·횟수 대신 아래 지표를 입력받는다.
  //
  // ⚠️ 등급 자리의 'isolation'은 **아무 뜻이 없다.** 유산소는 무게를 안 들어서 등급이라는
  //    개념 자체가 없는데, 튜플 형식상 뭐라도 채워야 해서 넣은 자리 표시일 뿐이다.
  //    화면에서는 cardioMetrics가 있으면 등급 배지를 아예 그리지 않는다
  //    (수환 지적, 2026-08-26: "유산소에는 왜 고립이 붙어있는거야? 떼줘").
  //
  // 유산소는 **제조사를 붙이지 않는다** — 다른 기구와 달리 어느 회사 것이냐가
  // 기록에 영향을 주지 않는다고 본인이 밝혔다 (2026-08-26).
  ['gym_cardio_treadmill', '런닝머신',            '유산소', 'isolation', 'bodyweight', 0, ['speed', 'incline', 'duration']],
  ['gym_cardio_mymountain','마이마운틴',          '유산소', 'isolation', 'bodyweight', 0, ['speed', 'incline', 'duration']],
  ['gym_cardio_stepmill',  '천국의 계단 (스텝밀)', '유산소', 'isolation', 'bodyweight', 0, ['level', 'duration']]
];

/**
 * 눈금 숫자가 **「도와주는 힘」**인 기구.
 *
 * 보통 기구는 숫자가 클수록 어렵지만 이 기구들은 **클수록 쉬워진다.**
 * 그대로 두면 앱이 보조를 더 받은 날을 「더 무겁게 든 날」로 읽어
 * **퇴보를 발전으로 기록한다.** 그래서 여기 적힌 종목은 계산 전에
 * `체중 − 눈금`으로 환산한다(체중은 설정 화면에서 입력).
 *
 * 튜플에 자리를 하나 더 만들지 않고 목록으로 둔 이유: 이런 기구는 드물어서
 * 종목 86개 전부에 빈칸을 붙이는 것보다 여기 이름을 적는 편이 읽기 쉽다.
 */
export const ASSISTED_EQUIPMENT_IDS = new Set<string>([
  'gym_nt_assistpullup'
]);

/**
 * 더 이상 쓰지 않는 **종목 항목**의 id.
 *
 * ⚠️ 기구가 헬스장에서 사라졌다는 뜻이 아니다. 「케이블 스테이션」·「스미스 머신」·
 *    「덤벨」처럼 한 기구에 동작이 여럿 묶여 있던 항목을, 거기서 실제로 하는 동작으로
 *    쪼개면서 그 뭉뚱그린 항목만 뺀 것이다. 기구는 그대로 있고 오히려 더 잘게 잡혔다.
 *
 * 이미 저장된 사용자 데이터에서 지울지는 사용자가 정한다 — 여기서는 목록만 둔다.
 */
export const RETIRED_EQUIPMENT_IDS = [
  'gym_wt_cablestation', // → [케이블] 6종
  'gym_wt_smith',        // → [왓슨 스미스] 3종
  'gym_pn_powersmith',   // → [파나타 스미스] 2종
  'gym_cy_smith',        // → [사이벡스 스미스] 3종
  'gym_xm_powerrack',    // → [엑스마스터] 파워랙 스쿼트
  'gym_xm_dumbbell'      // → [덤벨] 7종
];

/**
 * 기구 자료가 실측으로 바뀔 때마다 1씩 올린다.
 * 저장된 데이터의 rev가 이보다 낮으면 **증량 단위만** 한 번 새로 맞춘다
 * (이름·등급·부위는 사용자가 고쳤을 수 있으니 건드리지 않는다).
 *
 * rev 2 — 2026-08-26: 현장 사진으로 프라임 PULL & TURN 5lb(2.27kg) 확인.
 * rev 3 — 2026-08-26: 아틀란티스 스탠딩 레터럴 레이즈가 핀 스택이고 보조 추 2.3kg 확인.
 * rev 4 — 2026-08-27: 어시스트 풀업에 「눈금이 반대」 표시를 달았다.
 */
export const EQUIPMENT_REV = 4;

/** id → 현재 기준 증량 단위. 마이그레이션이 쓴다. */
export const EQUIPMENT_INCREMENTS: Record<string, number> =
  Object.fromEntries(GYM_EQUIPMENT.map(([id, , , , , inc]) => [id, inc]));

/** 튜플을 Exercise로 펼친다. 횟수 범위와 휴식은 등급 기본값에서 가져온다. */
export function buildGymExercises(createdAt: string): Exercise[] {
  return GYM_EQUIPMENT.map(([id, name, muscleGroup, tier, loadType, incrementKg, cardioMetrics]) => {
    const cfg = TIER_DEFAULTS[tier];
    const isCardio = !!cardioMetrics;
    return {
      id,
      name,
      muscleGroup,
      tier,
      loadType,
      incrementKg,
      repRangeLow: isCardio ? 1 : cfg.repLow,
      repRangeHigh: isCardio ? 1 : cfg.repHigh,
      defaultRestSeconds: isCardio ? 0 : cfg.restSeconds,
      ...(cardioMetrics ? { cardioMetrics } : {}),
      ...(ASSISTED_EQUIPMENT_IDS.has(id) ? { isAssisted: true } : {}),
      notes: '',
      createdAt
    };
  });
}
