#!/usr/bin/env node
// PreToolUse 가드: 패키지 공급망 공격 경로 두 가지를 Bash 도구에서 강제 차단한다.
// permissions.deny 와 독립적으로 동작하므로 bypassPermissions / acceptEdits / auto
// 모드에서도 유효하다.
//
//   1. npm install / npm i / npm ci 에 --ignore-scripts 가 없는 경우.
//      변조된 의존성의 preinstall/install/postinstall 스크립트는 설치 순간 자동
//      실행된다 — 최근 npm 웜/자격증명 탈취 사고의 실제 메커니즘이 바로 이것이다.
//      --ignore-scripts 를 요구해 lifecycle 스크립트 실행을 별도의 의식적 단계로 만든다.
//      ※ pnpm 은 v10 부터 의존성 lifecycle 스크립트를 기본으로 실행하지 않으므로
//        (pnpm.onlyBuiltDependencies 허용 목록 방식) 이 검사는 npm 에만 적용한다.
//        pnpm 에 --ignore-scripts 를 강제하면 프로젝트 자체 prepare(svelte-kit sync)
//        까지 막혀서 오히려 해롭다.
//   2. npx <pkg> / npm exec <pkg> / pnpm dlx <pkg> / pnpm exec <pkg> 에서 <pkg> 가
//      package.json(dependencies/devDependencies) 에도, 아래 내장 허용 목록에도 없는
//      경우. 설치 단계 없이 즉시 실행되므로 "임의 URL을 sh 로 파이프" 하는 것과 같다.
//
// 두 검사 모두 && || ; | 백틱 $( 로 나뉜 각 하위 명령에 대해 수행한다
// (block-curl-command.mjs 와 같은 텍스트 기반 분할, 같은 오탐 한계). exit 2.
//
// 건드리지 않는 것: npm run/test/start/ls/outdated/view 등, --ignore-scripts 가
// 붙은 npm install/ci, 그리고 pnpm install/add 자체. 전역 설치(npm i -g, pnpm add -g,
// npx -y, npm exec -y)는 단순 접두 매칭으로 충분하므로 permissions.deny 에서 막는다.
//
// 동반 수동 도구: 새 패키지를 package.json 에 넣기 전에 `pkg-check <package>`
// (C:\Users\sdok1\projects\core-skills\prevent-supply-chain-attack.md) 로 실제 검증한다.
// 이 훅은 "검증 단계를 거쳤는가(선언돼 있는가)" 와 lifecycle 옵트인만 강제한다.
// 출처: practice-for-claude-code-architecutre/.claude/hooks/block-npm-supply-chain-risk.js
// 이 프로젝트용 수정: pnpm dlx/exec 검사 추가, SvelteKit/Vercel 도구를 허용 목록에 추가.

import fs from "node:fs";
import path from "node:path";

const SUB_COMMAND_SEPARATOR = /&&|\|\||;|\||`|\$\(/;

// package.json 에 선언되기 전에도 실행을 허용하는 CLI 도구.
const BUILTIN_NPX_ALLOWLIST = new Set([
  "eslint",
  "prettier",
  "tsc",
  "typescript",
  "tsx",
  "ts-node",
  "vite",
  "vitest",
  "jest",
  "playwright",
  "stylelint",
  "http-server",
  "serve",
  "rimraf",
  "cross-env",
  "concurrently",
  "nodemon",
  // SvelteKit / 배포 도구 (이 프로젝트 추가분)
  "sv",
  "svelte-kit",
  "svelte-check",
  "vercel",
]);

function projectRoot() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function declaredPackages() {
  const pkgPath = path.join(projectRoot(), "package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return new Set([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ]);
  } catch {
    return new Set();
  }
}

function checkInstallCommand(part) {
  const isNpmInstall = /^\s*(sudo\s+)?npm\s+(install|i|ci)\b/i.test(part);
  if (!isNpmInstall) return null;
  if (/--ignore-scripts\b/.test(part)) return null;
  return `Blocked: npm install/ci without --ignore-scripts runs any dependency's preinstall/install/postinstall lifecycle script automatically ("${part.trim()}"). Add --ignore-scripts, or vet the package first with pkg-check. (This project uses pnpm, which blocks dependency lifecycle scripts by default — prefer \`pnpm add\`.) Hard-denied by the block-npm-supply-chain-risk hook, regardless of permission mode.`;
}

function checkExecCommand(part) {
  const match = part.match(/^\s*(sudo\s+)?(npx|npm\s+exec|pnpm\s+dlx|pnpm\s+exec|pnpx)\b(.*)$/i);
  if (!match) return null;

  const runner = match[2];
  const rest = match[3] || "";
  const tokens = rest.trim().split(/\s+/).filter(Boolean);
  const pkgToken = tokens.find((t) => !t.startsWith("-"));
  if (!pkgToken) return null; // 예: `npx --version`

  // "some-pkg@1.2.3" -> "some-pkg"; "@scope/name@1.2.3" -> "@scope/name"
  const pkgName = pkgToken.startsWith("@")
    ? pkgToken.split("@").slice(0, 2).join("@")
    : pkgToken.split("@")[0];

  if (BUILTIN_NPX_ALLOWLIST.has(pkgName) || declaredPackages().has(pkgName)) {
    return null;
  }

  return `Blocked: ${runner} would run "${pkgName}" immediately with no install step to review first ("${part.trim()}"). Vet it with pkg-check <package>, then either add it to package.json devDependencies or extend BUILTIN_NPX_ALLOWLIST in .claude/hooks/guards/block-npm-supply-chain-risk.mjs. Hard-denied by the block-npm-supply-chain-risk hook, regardless of permission mode.`;
}

let raw = "";
process.stdin.on("data", (chunk) => {
  raw += chunk;
});

process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  if (input.tool_name !== "Bash") {
    process.exit(0);
  }

  const command = String((input.tool_input || {}).command || "");
  const subCommands = command.split(SUB_COMMAND_SEPARATOR);

  for (const part of subCommands) {
    const reason = checkInstallCommand(part) || checkExecCommand(part);
    if (reason) {
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
  }

  process.exit(0);
});
