# 내 식물 관리 (Plants)

개인용 안드로이드 식물 관리 앱입니다. Expo(React Native) 기반이며, 물 줄 때를 놓치지 않도록 도와줍니다.

## 주요 기능

- 식물 등록 (이름, 종류, 위치, 사진, 물주기 주기, 빛 요구량, 메모)
- 다음 급수까지 남은 일수 기준 자동 정렬, 상태 배지(지남/오늘/곧/건강)
- "물 줬어요" 원터치 기록, 전체/물 필요/오늘 급수 요약 통계
- 사진 촬영/선택 → 기기 내 리사이즈·압축 후 영구 저장
- 기기 로컬 알림 (앱이 꺼져 있어도 예정된 시간에 울림)
- **식물 종류 검색으로 관리법 자동 입력**: [Perenual](https://perenual.com) 식물 데이터베이스에서 종을 검색해 물주기 주기·빛 요구량·난이도·설명을 자동으로 채웁니다. API는 **한 번 검색해서 종을 선택할 때만** 호출되고, 그 결과는 기기에 캐시되어 이후에는 다시 호출하지 않습니다.
- 모든 데이터는 기기 로컬(AsyncStorage/파일 시스템)에 저장됩니다. 별도 서버 없음.

## 시작하기

```bash
npm install
cp .env.example .env   # EXPO_PUBLIC_PERENUAL_API_KEY 값을 채워주세요 (https://perenual.com/api-key, 무료)
npm run android        # 또는 npm run web 으로 빠르게 미리보기
```

`.env`가 없거나 키가 비어 있어도 앱 자체는 정상 동작하며, 종류 검색 기능만 에러 메시지를 보여줍니다.

## 기술 스택

Expo (React Native) + TypeScript. AsyncStorage로 로컬 저장, expo-notifications로 로컬 알림, expo-image-picker/expo-image-manipulator로 사진 처리.
