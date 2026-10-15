import React from 'react';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import Path from './PathDrow';
import SVGTesting from './PathDrow/SVGTesting';
import Authenteq from './Screens/AuthenteqScreen/index';
import ChatScreens from './Screens/ChatScreens';
import CheckPointScreen from './Screens/CheckPointScreen/index';
import WebViewScreen from './Screens/Common/WebViewScreen';
import HomeScreen from './Screens/HomeScreen';
import LoginScreen from './Screens/LoginScreen';
import MediaPlayer from './Screens/MediaPlayer/MediaPlayer';
import PrivacyPolicyScreen from './Screens/PrivacyPolicyAndUserTerms/index';
import SavedTourScreen from './Screens/SavedTour/SavedTourScreen';
import SavedTourSearchScreen from './Screens/SavedTour/SavedTourSearchScreen';
import UerNoteScreen from './Screens/SavedTour/UerNoteScreen';
import UserGalleryScreen from './Screens/SavedTour/UserGalleryScreen';
import IdVerificationErrorScreen from './Screens/ScanIDSelfiScreens/IdVerificationErrorScreen';
import ScanIdScreen from './Screens/ScanIDSelfiScreens/ScanIdScreen';
import SelfieScreen from './Screens/ScanIDSelfiScreens/SelfieScreen';
import ShareScreen from './Screens/ShareTour/ShareScreen';
import ShareSuccessScreen from './Screens/ShareTour/ShareSuccessScreen';
import TourContainer from './Screens/TourContainerWithOutMap/TourContainer';
import TourStopScree1 from './Screens/TourMapScreen';
import UnitFloorPlan from './Screens/TourMapScreen/UnitFloorPlan';
import TourReviewScreen from './Screens/TourReview';
import ApplyForUnit from './Screens/TourStopDetail/ApplyForUnit';
import CameraPreviewScreen from './Screens/TourStopDetail/CameraPreviewScreen';
import CheckUnitAvailaibilityScreen from './Screens/TourStopDetail/CheckUnitAvailaibility';
import NotesScreen from './Screens/TourStopDetail/NotesScreen';
import ThankPropertyScreen from './Screens/TourStopDetail/ThankPropertyScreen';
import ThanksUnitScreen from './Screens/TourStopDetail/ThanksUnitScreen';
import TourStopScreen from './Screens/TourStopDetail/TourStopScreen';
import UnitPlotScreen from './Screens/TourStopDetail/UnitPlotScreen';
import UnplotedAmenities from './Screens/TourStopDetail/UnplotedAmenities';
import UnlockDoorPin from './Screens/UnlockDoorPin/index';
import Welcome from './Screens/WelcomeScreen';
import SearchScreen from './Screens/WelcomeScreen/SearchScreen';
import Animation from './Screens/Test/anima';
import {
  Animated,
  Easing,
  Image,
  TouchableOpacity
} from 'react-native';
import { View } from 'react-native-animatable';
import R from "../src/assest/R";

const transitionConfig = () => {
  return {
    transitionSpec: {
      duration: 750,
      easing: Easing.out(Easing.poly(4)),
      timing: Animated.timing,
      useNativeDriver: true,
    },
    screenInterpolator: sceneProps => {
      const { position, layout, scene, index } = sceneProps

      const thisSceneIndex = scene.index
      const height = layout.initHeight
      const width = layout.initWidth

      // We can access our navigation params on the scene's 'route' property
      const thisSceneParams = scene.route.params || {}

      const translateX = position.interpolate({
        inputRange: [thisSceneIndex - 1, thisSceneIndex, thisSceneIndex + 1],
        outputRange: [width, 0, 0]
      })

      const translateY = position.interpolate({
        inputRange: [thisSceneIndex - 1, thisSceneIndex, thisSceneIndex + 1],
        outputRange: [height, 0, 0]
      })

      const opacity = position.interpolate({
        inputRange: [thisSceneIndex - 1, thisSceneIndex - 0.5, thisSceneIndex],
        outputRange: [0, 1, 1],
      })

      const scale = position.interpolate({
        inputRange: [thisSceneIndex - 1, thisSceneIndex, thisSceneIndex + 1],
        outputRange: [4, 1, 1]
      })

      const slideFromRight = { transform: [{ translateX }] }
      const scaleWithOpacity = { opacity, transform: [{ scaleX: scale }, { scaleY: scale }] }
      const slideInFromBottom = { transform: [{ translateY }] }

      if (thisSceneParams.plain) return slideFromRight
      else if (index < 5) return slideInFromBottom
      else return scaleWithOpacity
    },
  }
}


