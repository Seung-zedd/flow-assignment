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
- **Founder 판정(2026-08-30, PROMPT_LOG #52)**: `ALIAS_FOLDED` `{input}`=정규화 후보 **유지**, 고정 7개 밖 `[ext]`·malformed body의 SvelteKit `error(404/400)` **유지**. M2 열린 판단 0건.

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

### M3 (RED→GREEN, Sonnet)

#### Acceptance scenario completion — 22 / 22 (M3 스코프)

| # | 시나리오 | 테스트 파일 | 상태 |
|---|---|---|---|
| AC-UPLOAD-008 | `exe` 차단 + `setup.exe` → 415 `BLOCKED_EXTENSION`(`matched:"exe"`), Blob 미생성 | `server.test.ts` | PASS |
| AC-UPLOAD-009a | `exe` 차단 + `report.exe.txt` → 마지막 세그먼트 `txt`여도 `matched:"exe"` | `server.test.ts` | PASS |
| AC-UPLOAD-009b | 커스텀 `env` 차단 + `.env` → `matched:"env"`(dotfile 추출) | `server.test.ts` | PASS |
| AC-UPLOAD-010 | 빈 차단 목록 + `README` → 415 `NO_EXTENSION` | `server.test.ts` | PASS |
| AC-UPLOAD-010 | 빈 차단 목록 + PNG 내용의 `notes.txt` → 성공 + `mismatch:true` + `detected_mime` 기록 | `server.test.ts` | PASS |
| AC-UPLOAD-011 | `Content-Length` > 4MB → 413, `formData` 스파이 미호출, 행 0개 | `server.test.ts` | PASS |
| AC-UPLOAD-011 | 헤더 없이 실측 4MB 초과 → 413 + 행 1개(파일 단위 판정) | `server.test.ts` | PASS |
| AC-UPLOAD-012 | `exe` 차단 + PE 내용의 `photo.jpg` → 415 `SIGNATURE_BLOCKED`(`detected:"exe"`) | `server.test.ts` | PASS |
| AC-UPLOAD-012 | `exe` 미체크 + 같은 파일 → 통과 | `server.test.ts` | PASS |
| AC-UPLOAD-013 | 차단 없음 + 실제 JPEG 내용의 `photo.jpeg` → 성공(별칭 오거부 회귀 방지) | `server.test.ts` | PASS |
| AC-UPLOAD-013 | 실제 PNG 내용의 `notes.txt` → 성공 + `mismatch:true` | `server.test.ts` | PASS |
| AC-UPLOAD-014 | `html` 미차단 + 평범한 `page.html` → 성공 | `server.test.ts` | PASS |
| AC-UPLOAD-014 | `html` 커스텀 차단 + 같은 `page.html` → 415 (§Deviations 4 참고: 실제 코드는 `BLOCKED_EXTENSION`) | `server.test.ts` | PASS |
| AC-UPLOAD-014 취지 | 확장자가 `html`이 아닌 위장 파일(`notes.dat`)의 html 내용 → 415 `SIGNATURE_BLOCKED`(`detected:"html"`) | `server.test.ts` | PASS |
| AC-UPLOAD-015 | 차단 1건 + 정상 1건 → 정확히 2행, `blob_pathname`에 원본명·확장자 미포함 | `server.test.ts` | PASS |
| AC-UPLOAD-007 2절 | 커스텀 `sh` 차단 시 `script.sh` → 415, 삭제 후 같은 업로드 → 성공(삭제가 업로드 판정에도 반영) | `server.test.ts` | PASS |
| 엣지 | `#!/bin/sh` 바이트 + 커스텀 `sh` 차단 → `SIGNATURE_BLOCKED` | `server.test.ts` | PASS |
| 엣지 | TIFF 리틀엔디언 매직 + 미차단 → `scan.tiff` 성공(별칭 `tif` 오거부 없음) | `server.test.ts` | PASS |
| 엣지 | `..\..\etc\passwd` → 경로 구분자·`..` 제거 후 확장자 후보 없음 → `NO_EXTENSION` | `server.test.ts` | PASS |
| 엣지 | 300자 파일명 → 255바이트 절단으로 확장자 소실 → `NO_EXTENSION`(§Deviations 5) | `server.test.ts` | PASS |
| 엣지 | 절단 후 확장자가 남는 긴 파일명 → 정상 업로드(200) | `server.test.ts` | PASS |
| 엣지 | `jpg` 차단 + `photo.jpeg` → `BLOCKED_EXTENSION`(`matched:"jpg"`, 파일명 후보도 대표형 폴딩) | `server.test.ts` | PASS |
| (기록 단위) | 수락 1건 + 거부 1건 삽입 → `upload_attempt` 정확히 2행, 컬럼 값 일치 | `upload-repo.test.ts` | PASS |
| (Blob 계약) | `BLOB_READ_WRITE_TOKEN` 미설정 시 에러(`client.ts`의 `getDb()`와 동일 패턴) | `store.test.ts` | PASS |
| (UI 힌트) | 안내 문구 항상 렌더링 | `UploadArea.test.ts` | PASS |
| (UI 힌트) | 차단 확장자 선택 시 비차단 힌트 표시 + 업로드 버튼은 전송을 막지 않음 | `UploadArea.test.ts` | PASS |
| (UI 힌트) | 415 응답 시 서버 오류 메시지 그대로 렌더링 | `UploadArea.test.ts` | PASS |
| (UI 힌트) | 파일 2개 선택 시 첫 요청 완료 후 두 번째 요청 시작(순차 전송) | `UploadArea.test.ts` | PASS |

정책 관리(AC-001~007 1절, AC-016)는 M2에서 이미 완료했습니다. 위 표의 "AC-UPLOAD-014" 행 2개와 "취지" 행 1개는 §Deviations 4에서 설명하는 하나의 발견(reason code 정정 + 취지 보강 테스트)을 반영합니다.

#### Test counts

- 테스트 파일 14개, 테스트 159개, 전부 PASS(M1 91 + M2 40[^m2] + M3 신규 28: `server.test.ts` 22 + `upload-repo.test.ts` 1 + `store.test.ts` 1 + `UploadArea.test.ts` 4). 실행: `pnpm test` → exit 0.
- `pnpm lint`(prettier --check + eslint) → exit 0.
- `pnpm check`(svelte-check) → exit 0, `454 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`.
- `pnpm build`(adapter-vercel, `@vercel/blob` 포함) → exit 0.
- `pnpm test:coverage`(`src/lib/server/**`, v8): 전체 Stmts **92.64%**(126/136) · Branch **87.32%**(62/71) · Funcs **91.89%**(34/37) · Lines **92.36%**(121/131) — 85% 목표 상회. 파일별: `upload/{decide,extension,reason-codes}.ts` 4개 지표 전부 100%, `signature.ts` 100/91.66/100/100(라인 32 BOM 분기 — M1 REFACTOR가 "구조적으로 도달 불가"로 이미 판정), `db/upload-repo.ts` 4개 지표 전부 100%, `db/policy-repo.ts` 100/94.44/100/100(M2와 동일, 미변경), `db/client.ts` 63.63/50/75/63.63(M1·M2와 동일한 미검증 Neon 실경로), **`blob/store.ts` 40/33.33/33.33/40(신규 — `getBlobStore()`의 토큰 부재 예외 분기만 커버, `createVercelBlobStore().put()`의 실제 Vercel Blob 네트워크 경로는 `BLOB_READ_WRITE_TOKEN` 미설정으로 이 환경에서 검증 불가한 명시적 gap — `client.ts` Neon 경로와 동일 성격)**.

[^m2]: M2 시점 기록은 "129개(87+38+2 REFACTOR)"였으나 이후 REFACTOR가 판단 고정 테스트 2건을 추가해 최종 131개였습니다. M3는 그 131개에 이어서 셉니다.

#### Migration status

- 변경 없음. M1이 만든 `migrations/001_init.sql`(`upload_attempt` 테이블 포함)·`scripts/migrate.ts`를 그대로 재사용했습니다. `server.test.ts`·`upload-repo.test.ts` 모두 `applyMigrations()` 헬퍼로 PGlite에 동일 마이그레이션을 적용합니다.
- Neon 실경로는 M1·M2와 동일하게 미검증입니다(§Test counts).

#### Deviations from spec/plan

1. **`Content-Length` 헤더가 곧 실제 바이트 상한이라는 계획 문구는 정확히 지켰지만, "본문을 바이트 상한을 건 채로 읽는다"(plan.md §3 단계 2)는 문자 그대로는 구현하지 않았습니다.** 멀티파트 파싱은 SvelteKit/undici 내부에서 이뤄져 핸들러 코드에서 스트리밍 상한을 직접 걸 지점이 없습니다. 대신 `request.formData()`로 파싱한 뒤 `file.size`(실측값)로 재확인합니다. 플랫폼의 4.5MB 요청 본문 한도가 실질적인 메모리 방어선 역할을 하며, `file.size`가 판정 근거라는 계약(REQ-UPLOAD-012)은 그대로 지켰습니다.
2. **클라이언트 힌트는 `decideUpload()`를 재사용하지 않습니다.** `$lib/server/**`는 SvelteKit 경계상 클라이언트 컴포넌트(`UploadArea.svelte`)에서 임포트할 수 없으므로, `+page.server.ts`의 `load()`가 `blockedExtensions`(정책의 차단 확장자 목록)와 `extensionAliases`(`EXTENSION_ALIASES` 재노출)를 미리 계산해 데이터로 내려주고, `UploadArea.svelte`가 별도의 경량 힌트 함수(`isClientHintBlocked`)로 대조합니다. 서버가 유일한 강제 지점이라는 계약(REQ-UPLOAD-016)은 변하지 않습니다 — 힌트는 업로드를 막지 않고, 서버가 동일 파일을 다시 판정합니다.
3. **신규 export**: `src/lib/server/blob/store.ts`(`BlobStore`, `createVercelBlobStore`, `getBlobStore`), `src/lib/server/db/upload-repo.ts`(`UploadAttemptRow`, `recordUploadAttempt`) — 계획된 신규 파일이며 기존 PRESERVE 대상 파일의 시그니처는 바꾸지 않았습니다.
4. **발견: AC-UPLOAD-014 2절의 reason code가 실제 코드 경로와 다릅니다.** acceptance.md 원문은 "`html`을 커스텀 차단에 추가한 뒤 같은 파일(`page.html`)을 올리면 `SIGNATURE_BLOCKED`로 거부된다"고 서술하지만, `decideUpload()`(M1 PRESERVE 대상)의 판정 순서는 확장자 대조(3단계, REQ-UPLOAD-008)가 시그니처 대조(4단계, REQ-UPLOAD-009)보다 항상 먼저 실행됩니다. 파일명이 문자 그대로 `page.html`이면 `html`이 차단된 순간 확장자 세그먼트 자체가 걸려 `BLOCKED_EXTENSION`으로 거부되고, 시그니처 검사에 도달하지 않습니다. `decide.ts`의 순서는 M1에서 이미 감사·테스트된 PRESERVE 대상이라 바꾸지 않았습니다. 테스트를 실제 동작(`BLOCKED_EXTENSION`)에 맞춰 정정하고, AC의 취지(HTML 내용도 시그니처로 차단될 수 있어야 한다)는 확장자가 `html`이 아닌 위장 파일(`notes.dat`)로 별도 검증해 `SIGNATURE_BLOCKED` 경로 자체는 실제로 살아있음을 확인했습니다.
5. **발견: "300자 파일명 → 정상 처리" 엣지 케이스의 "정상"이 M1(순수 함수)과 M3(서버 통합)에서 다른 의미가 됩니다.** M1의 `extension.test.ts`는 `normalizeFilename('a'.repeat(300) + '.txt')`가 "예외를 던지지 않고 255바이트 이하로 절단됨"만 단언합니다(확장자 보존은 단언하지 않음). 255바이트 절단은 뒤(확장자)가 아니라 앞에서부터 담을 수 있는 만큼만 담으므로, 296바이트를 넘는 `a` 연속 뒤의 `.txt`는 절단 경계 밖으로 밀려나 사라집니다 — 남는 것은 확장자 후보 없는 254개의 `a`뿐입니다. 서버 레벨에서 이는 예외 없이 `415 NO_EXTENSION`으로 이어지며, 이것도 "예외 없는 정상 처리"입니다. 원래 위임 지시는 이 케이스에서 "200"을 기대했으나, PRESERVE 대상인 `normalizeFilename`의 절단 방향을 볼 때 문자 그대로는 도달 불가능한 기대였습니다. 테스트를 실제 동작(415 `NO_EXTENSION`)에 맞게 정정하고, 절단 후에도 확장자가 살아남는 별도의 200 성공 케이스를 추가해 "긴 파일명이 예외 없이 정상 업로드되는" 경로 자체는 확인했습니다.
6. `Content-Length` 선차단(§AC-UPLOAD-011 1절) 테스트는 실제 `Request` 대신 `{ headers, formData: vi.fn() }` 형태의 손으로 만든 객체를 씁니다 — `formData` 스파이가 한 번도 호출되지 않았음을 직접 단언하기 위함이며, 위임 지시가 명시한 형태입니다.
7. `pnpm why undici` 확인 결과 `@vercel/blob@2.8.0`이 요구하는 `undici`는 `6.28.0`으로 해석됩니다 — 사전 공지된 GHSA-v3r7-h72x-cjcm 권고의 수정 버전(≥6.28.0) 경계값과 정확히 일치해 override가 필요 없습니다(devDependency 쪽 `jsdom`이 물고 있는 `undici@8.10.0`은 별개 트리이며 프로덕션 번들에 포함되지 않습니다).

#### Founder-attention notes

- **§Deviations 4·5는 위임 지시·acceptance.md 원문과 실제 관찰 동작이 갈린 지점입니다.** 둘 다 코드(PRESERVE 대상인 `decide.ts`/`extension.ts`)를 바꾸지 않고 테스트 기대값을 실제 동작에 맞춰 정정하는 쪽을 택했습니다 — 반대로 코드를 바꿨다면 M1에서 이미 감사·고정된 판정 순서(REQ-008 vs REQ-009)와 절단 방향(255바이트 앞자름)을 건드리게 되어 회귀 위험이 더 컸다고 판단했습니다. AC-UPLOAD-014의 reason code 문구를 `BLOCKED_EXTENSION`으로 정정할지 여부는 `acceptance.md` 소유자(manager-spec) 판단이 필요합니다 — 저는 body를 수정할 권한이 없어 블로커가 아닌 편차로만 기록합니다.
- `blob/store.ts`의 실제 Vercel Blob `put()` 경로는 여전히 미검증 gap입니다 — `client.ts`의 Neon 실경로와 같은 성격이며, M4 배포 직전 `BLOB_READ_WRITE_TOKEN`을 실제로 연결해 한 번 실측이 필요합니다.
- `undici` 취약점 확인 결과는 안전측입니다(§Deviations 7) — 별도 조치 불요.
- `AC-UPLOAD-011`의 "헤더 없이 실측 4MB 초과" 테스트는 실제로 4MB+1바이트 버퍼를 생성·전송하므로 다른 테스트보다 느립니다(약 2초) — 개별 타임아웃을 15000ms로 늘렸습니다.
- **REFACTOR가 해소한 것과 그대로 둔 것**: §Deviations 2(클라이언트 힌트가 `decideUpload()`를 재사용하지 못함)는 코드가 아니라 그 사실을 잘못 적고 있던 `decide.ts`의 `@MX:ANCHOR` 문구를 정정해 **문서상으로 해소**했고, 편차 자체(경계상 재사용 불가)는 설계 그대로입니다. §Deviations 4·5는 창업자 판정대로 **코드·테스트 모두 그대로 유지**했습니다. §Deviations 1·3·6·7과 미검증 gap(Neon·Vercel Blob 실경로)은 REFACTOR 범위 밖이라 변동 없습니다.

- **Founder 판정(2026-08-30, PROMPT_LOG #57)**: §Deviations 4(AC-UPLOAD-014 2절)는 **코드 유지·acceptance.md 문구를 `BLOCKED_EXTENSION`으로 정정**(sync 단계, manager-spec 소유). §Deviations 5(300자 파일명 → `NO_EXTENSION`)는 **유지 + M4 `CONSIDERATIONS.md` "매우 긴 파일명" 항목에 fail-closed 근거 명시**. 오케스트레이터 재량 2건(`file.size` 실측·힌트의 서버 모듈 미참조)도 유지. M3 열린 판단 0건.

#### Planned-vs-actual files

`spec.md` §4 M3 대상 신규 파일 전부 생성 완료: `src/lib/server/blob/store.ts`(+`store.test.ts`), `src/lib/server/db/upload-repo.ts`(+`upload-repo.test.ts`), `src/routes/api/upload/+server.ts`(+`server.test.ts`), `src/lib/components/UploadArea.svelte`(+`UploadArea.test.ts`). 기존 파일 확장: `src/hooks.server.ts`(`locals.blob` 배선), `src/app.d.ts`(`Locals.blob` 타입), `src/routes/+page.server.ts`(`blockedExtensions`·`extensionAliases`·`clientHintBlocked` 추가), `src/routes/+page.svelte`(플레이스홀더 → `UploadArea` 연결), `src/routes/page.ssr.test.ts`(`data` 리터럴에 3개 필드 추가 — 기존 단언 삭제 없음, `git diff 3d77a91 -- 'src/**/*.test.ts' | grep -E '^-[^-]'`로 확인). 계획에 없던 추가 의존성: `@vercel/blob@2.8.0`(`package.json`·`pnpm-lock.yaml`). `src/lib/server/upload/decide.ts`(M1 PRESERVE 대상)는 시그니처·동작 변경 없이 그대로 재사용했습니다.

#### REFACTOR (Opus)

커밋 `18b1f12`. 동작 변경 없음 — RED→GREEN이 만든 159개 테스트를 하나도 수정하지 않은 채 그대로 통과시키며, 이번 판단을 고정하려고 추가한 12건을 포함해 171개가 통과한다. 테스트 파일 diff는 154줄 삽입·0줄 삭제(`git diff 7121040..18b1f12 -- 'src/**/*.test.ts' --stat`), 삭제된 단언 줄 0건.

##### 무엇을 왜 바꿨나

1. **오류 봉투 헬퍼를 `src/lib/server/upload/http.ts` 하나로 모았다** — M2 REFACTOR가 "두 번째 호출부가 실제로 생기는 M3에서 뽑는다"며 미뤄둔 항목이고(M2 §B3), M3에서 업로드 라우트가 두 번째 호출부가 되면서 조건이 성립했다. 통합 전 두 봉투는 모양이 갈라져 있었다 — 정책 라우트는 `{ code, message }`에 `entry.message`를 그대로, 업로드 라우트는 `{ code, message, details }`에 `formatMessage(code, details)`를. 같은 API가 엔드포인트마다 다른 오류 모양을 내려주면 클라이언트가 키 유무로 분기하게 되므로, `details`가 항상 존재하는 업로드 쪽 모양으로 통일했다. **정책 라우트의 문구는 한 글자도 바뀌지 않는다** — 그 라우트가 낼 수 있는 6개 코드(`EXT_EMPTY`·`EXT_TOO_LONG`·`EXT_INVALID_CHARS`·`EXT_DUPLICATE`·`EXT_IS_FIXED`·`EXT_LIMIT_REACHED`)의 문구에는 `{대입값}` 자리가 없어 `formatMessage(code)`와 `REASON_CODES[code].message`가 같은 문자열이기 때문이며, 이 전제를 `http.test.ts`의 `test.each` 6건이 코드로 고정한다. 정책 라우트 응답에 `details: {}` 키가 새로 붙는 것이 유일한 전선(wire) 변화인데, 클라이언트 3곳(`CustomExtensionInput`·`FixedExtensionList`·`UploadArea`)은 모두 `body.error?.message`만 읽고 기존 단언도 `body.error.code`만 보므로 이 변화를 관측하는 소비자가 없다(키 추가는 비파괴 변경).
2. **`upload_attempt` 행과 구조화 로그를 한 함수(`recordAndLogAttempt`)에서 함께 만든다** — 핸들러 3곳에서 8개 필드를 DB용·로그용으로 각각 적고 있었다(같은 값을 24번 옮겨 적는 셈이다). 행을 단일 원본으로 두고 로그를 그 투영으로 파생시키면, 한쪽 필드만 고쳐져 DB와 로그가 조용히 어긋나는 경로가 구조적으로 사라진다. 컬럼명·로그 필드명·기록 순서(INSERT → 로그)는 그대로다. `Content-Length` 선차단만 이 함수를 쓰지 않는데, 그 시점에는 파일명·실측 크기가 없어 행 자체를 만들 수 없기 때문이다 — 요청 단위 거부와 파일 단위 판정의 차이가 코드 모양으로도 드러난다. 핸들러는 210줄 → 198줄.
3. **UTF-8 바이트 절단 루프의 중복을 `truncateUtf8(value, maxBytes)`로 합쳤다** — `normalizeFilename`(255바이트)과 `truncateForLog`(64바이트)가 코드 포인트를 쪼개지 않는 같은 루프를 각자 들고 있었다. `extension.ts`에 추가 export 1건으로 뽑고 양쪽이 쓴다. `normalizeFilename`은 PRESERVE 대상이라 **동작이 바이트 단위로 같아야 하는데**, 뽑아낸 루프가 원본과 문자 단위로 동일하고 M1의 절단 테스트가 수정 없이 통과하는 것으로 확인했다. `+server.ts`의 지역 함수 `truncateForLog`는 제거됐다.
4. **`pnpm test:coverage`의 PGlite 훅 타임아웃을 워커 2개 고정으로 닫았다** — 전체 병렬에서 PGlite 파일 4개가 `Hook timed out in 30000ms`로 실패하던 문제다(오케스트레이터 실측 `.moai/state/verify/bb9ff997/m3-cov.log`). 원인은 커버리지 계측이 얹힌 상태에서 WASM 인스턴스가 동시에 여러 개 뜨는 자원 경합이지 테스트 로직이 아니므로, 격리 계약(`beforeEach`마다 PGlite를 새로 띄우는 것 — M2 §B6에서 유지 판정)이나 `hookTimeout` 값은 건드리지 않고 `test:coverage` 스크립트에만 `--maxWorkers=2`를 달았다. `pnpm test`는 전체 병렬에서 이미 안정적이라 그대로 뒀다. 연속 2회 실행으로 확인했다(아래 검증 절).
5. **`decide.ts`의 `@MX:ANCHOR` 문구 정정** — "엔드포인트, 테스트, 클라이언트 힌트가 모두 이 함수 하나를 호출한다(호출부 3곳 이상)"고 적혀 있었으나 **클라이언트 힌트는 이 함수를 호출하지 않는다**(§Deviations 2 — SvelteKit 서버 경계). 태그가 사실이 아닌 호출 관계를 주장하고 있던 것이라 실제 호출부만 적도록 고쳤다. 주석 문구만 바뀌었고 `decide.ts`의 코드는 그대로다.
6. **접근성 보강 2건** — 파일 입력에 `aria-describedby="upload-disclaimer"`(힌트가 편의용이라는 단서가 화면에만 떠 있으면 입력에 초점을 둔 스크린리더 사용자는 그 단서를 듣지 못한다), 업로드 버튼에 `aria-busy={uploading}`. 나머지 체크리스트(보이는 `<label>`, `type="button"`, 결과 줄의 `role="status"`/`role="alert"`, 힌트와 파일명이 같은 `<li>`에 놓여 읽기 순서로 연결되는 것)는 이미 충족되어 확인만 했다. 문구·구조는 바꾸지 않았고, 디자인 패스가 따로 예정되어 스타일도 손대지 않았다.
7. **판단 고정 테스트 12건 추가 (159 → 171)** — `http.test.ts` 9건(봉투 키 집합, 대입값 없을 때 `details`가 빈 객체로 유지됨, 대입값 채움, 정책 코드 6개의 문구·상태 코드가 표와 글자 그대로 같음)과 `server.test.ts` 3건(수락·거부 각각에서 로그 줄의 필드가 기록된 행과 일치, `blob_pathname`은 로그에 없음, 로그 파일명 64바이트 절단과 행 255바이트 유지가 접두 관계). 1·2·3번에서 내린 판단이 나중에 조용히 뒤집히는 것을 막는 자물쇠다.

##### 계획 대비 점검 (변경 불요로 판정한 항목)

| # | 검토 후보 | 판정 | 근거 |
|---|---|---|---|
| B1 | 오류 봉투 헬퍼 2곳 추출 | **변경** | 위 1번. `http.ts` 신규, 두 라우트가 사용. 정책 문구 불변을 `http.test.ts` `test.each` 6건으로 증명 |
| B2 | `logAttempt`+`recordUploadAttempt` 3회 중복 | **변경** | 위 2번. `+server.ts:56-72`, 호출 3곳 |
| B3 | `truncateForLog` ↔ `normalizeFilename` 루프 중복 | **변경** | 위 3번. `extension.ts:69-83` 추가 export |
| B4 | `test:coverage` 훅 타임아웃 | **변경** | 위 4번. `package.json` 스크립트만 수정, 격리 계약·`hookTimeout` 불변 |
| B5 | MX 태그 | **1건 문구 정정 + 검증** | 위 5번 + 아래 MX 절 |
| B6 | `UploadArea` 접근성·시맨틱 | **부분 변경** | 위 6번. 미비했던 2곳만 보강 |
| B7 | `hooks.server.ts`의 `getBlobStore()` 매 요청 호출 | **유지** | `getDb()`와 같은 캐시 패턴(둘 다 첫 호출에만 생성)이라 요청마다 왕복이 늘지 않는다. 다만 **운영 노트**: 훅이 두 함수를 무조건 부르므로 `BLOB_READ_WRITE_TOKEN`이 없으면 업로드뿐 아니라 **정책 화면까지 500**이 된다. 이는 코드 두 줄(`hooks.server.ts:6-7`)과 `store.test.ts`의 "토큰 미설정 시 throw" 테스트를 합쳐 내린 판독이지 런타임 실측이 아니다. 결함이 아니라 배포 전 점검 항목이라 M4로 넘긴다 |
| B8 | `decideUpload`의 `sizeBytes` 재확인 | **유지** | 핸들러가 이미 크기를 거른 뒤에도 판정 함수가 다시 보는 것은 중복이 아니라 계약이다 — `decideUpload`가 단일 진입점인 이상 자신의 입력만으로 판정이 닫혀야 하고, "호출자가 선차단했다"는 가정을 함수에 심으면 다른 호출자가 생기는 순간 구멍이 된다(M1 계약) |
| B9 | 경계 grep | **검증만** | 아래 검증 절 |

M1·M2 PRESERVE 대상은 이번에도 손대지 않았다 — `decide.ts`의 판정 순서(주석 문구만 정정), `signature.ts`, `normalizeFilename`의 255바이트 앞자름 의미론, `reason-codes.ts`의 문구 상수, `policy-repo.ts`, `client.ts`. §Deviations 4(AC-014 문구 → `BLOCKED_EXTENSION`)와 5(300자 파일명 → `NO_EXTENSION`)는 창업자 판정대로 코드를 그대로 뒀다.

##### 검증 (커밋 `18b1f12` 기준)

| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `pnpm test` | 0 | Test Files **15 passed (15)** / Tests **171 passed (171)** (159 + 12) |
| `pnpm lint` | 0 | `All matched files use Prettier code style!` + eslint 무출력 |
| `pnpm check` | 0 | `456 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` |
| `pnpm build` | 0 | adapter-vercel 빌드 성공 |
| `pnpm test:coverage` 1회차 | 0 | 171 passed, Duration 200.02s, `Hook timed out` 0건 |
| `pnpm test:coverage` 2회차 | 0 | 171 passed, Duration 146.12s, `Hook timed out` 0건, 커버리지 수치 1회차와 동일 |

커버리지(`src/lib/server/**`): Stmts **92.8**(129/139) · Branch **87.67**(64/73) · Funcs **92.3**(36/39) · Lines **92.53**(124/134). RED→GREEN 대비 92.64/87.32/91.89/92.36에서 **네 지표 모두 소폭 상승**했다. 분자·분모로 보면 회귀가 없다는 것이 분명하다 — `coverage-summary.json`을 직접 읽은 **미커버 수가 네 지표 모두 이전과 정확히 같고**(문장 10, 분기 9, 함수 3, 줄 10), 분모가 늘어난 만큼(문장 +3, 분기 +2, 함수 +2, 줄 +3) 분자도 같은 폭으로 늘었다. 즉 이번에 추가된 코드(`http.ts`의 `errorResponse`, `extension.ts`의 `truncateUtf8`)는 전부 커버된 상태로 들어왔다. `upload` 디렉터리는 `signature.ts:32`(M1이 "구조적으로 도달 불가"로 판정한 BOM 분기)를 뺀 나머지가 전 지표 100%다. 85% 목표는 전 항목에서 상회한다.

경계 검증:

| 항목 | 명령 | 결과 |
|---|---|---|
| 시크릿 직접 접근 없음 | `grep -rn "process.env" src/` | 0건 (exit 1) |
| 서버 모듈의 클라이언트 유출 없음 | `grep -rn "lib/server" src/lib/components src/routes/+page.svelte` | 0건 (exit 1) |
| 미해소 TODO 없음 | `grep -rn "@MX:TODO" src/ scripts/` | 0건 (exit 1) |
| `.env*` 미접촉 | `git status --short` | `.env` 계열 변경 0건 |
| 테스트 단언 미수정 | `git diff 7121040..18b1f12 -- 'src/**/*.test.ts'`에서 삭제 줄 추출 | 삭제 줄 0건 (exit 1), 삽입 154줄 |

##### MX 태그

문구 정정 1건(`decide.ts`), 나머지 7건은 추가·수정 없이 검증만 했다. 신규 파일 `http.ts`에는 태그를 달지 않았다 — 호출부가 2개 모듈로 ANCHOR 기준(fan_in ≥ 3)에 미달하고, 파일 자체가 공개 API 경계도 외부 연동 지점도 아니며, NOTE 기준(매직 상수·100줄 초과·설명 없는 업무 규칙) 어디에도 해당하지 않는다. 파일당 한도(ANCHOR 3 / WARN 5 / NOTE 10) 이내이며 모든 파일이 태그 1건씩이다.

| 파일 | 태그 | 줄 | 상태 |
|---|---|---|---|
| `src/lib/server/upload/decide.ts` | `@MX:ANCHOR` (+ `@MX:REASON`) | 19 | **문구 정정** |
| `src/lib/server/upload/extension.ts` | `@MX:ANCHOR` (+ `@MX:REASON`) | 3 | 유지 |
| `src/routes/api/upload/+server.ts` | `@MX:ANCHOR` (+ `@MX:REASON`) | 74 | 유지 |
| `src/lib/components/UploadArea.svelte` | `@MX:WARN` (+ `@MX:REASON`) | 37 | 유지(형식 검증) |
| `src/lib/server/db/policy-repo.ts` | `@MX:WARN` (+ `@MX:REASON`) | 60 | 유지 |
| `src/lib/server/upload/signature.ts` | `@MX:WARN` (+ `@MX:REASON`) | 71 | 유지 |
| `src/lib/server/db/client.ts` | `@MX:NOTE` | 4 | 유지 |
| `src/lib/constants.ts` | `@MX:NOTE` | 1 | 유지 |

ANCHOR 3건의 fan_in을 실제로 세어 보면 기준선이 애매하다는 점은 기록해 둡니다. `decideUpload`를 호출하는 곳은 **모듈 기준 2개**(`api/upload/+server.ts`, `decide.test.ts`)이고 **호출 지점 기준 13곳**(테스트 12 + 엔드포인트 1)입니다. `POST` 핸들러도 라우터와 `server.test.ts` 2곳입니다. 모듈로 세면 셋 다 fan_in ≥ 3에 미달하지만, 세 태그 모두 `mx-tag-protocol.md`의 두 번째 ANCHOR 기준인 **"Public API boundary identified"**(판정의 단일 진입점, HTTP 엔드포인트, 별칭 표의 단일 원본)에 해당하므로 태그 종류를 그대로 두었습니다. 프로토콜상 NOTE 강등은 자동이 아니라 보고를 거치도록 되어 있어, 강등이 필요하다는 판단이면 이 문단이 그 보고입니다.

##### 남은 gap

- **`blob/store.ts`의 실제 Vercel Blob `put()` 경로는 여전히 미검증입니다**(40/33.33/33.33/40). `BLOB_READ_WRITE_TOKEN`이 없어 이 환경에서 네트워크 왕복을 실행할 수 없으며, `client.ts`의 Neon 실경로와 같은 성격입니다. M4 배포 직전 실측이 필요합니다.
- **`client.ts`의 Neon 실경로(35~44행)** — M1·M2와 동일하게 미검증입니다.
- **B7의 운영 노트는 코드 판독이지 런타임 실측이 아닙니다.** `BLOB_READ_WRITE_TOKEN` 부재 시 정책 화면까지 500이 되는지는 M4에서 토큰을 실제로 붙이고 한 번 확인하는 것이 맞습니다.
- **`UploadArea`의 `{#each ... (item.file.name)}` 키 중복 위험** — 같은 이름의 파일 2개가 한 번에 선택되면 Svelte가 키 중복으로 예외를 던집니다. 단일 `<input type="file" multiple>` 한 번의 선택으로는 같은 디렉터리 안이라 같은 이름이 나올 수 없어 실질 도달 불가로 보고 이번에 바꾸지 않았습니다(키를 바꾸면 재조정 동작이 달라져 동작 보존 범위를 벗어납니다). 드래그앤드롭 등 다중 소스 선택을 붙인다면 그때 함께 봐야 합니다.
- **정렬·질의 검증은 여전히 PGlite에서만 관측했습니다**(M2와 동일). Neon 실측은 M4 항목입니다.
- `policy-repo.ts:95`(경합 분기), `signature.ts:32`(BOM 분기)는 이전 판정 그대로 손대지 않았습니다.

### M4 (배포 준비 + 문서, Opus)

#### Acceptance scenario completion — 품질 게이트 Q8·Q9 충족, Q7은 오케스트레이터 확인 대기

M4는 새 AC를 구현하는 마일스톤이 아니라 배포 준비와 제출 문서를 만드는 마일스톤입니다. `acceptance.md` 품질 게이트 기준으로 판정합니다.

| 게이트 | 판정 | 근거 |
|---|---|---|
| Q2 `src/lib/server/**` 커버리지 ≥ 85% | PASS | Stmts 97.12% (M3 92.64%에서 상승) |
| Q4 타입 오류 0 | PASS | `pnpm check` → `456 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` |
| Q5 린트 오류 0 | PASS | `pnpm lint` → exit 0 |
| Q6 전체 테스트 통과 | PASS | `pnpm test` → 15 파일 173개 전부 통과 |
| Q7 배포 URL `/` HTTP 200 | **미판정** | 마이그레이션은 적용됐으나 배포 후 실호출은 오케스트레이터 몫입니다 |
| Q8 README에 실행 방법 + table schema | PASS | `README.md` — 로컬 실행 4단계, 세 테이블(`blocked_extension`·`upload_attempt`·`_migration`)의 컬럼·타입·제약·인덱스 표 |
| Q9 CONSIDERATIONS 28항목 | PASS | `CONSIDERATIONS.md` — 3-1-a…3-4-c 19항목 + E1~E9, 말미 항목 수 대조 28/28 |
| Q10 MX 태그 6곳 | 변동 없음 | M3 REFACTOR 판정 그대로. M4는 태그를 추가·삭제·수정하지 않았습니다 |
| Q11 PROMPT_LOG 3절 | 미판정 | 오케스트레이터 소유 — run 단계에서 읽기 전용입니다 |
| Q12 화면 문구 대조 | 미판정 | 배포 URL 수동 확인 항목 |

#### Test counts

- 테스트 파일 15개, 테스트 **173개** 전부 PASS(M3 171 + M4 신규 2). 실행: `pnpm test` → exit 0.
- `pnpm lint`(prettier --check + eslint) → exit 0. 새로 만든 `README.md`·`CONSIDERATIONS.md`도 prettier 검사를 통과합니다.
- `pnpm check`(svelte-check) → exit 0, `456 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`.
- `pnpm build`(adapter-vercel) → exit 0.
- `pnpm test:coverage`(`src/lib/server/**`, v8): Stmts **97.12%** · Branch **93.15%** · Funcs **94.87%** · Lines **97.01%**. M3 대비 상승 폭은 전부 M4의 테스트 격리 작업에서 나왔습니다 — `db/client.ts` 63.63 → **90.9**, `blob/store.ts` 40 → **70**. 나머지 파일은 M3와 동일합니다.
- 신규 테스트 2건은 그동안 "이 환경에서 검증 불가"로 기록해 온 gap의 일부입니다. `$env/dynamic/private`를 모킹으로 통제할 수 있게 되면서 "값이 있을 때 클라이언트를 만들고 캐시한다" 분기를 네트워크 없이 덮었습니다(`neon()`·`createVercelBlobStore()`는 생성 시점에 왕복하지 않습니다). 실제 질의·업로드 왕복은 **여전히 미검증**입니다.

#### Migration status

- **Neon 실경로에 처음으로 적용했습니다.** `pnpm db:migrate` → exit 0, 출력 `applied 001_init.sql`.
- 재실행 → exit 0, 적용 대상 0건(`applied` 줄 없음). `_migration` 테이블이 이미 적용된 파일을 걸러내므로 멱등합니다.
- 적용 후 읽기 전용 확인: `TABLES=_migration,blocked_extension,upload_attempt` · `MIGRATIONS=001_init.sql` · `BLOCKED_EXTENSION_ROWS=7`(고정 확장자 시드).
- 적용 목록: `001_init.sql` 1건. M1~M3이 PGlite에 적용해 온 것과 같은 파일이며, DDL은 바뀌지 않았습니다.
- `package.json`의 `db:migrate`를 `node --env-file-if-exists=.env scripts/migrate.ts`로 바꿨습니다. `--env-file`이 아니라 `--env-file-if-exists`인 이유는 `.env`가 없는 셸·CI에서도 기존처럼 환경변수를 그대로 쓰게 하기 위해서입니다.

#### Deviations from spec/plan

1. **테스트 2건이 `.env` 생성 직후 깨져 있었고, 원인은 Vite의 `.env` 자동 적재였습니다.** `client.test.ts`·`store.test.ts`의 "환경변수가 없으면 에러를 던진다"가 실패했습니다. Vite가 프로젝트 루트의 `.env`를 읽어 `$env/dynamic/private`에 주입하므로 `getDb()`/`getBlobStore()`가 더 이상 던지지 않았기 때문입니다. 키 이름만 노출하는 일회용 프로브 테스트로 원인을 기계적으로 확인했습니다(`DATABASE_URL`·`BLOB_READ_WRITE_TOKEN` 둘 다 vitest에 보임, 값은 출력하지 않음). 이는 단순한 테스트 실패가 아니라 **테스트가 실제 운영 시크릿을 보고 있었다**는 뜻이라, `$env/dynamic/private` 모듈 자체를 모킹해 테스트가 보는 환경을 테스트 파일이 통제하도록 고쳤습니다. 단언은 약화하지 않았습니다. `getDb(`·`getBlobStore(`·`createVercelBlobStore(` 호출부를 전부 확인한 결과 프로덕션 호출부는 `hooks.server.ts` 하나뿐이고 이를 임포트하는 테스트는 없습니다 — 실제 Neon/Blob 엔드포인트로 나가는 테스트 경로는 없습니다.
2. **계획에 없던 커밋 1건을 추가했습니다 — pre-commit 게이트의 test 타임아웃 상향.** 테스트가 173개로 늘면서 `moai gate`가 `npm test exceeded 2m0s`로 연속 실패했습니다. 품질 실패가 아니라 타임아웃입니다: 게이트와 같은 방식(lint 동시 실행)으로 재현하면 122초에 **exit 0, 173/173 통과**합니다. `.moai/config/sections/gate.yaml`의 `gate.timeouts.test`를 120 → 300으로 올렸습니다. `skip_tests`·`disabled_steps`는 건드리지 않았고 `SKIP_MOAI_PRECOMMIT`도 쓰지 않았습니다 — 검사는 전부 그대로 돕니다. 느린 이유는 구조적입니다(PGlite WASM 인스턴스 다수 + AC-UPLOAD-011의 실제 4MB 버퍼 전송). 단독 실행만으로도 약 110초입니다.
3. **커밋 순서 사고 1건과 그 정정.** 위 2번의 타임아웃으로 실패한 커밋이 `package.json`을 인덱스에 남겼고, 재시도한 다음 커밋이 그것을 함께 가져갔습니다. 푸시 전이라 `git reset --soft HEAD~1`로 되돌려 `gate.yaml`과 `package.json`을 각각의 커밋으로 분리했습니다. 최종 4개 커밋은 전부 의도한 파일만 담고 있습니다.
4. **긴 파일명 fail-closed와 AC-UPLOAD-014 문구 정정은 코드 변경 없이 문서에만 반영했습니다.** 창업자 판정(PROMPT_LOG #57)대로 `CONSIDERATIONS.md` 3-1-c(긴 파일명 → `NO_EXTENSION`이 의도된 결과)와 3-1-a(AC-UPLOAD-014 2절을 `BLOCKED_EXTENSION`으로 정정 예정)에 근거를 적었습니다. `acceptance.md` 본문 정정은 sync 단계에서 manager-spec이 수행합니다 — run 단계에서 제가 고칠 권한이 없습니다.
5. **README의 배포 절차는 GitHub 연결 자동 배포를 전제로 썼습니다.** 시크릿 등록은 대화형 `vercel env add`로만 안내했고, 어떤 값도 읽거나 적지 않았습니다. Vercel 환경변수는 이번 마일스톤에서 조회·수정하지 않았습니다.

#### Founder-attention notes

- **Q7(배포 URL 200)은 아직 미판정입니다.** 마이그레이션이 적용됐으므로 500의 원인 중 "테이블 없음"은 해소됐지만, 배포 시점에 환경변수가 실려 있었는지는 제가 확인할 수 없습니다. 푸시 → 재배포 → `/` 호출이 남았습니다.
- **`.gitignore`에 `.vercel` 추가 변경이 작업 트리에 남아 있습니다.** 오케스트레이터가 만든 변경이라 손대지 않았고 커밋하지도 않았습니다. `.vercel/`은 시크릿 규칙상 절대 커밋하면 안 되므로, 이 변경은 커밋되는 편이 안전합니다 — 판단은 오케스트레이터 몫입니다.
- **게이트 타임아웃 상향(§Deviations 2)은 되돌릴 수 있는 설정 변경입니다.** 300초가 과하다고 보시면 값만 낮추면 됩니다. 다만 120초로 되돌리면 커밋이 다시 산발적으로 막힙니다. 근본 해법은 테스트를 빠르게 만드는 것(PGlite 인스턴스 공유, 4MB 케이스 축소)인데, 둘 다 이미 감사가 끝난 테스트를 건드려야 해서 M4 범위 밖으로 뒀습니다.
- **실제 업로드 왕복은 여전히 한 번도 실행되지 않았습니다.** `blob/store.ts`의 `put()` 네트워크 경로와 `client.ts`의 Neon 질의 경로 모두 배포 후 수동 확인이 필요합니다. 이것이 M3에서 넘어온 gap 중 유일하게 남은 항목입니다.
- M4에서 열린 창업자 판단은 **1건**입니다 — 게이트 타임아웃 300초를 유지할지 여부(위 3번째 항목).

#### Planned-vs-actual files

`spec.md` §4의 M4 대상 신규 파일 2개 생성 완료: `README.md`, `CONSIDERATIONS.md`. 계획에 없던 변경 3건: `package.json`(`db:migrate` 스크립트), `.moai/config/sections/gate.yaml`(타임아웃), 그리고 테스트 격리를 위한 `src/lib/server/db/client.test.ts`·`src/lib/server/blob/store.test.ts` 수정. 프로덕션 소스 파일(`src/lib/server/**`, `src/routes/**`, `src/lib/components/**`)은 **한 줄도 바꾸지 않았습니다** — M4는 문서·설정·테스트만 건드렸습니다. `PROMPT_LOG.md`는 읽기 전용 원칙대로 손대지 않았고 스테이징하지도 않았습니다.

#### 커밋

| SHA | 제목 | 담긴 파일 |
|---|---|---|
| `3461a41` | `test(SPEC-UPLOAD-001): M4 — 환경변수 부재 테스트를 .env 유무와 격리` | `client.test.ts`, `store.test.ts` |
| `d9f0c80` | `chore(SPEC-UPLOAD-001): M4 — pre-commit 게이트의 test 타임아웃을 300초로 상향` | `.moai/config/sections/gate.yaml` |
| `2cdba81` | `feat(SPEC-UPLOAD-001): M4 — db:migrate가 .env를 직접 읽도록 변경` | `package.json` |
| `4e48a4b` | `docs(SPEC-UPLOAD-001): M4 — README(실행 방법·table schema·배포) + CONSIDERATIONS 28항목` | `README.md`, `CONSIDERATIONS.md` |

| `251a074` | `docs(SPEC-UPLOAD-001): M4 — README를 포트폴리오 레이아웃으로 재구성` | `README.md`, `eslint.config.js` |

다섯 커밋 모두 pre-commit 게이트(`moai gate`)를 통과했습니다. 아직 push하지 않았습니다 — push는 오케스트레이터가 수행합니다.

#### M4 추가 작업 — README 레이아웃 재구성 (사용자 지시)

작성자의 기존 포트폴리오 README(cubrain)와 섹션 순서·시각적 스타일을 맞춰 달라는 지시를 받아 `README.md`를 재구성했습니다. **내용은 그대로 두고 배치와 표현만 바꿨습니다** — table schema(컬럼·타입·제약·인덱스), 실행 방법, 환경변수 표, 배포 절차는 새 섹션 구조 안으로 옮겼을 뿐 사실관계가 바뀐 곳은 없습니다. Q8 충족 상태는 유지됩니다.

10개 섹션 순서: 타이틀 + 태그라인 + 서비스 링크 + 배지 5종 → 프로젝트 소개 → 열람 안내(For Interviewers) → 기술 스택 → 시스템 아키텍처 → DB 스키마(ERD) → 업로드 판정 흐름 → 핵심 트러블슈팅 4건 → 로컬 실행 및 테스트 안내 → 문서.

- 다이어그램 3곳(아키텍처 · ERD · 업로드 판정 플로우차트)은 `<!-- TODO(diagram-design): ... -->` 자리만 두고 그리지 않았습니다 — 지시대로입니다.
- 새로 쓴 "업로드 판정 흐름 8단계"는 `api/upload/+server.ts`의 `POST`와 `decide.ts`의 `decideUpload()`를 읽고 실제 실행 순서를 옮긴 것입니다(추측 아님): Content-Length 선차단 → formData 파싱 → 크기 실측 → 파일명 정규화 → 확장자 후보 추출 → 정책 대조 → 시그니처 대조 → 저장·기록.
- 트러블슈팅 4건은 문제/해결/결과 형태이며 깊은 근거는 `CONSIDERATIONS.md`로 넘깁니다.

**함께 고친 것 — eslint ignores에 `.claude/worktrees/**` 추가.** README 수정 후 `pnpm lint`가 109개 파싱 오류로 실패했는데, 원인은 제 변경이 아니라 22:43에 Claude Code 런타임이 만든 worktree(`.claude/worktrees/agent-a44a196754cecbb30/`)였습니다. 그 안에 프로젝트 사본이 통째로 들어 있어 `tsconfig.json`이 하나 더 생기고, typescript-eslint가 루트 후보를 둘로 보고 "No tsconfigRootDir was set"를 전 파일에 뿌렸습니다. 해당 디렉터리는 `.gitignore` 대상이자 런타임 소유라 애초에 검사 대상이 아니므로 무시 목록에 넣었습니다(`.svelte-kit/**`·`build/**`와 같은 성격). worktree 자체는 locked 상태라 손대지 않았습니다.

재검증: `pnpm test` 173/173 · `pnpm lint` exit 0 · `pnpm check` `456 FILES 0 ERRORS 0 WARNINGS` · `pnpm build` exit 0. 로그 5개 전부 `postgresql://` 0건.

**앞선 Founder-attention 항목 1건 해소**: `.gitignore`의 `.vercel` 미커밋 변경을 우려 사항으로 적었으나, 확인 결과 `.vercel`은 M1 스캐폴드 때부터 `.gitignore:15`에 이미 있었습니다(`git check-ignore -v .vercel/` → `.gitignore:15:.vercel`). 작업 트리에 있던 추가 줄은 중복이었고 지금은 되돌려졌습니다. `.vercel/`은 안전하게 무시됩니다.

## §E.3 Run-phase Audit-Ready Signal

```yaml
spec_id: SPEC-UPLOAD-001
run_complete_at: 2026-08-30
run_commit_sha: 251a074
run_status: complete
ac_pass_count: 55        # M1 21 + M2 12 + M3 22 (M4는 새 AC를 추가하지 않음)
ac_fail_count: 0
preserve_list_post_run_count: 0   # M4는 프로덕션 소스를 변경하지 않음
l44_pre_commit_fetch: not-performed   # 단일 세션 단독 작업, 병렬 세션 없음
l44_post_push_fetch: pending          # push는 오케스트레이터 소유
new_warnings_or_lints_introduced: 0
cross_platform_build:
  target: vercel-node
  command: pnpm build
  exit_code: 0
total_run_phase_files: 7   # README.md, CONSIDERATIONS.md, package.json, gate.yaml, eslint.config.js, client.test.ts, store.test.ts
m1_to_mN_commit_strategy: per-milestone-multiple-commits
migration_applied:
  - 001_init.sql
migration_rerun_pending: 0
test_count: 173
coverage_stmts_pct: 97.12
```

## §E.4 Sync-phase Audit-Ready Signal

```yaml
spec_id: SPEC-UPLOAD-001
sync_complete_at: 2026-08-31
sync_commit_sha: pending-backfill-2026-08-31   # sync 커밋이 자기 SHA를 모르므로 후속 커밋에서 백필
sync_status: complete
executed_by: orchestrator-direct   # manager-docs 미스폰 — 세션 한도 방어 결정(PROMPT_LOG #84), 문서화된 편차
sync_audit: skipped-documented     # sync-auditor 미스폰 — 같은 결정. Q 게이트 증거는 아래에 직접 첨부
```

**sync 변경 내역** (커밋 하나로 4문서 상태 전이 + 문구 정정):
- `acceptance.md` AC-UPLOAD-014 2절: `SIGNATURE_BLOCKED` → `BLOCKED_EXTENSION` 정정 (M3 실동작 발견분, PROMPT_LOG #57의 예고 이행)
- `spec.md` §5.5: E2E 배제 범위를 "E2E 자체" → "CI 상시 배선"으로 좁힘 (1회성 배포 URL 스모크 수행 반영) · §6 게이트 표기 Q1~Q11 → Q1~Q12 · frontmatter v0.2.2 / completed
- `plan.md` frontmatter: completed (draft로 남아 있던 낡은 상태 정리)

**품질 게이트 증거 (sync 시점 확정분)**:

| 게이트 | 상태 | 증거 |
|---|---|---|
| Q7 (배포 URL 동작) | **PASS** | `GET https://flow-assignment-opal.vercel.app/` → 200 (2026-08-31 실측, node fetch). 500 원인은 env 값 미입력 — 해결 경위 PROMPT_LOG #73~#80 |
| Q11 (PROMPT_LOG 3절) | **PASS** | §1 타임라인 #86까지 (M4 이후 세션 7 포함) · §2 도구 표 · §3 회고 (M4·sync 절은 세션 7 마감에서 초안) |
| Q12 (화면 문구 13종) | **PASS(12/13) + 수동 1건** | Playwright로 12종 유발·문구 정확 일치 단언·스크린샷 `e2e/screenshots/q12/<CODE>.png` + 로그 `.moai/state/verify/18010b75/e2e-smoke.log` (16 passed·exit 0). `EXT_LIMIT_REACHED`는 프로덕션 200행 비용으로 스킵 — 사용자 수동 확인 항목 |

**미검증(Gaps)**: 사용자 QA 4건(PROMPT_LOG #65) 미수행 — 사용자 몫으로 남김. `EXT_LIMIT_REACHED` 화면 문구 미캡처. sync-auditor 독립 감사 미수행(문서화된 스킵).
**잔여 위험**: E2E는 1회성 실측이라 이후 배포에서 회귀 감지 없음(CI 미배선 — §5.5 의도된 범위). 프로덕션에 테스트 upload_attempt 행 + 소형 txt Blob 1건 잔류(감사 로그 성격, 정책 상태는 원복 확인).

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
