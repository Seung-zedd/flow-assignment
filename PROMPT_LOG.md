# PROMPT_LOG — AI 활용 & 개발 기록

> 과제 안내문 §4 (AI 활용 & 개발 기록) 제출용.
> 환경: Claude Code (Sonnet 5) + MoAI-ADK 3.1.2, 출력 스타일 MoAI-Easy. 프롬프트 원문은 그대로 보존하고, 의도·결과·판단은 뒤에 덧붙임.
> 표기: 🟢 채택 / 🟡 수정 후 채택 / 🔴 폐기 / ⏳ 미정

---

## 1. 타임라인 (프롬프트 · 의도 · 결과)

### 2026-08-29 — 세션 1: 환경 정리 & 기술 스택 결정

#### #01 `! moai cc -k` (터미널 명령, 2회 실행)
- **의도**: MoAI의 칸반 모드(lead/plan/run/sync 세션을 나눠 협업하는 모드)로 과제를 시작하려 함.
- **결과**: 두 가지 오류로 즉시 종료.
  - `Input must be provided either through stdin or as a prompt argument when using --print`
  - `SessionEnd hook ... Executable not found in $PATH: "bash"`
- **AI 진단**:
  - 오류 1은 moai 바이너리가 Claude를 `--print`(헤드리스) 모드로 띄우면서 프롬프트를 못 넘긴 것. 프로젝트 규칙 파일(`cross-session-messaging.md`)에 세션 간 메시징이 **네이티브 Windows에서는 미지원**이라 명시돼 있어 칸반 모드 자체가 이 환경에서 성립하지 않음.
  - 오류 2는 `.claude/settings.json`의 `env.PATH`가 PATH를 통째로 덮어쓰면서 `C:\Program Files\Git\usr\bin`(bash 위치)을 빠뜨린 것. 새 PowerShell에서는 `where.exe bash`가 정상 탐지됨 → settings의 PATH 문자열만 문제.
- **판단**: 🟢 PATH 수정 채택(1줄, 되돌리기 쉬움) / 🔴 칸반 모드 폐기(Windows 미지원) → 일반 세션에서 진행.
- **검증**: settings.json의 PATH 문자열을 PowerShell에 그대로 적용해 `Get-Command bash` → `C:\Program Files\Git\usr\bin\bash.exe` 확인.

#### #02 (AskUserQuestion 응답) `PATH 수정 + 칸반 없이 과제 진행 (권장)`
- **의도**: 환경 문제는 최소 수정으로 닫고, 과제 본체로 빨리 넘어가기.
- **결과**: `.claude/settings.json:485` PATH 앞에 `C:\Program Files\Git\usr\bin;C:\Program Files\Git\bin;` 추가.

#### #03 (AI가 기술 스택을 물었을 때 → 답 대신 방향 수정)
> https://github.com/Seung-zedd 내가 지금까지 만든 레포(Lucidify 포함)에서 최적의 기술 스택을 적용할 만한게 없을까? 그리고 아마 까먹었을텐데 과제_파일업로드_AI개발.md의 4. AI 활용 & 개발 기록 (필수 제출)은 필수
- **의도**:
  1. AI가 제시한 일반적인 스택 후보(Next.js / FastAPI 등) 대신, **내가 이미 운영해 본 스택**을 기준으로 고르게 하기 — 면접에서 "왜 이 스택인지"를 실제 경험으로 설명할 수 있어야 하므로.
  2. AI가 §4(AI 활용 기록)를 빠뜨리지 않도록 못 박기.
- **AI 작업**: `gh repo list` + `gh api`로 40개 레포의 언어·의존성·배포 설정을 조사.
- **결과 (요약)**:
  | 레포 | 스택 | 배포 | 과제 연관 |
  |---|---|---|---|
  | cubrain (실서비스) | Java 21 · Spring Boot 3.5 · PostgreSQL · Flyway · Svelte 5 | Docker → Railway, GitHub Actions | PDF 업로드 처리(`FileDropzone.svelte`, `PdfIngestionController`), JPA 감사(`BaseEntity`) 보유 |
  | lucidify | SvelteKit(Svelte 5) · Supabase · adapter-vercel | Vercel | 서버리스 API 라우트, Vercel 배포 경험 |
  | sbb_board | Spring Boot 3.4 · Thymeleaf · JPA | Docker | 서버 렌더링 화면 |
  - 로컬 환경: `JAVA_HOME`=jdk-21(단, PATH의 `java`는 JRE 8), Node 24, pnpm 11, gh/Vercel CLI, Docker Desktop(미실행).
