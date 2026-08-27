import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  Trash2, 
  ChevronRight, 
  X, 
  ShieldAlert,
  Flame,
  Repeat2
} from 'lucide-react';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { WorkoutSession, MUSCLE_GROUPS } from '../../types/workout';
import { WorkoutSummaryModal } from './WorkoutSummaryModal';
import { RirGauge } from './RirGauge';
import { TIER_LABEL, substitutionCandidates } from '../../utils/progression';

interface ActiveWorkoutViewProps {
  onNavigateToRoutines: () => void;
  onNavigateToExercises: () => void;
  onNavigateToSettings: () => void;
}

const CONDITIONS = ['최상 🔥', '양호 👍', '보통 😐', '피곤 😴'];

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  onNavigateToRoutines,
  onNavigateToExercises,
  onNavigateToSettings
}) => {
  const activeSession = useWorkoutStore(state => state.activeSession);
  const exercises = useWorkoutStore(state => state.exercises);
  const routines = useWorkoutStore(state => state.routines);
  const history = useWorkoutStore(state => state.history);
  const startEmptySession = useWorkoutStore(state => state.startEmptySession);
  const startRoutineSession = useWorkoutStore(state => state.startRoutineSession);
  const toggleDeloadMode = useWorkoutStore(state => state.toggleDeloadMode);
  const addExerciseToActiveSession = useWorkoutStore(state => state.addExerciseToActiveSession);
  const removeExerciseFromActiveSession = useWorkoutStore(state => state.removeExerciseFromActiveSession);
  const substituteExerciseInActiveSession = useWorkoutStore(state => state.substituteExerciseInActiveSession);
  const addSetToExercise = useWorkoutStore(state => state.addSetToExercise);
  const removeSetFromExercise = useWorkoutStore(state => state.removeSetFromExercise);
  const updateSet = useWorkoutStore(state => state.updateSet);
  const toggleSetCompleted = useWorkoutStore(state => state.toggleSetCompleted);
  const updateActiveSessionDetails = useWorkoutStore(state => state.updateActiveSessionDetails);
  const finishActiveSession = useWorkoutStore(state => state.finishActiveSession);
  const cancelActiveSession = useWorkoutStore(state => state.cancelActiveSession);

  // Local state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [pickerFilter, setPickerFilter] = useState<string>('전체');
  const [finishedSession, setFinishedSession] = useState<WorkoutSession | null>(null);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [focusedSetMap, setFocusedSetMap] = useState<Record<string, string>>({}); // exerciseId -> active setId
  // 대체 창을 연 세션 종목의 id. 기구를 남이 쓰고 있을 때 그 자리에서 바꾼다.
  const [substituteFor, setSubstituteFor] = useState<string | null>(null);

  // Elapsed stopwatch timer (drift-free timestamp diff)
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const calcElapsed = () => {
      const startMs = new Date(activeSession.startTime).getTime();
      const nowMs = Date.now();
      const sec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(sec);
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startTime]);

  const formatElapsed = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleFinish = () => {
    const completed = finishActiveSession();
    if (completed) {
      setFinishedSession(completed);
    }
  };

  // If no active session, show Clean Home Screen
  if (!activeSession) {
    return (
      <div className="space-y-6 pb-28 pt-4">
        {/* Start Card */}
        <div 
          className="p-6 sm:p-7 rounded-[28px] border shadow-sm space-y-4 transition-all"
          style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--card-border)',
            color: 'var(--canvas-text)'
          }}
        >
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              오늘의 운동
            </h1>
            <p className="text-xs opacity-70 leading-relaxed font-normal">
              지난 기록과 방금 세트의 체감 난이도를 보고 다음 무게와 횟수를 정해준다.
            </p>
          </div>

          <button
            onClick={() => startEmptySession('자유 운동')}
            className="nike-btn-primary w-full shadow active:scale-95"
          >
            <span>운동 바로 시작하기</span>
          </button>
        </div>

        {/* Routines List */}
        <div className="space-y-3">
          <div 
            className="flex items-center justify-between px-1 border-b pb-2"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <h2 className="text-xs font-bold uppercase tracking-wider opacity-80">
              내 루틴 ({routines.length})
            </h2>
            <button
              onClick={onNavigateToRoutines}
              className="text-xs font-semibold hover:opacity-100 opacity-60 flex items-center transition-colors"
            >
              <span>루틴 관리</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {routines.length > 0 ? (
            <div className="space-y-2">
              {routines.map(rt => (
                <div
                  key={rt.id}
                  className="tactile-card p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all"
                  style={{ 
                    backgroundColor: 'var(--card-bg)', 
                    borderColor: 'var(--card-border)' 
                  }}
                >
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-base">{rt.name}</h3>
                    <p className="text-xs opacity-60 font-medium">
                      {rt.targetMuscles.join(' · ')} &nbsp;·&nbsp; {rt.exerciseIds.length}개 종목
                    </p>
                  </div>

                  <button
                    onClick={() => startRoutineSession(rt.id)}
                    className="tactile-btn h-8.5 px-4 rounded-full text-xs font-bold shadow-sm"
                    style={{ 
                      backgroundColor: 'var(--primary-btn-bg)', 
                      color: 'var(--primary-btn-text)' 
                    }}
                  >
                    시작
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="p-8 rounded-2xl border border-dashed text-center space-y-2"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <p className="text-xs opacity-50">등록된 루틴이 없습니다.</p>
              <button
                onClick={onNavigateToRoutines}
                className="text-xs font-bold underline underline-offset-4"
              >
                + 새 루틴 만들기
              </button>
            </div>
          )}
        </div>

        {/* Exercises Management Shortcut Card */}
        <div 
          className="p-4 rounded-2xl border flex items-center justify-between"
          style={{ 
            backgroundColor: 'var(--card-soft-bg)', 
            borderColor: 'var(--card-border)' 
          }}
        >
          <div>
            <div className="text-xs font-bold">
              운동 종목 목록
            </div>
            <div className="text-xs opacity-60">
              {exercises.length}개 종목 등록됨
            </div>
          </div>
          <button
            onClick={onNavigateToExercises}
            className="nike-btn-outline h-8 px-3.5 text-xs font-bold"
          >
            종목 관리
          </button>
        </div>

        {finishedSession && (
          <WorkoutSummaryModal
            session={finishedSession}
            onClose={() => setFinishedSession(null)}
            onNavigateToSettings={onNavigateToSettings}
          />
        )}
      </div>
    );
  }

  // Calculate Progress
  const totalPlannedSets = activeSession.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSetsCount = activeSession.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length, 0);
  const progressPercent = totalPlannedSets > 0 ? Math.round((completedSetsCount / totalPlannedSets) * 100) : 0;

  const filteredPickerExercises = pickerFilter === '전체'
    ? exercises
    : exercises.filter(e => e.muscleGroup === pickerFilter);

  return (
    <div className="space-y-0 pb-36 pt-2">
      {/* Session Header Card */}
      <div 
        className="p-5 rounded-2xl border shadow-sm space-y-3"
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--card-border)' 
        }}
      >
        {/* Top: Muscles, Condition, Deload Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold tracking-tight opacity-60 uppercase">
              {activeSession.targetMuscles.join(' · ') || '전신'}
            </span>
            {activeSession.isDeload && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black animate-pulse">
                디로드 모드
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1.5">
            <button
              onClick={toggleDeloadMode}
              className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${
                activeSession.isDeload 
                  ? 'bg-amber-500 text-black border-amber-600' 
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300'
              }`}
              title="디로드(피로 회복) 주간 모드 전환"
            >
              {activeSession.isDeload ? '디로드 ON' : '디로드'}
            </button>

            {CONDITIONS.map(c => {
              const isSelected = activeSession.condition === c;
              return (
                <button
                  key={c}
                  onClick={() => updateActiveSessionDetails({ condition: c })}
                  className={`tactile-btn text-[11px] px-2 py-0.5 rounded-full font-medium transition-all ${
                    isSelected ? 'shadow-sm' : 'opacity-60 hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)',
                    color: isSelected ? 'var(--primary-btn-text)' : 'var(--canvas-text)',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stopwatch Timer & Title */}
        <div className="flex items-baseline justify-between pt-0.5">
          <div className="text-5xl font-bold tracking-tight leading-none select-none font-mono">
            {formatElapsed(elapsedSeconds)}
          </div>

          {/* Session Title */}
          {isTitleEditing ? (
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                className="border px-2 py-0.5 text-xs font-bold focus:outline-none rounded"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)'
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  if (titleInput.trim()) updateActiveSessionDetails({ title: titleInput.trim() });
                  setIsTitleEditing(false);
                }}
                className="px-2 py-0.5 text-xs font-bold rounded"
                style={{ 
                  backgroundColor: 'var(--primary-btn-bg)', 
                  color: 'var(--primary-btn-text)' 
                }}
              >
                저장
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTitleInput(activeSession.title);
                setIsTitleEditing(true);
              }}
              className="text-xs opacity-60 hover:opacity-100 font-semibold underline underline-offset-2 truncate max-w-[140px]"
            >
              {activeSession.title}
            </button>
          )}
        </div>

        {/* Telemetry Stats */}
        <div 
          className="flex items-center justify-between text-xs pt-1 border-t"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <span className="font-bold">
            총 볼륨 {activeSession.totalVolumeKg.toLocaleString()} kg
          </span>
          <span className="font-semibold opacity-70">
            완료 {completedSetsCount} / {totalPlannedSets} 세트 ({progressPercent}%)
          </span>
        </div>

        {/* Progress Line */}
        <div 
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--card-soft-bg)' }}
        >
          <div 
            className="h-full transition-all duration-300 rounded-full"
            style={{ 
              width: `${progressPercent}%`,
              backgroundColor: 'var(--primary-btn-bg)'
            }}
          />
        </div>
      </div>

      {/* Hairline Divider */}
      <div 
        className="h-[1px] my-4"
        style={{ backgroundColor: 'var(--card-border)' }}
      />

      {/* Exercises Section */}
      <div className="space-y-4">
        {activeSession.exercises.length === 0 ? (
          <div 
            className="p-8 rounded-2xl border border-dashed text-center space-y-3"
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--card-border)' 
            }}
          >
            <p className="text-xs opacity-50">추가된 운동이 없습니다.</p>
            <button
              onClick={() => setIsExercisePickerOpen(true)}
              className="nike-btn-primary px-6 mx-auto text-xs font-bold"
            >
              + 운동 종목 추가
            </button>
          </div>
        ) : (
          activeSession.exercises.map((se) => {
            const repLow = se.repRangeLow ?? 8;
            const repHigh = se.repRangeHigh ?? 12;
            const restSec = se.sets[0]?.restSeconds || 150;
            const tierLabel = TIER_LABEL[se.tier ?? 'secondary'];

            // Find current active set (first uncompleted, or last set if all done)
            const uncompletedSet = se.sets.find(s => !s.isCompleted);
            const activeSet = (focusedSetMap[se.id] ? se.sets.find(s => s.id === focusedSetMap[se.id]) : null) 
              || uncompletedSet 
              || se.sets[se.sets.length - 1];

            const activeSetTargetRir = activeSet?.targetRir ?? (activeSet?.targetRpe !== undefined ? 10 - activeSet.targetRpe : 2);
            const isTargetCompleted = activeSet?.isCompleted ?? false;

            // 유산소 종목은 무게·횟수·RIR 대신 속도/경사/레벨/시간을 기록한다.
            const cardioMetrics = exercises.find(e => e.id === se.exerciseId)?.cardioMetrics;
            const isCardio = !!cardioMetrics && cardioMetrics.length > 0;
            const CARDIO_FIELDS = {
              speed:    { key: 'speedKmh'    as const, label: '속도', unit: 'km/h', step: 0.5 },
              incline:  { key: 'inclinePct'  as const, label: '경사', unit: '%',    step: 0.5 },
              level:    { key: 'level'       as const, label: '레벨', unit: '',     step: 1 },
              duration: { key: 'durationMin' as const, label: '시간', unit: '분',   step: 1 }
            };

            return (
              <div 
                key={se.id} 
                className="border rounded-2xl p-4 space-y-3 shadow-sm transition-colors duration-150 bg-white dark:bg-[#111113] border-[#e5e5e5] dark:border-[#27272a]"
              >
                {/* Exercise Header */}
                <div className="flex items-baseline justify-between pb-1">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">
                      {se.exerciseName}
                    </h3>
                    {se.substitutedFrom && (
                      <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--row-now-ring)' }}>
                        {se.substitutedFrom} 대신
                      </div>
                    )}
                    <div className="text-xs text-[#707072] dark:text-[#a1a1aa] font-medium mt-0.5">
                      {isCardio
                        ? `유산소 · ${cardioMetrics!.map(m => CARDIO_FIELDS[m].label).join(' · ')} 기록`
                        : `${tierLabel} · ${se.sets.length}세트 · ${repLow}–${repHigh}회 · 휴식 ${Math.floor(restSec/60)}:${String(restSec%60).padStart(2, '0')}`}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* 시작하기 전에만 바꾼다 — 한 세트라도 했으면 그대로 쭉 간다 */}
                    {!se.sets.some(s => s.isCompleted) && (
                      <button
                        onClick={() => setSubstituteFor(substituteFor === se.id ? null : se.id)}
                        className="p-1 transition-colors"
                        style={substituteFor === se.id
                          ? { opacity: 1, color: 'var(--row-now-ring)' }
                          : { opacity: 0.4 }}
                        title="다른 기구로 바꾸기"
                      >
                        <Repeat2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeExerciseFromActiveSession(se.id)}
                      className="opacity-40 hover:opacity-100 hover:text-red-500 p-1 transition-colors"
                      title="종목 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 대체 후보 — 기구를 남이 쓰고 있거나 그날 다른 게 끌릴 때 */}
                {substituteFor === se.id && (() => {
                  const candidates = substitutionCandidates(se, exercises);
                  return (
                    <div
                      className="rounded-xl border p-3 space-y-2"
                      style={{ background: 'var(--card-soft-bg)', borderColor: 'var(--card-border)' }}
                    >
                      <div className="text-xs font-bold">무엇으로 바꿀까</div>
                      <p className="text-[11px] opacity-70 leading-relaxed">
                        같은 부위를 같은 방식으로 때리는 순서로 골랐다.
                      </p>
                      {candidates.length === 0 ? (
                        <p className="text-[11px] opacity-60">
                          {se.muscleGroup}에 바꿔 넣을 다른 종목이 없다.
                        </p>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1 -mx-1 px-1">
                          {candidates.map(c => (
                            <button
                              key={c.exercise.id}
                              onClick={() => {
                                substituteExerciseInActiveSession(se.id, c.exercise.id);
                                setSubstituteFor(null);
                              }}
                              className="w-full text-left rounded-lg px-3 py-2 flex items-center justify-between border transition-colors"
                              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                            >
                              <span className="text-xs font-bold pr-2">{c.exercise.name}</span>
                              <span
                                className="text-[10px] whitespace-nowrap"
                                style={{ color: c.rank === 'same-movement' ? 'var(--row-now-ring)' : undefined, opacity: c.rank === 'same-movement' ? 1 : 0.55 }}
                              >
                                {c.note}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Table Header: # | 이전 | KG | 회 | RIR | 완료 (유산소는 다른 값을 쓴다) */}
                {!isCardio && (
                  <div className="grid grid-cols-12 text-[10px] font-bold text-[#9e9ea0] tracking-wider uppercase px-2">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3 text-left pl-1">이전</div>
                    <div className="col-span-3 text-center">KG</div>
                    <div className="col-span-2 text-center">회</div>
                    <div className="col-span-2 text-center">RIR</div>
                    <div className="col-span-1 text-center"></div>
                  </div>
                )}

                {/* Set Rows */}
                <div className="space-y-1.5">
                  {se.sets.map((set) => {
                    const isChecked = set.isCompleted;
                    const isNext = !isChecked && set.id !== activeSet?.id;

                    // ── 유산소: 무게·횟수 대신 속도/경사/레벨/시간 ──
                    if (isCardio) {
                      return (
                        <div
                          key={set.id}
                          onClick={() => setFocusedSetMap(prev => ({ ...prev, [se.id]: set.id }))}
                          className="flex items-center gap-2 h-12 px-2.5 rounded-xl cursor-pointer"
                          style={
                            isChecked
                              ? { background: 'var(--row-fill)', color: 'var(--row-fill-text)', border: '1px solid var(--row-fill)' }
                              : { background: 'transparent', color: 'var(--row-todo-text)', border: '1px solid var(--row-todo-border)' }
                          }
                        >
                          <span className="text-xs font-mono font-bold w-4 shrink-0 opacity-70">{set.setNumber}</span>

                          {cardioMetrics!.map((m) => {
                            const f = CARDIO_FIELDS[m];
                            const val = set[f.key];
                            return (
                              <div key={m} className="flex-1 flex items-center justify-center gap-1 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wide opacity-60 shrink-0">{f.label}</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step={f.step}
                                  value={val === undefined || isNaN(val as number) ? '' : val}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => {
                                    const raw = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                    updateSet(se.id, set.id, { [f.key]: raw === undefined || isNaN(raw) ? undefined : raw });
                                  }}
                                  placeholder="0"
                                  className={`w-12 text-center text-sm font-bold font-mono py-1 rounded-lg focus:outline-none min-w-0 ${
                                    isChecked
                                      ? 'bg-black/25 ring-1 ring-white/40'
                                      : 'bg-transparent border border-neutral-200 dark:border-neutral-700'
                                  }`}
                                  style={{ color: 'inherit' }}
                                />
                                {f.unit && (
                                  <span className="text-[10px] opacity-60 shrink-0">{f.unit}</span>
                                )}
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSetCompleted(se.id, set.id);
                              setFocusedSetMap(prev => ({ ...prev, [se.id]: set.id }));
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={
                              isChecked
                                ? { background: 'rgba(255,255,255,0.22)', color: 'var(--row-fill-text)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)' }
                                : { background: 'transparent', color: 'var(--row-todo-text)', boxShadow: 'inset 0 0 0 1.5px var(--row-todo-border)' }
                            }
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      );
                    }

                    const prevText = set.previousWeight !== undefined && set.previousReps !== undefined 
                      ? `${set.previousWeight}×${set.previousReps}` 
                      : '-';

                    const rirDisplay = set.actualRir !== undefined 
                      ? `${set.actualRir}` 
                      : (set.targetRir !== undefined ? `${set.targetRir}` : (set.targetRpe !== undefined ? `${10 - set.targetRpe}` : '-'));

                    return (
                      <div
                        key={set.id}
                        onClick={() => setFocusedSetMap(prev => ({ ...prev, [se.id]: set.id }))}
                        className="grid grid-cols-12 items-center h-12 px-2 rounded-xl cursor-pointer"
                        style={
                          // 상태는 딱 둘이다 — 한 세트는 칠하고, 안 한 세트는 안 칠한다.
                          // 예전에는 "지금 할 세트"를 중간 색으로 따로 표시했는데, 한 화면에
                          // 세 가지 색이 섞여 무엇이 무엇인지 오히려 읽히지 않았다
                          // (수환 지적, 2026-08-26). 어차피 위에서부터 순서대로 채우니까
                          // **칠해진 것 바로 다음 줄이 지금 할 세트**여서 따로 표시할 필요가 없다.
                          isChecked
                            ? {
                                background: 'var(--row-fill)',
                                color: 'var(--row-fill-text)',
                                border: '1px solid var(--row-fill)'
                              }
                            : {
                                background: 'transparent',
                                color: 'var(--row-todo-text)',
                                border: '1px solid var(--row-todo-border)'
                              }
                        }
                      >
                        {/* Set # */}
                        <div className="col-span-1 text-center text-xs font-mono font-bold">
                          {set.setNumber}
                        </div>

                        {/* Prev Set */}
                        <div className="col-span-3 text-left pl-1 text-xs font-mono opacity-60 truncate">
                          {prevText}
                        </div>

                        {/* Weight Input */}
                        <div className="col-span-3 flex items-center justify-center space-x-0.5">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            value={set.weightKg === undefined || isNaN(set.weightKg) ? '' : set.weightKg}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              updateSet(se.id, set.id, { weightKg: isNaN(val) ? 0 : val });
                            }}
                            placeholder="0"
                            className={`w-14 text-center text-sm font-bold font-mono py-1 rounded-lg focus:outline-none ${
                              isChecked
                                ? 'bg-black/25 ring-1 ring-white/40'
                                : 'bg-transparent border border-neutral-200 dark:border-neutral-700'
                            }`}
                            style={{ color: 'inherit' }}
                          />
                        </div>

                        {/* Reps Input */}
                        <div className="col-span-2 flex items-center justify-center space-x-0.5">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={set.reps === undefined || isNaN(set.reps) ? '' : set.reps}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              updateSet(se.id, set.id, { reps: isNaN(val) ? 0 : val });
                            }}
                            placeholder="0"
                            className={`w-11 text-center text-sm font-bold font-mono py-1 rounded-lg focus:outline-none ${
                              isChecked
                                ? 'bg-black/25 ring-1 ring-white/40'
                                : 'bg-transparent border border-neutral-200 dark:border-neutral-700'
                            }`}
                            style={{ color: 'inherit' }}
                          />
                        </div>

                        {/* RIR */}
                        <div className="col-span-2 text-center text-xs font-mono font-bold">
                          {rirDisplay}
                        </div>

                        {/* Check button */}
                        <div className="col-span-1 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSetCompleted(se.id, set.id);
                              setFocusedSetMap(prev => ({ ...prev, [se.id]: set.id }));
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={
                              isChecked
                                ? { background: 'rgba(255,255,255,0.22)', color: 'var(--row-fill-text)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)' }
                                : { background: 'transparent', color: 'var(--row-todo-text)', boxShadow: 'inset 0 0 0 1.5px var(--row-todo-border)' }
                            }
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 몇 개 채웠는지 한 줄로. 색 기준은 채움 여부라 따로 설명이 필요 없다. */}
                <div className="flex items-center pt-0.5 text-[11px] font-semibold tracking-wide"
                     style={{ color: 'var(--subdued-text)' }}>
                  <span>
                    <b style={{ color: 'var(--canvas-text)' }}>
                      {se.sets.filter(s => s.isCompleted).length}
                    </b>
                    {' / '}{se.sets.length} 세트 채움
                  </span>
                </div>

                {/* Add Set Button */}
                <div className="pt-0.5 flex space-x-2">
                  <button
                    onClick={() => addSetToExercise(se.id)}
                    className="flex-1 py-1.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-semibold opacity-70 hover:opacity-100 transition-all flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>세트 추가</span>
                  </button>
                </div>

                {/* Interactive RIR Gauge for Active Set (유산소에는 RIR 개념이 없다) */}
                {activeSet && !isCardio && (
                  <RirGauge
                    mode={isTargetCompleted ? 'record' : 'prescribe'}
                    targetRir={activeSetTargetRir}
                    selectedRir={activeSet.actualRir}
                    setNumber={activeSet.setNumber}
                    onPick={(pickedRir) => {
                      updateSet(se.id, activeSet.id, { actualRir: pickedRir });
                    }}
                    reason={se.recommendationReason}
                    adjustmentNotice={
                      se.lastAdjustment && se.lastAdjustment.setId === activeSet.id
                        ? { text: se.lastAdjustment.text, type: se.lastAdjustment.type }
                        : null
                    }
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Exercise Trigger Link */}
      <div 
        className="pt-3 pb-3 border-t mt-4"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <button
          onClick={() => setIsExercisePickerOpen(true)}
          className="nike-btn-outline w-full text-xs font-bold flex items-center justify-center space-x-1"
        >
          <Plus className="w-4 h-4" />
          <span>종목 추가</span>
        </button>
      </div>

      {/* Session Reflection Note */}
      <div 
        className="py-3 border-t space-y-1.5"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <label className="text-xs font-bold block opacity-80">
          세션 메모 (선택)
        </label>
        <textarea
          value={activeSession.generalNotes || ''}
          onChange={e => updateActiveSessionDetails({ generalNotes: e.target.value })}
          placeholder="특이사항, 중량 피드백, 컨디션 메모..."
          rows={2}
          className="w-full border rounded-xl p-3 text-xs focus:outline-none"
          style={{ 
            backgroundColor: 'var(--input-bg)', 
            borderColor: 'var(--input-border)',
            color: 'var(--input-text)'
          }}
        />
      </div>

      {/* Action Footer Buttons */}
      <div className="pt-4 space-y-2.5">
        <button
          onClick={handleFinish}
          className="nike-btn-primary w-full shadow-lg"
        >
          운동 완료 및 저장
        </button>

        <button
          onClick={() => setIsConfirmCancelOpen(false)}
          className="w-full text-center text-xs font-semibold opacity-40 hover:text-red-500 transition-colors py-1"
        >
          운동 취소
        </button>
      </div>

      {/* Exercise Picker Modal */}
      {isExercisePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="border-t sm:border w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl"
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--card-border)',
              color: 'var(--canvas-text)'
            }}
          >
            <div 
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <h3 className="text-lg font-bold">운동 종목 선택</h3>
              <button
                onClick={() => setIsExercisePickerOpen(false)}
                className="tactile-btn opacity-60 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Muscle Group Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-2">
              <button
                onClick={() => setPickerFilter('전체')}
                className="tactile-btn text-xs px-3.5 py-1.5 rounded-full font-bold shrink-0 transition-all border"
                style={{ 
                  backgroundColor: pickerFilter === '전체' ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)',
                  color: pickerFilter === '전체' ? 'var(--primary-btn-text)' : 'var(--canvas-text)',
                  borderColor: 'var(--card-border)'
                }}
              >
                전체
              </button>
              {MUSCLE_GROUPS.map(mg => (
                <button
                  key={mg}
                  onClick={() => setPickerFilter(mg)}
                  className="tactile-btn text-xs px-3.5 py-1.5 rounded-full font-bold shrink-0 transition-all border"
                  style={{ 
                    backgroundColor: pickerFilter === mg ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)',
                    color: pickerFilter === mg ? 'var(--primary-btn-text)' : 'var(--canvas-text)',
                    borderColor: 'var(--card-border)'
                  }}
                >
                  {mg}
                </button>
              ))}
            </div>

            {/* Exercises List */}
            <div 
              className="overflow-y-auto space-y-1 flex-1 pr-1 divide-y"
              style={{ borderColor: 'var(--card-border)' }}
            >
              {filteredPickerExercises.length > 0 ? (
                filteredPickerExercises.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      addExerciseToActiveSession(ex.id);
                      setIsExercisePickerOpen(false);
                    }}
                    className="tactile-card w-full py-3 text-left flex items-center justify-between hover:pl-1 transition-all"
                  >
                    <div>
                      <h4 className="text-base font-bold">{ex.name}</h4>
                      <span className="text-xs opacity-60 font-medium">
                        {ex.cardioMetrics?.length
                          ? `${ex.muscleGroup} · 유산소`
                          : `${ex.muscleGroup} · ${TIER_LABEL[ex.tier ?? 'secondary']} · 휴식 ${Math.round(ex.defaultRestSeconds / 60 * 10) / 10}분`}
                      </span>
                    </div>
                    <Plus className="w-4 h-4 opacity-50" />
                  </button>
                ))
              ) : (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs opacity-50">등록된 종목이 없습니다.</p>
                  <button
                    onClick={() => {
                      setIsExercisePickerOpen(false);
                      onNavigateToExercises();
                    }}
                    className="text-xs font-bold underline"
                  >
                    + 새 종목 등록하기
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {isConfirmCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="border w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl"
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--card-border)',
              color: 'var(--canvas-text)'
            }}
          >
            <h3 className="text-lg font-bold">운동 기록 취소</h3>
            <p className="text-xs opacity-70 leading-relaxed font-normal">
              현재 기록 중인 세션 데이터가 삭제됩니다. 정말 취소하시겠습니까?
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsConfirmCancelOpen(false)}
                className="nike-btn-outline text-xs font-bold"
              >
                계속 기록
              </button>
              <button
                onClick={() => {
                  cancelActiveSession();
                  setIsConfirmCancelOpen(false);
                }}
                className="tactile-btn py-2.5 rounded-full bg-red-600 text-white text-xs font-bold text-center"
              >
                취소(삭제)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finished Summary Modal */}
      {finishedSession && (
        <WorkoutSummaryModal
          session={finishedSession}
          onClose={() => setFinishedSession(null)}
          onNavigateToSettings={onNavigateToSettings}
        />
      )}
    </div>
  );
};
