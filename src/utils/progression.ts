import { 
  Exercise, 
  ExerciseTier, 
  LoadType, 
  MuscleGroup, 
  WorkoutSession, 
  WorkoutSet,
  SessionExercise 
} from '../types/workout';

// ==========================================
// 1. 기본 상수 및 등급별 설정 (TIER_DEFAULTS)
// ==========================================

export interface TierConfig {
  repLow: number;
  repHigh: number;
  rpeLow: number;
  rpeHigh: number;
  restSeconds: number;
}

export const TIER_DEFAULTS: Record<ExerciseTier, TierConfig> = {
  primary: {
    repLow: 6,
    repHigh: 10,
    rpeLow: 6,
    rpeHigh: 8,
    restSeconds: 210 // 3분 30초
  },
  secondary: {
    repLow: 8,
    repHigh: 12,
    rpeLow: 8,
    rpeHigh: 10,
    restSeconds: 150 // 2분 30초
  },
  isolation: {
    repLow: 10,
    repHigh: 15,
    rpeLow: 9,
    rpeHigh: 10,
    restSeconds: 90 // 1분 30초
  }
};

export const DEFAULT_INCREMENT: Record<LoadType, number> = {
  barbell: 2.5,
  dumbbell_pair: 2.0,
  dumbbell_single: 1.0,
  machine: 5.0,
  cable: 2.5,
  bodyweight: 0,
  bodyweight_loaded: 2.5
};

/**
 * 종목명과 타겟 부위로 등급(tier), 기구(loadType), 증량단위, 횟수범위 추정
 */
export function classifyExercise(name: string, muscleGroup: MuscleGroup): {
  tier: ExerciseTier;
  loadType: LoadType;
  incrementKg: number;
  repRangeLow: number;
  repRangeHigh: number;
  defaultRestSeconds: number;
} {
  const trimmed = name.trim();

  // 1. 등급 (Tier) 분류
  let tier: ExerciseTier = 'secondary';
  if (/스쿼트|벤치|데드리프트|데드|오버헤드|OHP|밀리터리\s*프레스/i.test(trimmed)) {
    tier = 'primary';
  } else if (
    muscleGroup === '이두' || 
    muscleGroup === '삼두' || 
    muscleGroup === '복근' ||
    /컬|레이즈|익스텐션|플라이|푸시다운|크런치|레그익스텐션|레그컬|사레레|페이스풀/i.test(trimmed)
  ) {
    tier = 'isolation';
  }

  // 2. 기구 (LoadType) 분류
  let loadType: LoadType = tier === 'primary' ? 'barbell' : 'machine';
  if (/덤벨|DB/i.test(trimmed)) {
    loadType = 'dumbbell_pair';
  } else if (/바벨|BB/i.test(trimmed)) {
    loadType = 'barbell';
  } else if (/케이블/i.test(trimmed)) {
    loadType = 'cable';
  } else if (/풀업|턱걸이|친업|딥스|푸쉬업|팔굽혀펴기|행잉|플랭크|맨몸/i.test(trimmed)) {
    loadType = 'bodyweight';
  } else if (/머신|랫풀|레그프레스|스미스|시티드/i.test(trimmed)) {
    loadType = 'machine';
  }

  const tierCfg = TIER_DEFAULTS[tier];
  const incrementKg = DEFAULT_INCREMENT[loadType];

  return {
    tier,
    loadType,
    incrementKg,
    repRangeLow: tierCfg.repLow,
    repRangeHigh: tierCfg.repHigh,
    defaultRestSeconds: tierCfg.restSeconds
  };
}

// ==========================================
// 2. 보조 함수 (estimate1RM, roundToIncrement, setRpeTargets)
// ==========================================

/**
 * 체중을 아직 입력하지 않았을 때 쓰는 값.
 * 어시스트 기구 계산에만 쓰이고, 그 종목을 안 하면 아무 데도 영향이 없다.
 */
export const DEFAULT_BODY_WEIGHT_KG = 70;

/**
 * 지금 쓰는 체중.
 *
 * 화면마다 인자로 넘기지 않고 여기 한 곳에 둔다. 체중은 종목이나 세션이 아니라
 * **앱 전체에 하나뿐인 값**이라, 넘기는 자리를 하나라도 빠뜨리면 운동 화면과
 * 기록 화면이 서로 다른 체중으로 계산해 **같은 세션의 볼륨이 화면마다 달라진다.**
 * 스토어가 앱을 켤 때와 설정을 고칠 때 setBodyWeightKg()로 채워 넣는다.
 */
let configuredBodyWeightKg = DEFAULT_BODY_WEIGHT_KG;

export function setBodyWeightKg(kg: number | undefined): void {
  configuredBodyWeightKg = typeof kg === 'number' && kg > 0 ? kg : DEFAULT_BODY_WEIGHT_KG;
}

export function getBodyWeightKg(): number {
  return configuredBodyWeightKg;
}

/**
 * 그 세트에서 **실제로 몸이 감당한 무게**.
 *
 * 보통 기구는 눈금이 그대로 부하다. 그런데 어시스트 풀업은 눈금이 「도와주는 힘」이라
 * **숫자를 올릴수록 쉬워진다.** 그래서 실제 부하는 `체중 − 눈금`이다.
 * 이 환산을 안 하면 앱은 보조를 더 받은 날을 「무게를 더 든 날」로 읽어
 * **퇴보를 발전으로 기록한다.**
 *
 * 보조가 체중을 넘으면 매달려 있기만 해도 되므로 부하는 0으로 본다.
 */
export function effectiveLoadKg(
  machineKg: number,
  isAssisted?: boolean,
  bodyWeightKg: number = getBodyWeightKg()
): number {
  if (!isAssisted) return machineKg;
  return Math.max(0, Math.round((bodyWeightKg - machineKg) * 10) / 10);
}