- **AI 제안**: cubrain 스택 기반 + 배포 형태 4가지(백엔드/프론트 분리, Spring 단일, Thymeleaf, SvelteKit 단독) 제시.
- **판단**: ⏳ (아래 #04에서 방향 재질문)

#### #04 (AskUserQuestion 응답 — 옵션 대신 직접 입력)
> 아 그러니까 파일 업로드에 제일 최적화된 기술스택은 cubrain이란 말이지? 만약에 lucidify 방식으로 깔끔하게 vercel로 무료 호스팅 및 배포하고 sveltekit를 사용하면 어떻지?
- **의도**: AI의 "cubrain 권장"이 **기술적 최적**인지, **경험 재사용** 때문인지 구분해서 확인. 과제 규모(작음)와 무료 호스팅·단일 배포를 고려하면 SvelteKit + Vercel이 더 단순할 수 있다는 가설 제시.
- **AI 답변 요지**: cubrain은 "최적"이 아니라 "이미 다뤄본 코드가 있음"이었음을 정정. SvelteKit + Vercel은 이 과제 규모에 적합하며, 대신 **서버리스 특유의 제약(요청 본문 크기 한도, 영구 디스크 없음, 무료 DB의 절전/일시정지 정책)** 을 고려사항으로 문서화해야 함. (상세는 CONSIDERATIONS.md에 반영 예정)
- **같은 응답에서 결정**: 🟢 PROMPT_LOG.md는 AI가 매 단계 자동 기록, 회고(§3)는 본인이 직접 작성.

#### #05
> 그치? 굳이 무겁고 환경세팅하는데 시간 다날라가는 스프링부트3을 기술 스택으로 채택할 필요가 없지? 다량 컬렉션 조회에 유리한 JPA를 사용할 것도 아니고
- **의도**: SvelteKit + Vercel 채택을 확정하고, Spring Boot를 제외하는 근거를 내 말로 정리.
- **AI 답변**: 결론 동의. 단 근거 표현을 정정 — JPA의 강점은 "다량 조회"가 아니라 "복잡한 객체 관계 매핑"이며(다량 조회는 오히려 N+1을 조심해야 하는 영역), 이 과제는 테이블 2개·정책 행 최대 207개로 ORM·컨테이너·상시 서버를 정당화할 크기가 아님. 절약한 세팅 시간을 채점 비중 1위인 "고려사항의 깊이"에 쓰는 것이 합리적.
- **최종 결정**: 🟢 **SvelteKit(Svelte 5) + Neon PostgreSQL + Vercel Blob → Vercel 단일 배포**. cubrain 경험은 코드가 아니라 CONSIDERATIONS.md의 비교 근거로 활용.
- **다음 단계**: `/moai plan`으로 SPEC(요구사항·인수 기준) 작성.

#### #06 (AI 주도) `/moai plan "..."` 호출
- **의도**: 확정 스택과 과제 §2·§3·§5 요구사항을 한 번에 담아 SPEC 워크플로 시작. 워크플로 사전 질문 3개에 응답 — 프로젝트 문서 인터뷰 **건너뜀**(백지 프로젝트, 안내문이 곧 제품 문서), 디자인 방향 단계 **건너뜀**(과제가 화면보다 고려사항 평가), GitHub Issue **생성**(요구사항→구현 추적을 레포에 남김).
- **AI 작업**: 동기화 검사(origin/main 차이 0, 다른 세션 없음) 후 `manager-spec` 에이전트(Opus)에 plan.md 초안 작성 위임. 지시에 "코드 작성 금지", OWASP 파일 업로드 체크리스트 스킬 선행 로드, Vercel 본문 한도·Blob 한도는 공식 문서로 검증 후 URL 인용 포함.

#### #07
> 커밋메시지도 이번 과제 전형에서만 ko로 설정해줘
- **의도**: 커밋 메시지를 한국어로 — 단, 이 프로젝트에 한정.
- **결과**: 🟢 `.moai/config/sections/language.yaml:22` `git_commit_messages: "en"` → `"ko"`. 프로젝트 안 설정 파일이라 다른 레포에는 영향 없음. (곁가지 확인에서 `error_messages`도 en으로 남아 있음을 알렸고, 그건 그대로 둠.)

#### #08 `/goal` (세션 목표 설정)
> 그리고 나 저녁 먹고 있을테니까 내가 판단 필요한 부분 직전까지만 알아서 작업해줘. 컨테이너에도 단순 구현 및 RED -> GREEN TDD까지는 glm한테 위임한다가 작성되어있는데(/pillwriter 포함) 여기에도 그 규칙이 적용되어 있니?
- **의도**: ① 자리 비운 동안 자율 진행하되 **판단 게이트에서는 멈추게** 하기(자율 vs 승인 경계 명시). ② 다른 프로젝트(컨테이너·pillwriter)에서 쓰던 "기계적 구현·RED→GREEN은 GLM(저비용 모델)에 위임" 규칙이 이 프로젝트에도 상속됐는지 확인.
- **AI 조사 결과**: 그 규칙은 `C:\Users\sdok1\projects\CLAUDE.md` (63-64행 `fast-worker` 라우팅, 267-276행 "Mechanical work routes to GLM first")에 있고, pillwriter는 `projects/` 하위라 **부모 CLAUDE.md를 상속**해서 적용됨. flow-assignment는 `C:\Users\sdok1\code\` 아래라 부모 CLAUDE.md가 없음 → **이 프로젝트에는 적용되지 않음**. 이 프로젝트 CLAUDE.md의 GLM 언급(§12·§15)은 MoAI 표준의 CG 모드 설명일 뿐 위임 규칙이 아님. 게다가 현재 세션은 `GLM_API_KEY` 미설정·tmux 없음이라 규칙을 복사해도 즉시 효력 없음 — GLM 위임은 `moai glm`으로 **별도 세션을 띄워야** 하는 세션 단위 스위치.
- **판단**: 🟢 사용자 결정 "ㅇㅇ 그러면 (a)로 가자" — run 단계는 Claude/Opus(manager-develop) 유지. 근거: 코드량이 작아 절약 폭이 작고, 채점 비중은 고려사항·AI 활용 판단에 있음.

#### #09
> 아 그리고 practice-for-claude-code-architecture에서 설정한 pkg-global-chain 훅하고 preToolUse, PostToolUse, 그리고 Stop 훅도 여기에 설정했는지 확인해줘. 어짜피 저 레포는 실습용이기 때문에 웬만한 히스토리 내역들을 여기에 적용해도 문제 없을꺼야
- **의도**: 실습 레포(`C:\Users\sdok1\projects\practice-for-claude-code-architecutre`)에서 만든 보안 훅(공급망·유출 방지·.env 보호)과 편의 훅(자동 lint·변경 파일 표시)이 이 과제에도 있는지 확인하고, 없으면 옮기도록 사전 승인.
- **AI 조사**: 실습 레포 `.claude/hooks/` 5개 스크립트 + `permissions.deny` 21개 확인. flow-assignment에는 **모두 없음**(MoAI 기본 훅만 있고 `.env` 읽기 ask만 존재). "pkg-global-chain"은 `block-npm-supply-chain-risk.js`(npm 공급망 훅) + `pkg-check`(`projects/pkg-supply-chain-check.sh`) 조합을 가리킴.
- **AI 판단(적용 시 수정점)**: ① ESM `import` 스크립트라 package.json 없는 현 상태에선 `.mjs`로 저장 ② pnpm 사용 프로젝트라 `pnpm dlx/exec/add -g` 규칙 추가, 단 pnpm 10은 의존성 lifecycle 스크립트를 기본 차단하므로 `--ignore-scripts` 강제는 npm에만 ③ `.env.example`은 README용으로 작성해야 하므로 차단 예외 ④ settings PATH에 `C:\Program Files\nodejs` 추가(훅 실행기가 node를 찾도록).
- **결과**: (아래 #10에서 적용 내역·검증 기록)

#### #10 (AI 주도) 실습 레포 훅 이관 + 검증
- **적용 내역**:
  - `.claude/hooks/guards/` 신설, 5개 스크립트를 `.mjs`로 이관: `block-env-edit`(`.env.example` 예외 추가) · `block-curl-command` · `block-npm-supply-chain-risk`(pnpm dlx/exec/pnpx 검사 추가, `sv`·`svelte-kit`·`svelte-check`·`vercel` 허용) · `lint-on-edit` · `show-changed-files-on-stop`(원본 그대로).
  - `.claude/settings.json` hooks 등록: PreToolUse(Edit/Write → env 가드, Bash → curl·공급망 가드), PostToolUse(lint-on-edit), Stop(변경 파일 표시). 모두 exec form(`node` + args).
  - `permissions.deny` 27개 추가(curl/wget/nc, `.env`·`.env.local`·`.env.development`·`.env.production`·`.env.*.local` 읽기·편집, npm/pnpm 전역 설치, `npx -y`/`npm exec -y`). 기존 `ask`의 `Read(./.env*)` 2개는 deny로 승격돼 제거. `.env.example`은 의도적으로 열어 둠.
  - `env.PATH`에 `C:\Program Files\nodejs` 추가.
- **검증**: `.moai/state/verify/guards/test-guards.mjs` 17개 케이스 **ALL PASS** (출력: 같은 폴더 `test-guards.out`). settings.json JSON 파싱 OK. 훅이 살아 있다는 실증 — 검증 명령어 자체가 새 훅에 두 번 차단됨(명령 텍스트에 `curl`, `pnpm dlx some-random-pkg` 포함). 이후 테스트는 파일 스크립트로 우회.
- **판단**: 🟡 원본 수정 후 채택 (ESM→.mjs, pnpm 대응, `.env.example` 예외, 허용 목록 확장). `lint-on-edit`는 MoAI `handle-post-tool.sh`(LSP 진단)와 일부 겹치지만 eslint 실행은 MoAI 쪽에 없어 보완 관계로 판단해 유지. Stop 훅이 MoAI 기본 7개 + 1개가 되어 매 턴 변경 파일 목록이 뜨는 소음은 감수(과제 기록 관점에서 오히려 유용).

#### #11 (AI 주도) SPEC 초안 완성 → 검토 게이트
- **에이전트 산출물**: `.moai/specs/SPEC-UPLOAD-001/plan.md` (347줄). manager-spec(Opus)이 OWASP 파일 업로드 체크리스트 스킬을 먼저 로드한 뒤 작성. 결정 8개(데이터 모델·200개 상한·11단계 검증 파이프라인·입력 정규화·API·DB 계층·운영·테스트), 고려사항 매트릭스 26항목(과제 19 + 자체 발굴 7), 마일스톤 M1~M4, 위험 6, MX 태그 계획, 검증 URL 5개·패키지 버전 8개·미검증 1개.
- **오케스트레이터(AI) 검토에서 잡은 보완점 3개** — 초안이 놓친 것:
  1. `jpg`/`jpeg`·`tif`/`tiff`·`htm`/`html` 별칭 미처리 → 정상 `.jpeg`가 `EXTENSION_CONTENT_MISMATCH`로 오거부.
  2. "판별 타입 ≠ 선언 확장자면 거부"가 과도(`.txt` 이름의 PNG까지 거부). 과제 예시는 "판별 결과가 차단 목록에 있을 때 거부"만으로도 충족 — 정책 선택과 근거 필요.
  3. prefix 스니핑(`<svg`, `<!DOCTYPE html` 등) 감지 후 동작 미정의 — 무조건 거부면 정상 `.html`이 막힘.
- **판단**: 🟢 사용자 선택 "보완점 3개 반영시킨 뒤 SPEC 파일 생성까지 진행". 오케스트레이터 검토 메모 3건을 manager-spec에 주석으로 넘겨 plan.md 수정 → spec.md / acceptance.md / spec-compact.md 생성 → plan-auditor 감사 → GitHub Issue 순으로 진행.

#### #12
> 어? 혹시 general-moai-adk(컨테이너)의 spec-interrogator는 없니?
- **의도**: 다른 프로젝트에서 만든 "SPEC 적대적 심문" 에이전트(사람이 결정해야 할 지점만 뽑아내고 답은 절대 하지 않음)를 이 과제 SPEC에도 적용하고 싶음. 과제 §3 "요건에 없는 위험을 스스로 발견"과 §4 "AI 결과를 비판적으로 취사선택" 둘 다에 직결.
- **AI 확인**: 있음 — `C:\Users\sdok1\projects\.claude\agents\spec-interrogator.md`(전역 링크, Opus/high). 입력은 SPEC 디렉터리 경로만(작성 맥락은 규칙상 무시), 5개 공격 범주(내부 모순·중의적 문장·암묵 가정·검증 불가·조용한 제품 결정)를 강제로 훑고, 산출물은 `docs/review/SPEC-UPLOAD-001/question/interrogation-draft.md`(한국어 질문 초안). 설계상 plan-auditor(기계적 검증) **다음 단계**로 돌리게 돼 있음.
- **판단**: 🟢 워크플로에 편입 — plan-auditor PASS 후 실행, 질문 초안을 다음 판단 게이트에 감사 결과와 함께 제시. 사용자가 단 답은 CONSIDERATIONS.md 근거와 §4-3 회고의 1차 재료가 됨.

#### #13
> 굿. 혹시 이 과제 전형에도 C:\Users\sdok1\projects\pillwriter\core-skills 적용이 되어있니? @../../projects/pillwriter/ 여기에서 너의 추천을 하지 않고 내 스스로 플래그를 설정하는 spec-authority도 적용이 됬는지 궁금해. 이건 단순한 과제 전형이니까 내가 판단하기에는 필요 없을 것 같아 도메인이 그렇게 복잡한 것도 아니고
- **의도**: 다른 프로젝트(pillwriter)의 두 장치 — `core-skills/` 문서 4종과 "AI가 추천을 먼저 내지 않고 founder가 플래그를 직접 판정하는" SPEC 리뷰 권한 규칙 — 가 여기 상속됐는지 확인. 후자는 이 과제 규모엔 과하다는 본인 판단을 먼저 밝힘.
- **AI 확인**: 둘 다 **미적용**. ① `core-skills/`는 flow-assignment에 폴더도, CLAUDE.md 참조도 없음(공급망 훅만 #10에서 별도 이관). ② 해당 규칙은 pillwriter `CLAUDE.md` §3 "SPEC Review Pipeline" + `.claude/rules/local/spec-review-authority.md`에 있고, 이 프로젝트 CLAUDE.md에는 §3 자체가 없음. 실증: 지금까지 AskUserQuestion마다 `(권장)` 라벨을 붙여 왔는데 그 규칙([HARD] "No AI recommendation reaches the founder before their independent judgment")이 살아 있었다면 위반이었을 것.
- **판단**: 🟢 사용자 판단에 동의 — 3단계 founder 판정 파이프라인(질문→답변 파일→확정 항목만 반영)은 미적용 유지. 근거: 도메인이 작고, 과제 §4는 오히려 "AI 추천 + 사용자의 비판적 취사선택" 과정 자체를 평가함. 대신 그 규칙의 핵심 가치 하나는 이미 흡수 — spec-interrogator를 "질문만, 답 없음" 원칙 그대로 2단계로 실행(#12). AI 추천은 계속 `(권장)`으로 표시하되 근거를 같이 적고, 사용자가 뒤집은 경우를 이 로그에 남긴다.

#### #14 (AI 주도) 보완점 반영 + SPEC 파일 생성 완료
- **plan.md 반영**: NOTE 1 별칭 표 5쌍(`jpeg→jpg` 등, `file-type` README 실측 근거) + 정책 저장 시에도 대표형으로 접기(안 그러면 `jpeg` 차단이 `.jpg` 통과를 허용). NOTE 2 **(a) 채택** — 탐지 확장자가 차단 목록에 있을 때만 거부, 단순 불일치는 `mismatch: true`로 기록만(오탐 누적 → 사용자가 차단 메시지를 무시하게 되는 UX 손실을 근거로 (b) 기각, 화이트리스트 전환 시 뒤집힘 명시). NOTE 3 prefix → 합성 탐지 확장자 매핑 후 동일 정책 대조, `<script`→`js` 매핑 금지 근거(js가 고정 7개 중 하나라 HTML 전체 차단 위험). `upload_attempt.extension`은 마지막 세그먼트 1개, `varchar(20)`.
- **생성**: spec.md 194줄(REQ 15, GEARS 5유형, Out of Scope h3 5) · acceptance.md 145줄(AC 16, 품질 게이트 Q1~Q10) · spec-compact.md 78줄 · progress.md 50줄(§E.1). 오케스트레이터 검증: 프론트매터 12필드+tier+issue_number, REQ 15, AC 라벨 17/논리 16, h3 5 — 보고와 일치.
- **판단**: 🟢 채택. plan.md 상한(360줄) 맞추려 표→문장 압축한 5곳은 결정·근거 무손실이라 되돌리지 않음. 다음: plan-auditor 감사(iteration 1, 경로만 전달).

#### #15
> 그래 너가 아무리 코딩 영역을 자동화해준다고 해도 over planning하면 오히려 읽을 SPEC 문서가 많아지니까 이 점도 유의하면서 내가 pillwriter에서 설계했으니까 그대로 절차를 밟으면 돼
- **의도**: (직전 문답 — plan-audit는 기계 검증이라 founder verdict 불필요, progress.md는 founder 확인용 — 을 확인한 뒤) 과잉 계획 금지 + pillwriter 절차 그대로.
- **AI 적용**: 산출물은 Tier M 5개 파일로 고정, 추가 문서 금지. founder가 읽는 건 심문 질문 초안 + progress.md.

#### #16 (AI 주도) plan-audit iteration 1 → FAIL 0.66 → 자동 수정
- **결과**: must-pass 7개 전부 통과, 차원 점수 Clarity 0.75 · Completeness 0.70 · Testability 0.75 · **Traceability 0.50** → 조화평균 0.66. 보고서 `.moai/reports/plan-audit/SPEC-UPLOAD-001-review-1.md`.
- **blocking 6건**: D3 과제 필수 동작(고정 토글 저장·커스텀 X 삭제) REQ 부재(엔드포인트 표에만 존재) / D1 REQ-015(policy-ui) AC 0건 / D2 REQ-012 AC 0건 / D5 AC-012 "본문 전체 읽은 흔적 없음" 이진 판정 불가 / D4 `PROMPT_LOG.md` 제출 게이트 없음 / D6 Q10 MX 태그 수가 plan §13과 불일치.
- **AI 판단**: 절차대로 founder 판정 없이 manager-spec에 수정 위임 → 재감사 2/3. 지시에 사용자 원칙 반영 — REQ/AC 상한(16/16)은 **SPEC 분할·Tier 상향 없이 통합으로** 해결, 감사관이 보존하라고 한 성질(차단 케이스마다 통과 케이스 쌍, 한계를 숨기지 않은 판단)은 유지.

#### #17 (AI 주도) 결함 수정 완료 → 재감사 2/3
- **수정 결과**: D1~D6 blocking + D7~D12 optional 전부 반영. D3로 REQ-002(고정 토글 영속)·REQ-003(커스텀 삭제) 신설, 자리는 REQ-004/005(패턴 위반·충돌)를 "커스텀 추가 거부 계약" 1건으로 통합해 확보 → REQ 16/16. AC는 005a/005b 묶음 + 016a/016b 신설 → 16/16. D5는 "본문 흔적 없음"을 "`request.formData` 스파이 미호출 단언"으로 치환. D4로 Q11(`PROMPT_LOG.md` 완결성 게이트) 신설. 자체 검증: 고아 REQ 0 · 고아 AC 0 · Out of Scope h3 5.
- **에이전트가 스스로 잡은 회귀**: AC-001을 REQ-002로 옮기자 REQ-001이 AC 없는 상태가 됨 → AC-001/002에 REQ-001 병기로 닫음.
- **판단**: 🟢 채택, iteration 2 감사 요청(이전 보고서 경로 전달, 전부 새로 읽게 지시).

#### #18 (AI 주도) plan-audit iteration 2 → PASS 0.86
- **점수**: 0.66 → 0.86 (Clarity 0.85 · Completeness 0.85 · Testability 0.80 · Traceability 0.95), 회귀 없음, must-pass 7/7, D1~D12 중 11건 완전 해소·D10 부분(예산 포화로 수용). 보고서 `.moai/reports/plan-audit/SPEC-UPLOAD-001-review-2.md`. 민감도 검사에서도 0.81~0.83으로 임계값 유지.
- **신규 지적 N1**: AC-016a(낙관적 갱신 롤백)를 실행할 컴포넌트 테스트 도구가 문서에 없음(Vitest node 환경만 선언, jsdom/testing-library 0건) → Q1 "AC 전부 통과"를 정직하게 판정 불가. N3: REQ-007 "유니코드 정규화"는 "NFC 정규화"로 — 파일명 NFC vs 입력 NFKC 구분은 보안상 의도된 차이.
- **AI 판단**: 감사관 권고대로 **재감사 없이 선수정**(N1은 파일표·검증 방식만 건드려 REQ/AC 예산 영향 없음; 기계적 결함이라 founder 판정 대상 아님). N1은 (a)안 — jsdom + testing-library로 컴포넌트 테스트 1파일 선언, Playwright 보류는 유지. 수정 후 심문(spec-interrogator) 진행.

#### #19 (AI 주도) N1~N5 반영 완료 → spec-interrogator 심문 시작
- **반영**: N1 컴포넌트 테스트 — Vitest `jsdom` + `@testing-library/svelte` 5.4.2 + `jsdom` 30.0.1(npm 실조회), `vitest-browser-svelte`는 실제 브라우저(Playwright provider)를 띄워 "Playwright 보류"와 충돌해 기각. 테스트 파일명은 지시 예시(`PolicyPanel`) 대신 이미 선언된 컴포넌트 `FixedExtensionList.test.ts`로 — 없는 이름을 새로 만들지 않는 판단(에이전트 자체 결정, 타당하여 수용). N3 REQ-007 "NFC 정규화" + 파일명 NFC vs 입력 NFKC 비대칭을 REQ 본문에 명시. N2/N4/N5도 반영, REQ/AC 16/16·h3 5 유지, 감사 grep 0건 → 8건.
- **판단**: 🟢 채택. plan 단계 감사 종료(2회, 최종 PASS 0.86). spec-interrogator를 SPEC 경로 + 과제 안내문(제품 의도 원본)만 넘겨 실행 — 작성 맥락 미전달.

#### #20 (AI 주도) spec-interrogator 심문 결과 → founder 판단 게이트
- **산출물**: `docs/review/SPEC-UPLOAD-001/question/interrogation-draft.md` — 판단 지점 17개(내부 모순 3 · 모호 4 · 암묵 전제 4 · 검증 불가 2 · 조용한 제품 결정 4), 기계적 결함 3건은 각주로 분리. 답·권고 없음(규칙 준수 확인).
- **AI 정리**: 17개를 뿌리별로 묶어 founder가 읽을 양을 줄임 — A 다중 파일 여부(Q1·Q9·Q16), B 확장자 없는 파일(Q14), C 별칭 처리(Q5·Q7·Q15), D 요청 단위 거부 기록(Q2) + 나머지 9개는 제안표. 사용자가 "spec-authority(AI 추천 금지) 미적용"을 결정했으므로(#13) 각 항목에 (권장)+근거를 붙임.
- **AI 제안 핵심**: A는 요청당 1파일로 단순화(세 질문 동시 해소, 과제가 다중 파일을 요구하지 않음) / B 거부 유지 / C 대표형 통일 + 안내 문구 / D 테이블 미기록·로그만 / Q8 `/api/uploads/recent` 스코프 제외(REQ 예산 포화) / Q17 PROMPT_LOG는 SPEC 밖 유지.
- **판단**: ⏳ founder 선택 대기 (AskUserQuestion 2라운드).

#### #21
> 아 맞다 pillwriter에도 같은 방식을 했었는데 우리가 과제.md 파일을 PRD문서로 취급하기로 했지? 심문 초안에도 PRD 문서에 근거가 있으면 그 부분을 작성해주고, 없으면 그냥 NONE이라고 적으면 돼
- **의도**: 판단 지점마다 "제품 문서(PRD=과제.md)가 이미 이 결정을 제약하는가"를 한눈에 보이게 — 근거 있는 질문은 PRD에 맞춰 답하고, NONE인 질문만 순수 제품 판단으로 남기려는 것.
- **AI 적용**: 초안 17개 질문 전부에 `PRD 근거` 줄 추가(오케스트레이터 직접 편집, 에이전트 재실행 없음). 근거 있음 14개(§2-A/B 필수 동작·§3 고려사항·§5 제출물·화면 예시 인용), **NONE 3개** — Q5(파일명 별칭 정규화), Q8(`/api/uploads/recent`), Q9(다중 파일 부분 성공 규격). 이 셋은 과제가 요구하지 않은 설계 산물이라 순수 제품 판단 대상.
- **판단**: 🟢 규칙으로 기억(다음 심문부터 에이전트 지시에 포함).

#### #22 (founder 판정 1라운드) 묶음 A~D
- **A** 요청당 파일 **1개**로 단순화 (Q1·Q9·Q16 동시 해소) / **B** 확장자 없는 파일 **거부 유지**(415 + 사유) / **C** 별칭은 판정·저장·비교 **전부 대표형** + 접힘 안내 문구 / **D** 요청 단위 거부는 테이블 미기록, **구조화 로그만**.
- 4건 모두 AI 제안(권장)과 동일 — founder가 근거를 읽고 동의한 것으로 기록. 뒤집은 항목 없음.

#### #23 (founder 판정 2라운드 + 질문)
> 1번을 할껀데 나 이거에 대해 궁금했는데 지금같이 프로젝트 볼륨이 작은 부분에서는 SPEC 비용이 그렇게 크지 않잖아? 그럼 너가 SPEC을 제대로 파악했다고 가정했을 때 TDD 및 리팩토링까지 끝냈는데 만약에 어딘가 edge case가 터져서 다시 SPEC으로 retrogade해야 돼. 그럼에도 불구하고 fix 비용은 싸니?
- **판정**: 나머지 9개(Q3·Q4·Q6·Q8·Q10·Q11·Q12·Q13·Q17) 제안대로 일괄 확정. 17개 전부 founder 판정 완료, 뒤집은 항목 0.
- **질문 의도**: SPEC-first의 비용 대비 효과를 "구현 후 edge case로 SPEC 회귀" 시나리오로 검증.
- **AI 답변 요지**: 비용은 SPEC 크기가 아니라 "edge case가 뒤집는 결정의 수"로 결정됨. ① 기존 결정 범위 안(대다수) → 엣지 표 한 줄 + 순수 함수 테스트 행 + 코드, 거의 공짜. ② 결정 자체를 뒤집음 → REQ 수정 + HISTORY + 자동 재감사 + 결합된 AC·테스트 재작성, ①의 3~5배지만 5파일·900줄 규모라 한 마일스톤 수준. 이 프로젝트는 판정 로직을 순수 함수 4개로 뽑아 ②를 ①로 바꾸도록 설계했고, 회귀 경로(manager-develop blocker → manager-spec 수정 → 재감사)가 절차로 고정돼 비용이 예측 가능. 심문 17개가 바로 ②를 코드 전에 소진하는 장치.
- **AI 작업**: manager-spec에 Stage 3 반영 지시(v0.1.0 → 0.2.0, HISTORY 행, REQ/AC ≤16 유지). 반영 후 재감사는 생략 — `/moai run` 진입 시 Plan Audit Gate가 해시 변경을 감지해 자동 재실행. 판정 요약을 심문 초안 말미 "Founder verdicts" 표로 기록.

#### #24
> 반영 끝나면 Issue까지 만들고 /clear 메시지 준비해줘
- **반영 결과(v0.2.0)**: 판정 13묶음 전부 file:line 단위로 반영. 사유 코드 10종 + 알림 3종 문구 상수 표(plan §4.1) 신설, `TOO_MANY_FILES`·`MAX_FILES_PER_REQUEST`·`/api/uploads/recent` 제거, 매트릭스 26 → 28(E8 고아 Blob, E9 recent 제외), 품질 게이트 Q1~Q12. 에이전트 판단: `phase`는 릴리스 타깃이라 `"v0.1.0 target"` 유지(문서 버전과 다른 축) — 타당하여 수용. N4로 남겼던 REQ-013 미검증 2건은 Q1·Q4로 자연 해소.
- **오케스트레이터 재검증(grep)**: version 0.2.0 · REQ 16 · AC 16 · h3 5 · 제거 식별자는 이력 문장에만 잔존(실사용 0). 총 994줄(plan.md 391줄 — 처음 잡은 360줄 상한을 넘었으나 판정 반영분이라 수용).
- **Issue**: #1 생성(`spec` 라벨 신규 생성 후), `spec.md` `issue_number: 1`, Issue에 SPEC 경로 댓글. 커밋은 환경 설정 / SPEC 산출물 2건으로 분리(되돌리기 용이).
- **판단**: 🟢 plan 단계 종료. 감사 보고서(`.moai/reports/plan-audit/`)는 규칙상 로컬 산출물이라 커밋하지 않음 — 이 로그와 progress.md에 결과 요약이 있음.

### 2026-08-29 — 세션 2: run 단계 진입 (`/clear` 후 재개)

#### #25 (paste-ready 재개 메시지 붙여넣기)
> ultrathink. SPEC-UPLOAD-001 run 진입. … 전제 검증 4건 … 실행: /moai run SPEC-UPLOAD-001
- **의도**: 세션 1 말미에 AI가 만들어 준 6블록 재개 메시지를 그대로 붙여 넣어, 새 컨텍스트에서 곧바로 구현 단계로 들어가기. 전제 4건(커밋 상태·SPEC 버전·Issue 상태·가드 훅)을 먼저 기계적으로 확인하게 함.
- **AI 검증 결과**: ① `git log` fc160ce/8fc999c ✓ — 단, 메시지엔 "2 ahead 미push"라 적혀 있었으나 실제는 origin/main과 `0 0`(이미 동기화). 재개 메시지의 전제가 낡은 사례 — 명령으로 확인했기에 무해. ② `version "0.2.0"`, `issue_number 1`, `status draft` ✓ ③ Issue #1 OPEN ✓ ④ 가드 훅 테스트 14/14 ALL PASS ✓. `rtk` 접두어(전역 CLAUDE.md 규칙)는 Bash 도구 PATH에 없어 두 명령이 실패 → 일반 명령으로 재실행.
- **AI 판단(run 진입 전 결정 3건, 사용자에게 묻지 않음)**:
  1. **Plan Audit Gate 재실행** — iter2 PASS 0.86(20:19) 이후 v0.2.0 반영(21:26~21:31)으로 SPEC 해시가 바뀌어 skip 계약(PASS·점수≥0.80·해시 불변) 중 해시 조건 불충족. #23에서 "run 진입 시 자동 재실행"으로 예고된 대로 `plan-auditor`(Opus)를 run-gate 스트림(`SPEC-UPLOAD-001-2026-08-29.md`)으로 실행.
  2. **product.md 없음 → 재질문 생략** — #06에서 "프로젝트 문서 인터뷰 건너뜀"으로 이미 결정됨. 같은 질문을 다시 하지 않음.
  3. **실행 모드 `serial` · 하네스 `standard` · Route A(main 직접 커밋)** — `progress.md` §F에 근거 기록. 보안 키워드로 thorough 조건도 걸리지만 `contract.md`가 하나 더 생겨 #15(과잉 계획 금지)와 충돌 → standard. 보안 판정은 Phase 2.8a evaluator-active가 HARD 기준으로 수행.
- **환경 확인**: `package.json` 없음(완전 백지), `.env` 없음, `DATABASE_URL`·`BLOB_READ_WRITE_TOKEN` 미설정 → M1~M3는 PGlite(인프로세스 PostgreSQL)·Blob 모의로 시크릿 없이 진행 가능, M4 배포 직전에 필요. Node 24.11 / pnpm 11.10.
- **오류 1건**: 감사관 호출에 `name`(팀 모드 이름표)을 붙였더니 "team file for session … not found"로 거부. 이 세션엔 Agent Teams 런타임이 초기화되지 않은 상태 — 이름표 없이 일반 서브에이전트로 재호출해 해결(프롬프트 동일). 🟡 사소한 호출 방식 수정.
- **재감사 결과**: **PASS 0.85** (Clarity 0.80 · Completeness 0.80 · Testability 0.85 · Traceability 0.95, must-pass 7/7, Claude 단독). blocking 3건은 전부 "요청당 1파일" 결정 뒤에 남은 낡은 문장 — D1 매트릭스 3-1-f `5개`(CONSIDERATIONS 뼈대라 실질 감점 위험), D2 rate-limit 제외 근거가 삭제된 개수 상한 참조, D3 `/api/uploads/recent` Out of Scope h3 부재. optional D5(`EXT_EMPTY` AC 없음)·D6(`upload-repo` 최근 조회 잔재)도 같이 수정, D4·D7은 조치 불요. 🟢 절차대로 founder 판정 없이 manager-spec(Opus)에 자동 수정 위임 → 커밋 `15a5205`(v0.2.1, REQ 16/AC 논리 16 불변). 의미 불변의 문장 정합 교정이라 재감사는 생략.

#### #26 (AskUserQuestion 응답 3건) `시작 (권장)` · `자율 진행 (권장)` · `M3 끝나면 안내 받고 준비`
- **의도**: 킥오프 승인 + 진행 방식 + 시크릿 준비 시점을 한 라운드에 결정.
- **결과**: manager-develop(Opus)에게 M1(스캐폴드 + `001_init.sql` + 순수 함수 4개 + 표 기반 단위 테스트, TDD) 위임. Tier M이라 Section A~E 5절 위임 프롬프트(맥락·알려진 이슈·사전 점검·제약·자체 검증) 전부 포함.
- **중단**: 에이전트가 스캐폴드(package.json·src/·vite.config 등)까지 만든 시점에 **API 세션 사용량 한도(429, 11:30pm 초기화)** 로 종료. 런타임이 자동으로 L1 워크트리(`.claude/worktrees/agent-…`)에 격리해 둔 상태라 main 체크아웃은 깨끗함. 부수 발견: 홈 폴더 `C:\Users\sdok1`에 `package.json` + `pnpm-workspace.yaml`이 있어 pnpm install이 그 워크스페이스로 흡수됨 → 에이전트가 프로젝트 안에 `pnpm-workspace.yaml`을 두어 격리(🟡 타당, 유지).

#### #27
> 아마 general-moai-adk 아니면 pillwriter에서 vercel-supply-chain-attack에 대비한 vercel cli에서 --sensitive로 env value 직접 설정하기 관련 룰이 있을꺼야 그것도 여기에 적용할꺼임 / (이어서) 거기에도 없으면 github mcp server를 사용해서 cubrain 쪽에서도 찾아봐봐
- **의도**: 다른 프로젝트에서 세운 시크릿 취급 규칙을 이 과제 배포에도 적용.
- **AI 조사**: 로컬(pillwriter·컨테이너·실습 레포)엔 `--sensitive`/`vercel env` 규칙 없음(일반 "sensitive data" 언급뿐). GitHub MCP 서버는 이 세션에 미등록이라 `gh api`로 대체 → **cubrain `skills/AGENTS.md` §28 Zero-Trust Secret Management**에서 발견: AI는 실제 시크릿을 요청·읽지 않음 / CLI env 추가 시 값을 명령 문자열에 넣지 말고 대화형 프롬프트(히스토리 유출 방지) / Vercel 환경변수 전부 Sensitive 필수 / `.env` gitignore 누락은 최우선 수정. 배경: 2026-04 Vercel 보안 사고 후 cubrain 키 전수 교체(`whats-new/v1-6-0`).
- **교차 검증(Vercel 공식 문서, 2026-08-20 갱신)**: `vercel env add`는 production/preview에 **기본 sensitive**, `--no-sensitive`로만 해제, development 타깃엔 sensitive 불가(`--sensitive` 오류). Sensitive 값은 대시보드·`vercel env ls`로 재열람 불가. `echo value | vercel env add`는 bash 히스토리에 남는다고 문서가 직접 경고.
- **판단**: 🟢 적용 — 프로젝트 규칙 파일 + 가드 훅(`--no-sensitive`·값 인라인·`vercel env pull` 차단) + README 배포 절·CONSIDERATIONS E5 반영. M1 에이전트가 트리를 쓰는 동안은 보류했다가 중단 후 착수.

#### #28
> progress.md는 아마 SPEC 단계에서 산출물을 생성하는게 아닐꺼야 pillwriter를 보면 moai 워크플로우를 끝내거나 아니면 RED -> GREEN 까지의 단순 구현을 끝내고 나서 산출하는 걸로 알고 있는데 가서 확인하고 확인한 방법을 여기에 그대로 적용해
- **AI 검증(pillwriter git 이력)**: SPEC 7개 중 6개에서 `progress.md`는 spec.md 초안보다 2~6일 뒤 **run 단계에서 첫 커밋**(`chore: … run-phase bookkeeping`, `docs: … run artifacts — tasks/progress tracking`, `… post-hoc run-close record`). 예외는 부트스트랩 1커밋 SPEC뿐. 구조는 `Acceptance scenario completion N/N` 표 → `Test counts`(exit code 포함) → `Migration status` → `Deviations from spec/plan` → founder 메모.
- **판단**: 🟢 사용자 판단이 맞음. 여기 §E.1이 plan 단계에 생긴 건 moai 3.1.2 템플릿 규칙이지 pillwriter 방식이 아님. 적용 — 이미 커밋된 §E.1은 두고(삭제는 diff 소음), 이후 기록은 RED→GREEN 완료 마일스톤마다 위 5절 구조로, 코드 커밋과 분리한 `chore(SPEC-UPLOAD-001): M<n> run-phase bookkeeping` 커밋으로. M1 에이전트에 즉시 전달(SendMessage).

#### #29
> 앞으로 git commit msg도 전부 에이전트가 읽잖아? 근데 굳이 commit msg도 ko로 작성할 필요가 있을까? … PRD 문서에 별도의 커밋 메시지 제약조건이 있으면 ko로 하고 그렇지 않으면 en로 해도 된다고 나는 생각해
- **AI 답변 요지**: "에이전트가 영어 특화"는 근거 약함 — 커밋 메시지는 수십 글자라 토큰 차이가 무시 수준이고 기계 파싱 부분(`feat`, scope, `Refs #1`)은 어차피 영어. 진짜 기준은 최종 독자(Flow 평가자, 한국어). PRD 확인 결과 커밋 관련 제약 **없음**(112행 GitHub 주소 요건뿐).
- **판단**: 사용자가 두 라운드 모두 🟢 **ko 유지** 선택 — "PRD 제약 없으면 en" 기준을 스스로 세웠지만 최종적으로 평가자 읽기 톤 일관성을 우선. 설정 변경 없음.

#### #30
> 아무래도 기존의 방식대로 하니까 세션이 너무 빨리 한도에 도달하는 것 같아. 그래서 기존의 pillwriter 방식과 동일하게 메인 세션(너하고 내가 직접 interact하는 곳은 Fable) / SPEC 단계와 TDD의 REFACTOR은 Opus / 단순 구현 및 TDD의 RED -> GREEN은 Sonnet로 변경할 것. (e.g. model: "opus")
- **의도**: Opus 단일 배분이 세션 한도를 너무 빨리 소진 → 모델을 역할별로 나눠 비용을 낮추기. (#08에서 GLM 위임을 보류했던 결정의 후속 — GLM 대신 Sonnet.)
- **AI 적용**: `llm.yaml` `agent_overrides`로 `manager-develop`을 `sonnet`으로(RED→GREEN·단순 구현 스폰의 기본값), REFACTOR·감사·SPEC 스폰은 `model: "opus"` 명시. 메인 세션은 Fable 그대로. `progress.md` §F에 배분표 기록. 같은 메시지의 open-provider(OpenRouter) 컨텍스트 이관 질문은 사용자가 철회(ChatGPT로 확인 완료).

#### #31 (AI 주도) M1 재개 — 스캐폴드 복구 → Sonnet RED→GREEN → 검증
- **복구**: Sonnet 호출 가능 여부를 읽기 전용 프로브(1콜)로 확인한 뒤, 중단된 워크트리의 스캐폴드 13파일을 main으로 복사·커밋(`4c6112e`). 이 과정에서 잡은 결함 2건 — ① `sv create` 최소 템플릿의 `eslint.config.js`가 `svelte.configs.prettier`(배열)를 스프레드 없이 넣어 ESLint 10에서 `Unexpected array`로 터짐 → js/ts/svelte recommended + prettier 스프레드 구성으로 교체. ② pre-commit 훅(`moai gate`)이 `prettier --check .`로 `.moai/`·`docs/`·`*.md`까지 검사 → `.prettierignore` 확장. 🟡 스캐폴드 수정 후 채택. (부수: 실패한 첫 커밋 시도에서 스테이징돼 있던 `llm.yaml`·`progress.md`·`PROMPT_LOG.md`가 스캐폴드 커밋에 함께 들어감 — 이력 재작성은 하지 않음.)
- **M1 RED→GREEN (manager-develop, Sonnet)**: `migrations/001_init.sql`(plan §2.5 DDL 그대로) · `scripts/migrate.ts` · `src/lib/constants.ts` · `src/lib/server/upload/{reason-codes,extension,signature,decide}.ts` + 테스트 4개 · PGlite `schema.test.ts`. RED 증거(모듈 없음으로 5개 스위트 실패) 캡처 후 GREEN. 커밋 `6cb5d6b`(코드) + `dc51fe9`(bookkeeping, pillwriter 방식 5절) → origin/main push. `spec.md` status `draft → in-progress`.
- **오케스트레이터 재검증(main 체크아웃, 직접 실행)**: `pnpm test` **87/87 통과** · `pnpm check` **0 errors** · 커버리지 98.8%(에이전트 보고) · `pnpm lint`는 11파일 실패 — 코드가 아니라 **CRLF**: 에이전트 워크트리가 `core.autocrlf=true`라 M1 파일이 CRLF로 체크아웃됐고 Prettier는 LF 기대(`decide.ts` CR 56개, 스캐폴드 파일 0개). `.gitattributes`(`eol=lf`) + 포맷 1회로 해소 예정 → REFACTOR에 포함.
- **에이전트 자체 판단 2건(수용)**: 워크트리 HEAD가 위임 프롬프트의 가정(`4c6112e`)과 달라 `git merge --ff-only main`으로 스스로 동기화 / TIFF 실바이트 픽스처는 `file-type`의 IFD 파싱 요구로 M1에서 제외(별칭 폴딩은 다른 테스트로 커버).
- **Vercel 시크릿 룰 적용(#27 후속)**: `.claude/rules/local/secret-management.md` + `block-vercel-env-insecure.mjs`(settings.json PreToolUse Bash 등록). 가드 테스트 26/26 PASS(신규 9: `--no-sensitive`·파이프 값·`--value`·4번째 인자·`env pull` 차단, 대화형 추가·`< file`·`ls`/`deploy` 허용). 🟢 채택. 커밋 `fed4548`.

#### #32
> 오케이 이제 .moai/specs/SPEC-UPLOAD-001/progress.md를 읽으려고 하는데 코드 라인을 보니까 240줄이 넘어가거든? 이걸 전부 다 읽을 필요가 있을까? … 결국 founder가 읽을 부분은 어디지? / (이어서) 앞으로 progress.md를 읽을 때 founder가 정말 읽어야 할 부분만 압축해서 업로드해줘 … PRD 문서와 맞게 구현이 됐는지 체크리스트 정도를 작성하면 될 것 같은데 맞니?
- **의도**: 사람이 읽는 양을 줄이기 — 기계 검증(TDD·TRUST 5) 결과는 AI가 확인하고, 사람은 결정에 필요한 것만 읽는다.
- **AI 답변**: progress.md 240줄 중 founder용은 `Deviations from spec/plan` + `Founder-attention notes` 12줄뿐. "PRD 대조 체크리스트"는 방향이 맞지만 그것만으론 부족 — AC 표가 이미 PRD→REQ→AC→테스트로 기계 대조를 하므로, 사람이 봐야 할 건 **기계가 결정할 수 없는 것**: ① 편차·제품 결정(권장+근거) ② 의식적으로 감수한 갭 ③ PRD 항목별 증거 유무(AC 표에서 AI가 추출). 🟢 마일스톤마다 이 3블록 "Founder digest"만 채팅에 올리는 것으로 확정(새 파일 없음). M1 digest 1차 제시 — 판단 1건(TIFF 실바이트 픽스처 → M3 엔드포인트 테스트에 포함 권장), 감수 갭 2건, PRD 체크리스트.

#### #33 (AI 주도) M1 REFACTOR (manager-develop, Opus) → M1 완료
- **결과**: 커밋 `07d4602`(refactor) + `5f905a4`(bookkeeping), origin/main push. 테스트 87 → **91**(추가 4: `formatMessage` fallback, 1바이트 버퍼, 실제 TIFF 시그니처, BOM+공백+대문자 `<?PHP`), 커버리지 Statements/Lines **100%** · Branch 97.6%(유일한 미커버 분기는 `TextDecoder`가 BOM을 먼저 제거해 구조적으로 도달 불가 — 방어 코드로 유지), `pnpm lint` **exit 0**, `pnpm check` 0, MX 태그 4곳(plan §13 M1 부분집합) `[AUTO]`+`@MX:REASON` 구비 확인.
- **CRLF 근본 해결**: `.gitattributes`(`* text=auto eol=lf`) + `git add --renormalize .`(내용 diff 0건 확인) + `pnpm format`. 에이전트 진단 — 인덱스는 이미 LF, 워킹 카피만 `core.autocrlf=true`로 CRLF. 🟢 채택.
- **동작 불변 검증 8건**: 기존 테스트 파일은 순수 추가(+셋업 1건, 단언 무변경), `decideUpload` 판정 순서·문구 13종·별칭 표 5항목·255바이트 절단 로직 미변경 — 에이전트가 diff 단위로 대조.
- **오케스트레이터 재검증(main)**: ff-merge 후 `pnpm test` 91/91 · `pnpm lint` exit 0. `pnpm format`이 로컬 파일 3개를 건드렸는데 줄바꿈 차이만인지 확인 후 처리(아래 #34).
- **에이전트 자체 판단(수용)**: 두 번째 커밋의 pre-commit `moai gate`가 1회 일시 실패(단독 재실행 exit 0, HEAD 불변 확인 후 재커밋) — 우회 플래그 미사용. 재발 시 병렬 게이트 경합 점검.
- **M1 완료 판정**: plan §11 M1 완료 기준(001_init.sql PGlite 적용 · 순수 함수 4개 표 기반 테스트 · 커버리지 ≥ 85%) 전부 충족. Q2·Q4·Q5·Q6 게이트 M1 스코프 통과.

#### #34
> M1 끝나면 지금 새벽 1시라서 세션을 마무리해야 돼. 끝나면 짧게 브리핑해줘
- **AI 마무리**: 로컬 main 동기화(`5f905a4`) → 재검증 → PROMPT_LOG 커밋·push → 재개 메시지(전제 검증 4건 + `/moai run SPEC-UPLOAD-001` M2) 채팅 출력 + 메모리 저장. 세션 2 종료 시점 상태: M1 완료, M2~M4 대기, 시크릿 미준비(의도됨), stale 에이전트 워크트리 3개(`rm -rf` 승인 대기).

### 2026-08-30 — 세션 3: M2 진입 (`/clear` 후 재개, 메인 세션 Fable 5)

#### #35
> 오늘 해야할 일 브리핑해줘
- **의도**: 세션 시작 상태 점검. **AI 응답**: 메모리·`progress.md`·`git` 상태를 읽어 M1 완료(91 tests / lint 0 / origin 동기화 `0 0`), M2~M4 대기, stale 워크트리 3개, 열린 결정 1건(TIFF 픽스처 → M3 이월 권고)을 진행판으로 브리핑. 순서 제안: 전제 검증 → 워크트리 정리(승인 후) → M2 → PROMPT_LOG.

#### #36
> .claude/settings.json 모델은 Fable, effort는 high로 고정해줘. 어차피 메인 세션으로만 사용할 거니까
- **결과**: `model: "claude-fable-5"` + `env.CLAUDE_CODE_EFFORT_LEVEL: "high"`. effort는 settings.json에 전용 키가 없어(schemastore 스키마를 WebFetch로 확인) 공식 환경변수로 고정. 서브에이전트는 스폰마다 `model:`을 넘기므로 영향 없음.

#### #37 (paste-ready 재개 메시지 붙여넣기)
> ultrathink. SPEC-UPLOAD-001 run 진입 (M2 시작). … 어제 세션 마무리하기 전에 너가 복사하라고 해서 그대로 복붙함
- **전제 검증**: ① HEAD `97c2e2e`, origin `0 0` ② `pnpm test` 91/91 · `pnpm lint` exit 0 · `pnpm check` 0 ERRORS ③ `status: in-progress`, 가드 테스트 ALL PASS ④ 워크트리 3개 안전성 점검(등록 2개 `main` 대비 0 ahead, 미커밋 변경 0건, 1개는 이미 prune된 빈 폴더). 증거: `.moai/state/verify/f4050a0d/{test,lint,check}.log`.

#### #38 (AskUserQuestion 응답) `지워 주세요 (권장)`
- **결과**: `git worktree remove --force`는 예상대로 Windows 경로 길이로 실패 → `rm -rf` 3개 + `git worktree prune` + 브랜치 `worktree-agent-*` 2개 삭제. `git worktree list`는 main 하나. 삭제 전에 잃는 작업이 없음을 먼저 확인하고 물은 뒤 실행.

#### #39 (AI 주도) `/moai run SPEC-UPLOAD-001` — M2 정책 API + 정책 화면
- **컨텍스트 로딩**: `run.md` 라우터, `plan.md` §4~§8·§11·§13, `acceptance.md` A·B·F·품질 게이트, `spec.md` REQ-001~006·016·§4 파일표, M1 코드(`constants.ts`·`reason-codes.ts`·`schema.test.ts`·`migrate.ts`·`vite.config.ts`), 가드 훅 허용 범위(`pnpm add` 허용), 커밋 서식(`07d4602`), `llm.yaml` `agent_overrides`(manager-develop → sonnet).
- **스폰 전 점검**: `moai session list --filter-spec` → `[]`, origin 동기화 `0 0`, `product.md` 부재는 세션 1·2와 동일하게 생략(over-planning 회피).
- **위임 프롬프트(5-section, Tier M)에 오케스트레이터가 넣은 설계 결정**: (a) Neon/PGlite를 같은 `Db` 인터페이스로 추상화해 리포지토리는 인터페이스에만 의존 (b) `hooks.server.ts`가 `locals.db`를 주입 → 엔드포인트 테스트는 핸들러를 직접 호출(서버·네트워크 없음) (c) 200개 상한은 `INSERT … SELECT … WHERE count < 200` 단일 문장, 중복은 UNIQUE 위반(23505)을 잡아 `kind`로 `EXT_IS_FIXED`/`EXT_DUPLICATE` 분기 (d) Vitest jsdom 프로젝트에 `resolve.conditions: ['browser']` 필수 (e) 정책 사유 코드가 아닌 라우팅·형식 오류(고정 7개 밖 `[ext]`, 잘못된 body)는 SvelteKit `error(404/400)` — Deviation으로 기록 지시 (f) `UploadArea`·`/api/upload`·`upload-repo`는 M3, `CLIENT_HINT_DISCLAIMER` 문자열만 자리표시 섹션에 렌더(AC-016b).
- **모델·커밋 계약**: `model: "sonnet"`, 커밋 2개(`feat` 코드 + `chore` bookkeeping), push 금지(오케스트레이터가 재검증 후), 스킬 주입 `moai-workflow-tdd` + `moai-ref-api-patterns`. 작업 5건을 TaskList로 등록(RED→GREEN → 검증 1차 → REFACTOR(Opus) → 검증 2차+push → digest+PROMPT_LOG).

#### #40
> ui-ux-pro-max 플러그인을 방금 활성화했는데 배포까지 성공적으로 마친 다음에 버퍼 시간이 여유로우면 PRD에 디자인 제한이 없으면 추가로 구현할 예정이야. 디자인이 밋밋하면 심심해보이거든
- **AI 확인**: PRD를 grep — 디자인 제한 문장 없음(`기술 스택 자유`, "화면 구현 자체보다 고려사항"). 145행 참고 화면은 요소 배치(제목·설명 → 고정 체크박스 → 입력+추가 → 카운터+칩)이지 시각 스타일 제약이 아님. 결정: M2~M4는 기본 CSS로 기능 우선, 디자인 패스는 배포 후 조건부. 메모리 `feedback-uiux-design-pass-opus.md` 저장.

#### #41
> ui-ux-pro-max는 UI/UX 관련이니까 model: "opus"로 설정해줘. 단순 구현 sonnet보다는 추론 능력이 필요하다고 생각하거든
- **반영**: 디자인 판단이 들어가는 스폰은 `model: "opus"` 고정(같은 메모리 파일에 기록). Sonnet 라우팅은 기계적 RED→GREEN에만 적용.

#### #42
> .moai/specs/…/progress.md는 founder가 읽는 게 아니라 순전히 네가 source of truth로 판단하는 기록보관용으로 생각해도 되지?
- **AI 답**: 맞음 — 오케스트레이터의 판단 근거·sync-auditor 감사 입력·회고 자료. founder는 채팅의 Founder digest 3블록만 읽음. `feedback-founder-digest-per-milestone.md`에 확정 문구 추가.

#### #43
> PROMPT_LOG.md도 알아서 갱신 잘하고 있지?
- **AI 답(솔직)**: 이번 세션 분은 미갱신 상태였음(M2 후 일괄 기록으로 미뤄둠) → "단계마다 기록" 원칙 위반을 인정하고 즉시 #35~#43 작성. 커밋은 M2 에이전트의 커밋과 인덱스가 겹치지 않도록 에이전트 종료 후 묶어서 진행. 🟡 사용자 지적으로 교정.

#### #44
> PROMPT_LOG.md 갱신 주기도 PRD 문서에 맞게 룰북에 추가해줘
- **결과**: `.claude/rules/local/prompt-log-cadence.md` 신설 — 과제 §4-1/4-2/4-3과 인수 기준 Q11을 표로 대응시키고, 갱신 주기를 고정: 작업을 바꾸는 프롬프트마다 **같은 턴에** `#N` 기록(재질문·교정은 🟡로 감추지 않기), AI 주도 단계는 완료 시점에 실제 증거로 기록, §2 표는 도구를 **실제로 처음 쓴 시점**에 추가, §3 회고는 마일스톤·세션 종료마다, 커밋은 `docs(PROMPT_LOG)`로 분리(서브에이전트 실행 중엔 커밋 보류). 턴 종료 전 자체 점검 4항목 포함. 메모리 `flow-assignment-context.md`에 포인터 추가.

#### #45
> 마일스톤 개요가 잘 생각이 안나 짧게 브리핑해줘
- **AI 응답**: plan.md §11 기준 4개 마일스톤을 "데이터 규칙(M1) → 정책 관리(M2) → 실제 차단(M3) → 배포·문서(M4)"로 표 브리핑. M2/M3를 나눈 근거(PRD "정책만 있고 못 막으면 무의미")와 현재 상태(M1 🟢, M2 🟡 진행 중) 포함.

#### #46
> context가 50% 정도 차면 책에서는 context rot 때문에 워크플로우 단위로 compact하거나 한 사이클이 끝나면 clear하라고 나와있는데 맞니?
- **AI 답**: 책 원문은 확인 불가하나 취지는 프로젝트 룰(`context-window-management.md`·`session-handoff.md`·`cache-aware-execution.md`)과 일치. 숫자는 모델별 — Opus 1M은 50%, Fable 256K는 90%가 handoff 문턱이지만 워크플로우 경계에서 일찍 정리하는 건 권장(큰 스폰 배치 전 `/clear`). 절감 사다리: `/btw` → `/compact <지시>` → rewind 요약 → `/clear`+재개 블록. 이 세션 계획: M2 사이클(REFACTOR·푸시·digest)까지는 유지, 그 뒤 재개 블록 출력 후 `/clear` 권장 → M3는 새 세션. 상태 스냅샷 부재로 정확한 사용량은 상태줄/`/context`로 확인 요청.

#### #47
> 지금 세션은 256k 윈도우가 할당된 것 같거든? 앞으로는 메인 세션을 시작할 때 model: "fable[1m]"으로 수정해줘
- **AI 확인**: 기억으로 답하지 않고 두 곳을 확인 — (1) claude-api 스킬 레퍼런스: Fable 5는 API 레벨에서 1M 컨텍스트가 기본값 (2) 설치된 Claude Code 바이너리(2.1.246~2.1.251)를 grep → `fable[1m]` 별칭이 `opus[1m]`·`sonnet[1m]`과 함께 존재. **결과**: `.claude/settings.json` `model: "claude-fable-5"` → `"fable[1m]"` (effort high 환경변수는 유지). 다음 세션 시작 시 적용 — `/model`로 1M 표시 여부 확인 필요. 1M이 되면 `context-window-management.md` 표 기준 handoff 문턱이 90%(256K)에서 50%(1M)로 바뀜.

#### #48
> 워커 패턴으로 spawn되는 서브에이전트(SPEC의 opus, 단순 구현의 sonnet)한테도 [1m]을 할당하는 게 효율적일까? 어차피 마일스톤 단위로 컨텍스트를 초기화하는 게 낫지 않을까?
- **AI 답**: 서브에이전트는 스폰마다 새 컨텍스트(소멸 후 `progress.md`·커밋·스폰 프롬프트만 승계)라 마일스톤 단위 초기화는 이미 구조상 자동. `[1m]`은 한 스폰 안의 자동 압축을 미루는 여유분일 뿐이고, 비용은 할당이 아닌 실사용(200K 초과 구간)에 붙지만 컨텍스트가 클수록 rot도 커짐. 권장: 워커는 기본(`[1m]` 없음) 유지, 압축 흔적·15파일 초과 시에도 먼저 마일스톤 분할. 스폰 `model:` 파라미터는 sonnet/opus/haiku/fable만 받아 접미사 지정 불가 — 필요 시 에이전트 정의 파일에서 처리.

#### #49 (AI 주도) M2 RED→GREEN (manager-develop, Sonnet) → 오케스트레이터 재검증
- **결과**: 커밋 `898ce43`(feat, 21 files, +1520) + `fb95916`(bookkeeping). 테스트 91 → **129**(정책 리포지토리 15 · 클라이언트 2 · 엔드포인트 20 · 컴포넌트 jsdom 2 · SSR 1 = 신규 38), M2 스코프 AC 12/12 PASS(AC-001~007 API/DB, 016a 낙관적 갱신→500→롤백, 016b SSR HTML에 체크 상태 + 면책 문구). 커버리지 `src/lib/server/**` Stmts 96.72 / Branch 92.06 / Lines 96.58.
- **오케스트레이터 재검증(main, `fb95916`)**: `pnpm test` 10 files / 129 passed · `pnpm lint` exit 0 · `pnpm check` 0 ERRORS 3 WARNINGS · `pnpm build` exit 0 · 커버리지 수치 보고와 일치. 증거 `.moai/state/verify/f4050a0d/m2-*.log`. 스폰 프롬프트에 넣은 설계 결정(Db 인터페이스·locals.db 주입·단일 SQL 상한·23505 분기·jsdom browser 조건) 전부 구현에 반영됨을 코드 열람으로 확인.
- **에이전트 재량 판단(수용, REFACTOR에서 재검토)**: ① `normalizeExtensionCandidate()` 최소 추출(M1 시그니처 불변) ② 고정 7개 밖 `[ext]`·잘못된 body는 SvelteKit `error(404/400)` ③ svelte-check 경고 3건(`state_referenced_locally`)은 낙관적 갱신용 로컬 복사 패턴이라 의도됨 ④ PGlite 다중 기동 경합으로 `hookTimeout: 30000` ⑤ `client.test.ts` 신규(계획 외, 커버리지 보강). 🟢 채택.
- **남은 gap**: `client.ts` Neon 실경로(라인 34-40) — `DATABASE_URL` 없어 미검증, M4 배포 직전 실측(M1 `migrate.ts`와 동일 성격).

#### #50
> 나 커피냅 30분 정도 때리고 다시 복귀할 거니까 내가 멀티옵션으로 판단하는 부분 직전까지만 알아서 작업해 놔
- **의도**: 자율 진행 범위 위임. **AI 계획**: REFACTOR(Opus) 결과 수신 → 검증 배치 2차 → 푸시 → Founder digest 3블록 준비 → PROMPT_LOG 커밋까지 무인 진행. 정지 지점: digest ① 판단 필요 항목(404 재량·TIFF 이월), M3 진입·시크릿 시점, `/clear` 여부 — 전부 AskUserQuestion으로 대기.

#### #51 (AI 주도) M2 REFACTOR (manager-develop, Opus) → 재검증 → push → M2 완료
- **결과**: 커밋 `86baa60`(refactor, 7 files +79/-21) + `cc518d7`(bookkeeping). 검토 후보 9건 판정 — **변경 5**: ① svelte-check 경고 3건을 `untrack()`으로 해소(주석 억제 대신 "초기값 한 번만 읽는다"를 코드가 말하게) ② `getPolicy` DB 왕복 2회→1회(`ORDER BY kind, sort_order, extension` 한 절로 두 정렬 규칙) ③ `ALIAS_FOLDED` 문구의 `{input}`을 원문→정규화 후보로(`" .JPEG "` 누출 정정) ④ Neon 어댑터 이중 단언 제거(`index.d.ts:1118` 실측) + `Db`에 `@MX:NOTE` ⑤ 접근성 2곳(`role="status"`, 카운터 `aria-label`). **유지 2**: 오류 봉투 헬퍼 추출(호출부 1곳뿐 — M3에서 두 번째가 생길 때), `hookTimeout`(테스트가 `beforeEach`마다 PGlite 기동 — 격리 계약 유지). 판단 고정 테스트 2건 추가(129→**131**), 기존 단언 수정 0줄(`git diff -U0 … | grep -c "^-[^-]"` → 0).
- **오케스트레이터 재검증(`cc518d7`)**: `pnpm test` 131/131 · `pnpm lint` 0 · `pnpm check` **0 ERRORS 0 WARNINGS** · `pnpm build` 0 · 커버리지 96.8/92.3/96.96/96.66(Funcs -0.18%p는 `.map` 콜백 2개가 사라진 분모 감소, 미커버 함수 1개 동일) · `process.env` 0 · `@MX:TODO` 0. 증거 `.moai/state/verify/f4050a0d/m2r-*.log`. 🟢 채택.
- **push**: `git rev-list --left-right origin/main...HEAD` → `0 6` 확인 후 `git push origin main` → `97c2e2e..cc518d7`, 이후 `0 0`.
- **M2 완료 판정**: plan §11 M2 기준(토글·추가·삭제 새로고침 후 유지 → AC-001/002/007 API+DB, 거부 사유 6종 노출 → AC-003~006 + 화면 문구는 Q12 수동) 충족. Founder 판단 대기 항목: `{input}` 정규화 후보 표시, 고정 7개 밖 `[ext]`의 404 재량.

#### #52 (AskUserQuestion 응답 3건) `정규화된 값 jpeg (권장)` · `SvelteKit 기본 404/400 유지 (권장)` · `/clear 후 새 세션에서 M3 (권장)`
- **결과**: M2 Founder digest ①의 재량 판단 2건 모두 유지(코드 변경 없음). M3는 재개 블록(메모리 `project-spec-upload-001-m2-complete.md` + `.moai/state/handoff/pending.json`)을 붙여넣어 새 세션에서 시작. 세션 3 종료 시점 상태: M2 완료·푸시, M3~M4 대기, 시크릿 미준비(의도됨 — M3 코드 후 안내), 다음 세션부터 `fable[1m]` 적용.

---

### 2026-08-30 — 세션 4: M3 진입 (`/clear` 후 재개, 메인 세션 Fable 5 `[1m]`)

#### #53
> (세션 3이 남긴 재개 블록 붙여넣기) `ultrathink. SPEC-UPLOAD-001 run 진입 (M3 시작). … 전제 검증 1)~4) … 실행: /moai run SPEC-UPLOAD-001 — M3(업로드 엔드포인트 + Blob 저장 + upload_attempt 기록 + UploadArea 클라이언트 힌트): manager-develop RED→GREEN sonnet → REFACTOR opus, Blob put은 테스트에서 스텁 … ㄱㄱ`
- **의도**: 새 세션에서 M3 시작. 재개 블록의 전제 4건을 먼저 기계 검증하고 통과하면 `/moai run`으로 진입.
- **전제 검증 결과(전부 통과)**: ① `git merge-base --is-ancestor cc518d7 HEAD` exit 0 · `origin/main...HEAD` → `0 0`(HEAD `3d77a91`) ② `pnpm test` 10 files / **131 passed** · `pnpm lint` exit 0 · `pnpm check` `0 ERRORS 0 WARNINGS` ③ `status: in-progress` · `~/.claude/settings.json`·`.claude/settings.json` 모두 `fable[1m]` ④ `.claude/worktrees/` 비어 있음, `git worktree list` main 하나. `moai session list --filter-spec` → `[]`(동시 세션 없음).
- **스폰 전 준비**: M3는 `@vercel/blob`이 처음 필요한 마일스톤 — 프로젝트 규칙(`block-npm-supply-chain-risk.mjs` 주석)대로 `pkg-check @vercel/blob`을 오케스트레이터가 먼저 실행(결과는 #55). `rtk`는 Git Bash PATH에 없어 `pnpm`을 직접 호출.

---

#### #54
> https://adk.mo.ai.kr/ko/utility-commands/moai-e2e ← 아 그리고 기능 구현이 완료되면 E2E 테스트를 할껀데 현재 윈도우용 Aside는 개발중이라 그냥 playwright를 사용하면 될까?
- **의도**: 구현 완료 후 E2E 도구 선택. **AI 응답**: 문서(WebFetch)와 로컬 `e2e.md` 워크플로 확인 — 웹 백엔드는 Playwright CLI가 주(primary), `agent-browser`는 AI 탐색형 대안이라 없어도 무방(`--tool playwright`로 강제 가능, Windows 제약 없음). 단 `spec.md` §5.5가 E2E를 Out of Scope로 둔 상태라 **범위 변경**임을 짚음 → sync에서 한 줄 정정 필요.
- **결정(권고, 사용자 확정 대기)**: M4 배포 뒤 배포 URL 상대로 `/moai e2e --tool playwright --url <URL> --record` 스모크 1회 — 로컬 dev 서버는 시크릿이 필요해 AI가 띄울 수 없고, 인수 기준 Q12(화면 문구 수동 확인)의 캡처 증거를 Playwright 스크린샷으로 채우는 용도. CI 미연결(§5.5의 "CI 배선 비용" 회피).

---

#### #55 (AI 주도) M3 RED→GREEN (manager-develop, Sonnet) → 오케스트레이터 재검증
- **스폰 전 준비**: `pkg-check @vercel/blob` exit 0 — lifecycle 스크립트 없음(`scripts`는 build/test뿐), 감사 결과는 하위 의존성 `undici <6.28.0` moderate 1건(GHSA-v3r7-h72x-cjcm)이나 요구 범위 `^6.23.0`이라 설치 시 6.28.0으로 해석. `@vercel/blob` 2.8.0의 `put` 옵션(`access: 'private'`·`token`·`contentType`·`addRandomSuffix`)은 Context7(`/vercel/storage`)로 원문 확인. 스폰 프롬프트에 오케스트레이터 설계 결정 2건 주입: ① Blob 저장소를 `Db`와 같은 패턴으로 `locals.blob`에 주입(테스트는 가짜 구현) ② 클라이언트 힌트는 `$lib/server` import 불가(SvelteKit 경계)라 `load()`가 차단 집합·별칭 표를 내려주고 컴포넌트가 경량 대조.
- **결과**: 커밋 `436eb73`(feat, 15 files +1396/-11) + `eca8119`(bookkeeping). 테스트 131 → **159**(신규 28: 업로드 엔드포인트 22 · upload-repo 1 · blob store 1 · UploadArea jsdom 4). M3 스코프 AC 22/22 PASS(AC-007 2절·008·009a·009b·010·011·012·013·014·015 + 엣지 6). 신규: `src/lib/server/blob/{store,store.test}.ts`, `src/lib/server/db/{upload-repo,upload-repo.test}.ts`, `src/routes/api/upload/{+server,server.test}.ts`, `src/lib/components/{UploadArea.svelte,UploadArea.test.ts}`. `@vercel/blob ^2.8.0` 추가.
- **오케스트레이터 재검증(main, `eca8119`)**: `pnpm test` 14 files / 159 passed · `pnpm lint` 0 · `pnpm check` 454 FILES 0 ERRORS 0 WARNINGS · `pnpm build` 0 · `pnpm test:coverage` **1차 실패**(훅 타임아웃 4건 — 커버리지 계측 + PGlite 14개 동시 기동 경합, `Duration 179s`) → `--maxWorkers=2` 재시도 159/159, `src/lib/server/**` 92.64 / 87.32 / 91.89 / 92.36(보고값과 일치). 경계 grep 3종 0건, `pnpm why undici` → 6.28.0. 기존 테스트 단언 삭제 0줄(`page.ssr.test.ts`는 `load` 데이터 리터럴 확장만). 증거 `.moai/state/verify/bb9ff997/m3-*.log`. 코드 열람으로 설계 결정 2건·put→INSERT 순서·`orphan_blob` 로그·64자 로그 절단 반영 확인.
- **에이전트 재량 판단(수용, digest ①로 이월)**: 🟡 AC-UPLOAD-014 2절 — 원문은 `html` 차단 후 `page.html` → `SIGNATURE_BLOCKED`이나 `decideUpload` 순서상(확장자 대조 먼저) `BLOCKED_EXTENSION`이 정답. 코드 유지·테스트를 실제 동작에 맞춤 + 위장 파일(`notes.dat`)로 시그니처 경로 별도 검증. **acceptance.md 문구 오류** → sync에서 정정 대상. 🟡 300자 파일명 — 255바이트 앞자름으로 확장자가 잘려 `415 NO_EXTENSION`(fail-closed). 위임 지시의 "200 기대"가 틀렸던 것 — 실제 파일시스템(NTFS/ext4/APFS)은 255바이트 초과 파일명을 만들 수 없어 조작된 요청에서만 도달.
- **REFACTOR 후보(Opus에 전달)**: (a) 오류 봉투 헬퍼가 정책·업로드 라우트 2곳 — M2 유보 조건 성립 (b) `logAttempt`/`recordUploadAttempt` 3회 반복 호출의 인자 중복 (c) `truncateForLog`가 `normalizeFilename`의 바이트 절단 루프 복제 (d) 커버리지 실행의 PGlite 경합 — `test:coverage` 워커 고정 (e) `decide.ts` ANCHOR 주석의 "클라이언트 힌트 호출부" 문구 부정확, 업로드 핸들러의 `@MX:ANCHOR` 적정성(호출부 1곳).

---

#### #56 (AI 주도) M3 REFACTOR (manager-develop, Opus) → 재검증 → push → M3 완료
- **결과**: 커밋 `18b1f12`(refactor, 11 files +355/-107) + `cb7953d`(bookkeeping). 검토 후보 B1~B9 판정 — **변경 6**: ① 오류 봉투 헬퍼를 `src/lib/server/upload/http.ts` 하나로(M2가 "호출부 2곳일 때"로 미뤄둔 항목, 정책 라우트 응답에 `details: {}` 키가 붙는 것이 유일한 전선 변화 — 문구 불변을 `test.each` 6건으로 고정, 화면 소비자 4곳은 `error?.message`만 읽음) ② `upload_attempt` 행을 단일 원본으로 두고 로그를 그 투영으로(`recordAndLogAttempt`, 핸들러 3곳의 필드 중복 24회 제거) ③ UTF-8 바이트 절단 루프를 `extension.ts`의 `truncateUtf8` 하나로(255B·64B 공용, `normalizeFilename` 동작 동일) ④ `test:coverage`에만 `--maxWorkers=2`(격리 계약·`hookTimeout` 불변, 2회 연속 exit 0·타임아웃 0건) ⑤ `decide.ts` ANCHOR 주석의 허위 호출 관계("클라이언트 힌트가 호출") 정정 ⑥ 접근성 2곳(`aria-describedby`, `aria-busy`). **유지 3**: `getBlobStore()` 매 요청 호출(`getDb()`와 같은 캐시 패턴), `decideUpload`의 크기 재확인(단일 진입점 계약), §Deviations 4·5(Founder 판정 대기). 판단 고정 테스트 12건 추가(159 → **171**), 기존 단언 수정 0줄.
- **오케스트레이터 재검증(`cb7953d`)**: `pnpm test` 15 files / 171 passed · `pnpm lint` 0 · `pnpm check` 456 FILES 0 ERRORS 0 WARNINGS · `pnpm build` 0 · `pnpm test:coverage` exit 0, `Hook timed out` 0건, `src/lib/server/**` **92.8 / 87.67 / 92.3 / 92.53**(RED→GREEN 대비 네 지표 상승 — 미커버 수 동일, 분모만 증가) · 경계 grep 3종 0건 · `git diff 7121040 -- 'src/**/*.test.ts' | grep '^-[^-]'` 무출력. MX 태그 8건(신규 2: 업로드 핸들러 ANCHOR, UploadArea WARN). 증거 `.moai/state/verify/bb9ff997/m3r-*.log`. 🟢 채택.
- **push**: `origin/main...HEAD` → `0 5` 확인 후 `git push origin main` → `3d77a91..cb7953d`, 이후 `0 0`.
- **M3 완료 판정**: plan §11 M3 기준(차단 파일이 사유와 함께 거부 → AC-008/009/012/014, 정상 파일 Blob 저장 → AC-013/015(가짜 저장소), 두 경우 모두 `upload_attempt` 1행 → AC-014/015) 충족. 실제 Vercel Blob 경로와 Neon 경로는 토큰·URL 부재로 M4 실측 대상. Founder 판단 대기: AC-014 2절 문구, 300자 파일명 처리.

---

#### #57 (AskUserQuestion 응답 4건) `코드 유지, 문서 정정 (권장)` · `유지 + CONSIDERATIONS 명시 (권장)` · `AI가 M1~M3 초안 작성 (권장)` · `시크릿 안내 → 이 세션에서 M4 (권장)`
- **결과**: M3 Founder digest ① 4건 확정 — AC-UPLOAD-014 2절은 코드 유지·acceptance.md 문구를 sync에서 `BLOCKED_EXTENSION`으로 정정 / 300자 파일명은 fail-closed 유지 + M4 `CONSIDERATIONS.md` "매우 긴 파일명"에 근거 명시 / §3 회고는 AI가 근거(#번호)를 모아 마일스톤별 초안을 쓰고 본인이 문장을 확정 / M4는 시크릿 준비 후 이 세션에서 진행. progress.md M3 Founder-attention에 판정 기록(`chore` 커밋). §3 초안 아래 작성 — **초안 표시가 남아 있는 동안은 본인 확정 전**.

---

#### #58
> 나 쉬어야되서 시크릿 안내 직전까지만 너가 작업 알아서 해줘 20분 뒤에 다시 돌아올꺼야
- **의도**: 자율 진행 범위 위임(#50과 같은 패턴). 정지 지점 = 시크릿 준비 안내(사용자 손이 필요한 첫 지점). **AI 작업**: progress.md M3 판정 기록 커밋 → PROMPT_LOG #57·#58 + §3 회고 초안(M1~M3) 커밋·push → 메모리 `project-spec-upload-001-m3-complete.md`(M2 superseded) → 시크릿 안내문을 채팅에 준비해 두고 대기. M4 스폰은 사용자 확인 후.

---

#### #59
> 그래 수동으로 시크릿 준비하고 저녁먹을꺼니까 founder-memo에 세션 마무리 업데이트해줘 / 잠시 세션을 마무리할꺼야
- **의도**: 세션 4 종료. 시크릿은 본인이 별도 터미널에서 준비(AI는 값을 보지 않는 규칙 그대로). **AI 작업**: `.moai/state/founder-memo.md`(git 미추적 개인 메모) §0을 오늘 기준으로 새로 쓰고 이전 §0은 `0-prev`로 — 상태 한 줄 · 파운더가 세션 밖에서 할 시크릿 5단계 · 결정 · 만든 것 · 다음 순서 · 판단 필요 · 함정(pre-commit 게이트 3분 초과, 커버리지 워커, 환경변수 둘 다 필수 등). 이 커밋 후 재개 블록(M4 진입)을 채팅에 출력하고 종료.
- **세션 4 종료 시점 상태**: M1~M3 완료·push(main `6801022` = origin), 171 tests · lint 0 · check 0/0 · 커버리지 92.8. M4~sync 대기. 시크릿 미준비(본인 작업 예정). §3 회고 초안 표시 남아 있음(본인 확정 필요).

---

### 2026-08-30 — 세션 5: 시크릿 준비 중 (메인 세션 Fable 5)

#### #60
> 지금 너가 제안해준 시크릿 준비 절차를 따르고 있거든? 근데 [Neon 프로젝트 생성 화면의 "Agent prompt"] 이게 나왔고 … / 맞다 기왕 킨거 "오늘 할일 브리핑해줘"도 추가할께
- **의도**: Neon이 안내하는 "코딩 에이전트에 붙여넣기" 문장(`npx skills add neondatabase/agent-skills … -y` → Neon CLI·MCP 설정 → "write my env vars")을 따라도 되는지 판단 요청 + 오늘 순서 브리핑.
- **결과**: **붙여넣지 않기로**. 근거 세 가지 — (1) "write my env vars"는 AI가 `DATABASE_URL` 값을 받아 쓰라는 뜻이라 접속 문자열이 대화 기록에 남음(`secret-management.md` §1 위배, `block-env-edit.mjs`가 어차피 차단) (2) `-y` 무확인 외부 패키지 설치는 M3의 pkg-check 습관과 반대 (3) Neon MCP는 프로젝트 전체 권한 API 키를 AI에 쥐여주는데 과제에 필요한 건 접속 문자열 하나. → "Prefer to wire it up yourself?"로 가서 세션 4 메모(founder-memo §0)의 5단계 수동 경로 유지. CONSIDERATIONS E5의 "AI가 값을 한 번도 안 봤다"는 서사와 일치.
- 🟡 **부수 관찰**: 이 항목을 Bash 히어독으로 쓰려다 `block-npm-supply-chain-risk.mjs`에 차단됨 — 로그 본문의 `npx skills add …` 문자열을 실행 명령으로 간주. 가드가 데이터/명령을 구분 못 하는 한계지만, 정확히 막아야 할 패턴을 막았다는 증거. Edit 도구로 기록.
- **브리핑**: 시크릿 5단계(본인) → `/clear` + 재개 블록 → M4(마이그레이션 실측·배포·README·CONSIDERATIONS) → Playwright 스모크 → sync → §3 회고 확정. 채팅에 Progress Board로 출력.

---

## 2. 사용한 스킬 / 플러그인 / MCP / 에이전트 / 도구

| 종류 | 이름 | 어디에(어떤 작업에) 왜 썼는지 |
|---|---|---|
| 코딩 에이전트 | Claude Code (Sonnet 5) + MoAI-ADK 3.1.2 (MoAI-Easy 스타일) | 전 과정. 단계마다 계획→실행→검증 흐름과 AskUserQuestion으로 의사결정을 구조화 |
| CLI 도구 | `gh` (GitHub CLI) | 내 레포 40개의 언어·의존성·배포 설정을 일괄 조사해 스택 후보를 근거 있게 추리는 데 사용 |
| CLI 도구 | PowerShell / Git Bash | settings.json PATH 수정이 실제로 bash를 찾는지 재현 검증 |
| 에이전트 | `manager-spec` (Opus) | SPEC 초안(plan.md) 작성, 보완점 반영, spec/acceptance/compact/progress 생성 — 요구사항 문서화 전담 |
| 스킬 | `moai-ref-owasp-checklist` | manager-spec이 파일 업로드 검증 파이프라인 설계 전에 OWASP 파일 업로드·경로 조작·MIME 스푸핑 기준선 로드 |
| 도구 | WebFetch (Vercel/Neon/file-type 공식 문서) | 4.5MB 본문 한도, Blob 한도, Neon 절전, `file-type` 반환값을 원문으로 확인해 URL 인용 — 기억 대신 근거 |
| 에이전트 | `plan-auditor` (Opus) | SPEC 기계 감사(EARS 형식·추적성·프론트매터·상한). 작성 맥락 없이 경로만 전달해 독립성 확보 |
| 에이전트 | `spec-interrogator` (Opus, 전역) | SPEC을 적대적으로 읽어 사람이 결정해야 할 판단 지점만 질문으로 추출 — 답은 하지 않음 |
| 훅 | `.claude/hooks/guards/*.mjs` (실습 레포에서 이관) | `.env` 편집 차단, curl/wget 차단, npm/pnpm 공급망 가드, 편집 후 lint, 턴 종료 시 변경 파일 표시 — AI 자신에게도 적용 |
| 수동 도구 | `pkg-check` (`projects/pkg-supply-chain-check.sh`) | M3에서 `@vercel/blob` 추가 전 실행(#55) — tarball의 lifecycle 스크립트·감사 결과를 설치 전에 확인, 하위 `undici` 권고는 해석 버전(6.28.0)으로 소거 |
| 플러그인 | `ui-ux-pro-max` (활성화만, 미사용) | 배포 성공 후 버퍼가 남으면 디자인 패스에 사용 예정 — 스폰 시 `model: "opus"` (사용 시점에 갱신) |
| 도구 | WebFetch (schemastore `claude-code-settings.json`) | settings.json에 effort 키가 없음을 스키마 원문으로 확인 → `CLAUDE_CODE_EFFORT_LEVEL` 환경변수 채택 |
| 에이전트 | `manager-develop` (Sonnet, RED→GREEN) | M1·M2 구현 — 실패 테스트 작성 → 최소 구현. 기계적 구현은 Sonnet으로 비용·세션 한도 절감 (#30 결정) |
| 에이전트 | `manager-develop` (Opus, REFACTOR) | M1·M2 리팩터 — 동작 보존 검증(기존 단언 0줄 수정)·경고 해소·왕복 절감·MX 태그. 판단이 필요한 단계만 Opus |
| 스킬 | `moai-workflow-tdd` · `moai-ref-api-patterns` | manager-develop 스폰 시 주입 — RED-GREEN-REFACTOR 규율, JSON 오류 봉투·검증 관례 |
| 라이브러리 | `@electric-sql/pglite` · `jsdom` · `@testing-library/svelte` | PGlite: 네트워크·크리덴셜 없이 실제 SQL로 리포지토리·엔드포인트 통합 테스트 / jsdom+Testing Library: AC-016a 낙관적 갱신→롤백 과도 상태 검증(브라우저 없이) |
| 라이브러리 | `@vercel/blob` 2.8.0 | M3 업로드 저장 — `put(access: 'private', token, contentType: application/octet-stream, addRandomSuffix: false)`. `BlobStore` 인터페이스 뒤에 숨겨 테스트는 가짜 구현, 실경로는 M4 실측 |
| MCP | Context7 (`/vercel/storage`) | `@vercel/blob` 2.8.0 `put` 옵션(`access: 'private'` 지원 여부·`token`·`contentType`)을 기억 대신 최신 문서로 확인한 뒤 스폰 프롬프트에 명시 |

> 이후 단계에서 쓰는 스킬/에이전트는 사용 시점에 추가.

---

## 3. 판단 근거 회고 (본인 작성)

> AI가 준 결과 중 **그대로 쓴 것 / 고쳐 쓴 것 / 버린 것**과 그 이유. AI가 놓쳤거나 틀렸는데 내가 잡아낸 부분.
> _(2026-08-30 AI 초안 — #57 결정. 근거는 §1의 `#번호`. 본인이 문장을 다듬어 확정하기 전까지 초안 표시를 유지한다.)_

### 세션 1 — 환경과 SPEC

- **그대로 쓴 것**: plan-audit 2회(0.66 → 0.86)와 그 사이의 자동 수정 절차(#16~#18). 결함이 전부 기계적(추적성·AC 누락)이라 내가 끼어들 이유가 없었고, 결과만 확인했다. 심문 17개(#22~#23)도 AI 권장과 같은 쪽으로 판정했는데, 이건 "AI가 시켜서"가 아니라 항목마다 PRD 근거 줄(#21)을 붙이게 한 뒤 근거를 읽고 동의한 것이다.
- **고쳐 쓴 것**: 기술 스택. AI는 처음에 cubrain(Spring Boot) 스택을 권했는데, 되물어 보니 "최적"이 아니라 "다뤄본 코드가 있음"이었다(#04). 과제 규모와 무료 단일 배포를 놓고 SvelteKit + Neon + Vercel Blob으로 바꿨다(#05). 반대로 내가 든 근거("JPA는 다량 조회에 유리")는 AI가 정정했고, 그 정정이 맞아서 받아들였다. 실습 레포의 보안 훅(#09~#10)은 원본을 그대로 옮기지 않고 pnpm·ESM·`.env.example` 예외에 맞춰 손봤다.
- **버린 것**: 칸반 모드(#01 — Windows 미지원, 환경 문제에 시간을 쓰지 않기로), Spring Boot·JPA·Drizzle(규모 대비 과함), pillwriter의 spec-authority 파이프라인(#13 — 도메인이 작고, 과제가 오히려 "AI 추천을 비판적으로 취사선택하는 과정"을 평가하므로). Playwright E2E는 SPEC에서 보류(#18)했다가 M3 뒤에 배포 URL 스모크 1회로 되살릴 예정(#54).
- **AI가 놓친 것을 내가 잡은 것**: 칸반 모드가 이 환경에서 성립하지 않는다는 진단은 AI가 했지만, 시작 명령을 두 번 실행해 오류를 재현시킨 건 나였다. "cubrain이 최적이냐"는 되물음(#04)이 없었으면 무거운 스택으로 갔을 것이다. 심문 초안에 PRD 근거 줄을 붙이게 한 것(#21)도 내 요구다 — 그 덕에 NONE 3개(순수 제품 판단)가 분리됐다.

### M1 — 스키마와 순수 검증 코어

- **그대로 쓴 것**: 판정 로직을 순수 함수 4개로 뽑은 설계, 별칭 표 단일 원본, 텍스트 실행 파일용 prefix 스니핑(#11 보완점 3개 — 이건 AI 오케스트레이터가 SPEC 초안에서 스스로 잡은 것이다). CRLF 문제의 근본 해결(`.gitattributes`, #33).
- **고쳐 쓴 것**: 에이전트가 만든 스캐폴드의 `eslint.config.js`(ESLint 10에서 배열 미전개로 즉사)와 `.prettierignore`(#31) — AI 산출물을 AI가 고친 경우라 내 몫은 아니다.
- **버린 것**: GLM 저비용 위임(#08 — 코드량이 작아 절약 폭이 없고, 별도 세션이 필요). Opus 단일 배분(#30 — 세션 한도 429를 실제로 맞고 나서 Fable/Opus/Sonnet 역할 배분으로).
- **AI가 놓친 것을 내가 잡은 것**: `progress.md`를 SPEC 단계에서 만들어 둔 것(#28). 템플릿이 그렇게 시키지만 pillwriter 이력을 확인시켰더니 run 단계 산출물이 맞았다. 커밋 메시지 언어(#29)는 AI 기준("에이전트가 읽으니 en")을 듣고도 평가자 읽기 톤을 우선해 ko로 남겼다. 그리고 240줄짜리 `progress.md`를 사람이 다 읽을 필요가 없다는 것(#32) — 이후 마일스톤마다 3블록 digest만 받는다.

### M2 — 정책 API와 정책 화면

- **그대로 쓴 것**: `Db` 인터페이스로 Neon/PGlite 통합, `locals.db` 주입, 200개 상한을 단일 SQL로, UNIQUE 위반 하나로 `EXT_DUPLICATE`/`EXT_IS_FIXED` 분기(#39). REFACTOR의 `untrack()`(경고 억제 주석 대신 의도를 코드로), `getPolicy` 왕복 절반(#51).
- **고쳐 쓴 것**: 없음 — 재량 판단 2건(`ALIAS_FOLDED` 문구의 `{input}`, 고정 7개 밖 `[ext]`의 404)은 근거를 읽고 그대로 유지했다(#52).
- **버린 것**: 오류 봉투 헬퍼의 조기 추출(#51 — 호출부가 하나뿐일 때 뽑으면 M3 모양을 추측하는 선반영이 된다; 실제로 M3에서 두 번째 호출부가 생기고 나서 뽑았다). 워커 에이전트에 `[1m]` 할당(#48 — 마일스톤 단위 초기화가 이미 구조상 자동).
- **AI가 놓친 것을 내가 잡은 것**: PROMPT_LOG 갱신을 AI가 "M2 끝나고 한꺼번에"로 미루고 있던 것(#43). 지적하자 인정하고 즉시 채웠고, 재발 방지로 갱신 주기를 룰북에 박았다(#44). 메인 세션 컨텍스트가 256K로 잡혀 있던 것(#47)도 상태줄을 보고 내가 물어서 `fable[1m]`으로 바꿨다.

### M3 — 업로드 엔드포인트·Blob·기록

- **그대로 쓴 것**: Blob 저장소를 DB와 같은 주입 패턴으로(테스트는 가짜 저장소), put → INSERT 순서와 고아 Blob 로그, 클라이언트 힌트가 서버 모듈을 참조하지 않는 구조(SvelteKit 경계), 오류 봉투 헬퍼 추출과 "로그는 행의 투영"(#55~#56). `@vercel/blob`은 넣기 전에 `pkg-check`로 공급망 점검을 거쳤다.
- **고쳐 쓴 것**: 위임 지시의 기대값. 오케스트레이터가 "300자 파일명 → 성공"을 기대했지만 실제 코드는 255바이트 앞자름으로 확장자가 잘려 `NO_EXTENSION`이었다 — 구현 에이전트가 이를 보고 코드가 아니라 테스트 기대를 고쳤고, 나는 거부 방향(fail-closed)을 유지하기로 했다(#57).
- **버린 것**: 판정 순서 변경(시그니처를 확장자보다 먼저)과 "절단 전 확장자 추출" 대안 — 둘 다 M1에서 감사·고정한 계약을 건드리는 데 비해 얻는 게 작다.
- **AI가 놓친 것을 AI가 잡은 것 (기록해 둘 가치가 있어서)**: `acceptance.md` AC-UPLOAD-014 2절의 사유 코드가 틀려 있었다(`SIGNATURE_BLOCKED`라 썼지만 순서상 `BLOCKED_EXTENSION`). SPEC 단계 감사 2회와 심문을 통과한 문서에 남은 오류를 구현 에이전트가 실제 동작으로 발견했다. 문서가 아니라 코드가 맞다고 판정했고, 문서는 sync에서 정정한다. 이 건은 "SPEC을 통과시켰다고 끝이 아니다"의 사례로 남긴다.

_(M4·sync 회고는 해당 마일스톤 종료 시 추가)_
