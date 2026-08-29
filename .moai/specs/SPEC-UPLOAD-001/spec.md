---
id: SPEC-UPLOAD-001
title: "확장자 차단 정책 관리 및 서버 사이드 업로드 검증"
version: "0.2.1"
status: draft
created: 2026-08-29
updated: 2026-08-29
author: michael_jo
priority: P1
phase: "v0.1.0 target"
module: "src/lib/server/upload"
lifecycle: spec-anchored
tags: "file-upload, security, validation, sveltekit, postgres"
tier: M
issue_number: 1
---

# SPEC-UPLOAD-001 — 확장자 차단 정책 관리 및 서버 사이드 업로드 검증

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|---|---|---|---|
| 0.1.0 | 2026-08-29 | michael_jo | 최초 초안. plan.md 결정 7건과 검토 게이트 보완 3건(별칭 정규화 · 불일치 정책 · prefix 스니핑 의미)을 요구사항으로 확정 |
| 0.1.0 | 2026-08-29 | michael_jo | plan-audit iter1 결함 D1~D6 수정. 고정 토글·커스텀 삭제 REQ 신설(D3), REQ-016·REQ-013에 AC 부여(D1·D2), 커스텀 추가 거부 REQ 2건 통합으로 상한 확보. 버전은 audit PASS 전까지 0.1.0 유지 |
| 0.1.0 | 2026-08-29 | michael_jo | plan-audit iter2 PASS 0.86. N1(컴포넌트 테스트 표면 선언)·N3(REQ-007 NFC 명시) 적용, N2·N5 표기 통일. REQ/AC 본문 개수 불변(16/16) |
| 0.2.0 | 2026-08-29 | michael_jo | founder verdicts Q1–Q17 applied (interrogation-draft). 요청당 1파일 확정(`TOO_MANY_FILES` 제거), 요청 단위 거부 미기록, 별칭 정규화를 파일명 후보까지 확대, 문구 상수 표 고정, 클라이언트 힌트 구현 명시, `/api/uploads/recent` 스코프 제외 |
| 0.2.1 | 2026-08-29 | michael_jo | run-gate 재감사(2026-08-29, PASS 0.85) 결함 D1·D2·D3·D5·D6 반영 — 요청당 1파일 결정 잔여 문구 정합, Out of Scope 5.6 추가, AC-005b 빈 입력 절 |

---

## 1. 개요

파일 업로드 시 적용할 **확장자 기반 차단 정책**을 DB에 저장·관리하고, 그 정책이 실제 업로드 요청에서 **서버 사이드로 강제**되는 단일 배포 웹 애플리케이션을 만든다.

정책 화면만 있고 업로드에서 강제되지 않으면 "정책은 있으나 막지 못하는 화면"에 그친다. 따라서 이 SPEC은 정책 관리(A)와 업로드 강제(B)를 하나의 신뢰 경계 안에 둔 단일 SPEC으로 정의한다.

- **스택**: SvelteKit 2 (Svelte 5 runes, TypeScript) · Neon PostgreSQL · Vercel Blob · `@sveltejs/adapter-vercel`
- **개발 방식**: TDD (RED-GREEN-REFACTOR), 커버리지 목표 85%
- **설계 근거 전문**: `plan.md` (결정 7건 + 위험 + 마일스톤)
- **고려사항 28항목 매트릭스**: `plan.md` §9 (과제 §3의 19항목 + 자체 발굴 E1~E9) — 이 문서에 표를 복제하지 않는다. 서술형 산출물은 `CONSIDERATIONS.md`가 담당한다.

## 2. 목표

