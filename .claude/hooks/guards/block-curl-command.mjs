#!/usr/bin/env node
// PreToolUse 가드: curl / wget / nc(netcat) 를 실행하는 Bash 명령을 강제 차단한다.
// 전체 명령이든, && || ; | 백틱 $( ) 로 이어진 하위 명령이든 모두 검사한다
// (각 조각의 앞 공백과 "sudo " 접두는 허용). 셸을 실제로 해석하는 게 아니라
// 구분자 기준으로 텍스트를 쪼개서 "(sudo )?(curl|wget|nc)로 시작하는가"만 본다.
// 경로/파일명/인자 안에 단어가 들어 있는 경우는 막지 않는다. 알려진 한계:
// 따옴표 안의 구분자(echo "a && b")도 쪼개지는 지점이라 드물게 오탐이 날 수 있다
// (우회는 아님). exit 2 라서 실제 거부이며, 권한 시스템보다 먼저 실행되므로
// permissions.deny 와 달리 bypassPermissions / acceptEdits / auto 모드에서도 동작한다.
// 출처: practice-for-claude-code-architecutre/.claude/hooks/block-curl-command.js

const SUB_COMMAND_SEPARATOR = /&&|\|\||;|\||`|\$\(/;
const EXFIL_COMMAND_PATTERN = /^\s*(sudo\s+)?(curl|wget|nc)\b/i;

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
  const hitMatch = subCommands
    .map((part) => part.match(EXFIL_COMMAND_PATTERN))
    .find((match) => match !== null);

  if (hitMatch) {
    const hitCommand = hitMatch[2].toLowerCase();
    const reason = `Blocked: command invokes ${hitCommand}, directly or as a chained sub-command ("${command}"). curl/wget/nc execution is hard-denied by the block-curl-command hook, regardless of permission mode (including bypassPermissions). Use WebFetch instead.`;

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
