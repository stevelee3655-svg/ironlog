import { describe, it, expect } from 'vitest';
import { bareMovementName, substitutionCandidates } from '../progression';
import { Exercise } from '../../types/workout';

function ex(id: string, name: string, muscle: Exercise['muscleGroup'], tier: Exercise['tier']): Exercise {
  return {
    id,
    name,
    muscleGroup: muscle,
    tier,
    loadType: 'machine',
    incrementKg: 2.5,
    repRangeLow: 8,
    repRangeHigh: 12,
    defaultRestSeconds: 150,
    createdAt: '2026-08-26T00:00:00.000Z'
  };
}

describe('bareMovementName', () => {
  it('제조사 대괄호를 뗀다', () => {
    expect(bareMovementName('[프라임] 펙 덱 플라이')).toBe('펙 덱 플라이');
    expect(bareMovementName('[왓슨 케이블] 로프 푸쉬다운')).toBe('로프 푸쉬다운');
  });

  it('대괄호가 없으면 그대로 둔다', () => {
    expect(bareMovementName('런닝머신')).toBe('런닝머신');
  });
});

describe('substitutionCandidates', () => {
  const all = [
    ex('a', '[아틀란티스] 펙 덱 플라이', '가슴', 'isolation'),   // 같은 동작, 제조사만 다름
    ex('b', '[파나타] 버티컬 체스트 프레스', '가슴', 'secondary'), // 같은 부위, 다른 등급
    ex('c', '[노틸러스] 펙 플라이', '가슴', 'isolation'),        // 같은 부위, 같은 등급
    ex('d', '[왓슨] 하이 로우', '등', 'secondary'),              // 다른 부위 — 나오면 안 된다
    ex('e', '런닝머신', '유산소', 'isolation')                   // 유산소 — 나오면 안 된다
  ];
  const current = { exerciseId: 'z', exerciseName: '[프라임] 펙 덱 플라이', muscleGroup: '가슴' as const, tier: 'isolation' as const };

  it('같은 동작(제조사만 다름)을 맨 앞에 둔다', () => {
    const got = substitutionCandidates(current, all);
    expect(got[0].exercise.id).toBe('a');
    expect(got[0].rank).toBe('same-movement');
  });

  it('그다음이 같은 등급, 그다음이 같은 부위다', () => {
    const got = substitutionCandidates(current, all);
    expect(got.map(g => g.rank)).toEqual(['same-movement', 'same-tier', 'same-muscle']);
  });

  it('다른 부위와 유산소는 후보에 넣지 않는다', () => {
    const ids = substitutionCandidates(current, all).map(g => g.exercise.id);
    expect(ids).not.toContain('d');
    expect(ids).not.toContain('e');
  });

  it('자기 자신은 후보에서 뺀다', () => {
    const self = ex('z', '[프라임] 펙 덱 플라이', '가슴', 'isolation');
    const ids = substitutionCandidates(current, [self, ...all]).map(g => g.exercise.id);
    expect(ids).not.toContain('z');
  });

  it('유산소를 바꿀 때는 유산소만 나온다', () => {
    const cardio = { exerciseId: 'x', exerciseName: '마이마운틴', muscleGroup: '유산소' as const, tier: 'isolation' as const };
    const got = substitutionCandidates(cardio, all);
    expect(got.map(g => g.exercise.id)).toEqual(['e']);
  });
});
