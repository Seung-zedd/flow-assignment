import { neon } from '@neondatabase/serverless';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// import.meta.url 기준 상대 경로로 migrations/를 찾는다 — Windows에서 __dirname 대신
// URL 기반 경로를 쓰는 이유는 __dirname이 CJS 전용이라 ESM에서는 존재하지 않기 때문이다.
// 끝에 '/'를 반드시 붙인다 — 없으면 `new URL(filename, dirPath)`가 'migrations'를
// 디렉터리가 아닌 마지막 경로 세그먼트(파일명)로 취급해 filename으로 치환해버린다.
const MIGRATIONS_DIR = new URL('../migrations/', import.meta.url);

export interface Migration {
	filename: string;
	sql: string;
}

// scripts/migrate.ts(Neon)와 PGlite 통합 테스트가 같은 목록·본문을 참조하도록 뽑아낸 헬퍼.
export async function loadMigrations(): Promise<Migration[]> {
	const dirPath = MIGRATIONS_DIR;
	const entries = await readdir(dirPath);
	const sqlFiles = entries.filter((name) => name.endsWith('.sql')).sort();

	return Promise.all(
		sqlFiles.map(async (filename) => ({
			filename,
			sql: await readFile(new URL(filename, dirPath), 'utf8')
		}))
	);
}

// Neon HTTP 드라이버는 단일 문장 파라미터화 쿼리를 기본 형태로 삼는다. 마이그레이션
// 파일은 우리가 직접 작성한 정적 DDL이라(문자열 리터럴에 세미콜론이 없다) 세미콜론
// 기준 분리가 안전하다.
function splitStatements(sqlText: string): string[] {
	return sqlText
		.split(';')
		.map((statement) => statement.trim())
		.filter((statement) => statement.length > 0);
}

async function main(): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not set');
	}
	const sql = neon(databaseUrl);

	await sql`
		CREATE TABLE IF NOT EXISTS _migration (
			filename text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`;

	const applied = await sql`SELECT filename FROM _migration`;
	const appliedNames = new Set(applied.map((row) => row.filename as string));

	for (const migration of await loadMigrations()) {
		if (appliedNames.has(migration.filename)) {
			continue;
		}
		for (const statement of splitStatements(migration.sql)) {
			await sql.query(statement);
		}
		await sql`INSERT INTO _migration (filename) VALUES (${migration.filename})`;
		console.log(`applied ${migration.filename}`);
	}
}

const isDirectRun =
	process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
}
