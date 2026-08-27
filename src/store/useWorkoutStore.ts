import { create } from 'zustand';
import { 
  Exercise, 
  Routine, 
  WorkoutSession, 
  SessionExercise, 
  WorkoutSet, 
  AppSettings, 
  AppTheme,
  MuscleGroup,
  ExerciseTier,
  LoadType
} from '../types/workout';
import { soundManager } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';
import { calculateSessionStats, previousTops } from '../utils/markdownGenerator';
import { 
  classifyExercise, 
  recommend, 
  adjustRemaining,
  isHardSet,
  isCardioLike,
  TIER_DEFAULTS,
  DEFAULT_INCREMENT,
  setBodyWeightKg
} from '../utils/progression';
import { syncWorkoutToGoogleDrive } from '../services/driveSync';
import { buildGymExercises, RETIRED_EQUIPMENT_IDS, EQUIPMENT_REV, EQUIPMENT_INCREMENTS, ASSISTED_EQUIPMENT_IDS } from '../data/gymEquipment';
import { buildGymRoutines } from '../data/gymRoutines';
import { localDateKey } from '../utils/date';

const STORAGE_KEY = 'ironlog_state_v1';

/**
 * 수환의 체중(2026-08-27 본인 확인). 어시스트 기구에서 **실제 부하 = 체중 − 보조 무게**를
 * 구하는 데만 쓴다. 설정 화면에서 언제든 고칠 수 있다.
 */
const DEFAULT_BODY_WEIGHT = 62;

/** 기본 테마. */
const DEFAULT_THEME: AppTheme = 'nike';

const DEFAULT_STARTER_EXERCISES: Exercise[] = [
  {
    id: 'ex_bench',
    name: '바벨 벤치프레스',
    muscleGroup: '가슴',
    tier: 'primary',
    loadType: 'barbell',
    incrementKg: 2.5,
    repRangeLow: 6,
    repRangeHigh: 10,
    defaultRestSeconds: 210,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ex_squat',
    name: '바벨 스쿼트',
    muscleGroup: '하체',
    tier: 'primary',
    loadType: 'barbell',
    incrementKg: 2.5,
    repRangeLow: 6,
    repRangeHigh: 10,
    defaultRestSeconds: 210,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ex_deadlift',
    name: '컨벤셔널 데드리프트',
    muscleGroup: '등',
    tier: 'primary',
    loadType: 'barbell',
    incrementKg: 2.5,
    repRangeLow: 6,
    repRangeHigh: 10,
    defaultRestSeconds: 210,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ex_ohp',
    name: '오버헤드 프레스',
    muscleGroup: '어깨',
    tier: 'primary',
    loadType: 'barbell',
    incrementKg: 2.5,
    repRangeLow: 6,
    repRangeHigh: 10,
    defaultRestSeconds: 210,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ex_latpull',
    name: '랫풀다운',
    muscleGroup: '등',
    tier: 'secondary',
    loadType: 'machine',
    incrementKg: 5.0,
    repRangeLow: 8,
    repRangeHigh: 12,
    defaultRestSeconds: 150,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ex_incline_db',
    name: '인클라인 덤벨 프레스',
    muscleGroup: '가슴',
    tier: 'secondary',
    loadType: 'dumbbell_pair',
    incrementKg: 2.0,
    repRangeLow: 8,
    repRangeHigh: 12,
    defaultRestSeconds: 150,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ex_barbell_row',
    name: '바벨 로우',
    muscleGroup: '등',
    tier: 'secondary',
    loadType: 'barbell',
    incrementKg: 2.5,
    repRangeLow: 8,
    repRangeHigh: 12,
    defaultRestSeconds: 150,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ex_cable_fly',
    name: '케이블 플라이',
    muscleGroup: '가슴',
    tier: 'isolation',
    loadType: 'cable',
    incrementKg: 2.5,
    repRangeLow: 10,
    repRangeHigh: 15,
    defaultRestSeconds: 90,
    createdAt: new Date().toISOString()
  },
  // 실제 헬스장에 있는 기구 (제조사 포함). src/data/gymEquipment.ts 참고
  ...buildGymExercises(new Date().toISOString())
];

/**
 * 저장된 종목에 없는 기본 종목을 뒤에 붙인다.
 * 앱을 이미 쓰던 사람의 localStorage에는 예전 8종만 있어서, 이걸 안 하면
 * 새로 추가한 기구가 영영 안 보인다. 사용자가 고친 값은 건드리지 않는다.
 */
function mergeMissingDefaults(stored: Exercise[]): Exercise[] {
  const seen = new Set(stored.map(e => e.id));
  const missing = DEFAULT_STARTER_EXERCISES.filter(e => !seen.has(e.id));
  return missing.length ? [...stored, ...missing] : stored;
}

/**
 * 기계 이름만 있고 무슨 운동인지 없는 껍데기 항목을 목록에서 뺀다.
 * (예: "왓슨 케이블 스테이션" → 거기서 하는 운동 6종으로 이미 쪼개 놨다.)
 * 기계가 없어진 게 아니라 종목으로 고를 수 없는 항목을 치우는 것뿐이다.
 *
 * 지난 기록은 안전하다 — SessionExercise가 exerciseName을 그 자리에서 복사해
 * 갖고 있어서 종목 목록과 무관하게 남는다. 다만 루틴은 exerciseId로만 가리키므로,
 * 루틴에 아직 걸려 있는 항목은 루틴이 깨지지 않게 그대로 둔다(수환 승인, 2026-08-26).
 */
function dropRetiredEquipment(stored: Exercise[], routines: Routine[]): Exercise[] {
  const inUse = new Set(routines.flatMap(r => r.exerciseIds));
  const retired = new Set(RETIRED_EQUIPMENT_IDS.filter(id => !inUse.has(id)));
  return retired.size ? stored.filter(e => !retired.has(e.id)) : stored;
}

/**
 * 헬스장에서 눈금판을 실제로 찍어 와 증량 단위가 바뀌면, 이미 저장된 종목에는
 * 옛날 값이 그대로 남는다. 저장된 rev가 낮을 때 **증량 단위만** 한 번 새로 맞춘다.
 * 이름·등급·부위는 사용자가 고쳤을 수 있으므로 건드리지 않는다.
 */
