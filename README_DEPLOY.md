# 퍼스널 리포트 워크스페이스 배포 안내

이 프로젝트는 Vite + React + Supabase + Vercel 기준입니다.

## 1. 설치

```bash
npm install
cp .env.example .env.local
```

`.env.local`에 Supabase Project URL과 anon public key를 넣습니다.

## 2. Supabase DB 반영

Supabase CLI 로그인/링크 후 마이그레이션을 적용합니다.

```bash
npx supabase login
npx supabase link --project-ref 본인_SUPABASE_PROJECT_REF
npx supabase db push
```

또는 Supabase SQL Editor에서 `supabase/migrations/20260708133000_initial_schema.sql` 전체를 붙여넣어 실행해도 됩니다.

## 3. 로컬 실행

```bash
npm run dev
```

## 4. GitHub 업로드

```bash
git init
git add .
git commit -m "init personal report workspace"
git branch -M main
git remote add origin https://github.com/깃허브아이디/personal-report-workspace.git
git push -u origin main
```

## 5. Vercel 배포

```bash
npx vercel login
npx vercel
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel --prod
```

Vercel 대시보드에서 GitHub 레포를 연결해도 됩니다.

## 6. 사용 흐름

관리자 회원가입/로그인 후 트랙 생성, CSV 업로드, 표 편집, 리포트 미리보기, 공개 전환, 수강생 배포 링크 복사 순서로 사용합니다.

수강생은 배포 링크에서 이름과 비밀번호를 입력하면 본인 리포트만 확인합니다.


## 아이디 로그인 버전
이 버전은 Supabase Auth 이메일 회원가입을 사용하지 않고, admin_accounts 테이블의 아이디/비밀번호로 로그인합니다. SQL Editor에서 migrations SQL을 다시 실행해야 합니다.
