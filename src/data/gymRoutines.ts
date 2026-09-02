import { Routine } from '../types/workout';

/**
 * 수환의 실제 루틴 (2026-08-27 본인 확인).
 *
 * ## 주기
 * **3일 훈련 + 1일 휴식**의 8일 주기다 → DAY 1·2·3 → 휴식 → DAY 4·5·6 → 휴식.
 * 앱은 요일을 강제하지 않는다 — 그날 할 루틴을 골라 시작하면 된다.
 *
 * ## 어떻게 만들어졌나
 * 본인이 쓰던 플랜 앱의 스크린샷을 그대로 옮기지 않았다. 플랜의 종목 이름이 이 헬스장
 * 기구와 1:1로 맞지 않아(인클라인 프레스만 다섯 대, 레그 프레스 넷 …) 57개 항목을 전부
 * 표로 펼쳐 확인을 받았다 → `raw/인터뷰/2026-08-26 헬스장 루틴 맞추기.md`.
 * 아래는 **그 답변만** 반영한 것이고, 내가 임의로 고른 것은 없다.
 *
 * ## 알아 둘 것 두 가지
 * 1. **전완 종목은 루틴에 그대로 넣는다** (본인이 세 방법 중 1번을 골랐다). 안 하는 날은
 *    운동 중에 그 종목을 지우면 된다 — 루틴은 그대로 남는다.
 * 2. **번갈아 쓰는 기구는 한쪽만 넣었다.** 펙 덱(프라임↔아틀란티스), 리버스 펙 덱도
 *    "그날 자리 있는 걸로" 하신다고 해서, 운동 중 **↻ 버튼**으로 바꾸면 된다.
 *    같은 동작·다른 제조사가 후보 맨 위에 뜬다.
 */

const R = (
  id: string,
  name: string,
  targetMuscles: string[],
  exerciseIds: string[],
  description: string
): Omit<Routine, 'createdAt'> => ({ id, name, targetMuscles, exerciseIds, defaultRestSeconds: 150, description });

