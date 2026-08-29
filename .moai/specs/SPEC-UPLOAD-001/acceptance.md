# SPEC-UPLOAD-001 — 인수 기준 (Acceptance Criteria)

> 각 AC는 Given-When-Then 형태의 **이진 판정 가능한** 시나리오다. GEARS 요구사항 본문은 `spec.md` §3에 있으며 여기서 반복하지 않는다.
> Tier M 상한: AC 16개 이내 (현재 16개). 하위 ID(`005a`/`005b`, `009a`/`009b`, `016a`/`016b`)는 하나의 논리 AC를 이루는 짝이다.

## A. 정책 관리 — 고정 확장자

**AC-UPLOAD-001** → REQ-UPLOAD-001, REQ-UPLOAD-002
- **Given** 고정 확장자 7개(`bat` `cmd` `com` `cpl` `exe` `scr` `js`)가 모두 `is_blocked=false`로 시드되어 있고,
- **When** 사용자가 `exe` 체크박스를 체크한 뒤 브라우저를 새로고침하면,
- **Then** `exe`는 체크 상태로 표시되고 `blocked_extension` 테이블에서 `extension='exe' AND kind='fixed'`인 행의 `is_blocked`가 `true`다.
- **그리고** 다시 uncheck한 뒤 새로고침하면 `is_blocked`가 `false`로 돌아오고 화면도 unCheck로 표시된다.

## B. 정책 관리 — 커스텀 확장자

**AC-UPLOAD-002** → REQ-UPLOAD-001, REQ-UPLOAD-005
- **Given** 커스텀 목록이 비어 있고 카운터가 `0/200`일 때,
- **When** 사용자가 `SH`를 입력하고 "추가"를 클릭한 뒤 새로고침하면,
- **Then** 목록에 `sh` 칩이 표시되고(소문자 정규화 확인) 카운터가 `1/200`이며 DB에 `kind='custom'`, `is_blocked=true`인 행이 1개 존재한다.

**AC-UPLOAD-003** → REQ-UPLOAD-006
- **Given** 커스텀 목록에 `sh`가 이미 있을 때,
- **When** 사용자가 `sh`를 다시 추가하면,
- **Then** HTTP 409 + `{ error: { code: "EXT_DUPLICATE" } }`가 반환되고, DB 행 수는 변하지 않는다. (화면 문구는 `plan.md` §4 문구 상수 표의 `EXT_DUPLICATE` 항목이며 품질 게이트 Q12에서 수동 확인한다)

**AC-UPLOAD-004** → REQ-UPLOAD-006
- **Given** 고정 확장자 `exe`가 시드되어 있을 때,
- **When** 사용자가 커스텀 입력에 `exe`를 넣고 추가하면,
- **Then** HTTP 409 + `EXT_IS_FIXED`가 반환되고, 커스텀 목록에는 아무것도 추가되지 않는다. (문구는 `EXT_IS_FIXED` 상수, Q12에서 확인)

**AC-UPLOAD-005a** → REQ-UPLOAD-006
- **Given** 커스텀 입력창이 비어 있을 때,
- **When** 사용자가 21자짜리 값(`aaaaaaaaaaaaaaaaaaaaa`)을 추가하면,
- **Then** HTTP 400 + `EXT_TOO_LONG`이 반환되고 DB에 삽입이 일어나지 않는다.

**AC-UPLOAD-005b** → REQ-UPLOAD-005, REQ-UPLOAD-006
- **Given** 커스텀 입력창이 비어 있을 때,
- **When** 사용자가 `ex e`(공백) 또는 `ех`(키릴 호모글리프) 또는 `a.b`(점 포함)를 추가하면,
- **Then** 각각 HTTP 400 + `EXT_INVALID_CHARS`가 반환된다.
- **그리고** 전각 `ｅｘｅ`는 NFKC 정규화로 `exe`가 되어 `EXT_INVALID_CHARS`가 아닌 HTTP 409 + `EXT_IS_FIXED`가 반환된다(정규화가 검증보다 먼저 일어남을 확인).

**AC-UPLOAD-006** → REQ-UPLOAD-004
- **Given** 커스텀 확장자가 정확히 200개 저장되어 있을 때,
- **When** 사용자가 201번째 확장자를 추가하면,
- **Then** HTTP 409 + `EXT_LIMIT_REACHED`가 반환되고 `SELECT count(*) FROM blocked_extension WHERE kind='custom'`은 여전히 200이다.

