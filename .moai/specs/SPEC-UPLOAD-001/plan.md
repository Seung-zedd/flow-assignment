---
id: SPEC-UPLOAD-001
title: 확장자 차단 정책 관리 및 서버 사이드 업로드 검증
status: draft
tier: M
phase: "v0.1.0 target"
created: 2026-08-29
updated: 2026-08-29
---

# SPEC-UPLOAD-001 — 구현 계획 (plan)

## 1. 목표와 범위

확장자 기반 차단 정책을 DB에 저장·관리하고, 그 정책이 **실제 업로드 요청에서 서버 사이드로 강제**되는 단일 배포 애플리케이션을 만든다. 과제 브리프 §2(A+B)가 최소 범위이며, 평가 가중치가 가장 높은 §3(고려사항)은 코드가 아니라 `CONSIDERATIONS.md`로 답한다.

- **스택**: SvelteKit 2.x (Svelte 5 runes, TypeScript) + Neon PostgreSQL + Vercel Blob, `@sveltejs/adapter-vercel`로 Vercel 단일 배포. 패키지 매니저 pnpm.
- **개발 방식**: TDD (RED-GREEN-REFACTOR). `quality.yaml` 기준 커버리지 목표 85%, 커밋당 최소 80%.
- **Tier**: M (예상 5~15 파일, 300~1000 LOC). 요구사항 모듈 5개, AC 상한 16개.

### 1.1 만들지 않는 것 (Out of Scope)

정식 Out of Scope 선언(h3 6개)은 `spec.md` §5가, 서술형 근거는 `CONSIDERATIONS.md`가 담당한다. 여기서는 계획 판단에 필요한 요지만 둔다.

- **업로드 파일 재제공** — 다운로드/미리보기 엔드포인트를 만들지 않고 Blob store를 private으로 둔다. 재제공하는 순간 `Content-Disposition`/`Content-Type` 실수 하나로 저장형 XSS(업로드된 `.svg`·`.html`이 우리 오리진에서 실행)와 피싱 호스팅 위험이 열린다. 과제 요구는 "정상 파일은 업로드 성공 처리"까지이므로 위험 표면을 설계로 제거한다.
- **인증·사용자별 정책** — 전역 단일 정책만 둔다. 인증 없이 "누가 바꿨는가"를 기록하면 감사 로그가 절반만 참인 상태가 된다(§2.4와 연결).
- **4.5MB 초과 파일 / client upload** — client upload 경로는 **서버가 파일 바이트를 보지 못해 시그니처 검사가 불가능**하다. 이 과제의 핵심과 정면으로 충돌하므로 서버 업로드만 채택한다.
- **압축파일 내부 검사, 안티바이러스, E2E** — zip 내부 엔트리·zip-slip·압축 폭탄·바이러스 스캔·Playwright는 만들지 않는다. 근거는 §9 매트릭스.
- **최근 업로드 시도 조회 엔드포인트(`GET /api/uploads/recent`)** — 만들지 않는다. 이를 규정하는 REQ도 검증하는 AC도 없었고, 무인증 공개 배포 위에서는 **다른 사용자가 올린 파일명·선언 MIME·탐지 MIME을 누구나 열람**하게 만든다. 운영 관점 데모라는 편익보다 노출 비용이 크다. `upload_attempt` 테이블은 그대로 유지하므로 감사 기록 자체는 남으며, 필요하면 DB를 직접 조회한다.

---

## 2. 결정 1 — 데이터 모델

### 2.1 단일 테이블 + `kind` 컬럼 (채택)

**채택: A. `blocked_extension` 단일 테이블 + `kind`** / **기각: B. `fixed_extension`·`custom_extension` 2 테이블**

근거: 업로드 판정 시 필요한 질문은 "이 확장자가 차단 대상인가?" 하나다. 2 테이블이면 업로드 경로마다 `UNION`이 필요하고, "고정과 커스텀에 같은 값이 동시에 존재"하는 상태를 DB가 막아주지 못한다. 단일 테이블 + `UNIQUE(extension)`이면 그 상태가 **구조적으로 불가능**해진다.

고정 확장자와 커스텀 확장자는 수명 주기가 다르지만 `is_blocked` 하나로 통일한다.
- 고정: 7행을 시드로 심고 절대 삭제하지 않으며, 체크/해제는 `is_blocked` 토글이다(기본 `false`).
- 커스텀: 존재 자체가 차단이다. 추가는 INSERT(`is_blocked = true`), `X` 클릭은 DELETE.

### 2.2 대소문자 정규화 전략

정규화된 값만 저장한다(소문자, 점 없음, ASCII). 별도의 `extension_normalized` 컬럼을 두지 않는다. 근거: 원본 입력을 보존할 이유가 없다 — `EXE`와 `exe`는 같은 정책이며, 사용자에게 되돌려줄 표시값도 정규화된 값이 맞다. 컬럼을 하나 줄이면 "둘 중 뭘로 조회하지?"라는 실수 표면도 함께 사라진다.

### 2.3 200개 상한: DB 제약 vs 애플리케이션 검사

PostgreSQL의 `CHECK`는 행 단위라 "`kind='custom'`인 행이 200개 이하"를 선언적으로 표현할 수 없다(가능한 선언적 수단은 트리거뿐이고, 트리거는 이 규모에 과하다). 따라서 **단일 원자 SQL 문(CTE 조건부 INSERT)**으로 애플리케이션 계층에서 강제한다.

```sql
INSERT INTO blocked_extension (extension, kind, is_blocked)
SELECT $1, 'custom', true
WHERE (SELECT count(*) FROM blocked_extension WHERE kind = 'custom') < 200
RETURNING extension;
```

반환 행이 없으면 상한 초과(`EXT_LIMIT_REACHED`). `READ COMMITTED`에서 동시 요청 두 건이 199를 함께 읽어 201이 될 수 있는 잔여 경합이 남는다. 엄격 모드가 필요하면 같은 트랜잭션에 `pg_advisory_xact_lock(hashtext('custom_ext'))`를 선행시키면 결정적으로 닫힌다. 현재는 **잔여 경합을 감수하고 문서화**한다 — 단일 사용자 데모에서 발생 확률이 0에 가깝고, 넘치더라도 결과는 "201개"이지 데이터 손상이 아니다.

### 2.4 정책 변경 이력 테이블 (§3-2): 보류