function syncEquipmentIncrements(stored: Exercise[], storedRev: number): Exercise[] {
  const syncIncrements = storedRev < EQUIPMENT_REV;
  return stored.map(e => {
    // 「눈금이 도와주는 힘」 표시는 **rev와 무관하게 늘 맞춘다.**
    // 이건 사용자가 고를 수 있는 설정이 아니라 기구 자체의 성질이고, 빠져 있으면
    // 그 종목의 계산이 통째로 거꾸로 돈다. 반면 증량 단위는 사용자가 손댔을 수 있어서
    // 실측이 갱신됐을 때(rev가 올랐을 때)만 다시 맞춘다.
    const assisted = ASSISTED_EQUIPMENT_IDS.has(e.id);
    const needsAssist = assisted !== (e.isAssisted === true);

    const inc = EQUIPMENT_INCREMENTS[e.id];
    const needsInc = syncIncrements && inc !== undefined && inc !== e.incrementKg;

    if (!needsInc && !needsAssist) return e;
    const next: Exercise = { ...e };
    if (needsInc) next.incrementKg = inc;
    if (needsAssist) {
      if (assisted) next.isAssisted = true;
      else delete next.isAssisted;
    }
    return next;
  });
}

/**
 * 본인의 실제 루틴(DAY 1~6)을 저장된 루틴에 합친다.
 *
 * `alreadySeeded` 표시를 쓰는 이유가 있다 — 「id가 없으면 넣는다」로만 하면 사용자가
 * 루틴을 **지워도 앱을 켤 때마다 되살아난다.** 한 번 넣었다는 사실을 저장해 두고
 * 그다음부터는 손대지 않는다. 이름을 고치거나 종목을 빼는 것도 그대로 남는다.
 */
function mergeMissingRoutines(stored: Routine[], alreadySeeded: boolean): Routine[] {
  if (alreadySeeded) return stored;
  const seen = new Set(stored.map(r => r.id));
  const missing = buildGymRoutines(new Date().toISOString()).filter(r => !seen.has(r.id));
  return missing.length ? [...stored, ...missing] : stored;
}

interface ActiveTimerState {
  isRunning: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  endTimeMs: number;
  exerciseName?: string;
  setNumber?: number;
}

interface WorkoutStoreState {
  exercises: Exercise[];
  routines: Routine[];
  history: WorkoutSession[];
  activeSession: WorkoutSession | null;
  settings: AppSettings;
  activeTimer: ActiveTimerState | null;

