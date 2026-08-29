# SPEC-UPLOAD-001 — Progress

> 단계별 증거 기록. §E.1은 manager-spec(plan), §E.2·§E.3은 manager-develop(run), §E.4는 manager-docs(sync)가 소유한다.

## §E.1 Plan-phase Audit-Ready Signal

```yaml
spec_id: SPEC-UPLOAD-001
tier: M
plan_status: audit-ready
plan_complete_at: 2026-08-29T10:58:34Z
plan_revised_at: 2026-08-29T11:22:00Z   # plan-audit iter1 결함 수정 반영
plan_audit_verdict: PASS                 # iter2, 0.86 (Tier M 임계 0.80)
plan_post_pass_fixes_at: 2026-08-29T11:48:00Z  # N1·N3 선수정 + N2·N4·N5
spec_version: "0.2.0"                    # founder verdicts Q1–Q17 반영
verdicts_applied_at: 2026-08-29T12:10:00Z
artifacts:
  - spec.md          # 12-field frontmatter + HISTORY 3행 + 16 REQ (GEARS) + 5 Out of Scope
  - plan.md          # 결정 7건 + 검토 게이트 보완 3건 + §4.1 문구 상수 표 + 고려사항 매트릭스 28항목
  - acceptance.md    # AC-UPLOAD-001~016 (Given-When-Then) + 품질 게이트 Q1~Q12
  - spec-compact.md  # 자동 요약 다이제스트
requirement_count: 16
acceptance_criterion_count: 16
tier_ceiling: { requirements: 16, acceptance_criteria: 16 }
development_mode: tdd
coverage_target: 85
coverage_scope: "src/lib/server/**"
reason_codes:                            # 거부 10종 (TOO_MANY_FILES 제거됨)
  http_400: [EXT_EMPTY, EXT_TOO_LONG, EXT_INVALID_CHARS]
  http_409: [EXT_DUPLICATE, EXT_IS_FIXED, EXT_LIMIT_REACHED]
  http_413: [FILE_TOO_LARGE]
  http_415: [BLOCKED_EXTENSION, SIGNATURE_BLOCKED, NO_EXTENSION]
notice_constants: [ALIAS_FOLDED, CLIENT_HINT_BLOCKED, CLIENT_HINT_DISCLAIMER]
```

**Plan-phase 자체 검증**

| 항목 | 결과 | 증거 |
|---|---|---|
| SPEC ID 정규식 | PASS | Bash `[[ "SPEC-UPLOAD-001" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]]` → `SPEC-UPLOAD-001 PASS` |
| Frontmatter 12필드 | 충족 | `spec.md` 1~16행 (+ optional `tier`, `issue_number`) |
| `phase` 값 | 릴리스 타깃 | `"v0.1.0 target"` — 금지된 lifecycle 토큰(plan/run/sync/mx) 아님. `version`(0.2.0)과 별개 축이므로 함께 올리지 않는다 |
| Out of Scope 규약 | 충족 | `spec.md` §5에 `### 5.N Out of Scope — <topic>` h3 5개, 각 `-` 불릿 보유 |
| Tier M 상한 | 충족 (포화) | REQ 16/16, AC 16/16 (독립 계수) — 잔여 여유 0 |
| GEARS 5유형 커버 | 충족 | Ubiquitous 6 · Event-driven 5 · Unwanted 3 · State-driven 1 · Optional 1 |
| REQ↔AC 양방향 추적 | 충족 | REQ 16개 전부가 최소 1개 AC에서 참조됨, 고아 AC 0건 |
| 외부 사실 인용 | 충족 | `plan.md` §14 — Vercel 본문 한도·Blob 한도·Neon scale-to-zero·file-type README URL 5건, 미검증 1건 명시 |

**Audit 이력**

| 이터레이션 | 판정 | 점수 | 조치 |
|---|---|---|---|
| iter1 | FAIL | 0.66 (Tier M 임계 0.80, Traceability 0.50이 지배 요인) | blocking D1~D6 전부 수정 + optional D7~D12 전부 반영 → 재감사 |
| iter2 | **PASS** | **0.86** (Clarity 0.85 · Completeness 0.85 · Testability 0.80 · Traceability 0.95) | D1~D12 중 11건 완전 해소 + D10 부분 해소, 미해소 blocking 0건. post-PASS 권고 N1·N3 선수정, N2·N5 함께 반영, N4는 문서화로 처리 → **재감사 없이 run 단계 진입 가능** |
| interrogation (Q1~Q17) | founder 판정 | — | spec-interrogator가 제기한 판단 지점 17건에 대해 founder가 전건 판정. v0.2.0으로 반영 (아래 표) |