| # | 목표 | 성공 판정 |
|---|---|---|
| G1 | 고정 확장자 7개(`bat` `cmd` `com` `cpl` `exe` `scr` `js`)의 체크 상태가 DB에 저장되어 새로고침 후 유지된다 | AC-UPLOAD-001 |
| G2 | 커스텀 확장자를 20자·200개 제한과 중복 방지 규칙 아래 추가·삭제할 수 있다 | AC-UPLOAD-002 ~ 007 |
| G3 | 차단 대상 파일 업로드가 **무엇이 왜 막혔는지** 알 수 있는 사유와 함께 거부된다 | AC-UPLOAD-008 ~ 012 |
| G4 | 정상 파일은 오탐 없이 업로드에 성공하고, 성공·거부 양쪽이 모두 감사 가능한 형태로 기록된다 | AC-UPLOAD-013 ~ 015 |
| G5 | 모든 판정이 서버에서 이뤄지며 클라이언트 검증을 우회해도 정책이 뚫리지 않는다 | AC-UPLOAD-008 ~ 015 (모두 엔드포인트 직접 호출로 수행 — 클라이언트를 거치지 않는 경로가 곧 우회 재현) |
| G6 | 저장에 실패해도 화면 상태와 서버 상태가 어긋난 채 남지 않는다 | AC-UPLOAD-016 |

---

## 3. 요구사항 (GEARS)

요구사항 모듈 5개, 총 16개. 각 REQ는 `plan.md`의 결정을 근거로 갖는다.

### 3.1 `policy-store` — 정책 영속 저장

**REQ-UPLOAD-001** (Ubiquitous)
시스템은 차단 정책을 단일 `blocked_extension` 테이블에 `kind`(`fixed` | `custom`)와 `is_blocked`로 저장해야 하며, 고정 확장자 7개를 `is_blocked = false`(기본 unCheck) 상태로 시드해야 한다. `extension` 컬럼은 전역 `UNIQUE` 제약과 `^[a-z0-9]{1,20}$` `CHECK` 제약을 가져야 한다.
→ 근거: plan.md §2.1, §2.2, §2.5

**REQ-UPLOAD-002** (Event-driven)
사용자가 고정 확장자의 차단 여부를 변경할 때, 시스템은 변경된 상태를 영속 저장해야 하며 이후의 모든 정책 재조회가 변경된 값을 반환해야 한다.
→ 근거: 과제 §2-A "check/uncheck 시 DB에 저장 → 새로고침 시 유지", plan.md §5 `PATCH /api/policy/fixed/[ext]`

**REQ-UPLOAD-003** (Event-driven)
사용자가 커스텀 확장자를 삭제할 때, 시스템은 해당 항목을 정책에서 제거해야 하며 이후의 정책 재조회 결과와 업로드 판정 대상에 그 항목이 포함되지 않아야 한다.
→ 근거: 과제 §2-A "각 항목 옆 `X` 클릭 시 DB에서 삭제", plan.md §5 `DELETE /api/policy/custom/[ext]`

**REQ-UPLOAD-004** (Unwanted behavior)
시스템은 `kind = 'custom'`인 항목을 **200개를 초과해 저장하지 않아야 한다**. 상한 검사는 카운트와 삽입이 하나의 원자 연산 안에서 이루어져야 한다.
→ 근거: plan.md §2.3

### 3.2 `extension-normalization` — 입력 정규화

**REQ-UPLOAD-005** (Ubiquitous)
시스템은 커스텀 확장자 입력을 `NFKC 정규화 → 앞뒤 공백 제거 → 선행 점 제거 → 소문자화 → 별칭 대표형 변환` 순서로 정규화한 뒤에만 저장·비교해야 한다. 별칭 표는 단일 원본이어야 하며 업로드 판정 경로와 정책 저장 경로가 같은 표를 참조해야 한다.
→ 근거: plan.md §4, §3.3

**REQ-UPLOAD-006** (Event-driven)
사용자가 저장할 수 없는 커스텀 확장자를 추가하려 할 때, 시스템은 아래 사유 코드와 상태 코드로 거부해야 한다.

| 조건 | 사유 코드 | 상태 |
|---|---|---|
| 정규화 후 빈 문자열 | `EXT_EMPTY` | 400 |
| 정규화 후 20자 초과 | `EXT_TOO_LONG` | 400 |
| 정규화 후 `^[a-z0-9]{1,20}$` 불만족 | `EXT_INVALID_CHARS` | 400 |
| 이미 저장된 커스텀 항목과 동일 | `EXT_DUPLICATE` | 409 |
| 이미 저장된 고정 항목과 동일 | `EXT_IS_FIXED` | 409 |
| 커스텀 항목이 이미 200개 | `EXT_LIMIT_REACHED` | 409 |

