import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react';
import { Routine } from '../../types/workout';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { RoutineEditorModal } from './RoutineEditorModal';

interface RoutineManagerProps {
  onStartRoutine: (routineId: string) => void;
}

export const RoutineManager: React.FC<RoutineManagerProps> = ({ onStartRoutine }) => {
  const routines = useWorkoutStore(state => state.routines);
  const exercises = useWorkoutStore(state => state.exercises);
  const deleteRoutine = useWorkoutStore(state => state.deleteRoutine);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<Routine | null>(null);

  const handleEdit = (rt: Routine) => {
    setRoutineToEdit(rt);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setRoutineToEdit(null);
    setIsEditorOpen(true);
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
            ROUTINES
          </div>
          <h2 className="text-3xl font-bold tracking-tight uppercase">
            내 운동 루틴
          </h2>
        </div>

        <button
          onClick={handleCreate}
          className="nike-btn-outline h-9 px-4 text-xs font-bold"
        >
          + 새 루틴
        </button>
      </div>

      {/* Routine Cards */}
      {routines.length > 0 ? (
        <div className="space-y-3">
          {routines.map(rt => {
            const routineExercises = rt.exerciseIds
              .map(id => exercises.find(e => e.id === id))
              .filter(Boolean);

            return (
              <div
                key={rt.id}
                className="p-5 rounded-2xl space-y-4 border shadow-sm transition-all"
                style={{ 
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--card-border)' 
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xl">
                      {rt.name}
                    </h3>
                    {rt.description && (
                      <p className="text-xs opacity-70 font-medium">{rt.description}</p>
                    )}
                    <div className="text-xs opacity-50 font-semibold pt-0.5">
                      {rt.targetMuscles.join(' · ')} &nbsp;·&nbsp; 휴식 {rt.defaultRestSeconds}초
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(rt)}
                      className="tactile-btn p-2 opacity-50 hover:opacity-100 transition-colors"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`'${rt.name}' 루틴을 삭제하시겠습니까?`)) {
                          deleteRoutine(rt.id);
                        }
                      }}
                      className="tactile-btn p-2 opacity-50 hover:opacity-100 hover:text-red-500 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Exercises list */}
                <div 
                  className="border-t pt-3"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <div className="text-[10px] font-bold opacity-50 uppercase mb-2 tracking-wider">
                    종목 순서 ({routineExercises.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {routineExercises.map((ex, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-3 py-1 border rounded-full font-bold"
                        style={{ 
                          backgroundColor: 'var(--card-soft-bg)', 
                          borderColor: 'var(--card-border)' 
                        }}
                      >
                        <span className="opacity-50 mr-1">{idx + 1}.</span>
                        {ex?.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Launch Button */}
                <button
                  onClick={() => onStartRoutine(rt.id)}
                  className="nike-btn-primary w-full shadow-md"
                >
                  이 루틴으로 운동 시작
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div 
          className="p-10 rounded-2xl border border-dashed text-center space-y-3"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <p className="text-xs opacity-50">등록된 루틴이 없습니다.</p>
          <button
            onClick={handleCreate}
            className="nike-btn-primary px-7 mx-auto text-xs font-bold"
          >
            + 첫 루틴 만들기
          </button>
        </div>
      )}

      {isEditorOpen && (
        <RoutineEditorModal
          routineToEdit={routineToEdit}
          onClose={() => {
            setIsEditorOpen(false);
            setRoutineToEdit(null);
          }}
        />
      )}
    </div>
  );
};
