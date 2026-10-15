# Pynwheel

## set flavour
Note: Make sure correct environment selected in .env file i.e selftour/lincoln
## How to run android?
1. `yarn install`
2. `cd android && ./gradlew clean && cd ..`
3. `yarn android:sleftour/lincoln`

## How to run iOS
1. `yarn install`
2. `cd ios && pod install && cd ..`
3. `yarn ios` or run it through xCode by opening it with `cd ios && SelfTour.xcworkspace`

## How to make release android?
1. Make sure correct environment in .env file selftour/lincoln
2. increament build number build.gradle file
3. increament release version number `/src/Library/ServerCalls/API.js`
3. `cd android && ./gradlew clean && cd ..`
4. `yarn android:selftourRelease` or `yarn android:lincolnRelease`

## How to make release iOS?
1. Make sure correct environment in .env file selftour/lincoln
2. increament release version number `/src/Library/ServerCalls/API.js`
3. Make sure correct target selected in ios/Podfile i.e Selftour/Linconl1
4. Increament build number in xCode general tab
4. `yarn install`
5. `pod install`
6. Make build usign xCode with correct target selected i.e Selftour/Lincoln1