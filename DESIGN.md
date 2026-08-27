---
name: IronLog — Stripe
source: OneDrive/awesome-design-md/design-md/stripe/DESIGN.md
theme-id: stripe
colors:
  primary: "#533afd"
  primary-deep: "#4434d4"
  primary-press: "#2e2b8c"
  primary-soft: "#665efd"
  primary-subdued: "#b9b9f9"
  brand-dark-900: "#1c1e54"
  ruby: "#ea2261"
  magenta: "#f96bee"
  lemon: "#9b6829"
  canvas: "#ffffff"
  canvas-soft: "#f6f9fc"
  canvas-cream: "#f5e9d4"
  hairline: "#e3e8ee"
  hairline-input: "#a8c3de"
  ink: "#0d253d"
  ink-secondary: "#273951"
  ink-mute: "#64748d"
  on-primary: "#ffffff"
typography:
  family: "Inter, 'Noto Sans KR', sans-serif"
  display-weight: 300
  body-weight: 300
  button-weight: 400
  feature-settings: "ss01 (전역) · tnum (숫자 칸)"
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
spacing:
  unit: 8px
  card-padding: 24px
---

# IronLog 디자인 — Stripe

## 0. 이 문서의 위치

**정본은 여기가 아니다.** 값의 출처는
`C:\Users\이수환\OneDrive\awesome-design-md\design-md\stripe\DESIGN.md`이고,
이 문서는 그것을 IronLog에 어떻게 옮겼는지만 적는다. 값이 어긋나면 그쪽이 맞다.

2026-08-27 이전에는 이 자리에 **SpaceX 미션 컨트롤 시안**이 적혀 있었다. 앱은 그것을
따르지 않고 나이키 흑백 테마로 돌아가고 있었고, 문서와 화면이 서로 다른 말을 했다.
수환이 *"design.md의 디자인 가이드라인을 정확히 따라가. stripe로"* 라고 정리해서
Stripe로 갈아 끼웠다. 스페이스X 테마는 지금도 앱에 남아 있지만 **기본값이 아니다.**

## 1. 이 시스템의 정체성 셋

값을 옮길 때 이 셋을 놓치면 색만 인디고인 다른 앱이 된다.

1. **얇은 글자가 브랜드다.** 본문·제목 모두 두께 300이다. 원문은 이렇게 못 박는다 —
   *"Bumping to 400+ removes the brand's editorial air."* 버튼 글자와 10~12px 대문자
   라벨만 400으로 올린다. IronLog는 화면 전체가 `font-bold`로 짜여 있어서,
   `[data-theme="stripe"]` 안에서만 두께를 되돌린다(`src/index.css`).
2. **큰 글자에는 음수 자간.** 56px에서 -1.4px, 20px에서 -0.2px. 크기에 비례한다.
3. **숫자 칸은 고정폭(`tnum`).** 무게·횟수·볼륨이 자리마다 흔들리지 않는다.
   금융 데이터를 다루는 브랜드라는 티를 이 미세한 곳에서 낸다.

## 2. 색

- **인디고 `#533afd`** — 채워진 알약 버튼. 원문은 *"used sparingly: one filled pill
  per band"* 라고 한다. 한 카드에 채워진 버튼은 하나뿐이다.
- **잉크 `#0d253d`** — 모든 본문 글자. **순검정을 쓰지 않는다.**
- **캔버스 `#ffffff`** / **캔버스 소프트 `#f6f9fc`** — 기본 배경과 한 단계 눌린 면.
- **헤어라인 `#e3e8ee`** — 카드·표의 1px 테두리. 입력칸만 `#a8c3de`로 조금 차갑다.
- **루비 `#ea2261` · 마젠타 `#f96bee` · 레몬 `#9b6829`** — 그라디언트 띠 안에서만 쓴다.
  **버튼 색으로 쓰지 않는다.**

원문에는 오류·성공 같은 의미색 팔레트가 따로 없다(*"error / success states live in
dashboard-product UI specifically"*). 그래서 IronLog의 경고는 루비를 옅게 깐 바탕에
잉크로 쓴다.

## 3. 그라디언트 띠

이 브랜드에서 가장 먼저 알아보는 요소다. 크림 → 셔벗 → 라벤더 → 인디고 → 루비를
가로로 눕혀 **화면 위쪽을 가로지르고** 아래로 흰 캔버스에 녹인다.
IronLog에서는 헤더 뒤에 깔았다(`.stripe-mesh`, `Header.tsx`).

## 4. 서체

죄네(Söhne)는 클림 타입 파운드리의 유료 서체라 쓸 수 없다. **원문이 직접 공개 대체
서체를 지정한다** — Inter 두께 300에 `ss01`을 켜고 큰 글자에 음수 자간을 준다.
원문은 system-ui로 떨어지는 것을 **명시적으로 금지한다**(브랜드에 비해 두껍다).
한글은 Noto Sans KR 300으로 받는다.

## 5. 아이콘

`public/icon.svg`(파비콘)와 `public/apple-touch-icon.png`,
`public/icons/icon-{192,512}.png`가 **같은 도형**이고 색은 위의 팔레트다.

PNG는 `scripts/make-icons.cjs`가 만든다. 저장소에 SVG 래스터라이저가 없어서
사각형과 원을 직접 그리는 쪽을 택했다(그 하나 때문에 sharp를 넣지 않았다).
**도형을 고치면 SVG와 PNG를 같이 고쳐야 한다.**

2026-08-27 이전에는 매니페스트가 `/icons/icon-192x192.png`를 가리키는데 그 파일이
아예 없었다. 폰 홈 화면에 추가하면 아이콘이 비어 있었다.

## 6. 검증 기준

- 375px(아이폰)에서 가로 스크롤이 생기지 않는다. 알약 버튼은 접히지 않는다.
- 무게·횟수 계산의 단위 시험 통과(`npm test`).
- 배포 전에 로컬 개발 서버로 띄워 **화면을 눈으로 확인한다.**
  수환은 코드 diff나 테스트 출력으로는 판단하지 않는다.
