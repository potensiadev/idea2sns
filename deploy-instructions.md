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

1. Netlify에 GitHub 저장소 연결
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Environment variables에 Supabase 키 설정
4. Custom domain: idea2sns.space 연결