만들지 않는다. 근거: 인증이 없어 감사 로그의 핵심인 "누가"를 채울 수 없다. "언제/무엇"만 남기면 사실상 구조화된 로그와 같으므로, 정책 변경 시 **구조화 로그 한 줄**을 stdout에 남기고(Vercel이 수집), 향후 확장 지점으로 `policy_audit_log` DDL 초안만 `CONSIDERATIONS.md`에 적어 둔다.

### 2.5 DDL 초안 (`migrations/001_init.sql`)

이 파일이 README의 table schema 제출물과 **동일한 원본**이다(README는 이 파일을 인용한다).

```sql
CREATE TABLE IF NOT EXISTS blocked_extension (
  id          integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  extension   varchar(20)  NOT NULL,
  kind        text         NOT NULL,
  is_blocked  boolean      NOT NULL DEFAULT false,
  sort_order  smallint     NOT NULL DEFAULT 0,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT blocked_extension_extension_key   UNIQUE (extension),
  CONSTRAINT blocked_extension_kind_check      CHECK (kind IN ('fixed', 'custom')),
  CONSTRAINT blocked_extension_format_check    CHECK (extension ~ '^[a-z0-9]{1,20}$')
);

CREATE TABLE IF NOT EXISTS upload_attempt (
  id             bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  original_name  varchar(255) NOT NULL,  -- 표시·감사용 정규화 파일명(원본 바이트 아님)
  extension      varchar(20),  -- 마지막 dot-segment 1개(통상적 의미의 확장자)
  declared_mime  varchar(128),
  detected_mime  varchar(128),
  size_bytes     integer      NOT NULL,
  outcome        text         NOT NULL,
  reason_code    varchar(48),
  blob_pathname  text,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT upload_attempt_outcome_check CHECK (outcome IN ('accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS upload_attempt_created_at_idx
  ON upload_attempt (created_at DESC);

INSERT INTO blocked_extension (extension, kind, is_blocked, sort_order) VALUES
  ('bat', 'fixed', false, 1), ('cmd', 'fixed', false, 2), ('com', 'fixed', false, 3),
  ('cpl', 'fixed', false, 4), ('exe', 'fixed', false, 5), ('scr', 'fixed', false, 6),
  ('js',  'fixed', false, 7)
ON CONFLICT (extension) DO NOTHING;
```

**인덱스 판단 (§3-2 성능 항목)**: 의도적으로 인덱스를 `UNIQUE(extension)` 하나만 둔다. 이 인덱스가 업로드 판정 핫패스(`WHERE extension = ANY($1)`)를 그대로 커버한다. `kind`에 인덱스를 추가하지 않는 이유는, 전체 행이 최대 207개라 한 페이지에 들어가고 플래너가 어떤 경우에도 seq scan을 고르기 때문이다 — 여기서 인덱스를 더 만드는 것은 쓰기 비용만 늘리는 장식이다. 반면 `upload_attempt`는 무한히 증가한다. 조회 엔드포인트는 만들지 않지만(§1.1) 감사·운영 시 DB를 직접 조회(`ORDER BY created_at DESC`)하므로 `created_at DESC` 인덱스는 값을 한다.

**`varchar(20)` + CHECK 정규식**: 20자·문자 집합 규칙을 애플리케이션에만 두지 않고 DB에도 새긴다 — 검증을 우회한 경로(수동 SQL, 향후 다른 클라이언트)에서도 오염된 값이 들어올 수 없다. **복합 확장자(`tar.gz`)를 행으로 저장하지 않는 이유**: 파일명의 **모든 dot-segment**를 검사하는 방식(§3)을 택했기 때문에 `gz` 한 행이 `archive.tar.gz`를 이미 막는다. 점을 포함한 값을 저장하면 "어디까지가 확장자인가"라는 파싱 규칙이 저장 계층까지 번지므로, 점을 금지하고 판정 규칙 쪽에서 해결한다.

**`upload_attempt.extension`은 마지막 세그먼트 1개만 담는다**(`file.exe.txt` → `txt`, 폭은 `blocked_extension.extension`과 동일한 `varchar(20)`). 세그먼트 전체 목록과 실제로 걸린 세그먼트는 구조화 로그에만 남긴다. 근거 — 이 컬럼은 "무엇이 올라왔나"를 사람이 훑는 용도라 통상적 확장자 하나가 읽기 쉽고, `text[]`는 조회 화면에서 풀어 보여줘야 하는 비용 대비 얻는 게 없다. 정밀한 거부 근거는 `reason_code`가 이미 담당한다.

---

## 3. 결정 2 — 업로드 검증 파이프라인 (서버 사이드)

`POST /api/upload` 핸들러가 아래 순서로 수행한다. **어떤 단계도 클라이언트 검증에 의존하지 않는다.**