→ 근거: plan.md §4. 고정 항목과 겹칠 때는 accept-and-hide가 아니라 거부한다 — 같은 확장자에 두 개의 진실이 생기면 새로고침 후 사용자의 기대와 화면이 어긋난다.

### 3.3 `upload-validation` — 서버 사이드 업로드 판정

**REQ-UPLOAD-007** (Ubiquitous)
시스템은 업로드 파일명을 **NFC 정규화**·제어문자 제거·경로 구분자 제거·255바이트 절단한 뒤, 첫 세그먼트를 제외한 **모든 dot-segment**를 소문자 확장자 후보로 추출하고, 각 후보를 **정책 저장과 동일한 별칭 표(REQ-UPLOAD-005)로 대표형 정규화**해야 한다. 파일명에는 NFC를, 커스텀 확장자 입력에는 NFKC를 적용하며 이 둘을 섞지 않아야 한다 — 파일명에 NFKC를 적용하면 전각 문자가 접혀 추출 결과가 달라진다.
→ 근거: plan.md §3 단계 3~4 (파일명 NFC), §3.3 (후보 별칭 정규화), §4 (입력 NFKC)

**REQ-UPLOAD-008** (Event-driven)
**대표형으로 정규화된** 후보 중 하나라도 차단 목록에 있을 때, 시스템은 **실제로 걸린 대표형 세그먼트를 응답 `details.matched`에 포함**해 `BLOCKED_EXTENSION`(HTTP 415)으로 거부해야 한다. 따라서 `jpg`를 차단하면 `photo.jpeg`도 `matched: "jpg"`로 거부된다.
→ 근거: plan.md §3 단계 5, §3.3, 과제 §3-3 "무엇이, 왜 막혔는지"

**REQ-UPLOAD-009** (Event-driven)
**파일 내용으로부터 판별된 확장자**가 별칭 정규화 후 차단 목록에 있을 때, 시스템은 `SIGNATURE_BLOCKED`(HTTP 415)으로 거부해야 한다. 판별은 이진 포맷의 매직 넘버와 텍스트 실행 파일의 선행 바이트 양쪽을 대상으로 한다.
→ 근거: plan.md §3 단계 7~8, §3.3 (판별 수단과 합성 확장자 매핑표는 plan.md가 보유)

**REQ-UPLOAD-010** (Unwanted behavior)
시스템은 판별된 타입이 선언 확장자와 다르다는 **사실만으로는 업로드를 거부하지 않아야 한다**. 불일치는 응답의 `mismatch` 플래그와 업로드 기록·구조화 로그에 남긴다.
→ 근거: plan.md §3.2 (오탐이 차단 UX의 신뢰도를 깎는 비용 > 불일치 자체의 위험)

**REQ-UPLOAD-011** (Unwanted behavior)
시스템은 원본 파일명을 저장소 키로 사용하지 않아야 하며, 저장 키에 확장자를 포함하지 않아야 한다. 키는 `uploads/{UUID}` 형태다. 파일명은 REQ-UPLOAD-007의 **정규화·절단을 거친 값**만 메타데이터로 보관하며, 클라이언트가 보낸 원본 바이트를 그대로 저장하지 않아야 한다 — 저장되는 값은 표시·감사용 정규화 파일명이다.
→ 근거: plan.md §3 단계 10, §2.5 (`original_name` 컬럼 주석), 과제 §3-1 "원본 파일명 사용 위험"

**REQ-UPLOAD-012** (Ubiquitous)
**요청 하나는 파일 하나를 싣는다.** 따라서 4MB 상한은 파일 상한이자 요청 상한이며, 시스템은 이를 두 겹으로 강제해야 한다 — (1) `Content-Length`가 존재하고 4MB를 초과하면 본문 스트림을 소비하기 전에 `FILE_TOO_LARGE`(413)로 거부해야 하고, (2) 헤더가 없거나(청크 전송) 실제보다 작게 신고된 경우에도 본문을 바이트 상한을 걸어 읽은 뒤 실제 바이트 수가 4MB를 초과하면 같은 코드로 거부해야 한다. 플랫폼의 4.5MB 요청 본문 한도는 이 둘을 모두 통과한 경우의 최후 방어선이며 애플리케이션의 판정 근거가 아니다. 확장자 후보가 하나도 없으면 `NO_EXTENSION`(415)으로 거부해야 한다.
→ 근거: plan.md §3 단계 1~2·6, §5 (다중 파일은 클라이언트가 순차 요청), Vercel Function 본문 한도 4.5MB에서 역산