/**
 * 실제 부하를 다시 **기구 눈금 숫자**로 되돌린다(어시스트 기구 전용).
 * 부하를 올리라는 뜻은 보조를 줄이라는 뜻이다.
 * 눈금은 0(보조 없음 = 진짜 턱걸이) 아래로는 못 내려간다.
 */
export function assistFromLoadKg(
  loadKg: number,
  bodyWeightKg: number,
  increment: number
): number {
  const raw = roundToIncrement(bodyWeightKg - loadKg, increment);
  return Math.max(0, raw);
}

/**
 * Epley 공식 기반 추정 1RM (e1RM) 계산
 * 무게 × (1 + 유효횟수/30). 유효횟수 = reps + RIR, RIR = 10 - rpe.
 * rpe 없으면 RIR 2로 가정. 유효횟수는 12로 상한.
 */
export function estimate1RM(weightKg: number, reps: number, rpe?: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  const rir = rpe !== undefined ? Math.max(0, 10 - rpe) : 2;
  const effectiveReps = Math.min(12, Math.max(1, reps + rir));
  if (effectiveReps <= 1) return weightKg;
  const e1rm = weightKg * (1 + effectiveReps / 30);
  return Math.round(e1rm * 10) / 10;
}

/**
 * 주어진 증량 단위로 반올림
 */
/**
 * 비율로 조정한 무게를 증량 단위에 맞추되, **반올림 때문에 제자리에 머무는 것을 막는다.**
 *
 * 원래 코드는 `roundToIncrement(20 * 1.05, 5)`를 그대로 썼는데 이게 다시 20이 된다.
 * 그런데도 화면에는 "+5%(20→20kg) 교정"이라고 떴다 — **아무 일도 안 일어났는데
 * 일어난 것처럼 보이는 게 제일 나쁘다.** 감량 쪽도 똑같이 20→20이었다.
 * 증량 단위가 큰 기구(5kg·9kg)에서 가벼운 무게를 쓸 때 항상 걸린다.
 * (외부 검토 지적, 코드에서 양방향 모두 확인 — 2026-08-27)
 *
 * 그래서 비율 계산이 제자리면 최소 한 칸은 움직인다. 한 칸도 못 내려갈 만큼
 * 가벼우면 그 자리에 둔다(0kg이나 음수로 내려가면 안 되니까).
 */
export function stepAtLeastOne(
  current: number,
  scaled: number,
  increment: number,
  dir: 'up' | 'down',
  /**
   * 내려갈 수 있는 하한. 보통 기구는 한 칸(increment)이 바닥이지만,
   * 어시스트 기구의 눈금 0은 「보조 없음」이라는 정상적인 값이라 0까지 내려간다.
   */
  floor: number = increment
): number {
  const rounded = roundToIncrement(scaled, increment);

  if (dir === 'up') {
    // 반올림 결과가 지금보다 크지 않으면(제자리이거나 오히려 작으면) 한 칸 올린다.
    // 예: 20kg · 증량단위 9kg → 20×1.05=21 → 반올림하면 **18**. 쉬웠다고 했는데
    // 무게가 깎이는 정반대 결과가 나온다. 그래서 크기 비교로 막는다.
    if (rounded > current) return rounded;
    return roundToIncrement(current + increment, increment);
  }

  // 내려갈 때도 마찬가지 — 반올림이 위로 튀면 안 된다.
  const down = rounded < current ? rounded : roundToIncrement(current - increment, increment);
  // 하한 밑으로는 내려가지 않는다. 한 칸도 못 내려갈 만큼 가벼우면 그 자리에 둔다.
  return down >= floor ? down : current;
}

export function roundToIncrement(kg: number, increment: number): number {
  if (increment <= 0) return Math.round(kg * 10) / 10;
  const rounded = Math.round(kg / increment) * increment;
  return Math.round(rounded * 100) / 100;
}

/**
 * 등급 밴드를 세트 수에 걸쳐 선형 보간하고 0.5 단위로 반올림
 * 예: secondary 3세트 -> [8, 9, 10]
 *     primary 3세트 -> [6, 7, 8]
 *     isolation 3세트 -> [9, 9.5, 10]
 */
export function setRpeTargets(tier: ExerciseTier, nSets: number): number[] {
  if (nSets <= 0) return [];
  const cfg = TIER_DEFAULTS[tier] || TIER_DEFAULTS.secondary;
  if (nSets === 1) return [cfg.rpeHigh];

  const step = (cfg.rpeHigh - cfg.rpeLow) / (nSets - 1);
  return Array.from({ length: nSets }, (_, i) => {
    const val = cfg.rpeLow + step * i;
    return Math.round(val * 2) / 2; // 0.5 단위 반올림
  });
}

// ==========================================
// 3. 지난 수행 읽기 (lastPerformance)
// ==========================================

export interface LastPerformance {
  lastDate: string;
  workingWeight: number;
  repsBySet: number[];
  minReps: number;
  maxReps: number;
  lastRpe?: number;
  lastRir?: number;
  highest1RM: number;
  completedSetsCount: number;
}

/**
 * history(최신순 가정)에서 이 종목이 나오는 가장 최근 세션의 작업 무게와 수행 데이터를 읽는다.
 */