  // Exercise Actions
  addExercise: (
    name: string, 
    muscleGroup: MuscleGroup, 
    tier?: ExerciseTier, 
    loadType?: LoadType, 
    repRange?: { min: number; max: number }, 
    incrementKg?: number, 
    defaultRestSeconds?: number, 
    notes?: string
  ) => Exercise;
  updateExercise: (id: string, updates: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;

  // Routine Actions
  addRoutine: (name: string, targetMuscles: string[], exerciseIds: string[], defaultRestSeconds?: number, description?: string) => Routine;
  updateRoutine: (id: string, updates: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;

  // Workout Session Actions
  startEmptySession: (title?: string) => void;
  startRoutineSession: (routineId: string) => void;
  toggleDeloadMode: () => void;
  addExerciseToActiveSession: (exerciseId: string) => void;
  /** 시작하기 전에 종목을 다른 기구로 갈아탄다. 한 세트라도 했으면 아무 일도 하지 않는다. */
  substituteExerciseInActiveSession: (sessionExerciseId: string, newExerciseId: string) => void;
  removeExerciseFromActiveSession: (sessionExerciseId: string) => void;
  addSetToExercise: (sessionExerciseId: string) => void;
  removeSetFromExercise: (sessionExerciseId: string, setId: string) => void;
  updateSet: (sessionExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  toggleSetCompleted: (sessionExerciseId: string, setId: string) => void;
  updateActiveSessionDetails: (updates: Partial<WorkoutSession>) => void;
  finishActiveSession: () => WorkoutSession | null;
  cancelActiveSession: () => void;

  // Rest Timer Actions
  startTimer: (seconds: number, exerciseName?: string, setNumber?: number) => void;
  stopTimer: () => void;
  adjustTimer: (deltaSeconds: number) => void;
  tickTimer: () => void;

  // History & Settings Actions
  deleteHistorySession: (sessionId: string) => void;
  updateSessionSyncStatus: (sessionId: string, status: 'synced' | 'failed' | 'pending', error?: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  flushPendingSyncs: () => Promise<{ sent: number; failed: number }>;
}

function fmtKg(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

function fmtRir(rir: number): string {
  return rir >= 4 ? '4개 넘게' : `${rir}개`;
}

/**
 * RIR을 탭한 직후 남은 세트가 어떻게 바뀌었는지 한 줄로 설명한다.
 * 교정이 일어난 이유를 화면에 보여주기 위한 것이다 — 무게만 조용히 바뀌면
 * 사용자는 왜 바뀌었는지 알 수 없다.
 */
function buildAdjustmentNotice(args: {
  setId: string;
  targetRir: number;
  actualRir: number;
  beforeWeight: number;
  afterWeight: number;
  incrementKg: number;
  isAssisted?: boolean;
}): { setId: string; text: string; type: 'increase' | 'decrease' | 'neutral' } {
  const { setId, targetRir, actualRir, beforeWeight, afterWeight, incrementKg, isAssisted } = args;
  const diff = afterWeight - beforeWeight;
  const gap = actualRir - targetRir; // 양수면 목표보다 쉬웠다

  // ⚠️ 어시스트 기구는 눈금이 올라가면 **쉬워진다.** 눈금 방향만 보고 문구를 고르면
  // 보조를 늘려 주면서 "가볍다는 뜻이야"라고 말하는 정반대 안내가 나간다.
  // 그래서 판단은 눈금이 아니라 **부하가 어느 쪽으로 갔는가**로 한다.
  const loadDiff = isAssisted ? -diff : diff;
  /** 화면에 보일 숫자. 어시스트는 눈금이 곧 「보조」다. */
  const label = `${isAssisted ? '보조 ' : ''}${fmtKg(afterWeight)}kg (${diff > 0 ? '+' : ''}${fmtKg(diff)})`;

  if (loadDiff > 0) {
    return {
      setId,
      type: 'increase',
      text: `남은 세트 ${label} · ${targetRir}개 남기는 게 목표였는데 ${fmtRir(actualRir)} 남았어 — 가볍다는 뜻이야.`
    };
  }
  if (loadDiff < 0) {
    return {
      setId,
      type: 'decrease',
      text: `남은 세트 ${label} · ${targetRir}개 남기는 게 목표였는데 ${fmtRir(actualRir)} 남았어 — 이대로면 남은 세트를 못 채워.`
    };
  }

  // 무게가 안 바뀐 경우는 두 가지다. 둘을 뭉뚱그리면 사용자가 로직을 불신하게 된다.
  const stayLabel = `${isAssisted ? '보조 ' : ''}${fmtKg(afterWeight)}kg`;
  if (Math.abs(gap) <= 1) {
    return {
      setId,
      type: 'neutral',
      text: `목표(${targetRir}개 남기기)와 ${gap === 0 ? '정확히 같아' : '1개 차이야'} — ${isAssisted ? '보조' : '무게'} 선택이 적절했다는 뜻이라 ${stayLabel} 그대로 간다.`
    };
  }
  return {
    setId,
    type: 'neutral',
    text: `목표보다 ${Math.abs(gap)}개 ${gap > 0 ? '더 남았지만' : '모자랐지만'} 이 기구의 조절 단위가 ${fmtKg(incrementKg)}kg이라 5% 조정으로는 한 칸도 못 움직여 — ${stayLabel} 그대로 둔다.`
  };
}

export function enrichExerciseWithDefaults(ex: Partial<Exercise> & { repRange?: { min: number; max: number }; weightIncrementKg?: number }): Exercise {
  const meta = classifyExercise(ex.name || '', ex.muscleGroup || '기타');
  const tier = ex.tier || meta.tier;
  const tierCfg = TIER_DEFAULTS[tier];

  return {
    id: ex.id || 'ex_' + Date.now(),
    name: ex.name || '운동',
    muscleGroup: ex.muscleGroup || '기타',
    tier,
    loadType: ex.loadType || meta.loadType,
    incrementKg: ex.incrementKg ?? ex.weightIncrementKg ?? DEFAULT_INCREMENT[ex.loadType || meta.loadType],
    repRangeLow: ex.repRangeLow ?? ex.repRange?.min ?? tierCfg.repLow,
    repRangeHigh: ex.repRangeHigh ?? ex.repRange?.max ?? tierCfg.repHigh,
    defaultRestSeconds: ex.defaultRestSeconds ?? tierCfg.restSeconds,
    // 유산소 지표는 반드시 그대로 넘긴다. 여기서 빠지면 저장 후 다시 켰을 때
    // 런닝머신이 무게·횟수 종목으로 둔갑한다.
    ...(ex.cardioMetrics?.length ? { cardioMetrics: ex.cardioMetrics } : {}),
    // 「도와주는 기구」 표시도 같은 이유로 반드시 넘긴다. 이 함수는 필드를 하나하나
    // 다시 쌓아 만들기 때문에, 적지 않은 필드는 조용히 사라진다. 이게 빠지면
    // 어시스트 풀업이 보통 기구로 둔갑해 **보조를 늘리는 쪽을 증량으로 추천한다.**
    ...(ex.isAssisted ? { isAssisted: true } : {}),
    notes: ex.notes || '',
    createdAt: ex.createdAt || new Date().toISOString()
  };
}

/**
 * 저장해 둔 휴식 타이머를 되살린다. 끝나는 시각이 이미 지났으면 버린다 —
 * 어제 남겨 둔 타이머가 오늘 켜자마자 울리면 안 된다.
 */
function restoreTimer(saved: any): ActiveTimerState | null {
  if (!saved || typeof saved.endTimeMs !== 'number') return null;
  const remaining = Math.ceil((saved.endTimeMs - Date.now()) / 1000);
  if (remaining <= 0) return null;
  return { ...saved, isRunning: true, remainingSeconds: remaining };
}

function loadInitialState() {
  if (typeof window === 'undefined') {
    return {
      exercises: DEFAULT_STARTER_EXERCISES,
      routines: buildGymRoutines(new Date().toISOString()),
      history: [],
      activeSession: null,
      activeTimer: null,
      settings: {
        gasWebhookUrl: '',
        gasSharedSecret: '',
        autoStartTimer: true,
        defaultRestSeconds: 90,
        enableSound: true,
        enableVibration: true,
        autoSyncOnFinish: true,
        theme: DEFAULT_THEME,
        bodyWeightKg: DEFAULT_BODY_WEIGHT
      }
    };
  }

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // JSON이 깨졌을 때 그냥 catch로 흘려보내면 기본값으로 시작하고,
      // 그다음 아무 동작에서나 saveStateToStorage가 **원본을 덮어써서 몇 달치가 사라진다.**
      // 그래서 파싱 전에 실패를 따로 잡아 원본을 다른 키로 옮겨 둔다.
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (parseError) {
        const backupKey = STORAGE_KEY + '_corrupt_' + Date.now();
        try { localStorage.setItem(backupKey, raw); } catch { /* 백업조차 못 하면 어쩔 수 없다 */ }
        storageAlert =
          '저장된 기록을 읽지 못했습니다. 원본은 ' + backupKey + ' 에 그대로 남겨 뒀습니다. ' +
          '덮어쓰기 전에 설정 → 백업 내보내기로 꺼내 주세요.';
        throw parseError;
      }
      const rawExercises = Array.isArray(parsed.exercises) && parsed.exercises.length > 0 
        ? parsed.exercises 
        : DEFAULT_STARTER_EXERCISES;

      const storedRoutines: Routine[] = mergeMissingRoutines(
        parsed.routines || [],
        parsed.routinesSeeded === true
      );
      // 기본 종목 8개를 이미 한 번 심었다면 다시 채워 넣지 않는다.
      // 안 그러면 사용자가 지운 기본 종목이 앱을 켤 때마다 되살아난다(루틴과 같은 이유).
      const enriched = rawExercises.map((e: Partial<Exercise>) => enrichExerciseWithDefaults(e));
      const enrichedExercises: Exercise[] = dropRetiredEquipment(
        syncEquipmentIncrements(
          parsed.exercisesSeeded === true ? enriched : mergeMissingDefaults(enriched),
          typeof parsed.equipmentRev === 'number' ? parsed.equipmentRev : 0
        ),
        storedRoutines
      );

      return {
        exercises: enrichedExercises,
        routines: storedRoutines,
        history: parsed.history || [],
        activeSession: parsed.activeSession || null,
        // 저장해 둔 타이머는 아직 안 끝났을 때만 살린다.
        activeTimer: restoreTimer(parsed.activeTimer),
        settings: {
          gasWebhookUrl: parsed.settings?.gasWebhookUrl || '',
          gasSharedSecret: parsed.settings?.gasSharedSecret || '',
          autoStartTimer: parsed.settings?.autoStartTimer ?? true,
          defaultRestSeconds: parsed.settings?.defaultRestSeconds || 90,
          enableSound: parsed.settings?.enableSound ?? true,
          enableVibration: parsed.settings?.enableVibration ?? true,
          autoSyncOnFinish: parsed.settings?.autoSyncOnFinish ?? true,
          theme: parsed.settings?.theme || DEFAULT_THEME,
          bodyWeightKg: parsed.settings?.bodyWeightKg ?? DEFAULT_BODY_WEIGHT
        }
      };
    }
  } catch (e) {
    console.error('Failed to load local storage state', e);
  }

  return {
    exercises: DEFAULT_STARTER_EXERCISES,
    routines: buildGymRoutines(new Date().toISOString()),
    history: [],
    activeSession: null,
    activeTimer: null,
    settings: {
      gasWebhookUrl: '',
      gasSharedSecret: '',
      autoStartTimer: true,
      defaultRestSeconds: 90,
      enableSound: true,
      enableVibration: true,
      autoSyncOnFinish: true,
      theme: DEFAULT_THEME,
      bodyWeightKg: DEFAULT_BODY_WEIGHT
    }
  };
}

/**
 * 종목 하나를 세션에 넣을 형태로 만든다 — 추천 로직을 돌려 세트를 미리 채운다.
 * 종목 추가와 종목 대체가 똑같은 결과를 내야 해서 한 곳으로 모았다.
 */
function buildSessionExercise(ex: Exercise, history: WorkoutSession[], isDeload: boolean): SessionExercise {
  const rec = recommend(ex, history, {
    deloadWeek: isDeload,
    setCount: ex.cardioMetrics?.length ? 1 : undefined
  });

  const sets: WorkoutSet[] = rec.sets.map((target, sIdx) => ({
    id: 'set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + (sIdx + 1),
    setNumber: sIdx + 1,
    weightKg: target.weightKg,
    reps: target.reps,
    isCompleted: false,
    targetRpe: target.targetRpe,
    targetRir: target.targetRir,
    restSeconds: rec.restSeconds,
    previousWeight: rec.basis.workingWeight,
    previousReps: rec.basis.repsBySet?.[sIdx] ?? target.reps,
    recommendationReason: rec.reason
  }));

  return {
    id: 'se_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    exerciseId: ex.id,
    exerciseName: ex.name,
    muscleGroup: ex.muscleGroup,
    tier: ex.tier,
    loadType: ex.loadType,
    incrementKg: ex.incrementKg,
    repRangeLow: ex.repRangeLow,
    repRangeHigh: ex.repRangeHigh,
    isAssisted: ex.isAssisted,
    ...(ex.cardioMetrics?.length ? { cardioMetrics: ex.cardioMetrics } : {}),
    sets,
    notes: ex.notes || '',
    recommendationReason: rec.reason,
    recommendationAction: rec.action
  };
}

/**
 * 저장/불러오기가 실패했을 때 화면에 띄울 경고 문구.
 * 스토어 상태가 아니라 모듈 변수인 이유 — 이 값은 loadInitialState()가
 * **스토어가 만들어지기 전에** 이미 정할 수 있어야 한다.
 */
let storageAlert: string | null = null;
const storageAlertListeners = new Set<() => void>();
export function getStorageAlert(): string | null { return storageAlert; }
export function clearStorageAlert(): void { storageAlert = null; notifyStorageAlert(); }
export function subscribeStorageAlert(fn: () => void): () => void {
  storageAlertListeners.add(fn);
  return () => { storageAlertListeners.delete(fn); };
}
function notifyStorageAlert(): void { storageAlertListeners.forEach(fn => fn()); }

function saveStateToStorage(state: Partial<WorkoutStoreState>) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      exercises: state.exercises,
      routines: state.routines,
      history: state.history,
      activeSession: state.activeSession,
      settings: state.settings,
      // 휴식 타이머는 끝나는 시각(endTimeMs)으로 굴러가므로, 저장해 두면
      // 사파리가 앱을 내렸다 올려도 남은 시간이 그대로 이어진다.
      activeTimer: state.activeTimer ?? null,
      // 증량 단위 마이그레이션이 두 번 돌지 않게 하는 표시
      equipmentRev: EQUIPMENT_REV,
      // 기본 루틴을 한 번 넣었다는 표시. 이게 없으면 사용자가 루틴을 지워도 되살아난다.
      routinesSeeded: true,
      // 기본 종목도 마찬가지 — 이 표시가 없으면 지운 기본 종목이 켤 때마다 되살아난다.
      exercisesSeeded: true
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (storageAlert) { storageAlert = null; notifyStorageAlert(); }
  } catch (e) {
    console.error('Failed to save to local storage', e);
    // 저장 실패를 조용히 넘기면, 기록이 남고 있다고 믿은 채로 몇 주를 더 운동하게 된다.
    const quota = e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    storageAlert = quota
      ? '저장 공간이 꽉 차서 이번 기록이 저장되지 않았습니다. 설정에서 백업을 내보낸 뒤 오래된 기록을 정리해 주세요.'
      : '기록을 저장하지 못했습니다. 사파리 개인정보 보호 모드에서는 저장이 막힐 수 있습니다.';
    notifyStorageAlert();
  }
}

/** 자동 재전송을 포기하기까지의 시도 횟수. 이후에는 손으로만 다시 보낸다. */
const MAX_AUTO_SYNC_ATTEMPTS = 5;

/**
 * 백업 파일에 담을 내용. **저장 형식과 똑같아야 한다.**
 *
 * 예전 백업은 exercises·routines·history·settings만 담았다. 그래서 되돌리면
 * `routinesSeeded`·`exercisesSeeded`·`equipmentRev` 표시가 통째로 빠진 상태가 되어,
 * 앱이 "처음 켜는 것"으로 오인하고 **지웠던 기본 루틴 DAY 1~6과 기본 종목을 되살리고
 * 증량 단위를 공장 값으로 되돌렸다.** 진행 중이던 운동(activeSession)도 사라졌다.
 * (외부 검토 지적, 코드에서 확인 — 2026-08-27)
 */
export function buildBackupPayload(state: {
  exercises: Exercise[];
  routines: Routine[];
  history: WorkoutSession[];
  activeSession: WorkoutSession | null;
  settings: AppSettings;
  activeTimer: ActiveTimerState | null;
}) {
  return {
    backupVersion: 2,
    exportedAt: new Date().toISOString(),
    exercises: state.exercises,
    routines: state.routines,
    history: state.history,
    activeSession: state.activeSession,
    settings: state.settings,
    activeTimer: state.activeTimer ?? null,
    equipmentRev: EQUIPMENT_REV,
    routinesSeeded: true,
    exercisesSeeded: true
  };
}

/**
 * 백업 파일을 저장소가 읽을 수 있는 형태로 되돌린다.
 * 옛 백업(표시가 없는 것)도 받아 준다 — 그때는 표시를 여기서 채워 넣어서,
 * 되돌린 직후에 지웠던 기본값이 되살아나지 않게 한다.
 */
export function normalizeBackup(data: any): string | null {
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.exercises) || data.exercises.length === 0) return null;
  const payload = {
    exercises: data.exercises,
    routines: Array.isArray(data.routines) ? data.routines : [],
    history: Array.isArray(data.history) ? data.history : [],
    activeSession: data.activeSession ?? null,
    settings: data.settings ?? {},
    activeTimer: data.activeTimer ?? null,
    equipmentRev: typeof data.equipmentRev === 'number' ? data.equipmentRev : EQUIPMENT_REV,
    routinesSeeded: data.routinesSeeded !== false,
    exercisesSeeded: data.exercisesSeeded !== false
  };
  return JSON.stringify(payload);
}

