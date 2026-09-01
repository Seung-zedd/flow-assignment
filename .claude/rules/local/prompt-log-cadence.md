# PROMPT_LOG.md — Update Cadence

`PROMPT_LOG.md` is a first-class deliverable of this project: the record of how AI was actually used to build it. It is worth as much as the code. Binds the orchestrator (main session) only — subagents never write it (`spec.md` §4: run-phase read-only). Acceptance owner: `acceptance.md` gate Q11.

## 1. What the log must contain (source of every rule below)

| Part | Requirement | Where it lives in the file |
|---|---|---|
| Timeline | Prompts in chronological order, with the intent behind each and how a re-ask was phrased when the first answer was poor | `## 1. 타임라인` — one `#### #N` entry per prompt |
| Tools | Every skill / plugin / extension / MCP / agent / library / tool, one line each: where it was used and why | `## 2. 사용한 스킬 …` table |
| Retrospective | Short retrospective: AI output kept / modified / discarded and why; mistakes the AI made that the author caught | `## 3. 판단 근거 회고` |
| Q11 | All three sections present; §1 runs through the last milestone (M4) | whole file |

## 2. Cadence — when an entry is written

- **Same turn, every prompt.** Each user message that changes work (a request, a decision, a correction, a paste-ready resume) gets its `#### #N` entry **in the turn that answers it** — before the turn ends, not "after the milestone". Blocked-quote the prompt verbatim (or a faithful short form), then `의도` / `결과` / what was decided. Trivial acknowledgements ("ok", "고마워") do not get an entry.
- **Re-asks are the point.** When the user re-phrases because the first answer was poor, or corrects the orchestrator, the entry records both the miss and the correction (mark with 🟡, as in `#43`). Never smooth these over — they are the most useful part of the record.
- **AI-driven steps get their own entry** (`#### #N (AI 주도) …`): an agent spawn, an audit gate, a verification batch. Written when the step completes, with the concrete outcome (commit SHAs, test counts, exit codes) — never predicted results.
- **§2 table: on first real use.** Add the row the first time a skill / plugin / MCP / agent / library is actually *used* in this project — not when it is merely installed or activated. An activated-but-unused tool may be listed with an explicit "(활성화만, 미사용)" marker and updated on first use.
- **§3 retrospective: at every milestone close** (M1…M4) and at sync close — append the kept / modified / discarded judgements and any AI mistake the author caught, in the author's own voice. The orchestrator drafts; the user owns the wording.
- **Session close:** the last entry of the session states the resume point (what is done, what is next, what awaits the user). Session boundaries are marked with a `### <date> — 세션 N: …` heading.

## 3. Commit discipline

- Commit `PROMPT_LOG.md` on its own: `docs(PROMPT_LOG): <session/range summary> — #a~#b`. Never mix it into a code or bookkeeping commit.
- Commit at least at every milestone close and at every session close; more often is fine. Stage by explicit path (`git add PROMPT_LOG.md`).
- While a write-capable subagent is running in the same checkout, edit the file freely but **defer the commit** until the agent has finished, so two actors never race on the index.

## 4. Pre-turn-end self-check (orchestrator)

- [ ] Did this turn receive a user prompt that changes work? → Is its `#### #N` entry written?
- [ ] Did an AI-driven step finish this turn? → Is its outcome entry written with real evidence?
- [ ] Was any tool used for the first time? → Is its §2 row present?
- [ ] Did a milestone or session close? → Is §3 updated and the file committed?

When asked "PROMPT_LOG 갱신하고 있지?" the honest answer must be verifiable from the file's last entry number.