**Founder verdict 반영 (v0.2.0, 2026-08-29)**

| Q | 판정 | 반영 |
|---|---|---|
| Q1·Q9·Q16 | 요청당 파일 **1개** | REQ-012 재작성, `MAX_FILES_PER_REQUEST`·`TOO_MANY_FILES` 전면 제거, plan §3 단계 1~2·§5 다중 파일=순차 요청 |
| Q2 | 요청 단위 거부는 테이블 미기록 | REQ-014에 "파일 단위 판정마다 1행" + 본문 전 413은 로그만, AC-011에 행 없음 단언 |
| Q3 | API AC는 코드·`details`만 | AC-003·004·008·010에서 화면 단언 제거 → 품질 게이트 Q12(수동)로 이관 |
| Q4 | 읽기 A (관찰·기록 전용) | REQ-013 재작성, AC-010에 `detected_mime` 기록 절 추가 |
| Q5·Q7·Q15 | 전부 대표형 + 접힘 안내 | REQ-007·008에 후보 별칭 정규화 명시, `ALIAS_FOLDED` 상수 신설, 엣지 케이스 3행 |
| Q6 | 정규화·절단 후 파일명 저장 | REQ-011 재작성 + DDL `original_name` 주석 |
| Q8 | `/api/uploads/recent` 제외 | spec §4·plan §5에서 제거, plan §1.1 불릿 + 매트릭스 E9 |
| Q10 | 클라이언트 힌트 구현 | REQ-016에 3개 항목 명시 + `CLIENT_HINT_BLOCKED`/`CLIENT_HINT_DISCLAIMER` 상수 |
| Q11 | 고아 Blob 감수 | plan §7에 순서(`put`→`INSERT`)·`orphan_blob` 로그·잔여 위험, 매트릭스 E8 |
| Q12 | 문구 상수 표 고정 | plan §4.1 신설(코드 10 + 알림 3), AC는 상수 참조, 게이트 Q12 신설 |
| Q13 | 헤더 + 실측 + 플랫폼 최후 방어선 | REQ-012 두 겹 강제, AC-011에 헤더 부재·허위 신고 절 추가 |
| Q14 | `NO_EXTENSION` 거부 유지 | 변경 없음 + 매트릭스 3-1-c에 화이트리스트 대안·전환 조건 명시 |
| Q17 | `PROMPT_LOG.md` SPEC 밖 유지 | 변경 없음 (게이트 Q11이 계속 담당) |

iter2 post-PASS 권고 조치:

| 권고 | 등급 | 조치 |
|---|---|---|
| N1 AC-016a-NO-EXECUTION-SURFACE | blocking | (a)안 채택 — `plan.md` §8에 jsdom + `@testing-library/svelte` 5.4.2 컴포넌트 테스트 절 신설, `spec.md` §4에 `src/lib/components/FixedExtensionList.test.ts` 1건 추가, §6에 컴포넌트 검증 항목 추가, `acceptance.md` Q1·Q6에 컴포넌트 테스트 반영. Playwright 보류 결정은 불변 |
| N2 AC-016b-BROWSER-FRAMING | optional | AC-016b의 "브라우저에서 JavaScript를 비활성화한 채" → "페이지를 HTTP `GET`으로 요청하면(브라우저·스크립트 실행 없이 응답 본문만 확인)" |
| N3 REQ-007-NORMALIZATION-FORM | optional | "유니코드 정규화" → "**NFC 정규화**", 그리고 파일명 NFC ↔ 입력 NFKC를 섞지 않아야 한다는 보안 근거를 REQ 본문에 명시 |
| N4 REQ-013-PARTIAL-AC-DEPTH | optional | AC를 늘리지 않고 아래 "미해결"에 미검증 하위 동작 2건을 기록 |
| N5 G5-SUCCESS-CRITERION | optional | G5 성공 판정을 "REQ-UPLOAD-007 ~ 014" → "AC-UPLOAD-008 ~ 015(모두 엔드포인트 직접 호출)"로 통일 |

iter1 결함별 조치 요약:

