import { describe, it, expect } from 'vitest';
import {
  calculateWeeklyVolume,
  lastPerformance,
  isHardSet,
  recommend
} from '../progression';
import { inlineText } from '../markdownGenerator';
import { Exercise, WorkoutSession, WorkoutSet, SessionExercise } from '../../types/workout';

/**
 * 대시보드 숫자를 만드는 함수들. 외부 검토에서 **시험이 아예 없다**는 지적을 받았다
 * (2026-08-27). 화면에 보이는 주간 볼륨·직전 기록·하드 세트 판정이 전부 여기서
 * 나오는데 그동안 무방비였다.
 *
 * 주 경계를 재려면 「지금」을 고정할 수 있어야 해서 calculateWeeklyVolume이
 * now를 인자로 받게 바꿨다.
 */

/** 2026-08-27은 목요일. 그 주는 월 2026-08-24 ~ 일 2026-08-30이다. */
const THURSDAY = new Date(2026, 7, 27, 12, 0, 0);

function session(date: string, exercises: Partial<SessionExercise>[]): WorkoutSession {
  return {
    id: 's_' + date + '_' + Math.round(exercises.length),
    title: '운동',
    date,
    startTime: `${date}T10:00:00+09:00`,
    durationMinutes: 40,
    totalVolumeKg: 0,
    totalSets: 0,
    targetMuscles: [],
    syncStatus: 'synced',
    exercises: exercises.map((e, i) => ({
      id: 'se' + i,
      exerciseId: 'ex' + i,
      exerciseName: '종목',
      muscleGroup: '등',
      sets: [],
      ...e
    })) as SessionExercise[]
  };
}

function sets(n: number, over: Partial<WorkoutSet> = {}): WorkoutSet[] {
  return Array.from({ length: n }, (_, i) => ({
    id: 'st' + i,
    setNumber: i + 1,
    weightKg: 50,
    reps: 10,
    isCompleted: true,
    actualRir: 1,
    rpe: 9,
    ...over
  }));
}

describe('calculateWeeklyVolume — 주 경계', () => {
  it('이번 주 월요일부터 일요일까지만 센다', () => {
    const history = [
      session('2026-08-24', [{ muscleGroup: '등', sets: sets(3) }]), // 이번 주 월요일
      session('2026-08-30', [{ muscleGroup: '등', sets: sets(2) }]), // 이번 주 일요일
      session('2026-08-23', [{ muscleGroup: '등', sets: sets(5) }])  // 지난주 일요일
    ];

    const v = calculateWeeklyVolume(history, null, THURSDAY);

    expect(v.startDate).toBe('2026-08-24');
    expect(v.endDate).toBe('2026-08-30');
    expect(v.totalHardSets).toBe(5); // 3 + 2, 지난주 5는 빠진다
  });

  it('다음 주 날짜의 기록은 합산하지 않는다', () => {
    // 상한 검사가 없던 시절엔 미래 날짜 기록까지 이번 주에 얹혔다.
    const history = [
      session('2026-08-26', [{ muscleGroup: '등', sets: sets(2) }]),
      session('2026-08-31', [{ muscleGroup: '등', sets: sets(9) }]) // 다음 주 월요일
    ];

    expect(calculateWeeklyVolume(history, null, THURSDAY).totalHardSets).toBe(2);
  });

  it('일요일에 열어도 그 주는 월요일에 시작한다', () => {
    const sunday = new Date(2026, 7, 30, 20, 0, 0);
    const v = calculateWeeklyVolume([], null, sunday);
    expect(v.startDate).toBe('2026-08-24');
    expect(v.endDate).toBe('2026-08-30');
  });

  it('진행 중인 세션도 함께 센다', () => {
    const live = session('2026-08-27', [{ muscleGroup: '가슴', sets: sets(3) }]);
    const v = calculateWeeklyVolume([], live, THURSDAY);
    expect(v.totalHardSets).toBe(3);
  });
});

