import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Search } from 'lucide-react';
import { 
  Exercise, 
  MuscleGroup, 
  MUSCLE_GROUPS, 
  ExerciseTier, 
  LoadType 
} from '../../types/workout';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { TIER_DEFAULTS, DEFAULT_INCREMENT, classifyExercise, TIER_LABEL } from '../../utils/progression';

const CARDIO_METRIC_KO: Record<string, string> = {
  speed: '속도', incline: '경사', level: '레벨', duration: '시간'
};

/** 유산소 종목이 뭘 기록하는지 한 줄로. 등급·증량단위 자리를 대신한다. */
function cardioMetricSummary(metrics: string[]): string {
  return metrics.map(m => CARDIO_METRIC_KO[m] ?? m).join(' · ');
}

export const ExerciseManager: React.FC = () => {
  const exercises = useWorkoutStore(state => state.exercises);
  const addExercise = useWorkoutStore(state => state.addExercise);
  const updateExercise = useWorkoutStore(state => state.updateExercise);
  const deleteExercise = useWorkoutStore(state => state.deleteExercise);

  const [selectedMuscle, setSelectedMuscle] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('가슴');
  const [tier, setTier] = useState<ExerciseTier>('secondary');
  const [loadType, setLoadType] = useState<LoadType>('barbell');
  const [incrementKg, setIncrementKg] = useState<number>(2.5);
  const [repRangeLow, setRepRangeLow] = useState<number>(8);
  const [repRangeHigh, setRepRangeHigh] = useState<number>(12);
  const [defaultRestSeconds, setDefaultRestSeconds] = useState<number>(150);
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setExerciseToEdit(null);
    setName('');
    const initMuscle = (selectedMuscle !== '전체' ? selectedMuscle : '가슴') as MuscleGroup;
    setMuscleGroup(initMuscle);
    const defaults = classifyExercise('', initMuscle);
    setTier(defaults.tier);
    setLoadType(defaults.loadType);
    setIncrementKg(defaults.incrementKg);
    setRepRangeLow(defaults.repRangeLow);
    setRepRangeHigh(defaults.repRangeHigh);
    setDefaultRestSeconds(defaults.defaultRestSeconds);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ex: Exercise) => {
    setExerciseToEdit(ex);
    setName(ex.name);
    setMuscleGroup(ex.muscleGroup);
    setTier(ex.tier || 'secondary');
    setLoadType(ex.loadType || 'barbell');
    setIncrementKg(ex.incrementKg ?? 2.5);
    setRepRangeLow(ex.repRangeLow ?? 8);
    setRepRangeHigh(ex.repRangeHigh ?? 12);
    setDefaultRestSeconds(ex.defaultRestSeconds || 150);
    setNotes(ex.notes || '');
    setIsModalOpen(true);
  };

  const handleTierChange = (newTier: ExerciseTier) => {
    setTier(newTier);
    const tierCfg = TIER_DEFAULTS[newTier];
    setRepRangeLow(tierCfg.repLow);
    setRepRangeHigh(tierCfg.repHigh);
    setDefaultRestSeconds(tierCfg.restSeconds);
  };

  const handleLoadTypeChange = (newLoadType: LoadType) => {
    setLoadType(newLoadType);
    setIncrementKg(DEFAULT_INCREMENT[newLoadType]);
  };

  const handleNameBlur = () => {
    if (!name.trim() || exerciseToEdit) return;
    // Auto-classify on name entry for new exercise if user hasn't changed defaults
    const classified = classifyExercise(name, muscleGroup);
    setTier(classified.tier);
    setLoadType(classified.loadType);
    setIncrementKg(classified.incrementKg);
    setRepRangeLow(classified.repRangeLow);
    setRepRangeHigh(classified.repRangeHigh);
    setDefaultRestSeconds(classified.defaultRestSeconds);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (exerciseToEdit) {
      updateExercise(exerciseToEdit.id, {
        name: name.trim(),
        muscleGroup,
        tier,
        loadType,
        incrementKg,
        repRangeLow,
        repRangeHigh,
        defaultRestSeconds,
        notes: notes.trim()
      });
    } else {
      addExercise(
        name.trim(), 
        muscleGroup, 
        tier, 
        loadType, 
        { min: repRangeLow, max: repRangeHigh }, 
        incrementKg, 
        defaultRestSeconds, 
        notes.trim()
      );
    }

    setIsModalOpen(false);
  };

  const filtered = exercises.filter(ex => {
    const matchesMuscle = selectedMuscle === '전체' || ex.muscleGroup === selectedMuscle;
    const matchesQuery = !searchQuery || ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMuscle && matchesQuery;
  });

  /** 유산소는 등급이라는 개념 자체가 없다(무게를 안 든다) — 배지를 그리지 않는다. */
  const getTierBadge = (ex: Exercise) => {
    if (ex.cardioMetrics?.length) return null;
    const t = ex.tier;
    if (t === 'primary') return { label: TIER_LABEL.primary, bg: 'bg-[#111111] text-white dark:bg-white dark:text-black' };
    if (t === 'isolation') return { label: TIER_LABEL.isolation, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    return { label: TIER_LABEL.secondary, bg: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200' };
  };

  return (
    <div className="space-y-5 pb-28 pt-4">
      {/* Header */}
      <div 
        className="flex items-center justify-between border-b pb-4"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div>
          <div className="text-[11px] font-bold opacity-50 uppercase tracking-wider">
            EXERCISES & PROGRESSION
          </div>
          <h2 className="text-3xl font-bold tracking-tight uppercase">
            운동 종목 관리
          </h2>
        </div>

        <button
          onClick={handleOpenAdd}
          className="nike-btn-outline h-9 px-4 text-xs font-bold flex items-center space-x-1"
        >
          <Plus className="w-4 h-4" />
          <span>+ 새 종목</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 opacity-40 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="운동 종목 검색 (예: 벤치프레스, 랫풀다운)..."
          className="w-full rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-all border"
          style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--card-border)',
            color: 'var(--canvas-text)'
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedMuscle('전체')}
          className={`tactile-btn text-xs px-3.5 py-1.5 rounded-full font-bold shrink-0 transition-all border ${
            selectedMuscle === '전체'
              ? 'shadow-sm'
              : 'opacity-60 hover:opacity-90'
          }`}
          style={{
            backgroundColor: selectedMuscle === '전체' ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)',
            color: selectedMuscle === '전체' ? 'var(--primary-btn-text)' : 'var(--canvas-text)',
            borderColor: 'var(--card-border)'
          }}
        >
          전체 ({exercises.length})
        </button>
        {MUSCLE_GROUPS.map(mg => {
          const count = exercises.filter(e => e.muscleGroup === mg).length;
          const isSelected = selectedMuscle === mg;
          return (
            <button
              key={mg}
              onClick={() => setSelectedMuscle(mg)}
              className={`tactile-btn text-xs px-3.5 py-1.5 rounded-full font-bold shrink-0 transition-all border ${
                isSelected
                  ? 'shadow-sm'
                  : 'opacity-60 hover:opacity-90'
              }`}
              style={{
                backgroundColor: isSelected ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)',
                color: isSelected ? 'var(--primary-btn-text)' : 'var(--canvas-text)',
                borderColor: 'var(--card-border)'
              }}
            >
              {mg} {count > 0 && <span className="opacity-60 text-[10px]">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Exercise List */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(ex => {
            const badge = getTierBadge(ex);
            const isCardio = !!ex.cardioMetrics?.length;
            const repLow = ex.repRangeLow ?? 8;
            const repHigh = ex.repRangeHigh ?? 12;
            const inc = ex.incrementKg ?? 2.5;

            return (
              <div
                key={ex.id}
                className="p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all"
                style={{ 
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--card-border)' 
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold">
                      {ex.name}
                    </h3>
                    {badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                        {badge.label}
                      </span>
                    )}
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: 'var(--card-soft-bg)',
                        borderColor: 'var(--card-border)'
                      }}
                    >
                      {ex.muscleGroup}
                    </span>
                  </div>
                  <div className="text-xs opacity-60 font-mono">
                    {isCardio
                      ? `유산소 · ${cardioMetricSummary(ex.cardioMetrics!)} 기록`
                      : `목표: ${repLow}~${repHigh}회 · 증량단위: ${inc}kg · 휴식: ${ex.defaultRestSeconds}초`}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(ex)}
                    className="tactile-btn p-2 opacity-50 hover:opacity-100 transition-colors"
                    title="종목 수정"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`'${ex.name}' 종목을 삭제하시겠습니까?`)) {
                        deleteExercise(ex.id);
                      }
                    }}
                    className="tactile-btn p-2 opacity-50 hover:opacity-100 hover:text-red-500 transition-colors"
                    title="종목 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div 
          className="p-10 rounded-2xl border border-dashed text-center space-y-3"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <p className="text-xs opacity-50">
            {searchQuery ? '검색된 종목이 없습니다.' : '등록된 운동 종목이 없습니다.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="nike-btn-primary px-7 mx-auto text-xs font-bold"
          >
            + 첫 종목 등록하기
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div 
            className="border w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl my-auto"
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
              <h3 className="text-lg font-bold">
                {exerciseToEdit ? '종목 수정' : '새 운동 종목 등록'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="tactile-btn p-1 opacity-60 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold opacity-80 uppercase block">
                종목 이름 *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="예: 바벨 벤치프레스, 랫풀다운"
                className="w-full border rounded-xl p-3 text-sm font-bold focus:outline-none"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)'
                }}
                autoFocus
              />
            </div>

            {/* Muscle Group */}
            <div className="space-y-1">
              <label className="text-xs font-bold opacity-80 uppercase block">
                타겟 근육 부위
              </label>
              <select
                value={muscleGroup}
                onChange={e => setMuscleGroup(e.target.value as MuscleGroup)}
                className="w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)'
                }}
              >
                {MUSCLE_GROUPS.map(mg => (
                  <option key={mg} value={mg}>{mg}</option>
                ))}
              </select>
            </div>

            {/* Tier Selector with Examples */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold opacity-80 uppercase block">
                종목 등급
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'primary', label: TIER_LABEL.primary, desc: '실패에서 멀리 · 3분 30초' },
                  { id: 'secondary', label: TIER_LABEL.secondary, desc: '실패 가까이 · 2분 30초' },
                  { id: 'isolation', label: TIER_LABEL.isolation, desc: '마지막은 실패까지 · 1분 30초' }
                ].map(t => {
                  const isSelected = tier === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTierChange(t.id as ExerciseTier)}
                      className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected ? 'ring-2 ring-[#111111] dark:ring-white font-bold' : 'opacity-70'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)',
                        color: isSelected ? 'var(--primary-btn-text)' : 'var(--canvas-text)',
                        borderColor: 'var(--card-border)'
                      }}
                    >
                      <span className="text-xs">{t.label}</span>
                      <span className="text-[9px] opacity-60 truncate">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Load Type & Increment */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold opacity-80 uppercase block">
                  기구 형태 (Load Type)
                </label>
                <select
                  value={loadType}
                  onChange={e => handleLoadTypeChange(e.target.value as LoadType)}
                  className="w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)'
                  }}
                >
                  <option value="barbell">바벨 (Barbell)</option>
                  <option value="dumbbell_pair">덤벨 쌍 (Dumbbell Pair)</option>
                  <option value="dumbbell_single">덤벨 1개 (Single DB)</option>
                  <option value="machine">머신 (Machine)</option>
                  <option value="cable">케이블 (Cable)</option>
                  <option value="bodyweight">맨몸 (Bodyweight)</option>
                  <option value="bodyweight_loaded">중량 맨몸 (Weighted)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold opacity-80 uppercase block">
                  증량 단위 (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={incrementKg}
                  onChange={e => setIncrementKg(parseFloat(e.target.value) || 0)}
                  className="w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)'
                  }}
                />
              </div>
            </div>

            {/* Rep Range */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold opacity-80 uppercase block">
                  목표 하단 횟수 (Min)
                </label>
                <input
                  type="number"
                  value={repRangeLow}
                  onChange={e => setRepRangeLow(parseInt(e.target.value) || 1)}
                  className="w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)'
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold opacity-80 uppercase block">
                  목표 상단 횟수 (Max)
                </label>
                <input
                  type="number"
                  value={repRangeHigh}
                  onChange={e => setRepRangeHigh(parseInt(e.target.value) || 1)}
                  className="w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)'
                  }}
                />
              </div>
            </div>

            {/* Rest Duration Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold opacity-80 uppercase block">
                기본 휴식 시간: {defaultRestSeconds}초
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[60, 90, 150, 210].map(sec => {
                  const isSelected = defaultRestSeconds === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDefaultRestSeconds(sec)}
                      className="py-2 text-xs font-bold rounded-xl border transition-all"
                      style={{
                        backgroundColor: isSelected ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)',
                        color: isSelected ? 'var(--primary-btn-text)' : 'var(--canvas-text)',
                        borderColor: 'var(--card-border)'
                      }}
                    >
                      {sec === 210 ? '3분30초' : sec === 150 ? '2분30초' : `${sec}초`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold opacity-80 uppercase block">
                자세/타겟 메모 (선택)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="예: 그립 너비, 덤벨 각도 등"
                className="w-full border rounded-xl p-2.5 text-xs focus:outline-none"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)'
                }}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="nike-btn-primary w-full shadow-lg"
            >
              {exerciseToEdit ? '수정 완료' : '종목 등록하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