| 결함 | 조치 |
|---|---|
| D1 REQ-015-NO-AC | REQ-016(policy-ui)에 AC-UPLOAD-016a/016b 신설, `spec.md` 목표표에 G6 추가로 결속 |
| D2 REQ-012-NO-AC | AC-UPLOAD-010·011의 Given을 "빈 차단 목록"으로 명시하고 REQ-013을 추적선에 병기 |
| D3 MANDATORY-BEHAVIOR-NO-REQ | REQ-002(고정 토글 영속)·REQ-003(커스텀 삭제) 신설, AC-001·AC-007 재지목 |
| D4 DELIVERABLE-NO-GATE | 품질 게이트 Q11 신설 — `PROMPT_LOG.md` 3개 절 완결성 |
| D5 AC-012-NOT-BINARY | "흔적이 없으며"를 본문 리더 스파이 미호출 단언으로 치환 (AC-UPLOAD-011) |
| D6 Q10-COUNT-UNRESOLVABLE | Q10을 `plan.md` §13 실제값(배치 6곳 / 태그 3종)에 정렬 |
| D7 DECISION-COUNT-DRIFT | `spec.md` "결정 8건" → "결정 7건" 2곳 |
| D8 OUT-OF-SCOPE-COUNT-DRIFT | `plan.md` "h3 4개" → "h3 5개" |
| D9 IMPL-DETAIL-IN-REQ | REQ-009에서 라이브러리명 제거, REQ-016에서 프레임워크 파일·API 제거 |
| D10 REQ-011-COMPOUND | REQ-012 문장 modality를 `거부해야 한다`로 통일 (분해는 상한 때문에 보류) |
| D11 COVERAGE-SCOPE-MISMATCH | `spec.md` §6과 Q2를 `src/lib/server/**`로 통일 |
| D12 TEST-FILE-GAP | `spec.md` §4에 엔드포인트 테스트 2개 추가 |

**예산 재배분 (Tier M 상한 준수)**

- REQ: 15 → 16. D3가 2건을 요구하므로 기존 REQ-004(패턴 위반 400)와 REQ-005(충돌 409)를 **REQ-006 커스텀 추가 거부 계약 1건**으로 통합해 1칸을 확보했다. 두 요구는 트리거(커스텀 추가 시도)와 응답 형태(사유 코드 + 거부)가 동일하고 코드·상태만 다르므로 표 하나로 표현하는 편이 응집도가 높다.
- AC: 16 → 16. D1이 요구하는 policy-ui AC를 넣기 위해 기존 AC-005(20자)와 AC-006(문자 집합)을 `AC-UPLOAD-005a`/`005b` 한 쌍으로 묶어 번호 1개를 확보한 뒤 007~016을 한 칸씩 당기고, 신규 AC를 `016a`/`016b`로 배치했다.

**미해결 / 다음 단계 의존**

- ~~`issue_number: 0` 자리표시자~~ → Phase 2.5 완료: GitHub Issue **#1** 생성(https://github.com/Seung-zedd/flow-assignment/issues/1), `spec.md` `issue_number: 1` 기록, Issue에 SPEC 경로 역참조 댓글.
- Vercel Hobby Blob 무료 포함량 수치는 미검증(`plan.md` §14). README 작성 시 대시보드 실측값 사용.
- REQ·AC 모두 상한 포화(16/16). 추가 요구가 나오면 상한 완화가 아니라 통합·분해 또는 SPEC 분할로 대응한다.
- **REQ-013 하위 동작 4건 중 2건이 AC 미보유** (N4, 의도적 수용 — AC를 늘리지 않기로 결정). REQ-013은 빈 차단 목록 상태에서 ① 크기 제한 ② 개수 제한 ③ 확장자 부재 거부 ④ 내용 판별이 모두 계속 동작할 것을 요구하는데, 빈 목록 Given을 가진 AC는 ③(AC-010)과 ①(AC-011) 둘뿐이다.
  - **② 개수 제한** — **해소됨(Q1 판정)**. 요청당 1파일 확정으로 개수 제한 자체가 사라져 REQ-013의 하위 동작에서 제거됐다.
  - **④ 내용 판별 지속** — **해소됨(Q4 판정)**. AC-010에 "빈 목록에서 PNG 내용 `notes.txt` → 성공 + `detected_mime` 기록" 절을 추가해 관측 가능한 형태로 덮었다.
  - 결과적으로 REQ-013의 하위 동작 3건(크기·확장자 부재·내용 판별)이 모두 AC로 덮인다.

## §E.2 Run-phase Evidence

### M1 (RED→GREEN, Sonnet)