export function lastPerformance(
  history: WorkoutSession[],
  exerciseId: string,
  opts: { isAssisted?: boolean; bodyWeightKg?: number } = {}
): LastPerformance | null {
  const bw = opts.bodyWeightKg ?? getBodyWeightKg();
  for (const session of history) {
    const ex = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex) continue;

    const completedSets = ex.sets.filter(s => s.isCompleted && s.reps > 0);
    if (completedSets.length === 0) continue;

    // 작업 무게 판정: 가장 많이 나온 무게 (동률이면 무거운 쪽)
    const weightCounts = new Map<number, number>();
    completedSets.forEach(s => {
      weightCounts.set(s.weightKg, (weightCounts.get(s.weightKg) || 0) + 1);
    });

    let workingWeight = completedSets[0].weightKg;
    let maxCount = 0;
    weightCounts.forEach((count, w) => {
      if (count > maxCount || (count === maxCount && w > workingWeight)) {
        maxCount = count;
        workingWeight = w;
      }
    });

    const setsAtWorkingWeight = completedSets.filter(s => s.weightKg === workingWeight);
    const repsBySet = setsAtWorkingWeight.map(s => s.reps);
    const minReps = Math.min(...repsBySet);
    const maxReps = Math.max(...repsBySet);

    const lastSet = setsAtWorkingWeight[setsAtWorkingWeight.length - 1];
    const lastRpe = lastSet.rpe ?? (lastSet.actualRir !== undefined ? 10 - lastSet.actualRir : undefined);
    const lastRir = lastSet.actualRir ?? (lastSet.rpe !== undefined ? 10 - lastSet.rpe : undefined);

    let highest1RM = 0;
    completedSets.forEach(s => {
      // 지금 화면에서는 RIR을 누르면 스토어가 rpe도 같이 채워 주지만,
      // 백업으로 들여온 옛 기록에는 rpe가 없을 수 있다. 그때 한계 세트가
      // 실제보다 낮게 평가되지 않도록 RIR에서 되돌린다.
      const sRpe = s.rpe ?? (s.actualRir !== undefined ? 10 - s.actualRir : undefined);
      // 어시스트 기구는 눈금이 아니라 **실제 부하**로 재야 한다.
      const load = effectiveLoadKg(s.weightKg, opts.isAssisted ?? ex.isAssisted, bw);
      const e1rm = estimate1RM(load, s.reps, sRpe);
      if (e1rm > highest1RM) highest1RM = e1rm;
    });

    return {
      lastDate: session.date || session.startTime.split('T')[0],
      workingWeight,
      repsBySet,
      minReps,
      maxReps,
      lastRpe,
      lastRir,
      highest1RM,
      completedSetsCount: setsAtWorkingWeight.length
    };
  }

  return null;
}

// ==========================================
// 4. 정체 판정 (isStalled)
// ==========================================

/**
 * 최근 window개 세션의 최고 추정 1RM이 그 이전 최고치를 못 넘으면(0.5% 여유) 참.
 * 데이터가 window + 1 세션보다 적으면 거짓.
 */
export function isStalled(
  history: WorkoutSession[],
  exerciseId: string,
  windowSize = 3,
  opts: { isAssisted?: boolean; bodyWeightKg?: number } = {}
): boolean {
  const bw = opts.bodyWeightKg ?? getBodyWeightKg();
  const matchingSessions: WorkoutSession[] = [];
  for (const s of history) {
    const ex = s.exercises.find(e => e.exerciseId === exerciseId);
    if (ex && ex.sets.some(st => st.isCompleted && st.reps > 0)) {
      matchingSessions.push(s);
    }
  }

  if (matchingSessions.length < windowSize + 1) {
    return false;
  }

  // 어시스트 기구는 눈금이 아니라 **실제 부하**(체중 − 보조)로 재야 한다.
  // 안 그러면 보조를 더 받은 날이 「더 무겁게 든 날」로 잡혀 정체가 발전으로 보인다.
  const bestE1rm = (from: number, to: number) => {
    let best = 0;
    for (let i = from; i < to; i++) {
      const ex = matchingSessions[i].exercises.find(e => e.exerciseId === exerciseId);
      const assisted = opts.isAssisted ?? ex?.isAssisted;
      ex?.sets.filter(st => st.isCompleted).forEach(st => {
        const e1rm = estimate1RM(effectiveLoadKg(st.weightKg, assisted, bw), st.reps, st.rpe);
        if (e1rm > best) best = e1rm;
      });
    }
    return best;
  };

  const recentMax = bestE1rm(0, windowSize);
  const previousMax = bestE1rm(windowSize, matchingSessions.length);

  if (previousMax <= 0) {
    // 맨몸 종목(무게 0)은 e1RM이 항상 0이라 여기서 언제나 false로 빠져나갔다.
    // 즉 **턱걸이·딥스 같은 종목은 아무리 제자리를 걸어도 정체로 잡히지 않았다.**
    // 무게가 없으면 발전의 척도는 횟수이므로 최고 횟수로 같은 판정을 한다.
    // (외부 검토 지적, 코드에서 확인 — 2026-08-27)
    const bestReps = (from: number, to: number) => {
      let best = 0;
      for (let i = from; i < to; i++) {
        const ex = matchingSessions[i].exercises.find(e => e.exerciseId === exerciseId);
        ex?.sets.filter(st => st.isCompleted).forEach(st => {
          if (st.reps > best) best = st.reps;
        });
      }
      return best;
    };
    const prevReps = bestReps(windowSize, matchingSessions.length);
    if (prevReps <= 0) return false;
    return bestReps(0, windowSize) <= prevReps;
  }
  // 0.5% 여유: recentMax가 previousMax * 1.005를 넘지 못하면 정체
  return recentMax <= previousMax * 1.005;
}

// ==========================================
// 5. 추천 로직 (recommend)
// ==========================================

export type ProgressionAction = 
  | 'first_time' 
  | 'deload' 
  | 'back_off' 
  | 'hold' 
  | 'increase_load' 
  | 'increase_reps' 
  | 'add_external_load';

export interface SetTarget {
  setNumber: number;
  weightKg: number;
  reps: number;
  targetRpe: number;
  targetRir: number;
}

export interface Recommendation {
  action: ProgressionAction;
  sets: SetTarget[];
  restSeconds: number;
  reason: string;
  stalled: boolean;
  basis: {
    lastDate?: string;
    workingWeight?: number;
    repsBySet?: number[];
    lastRpe?: number;
    highest1RM?: number;
  };
}

