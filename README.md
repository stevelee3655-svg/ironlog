# 🏋️ IronLog — Gym Workout Tracker & Google Drive LLM Wiki Sync PWA

아이폰 Safari **"홈 화면에 추가"**로 네이티브 앱처럼 동작하며, 운동을 마치는 즉시 사용자의 Google Drive Second Brain(`Wiki/raw/건강/YYYY-MM-DD_운동.md`)으로 **AI 에이전트/LLM이 완벽하게 파싱 가능한 정형 마크다운 문서**를 자동 전송하는 헬스장 전용 PWA 앱입니다.

---

## ✨ 핵심 기능

1. **Google Drive LLM Wiki 실시간 자동 전송**:
   - 운동 완료 버튼을 누르면 즉시 `Wiki/raw/건강/` 폴더에 YAML Frontmatter + 세트별 마크다운 테이블이 포함된 문서가 자동 생성됩니다.
   - Google Apps Script(GAS) Webhook 방식을 사용하여 모바일 Safari에서 복잡한 OAuth 로그인이나 토큰 만료 없이 100% 안정적으로 작동합니다.
   - 오프라인/네트워크 불안정 시에도 클립보드 원터치 복사 및 `.md` 파일 다운로드 폴백을 제공합니다.

2. **100% 나만의 커스텀 운동 종목 & 루틴**:
   - 불필요한 수천 개의 내장 운동 없이, **내가 실제로 수행하는 운동만** 부위별(가슴, 등, 하체, 어깨, 삼두, 이두, 복근, 유산소 등)로 깔끔하게 등록합니다.
   - 상체/하체/부위별 루틴을 미리 구성하여 헬스장에서 원클릭으로 운동을 시작할 수 있습니다.

3. **기성 앱(Hevy/Planfit)급 헬스장 UX & 스마트 휴식 타이머**:
   - 땀 묻은 손가락으로도 터치하기 쉬운 고대비 다크 테마 UI.
   - 세트 완료 체크 시 설정된 시간(예: 90초) 카운트다운 타이머가 자동 시작되며, 완료 시 Web Audio 비프음과 햅틱 진동으로 알려줍니다.
   - 이전 세트 무게/횟수 자동 프리필, 실시간 총 볼륨(kg) 및 완료 세트 수 계산.

4. **Local-First & 오프라인 지원**:
   - 헬스장 지하에서 인터넷이 끊겨도 `LocalStorage`에 실시간 자동 임시 저장(Auto-save)되어 브라우저를 닫아도 안전하게 복구됩니다.

---

## 🚀 로컬 실행 방법

```bash
# 프로젝트 폴더 이동
cd C:\Users\이수환\.gemini\antigravity\scratch\ironlog-workout

# 패키지 설치
npm install

# 로컬 개발 서버 실행
npm run dev

# 테스트 실행
npm test

# 프로덕션 빌드
npm run build
```

---

## 📱 아이폰(iPhone) 홈 화면 앱으로 설치하기 (PWA)

1. Vercel, Netlify, Cloudflare Pages, 또는 GitHub Pages에 원클릭 무료 배포합니다 (또는 로컬 네트워크 IP로 접속).
2. 아이폰 **Safari 브라우저**로 해당 웹앱 주소에 접속합니다.
3. 하단 중앙의 **공유 버튼(네모에서 화살표 나가는 아이콘)**을 탭합니다.
4. **[홈 화면에 추가]**를 선택합니다.
5. 홈 화면에 생성된 **IronLog 아이콘**을 누르면 주소창 없는 **100% 전체화면 네이티브 앱**으로 실행됩니다.

---

## 🔗 Google Drive 연동 설정 (1분 완료)

1. [Google Drive](https://drive.google.com) 접속 → **[새로 만들기] → [더보기] → [Google Apps Script]** 클릭
2. 앱의 **[설정] 탭 → [스크립트 코드]**에 제공된 `Code.gs` 전체를 복사하여 붙여넣고 저장 (<kbd>Ctrl+S</kbd>)
3. 우측 상단 **[배포] → [새 배포]** 클릭:
   - 유형: **웹 앱 (Web App)** 선택
   - 다음 사용자로 실행: **나 (내 계정)**
   - 액세스 권한: **모든 사용자 (Anyone)** (모바일 PWA 전송 필수)
4. 배포 완료 후 발급된 **웹 앱 URL (`https://script.google.com/macros/s/.../exec`)**을 IronLog 앱 [설정]에 붙여넣고 **[연결 테스트]**를 누르면 끝!

---

## 🤖 AI 에이전트 / Second Brain 활용법

- 운동이 완료되면 `내 드라이브/Wiki/raw/건강/2026-08-26_운동_상체 루틴 A.md` 파일이 생성됩니다.
- PC의 Obsidian이나 AI 에이전트(Claude, Gemini 등)에게 **"오늘 운동 분석해줘"** 또는 **"정리해줘"**라고 요청하면, YAML Frontmatter와 운동 테이블을 읽어 볼륨 추이, 점진적 과부하, 피로도를 `wiki/concepts/운동_분석.md`에 자동으로 정리합니다.
