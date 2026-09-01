# SPEC-UPLOAD-001 — Compact Digest

> 자동 생성 요약. 원본: `spec.md` (요구사항) · `acceptance.md` (인수 기준) · `plan.md` (설계 근거).
> Tier M · status draft · v0.2.1 · 16 REQ · 16 AC · founder verdicts Q1–Q17 + run-gate 재감사 결함 반영본

## Requirements (16)

| ID | 모듈 | GEARS 유형 | 요지 |
|---|---|---|---|
| REQ-UPLOAD-001 | policy-store | Ubiquitous | 단일 `blocked_extension` 테이블(`kind`/`is_blocked`), 고정 7개 unCheck 시드, `UNIQUE(extension)` + `^[a-z0-9]{1,20}$` CHECK |
| REQ-UPLOAD-002 | policy-store | Event-driven | 고정 확장자 차단 여부 변경 시 영속 저장, 이후 모든 재조회가 변경된 값 반환 |
| REQ-UPLOAD-003 | policy-store | Event-driven | 커스텀 확장자 삭제 시 정책에서 제거, 이후 재조회·업로드 판정 대상에서 제외 |
| REQ-UPLOAD-004 | policy-store | Unwanted | 커스텀 200개 초과 저장 금지, 카운트+삽입 단일 원자 연산 |
| REQ-UPLOAD-005 | extension-normalization | Ubiquitous | NFKC→trim→선행점 제거→소문자→별칭 대표형; 별칭 표 단일 원본 |
| REQ-UPLOAD-006 | extension-normalization | Event-driven | 커스텀 추가 거부 계약 6종: `EXT_EMPTY`/`EXT_TOO_LONG`/`EXT_INVALID_CHARS`(400) · `EXT_DUPLICATE`/`EXT_IS_FIXED`/`EXT_LIMIT_REACHED`(409) |
| REQ-UPLOAD-007 | upload-validation | Ubiquitous | 파일명 **NFC** 정규화·제어문자/경로구분자 제거·255B 절단 후 첫 세그먼트 제외 **전 dot-segment** 추출, 각 후보를 **정책과 동일한 별칭 표로 대표형 정규화** (입력용 NFKC와 섞지 않음) |
| REQ-UPLOAD-008 | upload-validation | Event-driven | **대표형** 후보 중 차단 항목 존재 시 `details.matched`에 걸린 대표형 담아 `BLOCKED_EXTENSION` + 415 (`jpg` 차단 ⇒ `photo.jpeg`도 거부) |
| REQ-UPLOAD-009 | upload-validation | Event-driven | 파일 내용으로 판별된 확장자가 별칭 정규화 후 차단 목록에 있으면 `SIGNATURE_BLOCKED` + 415 |
| REQ-UPLOAD-010 | upload-validation | Unwanted | 판별≠선언 사실만으로 거부 금지 — `mismatch` 기록만 |
| REQ-UPLOAD-011 | upload-validation | Unwanted | 원본 파일명을 저장 키로 사용 금지, 키에 확장자 미포함(`uploads/{UUID}`); 파일명은 **정규화·절단 후 값만** 메타데이터로 보관 |
| REQ-UPLOAD-012 | upload-validation | Ubiquitous | **요청=파일 1개**. 4MB 두 겹 강제(① `Content-Length` 선차단 413 ② 실측 바이트 재확인 413), 플랫폼 4.5MB는 최후 방어선. 확장자 부재 415 |
| REQ-UPLOAD-013 | upload-validation | State-driven | 빈 차단 목록에서도 크기·확장자부재는 **강제**, 내용 판별은 **실행·기록 전용**(거부로 이어지지 않음) |
| REQ-UPLOAD-014 | upload-validation | Ubiquitous | **파일 단위 판정**마다 `upload_attempt` 1행 + 로그 1줄, 파일 내용 미기록, 파일명 64자 절단. **본문 읽기 전 413(요청 단위 거부)은 행 없음, 로그만** |
| REQ-UPLOAD-015 | policy-api | Ubiquitous | `{ok:false,error:{code,message,details}}` 규격 + 400/409/413/415/500 매핑, 변경 후 정식 상태 반환 |
| REQ-UPLOAD-016 | policy-ui | Optional | JS 가용 시 ① 낙관적 갱신 + 실패 롤백 ② 파일 선택 시 **비차단 클라이언트 힌트**(`CLIENT_HINT_BLOCKED`) ③ `CLIENT_HINT_DISCLAIMER` 고정 문구. 초기 상태 서버 렌더링. 서버가 유일한 강제 지점 |

