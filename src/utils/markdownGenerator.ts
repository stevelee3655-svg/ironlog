import { WorkoutSession, SessionExercise } from '../types/workout';
import { localDateKey } from './date';
import {
  estimate1RM,
  lastPerformance,
  isStalled,
  recommend,
  calculateWeeklyVolume,
  effectiveLoadKg,
  getBodyWeightKg
} from './progression';

export interface TopSet {
  weightKg: number;
  reps: number;
  rpe?: number;
  rir?: number;
}

/**
 * YAML 문자열 이스케이프 헬퍼
 */
export function yamlString(value: unknown): string {
  // 메모에 줄바꿈이 들어가면 따옴표 안에서 줄이 갈라져 머리말 전체가 깨진다.
  // JSON 문자열은 YAML 1.2가 그대로 받아들이는 형식이라 이걸 쓰면 개행·탭·
  // 제어문자까지 한 번에 안전해진다. (외부 검토 지적, 2026-08-27)
  return JSON.stringify(String(value ?? ''));
}

/**
 * 로케일 독립적 천 단위 콤마 포맷터
 */
export function comma(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 시작 시각을 포함한 유일한 파일명 생성 (동명 덮어쓰기 방지)
 */
export function getWorkoutFilename(session: WorkoutSession): string {
  // UTC로 바꾸면 오전 운동이 전날 파일에 붙는다(한국은 UTC+9).
  const dateStr = session.date || localDateKey();
  const titleStr = (session.title || session.routineName || '운동')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-');

  let timeStr = '';
  if (session.startTime) {
    const d = new Date(session.startTime);
    if (!Number.isNaN(d.getTime())) {
      timeStr = `-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }

  return `${dateStr}${timeStr}_운동_${titleStr}.md`;
}

function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  try {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '--:--';
  }
}

/**
 * 완료된 세트 중 최고 세트 (중량 우선, 같으면 횟수 우선)
 *
 * ⚠️ 어시스트 기구는 눈금이 클수록 **쉬운** 세트다. 눈금으로 고르면
 * 보조를 제일 많이 받은 세트가 「최고 세트」로 뽑힌다. 그래서 실제 부하로 비교한다.
 */
export function topSetOf(exercise: SessionExercise): TopSet | null {
  const done = exercise.sets.filter(s => s.isCompleted && s.reps > 0);
  if (done.length === 0) return null;

  const loadOf = (kg: number) => effectiveLoadKg(kg, exercise.isAssisted);

  let best = done[0];
  for (const s of done) {
    if (loadOf(s.weightKg) > loadOf(best.weightKg)) {
      best = s;
    } else if (s.weightKg === best.weightKg && s.reps > best.reps) {
      best = s;
    }
  }

  const rpe = best.rpe ?? (best.actualRir !== undefined ? 10 - best.actualRir : undefined);
  const rir = best.actualRir ?? (best.rpe !== undefined ? 10 - best.rpe : undefined);

  return {
    weightKg: best.weightKg,
    reps: best.reps,
    rpe,
    rir
  };
}

/**
 * 이 세션 이전의 기록에서 종목별 최고 세트를 추출 (history는 최신순)
 */
export function previousTops(
  history: WorkoutSession[],
  currentSessionId: string
): Record<string, TopSet> {
  const result: Record<string, TopSet> = {};

  for (const past of history) {
    if (past.id === currentSessionId) continue;
    for (const ex of past.exercises) {
      if (result[ex.exerciseId]) continue; // 더 최신 기록이 이미 등록됨
      const top = topSetOf(ex);
      if (top) result[ex.exerciseId] = top;
    }
  }
  return result;
}

function signed(n: number, unit: string): string {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}${unit}`;
}

/**
 * 직전 세션 대비 변화량 계산 (+5kg | -5kg | +2회 | 유지 | 신규 | "")
 */
export function computeDelta(exercise: SessionExercise, prev?: TopSet): string {
  const top = topSetOf(exercise);
  if (!top) return '';
  if (!prev) return '신규';

  // 어시스트 기구에서 눈금이 5kg 올랐다는 것은 보조를 5kg 더 받았다는 뜻,
  // 즉 **부하가 5kg 줄었다**는 뜻이다. 그대로 "+5kg"이라 적으면 퇴보가 발전으로 읽힌다.
  const dw = exercise.isAssisted
    ? prev.weightKg - top.weightKg
    : top.weightKg - prev.weightKg;
  if (dw !== 0) return signed(dw, 'kg');

  const dr = top.reps - prev.reps;
  if (dr !== 0) return signed(dr, '회');

  return '유지';
}

export function calculateSessionStats(
  exercises: SessionExercise[],
  bodyWeightKg: number = getBodyWeightKg()
) {
  let completedVolume = 0;
  let completedSets = 0;
  const muscleSet = new Set<string>();

  for (const ex of exercises) {
    if (ex.muscleGroup) {
      muscleSet.add(ex.muscleGroup);
    }
    for (const set of ex.sets) {
      if (set.isCompleted && set.reps > 0) {
        // 어시스트 기구의 눈금은 「도와주는 힘」이라 그대로 곱하면 볼륨이 거꾸로 쌓인다.
        // 보조를 많이 받은 날일수록 총 볼륨이 커지는 꼴이 된다.
        completedVolume +=
          effectiveLoadKg(set.weightKg || 0, ex.isAssisted, bodyWeightKg) * set.reps;
        completedSets += 1;
      }
    }
  }

  return {
    completedVolume,
    completedSets,
    targetMuscles: Array.from(muscleSet)
  };
}

/**
 * Google Drive / LLM Wiki 전송용 마크다운 생성
 */
export function generateWorkoutMarkdown(
  session: WorkoutSession,
  prevTops: Record<string, TopSet> = {},
  history: WorkoutSession[] = [],
  bodyWeightKg: number = getBodyWeightKg()
): string {
  const stats = calculateSessionStats(session.exercises, bodyWeightKg);
  const startTimeFormatted = formatTime(session.startTime);
  const endTimeFormatted = formatTime(session.endTime);
  const muscles = session.targetMuscles?.length ? session.targetMuscles : stats.targetMuscles;
  const title = session.title || session.routineName || '오늘의 헬스 운동';
  const routine = session.routineName || '자유 운동';

  const weeklyVolume = calculateWeeklyVolume(history, session);

  // 1. YAML Frontmatter 생성
  let md = `---
type: workout_log
date: ${session.date}
start_time: ${yamlString(startTimeFormatted)}
end_time: ${yamlString(endTimeFormatted)}
duration_minutes: ${session.durationMinutes}
total_volume_kg: ${stats.completedVolume}
total_sets: ${stats.completedSets}
target_muscles:
${muscles.map(m => `  - ${yamlString(m)}`).join('\n') || '  - "전신"'}
routine_name: ${yamlString(routine)}
condition: ${yamlString(session.condition || '보통')}
exercises:
`;

  session.exercises.forEach(ex => {
    const top = topSetOf(ex);
    const prev = prevTops[ex.exerciseId];
    const delta = computeDelta(ex, prev);
    const tier = ex.tier || 'secondary';

    let topSetLabel = '없음';
    let e1rmVal = 0;
    if (top) {
      const rirStr = top.rir !== undefined ? ` @RIR${top.rir}` : (top.rpe !== undefined ? ` @RPE${top.rpe}` : '');
      // 어시스트 기구는 눈금이 「도와주는 힘」이다. 그대로 적으면 위키를 읽는 쪽이
      // 무게로 오해하므로 「보조」를 붙이고, 계산은 실제 부하(체중 − 눈금)로 한다.
      topSetLabel = ex.isAssisted
        ? `보조 ${top.weightKg}kg × ${top.reps}${rirStr}`
        : `${top.weightKg}kg × ${top.reps}${rirStr}`;
      e1rmVal = estimate1RM(
        effectiveLoadKg(top.weightKg, ex.isAssisted, bodyWeightKg), top.reps, top.rpe
      );
    }

    let prevE1rmVal = 0;
    if (prev) {
      prevE1rmVal = estimate1RM(
        effectiveLoadKg(prev.weightKg, ex.isAssisted, bodyWeightKg), prev.reps, prev.rpe
      );
    }
    const e1rmDelta = prev ? signed(e1rmVal - prevE1rmVal, 'kg') : '신규';

    let volumeKg = 0;
    ex.sets.forEach(s => {
      if (s.isCompleted && s.reps > 0) {
        volumeKg += effectiveLoadKg(s.weightKg, ex.isAssisted, bodyWeightKg) * s.reps;
      }
    });

    const stalled = isStalled(history, ex.exerciseId, 3, {
      isAssisted: ex.isAssisted,
      bodyWeightKg
    });

    // Mock Exercise for recommend
    const exObj = {
      id: ex.exerciseId,
      name: ex.exerciseName,
      muscleGroup: ex.muscleGroup,
      tier,
      loadType: ex.loadType || (tier === 'primary' ? 'barbell' : 'machine'),
      incrementKg: ex.incrementKg ?? 2.5,
      repRangeLow: ex.repRangeLow ?? 8,
      repRangeHigh: ex.repRangeHigh ?? 12,
      defaultRestSeconds: 150,
      isAssisted: ex.isAssisted,
      createdAt: ''
    };

    const combinedHistory = [session, ...history];
    const nextRec = recommend(exObj, combinedHistory, { bodyWeightKg });
    const nextTarget = nextRec.sets[0] ? `${nextRec.sets[0].weightKg}kg × ${nextRec.sets[0].reps}회` : '-';

    md += `  - id: ${ex.exerciseId}
    name: ${yamlString(ex.exerciseName)}
    tier: ${tier}
    muscle: ${yamlString(ex.muscleGroup)}
    sets: ${ex.sets.filter(s => s.isCompleted).length}
    top_set: ${yamlString(topSetLabel)}
    e1rm: ${e1rmVal}
    e1rm_delta: ${yamlString(e1rmDelta)}
    volume_kg: ${volumeKg}
    delta: ${yamlString(delta)}
    next: ${yamlString(nextTarget)}
    next_reason: ${yamlString(nextRec.reason)}
    stalled: ${stalled}
${ex.substitutedFrom ? `    substituted_from: ${yamlString(ex.substitutedFrom)}
` : ''}`;
  });

  // Week and Deload stats
  md += `week:
  sets_by_muscle:
`;
  weeklyVolume.muscleStats.forEach(ms => {
    md += `    ${ms.muscleGroup}: ${ms.hardSets}\n`;
  });

  md += `  under_target:
${weeklyVolume.underTargetMuscles.map(m => `    - ${yamlString(m)}`).join('\n') || '    []'}
  rep_distribution:
    low_1_5: ${weeklyVolume.repDistribution.low_1_5}
    moderate_6_15: ${weeklyVolume.repDistribution.moderate_6_15}
    high_16_30: ${weeklyVolume.repDistribution.high_16_30}
deload:
  weeks_since_last: 4
  stalled_exercises:
${session.exercises.filter(e => isStalled(history, e.exerciseId, 3, { isAssisted: e.isAssisted, bodyWeightKg })).map(e => `    - ${yamlString(e.exerciseName)}`).join('\n') || '    []'}
---

# 🏋️ ${session.date} 운동 기록 — ${title}

> **운동 일자:** ${session.date} (${startTimeFormatted} ~ ${endTimeFormatted}, 총 ${session.durationMinutes}분)  
> **총 볼륨:** **${comma(stats.completedVolume)} kg** | **완료 세트:** **${stats.completedSets} 세트**  
> **주요 타겟:** ${muscles.join(', ') || '전신'} | **루틴:** ${routine}  

---

## 📊 운동별 상세 기록
`;

  // 2. 운동별 표 생성
  session.exercises.forEach((ex, idx) => {
    const top = topSetOf(ex);
    const prev = prevTops[ex.exerciseId];
    const delta = computeDelta(ex, prev);
    const topLabel = top ? `${top.weightKg}kg × ${top.reps}` : '없음';

    md += `\n### ${idx + 1}. ${ex.exerciseName} (${ex.muscleGroup}) — 최고 ${topLabel}, 직전 대비 ${delta}\n`;
    if (ex.substitutedFrom) {
      md += `- **대체:** 원래 ${ex.substitutedFrom}을(를) 하려다 이 기구로 바꿨다.
`;
    }
    if (ex.notes && ex.notes.trim()) {
      md += `- **메모:** ${ex.notes.trim()}\n`;
    }
    if (ex.recommendationReason) {
      md += `- **추천 근거:** ${ex.recommendationReason}\n`;
    }

    md += `\n| 세트 | 무게(kg) | 횟수(Reps) | 볼륨(kg) | 목표RIR | 실제RIR | RPE | 상태 |\n`;
    md += `|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n`;

    ex.sets.forEach((set) => {
      const vol = (set.weightKg || 0) * (set.reps || 0);
      const targetRirStr = set.targetRir !== undefined ? `${set.targetRir}` : (set.targetRpe !== undefined ? `${10 - set.targetRpe}` : '-');
      const actualRirStr = set.actualRir !== undefined ? `${set.actualRir}` : (set.rpe !== undefined ? `${10 - set.rpe}` : '-');
      const rpeStr = set.rpe !== undefined ? `${set.rpe}` : (set.actualRir !== undefined ? `${10 - set.actualRir}` : '-');
      const statusIcon = set.isCompleted ? '✅' : '⏳';

      md += `| ${set.setNumber} | ${set.weightKg} | ${set.reps} | ${vol} | ${targetRirStr} | ${actualRirStr} | ${rpeStr} | ${statusIcon} |\n`;
    });
  });

  // 3. 하단 메모 및 클린 푸터 (에이전트 지시문 없음)
  md += `\n---

## 📝 세션 메모
- **컨디션:** ${session.condition || '특이사항 없음'}
- **메모:** ${session.generalNotes || '없음'}

---

*IronLog에서 자동 생성된 기록입니다.*
`;

  return md;
}