describe('calculateWeeklyVolume — 유산소를 근력 세트로 세지 않는다', () => {
  const cardio: Partial<SessionExercise> = {
    muscleGroup: '유산소',
    cardioMetrics: ['speed', 'incline', 'duration'],
    sets: [{ id: 'c1', setNumber: 1, weightKg: 0, reps: 1, isCompleted: true, durationMin: 30 }]
  };

  it('유산소 한 판이 저반복(1~5회) 대역에 끼지 않는다', () => {
    const v = calculateWeeklyVolume([session('2026-08-27', [cardio])], null, THURSDAY);
    expect(v.repDistribution.low_1_5).toBe(0);
    expect(v.repDistribution.moderate_6_15).toBe(0);
    expect(v.repDistribution.high_16_30).toBe(0);
  });

  it('RPE를 안 누르는 종목이라고 「확인 불가」를 부풀리지 않는다', () => {
    const v = calculateWeeklyVolume([session('2026-08-27', [cardio])], null, THURSDAY);
    expect(v.unconfirmedSets).toBe(0);
  });

  it('cardioMetrics가 없는 옛 기록도 부위 이름으로 알아본다', () => {
    const old: Partial<SessionExercise> = { ...cardio, cardioMetrics: undefined };
    const v = calculateWeeklyVolume([session('2026-08-27', [old])], null, THURSDAY);
    expect(v.repDistribution.low_1_5).toBe(0);
  });

  it('근력 세트는 그대로 대역에 들어간다', () => {
    const v = calculateWeeklyVolume([session('2026-08-27', [
      { muscleGroup: '등', sets: sets(2, { reps: 4 }) },
      { muscleGroup: '가슴', sets: sets(1, { reps: 10 }) },
      { muscleGroup: '어깨', sets: sets(1, { reps: 20 }) }
    ])], null, THURSDAY);

    expect(v.repDistribution.low_1_5).toBe(2);
    expect(v.repDistribution.moderate_6_15).toBe(1);
    expect(v.repDistribution.high_16_30).toBe(1);
  });
});

describe('calculateWeeklyVolume — 하한 미달 부위', () => {
  it('관리하는 부위만 「미달」로 올린다', () => {
    const v = calculateWeeklyVolume([], null, THURSDAY);
    // 유산소·전신·기타는 화면에 늘 띄우는 부위가 아니라 미달 목록에 넣지 않는다.
    expect(v.underTargetMuscles).not.toContain('유산소');
    expect(v.underTargetMuscles).not.toContain('전신');
    expect(v.underTargetMuscles).toContain('등');
  });
});

describe('isHardSet', () => {
  it('주 운동은 RPE 6부터, 나머지는 RPE 7부터 하드 세트다', () => {
    expect(isHardSet({ rpe: 6 } as WorkoutSet, 'primary')).toBe(true);
    expect(isHardSet({ rpe: 5.5 } as WorkoutSet, 'primary')).toBe(false);
    expect(isHardSet({ rpe: 7 } as WorkoutSet, 'secondary')).toBe(true);
    expect(isHardSet({ rpe: 6 } as WorkoutSet, 'secondary')).toBe(false);
    expect(isHardSet({ rpe: 7 } as WorkoutSet, 'isolation')).toBe(true);
  });

  it('RPE 대신 RIR만 눌렀어도 알아본다', () => {
    expect(isHardSet({ actualRir: 3 } as WorkoutSet, 'secondary')).toBe(true);  // RPE 7
    expect(isHardSet({ actualRir: 4 } as WorkoutSet, 'secondary')).toBe(false); // RPE 6
  });

  it('아무것도 안 눌렀으면 하드 세트로 본다', () => {
    // 세었는데 안 세는 것보다, 안 셌는데 세는 쪽이 낫다 —
    // 대신 그런 세트는 「확인 불가」로 따로 표시된다.
    expect(isHardSet({} as WorkoutSet, 'secondary')).toBe(true);
  });
});