#### Acceptance scenario completion — 21 / 21 (M1 스코프)

| # | 시나리오 | 테스트 파일 | 상태 |
|---|---|---|---|
| 엣지 | `archive.tar.gz` → `['tar','gz']` | `extension.test.ts` | PASS |
| 엣지 | `report.PDF` → `['pdf']` (대소문자 무시) | `extension.test.ts` | PASS |
| 엣지 | 300자 파일명 → 255바이트 절단, 예외 없음 | `extension.test.ts` | PASS |
| 엣지 | `..\..\etc\passwd` → 경로 구분자·`..` 제거 후 후보 없음 | `extension.test.ts` | PASS |
| 엣지 | `exe.`(후행 점) → 정규화 후 `exe` | `extension.test.ts` | PASS |
| 엣지 | `.`만 있는 파일명 / 빈 파일명 → 예외 없이 후보 없음 | `extension.test.ts` | PASS |
| 엣지 | `#!/bin/sh` 셔뱅 → `sh` 합성 확장자 탐지 | `signature.test.ts` | PASS |
| 엣지 | `scan.tiff` 별칭 → `tif` (canonicalizeExtension) | `extension.test.ts` | PASS |
| 엣지 | 커스텀 `jpeg` 추가 시 `jpg`로 정규화 | `extension.test.ts` | PASS |
| 엣지 | `jpg` 차단 상태에서 `photo.jpeg` → `matched: jpg` | `decide.test.ts` | PASS |
| 엣지 | 목록에 `jpg` 있을 때 입력 `jpeg` → 대표형 동일 확인 | `extension.test.ts` | PASS |
| AC-009a (단위) | `report.exe.txt` → 첫 세그먼트 `exe` matched (마지막 아님) | `decide.test.ts` | PASS |
| AC-009b (단위) | `.env` 업로드 → `matched: env` (dotfile 추출) | `extension.test.ts` | PASS |
| AC-010 (단위) | 빈 차단 목록 + `README` → `NO_EXTENSION` (정책 무관 강제) | `decide.test.ts` | PASS |
| AC-010 (단위) | 빈 목록 + PNG 내용 `notes.txt` → 성공 + `mismatch:true` | `decide.test.ts` | PASS |
| AC-011 (단위) | `sizeBytes > MAX_UPLOAD_BYTES` → `FILE_TOO_LARGE`(413), 정확히 4MB는 통과 | `decide.test.ts` | PASS |
| AC-012 (단위) | `exe` 차단 + PE 시그니처(`photo.jpg`) → `SIGNATURE_BLOCKED`(`detected:"exe"`) | `decide.test.ts` + `signature.test.ts` | PASS |
| AC-013 (단위) | 차단 목록에 `jpg`/`jpeg` 없을 때 `photo.jpeg`(JPEG 내용) → 성공 | `decide.test.ts`(별칭 동치) | PASS |
| AC-014 (단위) | `html` 미차단 시 `<!DOCTYPE html>` → 성공(prefix 적중이 곧 거부 아님) | `signature.test.ts` + `decide.test.ts` | PASS |
| G1(스키마) | 고정 확장자 7개 `is_blocked=false` 시드, `sort_order` 1..7 | `schema.test.ts` | PASS |
| G1(스키마) | `UNIQUE`·`CHECK kind`·`CHECK format`·`upload_attempt CHECK outcome`·인덱스 존재 | `schema.test.ts` | PASS |

엔드포인트 레벨 AC(AC-001~007, AC-008 HTTP 계약, AC-012~015 HTTP/DB 통합, AC-016a/016b 화면)는 정책 API·업로드 라우트·UI가 아직 없으므로 **deferred (M2/M3)**입니다.

#### Test counts