/**
 * PROGRESSION.md §3.2 표의 7단계 우선순위에 따른 무게·횟수·RPE 추천
 */
export function recommend(
  exercise: Exercise,
  history: WorkoutSession[],
  opts: { setCount?: number; deloadWeek?: boolean; bodyWeightKg?: number } = {}
): Recommendation {
  const tier = exercise.tier || 'secondary';
  const tierCfg = TIER_DEFAULTS[tier];
  const repLow = exercise.repRangeLow ?? tierCfg.repLow;
  const repHigh = exercise.repRangeHigh ?? tierCfg.repHigh;
  const increment = exercise.incrementKg ?? DEFAULT_INCREMENT[exercise.loadType] ?? 2.5;
  const restSeconds = exercise.defaultRestSeconds || tierCfg.restSeconds;

  // 어시스트 기구는 눈금과 실제 부하의 방향이 반대다. 그래서 판단은 전부 **부하**로 하고,
  // 화면에 내보낼 때만 눈금 숫자로 되돌린다.
  const assisted = exercise.isAssisted === true;
  const bw = opts.bodyWeightKg ?? getBodyWeightKg();
  /** 눈금 숫자 → 실제 부하 */
  const loadOf = (machine: number) => effectiveLoadKg(machine, assisted, bw);
  /** 실제 부하 → 눈금 숫자 */
  const dialFor = (load: number) =>
    assisted ? assistFromLoadKg(load, bw, increment) : roundToIncrement(load, increment);
  /** 무게 변화를 사람 말로. 어시스트는 「보조」로 말해야 뜻이 통한다. */
  const moveText = (from: number, to: number) => {
    if (!assisted) return `${from}→${to}kg`;
    const diff = Math.round((from - to) * 100) / 100;
    if (diff > 0) return `보조 -${diff}kg(${from}→${to}kg, 그만큼 더 힘들어집니다)`;
    if (diff < 0) return `보조 +${-diff}kg(${from}→${to}kg, 그만큼 더 쉬워집니다)`;
    return `보조 ${to}kg 유지`;
  };

  const perf = lastPerformance(history, exercise.id, { isAssisted: assisted, bodyWeightKg: bw });
  const stalled = isStalled(history, exercise.id, 3, { isAssisted: assisted, bodyWeightKg: bw });

  // [1] 기록이 없다 (first_time)
  if (!perf) {
    const setCount = opts.setCount || 3;
    const rpeTargets = setRpeTargets(tier, setCount);
    let starterWeight = 20;
    if (exercise.loadType === 'barbell') starterWeight = tier === 'primary' ? 40 : 20;
    else if (exercise.loadType === 'dumbbell_pair') starterWeight = 10;
    else if (exercise.loadType === 'dumbbell_single') starterWeight = 8;
    else if (exercise.loadType === 'bodyweight') starterWeight = 0;
    // 어시스트 기구는 눈금이 「도와주는 힘」이라 20kg에서 시작하면 거의 맨몸 턱걸이가 된다.
    // 체중의 절반쯤 보조를 받는 자리에서 시작한다.
    if (assisted) starterWeight = roundToIncrement(bw * 0.5, increment);

    const sets: SetTarget[] = Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      weightKg: starterWeight,
      reps: repLow,
      targetRpe: rpeTargets[i],
      targetRir: 10 - rpeTargets[i]
    }));

    return {
      action: 'first_time',
      sets,
      restSeconds,
      reason: assisted
        ? `보조 ${starterWeight}kg(체중의 절반쯤)에서 하단 횟수(${repLow}회)부터 시작합니다. 이 기구는 숫자가 클수록 쉬워집니다.`
        : `폼이 확실한 가벼운 무게로 하단 횟수(${repLow}회)부터 시작합니다.`,
      stalled: false,
      basis: {}
    };
  }

  const { lastDate, workingWeight, repsBySet, lastRpe, highest1RM, completedSetsCount } = perf;
  const totalSets = opts.setCount || completedSetsCount || 3;
  const rpeTargets = setRpeTargets(tier, totalSets);
  const targetRpeForLast = rpeTargets[rpeTargets.length - 1];

  const basis = {
    lastDate,
    workingWeight,
    repsBySet,
    lastRpe,
    highest1RM
  };

  // [2] 디로드 주간 (deload)
  if (opts.deloadWeek) {
    const deloadWeight = dialFor(Math.max(increment, loadOf(workingWeight) * 0.9));
    const deloadSetsCount = Math.max(2, totalSets - 1);
    const deloadRpeTargets = setRpeTargets(tier, deloadSetsCount).map(r => Math.max(4, r - 2));

    const sets: SetTarget[] = Array.from({ length: deloadSetsCount }, (_, i) => ({
      setNumber: i + 1,
      weightKg: deloadWeight,
      reps: repLow,
      targetRpe: deloadRpeTargets[i],
      targetRir: 10 - deloadRpeTargets[i]
    }));

    return {
      action: 'deload',
      sets,
      restSeconds,
      reason: assisted
        ? `디로드 주간 — 부하 -10%(${moveText(workingWeight, deloadWeight)}), 세트수 -1, RPE -2로 피로를 회복합니다.`
        : `디로드 주간 — 무게 -10%(${workingWeight}→${deloadWeight}kg), 세트수 -1, RPE -2로 피로를 회복합니다.`,
      stalled,
      basis
    };
  }

  // [3] 과도한 피로 또는 실패 (back_off)
  // 마지막 RPE가 목표보다 1.5 이상 높았거나 (RIR이 1.5 이상 낮았음) OR 하단보다 3회 이상 부족
  const isOverFatigued = (lastRpe !== undefined && (lastRpe - targetRpeForLast) >= 1.5) ||
                         repsBySet.some(r => r < repLow - 3);

  if (isOverFatigued) {
    const reducedWeight = dialFor(Math.max(increment, loadOf(workingWeight) * 0.9));
    const sets: SetTarget[] = Array.from({ length: totalSets }, (_, i) => ({
      setNumber: i + 1,
      weightKg: reducedWeight,
      reps: repLow,
      targetRpe: rpeTargets[i],
      targetRir: 10 - rpeTargets[i]
    }));

    return {
      action: 'back_off',
      sets,
      restSeconds,
      reason: assisted
        ? `지난 세션 과도한 피로 감지 → 부하 -10%(${moveText(workingWeight, reducedWeight)}) 및 하단(${repLow}회)으로 재정비합니다.`
        : `지난 세션 과도한 피로 감지 → 무게 -10% 감량(${workingWeight}→${reducedWeight}kg) 및 하단(${repLow}회)으로 재정비합니다.`,
      stalled,
      basis
    };
  }

  // [4] 전 세트가 하단 횟수를 못 채움 (hold)
  const hasSubMinReps = repsBySet.some(r => r < repLow);
  if (hasSubMinReps) {
    const sets: SetTarget[] = Array.from({ length: totalSets }, (_, i) => ({
      setNumber: i + 1,
      weightKg: workingWeight,
      reps: repLow,
      targetRpe: rpeTargets[i],
      targetRir: 10 - rpeTargets[i]
    }));

    return {
      action: 'hold',
      sets,
      restSeconds,
      reason: assisted
        ? `전 세트 하단 횟수(${repLow}회) 채우기가 우선입니다 → 보조 ${workingWeight}kg 유지.`
        : `전 세트 하단 횟수(${repLow}회) 채우기가 우선입니다 → ${workingWeight}kg 유지.`,
      stalled,
      basis
    };
  }

  // [5] 증량 폭이 지금 부하의 15%를 넘는가 — **알려만 주고 막지는 않는다**
  //
  // 예전에는 이 조건에 걸리면 증량 추천을 아예 내지 않고 「횟수부터 더 쌓아라」로
  // 빠져나갔다. 수환이 그걸 그만두라고 했다(2026-08-27):
  //   "증량 폭이 부하의 15%를 넘음 같은건 경고문으로 보여주되, 강제하진 말아.
  //    현실에서 운동할 땐 무게의 범위가 생각보다 많이 위 아래로 변동하니까."
  // 그래서 목표 횟수 상한을 몰래 늘리지도 않고(그것도 결국 강제다), 추천은 평소대로
  // 내되 사유 뒤에 한 줄 경고만 붙인다. 올릴지 말지는 그날 몸이 정한다.
  //
  // 비율은 **실제 부하** 기준이어야 한다. 어시스트에서 눈금 40kg은 부하 22kg이라
  // 눈금으로 재면 증량 폭이 실제보다 작게 보인다.
  const currentLoad = loadOf(workingWeight);
  const jumpRatio = currentLoad > 0 ? (increment / currentLoad) : 0;
  const isLargeJump = jumpRatio > 0.15;
  const effectiveRepHigh = repHigh;

  /** 큰 점프일 때 사유 뒤에 붙일 한 줄. 아니면 빈 문자열. */
  const jumpNote = isLargeJump
    ? ` (참고: 한 칸 ${increment}kg이 지금 ${assisted ? '부하' : '무게'}의 ${Math.round(jumpRatio * 100)}%라 한 번에 꽤 세집니다 — 버거우면 그대로 두고 횟수를 더 쌓아도 됩니다.)`
    : '';

  // [6] 증량 조건 충족 (모든 세트 상단 도달 OR 마지막 RPE가 목표보다 2 이상 낮았음/쉬웠음)
  const allReachedMax = repsBySet.length > 0 && repsBySet.every(r => r >= effectiveRepHigh);
  const wasTooEasy = lastRpe !== undefined && (targetRpeForLast - lastRpe) >= 2;

  if (allReachedMax || wasTooEasy) {
    // 맨몸 운동의 경우 외부 중량 안내로 분기
    if (exercise.loadType === 'bodyweight') {
      const sets: SetTarget[] = Array.from({ length: totalSets }, (_, i) => ({
        setNumber: i + 1,
        weightKg: workingWeight,
        reps: effectiveRepHigh,
        targetRpe: rpeTargets[i],
        targetRir: 10 - rpeTargets[i]
      }));

      return {
        action: 'add_external_load',
        sets,
        restSeconds,
        reason: `맨몸 횟수 상한(${effectiveRepHigh}회) 완수! 중량 조끼나 벨트 등 외부 중량을 얹을 때입니다.`,
        stalled,
        basis
      };
    }

    const nextWeight = dialFor(currentLoad + increment);
    const sets: SetTarget[] = Array.from({ length: totalSets }, (_, i) => ({
      setNumber: i + 1,
      weightKg: nextWeight,
      reps: repLow,
      targetRpe: rpeTargets[i],
      targetRir: 10 - rpeTargets[i]
    }));

    // 어시스트 기구에서 눈금이 이미 0이면 보조를 더 줄일 수 없다 — 진짜 턱걸이다.
    // 여기서 "증량"이라고 말하면 거짓말이 되므로 다음 단계를 따로 안내한다.
    if (assisted && nextWeight === workingWeight) {
      const sets: SetTarget[] = Array.from({ length: totalSets }, (_, i) => ({
        setNumber: i + 1,
        weightKg: workingWeight,
        reps: effectiveRepHigh,
        targetRpe: rpeTargets[i],
        targetRir: 10 - rpeTargets[i]
      }));
      return {
        action: 'add_external_load',
        sets,
        restSeconds,
        reason: `보조 없이(0kg) 상한까지 해냈습니다 — 이제 이 기구로 더 어렵게 만들 수 없습니다. 맨몸 턱걸이로 넘어가거나 중량을 얹을 때입니다.`,
        stalled,
        basis
      };
    }

    // 일반 기구는 「증량」이 그대로 통하지만, 어시스트 기구에서 "증량"이라고 하면
    // 보조를 늘리라는 말로 읽힌다. 그래서 그쪽만 「보조를 줄인다」로 말한다.
    const gainText = assisted
      ? `보조 -${increment}kg(${moveText(workingWeight, nextWeight)})`
      : `+${increment}kg 증량(${workingWeight}→${nextWeight}kg)`;
    const reason = (allReachedMax
      ? `지난주 전 세트 ${effectiveRepHigh}회 완료 → ${gainText} 및 ${repLow}회 리셋`
      : `지난주 마지막 세트 여유(RPE ${lastRpe}) 감지 → 조기 ${gainText}`) + jumpNote;

    return {
      action: 'increase_load',
      sets,
      restSeconds,
      reason,
      stalled,
      basis
    };
  }

  // [7] 그 외: 이중 진행 (세트별 +1회, 상단에서 멈춤)
  const nextReps = repsBySet.map(r => Math.min(effectiveRepHigh, r + 1));
  while (nextReps.length < totalSets) nextReps.push(repLow);

  const sets: SetTarget[] = Array.from({ length: totalSets }, (_, i) => ({
    setNumber: i + 1,
    weightKg: workingWeight,
    reps: nextReps[i] || repLow,
    targetRpe: rpeTargets[i],
    targetRir: 10 - rpeTargets[i]
  }));

  return {
    action: 'increase_reps',
    sets,
    restSeconds,
    reason: (assisted
      ? `이중 진행: 보조 ${workingWeight}kg 유지, 세트당 +1회 추가 도전 (목표: ${effectiveRepHigh}회)`
      : `이중 진행: ${workingWeight}kg 유지, 세트당 +1회 추가 도전 (목표: ${effectiveRepHigh}회)`) + jumpNote,
    stalled,
    basis
  };
}