describe('lastPerformance', () => {
  const mk = (date: string, ss: Partial<WorkoutSet>[]) =>
    session(date, [{ exerciseId: 'ex_row', sets: ss.map((s, i) => ({
      id: 'x' + i, setNumber: i + 1, weightKg: 50, reps: 10, isCompleted: true, ...s
    })) as WorkoutSet[] }]);

  it('가장 최근 세션을 읽는다', () => {
    const h = [mk('2026-08-26', [{ weightKg: 60 }]), mk('2026-08-20', [{ weightKg: 40 }])];
    expect(lastPerformance(h, 'ex_row')?.workingWeight).toBe(60);
  });

  it('작업 무게는 가장 많이 나온 무게다 (동률이면 무거운 쪽)', () => {
    const h = [mk('2026-08-26', [{ weightKg: 50 }, { weightKg: 60 }, { weightKg: 60 }])];
    expect(lastPerformance(h, 'ex_row')?.workingWeight).toBe(60);

    const tie = [mk('2026-08-26', [{ weightKg: 50 }, { weightKg: 60 }])];
    expect(lastPerformance(tie, 'ex_row')?.workingWeight).toBe(60);
  });

  it('완료하지 않은 세트는 무시하고, 하나도 없으면 그 세션을 건너뛴다', () => {
    const h = [
      mk('2026-08-26', [{ weightKg: 99, isCompleted: false }]),
      mk('2026-08-20', [{ weightKg: 45 }])
    ];
    expect(lastPerformance(h, 'ex_row')?.workingWeight).toBe(45);
  });

  it('기록이 없으면 null이다', () => {
    expect(lastPerformance([], 'ex_row')).toBeNull();
  });

  it('무게 칸을 비운 채 완료한 세트를 0으로 받아 준다', () => {
    // 지우는 도중에 체크가 눌리면 무게가 undefined인 채로 완료된다.
    // 막지 않으면 다음 세션 추천에 **"undefinedkg 유지"**가 뜬다. 실제로 재현됐다.
    const h = [mk('2026-08-26', [{ weightKg: undefined as unknown as number }])];
    const perf = lastPerformance(h, 'ex_row');
    expect(perf?.workingWeight).toBe(0);

    const ex: Exercise = {
      id: 'ex_row', name: '로우', muscleGroup: '등', tier: 'secondary',
      loadType: 'machine', incrementKg: 5, repRangeLow: 8, repRangeHigh: 12,
      defaultRestSeconds: 150, createdAt: ''
    };
    const rec = recommend(ex, h);
    expect(rec.reason).not.toContain('undefined');
    expect(Number.isFinite(rec.sets[0].weightKg)).toBe(true);
  });
});

describe('첫 기록 시작 무게는 그 기구에서 맞출 수 있는 값이어야 한다', () => {
  it('조절 단위가 2.27kg인 기구에 20kg을 띄우지 않는다', () => {
    // 프라임 기구는 5lb(2.27kg) 단위다. 눈금에 20kg이라는 자리가 없다.
    const prime: Exercise = {
      id: 'gym_pr_x', name: '[프라임] 무언가', muscleGroup: '등', tier: 'secondary',
      loadType: 'machine', incrementKg: 2.27, repRangeLow: 8, repRangeHigh: 12,
      defaultRestSeconds: 150, createdAt: ''
    };
    const w = recommend(prime, []).sets[0].weightKg;
    expect(Math.round((w / 2.27) * 1000) / 1000 % 1).toBe(0);
  });

  it('맨몸 종목은 0kg 그대로 둔다', () => {
    const bw: Exercise = {
      id: 'ex_pullup', name: '턱걸이', muscleGroup: '등', tier: 'secondary',
      loadType: 'bodyweight', incrementKg: 2.5, repRangeLow: 8, repRangeHigh: 12,
      defaultRestSeconds: 150, createdAt: ''
    };
    expect(recommend(bw, []).sets[0].weightKg).toBe(0);
  });
});

describe('inlineText — 자유롭게 쓴 글이 마크다운을 깨지 않는다', () => {
  it('줄바꿈을 한 줄로 눕힌다', () => {
    expect(inlineText('첫 줄\n둘째 줄')).toBe('첫 줄 / 둘째 줄');
    expect(inlineText('윈도우\r\n줄바꿈')).toBe('윈도우 / 줄바꿈');
  });

  it('표의 칸 구분자를 막는다', () => {
    expect(inlineText('무게|횟수')).toBe('무게\\|횟수');
  });

  it('빈 값은 빈 문자열이다', () => {
    expect(inlineText(undefined)).toBe('');
    expect(inlineText(null)).toBe('');
  });
});
