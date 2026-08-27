import React, { useEffect, useState } from 'react';

/**
 * 운동 경과 시간만 따로 그리는 컴포넌트.
 *
 * 원래는 이 1초짜리 상태가 운동 화면 최상단에 있어서, **매초 세트 입력칸까지
 * 화면 전체가 다시 그려졌다.** 세트가 25개쯤 되는 날에는 아이폰에서 눈에 띌 만큼
 * 버벅이고 배터리도 그만큼 먹는다. 다시 그려야 하는 건 이 숫자 하나뿐이라
 * 여기로 떼어 냈다. (외부 검토 지적, 2026-08-27 확인)
 *
 * 시간은 시작 시각과의 차이로 계산한다 — setInterval이 백그라운드에서 밀려도
 * 돌아왔을 때 숫자가 어긋나지 않는다.
 */
export const SessionStopwatch: React.FC<{ startTime: string }> = ({ startTime }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => calcElapsed(startTime));

  useEffect(() => {
    setElapsedSeconds(calcElapsed(startTime));
    const interval = setInterval(() => setElapsedSeconds(calcElapsed(startTime)), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <>{formatElapsed(elapsedSeconds)}</>;
};

function calcElapsed(startTime: string): number {
  const startMs = new Date(startTime).getTime();
  if (isNaN(startMs)) return 0;
  return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
}

function formatElapsed(totalSecs: number): string {
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}
