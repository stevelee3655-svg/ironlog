import { describe, it, expect } from 'vitest';
import { 
  generateWorkoutMarkdown, 
  getWorkoutFilename, 
  computeDelta, 
  topSetOf, 
  previousTops,
  comma,
  yamlString
} from '../markdownGenerator';
import { WorkoutSession, SessionExercise } from '../../types/workout';

describe('Markdown Generator (LLM Wiki Exporter)', () => {
  const mockSession: WorkoutSession = {
    id: 'test-session-1',
    title: '가슴 & 삼두 "폭파" 운동',
    routineName: '가슴 "폭파" 루틴 A',
    date: '2026-08-26',
    startTime: '2026-08-26T13:30:00.000Z',
    endTime: '2026-08-26T14:45:00.000Z',
    durationMinutes: 75,
    totalVolumeKg: 2000,
    totalSets: 4,
    targetMuscles: ['가슴', '삼두'],
    condition: '최상 (수면 8시간)',
    generalNotes: '어깨 워밍업 충분히 진행함',
    syncStatus: 'pending',
    exercises: [
      {
        id: 'se-1',
        exerciseId: 'ex-1',
        exerciseName: '바벨 벤치프레스',
        muscleGroup: '가슴',
        tier: 'primary',
        notes: '마지막 세트 드롭세트 느낌으로 쥐어짬',
        sets: [
          {
            id: 'set-1',
            setNumber: 1,
            weightKg: 60,
            reps: 10,
            isCompleted: true,
            rpe: 7,
            actualRir: 3,
            targetRir: 4,
            restSeconds: 90
          },
          {
            id: 'set-2',
            setNumber: 2,
            weightKg: 80,
            reps: 8,
            isCompleted: true,
            rpe: 8.5,
            actualRir: 1.5,
            targetRir: 3,
            restSeconds: 120
          },
          {
            id: 'set-3',
            setNumber: 3,
            weightKg: 100,
            reps: 5,
            isCompleted: false, // uncompleted -> should be excluded from top set
            rpe: 9,
            restSeconds: 120
          }
        ]
      },
      {
        id: 'se-2',
        exerciseId: 'ex-2',
        exerciseName: '케이블 트라이셉스 푸시다운',
        muscleGroup: '삼두',
        tier: 'isolation',
        sets: [
          {
            id: 'set-4',
            setNumber: 1,
            weightKg: 30,
            reps: 15,
            isCompleted: true,
            rpe: 8,
            actualRir: 2,
            targetRir: 1,
            restSeconds: 60
          }
        ]
      }
    ]
  };

  it('generates unique filename with start time to avoid overwriting same-day workouts', () => {
    const fn1 = getWorkoutFilename(mockSession);
    expect(fn1).toContain('2026-08-26');
    expect(fn1).toContain('_운동_가슴 & 삼두 -폭파- 운동.md');

    const eveningSession: WorkoutSession = {
      ...mockSession,
      id: 'test-session-2',
      startTime: '2026-08-26T19:45:00.000Z'
    };
    const fn2 = getWorkoutFilename(eveningSession);
    expect(fn1).not.toBe(fn2);
  });

  it('escapes quotes and special characters in YAML frontmatter safely', () => {
    expect(yamlString('가슴 "폭파" 루틴')).toBe('"가슴 \\"폭파\\" 루틴"');
    expect(yamlString('Backslash \\ test')).toBe('"Backslash \\\\ test"');

    const md = generateWorkoutMarkdown(mockSession);
    expect(md).toContain('routine_name: "가슴 \\"폭파\\" 루틴 A"');
    expect(md).toContain('condition: "최상 (수면 8시간)"');
  });

  it('formats numbers with comma independent of runtime locale', () => {
    expect(comma(1000)).toBe('1,000');
    expect(comma(1234567.89)).toBe('1,234,568');
  });

  it('accurately extracts topSet excluding uncompleted sets', () => {
    const top = topSetOf(mockSession.exercises[0]);
    expect(top).not.toBeNull();
    // 100kg is uncompleted, so 80kg x 8 is top set
    expect(top?.weightKg).toBe(80);
    expect(top?.reps).toBe(8);
  });

  it('computes delta for all progression scenarios (중량 증가, 감소, 횟수 증가, 유지, 신규)', () => {
    const ex = mockSession.exercises[0]; // top: 80kg x 8

    // 1. 신규 (직전 기록 없음)
    expect(computeDelta(ex, undefined)).toBe('신규');

    // 2. 완전 동일
    expect(computeDelta(ex, { weightKg: 80, reps: 8 })).toBe('유지');

    // 3. 중량 증가
    expect(computeDelta(ex, { weightKg: 75, reps: 8 })).toBe('+5kg');

    // 4. 중량 감소
    expect(computeDelta(ex, { weightKg: 85, reps: 8 })).toBe('-5kg');

    // 5. 중량 같고 횟수 증가
    expect(computeDelta(ex, { weightKg: 80, reps: 6 })).toBe('+2회');

    // 6. 중량 같고 횟수 감소
    expect(computeDelta(ex, { weightKg: 80, reps: 10 })).toBe('-2회');
  });

  it('finds previous tops across history array', () => {
    const pastSession: WorkoutSession = {
      id: 'past-1',
      title: '과거 운동',
      date: '2026-08-20',
      startTime: '2026-08-20T10:00:00Z',
      durationMinutes: 60,
      totalVolumeKg: 1500,
      totalSets: 3,
      targetMuscles: ['가슴'],
      syncStatus: 'synced',
      exercises: [{
        id: 'pse-1',
        exerciseId: 'ex-1',
        exerciseName: '바벨 벤치프레스',
        muscleGroup: '가슴',
        sets: [
          { id: 'ps-1', setNumber: 1, weightKg: 75, reps: 8, isCompleted: true }
        ]
      }]
    };

    const tops = previousTops([pastSession], 'current-id');
    expect(tops['ex-1']).toEqual({
      weightKg: 75,
      reps: 8,
      rpe: undefined,
      rir: undefined
    });
  });

  it('includes clean footer without agent instructions', () => {
    const md = generateWorkoutMarkdown(mockSession);
    expect(md).toContain('*IronLog에서 자동 생성된 기록입니다.*');
    expect(md).not.toContain('AI 에이전트 브리핑');
    expect(md).not.toContain('[!tip]');
  });
});
