# Netlify + Supabase 배포 가이드

## 1. Supabase Dashboard 접속
https://supabase.com/dashboard/project/puaexonyrdgvalcovidb/functions

## 2. generate-post 함수 생성

Function Name: `generate-post`

코드는 다음 파일을 그대로 복사:
`C:\Users\USER\social-sparkle-08\supabase\functions\generate-post\index.ts`

## 3. publish-post 함수 생성 (이미 있으면 스킵)

Function Name: `publish-post`

코드는 다음 파일을 그대로 복사:
`C:\Users\USER\social-sparkle-08\supabase\functions\publish-post\index.ts`

## 4. 환경 변수 설정

Settings → Edge Functions → Environment Variables

변수 추가:
- Key: `OPENAI_API_KEY`
- Value: (OpenAI 계정에서 발급받은 API Key)

## 5. 테스트

브라우저 새로고침 후:
- 간단 입력 탭 테스트
- 블로그 변환 탭 테스트

## 6. Netlify 프론트엔드 배포

### 6.1 Netlify 사이트 생성

1. https://app.netlify.com/ 로그인
2. "Add new site" → "Import an existing project"
3. GitHub 저장소 선택: `potensiadev/idea2sns`
4. Branch: `main`

### 6.2 Build 설정 (자동 감지됨, netlify.toml 사용)

- Build command: `npm run build`
- Publish directory: `dist`
- Base directory: (비워둠)

### 6.3 Environment Variables 설정

Netlify Dashboard → Site settings → Environment variables:

```
VITE_SUPABASE_URL=https://voalboudivbezmjlzicd.supabase.co
VITE_SUPABASE_ANON_KEY=(Supabase 프로젝트의 anon key)
VITE_APP_ENV=production
```

### 6.4 Custom Domain 설정 (idea2sns.space)

#### Netlify에서:
1. Site settings → Domain management → Add custom domain
2. `idea2sns.space` 입력
3. `www.idea2sns.space` 도 추가 (자동 리다이렉트)

#### Porkbun DNS 설정:

A 레코드:
```
Type: A
Host: @
Answer: 75.2.60.5 (Netlify load balancer IP)
TTL: 600
```

CNAME 레코드:
```
Type: CNAME
Host: www
Answer: idea2sns.netlify.app
TTL: 600
```

⚠️ DNS 전파까지 최대 24-48시간 소요될 수 있음

### 6.5 Supabase Auth 리다이렉트 URL 등록

Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://idea2sns.space
```

**Redirect URLs (모두 추가):**
```
https://idea2sns.space/*
https://www.idea2sns.space/*
https://idea2sns.netlify.app/*
http://localhost:5173/*
http://localhost:8080/*
```

### 6.6 HTTPS 인증서

Netlify가 자동으로 Let's Encrypt SSL 인증서 발급 (약 몇 분 소요)

### 6.7 배포 확인

1. Netlify에서 자동 배포 완료 대기
2. `https://idea2sns.space` 접속 테스트
3. 로그인/회원가입 테스트
4. 콘텐츠 생성 테스트