const SEED = [
  R('rt_day1', 'DAY 1 · 가슴 어깨 팔',
    ['가슴', '어깨', '복근', '삼두', '이두', '전완'],
    [
      'gym_pr_inclinepress',   // 인클라인 벤치 프레스 머신
      'gym_g80_neckpress',     // 「스미스 비하인드 넥 프레스」로 적혀 있던 것 → 짐80 넥 프레스
      'gym_pr_pecdeck',        // 펙덱 플라이 (아틀란티스와 번갈아)
      'gym_at_standlatraise',  // 스탠딩 레터럴 레이즈 머신
      'gym_wt_abdominal',      // 크런치 머신
      'gym_cb_ohext',          // 오버헤드 케이블 트라이셉 익스텐션
      'gym_pn_declinepress',   // 디클라인 벤치 프레스 머신
      'gym_cardio_treadmill',  // 인클라인 트레드밀 러닝
      'gym_db_hammercurl',     // 덤벨 해머 컬
      'gym_db_wristcurl'       // 덤벨 리스트 컬
    ],
    '가슴 3 · 어깨 2 · 코어 · 삼두 · 유산소 · 이두 · 전완'),

  R('rt_day2', 'DAY 2 · 등 이두 전완',
    ['등', '이두', '어깨', '전완', '유산소'],
    [
      'gym_cardio_stepmill',   // 스텝 밀
      'gym_sb_revwristcurl',   // 리버스 바벨 리스트 컬 → 스트레이트 바
      'gym_sb_wristcurl',      // 바벨 리스트 컬 → 스트레이트 바
      'gym_cb_armpulldown',    // 암 풀다운 (왓슨 케이블)
      'gym_pn_widelatpull',    // 와이드 풀다운 머신
      'gym_pn_superlowrow',    // 로우 로우 머신
      'gym_wt_highrow',        // 「해머 스트렝스 MTS 하이 로우」로 적혀 있던 것 → 왓슨 하이 로우
      'gym_ez_revcurl',        // 이지바 리버스 컬
      'gym_pr_revpecdeck',     // 펙 덱 리어 델트 (아틀란티스와 번갈아)
      'gym_cb_facepull',       // 페이스풀 (왓슨 케이블)
      'gym_pr_preachercurl',   // 프리처 컬 머신
      'gym_wd_bayesiancurl'    // 「암 컬 머신」으로 적혀 있던 것 → 왓슨 듀얼 케이블 베이지안 컬
    ],
    '등 4 · 이두 3 · 전완 3 · 어깨 · 유산소'),

  R('rt_day3', 'DAY 3 · 팔 어깨 (소근육)',
    ['이두', '삼두', '어깨', '하체', '복근', '유산소'],
    [
      'gym_cardio_treadmill',  // 웜업 트레드밀 러닝
      'gym_wt_abdominal',      // 크런치 머신
      'gym_cy_prestigecalf',   // 스탠딩 카프 레이즈 머신
      'gym_db_hammercurl',     // 덤벨 해머 컬
      'gym_ez_skullcrusher',   // 라잉 바벨 트라이셉 익스텐션
      'gym_cb_latraise',       // 케이블 레터럴 레이즈
      'gym_cb_ezrevcurl',      // 케이블 리버스 컬
      'gym_cb_kickback'        // 원 암 케이블 킥백
    ],
    '원래 하체 날이었는데 팔을 키우려고 소근육 날로 바꿨다 (2026 여름)'),

  R('rt_day4', 'DAY 4 · 가슴 어깨 팔',
    ['가슴', '어깨', '삼두', '이두', '유산소'],
    [
      'gym_cardio_treadmill',  // 인클라인 트레드밀 러닝
      'gym_at_pecdeck',        // 펙덱 플라이 — DAY 1과 다른 기구
      'gym_wt_animalincline',  // 인클라인 벤치 프레스 머신 — DAY 1과 다른 기구
      'gym_g80_neckpress',     // 짐80 넥 프레스
      'gym_at_standlatraise',  // 스탠딩 레터럴 레이즈 머신
      'gym_cb_ohext',          // 오버헤드 케이블 트라이셉 익스텐션
      'gym_pn_verticalpress',  // 체스트 프레스 머신 → 파나타 버티컬
      'gym_cb_ezrevcurl'       // 케이블 리버스 컬
    ],
    'DAY 1과 부위는 같지만 가슴·인클라인은 다른 기구를 쓴다'),

  R('rt_day5', 'DAY 5 · 등 이두',
    ['등', '어깨', '이두', '전완', '유산소'],
    [
      'gym_cb_armpulldown',    // 암 풀다운
      'gym_pn_widelatpull',    // 와이드 풀다운 머신
      'gym_at_seatedtbar',     // 티 바 로우 머신
      'gym_pr_revpecdeck',     // 펙 덱 리어 델트 (아틀란티스와 번갈아)
      'gym_cb_ezcurl',         // 케이블 바이셉 컬
      'gym_wd_bayesiancurl',   // 「암 컬 머신」 → 왓슨 듀얼 케이블
      'gym_db_hammercurl',     // 덤벨 해머 컬
      'gym_sb_wristcurl',      // 바벨 리스트 컬 → 스트레이트 바
      'gym_cardio_stepmill'    // 스텝 밀
    ],
    '등 3 · 이두 3 · 어깨 · 전완 · 유산소'),

  R('rt_day6', 'DAY 6 · 하체 등',
    ['하체', '등', '복근', '유산소'],
    [
      'gym_pr_lyinglegcurl',   // 레그 컬 — 라잉과 시티드를 번갈아 해서 둘 다 넣었다
      'gym_pr_seatedlegcurl',
      'gym_cardio_treadmill',  // 인클라인 트레드밀 러닝
      'gym_cy_squatpress',     // 레그 프레스 ①
      'gym_cy_eaglenxlp',      // 레그 프레스 ②
      'gym_pr_legextplate',    // 레그 익스텐션 — 보통 플레이트 로드로 한다
      'gym_bb_beltrdl',        // 「해머 스트렝스 루마니안 데드리프트」 → 부티 빌더 벨트 머신
      'gym_wt_abdominal',      // 크런치 머신
      'gym_cy_prestigecalf'    // 스탠딩 카프 레이즈 머신
    ],
    '8일 주기에서 하체는 이 날 하나뿐이다')
];

export const DEFAULT_ROUTINE_IDS = SEED.map(r => r.id);

export function buildGymRoutines(createdAt: string): Routine[] {
  return SEED.map(r => ({ ...r, createdAt }));
}