**AC-UPLOAD-007** → REQ-UPLOAD-003
- **Given** 커스텀 목록에 `sh`가 있고 `sh` 확장자 파일이 업로드에서 차단되는 상태일 때,
- **When** 사용자가 해당 칩의 `X`를 클릭한 뒤 새로고침하면,
- **Then** 칩이 사라지고 카운터가 1 감소하며 DB에서 해당 행이 삭제되어 있다.
- **그리고** 같은 `script.sh` 파일을 다시 업로드하면 이번에는 **성공한다**(삭제가 업로드 판정에도 반영됨을 확인).

## C. 업로드 강제 — 확장자 정책

**AC-UPLOAD-008** → REQ-UPLOAD-008, REQ-UPLOAD-015
- **Given** `exe`가 차단 상태일 때,
- **When** 사용자가 `setup.exe`를 업로드하면,
- **Then** HTTP 415 + `{ error: { code: "BLOCKED_EXTENSION", details: { matched: "exe" } } }`가 반환되고 Blob에 객체가 생성되지 않는다. (걸린 세그먼트를 사용자에게 보여주는 화면 문구는 `BLOCKED_EXTENSION` 상수이며 Q12에서 수동 확인)

**AC-UPLOAD-009a** → REQ-UPLOAD-007, REQ-UPLOAD-008
- **Given** `exe`가 차단 상태일 때,
- **When** 사용자가 `report.exe.txt`를 업로드하면,
- **Then** 마지막 세그먼트가 `txt`임에도 HTTP 415 + `BLOCKED_EXTENSION`(`matched: "exe"`)으로 거부된다.

**AC-UPLOAD-009b** → REQ-UPLOAD-007, REQ-UPLOAD-008
- **Given** 커스텀에 `env`가 추가되어 있을 때,
- **When** 사용자가 `.env`를 업로드하면,
- **Then** HTTP 415 + `BLOCKED_EXTENSION`(`matched: "env"`)으로 거부된다. (점으로 시작하는 파일의 확장자 추출 검증)

**AC-UPLOAD-010** → REQ-UPLOAD-012, REQ-UPLOAD-013
- **Given** 차단 목록에 활성 항목이 **하나도 없는** 상태에서(고정 7개 전부 unCheck, 커스텀 0개),
- **When** 사용자가 확장자가 없는 `README`를 업로드하면,
- **Then** HTTP 415 + `{ error: { code: "NO_EXTENSION" } }`로 거부된다. (차단 목록이 비어도 확장자 부재 검사가 계속 동작함을 확인. 화면 문구는 `NO_EXTENSION` 상수, Q12)
- **그리고** 같은 빈 목록 상태에서 PNG 내용의 `notes.txt`를 올리면 **성공하되** `upload_attempt.detected_mime`이 `image/png`로 기록되고 `mismatch: true`가 실린다 — 빈 정책에서 내용 판별은 실행·기록되지만 거부로는 이어지지 않는다(REQ-UPLOAD-013 읽기 A).

**AC-UPLOAD-011** → REQ-UPLOAD-012, REQ-UPLOAD-013
- **Given** 차단 목록에 활성 항목이 **하나도 없는** 상태에서,
- **When** `Content-Length`가 `MAX_UPLOAD_BYTES`(4MB)를 초과하는 요청이 도착하면,
- **Then** HTTP 413 + `FILE_TOO_LARGE`가 반환되고, Blob에 객체가 생성되지 않으며, **`upload_attempt`에 행이 생기지 않는다**(요청 단위 거부는 구조화 로그만 남김 — REQ-UPLOAD-014).
- **그리고** 핸들러 단위 테스트에서 **본문 스트림 리더(`request.formData` 스파이)가 한 번도 호출되지 않았음**이 단언된다(크기 검사가 본문 소비보다 앞선다는 순서 계약).
- **그리고** `Content-Length` 헤더가 없거나 실제보다 작게 신고된 요청에서는 본문을 바이트 상한을 걸어 읽은 뒤 실제 바이트 수가 4MB를 초과하면 같은 413 + `FILE_TOO_LARGE`로 거부된다 — 이 경로에서는 파일명이 확정되므로 `upload_attempt`에 `outcome='rejected'` 1행이 남는다(파일 단위 판정).

## D. 업로드 강제 — 내용 판별 및 오탐 방지

