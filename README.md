# butterweather

이나래의 감각을 파는 브랜드, 버터웨더의 쇼핑몰 🌤️ — https://www.butterweather.com (화면은 짓는 중)

프로젝트 기준 문서는 [CLAUDE.md](CLAUDE.md)를 본다.

> **2026-11-21 에 새로 시작한 저장소다.** 테스트로 만든 [`jerryko570/global-butter-weather`](https://github.com/jerryko570/global-butter-weather)에서 설정·문서·DB 스키마·결제와 주문의 서버 코드를 가져왔고, 화면은 새로 짓는다. 무엇을 가져왔는지는 CLAUDE.md 맨 위.

## 협업 규칙

- `main` 브랜치는 **보호됨** → 직접 push 금지, 반드시 PR로 반영
- 작업은 항상 브랜치를 파서 진행: `feature/작업내용`
- 작업 시작 전 `git pull`로 최신 상태 유지
- PR은 반드시 만들되 **승인 없이 머지**한다 (CLAUDE.md 5절)

## 시작하기 — 새 기기에서

코드·문서·작업 기록은 전부 GitHub 에 있다. **저장소 밖에 있는 것은 `.env.local` 하나뿐이다.**

**1. 도구** — Node 24 · `git` · [`gh`](https://cli.github.com/)

```bash
gh auth login                 # pr.sh 가 gh 로 PR 을 만든다
git clone https://github.com/seora0825-ops/butterweather.git
cd butterweather
npm install                   # husky 훅도 여기서 깔린다
```

- **brew 로 받은 `node@24` 는 깔기만 해서는 `node` 가 안 잡힌다** — 다른 버전과 부딪히지 않게 brew 가 경로에 걸지 않는다. 한 번 걸어 둔다:
  ```bash
  echo 'export PATH="/opt/homebrew/opt/node@24/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
  ```
- **npm 11 은 패키지의 설치 스크립트를 허락 없이 돌리지 않는다.** `npm install` 끝에 `sharp` · `core-js` · `unrs-resolver` 경고가 나와도 `npm run dev` 는 뜬다. 이미지 최적화가 깨지면 `npm install-scripts approve sharp` 뒤 `npm install` 을 다시 한다

**2. `.env.local`** — 키 일곱 개. 목록과 각각 어디서 받는지는 [`.env.example`](.env.example)에 있다.

- **쓰던 기기의 `.env.local` 을 그대로 옮기는 게 가장 빠르다.** USB·비밀번호 관리자처럼 남지 않는 길로 옮긴다. **git·Slack·메일로 보내지 않는다** — `SUPABASE_SECRET_KEY` 는 RLS 를 지나는 키다
- **이름은 정확히 `.env.local`, 자리는 `package.json` 옆이다.** 옮기는 길에 앞의 `.` 이 빠지거나 `.txt` 가 붙기 쉽다(`env.local.txt`) — 그러면 `npm run dev` 의 `Environments:` 줄에 `.env.local` 이 안 뜬다. Finder 는 `.` 으로 시작하는 파일을 숨기므로 `Cmd + Shift + .` 으로 보이게 하고 확인한다

**3. 확인**

```bash
npm run dev                   # http://localhost:3000
npm run lint
```

작업은 브랜치를 파서 `./pr.sh` 로 PR 을 만든다 (CLAUDE.md 5절).
