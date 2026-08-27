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
  /**
   * 참이면 **눈금 숫자가 「도와주는 힘」**이다(어시스트 풀업 등).
   * 숫자를 올릴수록 쉬워지므로, 실제로 몸이 감당한 무게는 `체중 − 눈금`이다.
   * 이 표시가 없으면 앱은 숫자가 오를수록 발전이라고 읽어 **퇴보를 발전으로 기록한다.**
   */
  isAssisted?: boolean;
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
  /** 눈금이 「도와주는 힘」인 기구인지. Exercise에서 복사해 둔다(기록만 보고도 알아야 한다). */
  isAssisted?: boolean;
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
  /**
   * 자동 재전송을 몇 번 시도했는지. 웹훅 주소가 잘못돼 있으면 앱을 켤 때마다
   * 실패한 기록 전부를 다시 쏘게 되는데, 기록이 쌓일수록 그게 수십 건이 된다.
   * 일정 횟수를 넘기면 자동 재시도를 멈추고, 기록 화면의 「다시 보내기」로만
   * 시도하게 한다. (외부 검토 지적, 2026-08-27)
   */
  syncAttempts?: number;
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
  /**
   * 체중(kg). 어시스트 기구에서 **실제로 든 무게 = 체중 − 보조 무게**를 구하는 데 쓴다.
   * 자주 갱신하지 않아도 된다 — 값이 조금 낡아도 세션끼리의 진행 비교는 그대로 성립한다.
   */
  bodyWeightKg?: number;
}

export interface SyncResponse {
  success: boolean;
  filename?: string;
  message?: string;
  timestamp?: string;
}