**REQ-UPLOAD-013** (State-driven)
차단 목록에 활성 항목이 하나도 없는 동안에도, 시스템은 크기 제한과 확장자 부재 거부를 **강제**해야 하고, 내용 판별은 **실행하여 기록**(`detected_mime`, `mismatch`)해야 한다. 이 상태에서 내용 판별은 어떤 거부로도 이어지지 않는다 — 판별 결과가 차단 목록에 없으면 거부 근거가 성립하지 않기 때문이다(REQ-UPLOAD-009). 즉 빈 정책에서 내용 판별은 관찰·기록 전용이다.
→ 근거: plan.md §3 — 정책이 비어 있는 상태는 "모두 허용"도 "검사 중단"도 아니다

**REQ-UPLOAD-014** (Ubiquitous)
시스템은 **파일 단위 판정(수락·거부)**에 대해 `upload_attempt` 테이블에 정확히 1행과 구조화 로그 1줄을 남겨야 하며, **파일 내용은 어느 쪽에도 기록하지 않아야 한다**. 파일명은 로그에서 64자로 절단해야 한다.

본문을 읽기 전에 확정되는 **요청 단위 거부**(`Content-Length` 선차단으로 발생하는 413)는 테이블에 행을 남기지 않아야 하며 구조화 로그만 남긴다. 그 시점에는 파일명과 실제 크기가 확정되지 않아 `original_name`·`size_bytes`가 NOT NULL인 행을 만들 수 없기 때문이다.
→ 근거: plan.md §3 단계 1·11, §7, 과제 §3-4 "로그/모니터링"

### 3.4 `policy-api` — HTTP 계약

**REQ-UPLOAD-015** (Ubiquitous)
모든 오류 응답은 `{ ok: false, error: { code, message, details } }` 형태를 가져야 하며 상태 코드는 400(형식) · 409(충돌·상한) · 413(크기) · 415(정책 거부) · 500(서버)으로 매핑되어야 한다. 정책 변경 엔드포인트는 변경 후의 정식 정책 상태를 응답에 포함해야 한다.
→ 근거: plan.md §5

### 3.5 `policy-ui` — 화면 상태

**REQ-UPLOAD-016** (Optional feature / capability-gate)
클라이언트에서 JavaScript가 동작하는 환경에서는, 시스템이 다음 세 가지를 제공해야 한다 — (1) 정책 변경에 낙관적 갱신을 적용하고 실패 시 서버가 반환한 정식 상태로 화면을 되돌린다, (2) 파일 선택 시점에 **이미 페이지에 로드된 정책**으로 확장자를 조회해 차단 대상이면 비차단 안내(`CLIENT_HINT_BLOCKED`)를 표시한다 — 이 힌트는 업로드를 막지 않으며 사용자는 그대로 전송할 수 있다, (3) 그 힌트가 편의 기능일 뿐임을 알리는 고정 문구(`CLIENT_HINT_DISCLAIMER`)를 함께 표시한다. 초기 정책 상태는 서버에서 렌더링되어야 한다.

**서버는 유일한 강제 지점이다.** 클라이언트 힌트는 어떤 판정에도 입력으로 쓰이지 않으며, 힌트를 무시하고 전송된 요청도 서버에서 동일하게 판정된다.
→ 근거: plan.md §4 (문구 상수), §5, §7, 과제 §3-3 "저장 실패 시 화면 상태와 DB 상태의 일관성", §3-1 "서버 사이드 검증의 필요성"

---

## 4. 변경·생성 대상 파일

