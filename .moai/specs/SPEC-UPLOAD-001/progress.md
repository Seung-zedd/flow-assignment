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

#### REFACTOR (Opus)

커밋 `07d4602`. 동작 변경 없음 — RED→GREEN이 만든 87개 테스트를 하나도 수정하지 않은 채 그대로 통과시키며, 추가한 4건을 포함해 91개가 통과한다.

##### 무엇을 왜 바꿨나

1. **줄바꿈 정규화 (Q5 게이트 해소)** — `.gitattributes`에 `* text=auto eol=lf`를 추가하고 `git add --renormalize .` 후 `pnpm format`을 돌렸다. `pnpm lint`가 22개 파일에서 실패하던 원인은 스타일이 아니라 **줄바꿈**이었다: Windows `core.autocrlf=true`가 체크아웃 시 CRLF를 넣는데 Prettier의 `endOfLine` 기본값이 `lf`라 전 파일이 포맷 위반으로 잡혔다. `git ls-files --eol`로 `i/lf w/crlf`를 확인해 진단했고(인덱스는 이미 LF), 파일마다 고치는 대신 저장소 차원에서 한 번 막았다. renormalize 자체는 내용 diff 0건 — `.gitattributes` 추가와 `pnpm format`의 줄바꿈 치환만 남았다.
2. **탐지 결과 타입 단일화** — `signature.ts`에 `DetectedType`을 두고 `SignatureResult`가 이를 확장하게 했다. `decide.ts`의 `detected` 입력이 `{ detectedExt?, detectedMime? }`를 따로 적어 두고 있어 한쪽만 바뀌어도 컴파일러가 알려주지 않는 상태였다. `import type`이라 런타임 결합은 생기지 않는다. `segments`도 `readonly string[]`로.
3. **단일 원본 표를 변이 불가로** — `EXTENSION_ALIASES`·`REASON_CODES`·`NOTICE_CODES`를 `Readonly`로, `PREFIX_MAPPINGS`를 `readonly`로 고정했다. 앞의 둘은 `@MX:ANCHOR`가 "표가 갈라지면 오탐이 조용히 돌아온다"고 선언한 대상이라, 선언을 타입으로도 강제하는 편이 일관된다.
4. **마이그레이션 적용 계약 공유** — `scripts/migrate.ts`에서 `applyMigrations()`를 뽑아 Neon 스크립트와 PGlite 통합 테스트가 "무엇을 어떤 순서로 적용하는가"를 같은 코드로 쓰게 했다(실행 방식만 주입: Neon은 세미콜론 분리 후 단일 문장, PGlite는 다중 문장 `exec`). `schema.test.ts`가 직접 돌리던 루프를 제거했고 단언은 그대로다. `_migration` 기록은 여전히 마이그레이션 직후에 남아 중간 실패 시 앞선 항목을 건너뛴다. `DATABASE_URL` 미설정 오류 문구에 실행 방법(`pnpm db:migrate`)을 넣어 구체화했다.
5. **테스트 4건 추가 (87 → 91)** — `formatMessage` 치환 값 누락 시 자리표시자 유지 / 시그니처보다 짧은 1바이트 버퍼의 조기 반환 / **실제 TIFF 시그니처**(`II*\0` + 최소 유효 IFD) → `tif` / BOM + 선행 공백 + 대문자 `<?PHP` prefix 관용. TIFF는 M1에서 "`file-type`이 IFD 파싱을 요구한다"는 이유로 제외됐던 케이스인데(§Deviations 3), 엔트리 1개짜리 최소 IFD를 구성하면 `{ ext: 'tif', mime: 'image/tiff' }`로 탐지되는 것을 확인해 실바이트로 덮었다 — **Deviations 3 해소**.

##### 계획 대비 점검 (변경 불요로 판정한 항목)

`decideUpload` 판정 순서(크기 → 확장자 부재 → 파일명 순서상 먼저 걸린 차단 세그먼트 → 시그니처 → 성공/mismatch), `normalizeFilename`의 코드 포인트 단위 255바이트 절단, `normalizeExtensionInput`의 앞뒤 점 제거·NFKC 선행·정규화 후 길이 측정, `reason-codes.ts` 13개 문구의 `plan.md` §4.1 표와의 문자 단위 일치, 별칭 표가 파일명 후보·시그니처 결과·정책 입력 세 경로 모두에서 `canonicalizeExtension` 하나만 거치는지 — 전부 계획과 일치해 손대지 않았다.