export const BACKUP_STORAGE_KEY = STORAGE_KEY;

const initial = loadInitialState();

// 계산 쪽이 쓰는 체중을 저장된 설정과 맞춘다. 스토어를 만들기 전에 해야
// 첫 화면의 추천·볼륨부터 올바른 체중으로 계산된다.
setBodyWeightKg(initial.settings.bodyWeightKg);

export const useWorkoutStore = create<WorkoutStoreState>((set, get) => ({
  exercises: initial.exercises,
  routines: initial.routines,
  history: initial.history,
  activeSession: initial.activeSession,
  settings: initial.settings,
  activeTimer: initial.activeTimer,

  // Exercise CRUD
  addExercise: (name, muscleGroup, tier, loadType, repRange, incrementKg, defaultRestSeconds, notes = '') => {
    const meta = classifyExercise(name, muscleGroup);
    const resolvedTier = tier || meta.tier;
    const resolvedLoadType = loadType || meta.loadType;
    const tierCfg = TIER_DEFAULTS[resolvedTier];

    const newEx: Exercise = {
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      muscleGroup,
      tier: resolvedTier,
      loadType: resolvedLoadType,
      incrementKg: incrementKg ?? meta.incrementKg,
      repRangeLow: repRange?.min ?? tierCfg.repLow,
      repRangeHigh: repRange?.max ?? tierCfg.repHigh,
      defaultRestSeconds: defaultRestSeconds || tierCfg.restSeconds,
      notes,
      createdAt: new Date().toISOString()
    };

    set(state => {
      const updated = [...state.exercises, newEx];
      saveStateToStorage({ ...state, exercises: updated });
      return { exercises: updated };
    });
    return newEx;
  },

  updateExercise: (id, updates) => {
    set(state => {
      const updated = state.exercises.map(ex => ex.id === id ? { ...ex, ...updates } : ex);
      saveStateToStorage({ ...state, exercises: updated });
      return { exercises: updated };
    });
  },

  deleteExercise: (id) => {
    set(state => {
      const updated = state.exercises.filter(ex => ex.id !== id);
      saveStateToStorage({ ...state, exercises: updated });
      return { exercises: updated };
    });
  },

  // Routine CRUD
  addRoutine: (name, targetMuscles, exerciseIds, defaultRestSeconds = 90, description = '') => {
    const newRoutine: Routine = {
      id: 'rt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      targetMuscles,
      exerciseIds,
      defaultRestSeconds,
      description,
      createdAt: new Date().toISOString()
    };
    set(state => {
      const updated = [...state.routines, newRoutine];
      saveStateToStorage({ ...state, routines: updated });
      return { routines: updated };
    });
    return newRoutine;
  },

  updateRoutine: (id, updates) => {
    set(state => {
      const updated = state.routines.map(rt => rt.id === id ? { ...rt, ...updates } : rt);
      saveStateToStorage({ ...state, routines: updated });
      return { routines: updated };
    });
  },

  deleteRoutine: (id) => {
    set(state => {
      const updated = state.routines.filter(rt => rt.id !== id);
      saveStateToStorage({ ...state, routines: updated });
      return { routines: updated };
    });
  },

  // Workout Session
  startEmptySession: (title = '자유 운동') => {
    const now = new Date();
    const newSession: WorkoutSession = {
      id: 'ws_' + Date.now(),
      title,
      date: localDateKey(now),
      startTime: now.toISOString(),
      durationMinutes: 0,
      exercises: [],
      totalVolumeKg: 0,
      totalSets: 0,
      targetMuscles: [],
      isDeload: false,
      syncStatus: 'pending'
    };

    set(state => {
      saveStateToStorage({ ...state, activeSession: newSession });
      return { activeSession: newSession };
    });
  },

  toggleDeloadMode: () => {
    const { activeSession, history, exercises } = get();
    if (!activeSession) return;
    const nextDeload = !activeSession.isDeload;

    // Recalculate exercises progression under deload
    const recalculatedExercises = activeSession.exercises.map(se => {
      const ex = exercises.find(e => e.id === se.exerciseId);
      if (!ex) return se;
      const rec = recommend(ex, history, { deloadWeek: nextDeload });
      const updatedSets = se.sets.map((s, idx) => {
        const targetSet = rec.sets[idx] || rec.sets[0];
        return {
          ...s,
          weightKg: s.isCompleted ? s.weightKg : (targetSet?.weightKg ?? s.weightKg),
          reps: s.isCompleted ? s.reps : (targetSet?.reps ?? s.reps),
          targetRpe: targetSet?.targetRpe ?? s.targetRpe,
          targetRir: targetSet?.targetRir ?? s.targetRir,
          recommendationReason: rec.reason
        };
      });
      return { 
        ...se, 
        sets: updatedSets,
        recommendationReason: rec.reason,
        recommendationAction: rec.action
      };
    });

    const updatedSession: WorkoutSession = {
      ...activeSession,
      isDeload: nextDeload,
      exercises: recalculatedExercises
    };

    set(state => {
      saveStateToStorage({ ...state, activeSession: updatedSession });
      return { activeSession: updatedSession };
    });
  },

  startRoutineSession: (routineId) => {
    const { routines, exercises, history } = get();
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    const now = new Date();
    const sessionExercises: SessionExercise[] = routine.exerciseIds
      .map(exId => exercises.find(e => e.id === exId))
      .filter((e): e is Exercise => !!e)
      .map((ex, exIdx) => {
        const enriched = enrichExerciseWithDefaults(ex);
        // 유산소는 한 판이 기본이다. 세 세트로 시작하면 지우는 일이 잦다.
        const rec = recommend(enriched, history, { setCount: enriched.cardioMetrics?.length ? 1 : undefined });

        const sets: WorkoutSet[] = rec.sets.map((target, sIdx) => ({
          id: 'set_' + Date.now() + '_' + exIdx + '_' + (sIdx + 1),
          setNumber: sIdx + 1,
          weightKg: target.weightKg,
          reps: target.reps,
          isCompleted: false,
          targetRpe: target.targetRpe,
          targetRir: target.targetRir,
          restSeconds: rec.restSeconds,
          previousWeight: rec.basis.workingWeight,
          previousReps: rec.basis.repsBySet?.[sIdx] ?? target.reps,
          recommendationReason: rec.reason
        }));

        return {
          id: 'se_' + Date.now() + '_' + exIdx + '_' + Math.random().toString(36).substring(2, 7),
          exerciseId: enriched.id,
          exerciseName: enriched.name,
          muscleGroup: enriched.muscleGroup,
          tier: enriched.tier,
          loadType: enriched.loadType,
          incrementKg: enriched.incrementKg,
          repRangeLow: enriched.repRangeLow,
          repRangeHigh: enriched.repRangeHigh,
          isAssisted: enriched.isAssisted,
          ...(enriched.cardioMetrics?.length ? { cardioMetrics: enriched.cardioMetrics } : {}),
          sets,
          notes: enriched.notes || '',
          recommendationReason: rec.reason,
          recommendationAction: rec.action
        };
      });

    const newSession: WorkoutSession = {
      id: 'ws_' + Date.now(),
      title: routine.name,
      routineId: routine.id,
      routineName: routine.name,
      date: localDateKey(now),
      startTime: now.toISOString(),
      durationMinutes: 0,
      exercises: sessionExercises,
      totalVolumeKg: 0,
      totalSets: 0,
      targetMuscles: routine.targetMuscles,
      isDeload: false,
      syncStatus: 'pending'
    };

    set(state => {
      saveStateToStorage({ ...state, activeSession: newSession });
      return { activeSession: newSession };
    });
  },

  addExerciseToActiveSession: (exerciseId) => {
    const { exercises, activeSession, history } = get();
    if (!activeSession) return;
    const rawEx = exercises.find(e => e.id === exerciseId);
    if (!rawEx) return;

    const ex = enrichExerciseWithDefaults(rawEx);
    const newSessionEx = buildSessionExercise(ex, history, !!activeSession.isDeload);

    const updatedExercises = [...activeSession.exercises, newSessionEx];
    const stats = calculateSessionStats(updatedExercises);

    const updatedSession: WorkoutSession = {
      ...activeSession,
      exercises: updatedExercises,
      totalVolumeKg: stats.completedVolume,
      totalSets: stats.completedSets,
      targetMuscles: Array.from(new Set([...activeSession.targetMuscles, ex.muscleGroup]))
    };

    set(state => {
      saveStateToStorage({ ...state, activeSession: updatedSession });
      return { activeSession: updatedSession };
    });
  },

  substituteExerciseInActiveSession: (sessionExerciseId, newExerciseId) => {
    const { exercises, activeSession, history } = get();
    if (!activeSession) return;

    const idx = activeSession.exercises.findIndex(se => se.id === sessionExerciseId);
    if (idx === -1) return;
    const oldSe = activeSession.exercises[idx];
    if (oldSe.exerciseId === newExerciseId) return;

    // 한 종목을 하다 말고 중간에 갈아타는 일은 없다 — 기구에 자리가 없으면 시작하기 전에
    // 다른 것으로 정하고 그걸로 쭉 한다(본인 확인, 2026-08-27). 그래서 이미 한 세트가
    // 있으면 대체하지 않는다. 화면에서도 그때는 대체 버튼을 감춘다.
    if (oldSe.sets.some(s => s.isCompleted)) return;

    const rawEx = exercises.find(e => e.id === newExerciseId);
    if (!rawEx) return;
    const ex = enrichExerciseWithDefaults(rawEx);

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[idx] = {
      ...buildSessionExercise(ex, history, !!activeSession.isDeload),
      substitutedFrom: oldSe.exerciseName
    };

    const stats = calculateSessionStats(updatedExercises);
    const updatedSession: WorkoutSession = {
      ...activeSession,
      exercises: updatedExercises,
      totalVolumeKg: stats.completedVolume,
      totalSets: stats.completedSets,
      targetMuscles: stats.targetMuscles
    };

    triggerHaptic('medium');
    set(state => {
      saveStateToStorage({ ...state, activeSession: updatedSession });
      return { activeSession: updatedSession };
    });
  },

  removeExerciseFromActiveSession: (sessionExerciseId) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.filter(se => se.id !== sessionExerciseId);
    const stats = calculateSessionStats(updatedExercises);

    const updatedSession: WorkoutSession = {
      ...activeSession,
      exercises: updatedExercises,
      totalVolumeKg: stats.completedVolume,
      totalSets: stats.completedSets,
      targetMuscles: stats.targetMuscles
    };

    set(state => {
      saveStateToStorage({ ...state, activeSession: updatedSession });
      return { activeSession: updatedSession };
    });
  },

  addSetToExercise: (sessionExerciseId) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(se => {
      if (se.id !== sessionExerciseId) return se;
      const lastSet = se.sets[se.sets.length - 1];
      const newSetNumber = se.sets.length + 1;
      const tier = se.tier || 'secondary';
      const tierCfg = TIER_DEFAULTS[tier];

      const newSet: WorkoutSet = {
        id: 'set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + newSetNumber,
        setNumber: newSetNumber,
        weightKg: lastSet ? lastSet.weightKg : 20,
        reps: lastSet ? lastSet.reps : (se.repRangeLow || tierCfg.repLow),
        isCompleted: false,
        targetRpe: tierCfg.rpeHigh,
        targetRir: 10 - tierCfg.rpeHigh,
        restSeconds: lastSet?.restSeconds || tierCfg.restSeconds,
        previousWeight: lastSet?.weightKg,
        previousReps: lastSet?.reps
      };
      return {
        ...se,
        sets: [...se.sets, newSet]
      };
    });

    const stats = calculateSessionStats(updatedExercises);
    const updatedSession: WorkoutSession = {
      ...activeSession,
      exercises: updatedExercises,
      totalVolumeKg: stats.completedVolume,
      totalSets: stats.completedSets
    };

    set(state => {
      saveStateToStorage({ ...state, activeSession: updatedSession });
      return { activeSession: updatedSession };
    });
  },

  removeSetFromExercise: (sessionExerciseId, setId) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(se => {
      if (se.id !== sessionExerciseId) return se;
      const filtered = se.sets.filter(s => s.id !== setId);
      const renumbered = filtered.map((s, idx) => ({ 
        ...s, 
        setNumber: idx + 1
      }));
      return {
        ...se,
        sets: renumbered
      };
    });

    const stats = calculateSessionStats(updatedExercises);
    const updatedSession: WorkoutSession = {
      ...activeSession,
      exercises: updatedExercises,
      totalVolumeKg: stats.completedVolume,
      totalSets: stats.completedSets
    };

    set(state => {
      saveStateToStorage({ ...state, activeSession: updatedSession });
      return { activeSession: updatedSession };
    });
  },

  updateSet: (sessionExerciseId, setId, updates) => {
    const { activeSession, exercises } = get();
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(se => {
      if (se.id !== sessionExerciseId) return se;
      const exObj = exercises.find(e => e.id === se.exerciseId) || enrichExerciseWithDefaults({
        id: se.exerciseId,
        name: se.exerciseName,
        muscleGroup: se.muscleGroup,
        tier: se.tier,
        loadType: se.loadType,
        incrementKg: se.incrementKg,
        repRangeLow: se.repRangeLow,
        repRangeHigh: se.repRangeHigh,
        isAssisted: se.isAssisted
      });

      let updatedSetCompleted: WorkoutSet | null = null;
      let targetRpeForSet = 8;

      const sets = se.sets.map(s => {
        if (s.id === setId) {
          const merged: WorkoutSet = { ...s, ...updates };
          if (merged.actualRir !== undefined) {
            merged.rpe = 10 - merged.actualRir;
          }
          if (merged.rpe !== undefined) {
            merged.actualRir = Math.max(0, 10 - merged.rpe);
          }
          merged.isHardSet = isHardSet(merged, se.tier || 'secondary', isCardioLike(se));
          updatedSetCompleted = merged;
          targetRpeForSet = merged.targetRpe ?? (merged.targetRir !== undefined ? 10 - merged.targetRir : 8);
          return merged;
        }
        return s;
      });

      // 무게를 고치면 아직 시작하지 않은 뒤 세트도 따라간다.
      // 횟수는 따라가지 않는다 — 이중 진행에서는 세트별 목표 횟수가 서로 다를 수 있다.
      if (updates.weightKg !== undefined) {
        const editedIndex = sets.findIndex(s => s.id === setId);
        const editedSet = sets[editedIndex];
        if (editedSet && !editedSet.isCompleted) {
          const newWeight = updates.weightKg;
          const propagated = sets.map((s, i) =>
            i > editedIndex && !s.isCompleted ? { ...s, weightKg: newWeight } : s
          );
          return { ...se, sets: propagated };
        }
      }

      // 세션 안 실시간 교정 적용 (남은 미완료 세트)
      if (updatedSetCompleted && updates.actualRir !== undefined) {
        const completedIndex = sets.findIndex(s => s.id === setId);
        const remaining = sets.slice(completedIndex + 1).filter(s => !s.isCompleted);
        if (remaining.length > 0) {
          const beforeWeight = remaining[0].weightKg;
          const adjustedRemainingSets = adjustRemaining(
            exObj,
            updatedSetCompleted,
            targetRpeForSet,
            remaining
          );
          const afterWeight = adjustedRemainingSets[0]?.weightKg ?? beforeWeight;

          const adjustedMap = new Map(adjustedRemainingSets.map(s => [s.id, s]));
          const nextSets = sets.map(s => adjustedMap.get(s.id) || s);
          return {
            ...se,
            sets: nextSets,
            lastAdjustment: buildAdjustmentNotice({
              setId,
              targetRir: Math.max(0, Math.round(10 - targetRpeForSet)),
              actualRir: updates.actualRir,
              beforeWeight,
              afterWeight,
              incrementKg: exObj.incrementKg,
              isAssisted: exObj.isAssisted
            })
          };
        }
      }

      return { ...se, sets };
    });

    const stats = calculateSessionStats(updatedExercises);
    const updatedSession: WorkoutSession = {
      ...activeSession,
      exercises: updatedExercises,
      totalVolumeKg: stats.completedVolume,
      totalSets: stats.completedSets
    };

    set(state => {
      saveStateToStorage({ ...state, activeSession: updatedSession });
      return { activeSession: updatedSession };
    });
  },

  toggleSetCompleted: (sessionExerciseId, setId) => {
    const { activeSession, settings, startTimer, exercises } = get();
    if (!activeSession) return;

    let targetExName = '';
    let targetSetNumber = 1;
    let targetRestSeconds = settings.defaultRestSeconds || 90;
    let nextIsCompleted = false;

    const updatedExercises = activeSession.exercises.map(se => {
      if (se.id !== sessionExerciseId) return se;
      targetExName = se.exerciseName;

      const exObj = exercises.find(e => e.id === se.exerciseId) || enrichExerciseWithDefaults({
        id: se.exerciseId,
        name: se.exerciseName,
        muscleGroup: se.muscleGroup,
        tier: se.tier,
        loadType: se.loadType,
        incrementKg: se.incrementKg,
        repRangeLow: se.repRangeLow,
        repRangeHigh: se.repRangeHigh,
        isAssisted: se.isAssisted
      });

      let justCompletedSet: WorkoutSet | null = null;
      let targetRpeForSet = 8;

      const sets = se.sets.map(s => {
        if (s.id === setId) {
          nextIsCompleted = !s.isCompleted;
          targetSetNumber = s.setNumber;
          if (s.restSeconds) targetRestSeconds = s.restSeconds;

          // 완료 시 기본 RIR(입력된 것이 없으면 목표 RIR 채택)
          const defaultTargetRir = s.targetRir ?? (s.targetRpe !== undefined ? 10 - s.targetRpe : 2);
          const actualRir = s.actualRir ?? (nextIsCompleted ? defaultTargetRir : undefined);
          const rpe = actualRir !== undefined ? 10 - actualRir : (s.targetRpe ?? 8);
          const isHard = isHardSet({ ...s, rpe, actualRir }, se.tier || 'secondary', isCardioLike(se));

          const updated: WorkoutSet = {
            ...s,
            isCompleted: nextIsCompleted,
            actualRir: nextIsCompleted ? actualRir : s.actualRir,
            rpe: nextIsCompleted ? rpe : s.rpe,
            isHardSet: nextIsCompleted ? isHard : s.isHardSet
          };

          if (nextIsCompleted) {
            justCompletedSet = updated;
            targetRpeForSet = s.targetRpe ?? (10 - defaultTargetRir);
          }

          return updated;
        }
        return s;
      });

      // 세션 안 실시간 교정 적용
      if (nextIsCompleted && justCompletedSet) {
        const completedIndex = sets.findIndex(s => s.id === setId);
        const remaining = sets.slice(completedIndex + 1).filter(s => !s.isCompleted);
        if (remaining.length > 0) {
          const adjustedRemainingSets = adjustRemaining(
            exObj,
            justCompletedSet,
            targetRpeForSet,
            remaining
          );

          const adjustedMap = new Map(adjustedRemainingSets.map(s => [s.id, s]));
          const nextSets = sets.map(s => adjustedMap.get(s.id) || s);
          return { ...se, sets: nextSets };
        }
      }

      return { ...se, sets };
    });

    const stats = calculateSessionStats(updatedExercises);
    const updatedSession: WorkoutSession = {
      ...activeSession,
      exercises: updatedExercises,
      totalVolumeKg: stats.completedVolume,
      totalSets: stats.completedSets
    };

    if (nextIsCompleted) {
      if (settings.enableSound) soundManager.playCheckSound();
      if (settings.enableVibration) triggerHaptic('success');
      if (settings.autoStartTimer) {
        startTimer(targetRestSeconds, targetExName, targetSetNumber);
      }
    } else {
      if (settings.enableVibration) triggerHaptic('light');
    }

    set(state => {
      saveStateToStorage({ ...state, activeSession: updatedSession });
      return { activeSession: updatedSession };
    });
  },

  updateActiveSessionDetails: (updates) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const updated = { ...activeSession, ...updates };
    set(state => {
      saveStateToStorage({ ...state, activeSession: updated });
      return { activeSession: updated };
    });
  },

  finishActiveSession: () => {
    const { activeSession, history, settings } = get();
    if (!activeSession) return null;

    const endTime = new Date().toISOString();
    const startTimeMs = new Date(activeSession.startTime).getTime();
    const endTimeMs = new Date(endTime).getTime();
    const durationMinutes = Math.max(1, Math.round((endTimeMs - startTimeMs) / 60000));

    const stats = calculateSessionStats(activeSession.exercises);

    const completedSession: WorkoutSession = {
      ...activeSession,
      endTime,
      durationMinutes,
      totalVolumeKg: stats.completedVolume,
      totalSets: stats.completedSets,
      targetMuscles: stats.targetMuscles.length ? stats.targetMuscles : activeSession.targetMuscles,
      syncStatus: settings.gasWebhookUrl ? 'pending' : 'not_configured'
    };

    const updatedHistory = [completedSession, ...history];

    set(state => {
      saveStateToStorage({
        ...state,
        history: updatedHistory,
        activeSession: null
      });
      return {
        history: updatedHistory,
        activeSession: null,
        activeTimer: null
      };
    });

    if (settings.enableSound) soundManager.playTimerFinishSound();
    if (settings.enableVibration) triggerHaptic('success');

    // Auto-sync if configured
    if (settings.autoSyncOnFinish && settings.gasWebhookUrl) {
      setTimeout(() => {
        get().flushPendingSyncs();
      }, 100);
    }

    return completedSession;
  },

  cancelActiveSession: () => {
    set(state => {
      saveStateToStorage({ ...state, activeSession: null });
      return {
        activeSession: null,
        activeTimer: null
      };
    });
  },

  // Rest Timer
  startTimer: (seconds, exerciseName, setNumber) => {
    const now = Date.now();
    set({
      activeTimer: {
        isRunning: true,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        endTimeMs: now + seconds * 1000,
        exerciseName,
        setNumber
      }
    });
  },

  stopTimer: () => {
    set({ activeTimer: null });
  },

  adjustTimer: (deltaSeconds) => {
    set(state => {
      if (!state.activeTimer) return {};
      const newRemaining = Math.max(0, state.activeTimer.remainingSeconds + deltaSeconds);
      const newTotal = Math.max(newRemaining, state.activeTimer.totalSeconds);
      return {
        activeTimer: {
          ...state.activeTimer,
          remainingSeconds: newRemaining,
          totalSeconds: newTotal,
          endTimeMs: Date.now() + newRemaining * 1000
        }
      };
    });
  },

  tickTimer: () => {
    const { activeTimer, settings } = get();
    if (!activeTimer || !activeTimer.isRunning) return;

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((activeTimer.endTimeMs - now) / 1000));

    if (remaining <= 0) {
      if (settings.enableSound) soundManager.playTimerFinishSound();
      if (settings.enableVibration) triggerHaptic('warning');
      set({ activeTimer: null });
    } else {
      if (remaining <= 3 && remaining !== activeTimer.remainingSeconds) {
        if (settings.enableSound) soundManager.playCountdownTick();
      }
      set({
        activeTimer: {
          ...activeTimer,
          remainingSeconds: remaining
        }
      });
    }
  },

  // History & Settings
  deleteHistorySession: (sessionId) => {
    set(state => {
      const updated = state.history.filter(s => s.id !== sessionId);
      saveStateToStorage({ ...state, history: updated });
      return { history: updated };
    });
  },

  updateSessionSyncStatus: (sessionId, status, error) => {
    set(state => {
      const updated = state.history.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            syncStatus: status,
            syncedAt: status === 'synced' ? new Date().toISOString() : s.syncedAt,
            syncError: error,
            // 성공하면 시도 횟수를 초기화한다 — 다음에 실패하면 다시 몇 번은 시도해야 하니까.
            syncAttempts: status === 'synced' ? 0 : (s.syncAttempts ?? 0) + 1
          };
        }
        return s;
      });
      saveStateToStorage({ ...state, history: updated });
      return { history: updated };
    });
  },

  updateSettings: (updates) => {
    set(state => {
      const updated = { ...state.settings, ...updates };
      // 계산 쪽(progression.ts)이 쓰는 체중을 같이 맞춰 준다.
      // 이걸 빼면 설정에서 체중을 고쳐도 어시스트 종목 계산은 옛 값으로 굴러간다.
      setBodyWeightKg(updated.bodyWeightKg);
      saveStateToStorage({ ...state, settings: updated });
      return { settings: updated };
    });
  },

  // TASKS.md 5: Automatic Batch Sync
  flushPendingSyncs: async () => {
    // 부르는 곳이 넷이다 — 앱 켤 때 · 인터넷이 돌아올 때 · 운동을 끝냈을 때 ·
    // 설정에서 손으로 누를 때. 잠금이 없으면 두 번이 겹쳐서 **같은 기록을 두 번
    // 보낸다.** 게다가 아래 history는 시작할 때 한 번 읽은 값이라, 겹친 쪽은
    // 이미 보낸 기록을 「아직 안 보냄」으로 보고 다시 집어 든다.
    if (isFlushingSyncs) return { sent: 0, failed: 0 };
    isFlushingSyncs = true;
    try {
      return await runFlushPendingSyncs(get);
    } finally {
      isFlushingSyncs = false;
    }
  }
}));

