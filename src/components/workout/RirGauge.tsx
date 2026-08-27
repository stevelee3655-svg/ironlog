import React from 'react';

interface RirGaugeProps {
  mode: 'prescribe' | 'record';
  targetRir: number;
  selectedRir?: number;
  setNumber: number;
  onPick?: (rir: number) => void;
  reason?: string;
  adjustmentNotice?: {
    text: string;
    type: 'increase' | 'decrease' | 'neutral';
  } | null;
}

const STOPS = [0, 1, 2, 3, 4];

/** 눈금 i의 가운데 위치(%). 눈금 5칸이 각각 20%를 차지한다. */
const centerOf = (i: number) => (i + 0.5) * 20;

export const RirGauge: React.FC<RirGaugeProps> = ({
  mode,
  targetRir,
  selectedRir,
  setNumber,
  onPick,
  reason,
  adjustmentNotice
}) => {
  // 목표 구간은 목표 ±1. 니파드는 RPE를 "정밀한 과녁이 아니라 흐릿한 구간"이라 부른다.
  const zoneStart = Math.max(0, targetRir - 1);
  const zoneEnd = Math.min(4, targetRir + 1);

  const picked = mode === 'record' ? selectedRir : undefined;
  const caretAt = mode === 'record' ? picked : targetRir;
  const caretLabel = mode === 'record' ? '내 기록' : '목표';

  // 문장이 아니라 라벨로 쓴다. 눈금과 화살표가 이미 뜻을 말하고 있어서
  // 설명을 덧붙이면 매번 같은 문장을 읽게 된다.
  const headline = mode === 'record' ? '몇 개 남았어?' : '남길 개수';

  const subLabel = mode === 'record' ? '' : `${setNumber}세트`;

  return (
    <div className="gauge-container mt-5 select-none">
      {/* 머리말 */}
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--canvas-text)' }}>
          {headline}
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
          style={{ color: 'var(--subdued-text)' }}
        >
          {subLabel}
        </span>
      </div>

      {/* 눈금 트랙 */}
      <div
        className="relative h-12 rounded-full overflow-hidden"
        style={{ background: 'var(--gauge-track-bg)' }}
      >
        {/* 목표 구간 */}
        <div
          className="absolute top-0 bottom-0 rounded-full transition-all duration-200"
          style={{
            background: 'var(--gauge-zone-bg)',
            left: `${zoneStart * 20}%`,
            width: `${(zoneEnd - zoneStart + 1) * 20}%`
          }}
        />

        <div className="absolute inset-0 grid grid-cols-5">
          {STOPS.map((v) => {
            const inZone = v >= zoneStart && v <= zoneEnd;
            const isAim = mode === 'prescribe' && v === targetRir;
            const isPick = mode === 'record' && v === picked;

            return (
              <button
                key={v}
                type="button"
                disabled={mode === 'prescribe'}
                onClick={() => onPick && onPick(v)}
                aria-label={`${v === 4 ? '4개 넘게' : `${v}개`} 더 할 수 있었다`}
                className={`flex items-center justify-center transition-all ${
                  mode === 'record' ? 'cursor-pointer active:scale-95' : 'cursor-default'
                }`}
              >
                <div
                  className={`w-full h-full flex items-center justify-center rounded-full transition-all ${
                    isPick ? 'm-1.5 text-lg font-bold' : isAim ? 'text-lg font-bold' : 'text-base font-semibold'
                  }`}
                  style={
                    isPick
                      ? {
                          background: 'var(--card-bg)',
                          color: 'var(--gauge-zone-bg)',
                          boxShadow: 'inset 0 0 0 2px var(--gauge-zone-bg)'
                        }
                      : inZone
                      ? { color: 'var(--gauge-zone-text)' }
                      : { color: 'var(--subdued-text)' }
                  }
                >
                  {v === 4 ? '4+' : v}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 화살표 — 어느 눈금이 목표인지(또는 내가 뭘 골랐는지) 짚어 준다 */}
      <div className="relative h-4 mt-1">
        {caretAt !== undefined && (
          <div
            className="absolute flex flex-col items-center transition-all duration-200"
            style={{ left: `${centerOf(caretAt)}%`, transform: 'translateX(-50%)' }}
          >
            <span
              className="block w-0 h-0"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: '6px solid var(--gauge-zone-bg)'
              }}
            />
            <span
              className="text-[10px] font-bold whitespace-nowrap mt-0.5"
              style={{ color: 'var(--gauge-zone-bg)' }}
            >
              {caretLabel}
            </span>
          </div>
        )}
      </div>

      {/* 조정 결과 또는 추천 근거 */}
      {adjustmentNotice && (
        <div
          className="mt-3.5 pt-3 text-xs leading-relaxed animate-check-pop"
          style={{ borderTop: '1px solid var(--card-border)' }}
        >
          <div
            className="text-sm font-semibold tracking-tight"
            style={{
              color:
                adjustmentNotice.type === 'increase'
                  ? '#007d48'
                  : adjustmentNotice.type === 'decrease'
                  ? '#d30005'
                  : 'var(--canvas-text)'
            }}
          >
            {adjustmentNotice.text}
          </div>
        </div>
      )}

      {reason && !adjustmentNotice && (
        <div
          className="mt-3.5 pt-3 text-xs leading-relaxed"
          style={{ borderTop: '1px solid var(--card-border)', color: 'var(--subdued-text)' }}
        >
          {reason}
        </div>
      )}
    </div>
  );
};