##### 검증 (커밋 `07d4602` 기준)

| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `pnpm test` | 0 | Test Files 5 passed (5) / Tests **91 passed (91)** |
| `pnpm lint` | **0** | `All matched files use Prettier code style!` + eslint 무출력 (REFACTOR 전 exit 1 / 22 files) |
| `pnpm check` | 0 | `359 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` |
| `pnpm build` | 0 | — |
| `pnpm test:coverage` | 0 | `src/lib/server/**` Stmts **100** (85/85) · Branch **97.56** (40/41) · Funcs **100** (23/23) · Lines **100** (80/80) |

커버리지 변화: Stmts 98.82 → 100, Lines 98.75 → 100, Branch 92.68 → 97.56, Funcs 100 유지. M1이 남겨 둔 미커버 2줄(`reason-codes.ts:57`, `signature.ts:13`)은 모두 해소됐다.

##### MX 태그 (plan.md §13 M1 부분집합 4곳)

네 곳 모두 `[AUTO]` 접두와 필수 `@MX:REASON`을 이미 갖추고 있어 추가·수정 없이 **검증만** 했다. 파일당 한도(ANCHOR 3 / WARN 5 / NOTE 10) 이내.

| 파일 | 태그 | 줄 |
|---|---|---|
| `src/lib/server/upload/decide.ts` | `@MX:ANCHOR` (+ `@MX:REASON` 21) | 19 |
| `src/lib/server/upload/extension.ts` | `@MX:ANCHOR` (+ `@MX:REASON` 5) | 3 |
| `src/lib/server/upload/signature.ts` | `@MX:WARN` (+ `@MX:REASON` 74) | 71 |
| `src/lib/constants.ts` | `@MX:NOTE` | 1 |

`grep -rn "@MX:TODO" src/ scripts/` → 0건(exit 1). GREEN에서 해소된 TODO 잔재 없음.

##### 남은 gap

- **`scripts/migrate.ts`의 Neon 실경로는 여전히 미검증**입니다. `DATABASE_URL`이 없어 `main()` 경로(HTTP 드라이버·`_migration` 기록·세미콜론 분리)를 이 환경에서 실행할 수 없습니다. `applyMigrations()`로 공유되는 것은 **목록·순서 계약**이지 Neon 드라이버 동작이 아니므로, PGlite 통합 테스트 통과가 Neon 성공의 증거가 되지 않습니다. M4 배포 직전 실측 필요.
- **`signature.ts:32` BOM 스트립 분기(유일한 미커버 분기)는 구조적으로 도달 불가**입니다. `TextDecoder('utf-8')`가 `ignoreBOM` 기본값(false)으로 BOM을 먼저 제거하므로 `text.startsWith(BOM)`이 참이 되는 경로가 없습니다. 방어적으로 남겨 두되, BOM 관용 **동작 자체**는 위 5번의 BOM 테스트가 종단 간으로 고정합니다. 선행 공백 뒤에 오는 BOM(`" ﻿<?php"`)은 현재도 처리하지 못하며, 실사용 시나리오가 아니라 판단해 확장하지 않았습니다.
- M2~M4 스코프의 엔드포인트·화면 AC는 여전히 deferred입니다(변동 없음).

### M2 (RED→GREEN, Sonnet)

#### Acceptance scenario completion — 12 / 12 (M2 스코프)