- 테스트 파일 5개, 테스트 87개, 전부 PASS. 실행: `pnpm test` → exit 0.
- `pnpm lint` (prettier --check + eslint) → exit 1 — **이번 마일스톤이 만든 파일은 0건**, 남은 11건은 스캐폴드 커밋(`4c6112e`)에서 이미 포맷이 어긋난 기존 파일(`eslint.config.js`, `package.json`, `pnpm-workspace.yaml`, `prettier.config.js`, `src/app.d.ts`, `src/app.html`, `src/lib/index.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `tsconfig.json`, `vite.config.ts`) — PRESERVE 범위 밖이라 손대지 않음(pre-existing baseline, NOT a new defect).
- `pnpm check` (svelte-check) → exit 0, `0 ERRORS 0 WARNINGS`.
- `pnpm build` → exit 0.
- `pnpm test:coverage` (`src/lib/server/**`, v8): 전체 Stmts 98.82% · Branch 92.68% · Funcs 100% · Lines 98.75% (85% 목표 상회). 파일별: `reason-codes.ts` 100/80/100/100(라인 57 `formatMessage` 미치환 fallback 분기 미커버), `signature.ts` 96.15/83.33/100/96(라인 13 `startsWithBinary`의 길이-부족 조기 반환 분기 미커버) — `extension.ts`·`decide.ts`는 4개 지표 전부 100%.

#### Migration status

- `migrations/001_init.sql`을 PGlite(in-memory)에 `scripts/migrate.ts`의 `loadMigrations()` 헬퍼로 적용 — 시드·제약 전부 통과(`schema.test.ts` 10 테스트 PASS).
- `scripts/migrate.ts`의 Neon 경로(`sql.query()` 다중 문장 분리 적용)는 `DATABASE_URL` 미설정으로 **이 환경에서 검증 불가 — 명시적 gap**입니다. M4 배포 직전 실측 필요.

#### Deviations from spec/plan

1. `.prettierignore`에 `.mcp.json`을 추가했습니다(계획대로) — 다른 스캐폴드 baseline 파일은 건드리지 않았습니다.
2. `signature.test.ts`의 PNG 픽스처는 8바이트 서명만으로는 `file-type`이 탐지하지 못해(내부적으로 IHDR 청크까지 파싱) 최소 유효 IHDR 청크(길이 13 + `IHDR` + 데이터 13바이트 + CRC 4바이트)를 덧붙였습니다 — 계획 문서에 없던 구현 중 발견 사항이며 동작·계약에는 영향 없습니다.
3. TIFF는 `file-type`이 실제 IFD 태그 파싱을 요구해(최소 유효 바이너리 구성이 M1 범위를 넘어섬) `signature.test.ts`의 실바이트 픽스처에서 제외했습니다. 별칭 폴딩 자체는 `canonicalizeExtension('tiff') === 'tif'`(`extension.test.ts`)와 `decide.test.ts`의 스텁 `detected` 입력으로 계속 커버합니다.
4. 계획된 13개 산출물(§A.1) 전부 생성·수정 완료 — **drift-guard 0%**(planned-vs-actual 파일 목록 완전 일치).

#### Founder-attention notes

- `scripts/migrate.ts`의 Neon 실경로는 미검증 gap입니다(§Migration status).
- 커버리지 미달 2줄(§Test counts)은 REFACTOR 단계(Opus 2차 스폰)에서 다듬을 후보로 남겨둡니다 — 동작에는 영향 없는 방어적 분기입니다.
- 잔여 lint 11건은 M1 스코프 밖 기존 스캐폴드 파일이며, PRESERVE 원칙에 따라 그대로 두었습니다.

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_

## §F Phase 4 Mode Selection

> run 단계 진입 시 오케스트레이터가 기록. 2026-08-29 세션 2 (`01ba20be`).

**입력 파라미터**

| 항목 | 값 |
|---|---|
| tier | M |
| scope | 약 25개 소스 + 8개 테스트 파일 (`spec-compact.md` "Files to create / modify") — 전부 신규(greenfield, `package.json` 없음) |
| domain count | 4 (db / server-validation / api / ui) + test |
| language mix | TypeScript · Svelte 5 · SQL |
| concurrency benefit | LOW — 코딩 중심, M1→M2→M3→M4 순차 의존 |
| Agent Teams | 요청 없음 (`--team` 미지정) |
| harness level | **standard** (auto: file_count > 3, feature). 보안 키워드로 thorough 조건도 성립하나 `contract.md` 추가 산출물이 사용자의 과잉 계획 금지 결정(PROMPT_LOG #15)과 충돌 → standard 유지. evaluator-active는 Phase 2.8a final-pass에서 Security 25%를 HARD FAIL 기준으로 판정 |
| route | **A** (Hybrid Trunk main-direct, Tier M) — 브랜치·PR 없음, manager-develop이 `main`에 직접 커밋·push |
| secrets | `DATABASE_URL`·`BLOB_READ_WRITE_TOKEN` 미설정, `.env` 없음 → M1~M3는 PGlite·모의 Blob으로 진행, M4 배포 직전 필요 |

**모드 평가**

| 모드 | 선택 | 근거 |
|---|---|---|
| direct | 아니오 | 신규 코드 900+ LOC, 의미 변경 |
| serial | **선택** | 코딩 중심 + 마일스톤 간 순차 의존. 마일스톤당 manager-develop 1명 순차 위임 |
| fanout | 아니오 | 조사 작업이 아닌 코딩 작업 (Anthropic coding-task parallelism caveat) |
| sweep | 아니오 | 기계적 일괄 변환이 아님 |

**Decision: serial**

근거 — 순수 함수 4개(M1)에 이후 모든 판정이 종속되므로 마일스톤을 순서대로 확정·검증하는 편이 안전하고, 파일 수(약 33)와 4개 도메인이 `manager-lead` Tier L 진입 조건(≥3 M AND ≥10 files, Tier L)에는 해당하지 않는다. 동일 세션에서 마일스톤 범위가 바뀌면(blocker report) Phase 4를 재평가한다.

**Plan Audit Gate**: 재실행 — iter2 PASS 0.86(`review-2.md`, 20:19) 이후 v0.2.0 반영(21:26~21:31)으로 artifact hash 변경 → skip 계약 3조건 중 (3) 불충족. 결과는 §F.1에 기록.

**모델 배분 (사용자 결정 2026-08-29 22:0x, PROMPT_LOG #30)** — Opus 단일 배분으로 M1 첫 스폰이 세션 사용량 한도(429)에 걸려 중단된 뒤 pillwriter 방식으로 전환:

| 역할 | 모델 | 근거 |
|---|---|---|
| 메인 세션(오케스트레이터) | Fable | 사용자와 직접 상호작용 |
| SPEC 작성·감사 (manager-spec / plan-auditor / sync-auditor) | Opus | 프로필 행 그대로 |
| 단순 구현 + TDD RED→GREEN (manager-develop) | **Sonnet** | `llm.yaml` `agent_overrides` |
| TDD REFACTOR + 구현 리뷰 (manager-develop 2차 스폰) | **Opus** | 스폰 시 `model: "opus"` 명시 — 프로필 한 행에 두 모델을 못 적어 문서화된 편차 |

M1 1차 시도(Opus) 기록: 스캐폴드(package.json·vite.config.ts·src/·pnpm-workspace.yaml 등 13파일)까지 런타임 L1 워크트리에서 생성 후 429로 종료 → 오케스트레이터가 main 체크아웃으로 이관·커밋, 워크트리 정리. 홈 폴더 `C:\Users\sdok1`의 `pnpm-workspace.yaml`이 install을 흡수하는 문제는 프로젝트 `pnpm-workspace.yaml`(`packages: []`)로 격리.

**progress.md 기록 방식 (사용자 결정, PROMPT_LOG #28)**: 이후 기록은 pillwriter 방식 — RED→GREEN이 끝난 마일스톤마다 §E.2에 `Acceptance scenario completion / Test counts / Migration status / Deviations / Founder-attention` 5절로 남기고, 코드와 분리한 `chore(SPEC-UPLOAD-001): M<n> run-phase bookkeeping` 커밋으로 올린다. 이미 커밋된 §E.1은 유지.

### §F.1 Plan Audit Gate (run-gate)

| 항목 | 값 |
|---|---|
| verdict | **PASS** 0.85 (Tier M 임계 0.80) |
| dimensions | Clarity 0.80 · Completeness 0.80 · Testability 0.85 · Traceability 0.95 |
| must-pass | 7/7 (MP-4 단일 언어 N/A) |
| audit model | Claude-only (`audit_model` 키 없음, codex/GLM 미호출) |
| report | `.moai/reports/plan-audit/SPEC-UPLOAD-001-2026-08-29.md` (로컬) |
| blocking | 3 — D1 `plan.md:301` 매트릭스 3-1-f `5개` 잔존 / D2 `spec.md:209`·`plan.md:358` rate-limit 근거가 삭제된 개수 상한 참조 / D3 spec §5에 `/api/uploads/recent` Out of Scope h3 부재 |
| optional | D5 `EXT_EMPTY` AC 미보유 → AC-005b 절 추가 / D6 `upload-repo.ts` "최근 조회"·`created_at DESC` 근거 정정 / D4·D7 조치 불요 |
| 조치 | 요구사항 의미 불변의 문장 정합성 교정 → manager-spec 자동 반영(D1·D2·D3·D5·D6), **재감사 생략** (감사관 권고 "진입 차단 아님") |
