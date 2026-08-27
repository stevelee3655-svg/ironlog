import React from 'react';
import { calculateWeeklyVolume, TRACKED_MUSCLES } from '../../utils/progression';
import { WorkoutSession } from '../../types/workout';

interface WeeklyVolumeTrackerProps {
  history: WorkoutSession[];
  currentSession?: WorkoutSession | null;
  onClose?: () => void;
}

export const WeeklyVolumeTracker: React.FC<WeeklyVolumeTrackerProps> = ({
  history,
  currentSession,
  onClose
}) => {
  const summary = calculateWeeklyVolume(history, currentSession);
  const maxScale = 24; // Standard volume ceiling
  // 마커 지름(원 16px + 링 3px × 2). 트랙 양 끝에서 잘리지 않게 보정하는 데 쓴다.
  const MARKER_PX = 22;

  // Format date range (e.g. 8월 25일 – 31일)
  const formatRange = () => {
    try {
      const [sy, sm, sd] = summary.startDate.split('-').map(Number);
      const [ey, em, ed] = summary.endDate.split('-').map(Number);
      return `${sm}월 ${sd}일 – ${ed}일`;
    } catch {
      return `${summary.startDate} ~ ${summary.endDate}`;
    }
  };

  const underCount = summary.underTargetMuscles.length;

  return (
    <div
      className="weekly-volume-view rounded-3xl p-6 shadow-sm border space-y-6"
      style={{ background: 'var(--card-bg)', color: 'var(--canvas-text)', borderColor: 'var(--card-border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">이번 주 볼륨</h2>
          <p className="text-xs text-[#707072] dark:text-[#a1a1aa] mt-1 font-medium">
            {formatRange()} · 하드 세트 {summary.totalHardSets}
            {underCount > 0 ? ` · ${underCount}개 부위가 하한 미달` : ' · 전 부위 목표 달성 중'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f5f5f5] dark:bg-[#18181b] flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Muscle List */}
      <div className="divide-y divide-[#e5e5e5] dark:divide-[#27272a]">
        {summary.muscleStats
          .filter(ms => ms.hardSets > 0 || TRACKED_MUSCLES.includes(ms.muscleGroup))
          .map((ms, idx, arr) => {
            const isLast = idx === arr.length - 1;
            const zoneLeft = (ms.targetMin / maxScale) * 100;
            const zoneWidth = ((ms.targetMax - ms.targetMin) / maxScale) * 100;
            const markerLeft = Math.min(100, Math.max(0, (ms.hardSets / maxScale) * 100));

            return (
              <div key={ms.muscleGroup} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                {/* Top Row: Name, Badge, Count */}
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-base tracking-tight">{ms.muscleGroup}</span>
                    {ms.status === 'low' ? (
                      <span
                        className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-pill-bg)', color: 'var(--accent-pill-text)' }}
                      >
                        부족
                      </span>
                    ) : ms.status === 'high' ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white text-[#d30005] ring-1 ring-[#d30005]">
                        초과
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[#707072] dark:bg-[#18181b] dark:text-[#a1a1aa]">
                        범위
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#707072] font-mono">
                    <b className="text-sm text-[#111111] dark:text-white font-bold">{ms.hardSets}</b> / {ms.targetMin}~{ms.targetMax} 세트
                  </div>
                </div>

                {/* Track — 마커가 잘리지 않도록 클리핑은 트랙 배경에만 건다 */}
                <div className="relative h-6">
                  <div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{ background: 'var(--gauge-track-bg)' }}
                  >
                    {/* Target Zone */}
                    <div
                      className="absolute top-0 bottom-0 rounded-full transition-all duration-300"
                      style={{
                        background: 'var(--gauge-zone-bg)',
                        left: `${zoneLeft}%`,
                        width: `${zoneWidth}%`
                      }}
                    />
                  </div>
                  {/* Marker — 0%·100%에서도 트랙 안에 온전히 들어오도록 좌우로 밀어 준다 */}
                  <div
                    className="absolute top-1/2 w-4 h-4 rounded-full shadow-sm transition-all duration-300"
                    style={{
                      background: 'var(--card-bg)',
                      boxShadow: 'inset 0 0 0 3px var(--gauge-zone-bg)',
                      left: `calc(${markerLeft}% + ${(0.5 - markerLeft / 100) * MARKER_PX}px)`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                </div>

                {/* Scale on last row */}
                {isLast && (
                  <div className="relative h-3 mt-1 text-[9px] text-[#cacacb] font-mono select-none">
                    <span className="absolute left-0">0</span>
                    <span className="absolute left-[41.7%] -translate-x-1/2">10</span>
                    <span className="absolute left-[83.3%] -translate-x-1/2">20</span>
                    <span className="absolute right-0">24</span>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Footer Note */}
      <div className="pt-3 border-t border-[#e5e5e5] dark:border-[#27272a] text-[11px] leading-relaxed text-[#9e9ea0]">
        검은 구간이 그 부위의 목표 대역입니다(부위마다 다릅니다). 하드 세트만 집계됩니다 — 근력형 복합은 RIR 4 이내, 근비대형 복합·고립은 RIR 3 이내. 워밍업은 세지 않습니다.
      </div>
    </div>
  );
};