| # | 시나리오 | 테스트 파일 | 상태 |
|---|---|---|---|
| AC-UPLOAD-001 | exe 체크 → 새로고침 후 유지, 다시 uncheck → false로 복귀 | `policy-repo.test.ts`, `server.test.ts` | PASS |
| AC-UPLOAD-002 | SH 추가 → 소문자 `sh`로 저장, 카운터 1/200 | `policy-repo.test.ts`, `server.test.ts` | PASS |
| AC-UPLOAD-003 | 이미 있는 sh 재추가 → 409 EXT_DUPLICATE, 행 수 불변 | `policy-repo.test.ts`, `server.test.ts` | PASS |
| AC-UPLOAD-004 | 고정 exe 추가 시도 → 409 EXT_IS_FIXED, 커스텀 목록 불변 | `policy-repo.test.ts`, `server.test.ts` | PASS |
| AC-UPLOAD-005a | 21자 입력 → 400 EXT_TOO_LONG | `server.test.ts` | PASS |
| AC-UPLOAD-005b | `ex e`/`ех`/`a.b` → 400 EXT_INVALID_CHARS, 전각 `ｅｘｅ` → NFKC 후 409 EXT_IS_FIXED, `""`/`"   "`/`"."` → 400 EXT_EMPTY | `server.test.ts` | PASS |
| AC-UPLOAD-006 | 커스텀 정확히 200개 상태에서 201번째 추가 → 409 EXT_LIMIT_REACHED, 카운트 200 유지 | `policy-repo.test.ts`, `server.test.ts` | PASS |
| AC-UPLOAD-007 | sh 삭제 → 목록에서 제거, 카운터 1 감소, DB 행 삭제 | `policy-repo.test.ts`, `server.test.ts` | PASS(DB까지) / 재업로드 성공 절은 M3 deferred |
| AC-UPLOAD-016a | exe 체크 클릭 → 낙관적 즉시 체크 → 500 응답 후 unCheck로 롤백 + 오류 표시 | `FixedExtensionList.test.ts`(jsdom) | PASS |
| AC-UPLOAD-016b | exe가 DB에 체크 상태일 때 HTTP GET 응답 HTML에 이미 체크 상태로 포함, `CLIENT_HINT_DISCLAIMER` 문자열 그대로 포함 | `page.ssr.test.ts` | PASS |
| 엣지 | 커스텀 `jpeg` 추가 → `jpg`로 저장·응답 `canonical:"jpg"` + `ALIAS_FOLDED` 알림 | `policy-repo.test.ts`, `server.test.ts` | PASS |
| 계약 | `PATCH .../fixed/[ext]`가 7개 밖 확장자·malformed body를 각각 404/400으로 거부(REASON_CODES 표 밖 — SvelteKit `error()`) | `server.test.ts` | PASS |

엔드포인트 레벨 AC 중 업로드 강제(AC-008~015)는 업로드 라우트가 아직 없으므로 M3로 deferred입니다(변동 없음).

#### Test counts

- 테스트 파일 10개, 테스트 129개, 전부 PASS(M1 91 + M2 신규 38: policy-repo 15 + client 2 + 엔드포인트 20 + 컴포넌트 2 + SSR 1 — 상세 합은 서술과 vitest 리포트가 일치). 실행: `pnpm test` → exit 0. 2회 연속 재실행으로 안정성 확인(플래키 없음).
- `pnpm lint`(prettier --check + eslint) → exit 0.
- `pnpm check`(svelte-check) → exit 0, `0 ERRORS 3 WARNINGS`(§Deviations 3 참고 — 동작에 영향 없는 컴파일러 안내).
- `pnpm build` → exit 0.
- `pnpm test:coverage`(`src/lib/server/**`, v8): 전체 Stmts 96.72% · Branch 92.06% · Funcs 97.14% · Lines 96.58%(85% 목표 상회). 파일별: `upload/*` 100/97.56/100/100(M1과 동일, 미변경), `db/policy-repo.ts` 100/93.75/100/100(라인 86 — UNIQUE 위반인데 SELECT kind가 빈 배열인 극단적 경합 분기, 실질 도달 불가에 가까움), `db/client.ts` 63.63/50/75/63.63(라인 34-40 — `getDb()`의 Neon 실경로, `DATABASE_URL` 미설정으로 이 환경에서 검증 불가한 명시적 gap, M1 `scripts/migrate.ts`와 동일 성격).

#### Migration status

- 변경 없음. M1이 만든 `migrations/001_init.sql`·`scripts/migrate.ts`를 그대로 재사용했다. `policy-repo.test.ts`·`server.test.ts` 모두 `applyMigrations()` 헬퍼로 PGlite에 동일 마이그레이션을 적용한다.
- Neon 실경로는 M1과 동일하게 미검증(§Test counts).

#### Deviations from spec/plan

