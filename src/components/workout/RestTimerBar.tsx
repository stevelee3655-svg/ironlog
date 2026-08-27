import React, { useEffect } from 'react';
import { useWorkoutStore } from '../../store/useWorkoutStore';

export const RestTimerBar: React.FC = () => {
  const activeTimer = useWorkoutStore(state => state.activeTimer);
  const stopTimer = useWorkoutStore(state => state.stopTimer);
  const adjustTimer = useWorkoutStore(state => state.adjustTimer);
  const tickTimer = useWorkoutStore(state => state.tickTimer);

  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning) return;

    const interval = setInterval(() => {
      tickTimer();
    }, 500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tickTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [activeTimer?.isRunning, tickTimer]);

  if (!activeTimer) return null;

  const { remainingSeconds, totalSeconds, exerciseName, setNumber } = activeTimer;
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progressPercent = totalSeconds > 0 ? Math.min(100, Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100)) : 0;

  return (
    <aside 
      aria-label="휴식 타이머"
      className="fixed left-0 right-0 z-40 backdrop-blur-xl border-t px-5 py-3 transition-all shadow-md"
      style={{ 
        // 하단 메뉴는 4rem + 홈 인디케이터 여백(safe-area)만큼 높다.
        // 4rem만 띄우면 아이폰에서 타이머가 메뉴에 그만큼 가린다.
        bottom: 'calc(4rem + var(--safe-bottom, 0px))',
        backgroundColor: 'var(--header-bg)', 
        borderColor: 'var(--header-border)',
        color: 'var(--canvas-text)'
      }}
    >
      {/* Top progress line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: 'var(--card-soft-bg)' }}
      >
        <div 
          className="h-full transition-all duration-300"
          style={{ 
            width: `${progressPercent}%`,
            backgroundColor: 'var(--primary-btn-bg)'
          }}
        />
      </div>

      <div className="max-w-lg mx-auto flex items-center justify-between pt-0.5">
        
        {/* Left: Rest Label & Timer */}
        <div className="flex items-baseline space-x-3">
          <div>
            <div className="text-xs font-bold opacity-50 uppercase">
              휴식
            </div>
            <p className="text-[11px] opacity-70 font-medium truncate max-w-[120px]">
              {exerciseName ? `${exerciseName} ${setNumber ? `${setNumber}세트` : ''}` : '다음 세트'}
            </p>
          </div>

          <div className="text-3xl font-bold tracking-tight leading-none">
            {timeFormatted}
          </div>
        </div>

        {/* Right: Pill Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => adjustTimer(30)}
            className="nike-btn-outline h-9 px-3.5 text-xs font-bold"
            title="30초 증가"
          >
            +30초
          </button>
          
          <button
            onClick={stopTimer}
            className="nike-btn-outline h-9 px-3.5 text-xs font-bold"
            title="타이머 건너뛰기"
          >
            건너뛰기
          </button>
        </div>

      </div>
    </aside>
  );
};