1. **크기 선차단 (헤더)** — `Content-Length`가 있고 4MB(`MAX_UPLOAD_BYTES`)를 초과하면 본문 파싱 전에 거부(`FILE_TOO_LARGE`, 413). 요청당 파일이 하나이므로 이 헤더 값이 곧 그 파일의 크기이며, 선차단이 근사가 아니라 정확한 판정이 된다. **이 시점의 거부는 `upload_attempt`에 행을 남기지 않는다** — 파일명과 실제 크기가 아직 없어 NOT NULL 컬럼을 채울 수 없다(§7).
2. **크기 재확인 (실측)** — 헤더가 없거나(청크 전송) 실제보다 작게 신고된 경우를 위해, 본문을 **바이트 상한을 건 채로** 읽고 실제 누적 바이트가 4MB를 넘으면 같은 `FILE_TOO_LARGE`로 거부한다. 이 경로는 파일명이 확정된 뒤이므로 `upload_attempt`에 1행을 남긴다. 플랫폼의 4.5MB 요청 본문 한도는 두 겹을 모두 통과한 경우의 **최후 방어선**일 뿐 판정 근거가 아니다 — `Content-Length`는 클라이언트가 제시하는 값이라 그것만 믿으면 "서버에서 강제한다"는 주장이 성립하지 않는다.
3. **파일명 정규화** — NFC 정규화 → 제어문자 제거 → 경로 구분자(`/`, `\`)와 `..` 제거 → 앞뒤 공백 제거 → 255바이트로 절단. 이 단계가 경로 조작 1차 방어다.
4. **확장자 추출** — 소문자화 후 `.`으로 분해하여 **첫 세그먼트를 제외한 모든 세그먼트**를 후보로 삼는다.
   - `file.exe.txt` → `['exe', 'txt']` (이중 확장자 대응)
   - `archive.tar.gz` → `['tar', 'gz']`
   - `report.PDF` → `['pdf']` (대소문자)
   - `.env` → `['env']` (점으로 시작하는 dotfile)
   - `README` → `[]` → `NO_EXTENSION`
5. **정책 대조** — `SELECT extension FROM blocked_extension WHERE extension = ANY($1) AND is_blocked = true` 한 번. 하나라도 걸리면 `BLOCKED_EXTENSION`(415)이며, **어떤 세그먼트가 걸렸는지**를 응답에 담는다.
6. **확장자 없는 파일** — 거부(`NO_EXTENSION`). 근거: 블랙리스트 모델에서 확장자가 없으면 적용할 정책이 없다. "모르는 것은 통과"가 아니라 "모르는 것은 거부"를 택한다. 화이트리스트 모델로 전환하면 이 판단은 뒤집힌다(§3-4 확장 항목).
7. **시그니처(매직 넘버) 검사** — 앞 4100바이트를 읽어 `file-type`의 `fileTypeFromBuffer`로 실제 타입을 판별하고, 반환된 `ext`를 **별칭 정규화**(§3.3)한 뒤 정책과 대조한다.
   - 정규화된 탐지 확장자가 차단 목록에 있으면 → `SIGNATURE_BLOCKED` (415). `report.jpg`인데 실제로 PE 실행 파일인 경우가 여기서 걸린다.
   - **탐지 결과가 선언 확장자와 다르기만 한 경우는 거부하지 않는다** — 이상 징후로 `upload_attempt.detected_mime`과 구조화 로그에 기록만 한다(§3.2 판단 근거).
   - **판별 불가(`undefined`)면 통과시킨다** — 이게 이 파이프라인의 알려진 우회 경로다(§3.1).
8. **명시적 prefix 스니핑 (보강)** — `file-type`이 원리적으로 못 잡는 것을 직접 본다. **각 prefix는 합성 탐지 확장자(synthetic detected extension)로 매핑되고, 그 값은 7단계와 완전히 같은 정책 대조를 통과한다** — 매핑 결과가 차단 목록에 있을 때만 `SIGNATURE_BLOCKED`이고, 없으면 통과한다. 매핑: `MZ`→`exe`, `\x7fELF`→`elf`, `#!`(shebang)→`sh`, `<?php`→`php`, `<svg`→`svg`, `<script`·`<!DOCTYPE html`·`<html`→`html`.

   **평범한 `.html` 업로드는 `html`이 차단 목록에 없는 한 거부되지 않는다** — prefix 적중 자체는 거부 사유가 아니다. `<script`를 `js`로 매핑하지 않는 점에 주의한다: `<script` 태그의 존재는 HTML 문서라는 뜻이지 `.js` 파일이라는 뜻이 아니고, `js`는 고정 확장자 7개 중 하나라 잘못 매핑하면 사용자가 `js`를 체크하는 순간 모든 HTML이 차단된다.

   근거: `.sh`, `.bat`, `.cmd`처럼 **매직 넘버가 없는 텍스트 실행 파일**은 라이브러리가 판별할 수 없다 — `file-type` README가 "This package is for detecting binary-based file formats, not text-based formats like `.txt`, `.csv`, `.svg`, etc."라고 명시한다. 이 과제의 위험 목록이 정확히 그 부류라 라이브러리 하나로 끝났다고 말하면 거짓이 된다.
9. **선언 MIME 취급** — 브라우저가 보낸 `file.type`은 **신뢰 경계 밖의 힌트**로만 쓴다. 판정에 사용하지 않고 `upload_attempt.declared_mime`에 기록만 한다. 근거: 대부분의 브라우저는 파일 내용이 아니라 **확장자와 OS의 MIME 데이터베이스**로 이 값을 만든다 — 즉 확장자의 독립적인 검증 수단이 아니라 확장자의 파생값이다.
10. **저장** — 원본 파일명을 절대 저장 키로 쓰지 않는다. 키는 `uploads/${crypto.randomUUID()}`이며 **확장자를 붙이지 않는다**(경로 기반 Content-Type 추론 차단). 원본 파일명은 `upload_attempt.original_name` 메타데이터로만 남기고, 화면 표시 시 이스케이프한다.
11. **기록** — 성공/거부 모두 `upload_attempt`에 1행. 그리고 구조화 로그 한 줄.

### 3.1 알려진 우회 경로 (문서화 대상, `@MX:WARN`)

`file-type`은 매직 넘버가 있는 포맷만 판별한다. 순수 텍스트(`.sh`, `.py`, CSV, JSON)는 shebang이 없으면 판별 불가이며 이때 파이프라인은 통과시킨다. 즉 **시그니처 검사는 확장자 정책을 보강할 뿐 대체하지 못한다.** 차단의 1차 근거는 여전히 확장자이고, 시그니처는 "확장자로 위장한 알려진 바이너리"를 잡는 2차 그물이다. 이 한계를 숨기지 않고 `CONSIDERATIONS.md`에 명시한다.

### 3.2 탐지-선언 불일치 정책: 차단 목록 대조만 (채택)

**채택: (a) 탐지 확장자가 차단 목록에 있을 때만 거부, 단순 불일치는 기록만** / **기각: (b) 탐지 ≠ 선언이면 무조건 거부**

근거: 과제가 명시한 위협은 "`report.jpg`인데 실제로는 실행 파일"이다 — **위험한 것으로 판명된 내용물**이 문제이지 불일치 자체가 문제가 아니다. (b)를 택하면 PNG를 `notes.txt`로 저장해 둔 무해한 파일이 거부되고, 오탐이 쌓이면 사용자가 차단 메시지를 읽지 않게 된다. 차단 UX의 신뢰도가 실제 손실이다. 다만 (b)를 버리는 것은 아니다 — 불일치는 `upload_attempt.detected_mime`과 구조화 로그에 남아 **차단하지 않되 보이게** 한다. 화이트리스트 모델로 전환하면 (b)가 자연스러운 기본값이 되므로 그때 뒤집힐 판단임을 명시한다. 결과적으로 `EXTENSION_CONTENT_MISMATCH`는 거부 사유 코드에서 빠지고 기록 전용 플래그(`mismatch: true`)가 된다.

### 3.3 확장자 별칭 정규화 (비교 전에 적용)

`file-type`은 포맷마다 대표 확장자 하나만 돌려준다 — JPEG는 `jpg`, TIFF는 `tif`, PE 실행 파일은 `exe`, ELF는 `elf`다. 따라서 탐지 결과를 그대로 비교하면 `photo.jpeg`가 `jpg`와 다르다는 이유로 오탐이 난다. **정책 대조 전에 양쪽 값을 모두 대표형으로 접는다.**

| 별칭 | 대표형 | 출처 |
|---|---|---|
| `jpeg` | `jpg` | `file-type`이 JPEG에 `jpg` 반환 |
| `tiff` | `tif` | `file-type`이 TIFF에 `tif` 반환 |
| `htm` | `html` | 8단계 합성 확장자와 정렬 |
| `mpeg` | `mpg` | 방어적 등록 |
| `yml` | `yaml` | 텍스트 포맷, 8단계 경로에서만 의미 |

`htm`/`html`, `yml`/`yaml`은 `file-type`이 탐지하지 않는 텍스트 포맷이라 7단계에는 등장하지 않지만 8단계 합성 확장자와 커스텀 입력에서는 나타난다. 별칭 표는 **한 곳(`EXTENSION_ALIASES`)에 두고 7·8단계와 정책 저장이 모두 같은 표를 쓴다** — 표가 갈라지면 한쪽만 고쳐지는 순간 오탐이 조용히 돌아온다. 정책 저장 시에도 대표형으로 접으므로 `jpeg`를 추가하면 `jpg`로 저장·표시된다. 그래야 "`jpeg`를 막았는데 `.jpg`가 통과한다"는 구멍이 생기지 않는다.

### 3.4 라이브러리 선택

`file-type` v22 채택. 근거: Node 표준 라이브러리에 매직 넘버 판별이 없고, 이 기능을 직접 구현하면 포맷 시그니처 테이블을 손으로 유지해야 한다(간소화 사다리 4→5단계). 대안이었던 `mmmagic`은 네이티브 바인딩이라 Vercel serverless 번들에 부적합하고, `libmagic` 계열은 시스템 바이너리 의존이 생겨 기각. `file-type`은 순수 JS·ESM이라 `adapter-vercel` 번들에 그대로 들어간다.

---

## 4. 결정 3 — 커스텀 확장자 입력 정규화

정규화 순서: `NFKC 정규화` → `trim` → `앞쪽 점 모두 제거` → `소문자화` → 패턴 검사 `^[a-z0-9]{1,20}$`.

NFKC를 먼저 두는 이유는 전각 입력(`ｅｘｅ`)을 `exe`로 접기 위해서다. 다만 NFKC는 키릴 `е`를 라틴 `e`로 접지 않으므로 **호모글리프 방어의 실체는 ASCII 화이트리스트 패턴**이다 — 정규화는 편의, 화이트리스트가 방어선이다.

### 4.1 문구 상수 표 (단일 원본)

아래 문자열은 **확정 상수**다. 테스트는 이 표의 문자열을 그대로 단언하고, 화면은 이 표를 그대로 렌더링한다. "…취지의 문구" 같은 느슨한 서술을 두면 구현자가 고른 임의의 문자열을 테스트가 되받게 되어, 통과 여부가 요구사항이 아니라 구현 선택으로 결정된다. `{...}`는 런타임 치환 자리다.

| 코드 | HTTP | 확정 문구 |
|---|---|---|
| `EXT_EMPTY` | 400 | `확장자를 입력해 주세요.` |
| `EXT_TOO_LONG` | 400 | `확장자는 최대 20자까지 입력할 수 있어요.` |
| `EXT_INVALID_CHARS` | 400 | `확장자는 영문 소문자와 숫자만 사용할 수 있어요.` |
| `EXT_DUPLICATE` | 409 | `이미 추가된 확장자예요.` |
| `EXT_IS_FIXED` | 409 | `고정 확장자예요. 위 체크박스에서 관리해 주세요.` |
| `EXT_LIMIT_REACHED` | 409 | `커스텀 확장자는 최대 200개까지 추가할 수 있어요.` |
| `BLOCKED_EXTENSION` | 415 | `차단된 확장자예요: {matched}` |
| `SIGNATURE_BLOCKED` | 415 | `파일 내용이 차단 대상 형식({detected})이에요.` |
| `NO_EXTENSION` | 415 | `확장자가 없어 차단 정책을 적용할 수 없어요.` |
| `FILE_TOO_LARGE` | 413 | `파일은 4MB까지 올릴 수 있어요.` |
| `ALIAS_FOLDED` | — (성공 알림) | `{input}는 {canonical}와 같은 형식이라 {canonical}로 저장돼요.` |
| `CLIENT_HINT_BLOCKED` | — (비차단 힌트) | `이 확장자는 지금 차단 목록에 있어요. 올리면 서버에서 거부돼요.` |
| `CLIENT_HINT_DISCLAIMER` | — (고정 안내) | `이 확인은 편의용이에요. 실제 차단은 서버에서 이뤄집니다.` |

`ALIAS_FOLDED`는 오류가 아니라 **성공 응답에 함께 실리는 알림**이다. 사용자가 `jpeg`를 추가하면 저장·표시는 `jpg`가 되고 응답에 `canonical: "jpg"`가 담기며, 화면은 `jpeg는 jpg와 같은 형식이라 jpg로 저장돼요.`를 보여 준다. 접기 자체를 없애지 않고 알림을 붙인 이유는, 접지 않으면 "`jpeg`를 막았는데 `.jpg`가 통과한다"는 구멍이 그대로 남기 때문이다 — 사용자를 놀라게 하지 않으면서 구멍은 닫는 쪽을 택했다.

화면 문구 검증의 소유자는 `acceptance.md` 품질 게이트 **Q12(수동 확인)**다. API AC는 사유 코드와 `details`만 단언한다 — 엔드포인트를 직접 호출하는 경로에서는 화면을 관찰할 수 없기 때문이다.

**고정 확장자와 겹칠 때(§3-2)**: 거부한다. accept-and-hide(받아들이되 커스텀 목록에 감추기)를 기각한 이유는, 같은 확장자에 대해 "고정 행"과 "커스텀 행"이라는 두 개의 진실이 생기고 새로고침 후 사용자의 기대와 화면이 어긋나기 때문이다. `UNIQUE(extension)` 제약이 이 결정을 DB 차원에서 뒷받침한다 — 중복 위반이 발생하면 그 행의 `kind`를 조회해 `EXT_DUPLICATE`와 `EXT_IS_FIXED`를 나눠 응답한다. 즉 제약 하나가 두 가지 UX를 동시에 만든다.

---

## 5. 결정 4 — API 표면

**`+server.ts` JSON 엔드포인트 채택, form actions 기각.**

근거: (a) 정책 화면은 체크박스 토글·칩 추가/삭제가 잦은 상호작용 UI라 form action은 액션마다 전체 무효화 왕복 또는 `enhance` 배선을 강요한다. (b) 이 과제의 핵심 산출물인 **기계 판독 가능한 `reason_code` 에러 규격**은 JSON 응답으로 표현하는 것이 자연스럽다. (c) 업로드 결과를 사유 코드와 함께 화면에 즉시 반영해야 한다.

**요청 하나 = 파일 하나.** 다중 파일 선택은 클라이언트가 **파일 개수만큼 순차 요청**을 보내 처리하며 서버는 요청당 정확히 한 개의 파일만 받는다. 이 결정이 세 가지를 동시에 정리한다 — `Content-Length`가 곧 그 파일의 크기가 되어 선차단이 정확해지고, 부분 성공(5개 중 1개 차단)이라는 애매한 응답 계약 자체가 사라지며, 근거 없는 상수 하나(`MAX_FILES_PER_REQUEST = 5`)가 없어진다. 파일별 결과는 요청별 응답으로 자연히 분리된다.

기각의 대가는 **JS 없이 동작하는 점진적 향상**이다. 이를 완전히 버리지 않기 위해 초기 데이터는 `+page.server.ts`의 `load`로 서버 렌더링한다 — 첫 화면은 서버가 그리고, 변경만 JSON으로 처리한다.

| Method | Path | 용도 |
|---|---|---|
| `GET` | `/api/policy` | 정책 전체 조회 (`fixed[]`, `custom[]`, `customCount`) |
| `PATCH` | `/api/policy/fixed/[ext]` | 고정 확장자 토글 (`{ blocked: boolean }`, 멱등) |
| `POST` | `/api/policy/custom` | 커스텀 추가 (`{ extension: string }`) |
| `DELETE` | `/api/policy/custom/[ext]` | 커스텀 삭제 |
| `POST` | `/api/upload` | `multipart/form-data` 업로드 — **파일 1개** |

에러 응답 규격:

```jsonc
{ "ok": false, "error": { "code": "BLOCKED_EXTENSION", "message": "…", "details": { "matched": "exe" } } }
```

상태 코드 매핑: 400 형식 오류 / 409 충돌·상한 / 413 크기 초과 / 415 정책 거부(`BLOCKED_EXTENSION`, `SIGNATURE_BLOCKED`, `NO_EXTENSION`) / 500 서버 오류. 415를 쓰는 이유는 "요청은 올바르나 이 종류의 파일은 받지 않는다"가 정확히 그 코드의 의미이기 때문이다.

업로드 거부 사유 코드는 위 3개가 전부다. `EXTENSION_CONTENT_MISMATCH`는 §3.2 결정에 따라 **거부 사유가 아니라 성공 응답에 실리는 기록 전용 플래그**(`{ ok: true, mismatch: true, detectedMime: … }`)이며, 화면에서는 경고가 아닌 정보 배지로만 노출한다.

모든 변경 엔드포인트는 **변경 후의 정식 상태 조각**을 함께 반환한다. 클라이언트가 낙관적 갱신 후 별도 재조회를 하지 않아도 서버와 화면이 수렴한다.

---

## 6. 결정 5 — DB 접근 계층

**`@neondatabase/serverless` + 파라미터화된 평문 SQL 채택. Drizzle 기각.**

간소화 사다리 적용 결과: 테이블 2개, 쿼리 약 8개다. Drizzle은 스키마 DSL·마이그레이션 생성기·추가 빌드 단계를 가져오는데, 그 대가로 얻는 타입 안전성은 여기서 손으로 쓴 행 타입 8개로 대체된다. 결정적으로 **과제 제출물이 "사람이 읽는 table schema"를 요구**하므로, 평문 DDL이 곧 제출물이 되는 구성이 문서와 코드의 이중 관리를 없앤다.

- 드라이버는 HTTP 모드(`neon()` 태그드 템플릿)를 쓴다. 쿼리당 1 왕복이라 serverless에 적합하고, 태그드 템플릿이 파라미터 바인딩을 강제해 SQL 인젝션 표면을 구조적으로 없앤다(문자열 연결 금지).
- 대화형 트랜잭션이 필요한 경우는 없다. 배치가 필요하면 `sql.transaction([...])`. 마이그레이션: `migrations/NNN_*.sql`을 순서대로 적용하는 `scripts/migrate.ts`(약 30줄). 적용 이력은 `_migration` 테이블에 파일명으로 기록해 재실행 안전성을 보장한다. `pnpm db:migrate`.
- 시크릿: `DATABASE_URL`, Blob 토큰은 `$env/dynamic/private`로만 접근한다. SvelteKit이 `PUBLIC_` 접두사 없는 변수의 클라이언트 번들 유입을 빌드 타임에 차단하므로, 이 규칙만 지키면 유출 경로가 닫힌다.

---

## 7. 결정 6 — 운영·정합성

- **새로고침 정합성**: 서버가 유일한 진실이다. 화면 진입 시 `+page.server.ts` `load`가 DB에서 읽고, 변경은 낙관적 갱신 후 서버가 돌려준 정식 상태로 재조정한다. 실패 시 낙관적 변경을 되돌리고 사유를 표시한다.
- **동시 편집**: last-write-wins를 채택하고 버전 컬럼을 두지 않는다. 근거 — 제자리 수정(in-place edit) 필드가 하나도 없다. 고정 토글은 멱등한 boolean set이라 갱신 손실 개념이 성립하지 않고, 커스텀 추가/삭제는 INSERT/DELETE라 실제 동시성 보호는 `UNIQUE(extension)` 제약이 담당한다(동시에 `sh`를 추가하면 하나만 성공하고 나머지는 `EXT_DUPLICATE`).
- **로그**: stdout에 한 줄 JSON. `{ event, ts, request_id, outcome, reason_code, ext, size_bytes, declared_mime, detected_mime }`. **파일 내용은 절대 남기지 않고**, 원본 파일명은 사용자 제어 문자열이므로 64자로 절단해 기록한다. Hobby 플랜의 로그 보존 기간이 짧으므로 **영속 기록은 `upload_attempt` 테이블**이 담당한다(로그는 실시간 관찰용, 테이블은 감사용).
- **Neon 콜드 스타트**: Free 플랜은 5분 유휴 후 compute가 0으로 축소되며 이 설정은 변경 불가다. 재활성화는 수백 밀리초 수준이라고 문서에 명시되어 있다. 엔지니어링으로 우회하지 않고, 면접 당일 데모 직전에 URL을 한 번 호출해 예열하는 것으로 대응하고 문서에 적는다.
- **Vercel Blob 한도**: Hobby는 사용량 한도 내 무료이며 초과 시 30일간 접근이 차단된다. 고급 작업(`put`) 속도 제한은 Hobby 900회/분. 개별 파일 최대 5TB이지만 우리 상한은 Function 본문 한도에서 온 4MB라 무관하다.
- **저장 순서와 고아 객체**: 순서는 **Blob `put` → DB `INSERT`**로 고정한다. 근거 — 반대 순서로 하면 DB에 `blob_pathname`을 채울 수 없어(키는 `put` 성공 후 확정) 행을 두 번 쓰거나 미리 키를 만들어 두어야 하고, 그 경우 "행은 있는데 객체는 없는" 상태가 생긴다. 감사 기록이 실재하지 않는 파일을 가리키는 쪽이 더 나쁘다.
  - **잔여 위험(감수)**: `put` 성공 후 `INSERT`가 실패하면 Blob에 객체가 남고 감사 기록에는 아무 행도 없는 **고아 객체**가 생긴다. 보상 삭제(`del`)를 넣지 않는 이유는 그 삭제도 실패할 수 있어 문제를 한 단계 미룰 뿐이고, 데모 규모에서 고아 객체의 실제 비용이 Blob 사용량 몇 KB에 그치기 때문이다. 대신 이 경우 **구조화 로그에 `orphan_blob` 이벤트와 키를 남겨** 사람이 추적할 수 있게 한다. 정리 작업(주기적 대조·삭제)은 운영 규모에서 필요해지는 시점의 확장 지점으로만 기록한다.

---

## 8. 결정 7 — 테스트 전략 (TDD)

**단위 테스트가 주 커버리지 표면이다.** 검증 로직을 부수효과 없는 순수 함수로 뽑아내는 것이 이 설계의 핵심이며, 그래야 흥미로운 경계 사례를 표 기반으로 촘촘히 덮을 수 있다.

- 대상 순수 함수: `normalizeExtensionInput()`, `extractExtensionSegments()`, `canonicalizeExtension()`(별칭 정규화), `sniffSignature()`, `decideUpload({ segments, blockedSet, detected, sizeBytes })`.
- 파일명·입력 케이스: `file.exe.txt`, `report.PDF`, `archive.tar.gz`, `.env`, `README`(확장자 없음), 300자 파일명, `ｅｘｅ`(전각), `ехе`(키릴 호모글리프), `exe.`(후행 점), `..\\..\\etc\\passwd`, 빈 파일명, `.`만 있는 이름.
- 별칭 케이스(§3.3): `photo.jpeg` + JPEG 시그니처 → **통과**(오거부 회귀 방지), `scan.tiff` + TIFF, `page.htm` ↔ `html`, 커스텀에 `jpeg` 추가 시 `jpg`로 저장되고 `.jpg` 업로드가 차단되는지.
- 시그니처 케이스(§3.2 정책 + §3.3 합성 확장자): PE 헤더를 가진 `photo.jpg` → `exe` 체크 시 `SIGNATURE_BLOCKED` / `exe` 미체크 시 통과, `#!/bin/sh`로 시작하는 `notes.txt` → `sh` 커스텀 차단 시 거부, 평범한 `<!DOCTYPE html>` 내용의 `page.html` → `html` 미차단이면 **통과**, PNG 내용의 `notes.txt` → 통과하되 `mismatch: true` 기록.
- 도구: Vitest 4.x (`environment: 'node'`) — 순수 함수·리포지토리·엔드포인트 테스트용 기본 프로젝트.

**컴포넌트 테스트 — jsdom + Testing Library 채택, 브라우저 모드 기각.**

AC-016a(낙관적 갱신 → 500 실패 → 롤백)는 렌더링된 컴포넌트의 **과도 상태**를 관찰해야 하므로 node 환경에서 실행할 수 없다. Vitest의 두 번째 프로젝트를 `environment: 'jsdom'`으로 두고 `@testing-library/svelte`로 `FixedExtensionList.svelte`를 렌더링해 검증한다. 대상 파일은 `src/lib/components/FixedExtensionList.test.ts` 하나뿐이다.

- `@testing-library/svelte` 5.4.2 — peerDependencies가 `svelte: ^3 || ^4 || ^5`라 Svelte 5 runes 컴포넌트를 지원한다(npm registry 조회, 2026-08-29).
- `jsdom` 30.0.1 — 브라우저 바이너리 없이 DOM만 제공한다.
- 기각: `vitest-browser-svelte` 3.0.0. 최신 SvelteKit 스캐폴드의 기본값이지만 실제 브라우저를 Playwright provider로 띄운다 — 아래 "Playwright 보류" 결정과 정면으로 충돌하고, 이 한 개의 테스트를 위해 브라우저 바이너리 다운로드를 CI에 들이는 비용이 과하다.

**이것은 E2E가 아니다.** 단일 컴포넌트를 fetch를 스텁한 채 렌더링하는 단위 수준 DOM 테스트이며, 서버·DB·브라우저를 띄우지 않는다. `spec.md` §5.5의 브라우저 자동화 E2E 배제는 그대로 유효하다.

**통합 테스트 — PGlite 채택, Neon 브랜치 기각.**

`@electric-sql/pglite`(WASM PostgreSQL)를 인프로세스로 띄우고 `migrations/001_init.sql`을 그대로 적용해 엔드포인트를 검증한다. 근거: 네트워크·크리덴셜 없이 결정적이고 빠르며, 우리 SQL이 Neon 고유 기능을 전혀 쓰지 않는 평범한 PostgreSQL이라 충실도가 충분하다. 테스트 실행마다 Neon 브랜치를 만드는 대안은 API 토큰 배선과 정리 로직을 요구해 과제 규모에 과하다. 잔여 위험(PGlite와 서버 PostgreSQL의 미세한 동작 차이)은 스키마가 코어 기능만 쓰므로 낮게 본다.

**Playwright 스모크 — 보류(변경 없음).** 해피 패스 1개는 가치가 있으나 배포 URL의 수동 데모가 같은 확신을 주고 CI 배선 비용이 과제 규모에 비해 크다. 위의 jsdom 컴포넌트 테스트는 이 결정을 뒤집지 않는다 — 브라우저를 띄우지 않기 때문이다. 품질 게이트는 `pnpm check`(svelte-check) 0 error + `pnpm lint` 0 error + 단위 커버리지 85%로 정의한다.

---

## 9. 고려사항 매트릭스 (`CONSIDERATIONS.md` 뼈대)

| # | 항목 | 판단 | 근거 요약 |
|---|---|---|---|
| 3-1-a | 확장자만 믿어도 되는가 / 매직 넘버 | implement | `file-type` + prefix 스니핑 2중. 탐지 결과는 별칭 정규화(§3.3) 후 **차단 목록 대조로만** 판정 — 단순 불일치는 거부하지 않음(§3.2). 텍스트 실행 파일은 원리적으로 판별 불가(§3.1) |
| 3-1-b | 대소문자 / 이중 확장자 / `.tar.gz` | implement | 소문자화 + 전 dot-segment 검사 |
| 3-1-c | 확장자 없음 / `.env` / 매우 긴 파일명 | implement | 확장자 없음은 `NO_EXTENSION`(415) 거부 유지, dotfile은 `env` 추출, 255바이트 절단. **대안(화이트리스트 모델)**: 허용 확장자를 열거하는 방식으로 전환하면 "모르는 것은 거부"가 기본값이 되어 확장자 없는 파일도 자연스럽게 걸러지고, `README`·`Dockerfile` 같은 일반 파일을 개별 허용하는 판단으로 바뀐다. 블랙리스트를 유지하는 한 이 결정은 뒤집히지 않는다 |
| 3-1-d | 확장자 입력값 검증·정규화 | implement | NFKC → 점 제거 → 소문자 → `^[a-z0-9]{1,20}$` |
| 3-1-e | 서버 사이드 검증 필요성 | implement | 모든 판정이 서버. 클라이언트 검사는 UX 힌트로 명시 |
| 3-1-f | 크기 제한 및 요청당 파일 수 | implement | 4MB(플랫폼 4.5MB에서 역산) / 요청당 1파일. 다중 선택은 클라이언트가 순차 요청 |
| 3-1-g | 원본 파일명 저장 위험 | implement | UUID 키·확장자 없음, 원본은 메타데이터로만 |
| 3-1-h | MIME 스푸핑 | implement | 선언 MIME은 판정에 미사용, 기록만. 내용-확장자 불일치도 거부가 아닌 `mismatch` 기록으로 관찰(오탐이 차단 UX 신뢰도를 깎는 비용 > 불일치 자체의 위험) |
| 3-2-a | 고정·커스텀 겹침 | implement | `EXT_IS_FIXED`로 거부, `UNIQUE` 제약이 뒷받침 |
| 3-2-b | 정책 변경 이력·감사 | defer | 인증이 없어 "누가"를 채울 수 없음. 구조화 로그로 대체, DDL 초안만 제시 |
| 3-2-c | 200 / 20자 근거와 초과 UX | implement | 과제 명시값. 초과 시 전용 reason code + 카운터 표시 |
| 3-2-d | 대량 조회 성능·인덱스 | implement | `UNIQUE(extension)` 하나만. 207행에서 추가 인덱스는 쓰기 비용만 늘림 |
| 3-3-a | 차단 사유 메시지 | implement | reason code → 사용자 문구 매핑, 걸린 세그먼트 표시 |
| 3-3-b | 로딩 / 에러 / 네트워크 실패 | implement | 버튼 pending 상태, 실패 시 낙관적 갱신 롤백 |
| 3-3-c | 저장 실패 시 화면·DB 일관성 | implement | 서버 반환 정식 상태로 재조정 |
| 3-3-d | 접근성 / 반응형 | partial | 시맨틱 라벨·포커스·키보드 조작까지. 폭넓은 반응형은 보류 |
| 3-4-a | 새로고침 / 동시 편집 정합성 | implement | 서버가 진실, last-write-wins + `UNIQUE` 보호 |
| 3-4-b | 무엇을 로그로 남길 것인가 | implement | 구조화 로그 + `upload_attempt` 영속 기록, 내용은 미기록 |
| 3-4-c | 향후 확장(사용자별 정책, 화이트리스트) | defer | 화이트리스트 전환 시 뒤집힐 판단(§3 단계 6)을 명시 |
| **E1** | 업로드 파일 재제공 시 저장형 XSS | out-of-scope | 재제공 엔드포인트 미구현 + private store로 위험 표면 제거 |
| **E2** | 압축파일 내부 엔트리 / zip-slip / 압축 폭탄 | out-of-scope | 확장자 정책은 컨테이너만 봄. 한계를 명시 |
| **E3** | 무인증 공개 배포의 비용 DoS / rate limiting | defer | 현재는 Blob Hobby 한도가 사실상의 차단기. IP 슬라이딩 윈도우가 개선안 |
| **E4** | 정책 캐시 도입 여부 | implement(=미도입) | 207행 조회는 저렴. 캐시는 정책 변경 반영 지연이라는 보안 위험을 만듦 |
| **E5** | 배포 시 시크릿 취급 | implement | `$env/dynamic/private`만 사용, `PUBLIC_` 규칙으로 번들 유입 차단 |
| **E6** | 파일명 충돌 | implement | UUID 키라 구조적으로 불가 |
| **E7** | 브라우저 `file.type`의 출처 | implement | 확장자에서 유추된 파생값이므로 독립 검증 수단이 아님 |
| **E8** | Blob 저장 성공 후 DB 기록 실패 (고아 객체) | defer(감수) | 순서를 `put` → `INSERT`로 고정하고 실패 시 `orphan_blob` 로그만 남긴다. 보상 삭제는 그 삭제도 실패할 수 있어 문제를 미룰 뿐이고, 데모 규모의 실제 비용이 수 KB에 그침 (§7) |
| **E9** | 최근 업로드 조회 API의 정보 노출 | out-of-scope | 무인증 공개 배포에서 타인의 파일명·MIME을 누구나 열람하게 되므로 엔드포인트 자체를 만들지 않음 (§1.1) |

---

## 10. 요구사항 모듈 (5개, EARS 본문은 Phase 2)

| 모듈 | 한 줄 의도 |
|---|---|
| `policy-store` | 차단 정책을 영속 저장하고 중복·200개·20자 제약을 DB 계층에서 보장한다 |
| `extension-normalization` | 커스텀 확장자 입력을 정규화하고 허용 패턴 위반을 사유 코드로 구분해 거부한다 |
| `upload-validation` | 파일명 파싱 → 정책 대조 → 시그니처 검사로 이어지는 서버 사이드 업로드 판정을 수행한다 |
| `policy-api` | 정책 조회·변경과 업로드 요청의 HTTP 계약 및 `reason_code` 에러 규격을 제공한다 |
| `policy-ui` | 정책 화면에서 현재 상태를 서버 기준으로 표시하고 변경 실패 시 화면과 DB를 다시 일치시킨다 |

---

## 11. 마일스톤

| M | 범위 | 완료 기준 |
|---|---|---|
| **M1** | 스키마 + 순수 검증 코어 | `001_init.sql` 적용 성공, 4개 순수 함수의 표 기반 단위 테스트 통과, 커버리지 ≥ 85% |
| **M2** | 정책 API + 정책 화면 | 고정 토글/커스텀 추가·삭제가 새로고침 후 유지, 6개 reason code 전부 화면에 노출 |
| **M3** | 업로드 엔드포인트 + Blob + 기록 | 차단 파일이 사유와 함께 거부되고 정상 파일이 Blob에 저장되며 두 경우 모두 `upload_attempt`에 1행 |
| **M4** | 배포 + 문서 | 공개 URL 접속 가능, README(실행 방법 + table schema), `CONSIDERATIONS.md` 전 항목 작성 |

의도적으로 M1을 가장 앞에 둔다 — 이후 모든 결정이 여기서 정한 데이터 모델과 판정 규칙에 종속되므로, 바뀔 가능성이 가장 큰 결정을 가장 먼저 확정하고 검증한다.

---

## 12. 위험과 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| 시그니처 검사가 텍스트 실행 파일을 못 잡음 | 보안 오해 | prefix 스니핑 보강 + 한계를 문서에 명시(숨기지 않음) |
| Vercel 4.5MB 본문 한도 | 큰 파일 업로드 불가 | 앱 상한 4MB로 명시, client upload 미채택 사유 문서화 |
| Neon 콜드 스타트 / Blob Hobby 한도 초과(30일 차단) | 면접 당일 데모 지연·실패 | 데모 직전 URL 예열 + 사용량 확인. 사용량은 업로드 크기 상한(4MB)과 요청당 1파일 제약으로 억제하며 Blob Hobby 무료 한도 안에서 운영 |
| 200개 상한의 잔여 경합 | 201개 가능 | 단일 원자 SQL로 축소, advisory lock 대안 명시 |
| PGlite와 서버 PostgreSQL의 동작 차이 | 통합 테스트 신뢰도 | 코어 기능만 사용, 배포 후 수동 스모크로 보완 |

---

## 13. MX 태그 계획 (`mx_plan`)

| 위치 | 태그 | 내용 |
|---|---|---|
| `decideUpload()` | `@MX:ANCHOR` | 업로드 판정의 단일 진입점. 호출부 3곳 이상(엔드포인트·테스트·클라이언트 힌트) |
| `src/lib/constants.ts` | `@MX:NOTE` | `MAX_CUSTOM_EXTENSIONS=200`, `MAX_EXTENSION_LENGTH=20`, `MAX_UPLOAD_BYTES=4MB`의 출처(과제 명시값 / 플랫폼 한도 역산) |
| `sniffSignature()` | `@MX:WARN` | 판별 불가 시 통과시키는 우회 경로. 확장자 정책이 1차 방어선임을 명시 |
| `EXTENSION_ALIASES` | `@MX:ANCHOR` | 별칭 표의 단일 원본. 7·8단계와 정책 저장이 모두 참조 — 복제하면 한쪽만 고쳐져 오탐이 조용히 돌아옴 |
| 커스텀 추가 SQL | `@MX:WARN` | `READ COMMITTED` 잔여 경합. advisory lock이 엄격 모드 |
| 클라이언트 검증 함수 | `@MX:WARN` | UX 힌트 전용. 신뢰 경계 아님 |

---

## 14. 참고 (Reference)

**실제로 확인한 레퍼런스 코드** (`Seung-zedd/lucidify`, `gh api`로 열람) — `svelte.config.js`에서 `adapter({ maxDuration: 60 })` 패턴 확인(업로드 경로에 맞는 duration으로 조정해 채택), `src/routes/api/dream/+server.ts`에서 `RequestHandler` 타입·`json()`/`error()` 임포트·`$env/dynamic/private` 시크릿 접근을 API 라우트 기준 패턴으로 채택, `package.json`에서 Svelte 5 / SvelteKit 2 / Tailwind 4(`@tailwindcss/vite`) 조합의 실동작 확인.

**확인한 외부 문서 (URL 명시)**
- Vercel Function 요청 본문 4.5MB 한도 — https://vercel.com/docs/vercel-blob/server-upload ("Vercel has a 4.5 MB request body size limit on Vercel Functions"), 원 출처 https://vercel.com/docs/functions/runtimes#request-body-size
- Vercel Blob 개요 / private·public 접근 모드 / 캐시 — https://vercel.com/docs/vercel-blob
- Vercel Blob Hobby 한도·속도 제한(Simple 1,200/분, Advanced 900/분)·크기 한도 — https://vercel.com/docs/vercel-blob/usage-and-pricing
- Vercel Functions 런타임 특성(읽기 전용 FS + `/tmp` 500MB, 아카이빙 콜드 스타트) — https://vercel.com/docs/functions/runtimes
- Neon scale to zero (Free 플랜 5분 유휴 후 축소, 설정 변경 불가, 재활성화 수백 ms) — https://neon.com/docs/introduction/scale-to-zero
- `file-type` 반환 확장자 및 텍스트 포맷 미지원 — https://github.com/sindresorhus/file-type/blob/main/readme.md ("This package is for detecting binary-based file formats, not text-based formats like `.txt`, `.csv`, `.svg`, etc."). JPEG→`jpg`, TIFF→`tif`, PE→`exe`, ELF→`elf` 확인. HTML/SVG/YAML/plain text는 미탐지 → §3.3 별칭 표와 §3 8단계 합성 확장자의 근거.

**버전 확인 (npm registry 조회 시점 2026-08-29)** — `@sveltejs/kit` 2.70.3 · `svelte` 5.57.0 · `@sveltejs/adapter-vercel` 6.3.4 · `@neondatabase/serverless` 1.1.0 · `@vercel/blob` 2.8.0 · `file-type` 22.0.2 · `vitest` 4.1.11 · `@electric-sql/pglite` 0.5.8

**미검증 (unverified)** — Vercel Hobby의 Blob 무료 포함량(저장 GB·전송 GB) 구체 수치는 공개 문서가 지역별 표로만 제공해 단일 수치로 확정하지 못했다. 데모 규모에서는 무관하나, 문서에 수치를 적을 때는 대시보드 실측값을 쓴다.