1. `src/lib/server/upload/extension.ts`에 `normalizeExtensionCandidate()`를 새로 export했습니다(M1 PRESERVE 범위) — `normalizeExtensionInput()`의 별칭 폴딩 이전 단계 정규화 결과만 돌려주는 순수 리팩터입니다. 기존 `normalizeExtensionInput` 시그니처·반환값·동작은 전혀 바뀌지 않았고 M1 테스트도 그대로 통과합니다. 정책 API가 `ALIAS_FOLDED` 알림 여부(입력이 별칭이라 접혔는지)를 판단할 때 정규화 로직을 재구현하지 않기 위해 최소 추출했습니다.
2. `PATCH /api/policy/fixed/[ext]`가 7개 고정 확장자 밖의 값이나 malformed body를 받으면 `plan.md` §4.1 REASON_CODES 표가 아니라 SvelteKit의 `error(404)`/`error(400)`을 직접 던집니다 — 라우팅·형식 오류이지 정책 판정 오류가 아니라는 판단입니다(B-i 지시와 일치, `spec.md`에 명시적 REQ는 없어 계획 대비 재량 해석입니다).
3. `svelte-check`가 경고 3건(`state_referenced_locally`, `FixedExtensionList.svelte`/`CustomExtensionInput.svelte`)을 냅니다 — `$state(prop.map(...))`으로 서버가 내려준 초기값만 복사해 지역 가변 상태로 삼는 의도된 패턴이라 Svelte 컴파일러가 "derived를 쓸 생각이었냐"고 안내하는 것입니다. `$derived`로 바꾸면 서버 값이 바뀔 때마다 낙관적 갱신 중인 로컬 상태가 덮여써져 AC-016a의 낙관적 갱신·롤백 계약이 깨지므로 의도적으로 그대로 두었고, 에러가 아니라 경고이며 동작에는 영향이 없습니다. REFACTOR 단계에서 억제 방법(예: 초기값을 `$props()` 구조분해 시점에 얕은 복사)을 검토할 후보로 남겨둡니다.
4. `vite.config.ts`에 `test.hookTimeout: 30000`을 추가했습니다 — 여러 PGlite(WASM) 인스턴스가 동시에 기동하는 테스트 파일이 많아지면서 기본 10초 훅 타임아웃을 간헐적으로 넘겼습니다(정책 검증 로직 자체는 느리지 않음, 순수 리소스 경합). 늘린 뒤 `pnpm test` 3회 연속 재실행으로 안정성을 확인했습니다.
5. 계획된 M2 산출물(§4 표) 중 `src/lib/server/db/client.test.ts`는 계획 문서에 명시되지 않았던 신규 테스트 파일입니다 — `Db`/`RowsQueryable` 어댑터와 `getDb()`의 `DATABASE_URL` 부재 예외 분기를 커버리지 목표(85%)를 안정적으로 상회하기 위해 추가했습니다.

#### Founder-attention notes

- `db/client.ts`의 Neon 실경로(라인 34-40)는 여전히 미검증 gap입니다 — M1의 `scripts/migrate.ts`와 같은 성격이며, M4 배포 직전 `DATABASE_URL`을 실제로 연결해 한 번 실측이 필요합니다.
- svelte-check 경고 3건(Deviations 3)은 의도된 패턴이지만 REFACTOR(Opus 2차 스폰)에서 억제 여부를 판단해 주세요 — 현재는 동작에 영향 없는 컴파일러 안내로 그대로 두었습니다.
- `PATCH .../fixed/[ext]`의 404/400 처리(Deviations 2)는 REASON_CODES 표 밖의 재량 판단입니다 — REQ/AC에 명문 규정이 없어 라우팅 오류로 분류했는데, 이견이 있으면 알려주세요.
- **REFACTOR 처리 결과**: Deviations 3(svelte-check 경고 3건)은 `untrack()`으로 **해소**했고, Deviations 1·2·4·5는 근거를 확인한 뒤 **유지**했습니다(아래 REFACTOR 절 검토 표).

#### Planned-vs-actual files

`spec.md` §4 M2 대상 행(`src/lib/server/db/{client,policy-repo}.ts`, `src/hooks.server.ts`, `src/routes/api/policy/**`, `src/routes/+page.server.ts`, `+page.svelte`, `src/lib/components/{FixedExtensionList,CustomExtensionInput}.svelte`, `FixedExtensionList.test.ts`, `src/routes/api/policy/server.test.ts`) 전부 생성·수정 완료. 계획에 없던 추가: `src/lib/server/db/client.test.ts`(Deviations 5), `src/routes/page.ssr.test.ts`(spec.md §4가 이미 "AC-016b 관련 SSR 검증"을 §6 통합 항목으로 예정했으나 파일명은 계획서에 명시되지 않아 신규로 표기), `src/lib/server/db/policy-repo.test.ts`(spec.md §4의 "정책 조회·토글·추가·삭제 SQL" 대상 파일에 대한 짝 테스트, 표에는 암묵 포함).

