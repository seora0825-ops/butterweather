# AGENTS.md — Codex 와 다른 에이전트를 위한 입구

**이 저장소의 기준 문서는 [CLAUDE.md](CLAUDE.md) 다. 작업을 시작하기 전에 전부 읽는다.** 이 파일은 그쪽으로 보내는 입구이고, 규칙을 따로 두지 않는다 — 두 곳에 두면 어긋난다.

> 2026-11-23 — Claude 가 리드, Codex 가 작업자로 나눠 일하기로 했다. Claude 가 Orca 로 Codex 를 띄워 작업을 맡기고 결과를 리뷰한다.

## 작업자로 불려 왔을 때

- **맡은 Task 의 범위만 고친다.** 스펙에 없는 파일을 고쳐야 하면 고치지 말고 `ask` 로 코디네이터(Claude)에게 묻는다.
- **결제·인증·DB 는 건드리지 않는다** — `src/lib/payments/`, `src/app/api/payments/`, `src/app/auth/`, `src/lib/supabase/`, `supabase/`. 스펙이 명시적으로 열어준 경우만 예외다. 이 코드의 주석에는 실제로 겪은 사고가 적혀 있다(CLAUDE.md 맨 위).
- **브랜치에 커밋한다.** 커밋 메시지는 CLAUDE.md 5절 형식(gitmoji + Conventional Commits, husky 가 검사). `main` 에 push 하지 않는다.
- **PR 은 만들지 않는다.** 끝나면 `worker_done` 으로 보고한다 — 바꾼 파일, 확인한 것(`npm run lint` · `npx tsc --noEmit` · `npm run build` 결과), 판단한 것과 그 근거. PR 은 Claude 가 리뷰한 뒤 `./pr.sh` 로 만든다.
- **개발 용어는 영문, component 이름은 PascalCase** (CLAUDE.md 5절). 화면 문구는 [docs/design/writing.md](docs/design/writing.md).
- **색·레이아웃 같은 브랜드 판단은 스스로 정하지 않는다.** 스펙에 없으면 가장 조용한 기본값으로 두고 보고에 적는다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
