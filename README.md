# 내 식물 관리 (Plants)

개인용 안드로이드 식물 관리 앱입니다. Expo(React Native) 기반이며, 물 줄 때를 놓치지 않도록 도와줍니다.

## 주요 기능

- 식물 등록 (이름, 종류, 위치, 사진, 물주기 주기, 빛 요구량, 메모)
- 다음 급수까지 남은 일수 기준 자동 정렬, 상태 배지(지남/오늘/곧/건강)
- "물 줬어요" 원터치 기록, 전체/물 필요/오늘 급수 요약 통계
- 사진 촬영/선택 → 기기 내 리사이즈·압축 후 영구 저장
- 기기 로컬 알림 (앱이 꺼져 있어도 예정된 시간에 울림)
- **식물 종류 검색으로 관리법 자동 입력**: [Perenual](https://perenual.com) 식물 데이터베이스에서 종을 검색해 물주기 주기·빛 요구량·난이도·설명을 자동으로 채웁니다. API는 **한 번 검색해서 종을 선택할 때만** 호출되고, 그 결과는 기기에 캐시되어 이후에는 다시 호출하지 않습니다.
- **조도계**: 기기의 조도 센서(안드로이드)로 현재 위치의 밝기(lux)를 측정해 저조도/중조도/밝은 간접광/직사광선으로 분류하고, 식물 추가·수정 화면에서 바로 빛 요구량에 적용할 수 있습니다. 센서가 없는 기기에서는 직접 선택할 수 있습니다.
- **위치별 보기**: 대시보드에서 "전체" 또는 "위치별"로 전환해 식물을 등록된 위치(예: 거실 창가, 베란다)별로 묶어 볼 수 있습니다.
- **날씨 연동**: 기기 위치를 기반으로 현재 날씨(기온·강수)를 가져와 서리·폭염 경고를 보여주고, 비가 오는 날에는 아직 물을 안 준 실외 식물을 한 번에 "물준 것으로 표시"할 수 있도록 제안합니다. 별도 API 키 없이 [Open-Meteo](https://open-meteo.com)를 사용합니다.
- 모든 데이터는 기기 로컬(AsyncStorage/파일 시스템)에 저장됩니다. 별도 서버 없음.

## 시작하기

```bash
npm install
cp .env.example .env   # EXPO_PUBLIC_PERENUAL_API_KEY 값을 채워주세요 (https://perenual.com/api-key, 무료)
npm run android        # 또는 npm run web 으로 빠르게 미리보기
```

`.env`가 없거나 키가 비어 있어도 앱 자체는 정상 동작하며, 종류 검색 기능만 에러 메시지를 보여줍니다.

## APK 빌드하기 (EAS Build)

이 저장소 자체는 아직 빌드된 앱이 아니라 소스 코드입니다. 실제 폰에 설치할 APK를 만들려면 [Expo](https://expo.dev) 계정(무료)이 필요하고, 아래 명령을 **본인 컴퓨터에서** 실행해야 해요 (로그인은 대신 해드릴 수 없어요).

```bash
npm install -g eas-cli   # 또는 매번 npx eas-cli 사용
eas login                # Expo 계정으로 로그인 (없으면 https://expo.dev 에서 무료 가입)
eas build:configure      # 최초 1회, 프로젝트를 Expo 계정에 연결
eas build --platform android --profile preview
```

빌드가 끝나면 터미널과 [expo.dev](https://expo.dev) 대시보드에 APK 다운로드 링크가 나와요. 그 링크를 폰으로 열어 다운로드한 뒤 설치하면 됩니다 (출처를 알 수 없는 앱 설치를 허용해야 할 수 있어요). 빌드는 Expo의 클라우드 서버에서 진행되어 로컬에 Android Studio를 설치할 필요가 없습니다.

이후 코드를 수정하고 다시 배포하려면 같은 `eas build` 명령을 다시 실행하면 됩니다.

## 기술 스택

Expo (React Native) + TypeScript. AsyncStorage로 로컬 저장, expo-notifications로 로컬 알림, expo-image-picker/expo-image-manipulator로 사진 처리.
