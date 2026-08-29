#!/usr/bin/env node
// PreToolUse 가드: .env 계열 비밀 파일(.env, .env.local, .env.production …)에 대한
// Edit/Write/MultiEdit/NotebookEdit 를 강제 차단한다. exit 2 이므로 경고가 아니라
// 실제 거부이며, 권한 모드(bypassPermissions 포함)와 무관하게 동작한다.
// 출처: practice-for-claude-code-architecutre/.claude/hooks/block-env-edit.js
// 이 프로젝트용 수정: .env.example / .env.sample / .env.template 은 README 용
// 공개 템플릿이라 차단 대상에서 제외한다.

import path from "node:path";

const BLOCKED_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const ENV_FILE_PATTERN = /^\.env($|\.)/i;
const PUBLIC_TEMPLATE_PATTERN = /^\.env\.(example|sample|template)$/i;

let raw = "";
process.stdin.on("data", (chunk) => {
  raw += chunk;
});

process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    // 입력이 비었거나 깨졌으면 막을 근거가 없다 — 통과.
    process.exit(0);
  }

  const toolName = input.tool_name;
  if (!BLOCKED_TOOLS.has(toolName)) {
    process.exit(0);
  }

  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || toolInput.notebook_path;
  if (!filePath) {
    process.exit(0);
  }

  const baseName = path.basename(String(filePath));

  if (ENV_FILE_PATTERN.test(baseName) && !PUBLIC_TEMPLATE_PATTERN.test(baseName)) {
    const reason = `Protected file: "${baseName}" matches the .env* secrets-file pattern. ${toolName} on this file is blocked by the block-env-edit hook. Edit it manually outside Claude Code if you really need to change it. (.env.example is allowed.)`;

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      })
    );
    process.stderr.write(reason + "\n");
    process.exit(2);
  }

  process.exit(0);
});
