import { describe, it, expect } from 'vitest';
import { 
  classifyExercise, 
  estimate1RM, 
  roundToIncrement, 
  setRpeTargets, 
  lastPerformance, 
  isStalled, 
  recommend, 
  adjustRemaining,
  isHardSet,
  calculateWeeklyVolume
} from '../progression';
import { Exercise, WorkoutSession, WorkoutSet } from '../../types/workout';

describe('Jeff Nippard Muscle Ladder Progression Engine', () => {
  describe('classifyExercise', () => {
    it('should classify main barbell compound movements', () => {
      const result = classifyExercise('바벨 벤치프레스', '가슴');
      expect(result.tier).toBe('primary');
      expect(result.loadType).toBe('barbell');
      expect(result.repRangeLow).toBe(6);
      expect(result.repRangeHigh).toBe(10);
      expect(result.incrementKg).toBe(2.5);
      expect(result.defaultRestSeconds).toBe(210);
    });

    it('should classify isolation movements', () => {
      const result = classifyExercise('덤벨 사이드 래터럴 레이즈', '어깨');
      expect(result.tier).toBe('isolation');
      expect(result.loadType).toBe('dumbbell_pair');
      expect(result.repRangeLow).toBe(10);
      expect(result.repRangeHigh).toBe(15);
      expect(result.incrementKg).toBe(2.0);
      expect(result.defaultRestSeconds).toBe(90);
    });

    it('should classify secondary machine movements', () => {
      const result = classifyExercise('랫풀다운', '등');
      expect(result.tier).toBe('secondary');
      expect(result.loadType).toBe('machine');
      expect(result.repRangeLow).toBe(8);
      expect(result.repRangeHigh).toBe(12);
      expect(result.incrementKg).toBe(5.0);
      expect(result.defaultRestSeconds).toBe(150);
    });
  });

  describe('estimate1RM & setRpeTargets', () => {
    it('should calculate e1RM with Epley + RIR formula', () => {
      // 100kg x 10 @ RPE 10 (RIR 0) -> 100 * (1 + 10/30) = 133.3
      expect(estimate1RM(100, 10, 10)).toBe(133.3);
      // 100kg x 8 @ RPE 8 (RIR 2) -> 100 * (1 + 10/30) = 133.3
      expect(estimate1RM(100, 8, 8)).toBe(133.3);
      // rpe omitted -> assumes RIR 2 (100 x 8 -> 133.3)
      expect(estimate1RM(100, 8)).toBe(133.3);
    });

    it('should cap effective reps at 12', () => {
      expect(estimate1RM(50, 15, 10)).toBe(50 * (1 + 12 / 30));
    });

    it('should generate interpolated RPE targets', () => {
      // secondary 3 sets: [8, 9, 10]
      expect(setRpeTargets('secondary', 3)).toEqual([8, 9, 10]);
      // primary 3 sets: [6, 7, 8]
      expect(setRpeTargets('primary', 3)).toEqual([6, 7, 8]);
      // isolation 3 sets: [9, 9.5, 10]
      expect(setRpeTargets('isolation', 3)).toEqual([9, 9.5, 10]);
    });
  });

  describe('recommend (7 Progression Rules)', () => {
    const mockSecondaryEx: Exercise = {
      id: 'ex_latpull',
      name: '랫풀다운',
      muscleGroup: '등',
      tier: 'secondary',
      loadType: 'machine',
      incrementKg: 2.5,
      repRangeLow: 8,
      repRangeHigh: 12,
      defaultRestSeconds: 150,
      createdAt: ''
    };

    const makeSession = (sets: Partial<WorkoutSet>[], date = '2026-08-20'): WorkoutSession => ({
      id: 's_' + date,
      title: '등 운동',
      date,
      startTime: `${date}T10:00:00Z`,
      durationMinutes: 45,
      totalVolumeKg: 1000,
      totalSets: sets.length,
      targetMuscles: ['등'],
      syncStatus: 'synced',
      exercises: [{
        id: 'se1',
        exerciseId: 'ex_latpull',
        exerciseName: '랫풀다운',
        muscleGroup: '등',
        tier: 'secondary',
        sets: sets.map((s, i) => ({
          id: `st_${i + 1}`,
          setNumber: i + 1,
          weightKg: s.weightKg ?? 50,
          reps: s.reps ?? 10,
          isCompleted: s.isCompleted ?? true,
          rpe: s.rpe,
          actualRir: s.actualRir
        }))
      }]
    });

    it('Rule 1 (첫 기록): history empty -> first_time, reps = repRangeLow', () => {
      const rec = recommend(mockSecondaryEx, []);
      expect(rec.action).toBe('first_time');
      expect(rec.sets[0].reps).toBe(8);
      expect(rec.reason).toContain('하단 횟수');
    });

    it('Rule 6 (상단 도달): 50kg x 12/12/12 -> increase_load, 52.5kg x 8', () => {
      const history = [makeSession([
        { weightKg: 50, reps: 12, rpe: 8 },
        { weightKg: 50, reps: 12, rpe: 9 },
        { weightKg: 50, reps: 12, rpe: 10 }
      ])];
      const rec = recommend(mockSecondaryEx, history);
      expect(rec.action).toBe('increase_load');
      expect(rec.sets[0].weightKg).toBe(52.5);
      expect(rec.sets[0].reps).toBe(8);
      expect(rec.reason).toContain('+2.5kg 증량');
    });

    it('Rule 7 (상단 미달): 50kg x 10/10/9 -> increase_reps, 50kg, reps [11, 11, 10]', () => {
      const history = [makeSession([
        { weightKg: 50, reps: 10, rpe: 8 },
        { weightKg: 50, reps: 10, rpe: 9 },
        { weightKg: 50, reps: 9, rpe: 10 }
      ])];
      const rec = recommend(mockSecondaryEx, history);
      expect(rec.action).toBe('increase_reps');
      expect(rec.sets[0].weightKg).toBe(50);
      expect(rec.sets.map(s => s.reps)).toEqual([11, 11, 10]);
    });

    it('Rule 4 (하단 미달): 50kg x 7/6/6 -> hold, 50kg x 8', () => {
      const history = [makeSession([
        { weightKg: 50, reps: 7, rpe: 8 },
        { weightKg: 50, reps: 6, rpe: 9 },
        { weightKg: 50, reps: 6, rpe: 10 }
      ])];
      const rec = recommend(mockSecondaryEx, history);
      expect(rec.action).toBe('hold');
      expect(rec.sets[0].weightKg).toBe(50);
      expect(rec.sets[0].reps).toBe(8);
      expect(rec.reason).toContain('하단 횟수');
    });

    it('Rule 6 (너무 쉬움): 50kg x 9/9/9, last RPE 6 -> increase_load', () => {
      const history = [makeSession([
        { weightKg: 50, reps: 9, rpe: 6 },
        { weightKg: 50, reps: 9, rpe: 6 },
        { weightKg: 50, reps: 9, rpe: 6 } // target was 10, diff = 4 (>=2)
      ])];
      const rec = recommend(mockSecondaryEx, history);
      expect(rec.action).toBe('increase_load');
      expect(rec.sets[0].weightKg).toBe(52.5);
      expect(rec.reason).toContain('여유');
    });

    it('Rule 3 (너무 힘듦): 50kg x 8/8/8, last RPE 11.5 상당 -> back_off, 45kg', () => {
      const history = [makeSession([
        { weightKg: 50, reps: 8, rpe: 9 },
        { weightKg: 50, reps: 8, rpe: 10 },
        { weightKg: 50, reps: 8, rpe: 11.5 } // target was 10, diff = 1.5
      ])];
      const rec = recommend(mockSecondaryEx, history);
      expect(rec.action).toBe('back_off');
      expect(rec.sets[0].weightKg).toBe(45); // -10%
      expect(rec.reason).toContain('과도한 피로');
    });

    it('큰 점프(20% > 15%): 막지 않고 증량을 추천하되 사유에 경고를 붙인다', () => {
      const dbEx: Exercise = {
        id: 'ex_db_raise',
        name: '덤벨 사레레',
        muscleGroup: '어깨',
        tier: 'isolation',
        loadType: 'dumbbell_pair',
        incrementKg: 2.0, // 2kg on 10kg is 20% > 15%
        repRangeLow: 10,
        repRangeHigh: 15,
        defaultRestSeconds: 90,
        createdAt: ''
      };

      const history: WorkoutSession[] = [{
        id: 's_db',
        title: '어깨 운동',
        date: '2026-08-20',
        startTime: '2026-08-20T10:00:00Z',
        durationMinutes: 30,
        totalVolumeKg: 450,
        totalSets: 3,
        targetMuscles: ['어깨'],
        syncStatus: 'synced',
        exercises: [{
          id: 'se_db',
          exerciseId: 'ex_db_raise',
          exerciseName: '덤벨 사레레',
          muscleGroup: '어깨',
          sets: [
            { id: '1', setNumber: 1, weightKg: 10, reps: 15, isCompleted: true },
            { id: '2', setNumber: 2, weightKg: 10, reps: 15, isCompleted: true },
            { id: '3', setNumber: 3, weightKg: 10, reps: 15, isCompleted: true }
          ]
        }]
      }];

      // 증량 폭이 커도 **막지 않는다.** 상단을 채웠으면 평소대로 증량을 추천하고,
      // 한 번에 꽤 세진다는 사실은 사유에 한 줄로만 알린다.
      // (수환 지시, 2026-08-27: "경고문으로 보여주되, 강제하진 말아.
      //  현실에서 운동할 땐 무게의 범위가 생각보다 많이 위 아래로 변동하니까.")
      const rec = recommend(dbEx, history);
      expect(rec.action).toBe('increase_load');
      expect(rec.sets[0].weightKg).toBe(12);
      expect(rec.sets.map(s => s.reps)).toEqual([10, 10, 10]);
      expect(rec.reason).toContain('20%');
      expect(rec.reason).toContain('횟수를 더 쌓아도 됩니다');
      // 목표 상한을 몰래 늘리지 않는다 — 그것도 결국 강제가 된다.
      expect(rec.reason).not.toContain('18회');
    });

    it('Rule 6 (작은 점프): 40kg machine x 15/15/15, increment 5kg (12.5% <= 15%) -> increase_load, 45kg x 10', () => {
      const machineEx: Exercise = {
        id: 'ex_cable_fly',
        name: '케이블 플라이',
        muscleGroup: '가슴',
        tier: 'isolation',
        loadType: 'machine',
        incrementKg: 5.0, // 5 / 40 = 12.5% <= 15%
        repRangeLow: 10,
        repRangeHigh: 15,
        defaultRestSeconds: 90,
        createdAt: ''
      };

      const history: WorkoutSession[] = [{
        id: 's_m',
        title: '가슴 운동',
        date: '2026-08-20',
        startTime: '2026-08-20T10:00:00Z',
        durationMinutes: 30,
        totalVolumeKg: 1800,
        totalSets: 3,
        targetMuscles: ['가슴'],
        syncStatus: 'synced',
        exercises: [{
          id: 'se_m',
          exerciseId: 'ex_cable_fly',
          exerciseName: '케이블 플라이',
          muscleGroup: '가슴',
          sets: [
            { id: '1', setNumber: 1, weightKg: 40, reps: 15, isCompleted: true },
            { id: '2', setNumber: 2, weightKg: 40, reps: 15, isCompleted: true },
            { id: '3', setNumber: 3, weightKg: 40, reps: 15, isCompleted: true }
          ]
        }]
      }];

      const rec = recommend(machineEx, history);
      expect(rec.action).toBe('increase_load');
      expect(rec.sets[0].weightKg).toBe(45);
      expect(rec.sets[0].reps).toBe(10);
    });

    it('Rule 6 (맨몸): bodyweight upper reached -> add_external_load', () => {
      const bwEx: Exercise = {
        id: 'ex_pullup',
        name: '풀업',
        muscleGroup: '등',
        tier: 'secondary',
        loadType: 'bodyweight',
        incrementKg: 0,
        repRangeLow: 8,
        repRangeHigh: 12,
        defaultRestSeconds: 150,
        createdAt: ''
      };

      const history: WorkoutSession[] = [{
        id: 's_bw',
        title: '등 운동',
        date: '2026-08-20',
        startTime: '2026-08-20T10:00:00Z',
        durationMinutes: 30,
        totalVolumeKg: 0,
        totalSets: 3,
        targetMuscles: ['등'],
        syncStatus: 'synced',
        exercises: [{
          id: 'se_bw',
          exerciseId: 'ex_pullup',
          exerciseName: '풀업',
          muscleGroup: '등',
          sets: [
            { id: '1', setNumber: 1, weightKg: 0, reps: 12, isCompleted: true },
            { id: '2', setNumber: 2, weightKg: 0, reps: 12, isCompleted: true },
            { id: '3', setNumber: 3, weightKg: 0, reps: 12, isCompleted: true }
          ]
        }]
      }];

      const rec = recommend(bwEx, history);
      expect(rec.action).toBe('add_external_load');
      expect(rec.reason).toContain('외부 중량');
    });

    it('RPE 없음: rpe undefined -> rep-based logic works cleanly', () => {
      const history = [makeSession([
        { weightKg: 50, reps: 10 },
        { weightKg: 50, reps: 10 },
        { weightKg: 50, reps: 10 }
      ])];
      const rec = recommend(mockSecondaryEx, history);
      expect(rec.action).toBe('increase_reps');
      expect(rec.sets.map(s => s.reps)).toEqual([11, 11, 11]);
    });
  });

  describe('isStalled', () => {
    it('should return false if fewer than window + 1 sessions exist', () => {
      const history = [
        { id: '1', title: '테스트', date: '2026-08-20', startTime: '2026-08-20T00:00:00Z', durationMinutes: 10, totalVolumeKg: 100, totalSets: 1, targetMuscles: ['등'], syncStatus: 'synced' as const, exercises: [{ id: 'se1', exerciseId: 'ex_latpull', exerciseName: '랫풀다운', muscleGroup: '등' as const, sets: [{ id: 's1', setNumber: 1, weightKg: 50, reps: 10, isCompleted: true }] }] },
        { id: '2', title: '테스트', date: '2026-08-18', startTime: '2026-08-18T00:00:00Z', durationMinutes: 10, totalVolumeKg: 100, totalSets: 1, targetMuscles: ['등'], syncStatus: 'synced' as const, exercises: [{ id: 'se2', exerciseId: 'ex_latpull', exerciseName: '랫풀다운', muscleGroup: '등' as const, sets: [{ id: 's2', setNumber: 1, weightKg: 50, reps: 10, isCompleted: true }] }] }
      ];
      expect(isStalled(history, 'ex_latpull', 3)).toBe(false);
    });

    it('should detect stagnation if recent 3 sessions e1RM did not exceed previous max', () => {
      const makeH = (id: string, weightKg: number, reps: number) => ({
        id, title: '테스트', date: '2026-08-20', startTime: '2026-08-20T00:00:00Z', durationMinutes: 10, totalVolumeKg: 100, totalSets: 1, targetMuscles: ['등' as const], syncStatus: 'synced' as const,
        exercises: [{ id: 'se', exerciseId: 'ex_latpull', exerciseName: '랫풀다운', muscleGroup: '등' as const, sets: [{ id: 's', setNumber: 1, weightKg, reps, isCompleted: true }] }]
      });

      // 4 sessions: recent 3 (50kg x 8 -> e1rm 63.3), previous (60kg x 10 -> e1rm 80)
      const history = [
        makeH('1', 50, 8),
        makeH('2', 50, 8),
        makeH('3', 50, 8),
        makeH('4', 60, 10) // previous max
      ];
      expect(isStalled(history, 'ex_latpull', 3)).toBe(true);
    });
  });

  describe('adjustRemaining', () => {
    const mockEx: Exercise = {
      id: 'ex1',
      name: '벤치',
      muscleGroup: '가슴',
      tier: 'primary',
      loadType: 'barbell',
      incrementKg: 2.5,
      repRangeLow: 6,
      repRangeHigh: 10,
      defaultRestSeconds: 210,
      createdAt: ''
    };

    it('should reduce weight by 10% when set was 2+ RPE harder than target', () => {
      const completed: WorkoutSet = { id: 's1', setNumber: 1, weightKg: 80, reps: 6, isCompleted: true, rpe: 9 };
      const remaining: WorkoutSet[] = [
        { id: 's2', setNumber: 2, weightKg: 80, reps: 6, isCompleted: false },
        { id: 's3', setNumber: 3, weightKg: 80, reps: 6, isCompleted: false }
      ];
      // Target was 7, actual was 9 -> diff = +2
      const adjusted = adjustRemaining(mockEx, completed, 7, remaining);
      expect(adjusted[0].weightKg).toBe(72.5); // 80 * 0.9 = 72.5
      expect(adjusted[0].recommendationReason).toContain('피로 누적');
    });

    it('should increase weight by 5% when set was 2+ RPE easier than target', () => {
      const completed: WorkoutSet = { id: 's1', setNumber: 1, weightKg: 80, reps: 6, isCompleted: true, rpe: 6 };
      const remaining: WorkoutSet[] = [
        { id: 's2', setNumber: 2, weightKg: 80, reps: 6, isCompleted: false }
      ];
      // Target was 8, actual was 6 -> diff = -2
      const adjusted = adjustRemaining(mockEx, completed, 8, remaining);
      expect(adjusted[0].weightKg).toBe(85); // 80 * 1.05 = 84 -> round to 2.5 is 85
      expect(adjusted[0].recommendationReason).toContain('높은 여유도');
    });
  });
});
