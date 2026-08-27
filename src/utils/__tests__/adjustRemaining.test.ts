import { describe, it, expect } from 'vitest';
import { stepAtLeastOne, roundToIncrement } from '../progression';

/**
 * 실시간 무게 교정이 "바뀐 척만 하고 제자리에 머무는" 문제를 잠근다.
 * 화면에는 "+5%(20→20kg) 교정"이라고 뜨는데 실제로는 아무 일도 안 일어났다.
 */
describe('stepAtLeastOne', () => {
  it('증량 단위가 커서 반올림이 제자리면 한 칸 올린다', () => {
    // 20kg, 증량단위 5kg → 20*1.05 = 21 → 반올림하면 다시 20
    expect(roundToIncrement(20 * 1.05, 5)).toBe(20);
    expect(stepAtLeastOne(20, 20 * 1.05, 5, 'up')).toBe(25);
  });

  it('감량도 마찬가지로 제자리면 한 칸 내린다', () => {
    // 20kg, 증량단위 5kg → 20*0.9 = 18 → 반올림하면 다시 20
    expect(roundToIncrement(20 * 0.9, 5)).toBe(20);
    expect(stepAtLeastOne(20, 20 * 0.9, 5, 'down')).toBe(15);
  });

  it('반올림만으로 충분히 움직이면 그 값을 그대로 쓴다', () => {
    // 100kg, 증량단위 2.5kg → 105 → 그대로
    expect(stepAtLeastOne(100, 105, 2.5, 'up')).toBe(105);
    expect(stepAtLeastOne(100, 90, 2.5, 'down')).toBe(90);
  });

  it('파운드 기반 기구(2.27kg)에서도 움직인다', () => {
    const inc = 2.27;
    const up = stepAtLeastOne(22.7, 22.7 * 1.05, inc, 'up');
    expect(up).toBeGreaterThan(22.7);
  });

  it('한 칸도 못 내려갈 만큼 가벼우면 그 자리에 둔다', () => {
    // 5kg, 증량단위 5kg → 한 칸 내리면 0kg이 된다
    expect(stepAtLeastOne(5, 4.5, 5, 'down')).toBe(5);
  });
});