#### REFACTOR (Opus)

커밋 `86baa60`. 동작 변경 없음 — RED→GREEN이 만든 129개 테스트를 하나도 수정하지 않은 채 그대로 통과시키며, 판단을 고정하려고 추가한 2건을 포함해 131개가 통과한다. 테스트 파일 diff는 31줄 삽입·0줄 삭제(`git diff 9ffcfff..86baa60 -- 'src/**/*.test.ts' --stat`).

##### 무엇을 왜 바꿨나

1. **`state_referenced_locally` 경고 3건 해소 (`untrack`)** — `FixedExtensionList`·`CustomExtensionInput`이 `$state(prop 복사)`로 서버 초기값만 받아 지역 상태로 삼는 것은 AC-016a의 낙관적 갱신·롤백 계약이 요구하는 **의도된** 패턴이다(§Deviations 3). 그래서 선택지는 "경고를 끄는 것"과 "의도를 코드로 밝히는 것" 둘이었고, `svelte-ignore` 주석 대신 `svelte`의 `untrack()`을 골랐다 — 주석은 경고만 지우지만 `untrack(() => fixed)`는 "이 값은 초기값으로 한 번만 읽는다"를 코드가 스스로 말한다. `pnpm check` 3 WARNINGS → **0 WARNINGS**, AC-016a jsdom 테스트는 수정 없이 통과.
2. **`getPolicy` 왕복 2회 → 1회** — 고정·커스텀을 각각 `SELECT`하던 것을 한 번의 `SELECT`로 읽고 코드에서 갈랐다. Neon HTTP 드라이버는 쿼리 1건이 왕복 1회인데, `getPolicy`는 조회뿐 아니라 **토글·추가·삭제 응답에서도 매번** 불리는 가장 잦은 읽기 경로라 화면 조작 한 번마다 왕복이 2회씩 붙고 있었다. `ORDER BY kind, sort_order, extension` 한 절이 `plan.md` §5의 두 정렬 규칙을 함께 담는다 — `kind`는 `custom` < `fixed`(사전순), 커스텀 행은 `sort_order`가 전부 스키마 기본값 `0`이라 `extension`이, 고정 행은 `sort_order` 1~7이 순서를 정한다.
3. **`ALIAS_FOLDED` 안내 문구의 `{input}` 정정** — 원문 문자열을 그대로 대입하고 있어 `" .JPEG "`처럼 공백·점·대문자가 섞인 입력이면 안내가 `" .JPEG "는 jpg와 같은 형식이라…`로 나왔다. 접힌 것은 원문 전체가 아니라 **별칭 자체**이므로 정규화 후보(`jpeg`)를 대입한다. `plan.md` §4.1 문자열 표 자체는 한 글자도 건드리지 않았고, 대입 값만 정했다.
4. **Neon 어댑터 이중 단언 제거** — `as unknown as Promise<T[]>`를 `as Promise<T[]>` 하나로 줄였다. `node_modules/@neondatabase/serverless/index.d.ts`를 읽어 확인한 실제 시그니처는 기본 옵션(`arrayMode:false`, `fullResults:false`)에서 `QueryRows<false> = Record<string, any>[]`(1118행)이라, `Db`가 요구하는 행 배열과 이미 같은 모양이고 `unknown` 경유가 필요 없다. `Db` 인터페이스에 "드라이버 두 종을 모으는 지점"이라는 `@MX:NOTE`를 달았다. `getDb()`는 여전히 네트워크 드라이버를 만드는 유일한 자리다.
5. **접근성 소소 보강** — `CustomExtensionInput`의 안내 줄에 `role="status"`(오류 줄은 이미 `role="alert"`), 카운터 `{count}/{max}`에 `aria-label="커스텀 확장자 N개, 최대 M개"`. 나머지 항목(모든 `input`에 보이는 `<label>`, 추가 버튼 `type="button"`, 칩 삭제 버튼 `aria-label`)은 이미 갖춰져 있어 확인만 했다. 디자인 패스는 별도 예정이라 스타일은 손대지 않았다.
6. **판단 고정 테스트 2건 추가 (129 → 131)** — 원문 `"  .JPEG  "` 입력 시 문구가 `jpeg는 jpg와 같은 형식이라 jpg로 저장돼요.`인지(3번), 고정과 커스텀이 **섞여 있을 때** 각자의 정렬 규칙이 유지되는지(2번). 둘 다 이번에 내린 판단이 나중에 조용히 뒤집히는 것을 막는 자물쇠다.

