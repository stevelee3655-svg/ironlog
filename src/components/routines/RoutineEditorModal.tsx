import React, { useState } from 'react';
import { X, Plus, Trash2, Layers } from 'lucide-react';
import { Routine, MuscleGroup, MUSCLE_GROUPS } from '../../types/workout';
import { useWorkoutStore } from '../../store/useWorkoutStore';

interface RoutineEditorModalProps {
  routineToEdit?: Routine | null;
  onClose: () => void;
}

export const RoutineEditorModal: React.FC<RoutineEditorModalProps> = ({
  routineToEdit,
  onClose
}) => {
  const exercises = useWorkoutStore(state => state.exercises);
  const addRoutine = useWorkoutStore(state => state.addRoutine);
  const updateRoutine = useWorkoutStore(state => state.updateRoutine);

  const [name, setName] = useState(routineToEdit?.name || '');
  const [description, setDescription] = useState(routineToEdit?.description || '');
  const [targetMuscles, setTargetMuscles] = useState<string[]>(routineToEdit?.targetMuscles || []);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(routineToEdit?.exerciseIds || []);
  const [defaultRestSeconds, setDefaultRestSeconds] = useState<number>(routineToEdit?.defaultRestSeconds || 90);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);

  const toggleMuscle = (muscle: string) => {
    setTargetMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  };

  const handleAddExercise = (exerciseId: string) => {
    setSelectedExerciseIds(prev => [...prev, exerciseId]);
    setIsExercisePickerOpen(false);
  };

  const handleRemoveExercise = (indexToRemove: number) => {
    setSelectedExerciseIds(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (routineToEdit) {
      updateRoutine(routineToEdit.id, {
        name: name.trim(),
        description: description.trim(),
        targetMuscles,
        exerciseIds: selectedExerciseIds,
        defaultRestSeconds
      });
    } else {
      addRoutine(
        name.trim(),
        targetMuscles,
        selectedExerciseIds,
        defaultRestSeconds,
        description.trim()
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="border w-full max-w-lg rounded-3xl p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--card-border)',
          color: 'var(--canvas-text)'
        }}
      >
        
        {/* Header */}
        <div 
          className="flex items-center justify-between border-b pb-3"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div>
            <div className="text-[10px] font-bold opacity-50 uppercase tracking-wider">
              ROUTINE CONFIGURATION
            </div>
            <h3 className="text-xl font-bold">
              {routineToEdit ? '루틴 수정' : '새 루틴 만들기'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="tactile-btn p-1.5 opacity-60 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Routine Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold opacity-80 uppercase block">
            루틴 이름 *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="예: 상체 루틴 A (가슴/등)"
            className="w-full border rounded-xl p-3 text-sm font-semibold focus:outline-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--input-border)',
              color: 'var(--input-text)'
            }}
          />
        </div>

        {/* Target Muscles */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold opacity-80 uppercase block">
            타겟 부위 선택
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map(mg => {
              const isSelected = targetMuscles.includes(mg);
              return (
                <button
                  key={mg}
                  type="button"
                  onClick={() => toggleMuscle(mg)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all border ${
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
                  {mg}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rest Duration Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold opacity-80 uppercase block">
            기본 휴식 시간
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {/* 종목 관리·설정 화면과 같은 값으로 맞춘다. */}
            {[60, 90, 150, 210].map(sec => {
              const isSelected = defaultRestSeconds === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDefaultRestSeconds(sec)}
                  className="py-2.5 text-xs font-bold rounded-xl transition-all border"
                  style={{
                    backgroundColor: isSelected ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)',
                    color: isSelected ? 'var(--primary-btn-text)' : 'var(--canvas-text)',
                    borderColor: 'var(--card-border)'
                  }}
                >
                  {sec}초
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Exercises Sequence */}
        <div 
          className="space-y-2 border-t pt-3"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold opacity-80 uppercase">
              포함된 종목 ({selectedExerciseIds.length}개)
            </label>
            <button
              type="button"
              onClick={() => setIsExercisePickerOpen(true)}
              className="text-xs font-bold underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>종목 추가</span>
            </button>
          </div>

          {selectedExerciseIds.length > 0 ? (
            <div 
              className="space-y-1.5 max-h-48 overflow-y-auto pr-1 divide-y"
              style={{ borderColor: 'var(--card-border)' }}
            >
              {selectedExerciseIds.map((exId, idx) => {
                const ex = exercises.find(e => e.id === exId);
                if (!ex) return null;
                return (
                  <div
                    key={`${exId}_${idx}`}
                    className="py-2 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xs font-black opacity-50 w-5">
                        {idx + 1}.
                      </span>
                      <div>
                        <h4 className="text-sm font-bold">{ex.name}</h4>
                        <span className="text-[11px] opacity-50">{ex.muscleGroup}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(idx)}
                      className="opacity-40 hover:opacity-100 hover:text-red-500 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs opacity-50 py-2">루틴에 포함할 종목을 추가하세요.</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-bold opacity-80 uppercase block">
            루틴 설명 (선택)
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="예: 주 2회 진행, 점진적 과부하 집중"
            className="w-full border rounded-xl p-2.5 text-xs focus:outline-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--input-border)',
              color: 'var(--input-text)'
            }}
          />
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="nike-btn-primary w-full shadow-lg"
        >
          {routineToEdit ? '루틴 수정 완료' : '루틴 등록하기'}
        </button>

      </div>

      {/* Nested Picker */}
      {isExercisePickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="border w-full max-w-sm rounded-3xl p-5 space-y-4 max-h-[80vh] flex flex-col shadow-2xl"
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--card-border)',
              color: 'var(--canvas-text)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--card-border)' }}>
              <h4 className="text-base font-bold">추가할 종목 선택</h4>
              <button
                onClick={() => setIsExercisePickerOpen(false)}
                className="tactile-btn p-1 opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-1 flex-1 pr-1 divide-y" style={{ borderColor: 'var(--card-border)' }}>
              {exercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => handleAddExercise(ex.id)}
                  className="w-full py-2.5 text-left flex items-center justify-between hover:pl-1 px-2 rounded-xl transition-all"
                >
                  <div>
                    <p className="text-sm font-bold">{ex.name}</p>
                    <span className="text-[11px] opacity-50">{ex.muscleGroup}</span>
                  </div>
                  <Plus className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
