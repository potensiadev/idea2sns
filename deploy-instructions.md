# Edge Function 수동 배포 가이드

## 1. Supabase Dashboard 접속
https://supabase.com/dashboard/project/puaexonyrdgvalcovidb/functions

## 2. generate-posts 함수 생성

Function Name: `generate-posts`

코드는 다음 파일을 그대로 복사:
`C:\Users\USER\social-sparkle-08\supabase\functions\generate-posts\index.ts`

## 3. publish-post 함수 생성 (이미 있으면 스킵)

Function Name: `publish-post`

코드는 다음 파일을 그대로 복사:
`C:\Users\USER\social-sparkle-08\supabase\functions\publish-post\index.ts`

## 4. 환경 변수 설정

Settings → Edge Functions → Environment Variables

변수 추가:
- Key: `LOVABLE_API_KEY`
- Value: [Lovable 프로젝트에서 확인]

Lovable API Key 확인 방법:
1. Lovable.dev 프로젝트 열기
2. Settings → API Keys
3. 또는 프로젝트 소유자에게 문의

## 5. 테스트

브라우저 새로고침 후:
- 간단 입력 탭 테스트
- 블로그 변환 탭 테스트

## 참고: Lovable이 자동 배포를 하지 않는 경우

Lovable은 프론트엔드 코드만 자동 배포하고, Edge Functions는 수동 설정이 필요할 수 있습니다.
