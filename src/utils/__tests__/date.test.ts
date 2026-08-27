import { describe, it, expect } from 'vitest';
import { localDateKey } from '../date';

describe('localDateKey', () => {
  it('현지 시각 기준으로 날짜를 만든다', () => {
    const d = new Date(2026, 7, 27, 7, 30); // 2026-08-27 07:30 현지
    expect(localDateKey(d)).toBe('2026-08-27');
  });

  it('한 자리 월·일을 0으로 채운다', () => {
    expect(localDateKey(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });

  /**
   * UTC+9인 한국에서 오전 9시 전 운동이 전날로 찍히던 버그.
   * toISOString()을 쓰면 이 검사가 깨진다.
   */
  it('UTC+9 기준 이른 아침에도 오늘 날짜를 준다', () => {
    const d = new Date(2026, 7, 27, 0, 30); // 자정 30분
    expect(localDateKey(d)).toBe('2026-08-27');
    expect(localDateKey(d)).not.toBe(d.toISOString().split('T')[0]);
  });
});
