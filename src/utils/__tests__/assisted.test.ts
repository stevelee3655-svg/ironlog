import { describe, it, expect } from 'vitest';
import {
  effectiveLoadKg,
  estimate1RM,
  isStalled,
  recommend,
  adjustRemaining,
  setBodyWeightKg,
  getBodyWeightKg,
  DEFAULT_BODY_WEIGHT_KG
} from '../progression';
import { calculateSessionStats, topSetOf, computeDelta } from '../markdownGenerator';
import { Exercise, WorkoutSession, WorkoutSet, SessionExercise } from '../../types/workout';

/**
 * 어시스트 풀업처럼 **눈금이 「도와주는 힘」인 기구**를 다루는 시험.
 *
 * 이 기구는 숫자를 올릴수록 쉬워진다. 앱의 나머지 로직은 전부 「숫자가 오르면 발전」을
 * 전제로 하므로, 환산을 한 군데라도 빠뜨리면 **퇴보가 발전으로 기록된다.**
 * 그래서 여기서는 "값이 얼마냐"보다 **방향이 어느 쪽이냐**를 확인한다.
 */

const BW = 62; // 수환의 체중 (2026-08-27)

const assistPullup: Exercise = {
  id: 'gym_nt_assistpullup',
  name: '[뉴텍] 어시스트 풀업',
  muscleGroup: '등',
  tier: 'secondary',
  loadType: 'machine',
  incrementKg: 5,
  repRangeLow: 8,
  repRangeHigh: 12,
  defaultRestSeconds: 150,
  isAssisted: true,
  createdAt: ''
};

/** 같은 조건이되 「도와주는 기구」 표시만 없는 짝. 방향 비교의 기준으로 쓴다. */
const normalMachine: Exercise = { ...assistPullup, id: 'ex_normal', isAssisted: undefined };

function makeSession(
  exerciseId: string,
  sets: Partial<WorkoutSet>[],
  date: string,
  isAssisted = true
): WorkoutSession {
  return {
    id: 's_' + date,
    title: '등 운동',
    date,
    startTime: `${date}T10:00:00+09:00`,
    durationMinutes: 45,
    totalVolumeKg: 0,
    totalSets: sets.length,
    targetMuscles: ['등'],
    syncStatus: 'synced',
    exercises: [{
      id: 'se_' + date,
      exerciseId,
      exerciseName: '[뉴텍] 어시스트 풀업',
      muscleGroup: '등',
      tier: 'secondary',
      loadType: 'machine',
      incrementKg: 5,
      repRangeLow: 8,
      repRangeHigh: 12,
      isAssisted,
      sets: sets.map((s, i) => ({
        id: 'set' + i,
        setNumber: i + 1,
        weightKg: 30,
        reps: 10,
        isCompleted: true,
        ...s
      })) as WorkoutSet[]
    }]
  };
}

