export type MuscleGroup = 
  | '가슴' 
  | '등' 
  | '하체' 
  | '어깨' 
  | '삼두' 
  | '이두' 
  | '복근' 
  | '전완' 
  | '유산소' 
  | '전신' 
  | '기타';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  '가슴',
  '등',
  '하체',
  '어깨',
  '삼두',
  '이두',
  '복근',
  '전완',
  '유산소',
  '전신',
  '기타'
];

export type AppTheme = 'nike' | 'stripe' | 'spacex' | 'claude';

// Jeff Nippard The Muscle Ladder Classifications
export type ExerciseTier = 'primary' | 'secondary' | 'isolation';
export type LoadType = 
  | 'barbell' 
  | 'dumbbell_pair' 
  | 'dumbbell_single' 
  | 'machine' 
  | 'cable' 
  | 'bodyweight' 
  | 'bodyweight_loaded';

/** 유산소 기구에서 기록할 값. 무게·횟수 대신 이걸 입력한다. */
export type CardioMetric = 'speed' | 'incline' | 'level' | 'duration';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  defaultRestSeconds: number;
  tier: ExerciseTier;
  loadType: LoadType;
  incrementKg: number;
  repRangeLow: number;
  repRangeHigh: number;
  /** 있으면 유산소 종목으로 다룬다 — 무게·횟수·게이지 대신 이 값들을 입력받는다. */
  cardioMetrics?: CardioMetric[];
  notes?: string;
  createdAt: string;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  isCompleted: boolean;
  // 유산소 전용 — 종목에 cardioMetrics가 있을 때만 쓴다
  speedKmh?: number;
  inclinePct?: number;
  level?: number;
  durationMin?: number;
  targetRpe?: number;             // 목표 RPE (예: 6, 7, 8, 9, 10)
  targetRir?: number;             // 10 - targetRpe
  actualRir?: number;             // 사용자가 탭한 실제 RIR (0, 1, 2, 3, 4+)
  rpe?: number;                   // 10 - actualRir
  restSeconds?: number;
  previousWeight?: number;
  previousReps?: number;
  recommendationReason?: string;  // 한 줄 추천 근거
  isHardSet?: boolean;            // 주운동 RPE 6+ / 보조·고립 RPE 7+
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  tier?: ExerciseTier;
  loadType?: LoadType;
  incrementKg?: number;
  repRangeLow?: number;
  repRangeHigh?: number;
  sets: WorkoutSet[];
  notes?: string;
  recommendationReason?: string;
  recommendationAction?: string;
  /** RIR을 탭한 직후 남은 세트가 어떻게 조정됐는지. 게이지 아래에 한 줄로 보여준다. */
  lastAdjustment?: {
    setId: string;
    text: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  /**
   * 시작하기 전에 다른 기구로 바꿨을 때, 원래 하려던 종목의 이름.
   * 기구에 자리가 없어서 바꾸는 일이 잦은데, 그냥 갈아치우면 "왜 계획과 다른가"가
   * 기록에서 사라진다. 나중에 정체 원인을 되짚을 때 필요하다.
   */
  substitutedFrom?: string;
}

export interface WorkoutSession {
  id: string;
  title: string;
  routineId?: string;
  routineName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO string
  endTime?: string; // ISO string
  durationMinutes: number;
  exercises: SessionExercise[];
  totalVolumeKg: number;
  totalSets: number;
  targetMuscles: string[];
  condition?: string;
  generalNotes?: string;
  isDeload?: boolean;
  syncStatus: 'synced' | 'pending' | 'failed' | 'not_configured';
  syncedAt?: string;
  syncError?: string;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  targetMuscles: string[];
  exerciseIds: string[];
  defaultRestSeconds: number;
  createdAt: string;
}

export interface AppSettings {
  gasWebhookUrl: string;
  gasSharedSecret: string;
  autoStartTimer: boolean;
  defaultRestSeconds: number;
  enableSound: boolean;
  enableVibration: boolean;
  autoSyncOnFinish: boolean;
  theme: AppTheme;
  consecutiveTrainingWeeks?: number;
}

export interface SyncResponse {
  success: boolean;
  filename?: string;
  message?: string;
  timestamp?: string;
}
