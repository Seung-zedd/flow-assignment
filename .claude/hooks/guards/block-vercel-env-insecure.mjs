#!/usr/bin/env node
// PreToolUse 가드: Vercel 환경변수(시크릿) 취급에서 유출 경로 세 가지를 Bash 도구에서 차단한다.
// 근거: cubrain skills/AGENTS.md §28 Zero-Trust Secret Management (2026-04 Vercel 보안 사고 대응)
//       + Vercel CLI 공식 문서(vercel env, 2026-08-20 갱신).
//
//   1. `vercel env add|update … --no-sensitive`
//      production/preview 는 기본이 sensitive 이며 --no-sensitive 가 유일한 해제 스위치다.
//      해제하면 값이 대시보드·`vercel env ls`·API 로 다시 읽히므로(계정·토큰 탈취 시 그대로 유출)
//      §28.2 "모든 환경변수는 Sensitive" 규칙과 정면 충돌한다.
//   2. 값이 명령 문자열에 실리는 형태 — `echo VALUE | vercel env add …`, `printf … | vercel env …`,
//      `vercel env add NAME --value VALUE`, `vercel env add NAME ENV BRANCH VALUE`(4번째 위치 인자).
//      Vercel 문서가 직접 경고하듯 셸 히스토리(.bash_history)와 이 대화 로그에 평문이 남는다.
//      허용: 대화형 프롬프트(`vercel env add NAME production`), 파일 리다이렉트(`< secret.txt`).
//   3. `vercel env pull` — 원격 값을 로컬 파일로 내려받는다. AI 세션은 실제 시크릿을 읽지 않는다는
//      §28.1 원칙상 이 명령은 사용자가 직접 터미널에서 실행한다. (dev 타깃은 sensitive 가 불가하므로
//      로컬 개발값은 사용자가 .env 에 손으로 넣는다 — 그 파일은 block-env-edit.mjs 가 보호한다.)
//
// 하위 명령 분할(&& || ; 백틱 $( )과 exit 2 규약은 block-npm-supply-chain-risk.mjs 와 동일하다.
// 텍스트 매칭이므로 인용부호 안의 문자열에도 반응한다(같은 오탐 한계 — 안전한 방향으로 실패).

const SUB_COMMAND_SEPARATOR = /&&|\|\||;|`|\$\(/;
const VERCEL_ENV = /^\s*(sudo\s+)?(npx\s+|pnpm\s+(dlx|exec)\s+)?vercel\s+env\s+(\w+)\b(.*)$/i;

function deny(reason) {
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

function checkPipeIntoVercelEnv(command) {
  // `… | vercel env add …` : 파이프 왼쪽이 값을 만들어 넘기는 형태
  if (/\|\s*(sudo\s+)?(npx\s+|pnpm\s+(dlx|exec)\s+)?vercel\s+env\s+(add|update)\b/i.test(command)) {
    return `Blocked: piping a value into "vercel env add/update" leaves the secret in shell history and in this session log. Run "vercel env add NAME production" yourself and paste the value at the interactive prompt, or use "< file" redirection. (cubrain AGENTS.md §28.1 Blind CLI Updates; hook block-vercel-env-insecure)`;
  }
  return null;
}

function checkVercelEnvPart(part) {
  const m = part.match(VERCEL_ENV);
  if (!m) return null;
  const sub = m[4].toLowerCase();
  const rest = m[5] || "";

  if (sub === "pull") {
    return `Blocked: "vercel env pull" downloads real secrets to a local file. The AI session must not read production secrets (cubrain AGENTS.md §28.1) — run it yourself in your own terminal if you need a local copy. (hook block-vercel-env-insecure)`;
  }
  if (sub !== "add" && sub !== "update") return null;

  if (/--no-sensitive\b/.test(rest)) {
    return `Blocked: "--no-sensitive" makes the variable readable again in the dashboard, "vercel env ls" and the API. Every Vercel environment variable in this project stays Sensitive (cubrain AGENTS.md §28.2). Drop the flag — production/preview are sensitive by default. (hook block-vercel-env-insecure)`;
  }
  if (/--value(\s|=)/.test(rest)) {
    return `Blocked: "--value" puts the secret into the command string (shell history + session log). Use the interactive prompt: "vercel env add NAME production" and type the value when asked. (hook block-vercel-env-insecure)`;
  }
  // 위치 인자는 NAME [ENVIRONMENT] [GIT-BRANCH] 세 개까지. 리다이렉트(<) 앞부분만 센다.
  const beforeRedirect = rest.split("<")[0];
  const positional = beforeRedirect.trim().split(/\s+/).filter((t) => t && !t.startsWith("-"));
  if (positional.length > 3) {
    return `Blocked: "vercel env ${sub}" received ${positional.length} positional arguments — the last one looks like an inline secret value. Only NAME [ENVIRONMENT] [GIT-BRANCH] are allowed; provide the value at the interactive prompt or via "< file". (hook block-vercel-env-insecure)`;
  }
  return null;
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

  const piped = checkPipeIntoVercelEnv(command);
  if (piped) deny(piped);

  for (const part of command.split(SUB_COMMAND_SEPARATOR)) {
    for (const piece of part.split("|")) {
      const reason = checkVercelEnvPart(piece);
      if (reason) deny(reason);
    }
  }

  process.exit(0);
});
