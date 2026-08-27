/**
 * 날짜 키를 **현지 시각 기준**으로 만든다.
 *
 * `toISOString()`은 UTC로 바꿔 버린다. 한국은 UTC+9라서 오전 9시 전에 운동하면
 * 세션 날짜가 **하루 전으로 찍혔다.** 새벽·아침 운동이 전날 기록에 붙는다는 뜻이다.
 * (Jules 검토가 짚고, 코드에서 직접 확인 — 2026-08-27)
 *
 * 스토어·마크다운·동기화가 모두 같은 규칙을 써야 해서 여기 한 곳에 둔다.
 * (순환 import를 피하려고 스토어 안이 아니라 별도 파일이다.)
 */
export function localDateKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