/** flushPendingSyncs가 겹쳐 돌지 않게 막는 빗장. 스토어 밖에 두어 상태 갱신과 얽히지 않게 한다. */
let isFlushingSyncs = false;

async function runFlushPendingSyncs(
  get: () => WorkoutStoreState
): Promise<{ sent: number; failed: number }> {
  const { history, settings, updateSessionSyncStatus } = get();
  if (!settings.gasWebhookUrl) return { sent: 0, failed: 0 };

  // 계속 실패하는 기록을 앱 켤 때마다 다시 쏘지 않는다.
  // 손으로 누르는 「다시 보내기」는 이 제한을 받지 않는다.
  const pending = history.filter(
    s => (s.syncStatus === 'pending' || s.syncStatus === 'failed') &&
         (s.syncAttempts ?? 0) < MAX_AUTO_SYNC_ATTEMPTS
  );

  let sent = 0;
  let failed = 0;

  for (const session of pending) {
    const prev = previousTops(history, session.id);
    const res = await syncWorkoutToGoogleDrive(
      session, 
      settings.gasWebhookUrl, 
      settings.gasSharedSecret, 
      prev,
      history
    );
    if (res.success) {
      updateSessionSyncStatus(session.id, 'synced');
      sent += 1;
    } else {
      updateSessionSyncStatus(session.id, 'failed', res.message);
      failed += 1;
    }
  }

  return { sent, failed };
}
