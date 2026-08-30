# 파일 확장자 차단 정책 + 서버 사이드 업로드 검증

파일 업로드에 적용할 **확장자 차단 정책**을 DB에 저장·관리하고, 그 정책을 실제 업로드 요청에서 **서버가 강제**하는 단일 배포 웹 애플리케이션입니다. 고정 확장자 7개(`bat` `cmd` `com` `cpl` `exe` `scr` `js`)의 차단 여부를 체크박스로 켜고 끌 수 있고, 커스텀 확장자를 최대 200개까지 20자 이하로 추가·삭제할 수 있습니다. 변경은 즉시 DB에 반영되어 새로고침 후에도 유지됩니다.

정책 화면만 있고 업로드에서 강제되지 않으면 "정책은 있으나 막지 못하는 화면"에 그칩니다. 그래서 이 프로젝트는 정책 관리와 업로드 강제를 하나의 신뢰 경계 안에 두었습니다. 모든 판정은 서버에서 이뤄지며, 브라우저가 보여 주는 차단 안내는 편의용 힌트일 뿐 어떤 판정에도 입력으로 쓰이지 않습니다. 파일명 확장자뿐 아니라 파일 내용의 매직 넘버까지 확인하고, 무엇이 왜 막혔는지를 사유 코드와 함께 돌려줍니다.

- **배포 URL**: <https://flow-assignment-opal.vercel.app>
- **설계 근거 전문**: `.moai/specs/SPEC-UPLOAD-001/` (spec / plan / acceptance / progress)
- **판단 기록**: [`CONSIDERATIONS.md`](./CONSIDERATIONS.md) · [`PROMPT_LOG.md`](./PROMPT_LOG.md)

---

## 기술 스택

| 구분 | 사용 기술 | 버전 |
|---|---|---|
| 프레임워크 | SvelteKit | `^2.63.0` |
| UI | Svelte (runes 모드) | `^5.56.1` |
| 언어 | TypeScript | `^6.0.3` |
| 빌드 | Vite | `^8.0.16` |
| 배포 어댑터 | `@sveltejs/adapter-vercel` | `^6.3.3` |
| 데이터베이스 | Neon PostgreSQL (`@neondatabase/serverless` HTTP 드라이버) | `^1.1.0` |
| 파일 저장소 | Vercel Blob (`@vercel/blob`, private) | `^2.8.0` |
| 내용 판별 | `file-type` (매직 넘버) + 자체 prefix 스니핑 | `^22.0.2` |
| 테스트 | Vitest + `@electric-sql/pglite`(인프로세스 PostgreSQL) + `@testing-library/svelte` | `^4.1.8` / `^0.5.8` |

패키지 매니저는 **pnpm**을 씁니다. Node는 **24 이상**이 필요합니다 (`node --env-file-if-exists` 옵션을 마이그레이션 스크립트에서 사용합니다).

---

## 로컬 실행 방법

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 파일 준비 — .env.example을 복사한 뒤 값을 직접 입력합니다.
cp .env.example .env
#    편집기로 .env 를 열어 DATABASE_URL 과 BLOB_READ_WRITE_TOKEN 을 채웁니다.
#    .env 는 .gitignore 대상이며 커밋되지 않습니다.

# 3. 데이터베이스 마이그레이션 (테이블 생성 + 고정 확장자 7개 시드)
pnpm db:migrate