##### 계획 대비 점검 (변경 불요로 판정한 항목)

| # | 검토 후보 | 판정 | 근거 |
|---|---|---|---|
| B1 | svelte-check 경고 3건 | **변경** | 위 1번. `untrack()`, `pnpm check` 0 WARNINGS |
| B2 | `client.ts` Neon 이중 캐스트 | **변경** | 위 4번. `client.ts:35-40` |
| B3 | 오류 봉투 헬퍼 중복 추출 | **유지** | 추출 조건(2곳 이상 반복)이 성립하지 않는다. `grep -rn "ok: false\|errorResponse" src/routes --include=*.ts` 결과 `errorResponse`는 `custom/+server.ts:7` **한 곳뿐**이고, `fixed/[ext]`는 설계상 다른 모양(SvelteKit `error()`, §Deviations 2)을 쓴다. 호출부가 하나뿐인 추출은 M3의 `details` 모양을 추측하는 선반영이 되므로, 두 번째 호출부가 실제로 생기는 M3에서 그때의 AC를 보고 뽑는다 |
| B4 | `ALIAS_FOLDED`의 `{input}` | **변경** | 위 3번. `custom/+server.ts:40-54` |
| B5 | `getPolicy` 왕복 2회 | **변경** | 위 2번. `policy-repo.ts:20-43` |
| B6 | `vite.config.ts` `hookTimeout: 30000` | **유지** | 제거 조건이 성립하지 않는다. `policy-repo.test.ts`·`server.test.ts`는 테스트 격리를 위해 `beforeEach`마다 PGlite를 새로 띄우므로(파일당 1개가 아니다) 공용 헬퍼로 묶어도 인스턴스 수는 그대로여서 타임아웃 필요가 사라지지 않는다. `beforeAll`+테이블 비우기로 바꾸면 격리 계약이 달라지는데 이는 동작 보존 범위 밖이고, 헬퍼 파일을 `src/lib/server/` 아래 두면 커버리지 분모(`src/lib/server/**`, 단일 원본 glob)에 테스트 도구가 섞인다. 테스트 코드에서는 DRY보다 의도가 드러나는 중복이 낫다는 판단으로 유지 |
| B7 | 접근성·시맨틱 | **부분 변경** | 위 5번. 미비했던 2곳만 보강, 나머지는 이미 충족 |
| B8 | MX 태그 | **검증 + 1건 추가** | 아래 MX 절 |
| B9 | 경계 grep | **검증만** | 아래 검증 절 |

M1 REFACTOR와 마찬가지로, `decideUpload` 판정 순서·`normalizeExtensionInput`의 정규화 순서·`reason-codes.ts` 13개 문구는 계획과 일치해 손대지 않았다. `normalizeExtensionCandidate()`(§Deviations 1)도 유지했다 — 이번에 `{input}` 대입 값으로도 쓰이면서 추출의 값이 오히려 커졌다.

##### 검증 (커밋 `86baa60` 기준)

| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `pnpm test` | 0 | Test Files 10 passed (10) / Tests **131 passed (131)** (129 + 2) |
| `pnpm lint` | 0 | `All matched files use Prettier code style!` + eslint 무출력 |
| `pnpm check` | 0 | `405 FILES 0 ERRORS **0 WARNINGS** 0 FILES_WITH_PROBLEMS` (직전 3 WARNINGS) |
| `pnpm build` | 0 | — |
| `pnpm test:coverage` | 0 | `src/lib/server/**` Stmts **96.8**(121/125) · Branch **92.3**(60/65) · Funcs **96.96**(32/33) · Lines **96.66**(116/120) |

커버리지 변화(RED→GREEN 대비): Stmts 96.72 → 96.8, Branch 92.06 → 92.3, Lines 96.58 → 96.66으로 올랐고 **Funcs만 97.14 → 96.96으로 0.18%p 내렸다**. 이는 회귀가 아니라 분모가 준 결과다 — `coverage-summary.json`을 직접 읽어 확인한 미커버 **함수 개수는 1개로 이전과 같고**(`client.ts`의 Neon `query` 어댑터), `getPolicy`를 한 번의 조회로 바꾸며 커버되던 `.map()` 콜백 2개가 사라져 전체 함수 수가 35 → 33이 됐다. 85% 목표는 전 항목에서 크게 상회한다.