## Acceptance Criteria (16)

| ID | 요지 | REQ |
|---|---|---|
| AC-UPLOAD-001 | 고정 7개 unCheck 시드 확인 → `exe` 체크 후 새로고침 유지 + DB `is_blocked=true`; uncheck도 왕복 | 001, 002 |
| AC-UPLOAD-002 | `SH` 추가 → `sh`로 정규화 저장(`kind='custom'`, `is_blocked=true`), 카운터 `1/200`, 새로고침 유지 | 001, 005 |
| AC-UPLOAD-003 | 중복 `sh` 추가 → 409 `EXT_DUPLICATE`, 행 수 불변 | 006 |
| AC-UPLOAD-004 | 커스텀에 `exe` → 409 `EXT_IS_FIXED`, 추가 안 됨 | 006 |
| AC-UPLOAD-005a | 21자 입력 → 400 `EXT_TOO_LONG` | 006 |
| AC-UPLOAD-005b | 공백/키릴/점 → 400 `EXT_INVALID_CHARS`; 전각 `ｅｘｅ` → 409 `EXT_IS_FIXED`; 빈 입력 → 400 `EXT_EMPTY` | 005, 006 |
| AC-UPLOAD-006 | 200개 상태에서 추가 → 409 `EXT_LIMIT_REACHED`, count 여전히 200 | 004 |
| AC-UPLOAD-007 | `X` 삭제 → 새로고침 후에도 사라짐 + 같은 `script.sh` 업로드가 이번엔 성공 | 003 |
| AC-UPLOAD-008 | `setup.exe` → 415 `BLOCKED_EXTENSION` + `matched:"exe"`, Blob 미생성 | 008, 015 |
| AC-UPLOAD-009a | `report.exe.txt` → 415 `BLOCKED_EXTENSION` `matched:"exe"` | 007, 008 |
| AC-UPLOAD-009b | `.env` (env 차단 시) → 415 `BLOCKED_EXTENSION` `matched:"env"` | 007, 008 |
| AC-UPLOAD-010 | **빈 차단 목록**에서 `README` → 415 `NO_EXTENSION`; 같은 상태에서 PNG 내용 `notes.txt`는 성공 + `detected_mime` 기록(판별은 실행되나 거부 안 함) | 012, 013 |
| AC-UPLOAD-011 | **빈 차단 목록**에서 `Content-Length` 4MB 초과 → 413 `FILE_TOO_LARGE`, 본문 리더 스파이 미호출, **`upload_attempt` 행 없음**; 헤더 부재·허위 신고는 실측 후 413 + 행 1개 | 012, 013 |
| AC-UPLOAD-012 | PE 내용의 `photo.jpg` → `exe` 체크 시 415 `SIGNATURE_BLOCKED` / 미체크 시 통과 | 009 |
| AC-UPLOAD-013 | JPEG 내용의 `photo.jpeg` → 성공(별칭 오거부 방지); PNG 내용의 `notes.txt` → 성공 + `mismatch:true` | 005, 010 |
| AC-UPLOAD-014 | 평범한 `page.html` → `html` 미차단 시 성공 / 차단 시 415 `SIGNATURE_BLOCKED` | 009 |
| AC-UPLOAD-015 | 차단·정상 각 1건 → `upload_attempt` 정확히 2행, `blob_pathname`에 원본명·확장자 없음 | 011, 014 |
| AC-UPLOAD-016a | 정책 변경 500 실패 → 낙관적 체크가 unCheck로 롤백, 새로고침 후에도 일치 | 016 |
| AC-UPLOAD-016b | JS 비활성 상태에서 서버 렌더링 HTML에 체크 상태 포함 + 신뢰경계 안내 문구 존재 | 016 |