// ==========================================
// 6. 세션 안 교정 (adjustRemaining)
// ==========================================

/**
 * 세트 완료 후 목표 RPE와의 차이에 따라 남은 세트의 무게를 실시간 교정
 * ±1 이내: 그대로
 * 2 이상 힘들었다 (rpe - target >= 2): -10%
 * 2 이상 쉬웠다 (target - rpe >= 2): +5% (또는 +1 증량단위)
 */
export function adjustRemaining(
  exercise: Exercise,
  completedSet: WorkoutSet,
  targetRpe: number,
  remainingSets: WorkoutSet[],
  bodyWeightKg: number = getBodyWeightKg()
): WorkoutSet[] {
  const actualRpe = completedSet.rpe ?? (completedSet.actualRir !== undefined ? 10 - completedSet.actualRir : undefined);
  if (actualRpe === undefined || remainingSets.length === 0) {
    return remainingSets;
  }

  const diff = actualRpe - targetRpe; // 양수: 더 힘듦, 음수: 더 쉬움
  const increment = exercise.incrementKg ?? DEFAULT_INCREMENT[exercise.loadType] ?? 2.5;

  // ⚠️ 어시스트 기구는 눈금이 「도와주는 힘」이라 **방향이 반대다.**
  // 힘들었다고 하면 여기서 눈금을 깎았는데, 그러면 보조가 줄어 오히려 더 힘들어졌다.
  // 그래서 부하를 몇 퍼센트 움직일지 정한 뒤, 그 부하에 해당하는 눈금으로 되돌린다.
  const assisted = exercise.isAssisted === true;
  const currentWeight = completedSet.weightKg;

  /**
   * 부하를 ratio배로 만들었을 때의 눈금 숫자와, 눈금이 움직여야 할 방향.
   * 보통 기구: 눈금 × ratio, 방향은 ratio 그대로.
   * 어시스트: 부하 = 체중 − 눈금이므로 새 눈금 = 체중 − ratio×(체중 − 눈금). 방향이 뒤집힌다.
   */
  const scaleLoad = (ratio: number) => {
    if (!assisted) {
      return { target: currentWeight * ratio, dir: (ratio > 1 ? 'up' : 'down') as 'up' | 'down', floor: increment };
    }
    const target = bodyWeightKg - ratio * (bodyWeightKg - currentWeight);
    // 부하를 올리라는 것은 보조를 줄이라는 것 — 눈금은 내려간다. 눈금 0(보조 없음)까지 허용한다.
    return { target, dir: (ratio > 1 ? 'down' : 'up') as 'up' | 'down', floor: 0 };
  };

  const phrase = (from: number, to: number) => {
    if (!assisted) return `${from}→${to}kg`;
    const d = Math.round((from - to) * 100) / 100;
    if (d > 0) return `보조 -${d}kg(${from}→${to}kg)`;
    if (d < 0) return `보조 +${-d}kg(${from}→${to}kg)`;
    return `보조 ${to}kg 그대로`;
  };

  if (diff >= 2) {
    // 2 이상 힘들었음 -> 부하 -10%
    const { target, dir, floor } = scaleLoad(0.9);
    const adjusted = stepAtLeastOne(currentWeight, target, increment, dir, floor);
    return remainingSets.map(s => ({
      ...s,
      weightKg: adjusted,
      recommendationReason: assisted
        ? `피로 누적 감지(RPE ${actualRpe} vs 목표 ${targetRpe}) → 남은 세트 부하 -10%(${phrase(currentWeight, adjusted)}) 교정`
        : `피로 누적 감지(RPE ${actualRpe} vs 목표 ${targetRpe}) → 남은 세트 -10%(${currentWeight}→${adjusted}kg) 교정`
    }));
  }

  if (diff <= -2) {
    // 2 이상 쉬웠음 -> 부하 +5% (또는 한 칸)
    const { target, dir, floor } = scaleLoad(1.05);
    const adjusted = stepAtLeastOne(currentWeight, target, increment, dir, floor);
    return remainingSets.map(s => ({
      ...s,
      weightKg: adjusted,
      recommendationReason: assisted
        ? `높은 여유도 감지(RPE ${actualRpe} vs 목표 ${targetRpe}) → 남은 세트 부하 +5%(${phrase(currentWeight, adjusted)}) 교정`
        : `높은 여유도 감지(RPE ${actualRpe} vs 목표 ${targetRpe}) → 남은 세트 +5%(${currentWeight}→${adjusted}kg) 교정`
    }));
  }

  return remainingSets;
}