const AppNavigator = createStackNavigator({
  Path: {
    screen: Path,
  },
  SVGTesting: {
    screen: SVGTesting,
  },
  test: {
    screen: Animation
  },
  Animation: {
    screen: Animation,
  },
  Welcome: {
    screen: Welcome,
    navigationOptions: () => ({
      headerBackTitle: null,
    })
  },
  Login: {
    screen: LoginScreen,
    navigationOptions: () => ({
      headerBackTitle: null,
    })
  },
  Home: {
    screen: HomeScreen,
    navigationOptions: () => ({
      headerTintColor: 'white',
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}

      />),
    })
  },
  TourStop: {
    screen: TourStopScreen,
    navigationOptions: () => ({
      headerTintColor: 'white',
      headerRight: (<View />),
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  UnplotedAmenities: {
    screen: UnplotedAmenities,
    navigationOptions: () => ({
      headerTintColor: 'white',
      headerRight: (<View />),
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  TourReview: {
    screen: TourReviewScreen,
    navigationOptions: () => ({
      headerTintColor: 'white',
      headerBackTitle: null,
      headerLeft: null,
      headerRight: (<View />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  TourMap: {
    screen: TourStopScree1,
    navigationOptions: () => ({
      headerTintColor: 'white',
      headerLeft: null,
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  TourContainer: {
    screen: TourContainer,
    navigationOptions: () => ({
      headerTintColor: 'white',
      headerLeft: null,
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  UnitFloorPlan: {
    screen: UnitFloorPlan,
    navigationOptions: () => ({
      headerTintColor: 'white',
      headerLeft: null,
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  ThankProperty: {
    screen: ThankPropertyScreen,
    navigationOptions: () => ({
      title: "EXIT",
      headerTintColor: 'white',
      headerBackTitle: null,
      headerRight: (<View />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  UnlockDoorPin: {
    screen: UnlockDoorPin,
    navigationOptions: () => ({
      title: "Pin",
      headerTintColor: 'white',
      headerBackTitle: null,
      headerRight: (<View />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  ApplyForUnit: {
    screen: ApplyForUnit,
    navigationOptions: () => ({
      title: "APPLY",
      headerTintColor: 'white',
      headerBackTitle: null,
      headerRight: (<View />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  SavedTour: {
    screen: SavedTourScreen,
    navigationOptions: ({ navigation }) => ({
      title: "TOUR HIGHLIGHTS",
      headerRight: (<View />),
      headerTintColor: 'white',
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerLeft: (<TouchableOpacity style={{ marginLeft: 10 }} onPress={() => navigation.navigate("Home")}>
        <Image
          source={R.images.backArrow}
          style={{
            width: wp("6%"),
            height: hp("5%"),
            marginTop: hp('.5%'),
            resizeMode: "contain",
          }}

        /></TouchableOpacity>
      ),
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  ThanksUnit: {
    screen: ThanksUnitScreen,
    navigationOptions: () => ({
      title: "EXIT",
      headerRight: (<View />),
      headerTintColor: 'white',
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  Search: {
    screen: SearchScreen,
    transitionConfig,
    navigationOptions: ({ navigation }) => ({
      title: "SEARCH PROPERTY NAME",
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTintColor: 'white',
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  Camera: {
    screen: CameraPreviewScreen,
    navigationOptions: () => ({
      title: "Capture Image",
      headerStyle: {
        backgroundColor: "black"
      },
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTintColor: 'white',
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  CheckPointScreen: {
    screen: CheckPointScreen,
    navigationOptions: () => ({
      title: "Check Point",
      headerStyle: {
        backgroundColor: "black"
      },
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTintColor: 'white',
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  Authenteq: {
    screen: Authenteq,
    navigationOptions: () => ({
      title: "Authenteq",
      headerStyle: {
        backgroundColor: "black"
      },
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTintColor: 'white',
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  MediaPlayer: {
    screen: MediaPlayer,
    navigationOptions: () => ({
      title: "Video",
      headerStyle: {
        backgroundColor: "black"
      },
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTintColor: 'white',
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  Notes: {
    screen: NotesScreen,
    navigationOptions: () => ({
      title: "Add Notes",
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTintColor: 'white',
      headerBackTitle: null,
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  UserGallery: {
    screen: UserGalleryScreen,
    navigationOptions: () => ({
      title: "User Gallery",
      headerRight: (<View />),
      headerTintColor: 'white',
      headerBackTitle: null,
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  UerNote: {
    screen: UerNoteScreen,
    navigationOptions: () => ({
      title: "User Notes",
      headerRight: (<View />),
      headerTintColor: 'white',
      headerBackTitle: null,
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  WebView: {
    screen: WebViewScreen,
    navigationOptions: () => ({
      title: "",
      headerRight: (<View />),
      headerTintColor: 'white',
      headerBackTitle: null,
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  Chat: {
    screen: ChatScreens,
    navigationOptions: () => ({
      title: "Chat",
      headerRight: (<View />),
      headerTintColor: 'white',
      headerBackTitle: null,
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  SavedTourSearch: {
    screen: SavedTourSearchScreen,
    navigationOptions: () => ({
      title: "Saved Tour",
      headerRight: (<View />),
      headerTintColor: 'white',
      headerBackTitle: null,
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  Share: {
    screen: ShareScreen,
    navigationOptions: () => ({
      title: "SHARE",
      headerTintColor: 'white',
      headerBackTitle: null,
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  ShareSuccess: {
    screen: ShareSuccessScreen,
    navigationOptions: () => ({
      title: "SHARE",
      headerTintColor: 'white',
      headerBackTitle: null,
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },

  ScanIdScreen: {
    screen: ScanIdScreen,
    navigationOptions: () => ({
      title: "SCAN YOUR ID",
      headerRight: (<View />),
      headerStyle: {
        backgroundColor: "black"
      },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerTintColor: 'white',
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },

  SelfieScreen: {
    screen: SelfieScreen,
    navigationOptions: () => ({
      title: "TAKE A SELFIE",
      headerBackTitle: null,
      headerStyle: {
        backgroundColor: "black"
      },
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerRight: (<View />),
      headerTintColor: 'white',
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },
  IdVerificationError: {
    screen: IdVerificationErrorScreen,
    navigationOptions: () => ({
      title: "ID VERIFICATION ERROR",
      headerTintColor: 'white',
      headerBackTitle: null,
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },

  CheckUnitAvailaibility: {
    screen: CheckUnitAvailaibilityScreen,
    navigationOptions: () => ({
      title: "CHECK AVAILABILITY",
      headerTintColor: 'white',
      headerBackTitle: null,
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },

  UnitPlot: {
    screen: UnitPlotScreen,
    navigationOptions: () => ({
      headerTintColor: 'white',
      headerBackTitle: null,
      headerRight: (<View />),
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}

      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },

  PrivacyPolicy: {
    screen: PrivacyPolicyScreen,
    navigationOptions: () => ({
      headerTintColor: 'white',
      headerRight: (<View />),
      headerBackTitle: null,
      headerBackImage: (<Image
        source={R.images.backArrow}
        style={{
          width: wp("6%"),
          height: hp("5%"),
          marginTop: hp('.5%'),
          resizeMode: "contain",
        }}
      />),
      headerStyle: { backgroundColor: 'black', borderWidth: 1, borderBottomColor: 'black' },
      headerTitleStyle: {
        color: "white",
        fontSize: 15,
        flex: 1,
        alignSelf: 'center',
        textAlign: "center"
      }
    })
  },

},
  {
    initialRouteName: 'Welcome',
  }
)

export default createAppContainer(AppNavigator);