describe('어시스트 기구 — 눈금이 「도와주는 힘」인 종목', () => {
  describe('effectiveLoadKg — 실제로 든 무게', () => {
    it('보통 기구는 눈금이 그대로 부하다', () => {
      expect(effectiveLoadKg(40, false, BW)).toBe(40);
      expect(effectiveLoadKg(40, undefined, BW)).toBe(40);
    });

    it('어시스트는 체중에서 보조를 뺀 것이 부하다', () => {
      expect(effectiveLoadKg(20, true, BW)).toBe(42);
      expect(effectiveLoadKg(40, true, BW)).toBe(22);
    });

    it('보조를 더 받을수록 부하는 줄어든다 — 방향이 반대다', () => {
      expect(effectiveLoadKg(45, true, BW)).toBeLessThan(effectiveLoadKg(25, true, BW));
    });

    it('보조가 체중을 넘으면 부하는 0이다 (음수가 되면 안 된다)', () => {
      expect(effectiveLoadKg(80, true, BW)).toBe(0);
    });
  });

  describe('체중은 앱 전체에 하나뿐인 값이다', () => {
    it('설정하지 않으면 기본값을 쓴다', () => {
      setBodyWeightKg(undefined);
      expect(getBodyWeightKg()).toBe(DEFAULT_BODY_WEIGHT_KG);
    });

    it('0이나 음수는 무시한다 — 그대로 받으면 부하 계산이 통째로 망가진다', () => {
      setBodyWeightKg(0);
      expect(getBodyWeightKg()).toBe(DEFAULT_BODY_WEIGHT_KG);
      setBodyWeightKg(-5);
      expect(getBodyWeightKg()).toBe(DEFAULT_BODY_WEIGHT_KG);
    });

    it('설정하면 그 값을 쓴다', () => {
      setBodyWeightKg(BW);
      expect(getBodyWeightKg()).toBe(BW);
    });
  });

  describe('recommend — 발전은 보조를 줄이는 쪽이다', () => {
    // 무게는 보조 20kg(= 실제 부하 42kg)으로 잡는다. 증량 단위 5kg이 부하의 15%를
    // 넘으면 앱이 「무게 대신 횟수를 늘리는」 다른 분기로 빠지는데, 여기서 보고 싶은 것은
    // 무게가 어느 쪽으로 움직이느냐이므로 그 분기에 걸리지 않는 자리를 고른다.
    it('상단 횟수를 다 채우면 보조를 한 칸 줄인다 (눈금이 내려간다)', () => {
      const history = [makeSession('gym_nt_assistpullup', [
        { weightKg: 20, reps: 12 }, { weightKg: 20, reps: 12 }, { weightKg: 20, reps: 12 }
      ], '2026-08-20')];

      const rec = recommend(assistPullup, history, { bodyWeightKg: BW });

      expect(rec.action).toBe('increase_load');
      expect(rec.sets[0].weightKg).toBe(15); // 20 → 15: 보조가 줄었다
      expect(rec.reason).toContain('보조 -5kg');
    });

    it('같은 조건에서 보통 기구는 반대로 눈금이 올라간다', () => {
      const history = [makeSession('ex_normal', [
        { weightKg: 40, reps: 12 }, { weightKg: 40, reps: 12 }, { weightKg: 40, reps: 12 }
      ], '2026-08-20', false)];

      const rec = recommend(normalMachine, history, { bodyWeightKg: BW });

      expect(rec.action).toBe('increase_load');
      expect(rec.sets[0].weightKg).toBe(45);
    });

    it('너무 힘들었으면 보조를 늘려 준다 (눈금이 올라간다)', () => {
      // 하단 횟수(8회)보다 3회 넘게 모자랐다 → back_off
      const history = [makeSession('gym_nt_assistpullup', [
        { weightKg: 20, reps: 4, rpe: 10 },
        { weightKg: 20, reps: 4, rpe: 10 },
        { weightKg: 20, reps: 4, rpe: 10 }
      ], '2026-08-20')];

      const rec = recommend(assistPullup, history, { bodyWeightKg: BW });

      expect(rec.action).toBe('back_off');
      // 부하 42kg의 90%는 37.8kg → 보조는 62-37.8=24.2 → 5단위로 25
      expect(rec.sets[0].weightKg).toBe(25);
    });

    it('보조 없이(0kg) 상한까지 해내면 증량이 아니라 다음 단계를 안내한다', () => {
      const history = [makeSession('gym_nt_assistpullup', [
        { weightKg: 0, reps: 12 }, { weightKg: 0, reps: 12 }, { weightKg: 0, reps: 12 }
      ], '2026-08-20')];

      const rec = recommend(assistPullup, history, { bodyWeightKg: BW });

      expect(rec.action).toBe('add_external_load');
      expect(rec.sets[0].weightKg).toBe(0);
    });

    it('기록이 없으면 체중의 절반쯤 보조에서 시작한다', () => {
      const rec = recommend(assistPullup, [], { bodyWeightKg: BW });
      expect(rec.action).toBe('first_time');
      expect(rec.sets[0].weightKg).toBe(30); // 62의 절반 31 → 5단위로 30
    });
  });

  describe('adjustRemaining — 세션 안 교정도 방향이 반대다', () => {
    const completed: WorkoutSet = {
      id: 'c1', setNumber: 1, weightKg: 30, reps: 8, isCompleted: true, rpe: 10
    };
    const remaining: WorkoutSet[] = [
      { id: 'r1', setNumber: 2, weightKg: 30, reps: 8, isCompleted: false }
    ];

    it('힘들었다고 하면 보조를 늘린다 — 깎으면 오히려 더 힘들어진다', () => {
      const out = adjustRemaining(assistPullup, completed, 8, remaining, BW);
      expect(out[0].weightKg).toBeGreaterThan(30);
    });

    it('같은 상황에서 보통 기구는 무게를 깎는다', () => {
      const out = adjustRemaining(normalMachine, completed, 8, remaining, BW);
      expect(out[0].weightKg).toBeLessThan(30);
    });

    it('쉬웠다고 하면 보조를 줄인다', () => {
      const easy: WorkoutSet = { ...completed, rpe: 6 };
      const out = adjustRemaining(assistPullup, easy, 9, remaining, BW);
      expect(out[0].weightKg).toBeLessThan(30);
    });

    it('보조를 줄이다가 0(보조 없음)까지 내려갈 수 있다', () => {
      const easy: WorkoutSet = { ...completed, weightKg: 5, rpe: 6 };
      const rem: WorkoutSet[] = [{ ...remaining[0], weightKg: 5 }];
      const out = adjustRemaining(assistPullup, easy, 9, rem, BW);
      expect(out[0].weightKg).toBe(0);
    });
  });

  describe('isStalled — 보조를 더 받은 날은 발전이 아니다', () => {
    it('보조가 계속 늘어난 것을 발전으로 읽지 않는다', () => {
      // 옛날일수록 보조가 적었다(= 강했다). 최근으로 올수록 보조가 늘었다(= 약해졌다).
      const history = [
        makeSession('gym_nt_assistpullup', [{ weightKg: 35, reps: 10 }], '2026-08-26'),
        makeSession('gym_nt_assistpullup', [{ weightKg: 33, reps: 10 }], '2026-08-24'),
        makeSession('gym_nt_assistpullup', [{ weightKg: 31, reps: 10 }], '2026-08-22'),
        makeSession('gym_nt_assistpullup', [{ weightKg: 20, reps: 10 }], '2026-08-20')
      ];

      expect(isStalled(history, 'gym_nt_assistpullup', 3, { bodyWeightKg: BW })).toBe(true);
    });

    it('보조를 줄여 왔다면 정체가 아니다', () => {
      const history = [
        makeSession('gym_nt_assistpullup', [{ weightKg: 20, reps: 10 }], '2026-08-26'),
        makeSession('gym_nt_assistpullup', [{ weightKg: 25, reps: 10 }], '2026-08-24'),
        makeSession('gym_nt_assistpullup', [{ weightKg: 30, reps: 10 }], '2026-08-22'),
        makeSession('gym_nt_assistpullup', [{ weightKg: 35, reps: 10 }], '2026-08-20')
      ];

      expect(isStalled(history, 'gym_nt_assistpullup', 3, { bodyWeightKg: BW })).toBe(false);
    });
  });

  describe('기록·볼륨 — 눈금을 그대로 무게로 세지 않는다', () => {
    const sessionEx: SessionExercise = {
      id: 'se1',
      exerciseId: 'gym_nt_assistpullup',
      exerciseName: '[뉴텍] 어시스트 풀업',
      muscleGroup: '등',
      isAssisted: true,
      sets: [
        { id: 'a', setNumber: 1, weightKg: 40, reps: 10, isCompleted: true },
        { id: 'b', setNumber: 2, weightKg: 20, reps: 10, isCompleted: true }
      ]
    };

    it('총 볼륨은 보조가 아니라 실제로 든 무게로 쌓인다', () => {
      setBodyWeightKg(BW);
      const stats = calculateSessionStats([sessionEx], BW);
      // (62-40)×10 + (62-20)×10 = 220 + 420 = 640
      expect(stats.completedVolume).toBe(640);
    });

    it('최고 세트는 눈금이 큰 세트가 아니라 보조가 적은 세트다', () => {
      setBodyWeightKg(BW);
      const top = topSetOf(sessionEx);
      expect(top?.weightKg).toBe(20);
    });

    it('보조가 늘어난 것을 「+kg」로 적지 않는다', () => {
      setBodyWeightKg(BW);
      // 지난번 보조 20kg → 이번 최고 세트 보조 20kg 이지만, 이번엔 40kg 세트도 있다.
      // 최고 세트끼리 비교하면 20 vs 25 → 보조가 5kg 줄었으니 +5kg(부하 기준)이어야 한다.
      const better: SessionExercise = {
        ...sessionEx,
        sets: [{ id: 'a', setNumber: 1, weightKg: 20, reps: 10, isCompleted: true }]
      };
      expect(computeDelta(better, { weightKg: 25, reps: 10 })).toBe('+5kg');

      const worse: SessionExercise = {
        ...sessionEx,
        sets: [{ id: 'a', setNumber: 1, weightKg: 30, reps: 10, isCompleted: true }]
      };
      expect(computeDelta(worse, { weightKg: 25, reps: 10 })).toBe('-5kg');
    });
  });

  describe('e1RM — 보조를 더 받고 든 것이 더 무거울 수 없다', () => {
    it('보조가 적을수록 추정 1RM이 높다', () => {
      const strong = estimate1RM(effectiveLoadKg(20, true, BW), 10, 8);
      const weak = estimate1RM(effectiveLoadKg(40, true, BW), 10, 8);
      expect(strong).toBeGreaterThan(weak);
    });
  });
});