// ==========================================
// 7. 하드 세트 및 주간 볼륨 집계
// ==========================================

/**
 * 하드 세트 판정:
 * 주 운동(primary)은 RPE 6 이상 (RIR 4 이하), 보조(secondary)·고립(isolation)은 RPE 7 이상 (RIR 3 이하).
 */
export function isHardSet(set: WorkoutSet, tier: ExerciseTier = 'secondary'): boolean {
  const rpe = set.rpe ?? (set.actualRir !== undefined ? 10 - set.actualRir : undefined);
  if (rpe !== undefined) {
    return tier === 'primary' ? rpe >= 6 : rpe >= 7;
  }
  // rpe가 없는 경우 기본 true
  return true;
}

export interface WeeklyVolumeSummary {
  startDate: string;
  endDate: string;
  totalHardSets: number;
  unconfirmedSets: number; // RPE가 없어 확인 불가인 세트
  muscleStats: {
    muscleGroup: MuscleGroup;
    hardSets: number;
    unconfirmedSets: number;
    targetMin: number;
    targetMax: number;
    status: 'low' | 'optimal' | 'high';
  }[];
  underTargetMuscles: MuscleGroup[];
  repDistribution: {
    low_1_5: number;
    moderate_6_15: number;
    high_16_30: number;
  };
}