작업 도중 한 번 실측치가 떨어졌던 기록도 남긴다: Neon 어댑터를 2문장 `async` 함수로 다시 쓰자 검증 불가 구간의 문장 수가 늘어 Stmts가 96.03까지 내려갔다. 타입을 좁히는 목적은 단일 표현식으로도 그대로 달성되므로 한 문장 형태로 되돌렸고, 위 수치가 되돌린 뒤의 값이다.

경계 검증:

| 항목 | 명령 | 결과 |
|---|---|---|
| 시크릿 직접 접근 없음 | `grep -rn "process.env" src/` | 0건 (exit 1) |
| 미해소 TODO 없음 | `grep -rn "@MX:TODO" src/ scripts/` | 0건 (exit 1) |
| `getDb()` 호출 경계 | `grep -rn "getDb" src/` | `hooks.server.ts:5` + `client.ts` 정의 + `client.test.ts` — 프로덕션 호출부는 훅 하나 |
| `.env*` 미접촉 | `git status --short` | `.env` 계열 변경 0건 |
| 테스트 단언 미수정 | `git diff -U0 -- 'src/**/*.test.ts' \| grep -E "^-[^-]"` | 삭제 줄 0건 (exit 1) |

##### MX 태그

`client.ts`의 `Db` 인터페이스에 `@MX:NOTE` 1건을 **추가**했다(`[AUTO]` 접두 보유, NOTE는 `@MX:REASON` 필수 아님). 기존 5건은 추가·수정 없이 검증만 했다. 파일당 한도(ANCHOR 3 / WARN 5 / NOTE 10) 이내이며, 모든 파일이 태그 1건씩이다.

| 파일 | 태그 | 줄 | 상태 |
|---|---|---|---|
| `src/lib/server/db/client.ts` | `@MX:NOTE` | 4 | **신규** |
| `src/lib/server/db/policy-repo.ts` | `@MX:WARN` (+ `@MX:REASON`) | 60 | 유지 |
| `src/lib/server/upload/decide.ts` | `@MX:ANCHOR` (+ `@MX:REASON`) | 19 | 유지 |
| `src/lib/server/upload/extension.ts` | `@MX:ANCHOR` (+ `@MX:REASON`) | 3 | 유지 |
| `src/lib/server/upload/signature.ts` | `@MX:WARN` (+ `@MX:REASON`) | 71 | 유지 |
| `src/lib/constants.ts` | `@MX:NOTE` | 1 | 유지 |

클라이언트 힌트 `@MX:WARN`은 M3 스코프라 이번에 다루지 않았다.

##### 남은 gap

- **`client.ts`의 Neon 실경로(35~44행)는 여전히 미검증**입니다. 이번에 타입을 좁히면서 `unknown` 경유를 없앴지만, 이는 `index.d.ts`가 선언한 계약을 읽고 맞춘 것이지 **실제 Neon 응답을 관측한 것이 아닙니다**. `DATABASE_URL`이 없어 `sql.query()`를 이 환경에서 실행할 수 없으며, 미커버 함수 1건이 정확히 이 지점입니다. M1의 `scripts/migrate.ts`와 같은 성격이고 M4 배포 직전 실측이 필요합니다.
- **2번(단일 조회)의 정렬은 PGlite에서만 관측했습니다.** 추가한 혼재 정렬 테스트가 통과하지만 실행 엔진은 PGlite이고, Neon(실제 Postgres)에서 같은 `ORDER BY`가 같은 순서를 준다는 것은 표준 동작에 근거한 추론입니다. 위 미검증 gap과 함께 M4에서 한 번에 확인하는 것이 합리적입니다.
- **`policy-repo.ts:95`(미커버 1줄)** — UNIQUE 위반인데 뒤이은 `SELECT kind`가 빈 배열인 극단적 경합 분기로, RED→GREEN에서 이미 "실질 도달 불가에 가깝다"고 기록된 항목이며 이번에 손대지 않았습니다.
- **`signature.ts:32`(BOM 스트립 분기)** — M1 REFACTOR가 "구조적으로 도달 불가"로 판정한 항목 그대로입니다.
- 업로드 강제(AC-008~015)는 M3 deferred로 변동 없습니다.

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