**AC-UPLOAD-012** → REQ-UPLOAD-009
- **Given** `exe`가 차단 상태이고 내용이 `MZ`로 시작하는 PE 실행 파일을 `photo.jpg`로 이름 붙였을 때,
- **When** 이 파일을 업로드하면,
- **Then** 확장자 후보(`jpg`)는 통과했음에도 HTTP 415 + `SIGNATURE_BLOCKED`(`detected: "exe"`)로 거부된다.
- **그리고** 동일 파일을 `exe` 미체크 상태에서 업로드하면 **통과한다**(정책에 없는 타입은 내용이 판별되어도 거부하지 않음).

**AC-UPLOAD-013** → REQ-UPLOAD-005, REQ-UPLOAD-010
- **Given** 차단 목록에 `jpg`도 `jpeg`도 없을 때,
- **When** 사용자가 실제 JPEG 내용을 가진 `photo.jpeg`를 업로드하면,
- **Then** 업로드가 **성공한다**. (내용 판별기가 `jpg`를 반환하지만 별칭 정규화로 `jpeg`와 같은 값이 되어 오거부가 발생하지 않음 — 회귀 방지 케이스)
- **그리고** 실제 PNG 내용을 가진 `notes.txt`를 업로드하면 성공하되 응답에 `mismatch: true`가 실리고 `upload_attempt.detected_mime`이 `image/png`로 기록된다.

**AC-UPLOAD-014** → REQ-UPLOAD-009
- **Given** 차단 목록에 `html`이 없을 때,
- **When** 사용자가 `<!DOCTYPE html>`로 시작하는 평범한 `page.html`을 업로드하면,
- **Then** 업로드가 **성공한다**. prefix 스니핑이 `html`을 합성 확장자로 인식하더라도 그 값이 차단 목록에 없으므로 거부 사유가 되지 않는다.
- **그리고** `html`을 커스텀 차단에 추가한 뒤 같은 파일을 올리면 HTTP 415 + `SIGNATURE_BLOCKED`로 거부된다.

## E. 기록 및 감사

**AC-UPLOAD-015** → REQ-UPLOAD-011, REQ-UPLOAD-014
- **Given** `upload_attempt` 테이블이 비어 있을 때,
- **When** 차단되는 파일 1개와 정상 파일 1개를 각각 업로드하면,
- **Then** `upload_attempt`에 정확히 2행이 생성되고 각각 `outcome='rejected'`(+ `reason_code` 채워짐), `outcome='accepted'`(+ `blob_pathname` 채워짐)이다.
- **그리고** `blob_pathname`은 `uploads/{UUID}` 형태로 **원본 파일명과 확장자를 포함하지 않으며**, 원본 파일명은 `original_name` 컬럼에만 남는다.

## F. 화면 상태 일관성

**AC-UPLOAD-016a** → REQ-UPLOAD-016
- **Given** 고정 확장자 `exe`가 unCheck 상태로 화면에 표시되어 있고 정책 변경 API가 HTTP 500을 반환하도록 강제된 상태에서,
- **When** 사용자가 `exe` 체크박스를 클릭하면,
- **Then** 체크박스가 일시적으로 체크 상태가 되었다가(낙관적 갱신) 응답 실패 후 **unCheck 상태로 되돌아가고**, 오류 안내가 표시되며, 새로고침 후에도 unCheck다(화면 상태와 DB 상태가 일치).

**AC-UPLOAD-016b** → REQ-UPLOAD-016
- **Given** 고정 확장자 `exe`가 체크 상태로 DB에 저장되어 있을 때,
- **When** 페이지를 HTTP `GET`으로 요청하면(브라우저·스크립트 실행 없이 응답 본문만 확인),
- **Then** 응답 HTML에 `exe`가 이미 체크 상태로 포함되어 있다(정책 표시가 클라이언트 스크립트에 의존하지 않음).
- **그리고** 같은 응답 HTML에 `CLIENT_HINT_DISCLAIMER` 상수 문자열(`plan.md` §4)이 그대로 포함되어 있다 — 문자열 일치로 단언하므로 이 절은 이진 판정 가능하다.

---

## 엣지 케이스 (단위 테스트에서 반드시 다룰 것)

`decideUpload` / `extractExtensionSegments` / `normalizeExtensionInput` / `canonicalizeExtension` / `sniffSignature`의 표 기반 케이스:

| 입력 | 기대 |
|---|---|
| `archive.tar.gz` | 후보 `['tar','gz']` — `gz` 차단 시 거부 |
| `report.PDF` | 후보 `['pdf']` (대소문자 무시) |
| 300자 파일명 | 255바이트 절단 후 정상 처리, 예외 없음 |
| `..\..\etc\passwd` | 경로 구분자 제거 후 후보 없음 → `NO_EXTENSION` |
| `exe.`(후행 점) | 정규화 후 `exe` |
| `.`만 있는 파일명 / 빈 파일명 | 예외 없이 `NO_EXTENSION` |
| `#!/bin/sh`로 시작하는 `notes.txt` | `sh` 차단 시 `SIGNATURE_BLOCKED` |
| `scan.tiff` + TIFF 시그니처 | 별칭 `tif`로 접혀 오거부 없음 |
| 커스텀에 `jpeg` 추가 | `jpg`로 저장·표시되고 `.jpg` 업로드가 차단됨. 응답에 `canonical: "jpg"`가 실리고 화면에 `ALIAS_FOLDED` 문구 표시 |
| `jpg`가 차단된 상태에서 `photo.jpeg` 업로드 | `BLOCKED_EXTENSION`, `details.matched = "jpg"` (파일명 후보도 대표형으로 접힘 — REQ-UPLOAD-007) |
| 목록에 `jpg`가 있을 때 입력 `jpeg` | 대표형끼리 비교하므로 `EXT_DUPLICATE`(409) |

---

## 품질 게이트 (Definition of Done)

모든 항목이 통과해야 SPEC이 `implemented`로 전이된다.

| # | 기준 | 검증 명령 / 방법 |
|---|---|---|
| Q1 | AC-UPLOAD-001 ~ 016 전부 통과 | 단위(node) + PGlite 통합 + 엔드포인트 테스트 + 컴포넌트 테스트(jsdom, AC-016a 전용) |
| Q2 | `src/lib/server/**` 단위 커버리지 ≥ 85% (`spec.md` §6과 동일 glob) | `pnpm test -- --coverage` |
| Q3 | 커밋당 커버리지 ≥ 80% | `quality.yaml` `tdd_settings.min_coverage_per_commit` |
| Q4 | 타입 오류 0 | `pnpm check` (svelte-check) |
| Q5 | 린트 오류 0 | `pnpm lint` |
| Q6 | PGlite 통합 · 엔드포인트 · 컴포넌트(jsdom) 테스트 전부 통과 | `pnpm test` (Vitest 두 프로젝트: `node` + `jsdom`) |
| Q7 | 배포 URL `/` 가 HTTP 200 응답 | 배포 후 실제 호출 |
| Q8 | `README.md`에 실행 방법 + table schema(컬럼·타입·제약·인덱스) 포함 | 수동 확인 |
| Q9 | `CONSIDERATIONS.md`가 `plan.md` §9의 28항목(과제 19 + 자체 발굴 E1~E9)을 빠짐없이 다룸 | 항목 수 대조 |
| Q10 | `plan.md` §13이 지정한 **배치 위치 6곳**에 MX 태그(3종: `@MX:ANCHOR` · `@MX:NOTE` · `@MX:WARN`)가 존재 | `/moai mx` 스캔 + `plan.md` §13 표와 1:1 대조 |
| Q11 | `PROMPT_LOG.md`가 세 절을 모두 채운 상태로 존재 — §1 타임라인이 마지막 마일스톤(M4)까지 시계열로 이어지고, §2에 사용한 스킬·에이전트·라이브러리 표가 있으며, §3 회고(채택/수정/폐기 판단)가 작성자 본인 서술로 채워져 있음 | 수동 확인 (세 절의 존재 + §1 마지막 항목이 M4를 가리키는지) |
| Q12 | 차단·거부 사유 문구가 화면에 표시되고 `plan.md` §4 문구 상수 표와 문자열이 일치함 — 사유 코드 10종 + `ALIAS_FOLDED` · `CLIENT_HINT_BLOCKED` · `CLIENT_HINT_DISCLAIMER` | **수동 확인** (배포 URL에서 각 코드를 유발해 화면 문구 대조). API AC(AC-008~015)는 사유 코드·`details`만 단언하므로 화면 문구 검증은 이 게이트가 유일한 소유자다 |

**부분 검증(indirect verification) 항목**: Q7은 배포 환경에, Q11은 작성자 본인의 서술에, Q12는 화면 관찰에 의존하므로 로컬 CI로 대체할 수 없다. Q7은 배포 직후 1회 수동 호출 + 응답 코드 캡처를, Q11은 세 절의 존재 확인을, Q12는 코드별 화면 캡처를 증거로 삼는다.

**미충족 시 처리**: Q1~Q6 중 하나라도 실패하면 run 단계를 종료하지 않는다. Q7~Q12는 sync 단계 게이트다.