export const MUSCLE_VOLUME_TARGETS: Record<MuscleGroup, { min: number; max: number }> = {
  '등': { min: 10, max: 20 },
  '어깨': { min: 10, max: 20 },
  '하체': { min: 10, max: 20 },
  '가슴': { min: 10, max: 18 },
  '이두': { min: 8, max: 14 },
  '삼두': { min: 8, max: 14 },
  '복근': { min: 6, max: 12 },
  // 니파드는 전완을 0세트에서 시작하라고 한다(그립 쓰는 모든 종목에서 간접 자극).
  // 수환은 리스트 컬 계열을 직접 하므로 낮은 대역을 준다 【판단】
  '전완': { min: 4, max: 10 },
  '전신': { min: 10, max: 20 },
  '유산소': { min: 3, max: 10 },
  '기타': { min: 6, max: 12 }
};

/**
 * 주간 볼륨을 실제로 관리하는 부위. 화면에 항상 표시하고 '하한 미달' 집계에도 쓴다.
 * 표시 목록과 집계 목록이 갈라지면 "7개 부위 미달"이라면서 4줄만 보이는 일이 생긴다.
 */
export const TRACKED_MUSCLES: MuscleGroup[] = ['등', '어깨', '하체', '가슴', '이두', '삼두', '복근', '전완'];

/**
 * 등급 이름. 성격을 말하지 등수를 말하지 않는다.
 *
 * 니파드의 secondary는 "근력보다 근비대를 노리는 복합 운동"이라는 뜻이고, 오히려
 * primary보다 실패에 더 가까이(RIR 2→1→0) 밀어야 하는 등급이다. 그런데 이걸
 * "보조 운동"이라 부르면 곁다리처럼 읽힌다 — 머신 위주로 훈련하는 사람에게는
 * 자기 훈련 전부가 곁다리라는 말이 된다. 그래서 이름을 바꿨다.
 */
export const TIER_LABEL: Record<ExerciseTier, string> = {
  primary: '근력형 복합',
  secondary: '근비대형 복합',
  isolation: '고립'
};

/** 등급이 실제로 무엇을 바꾸는지 한 줄로. 종목 편집·선택 화면에서 쓴다. */
export const TIER_DESC: Record<ExerciseTier, string> = {
  primary: '무겁게 들고 근력을 민다 · 실패에서 멀리(RIR 4→3→2) · 휴식 3분 30초',
  secondary: '근비대의 주력 · 실패 가까이(RIR 2→1→0) · 휴식 2분 30초',
  isolation: '한 관절만 쓴다 · 마지막 세트는 실패까지(RIR 1→1→0) · 휴식 1분 30초'
};

/** Date를 로컬 시간대 기준 YYYY-MM-DD 문자열로 만든다 (toISOString의 UTC 이동을 피하려는 것). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 이번 주(월요일 시작)의 주간 하드 세트 볼륨 및 횟수 대역 분포 계산
 */