/**
 * 「도와주는 기구」 표시가 중간에서 사라지지 않는지 확인한다.
 *
 * 실제로 한 번 잃어버렸다 — 종목을 저장 형태로 다시 쌓아 만드는 함수가 필드를
 * 하나하나 나열하는 방식이라, 적어 두지 않은 표시가 조용히 빠졌다. 그 결과
 * 어시스트 풀업이 보통 기구로 둔갑해 **보조를 늘리는 쪽을 증량으로 추천했다.**
 * 유산소 지표(cardioMetrics)도 예전에 같은 자리에서 같은 이유로 사라진 적이 있다.
 */
describe('「도와주는 기구」 표시가 중간에 사라지지 않는다', () => {
  it('기구 목록이 어시스트 풀업에 표시를 달아 준다', async () => {
    const { buildGymExercises, ASSISTED_EQUIPMENT_IDS } = await import('../../data/gymEquipment');
    const built = buildGymExercises('2026-08-27T00:00:00.000Z');
    const pullup = built.find(e => e.id === 'gym_nt_assistpullup');
    expect(pullup?.isAssisted).toBe(true);
    expect(ASSISTED_EQUIPMENT_IDS.has('gym_nt_assistpullup')).toBe(true);

    // 보통 기구에는 붙지 않는다.
    expect(built.find(e => e.id === 'gym_wt_highrow')?.isAssisted).toBeUndefined();
  });

  it('종목을 저장 형태로 다시 쌓을 때도 표시가 남는다', async () => {
    const { enrichExerciseWithDefaults } = await import('../../store/useWorkoutStore');
    const enriched = enrichExerciseWithDefaults({
      id: 'gym_nt_assistpullup',
      name: '[뉴텍] 어시스트 풀업',
      muscleGroup: '등',
      tier: 'secondary',
      loadType: 'machine',
      incrementKg: 5,
      isAssisted: true
    });
    expect(enriched.isAssisted).toBe(true);
  });
});