# 4. 개발 서버 실행 → http://localhost:5173
pnpm dev
```

`pnpm db:migrate`는 `migrations/` 안의 `.sql` 파일을 파일명 순서대로 적용하고 적용 이력을 `_migration` 테이블에 남깁니다. 이미 적용된 파일은 건너뛰므로 여러 번 실행해도 안전합니다.

### 그 밖의 명령

| 명령 | 하는 일 |
|---|---|
| `pnpm test` | 전체 테스트 (Vitest — `node` 프로젝트 + `jsdom` 컴포넌트 프로젝트) |
| `pnpm test:coverage` | 커버리지 측정 (`src/lib/server/**` 기준) |
| `pnpm lint` | `prettier --check` + `eslint` |
| `pnpm check` | `svelte-check` 타입 검사 |
| `pnpm build` | 프로덕션 빌드 (adapter-vercel) |

테스트는 실제 Neon·Vercel Blob에 접속하지 않습니다. DB가 필요한 테스트는 PGlite(WASM PostgreSQL)에 같은 `migrations/001_init.sql`을 적용해 인프로세스로 돌리고, 환경 변수에 의존하는 테스트는 `$env/dynamic/private` 모듈 자체를 모킹합니다. 따라서 `.env`가 있든 없든 결과가 같습니다.

---

## 환경 변수

값은 저장소에 두지 않습니다. 이름과 용도만 아래에 적고, 실제 값은 로컬 `.env`(추적 제외)와 Vercel 프로젝트 설정에만 존재합니다.

| 이름 | 용도 | 발급처 |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL 연결 문자열. `scripts/migrate.ts`와 런타임 DB 클라이언트가 사용합니다. | [Neon 콘솔](https://console.neon.tech) → 프로젝트 → Connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 읽기/쓰기 토큰. 업로드된 파일을 private 저장소에 올릴 때 사용합니다. | Vercel 대시보드 → Storage → Blob 스토어 → Tokens |

애플리케이션 코드는 이 값들을 **`$env/dynamic/private`로만** 읽습니다. `process.env` 직접 접근은 SvelteKit 밖에서 도는 `scripts/`에만 허용합니다. `PUBLIC_` 접두사를 붙이지 않으므로 클라이언트 번들에 유입될 경로가 없습니다.

---

## 데이터베이스 스키마

DDL의 단일 원본은 [`migrations/001_init.sql`](./migrations/001_init.sql)입니다. 아래 표는 그 파일을 읽기 쉽게 옮긴 것이며, 둘이 어긋나면 SQL 파일이 맞습니다.

### `blocked_extension` — 확장자 차단 정책

고정 확장자와 커스텀 확장자를 `kind` 컬럼으로 구분해 **한 테이블에** 담습니다. 테이블을 둘로 나누면 "고정과 커스텀이 같은 확장자를 가질 수 있는가"라는 질문에 DB가 답하지 못하는데, 하나로 두면 `UNIQUE(extension)` 제약 하나가 그 답을 강제합니다.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | `integer` | `GENERATED ALWAYS AS IDENTITY`, `PRIMARY KEY` |
| `extension` | `varchar(20)` | `NOT NULL`, `UNIQUE` (`blocked_extension_extension_key`), `CHECK (extension ~ '^[a-z0-9]{1,20}$')` (`blocked_extension_format_check`) |
| `kind` | `text` | `NOT NULL`, `CHECK (kind IN ('fixed', 'custom'))` (`blocked_extension_kind_check`) |
| `is_blocked` | `boolean` | `NOT NULL`, `DEFAULT false` |
| `sort_order` | `smallint` | `NOT NULL`, `DEFAULT 0` |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |
| `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**인덱스**: `PRIMARY KEY (id)`와 `UNIQUE (extension)` 두 개뿐입니다. 행 수 상한이 207개(고정 7 + 커스텀 200)라 추가 인덱스는 조회를 빠르게 하지 못하고 쓰기 비용만 늘립니다.

**시드 데이터**: 고정 확장자 7개(`bat` `cmd` `com` `cpl` `exe` `scr` `js`)를 `kind = 'fixed'`, `is_blocked = false`(기본 unCheck), `sort_order = 1..7`로 넣습니다. `ON CONFLICT DO NOTHING`이라 재실행해도 중복되지 않습니다.

### `upload_attempt` — 업로드 시도 감사 기록

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | `bigint` | `GENERATED ALWAYS AS IDENTITY`, `PRIMARY KEY` |
| `original_name` | `varchar(255)` | `NOT NULL` — 표시·감사용 **정규화** 파일명(클라이언트가 보낸 원본 바이트가 아님) |
| `extension` | `varchar(20)` | NULL 허용 — 마지막 dot-segment 1개 |
| `declared_mime` | `varchar(128)` | NULL 허용 — 브라우저가 신고한 MIME(판정에는 미사용, 기록만) |
| `detected_mime` | `varchar(128)` | NULL 허용 — 파일 내용에서 판별한 MIME |
| `size_bytes` | `integer` | `NOT NULL` |
| `outcome` | `text` | `NOT NULL`, `CHECK (outcome IN ('accepted', 'rejected'))` (`upload_attempt_outcome_check`) |
| `reason_code` | `varchar(48)` | NULL 허용 — 거부일 때의 사유 코드 |
| `blob_pathname` | `text` | NULL 허용 — 수락일 때의 저장 키 (`uploads/{UUID}`) |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

**인덱스**: `PRIMARY KEY (id)` + `upload_attempt_created_at_idx ON upload_attempt (created_at DESC)` — 감사 기록은 항상 최신순으로 읽습니다.

파일 **내용**은 이 테이블에도, 구조화 로그에도 남기지 않습니다.

### `_migration` — 마이그레이션 적용 이력

`migrations/001_init.sql`이 아니라 [`scripts/migrate.ts`](./scripts/migrate.ts)가 실행 시점에 만드는 부기용 테이블입니다.

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `filename` | `text` | `PRIMARY KEY` |
| `applied_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` |

---

## API 요약

모든 오류 응답은 형태가 같습니다.

```json
{ "ok": false, "error": { "code": "BLOCKED_EXTENSION", "message": "차단된 확장자예요: exe", "details": { "matched": "exe" } } }
```

| 메서드 · 경로 | 하는 일 | 성공 응답 |
|---|---|---|
| `GET /api/policy` | 정책 전체 조회 | `{ fixed: [{ extension, blocked }], custom: [{ extension }], customCount }` |
| `PATCH /api/policy/fixed/[ext]` | 고정 확장자 차단 토글 (본문 `{ "blocked": true \| false }`) | `{ ok: true, fixed: [...] }` |
| `POST /api/policy/custom` | 커스텀 확장자 추가 (본문 `{ "extension": "sh" }`) | `{ ok: true, ... }` + 별칭이 접혔으면 안내 문구 동봉 |
| `DELETE /api/policy/custom/[ext]` | 커스텀 확장자 삭제 | 변경 후의 정식 정책 상태 |
| `POST /api/upload` | 파일 업로드 (`multipart/form-data`, **요청당 1파일**, 최대 4MB) | `{ ok: true, originalName, mismatch, detectedMime? }` |

정책 변경 엔드포인트는 변경 후의 **정식 정책 상태**를 응답에 함께 돌려줍니다. 화면은 낙관적으로 먼저 바꾸고 실패하면 이 값으로 되돌리기 때문에, 저장에 실패해도 화면과 서버가 어긋난 채 남지 않습니다.

**사유 코드 10종**과 각각의 HTTP 상태·사용자 문구는 [`src/lib/server/upload/reason-codes.ts`](./src/lib/server/upload/reason-codes.ts)가 단일 원본입니다: `EXT_EMPTY`(400) · `EXT_TOO_LONG`(400) · `EXT_INVALID_CHARS`(400) · `EXT_DUPLICATE`(409) · `EXT_IS_FIXED`(409) · `EXT_LIMIT_REACHED`(409) · `FILE_TOO_LARGE`(413) · `BLOCKED_EXTENSION`(415) · `SIGNATURE_BLOCKED`(415) · `NO_EXTENSION`(415). 요구사항 원문은 `.moai/specs/SPEC-UPLOAD-001/spec.md` §3에 있습니다.

---

## 배포 절차

배포 대상은 Vercel이며 GitHub 저장소가 연결되어 있습니다. **`main`에 push하면 프로덕션 배포가 자동으로 시작됩니다.** 별도의 배포 명령이 필요 없습니다.

### 시크릿 등록 (운영자가 직접, 최초 1회)

이 프로젝트는 [`.claude/rules/local/secret-management.md`](./.claude/rules/local/secret-management.md)의 zero-trust 시크릿 규칙을 따릅니다. 2026년 4월 Vercel 공급망 사고 이후로, **시크릿 값은 AI 세션·명령어 문자열·셸 히스토리 어디에도 남기지 않는다**는 원칙을 기계적으로 강제합니다(`block-vercel-env-insecure.mjs`, `block-env-edit.mjs` 훅).

```bash
# 대화형 프롬프트에서 값을 붙여 넣습니다 — 값이 명령어 문자열에 들어가지 않습니다.
vercel env add DATABASE_URL production
vercel env add BLOB_READ_WRITE_TOKEN production
```

- `--value`로 값을 넘기거나 `echo VALUE | vercel env add ...`로 파이프하는 형태는 **금지**입니다. 셸 히스토리와 CI 로그에 평문이 남습니다.
- Production·Preview 변수는 **모두 Sensitive**로 둡니다. CLI 기본값이 sensitive이므로 `--no-sensitive`를 붙이지 않으면 됩니다. Sensitive 변수는 대시보드·`vercel env ls`·API로 되읽을 수 없습니다.
- Development 타깃은 sensitive로 만들 수 없으므로 **로컬 개발용 값은 Vercel에 등록하지 않고** 추적되지 않는 `.env`에 직접 타이핑합니다.
- `.vercel/` 디렉터리는 커밋하지 않습니다(`.gitignore` 대상).

### 배포 전 확인

1. Vercel 프로젝트에 `DATABASE_URL`과 `BLOB_READ_WRITE_TOKEN`이 **Production 스코프 · Sensitive 배지**가 붙은 상태로 존재하는지 대시보드에서 눈으로 확인합니다.
2. Neon에 마이그레이션이 적용되어 있는지 확인합니다(`pnpm db:migrate`). 테이블이 없으면 첫 요청부터 500이 납니다.

> **주의**: [`src/hooks.server.ts`](./src/hooks.server.ts)가 매 요청마다 DB 클라이언트와 Blob 스토어를 만듭니다. 두 환경 변수 중 **하나라도 비어 있으면 모든 요청이 500**입니다. 이는 의도된 fail-closed 동작으로, 시크릿이 빠진 채 정책이 무력화된 상태로 서비스되는 것보다 낫습니다.

---

## 함께 보는 문서

| 파일 | 내용 |
|---|---|
| [`CONSIDERATIONS.md`](./CONSIDERATIONS.md) | 과제 §3의 19개 고려사항 + 자체 발굴 9개, 총 28항목에 대한 판단과 근거 |
| [`PROMPT_LOG.md`](./PROMPT_LOG.md) | AI 활용 기록 — 프롬프트 타임라인, 사용한 도구, 채택/수정/폐기 판단 회고 |
| `.moai/specs/SPEC-UPLOAD-001/spec.md` | 요구사항 16개(GEARS) + 스코프 밖으로 둔 것 |
| `.moai/specs/SPEC-UPLOAD-001/plan.md` | 설계 결정 7건 + 위험 + 마일스톤 + 고려사항 매트릭스 |
| `.moai/specs/SPEC-UPLOAD-001/acceptance.md` | 인수 기준 16개(Given-When-Then) + 품질 게이트 12개 |
| `.moai/specs/SPEC-UPLOAD-001/progress.md` | 마일스톤별 실행 증거 |