export function calculateWeeklyVolume(
  history: WorkoutSession[],
  currentSession?: WorkoutSession | null
): WeeklyVolumeSummary {
  const now = new Date();
  const day = now.getDay(); // 0(일) ~ 6(토)
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const muscleHardSets: Record<MuscleGroup, number> = {
    '가슴': 0, '등': 0, '하체': 0, '어깨': 0, '삼두': 0,
    '이두': 0, '복근': 0, '전완': 0, '유산소': 0, '전신': 0, '기타': 0
  };
  const muscleUnconfirmed: Record<MuscleGroup, number> = {
    '가슴': 0, '등': 0, '하체': 0, '어깨': 0, '삼두': 0,
    '이두': 0, '복근': 0, '전완': 0, '유산소': 0, '전신': 0, '기타': 0
  };

  let totalHardSets = 0;
  let totalUnconfirmed = 0;
  let lowReps = 0;
  let modReps = 0;
  let highReps = 0;

  // 주 경계는 **날짜 문자열끼리** 비교한다.
  // "2026-08-24"를 new Date()로 파싱하면 UTC 자정으로 읽혀서 현지 자정과 어긋난다.
  // 지금은 한국(UTC+9)이라 우연히 맞지만, UTC보다 서쪽에서 열면 월요일 운동이 통째로 빠진다.
  // 게다가 **상한 검사가 아예 없어서**(sunday는 표시용으로만 쓰였다)
  // 이번 주보다 뒤 날짜의 기록이 있으면 그것까지 합산됐다.
  const mondayStr = toLocalDateString(monday);
  const sundayStr = toLocalDateString(sunday);

  const processSession = (session: WorkoutSession) => {
    const sDateStr = session.date || toLocalDateString(new Date(session.startTime));
    if (sDateStr >= mondayStr && sDateStr <= sundayStr) {
      session.exercises.forEach(ex => {
        const tier = ex.tier || 'secondary';
        ex.sets.forEach(set => {
          // reps가 비어 있을 수 있다(입력 중). `set.reps <= 0`은 undefined에서
          // false가 되어 통과해 버리므로 양수인지 직접 확인한다.
          if (!set.isCompleted || !(set.reps > 0)) return;

          // 횟수 대역 집계
          if (set.reps <= 5) lowReps += 1;
          else if (set.reps <= 15) modReps += 1;
          else highReps += 1;

          const hasRpe = set.rpe !== undefined || set.actualRir !== undefined;
          if (!hasRpe) {
            muscleUnconfirmed[ex.muscleGroup] = (muscleUnconfirmed[ex.muscleGroup] || 0) + 1;
            totalUnconfirmed += 1;
          }

          if (isHardSet(set, tier)) {
            muscleHardSets[ex.muscleGroup] = (muscleHardSets[ex.muscleGroup] || 0) + 1;
            totalHardSets += 1;
          }
        });
      });
    }
  };

  history.forEach(processSession);
  if (currentSession) processSession(currentSession);

  const underTargetMuscles: MuscleGroup[] = [];
  const muscleStats = (Object.keys(MUSCLE_VOLUME_TARGETS) as MuscleGroup[]).map(muscle => {
    const count = muscleHardSets[muscle] || 0;
    const target = MUSCLE_VOLUME_TARGETS[muscle];
    let status: 'low' | 'optimal' | 'high' = 'optimal';
    if (count < target.min) {
      status = 'low';
      if (TRACKED_MUSCLES.includes(muscle)) {
        underTargetMuscles.push(muscle);
      }
    } else if (count > target.max) {
      status = 'high';
    }

    return {
      muscleGroup: muscle,
      hardSets: count,
      unconfirmedSets: muscleUnconfirmed[muscle] || 0,
      targetMin: target.min,
      targetMax: target.max,
      status
    };
  });

  return {
    // toISOString()은 UTC로 변환하므로 한국 시간(UTC+9) 자정이 전날로 밀린다.
    // 주 범위는 사용자가 사는 지역 시간 기준이어야 하므로 로컬 날짜로 만든다.
    startDate: toLocalDateString(monday),
    endDate: toLocalDateString(sunday),
    totalHardSets,
    unconfirmedSets: totalUnconfirmed,
    muscleStats,
    underTargetMuscles,
    repDistribution: {
      low_1_5: lowReps,
      moderate_6_15: modReps,
      high_16_30: highReps
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 종목 대체
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 기구 이름 앞에 붙은 제조사 대괄호를 뗀 나머지.
 * `[프라임] 펙 덱 플라이` → `펙 덱 플라이`
 */
export function bareMovementName(name: string): string {
  return name.replace(/^\[[^\]]*\]\s*/, '').trim();
}

/**
 * `대체 후보`를 좋은 순서로 돌려준다.
 *
 * 헬스장에서 기구를 바꾸는 이유는 대개 둘이다 — 남이 쓰고 있거나, 그날 그게 끌리거나.
 * 어느 쪽이든 **같은 부위를 같은 방식으로 때리는 것**으로 바꿔야 그 주 볼륨 계산과
 * 진행 판정이 유지된다. 그래서 다음 순서로 점수를 준다.
 *
 * 1. 동작 이름이 같다 (제조사만 다른 같은 기구) — 가장 확실한 대체다.
 * 2. 같은 부위 + 같은 등급 — 볼륨도 강도 목표도 그대로 유지된다.
 * 3. 같은 부위 — 등급이 다르면 세트 수와 휴식이 달라지지만 부위는 지켜진다.
 *
 * 유산소는 무게 종목과 성격이 아예 달라 서로 넘나들지 않게 막는다.
 */
export function substitutionCandidates(
  current: { exerciseId: string; exerciseName: string; muscleGroup: MuscleGroup; tier?: ExerciseTier },
  all: Exercise[]
): { exercise: Exercise; rank: 'same-movement' | 'same-tier' | 'same-muscle'; note: string }[] {
  const bare = bareMovementName(current.exerciseName);
  const currentIsCardio = current.muscleGroup === '유산소';

  const scored = all
    .filter(e => e.id !== current.exerciseId)
    .filter(e => (e.muscleGroup === '유산소') === currentIsCardio)
    .filter(e => e.muscleGroup === current.muscleGroup)
    .map(e => {
      if (bareMovementName(e.name) === bare) {
        return { exercise: e, rank: 'same-movement' as const, note: '같은 동작 · 기구만 다름', score: 0 };
      }
      if (e.tier === current.tier) {
        return { exercise: e, rank: 'same-tier' as const, note: '같은 부위 · 같은 등급', score: 1 };
      }
      return { exercise: e, rank: 'same-muscle' as const, note: '같은 부위', score: 2 };
    });

  scored.sort((a, b) => a.score - b.score || a.exercise.name.localeCompare(b.exercise.name, 'ko'));
  return scored.map(({ exercise, rank, note }) => ({ exercise, rank, note }));
}
