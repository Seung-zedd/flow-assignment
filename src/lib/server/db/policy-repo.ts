import type { Db } from './client';
import { MAX_CUSTOM_EXTENSIONS } from '$lib/constants';
import type { ReasonCode } from '../upload/reason-codes';

export interface FixedPolicyRow {
	extension: string;
	blocked: boolean;
}

export interface CustomPolicyRow {
	extension: string;
}

export interface PolicySlice {
	fixed: FixedPolicyRow[];
	custom: CustomPolicyRow[];
	customCount: number;
}

// 정책 전체 조회 — 고정은 sort_order 오름차순, 커스텀은 알파벳 오름차순(plan.md §5).
export async function getPolicy(db: Db): Promise<PolicySlice> {
	const fixedRows = await db.query<{ extension: string; is_blocked: boolean }>(
		"SELECT extension, is_blocked FROM blocked_extension WHERE kind = 'fixed' ORDER BY sort_order ASC"
	);
	const customRows = await db.query<{ extension: string }>(
		"SELECT extension FROM blocked_extension WHERE kind = 'custom' ORDER BY extension ASC"
	);

	return {
		fixed: fixedRows.map((row) => ({ extension: row.extension, blocked: row.is_blocked })),
		custom: customRows.map((row) => ({ extension: row.extension })),
		customCount: customRows.length
	};
}

// 고정 확장자 토글 — 멱등(같은 값으로 여러 번 호출해도 결과가 같다).
export async function setFixedBlocked(db: Db, extension: string, blocked: boolean): Promise<void> {
	await db.query(
		"UPDATE blocked_extension SET is_blocked = $1, updated_at = now() WHERE extension = $2 AND kind = 'fixed'",
		[blocked, extension]
	);
}

export type AddCustomResult =
	| { ok: true; extension: string }
	| {
			ok: false;
			code: Extract<ReasonCode, 'EXT_LIMIT_REACHED' | 'EXT_DUPLICATE' | 'EXT_IS_FIXED'>;
	  };

// @MX:WARN: [AUTO] READ COMMITTED에서 동시 요청 두 건이 상한 카운트를 함께 읽으면
// 200개를 넘겨 201개가 될 수 있는 잔여 경합이 남는다.
// @MX:REASON: 단일 원자 SQL(CTE 조건부 INSERT)로 경합 폭을 최소화했으나 완전히 닫지는
// 않는다. 엄격 모드가 필요하면 같은 트랜잭션에 pg_advisory_xact_lock을 선행시킨다
// (plan.md §2.3 — 단일 사용자 데모 규모에서는 잔여 경합을 감수·문서화한다).
export async function addCustom(db: Db, extension: string): Promise<AddCustomResult> {
	try {
		const rows = await db.query<{ extension: string }>(
			`INSERT INTO blocked_extension (extension, kind, is_blocked)
			 SELECT $1, 'custom', true
			 WHERE (SELECT count(*) FROM blocked_extension WHERE kind = 'custom') < $2
			 RETURNING extension`,
			[extension, MAX_CUSTOM_EXTENSIONS]
		);
		if (rows.length === 0) {
			return { ok: false, code: 'EXT_LIMIT_REACHED' };
		}
		return { ok: true, extension: rows[0].extension };
	} catch (err) {
		if (!isUniqueViolation(err)) {
			throw err;
		}
		// UNIQUE(extension) 위반 — 이미 저장된 행의 kind로 EXT_DUPLICATE와 EXT_IS_FIXED를
		// 구분한다(plan.md §4 — 제약 하나가 두 가지 UX를 동시에 만든다).
		const kindRows = await db.query<{ kind: string }>(
			'SELECT kind FROM blocked_extension WHERE extension = $1',
			[extension]
		);
		const kind = kindRows[0]?.kind;
		return { ok: false, code: kind === 'fixed' ? 'EXT_IS_FIXED' : 'EXT_DUPLICATE' };
	}
}

// Neon과 PGlite가 UNIQUE 위반을 다르게 신호하므로(SQLSTATE 유무) 둘 다 인식한다.
function isUniqueViolation(err: unknown): boolean {
	if (err && typeof err === 'object') {
		const code = (err as { code?: unknown }).code;
		if (code === '23505') {
			return true;
		}
		const message = (err as { message?: unknown }).message;
		if (typeof message === 'string' && message.includes('duplicate key')) {
			return true;
		}
	}
	return false;
}

// 커스텀 삭제 — 존재하지 않는 확장자를 삭제해도 성공으로 취급한다(멱등, plan.md §5).
export async function deleteCustom(db: Db, extension: string): Promise<void> {
	await db.query("DELETE FROM blocked_extension WHERE extension = $1 AND kind = 'custom'", [
		extension
	]);
}
