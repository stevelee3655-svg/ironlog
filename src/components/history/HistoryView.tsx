import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronRight, 
  Check,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { WorkoutSession } from '../../types/workout';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { HistoryDetailModal } from './HistoryDetailModal';
import { WeeklyVolumeTracker } from './WeeklyVolumeTracker';

export const HistoryView: React.FC = () => {
  const history = useWorkoutStore(state => state.history);
  const flushPendingSyncs = useWorkoutStore(state => state.flushPendingSyncs);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [isFlushing, setIsFlushing] = useState(false);

  const pendingCount = history.filter(s => s.syncStatus === 'pending' || s.syncStatus === 'failed').length;

  const handleFlush = async () => {
    setIsFlushing(true);
    await flushPendingSyncs();
    setIsFlushing(false);
  };

  return (
    <div className="space-y-5 pb-28 pt-4">
      {/* Header */}
      <div 
        className="border-b pb-4 flex items-center justify-between"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div>
          <div className="text-[11px] font-bold opacity-50 uppercase tracking-wider">
            HISTORY & VOLUME
          </div>
          <h2 className="text-3xl font-bold tracking-tight uppercase">
            운동 기록 & 볼륨
          </h2>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={handleFlush}
            disabled={isFlushing}
            className="nike-btn-outline h-8 px-3 text-xs font-bold flex items-center space-x-1.5 text-amber-600 border-amber-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFlushing ? 'animate-spin' : ''}`} />
            <span>대기 {pendingCount}건 전송</span>
          </button>
        )}
      </div>

      {/* 1. Weekly Volume Tracker (Jeff Nippard The Muscle Ladder Volume Targets) */}
      <WeeklyVolumeTracker history={history} />

      {/* 2. Pending Sync Alert Banner */}
      {pendingCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs text-amber-900 dark:text-amber-300 font-medium">
          <div className="flex items-center space-x-2">
            <CloudOff className="w-4 h-4 text-amber-600" />
            <span>전송 대기 중인 기록이 <b>{pendingCount}개</b> 있습니다.</span>
          </div>
          <button
            onClick={handleFlush}
            disabled={isFlushing}
            className="text-xs font-bold underline underline-offset-2"
          >
            {isFlushing ? '전송 중...' : '지금 재시도'}
          </button>
        </div>
      )}

      {/* 3. Session List Header */}
      <div className="flex items-center justify-between px-1 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">
          완료된 운동 목록 ({history.length})
        </h3>
      </div>

      {/* History List */}
      {history.length > 0 ? (
        <div className="space-y-2.5">
          {history.map(session => {
            const isSynced = session.syncStatus === 'synced';

            return (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="tactile-card w-full text-left space-y-2 rounded-2xl border p-4.5 transition-all shadow-sm group"
                style={{ 
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--card-border)',
                  color: 'var(--canvas-text)'
                }}
              >
                {/* Top: Date & Sync */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 opacity-50" />
                    <span className="font-mono text-xs font-bold">{session.date}</span>
                    {session.condition && (
                      <span 
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                        style={{ 
                          backgroundColor: 'var(--card-soft-bg)', 
                          borderColor: 'var(--card-border)' 
                        }}
                      >
                        {session.condition}
                      </span>
                    )}
                  </div>

                  <span 
                    className="text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1 border"
                    style={{ 
                      backgroundColor: isSynced ? 'var(--primary-btn-bg)' : 'var(--card-soft-bg)', 
                      color: isSynced ? 'var(--primary-btn-text)' : 'var(--canvas-text)',
                      borderColor: 'var(--card-border)' 
                    }}
                  >
                    {isSynced && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{isSynced ? '저장 완료' : '대기 중'}</span>
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-lg font-bold group-hover:underline underline-offset-2">
                    {session.title}
                  </h3>
                  <div className="text-xs opacity-50 font-semibold">
                    {session.targetMuscles.join(' · ') || '전신'} &nbsp;·&nbsp; {session.exercises.length}개 종목
                  </div>
                </div>

                {/* Summary Line */}
                <div 
                  className="flex items-center justify-between pt-1 text-xs border-t opacity-80"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-bold">{session.totalVolumeKg.toLocaleString()} kg</span>
                    <span className="opacity-30">/</span>
                    <span>{session.totalSets} 세트</span>
                    <span className="opacity-30">/</span>
                    <span className="opacity-70">{session.durationMinutes} 분</span>
                  </div>

                  <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div 
          className="p-10 rounded-2xl border border-dashed text-center space-y-2"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <p className="text-xs opacity-50">완료된 운동 기록이 없습니다.</p>
        </div>
      )}

      {selectedSession && (
        <HistoryDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};