| 경로 | 구분 | 역할 |
|---|---|---|
| `migrations/001_init.sql` | 신규 | DDL 단일 원본 — README의 table schema 제출물과 동일 |
| `scripts/migrate.ts` | 신규 | `migrations/*.sql` 순차 적용 + `_migration` 이력 |
| `src/lib/constants.ts` | 신규 | `MAX_CUSTOM_EXTENSIONS` · `MAX_EXTENSION_LENGTH` · `MAX_UPLOAD_BYTES` + `plan.md` §4.1 문구 상수 표 |
| `src/lib/server/db/client.ts` | 신규 | `@neondatabase/serverless` HTTP 클라이언트 |
| `src/lib/server/db/policy-repo.ts` | 신규 | 정책 조회·토글·추가·삭제 SQL |
| `src/lib/server/db/upload-repo.ts` | 신규 | 업로드 시도 기록 INSERT (`upload_attempt`) |
| `src/lib/server/upload/extension.ts` | 신규 | `normalizeExtensionInput` · `extractExtensionSegments` · `canonicalizeExtension` · `EXTENSION_ALIASES` |
| `src/lib/server/upload/signature.ts` | 신규 | `sniffSignature` (매직 넘버 + prefix 스니핑) |
| `src/lib/server/upload/decide.ts` | 신규 | `decideUpload` — 판정 단일 진입점 |
| `src/lib/server/upload/reason-codes.ts` | 신규 | 사유 코드 ↔ 상태 코드 ↔ 사용자 문구 매핑 |
| `src/routes/api/policy/+server.ts` | 신규 | `GET` 정책 전체 조회 |
| `src/routes/api/policy/fixed/[ext]/+server.ts` | 신규 | `PATCH` 고정 토글 |
| `src/routes/api/policy/custom/+server.ts` | 신규 | `POST` 커스텀 추가 |
| `src/routes/api/policy/custom/[ext]/+server.ts` | 신규 | `DELETE` 커스텀 삭제 |
| `src/routes/api/upload/+server.ts` | 신규 | `POST` 업로드 |
| `src/routes/+page.server.ts` | 신규 | 초기 정책 서버 렌더링 |
| `src/routes/+page.svelte` | 신규 | 정책 화면 + 업로드 영역 |
| `src/lib/components/FixedExtensionList.svelte` | 신규 | 고정 확장자 체크박스 |
| `src/lib/components/CustomExtensionInput.svelte` | 신규 | 입력 + 추가 + `N/200` + 태그 칩 |
| `src/lib/components/UploadArea.svelte` | 신규 | 업로드 + 결과·사유 표시 |
| `src/lib/server/upload/*.test.ts` | 신규 | 순수 함수 단위 테스트 (Vitest) |
| `src/lib/server/db/policy-repo.test.ts` | 신규 | PGlite 리포지토리 통합 테스트 |
| `src/routes/api/upload/server.test.ts` | 신규 | 업로드 엔드포인트 테스트 (HTTP 상태·응답 본문 단언) |
| `src/routes/api/policy/server.test.ts` | 신규 | 정책 엔드포인트 테스트 (토글·추가·삭제·거부 계약) |
| `src/lib/components/FixedExtensionList.test.ts` | 신규 | 컴포넌트 테스트 (jsdom) — AC-016a의 낙관적 갱신 → 실패 → 롤백 과도 상태 검증 |
| `svelte.config.js` · `vite.config.ts` · `package.json` · `tsconfig.json` | 신규 | 프로젝트 스캐폴드 (adapter-vercel) |
| `README.md` | 신규 | 실행 방법 + table schema |
| `CONSIDERATIONS.md` | 신규 | plan.md §9 매트릭스의 서술형 전개 |
| `PROMPT_LOG.md` | 기존 | **run 단계에서 읽기 전용** — 오케스트레이터가 관리. 완결성 판정은 `acceptance.md` Q11 |

---

## 5. 만들지 않는 것

각 항목은 "고려하지 않음"이 아니라 **고려한 뒤 의도적으로 제외**한 것이며, 근거는 `CONSIDERATIONS.md`로 전개한다.