## Files to create / modify

```
migrations/001_init.sql                              신규
scripts/migrate.ts                                   신규
src/lib/constants.ts                                 신규
src/lib/server/db/{client,policy-repo,upload-repo}.ts 신규
src/lib/server/upload/{extension,signature,decide,reason-codes}.ts 신규
src/routes/api/policy/+server.ts                     신규
src/routes/api/policy/fixed/[ext]/+server.ts         신규
src/routes/api/policy/custom/+server.ts              신규
src/routes/api/policy/custom/[ext]/+server.ts        신규
src/routes/api/upload/+server.ts                     신규
src/routes/+page.server.ts                           신규
src/routes/+page.svelte                              신규
src/lib/components/{FixedExtensionList,CustomExtensionInput,UploadArea}.svelte 신규
src/lib/server/upload/*.test.ts                      신규 (Vitest 단위)
src/lib/server/db/policy-repo.test.ts                신규 (PGlite 리포지토리)
src/routes/api/upload/server.test.ts                 신규 (업로드 엔드포인트)
src/routes/api/policy/server.test.ts                 신규 (정책 엔드포인트)
src/lib/components/FixedExtensionList.test.ts        신규 (컴포넌트, jsdom — AC-016a)
svelte.config.js · vite.config.ts · package.json · tsconfig.json 신규 (스캐폴드)
README.md · CONSIDERATIONS.md                        신규
PROMPT_LOG.md                                        기존 — run 단계 읽기 전용, 완결성은 Q11
```

## Exclusions (Out of Scope)

1. **업로드 파일 재제공** — 다운로드·미리보기 엔드포인트 없음, Blob private. 저장형 XSS·피싱 호스팅 표면을 설계로 제거.
2. **인증 및 사용자별 정책 / 변경 이력 테이블** — 인증 없이는 감사의 "누가"를 채울 수 없음. 구조화 로그로 대체.
3. **4.5MB 초과 파일 및 브라우저 직접 업로드** — 서버가 바이트를 못 봐 내용 판별이 불가능, 이 프로젝트의 핵심과 충돌.
4. **압축파일 내부 검사 및 안티바이러스** — 해제·격리 인프라 필요, 한계를 문서로 명시.
5. **E2E 테스트 및 rate limiting** — 배포 URL 수동 데모로 대체, 비용 DoS는 개선안으로 문서화.
6. **최근 업로드 조회 API(`GET /api/uploads/recent`)** — 무인증 공개 배포에서 타인의 파일명·MIME을 누구나 열람하게 되므로 제외 (plan §1.1 / 매트릭스 E9). `upload_attempt` 테이블 자체는 유지.

## Reason codes (10) + 알림 상수 (3)

거부: `EXT_EMPTY`·`EXT_TOO_LONG`·`EXT_INVALID_CHARS`(400) / `EXT_DUPLICATE`·`EXT_IS_FIXED`·`EXT_LIMIT_REACHED`(409) / `FILE_TOO_LARGE`(413) / `BLOCKED_EXTENSION`·`SIGNATURE_BLOCKED`·`NO_EXTENSION`(415).
알림(오류 아님): `ALIAS_FOLDED` · `CLIENT_HINT_BLOCKED` · `CLIENT_HINT_DISCLAIMER`.
확정 문구는 `plan.md` §4.1 문구 상수 표가 단일 원본이며 화면 검증은 `acceptance.md` Q12(수동)가 소유한다. `TOO_MANY_FILES`는 요청당 1파일 확정으로 **제거**됨.