### 5.1 Out of Scope — 업로드 파일 재제공
- 업로드된 파일을 다시 내려주는 다운로드·미리보기 엔드포인트를 만들지 않는다.
- Blob store는 private으로 두어 URL만으로는 열 수 없게 한다.
- 근거: 재제공하는 순간 `Content-Disposition` / `Content-Type` 처리 실수 하나로 저장형 XSS(업로드된 `.svg`·`.html`이 우리 오리진에서 실행)와 피싱 호스팅 위험이 열린다. 과제 요구는 "정상 파일은 업로드 성공 처리"까지이므로 위험 표면을 설계 단계에서 제거한다.

### 5.2 Out of Scope — 인증 및 사용자별 정책
- 로그인·사용자·권한 개념을 만들지 않으며 정책은 전역 단일 정책이다.
- 정책 변경 이력(`policy_audit_log`) 테이블도 만들지 않는다.
- 근거: 인증이 없으면 감사 로그의 핵심인 "누가"를 채울 수 없어 절반만 참인 기록이 된다. 대신 정책 변경 시 구조화 로그를 남기고, 향후 확장 지점으로 DDL 초안만 문서에 남긴다.

### 5.3 Out of Scope — 4.5MB 초과 파일 및 클라이언트 직접 업로드
- Vercel Function 본문 한도(4.5MB)를 넘는 파일을 다루지 않으며, 브라우저가 저장소에 직접 올리는 업로드 경로를 채택하지 않는다.
- 근거: 그 경로는 **서버가 파일 바이트를 보지 못해 내용 판별이 원리적으로 불가능**하다. 이 과제의 핵심이 서버 사이드 검증이라 정면으로 충돌한다.

### 5.4 Out of Scope — 압축파일 내부 검사 및 안티바이러스
- zip/tar 내부 엔트리 검사, zip-slip 대응, 압축 폭탄 방어, 바이러스 스캔 연동을 만들지 않는다.
- 근거: 확장자 정책은 컨테이너만 본다. 내부 검사는 별도의 해제·격리 인프라를 요구하며 과제 규모를 넘어선다. 한계 자체를 문서에 명시하는 것으로 대신한다.

### 5.5 Out of Scope — E2E 테스트 및 rate limiting
- 브라우저 자동화 E2E와 IP 기반 요청 제한을 만들지 않는다.
- 근거: 배포 URL의 수동 데모가 E2E와 같은 확신을 주고 CI 배선 비용이 과제 규모에 비해 크다. rate limiting은 무인증 공개 배포의 비용 DoS를 막는 개선안으로 문서에만 남기며, 현재는 업로드 크기 상한(4MB)과 요청당 1파일 제약, 그리고 Blob Hobby 무료 한도가 실질적 차단기 역할을 한다.

### 5.6 Out of Scope — 업로드 시도 조회 API
- 최근 업로드 시도를 돌려주는 `GET /api/uploads/recent` 엔드포인트를 만들지 않는다.
- `upload_attempt` 테이블은 그대로 유지하므로 감사 기록 자체는 남으며, 필요하면 DB를 직접 조회한다.
- 근거: 무인증 공개 배포에서는 다른 사용자가 올린 파일명·선언 MIME·탐지 MIME을 누구나 열람하게 된다. 운영 관점 데모라는 편익보다 노출 비용이 크다(`plan.md` §1.1 / §9 매트릭스 E9와 동일 근거).

---

## 6. 검증 방식

- **인수 기준**: `acceptance.md` (AC-UPLOAD-001 ~ 016, Given-When-Then)
- **주 커버리지 표면**: `src/lib/server/**` — `acceptance.md` Q2의 측정 분모와 동일한 glob을 쓴다
- **통합**: PGlite 인프로세스 PostgreSQL에 `migrations/001_init.sql`을 적용한 리포지토리 및 엔드포인트 테스트
- **컴포넌트**: Vitest `jsdom` 환경 + `@testing-library/svelte`로 `FixedExtensionList.svelte`를 렌더링해 AC-016a의 롤백 과도 상태를 검증한다. 브라우저를 띄우지 않는 단위 수준 DOM 테스트이며 §5.5의 E2E 배제와 충돌하지 않는다 (도구 선정 근거: `plan.md` §8)
- **품질 게이트**: `acceptance.md` § 품질 게이트 (Q1~Q11)
