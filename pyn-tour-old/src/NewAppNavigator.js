
import React from 'react';
import { Image, Platform, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { NavigationActions, StackActions, createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import R from "../src/assest/R";
import Path from './PathDrow';
import ChatScreens from './Screens/ChatScreens';
import MediaPlayer from './Screens/MediaPlayer/MediaPlayer';
import PrivacyPolicyScreen from './Screens/PrivacyPolicyAndUserTerms/index';
import IdVerificationErrorScreen from './Screens/ScanIDSelfiScreens/IdVerificationErrorScreen';
import TourContainer from './Screens/TourContainerWithOutMap/TourContainer';
import UnitPlotScreen from './Screens/TourStopDetail/UnitPlotScreen';
import UnplotedAmenities from './Screens/TourStopDetail/UnplotedAmenities';
import UnlockDoorPin from './Screens/UnlockDoorPin/index';
import LoginWithEmail from './Screens/LoginWithEmail';
import LoginWithPhone from './Screens/LoginWithPhone';
import OnboardingScreen from './Screens/Onboarding';
import Welcome from './Screens/WelcomeScreen';
import WelcomeTour from './Screens/WelcomeTour';
import Launch from './Screens/launch';
import Otp from './Screens/otp';
import EditProfileInfo from './Screens/EditProfileInfo';
import ChoseTourAmenitiesScreen from './Screens/EditStopsList/ChoseTourAmin/index';
import ChoseTourStopScreen from './Screens/EditStopsList/ChoseTourStop/index';
import FloorPlatListScreen from './Screens/EditStopsList/FloorPlatList/index';
import FloorPlatListScreen1 from './Screens/EditStopsList/FloorPlatList1/index';
import HomeScreen from './Screens/HomeScreen';
import LoginScreen from './Screens/LoginScreen';
import StartPointLockCode from './Screens/TourMapScreen/StartPointLockCode';
import TourReviewScreen from './Screens/TourReview';
import SearchScreen from './Screens/WelcomeScreen/SearchScreen/SearchBar';
import AddCard from './Screens/AuthenteqScreen/AddCard';
import Authenteq from './Screens/AuthenteqScreen/index';
import CheckPointScreen from './Screens/CheckPointScreen/index';
import SavedTourScreen from './Screens/SavedTour/SavedTourScreen';
import StopDetail from './Screens/SavedTour/StopDetail';
import ScanIdScreen from './Screens/ScanIDSelfiScreens/ScanIdScreen';
import TourStopScree1 from './Screens/TourMapScreen';
import CommunityCode from './Screens/TourMapScreen/CommunityCode';
import UnitFloorPlan from './Screens/TourMapScreen/UnitFloorPlan';
import ThankPropertyScreen from './Screens/TourStopDetail/ThankPropertyScreen'; // seems unused code
import ThanksUnitScreen from './Screens/TourStopDetail/ThanksUnitScreen';
import TourStopScreen from './Screens/TourStopDetail/TourStopScreen';
import WebViewScreen from './Screens/Common/WebViewScreen';
import LatchOTPScreen from "./Screens/LatchScreens/LatchOTPScreen";
import SavedTourSearchScreen from './Screens/SavedTour/SavedTourSearchScreen';
import UerNoteScreen from './Screens/SavedTour/UerNoteScreen';
import UserGalleryScreen from './Screens/SavedTour/UserGalleryScreen';
import SelfieScreen from './Screens/ScanIDSelfiScreens/SelfieScreen';
import ShareScreen from './Screens/ShareTour/ShareScreen';
import ShareSuccessScreen from './Screens/ShareTour/ShareSuccessScreen';
import ApplyForUnit from './Screens/TourStopDetail/ApplyForUnit';
import CameraPreviewScreen from './Screens/TourStopDetail/CameraPreviewScreen';
import CheckFloorPlanAva from './Screens/TourStopDetail/CheckFloorPlanAva';
import CheckUnitAvailaibilityScreen from './Screens/TourStopDetail/CheckUnitAvailaibility';
import NotesScreen from './Screens/TourStopDetail/NotesScreen';
import ZervGetNumberScreen from "./Screens/ZervScreens/ZervGetNumberScreen"; // seems unused code
import ZervOTPScreen from "./Screens/ZervScreens/ZervOTPScreen"; // seems unused code
import ZervSuccessScreen from "./Screens/ZervScreens/ZervSuccessScreen"; // seems unused code
import BackView from './Screens/CheckPointScreen/screens/BackView/BackView';
import FrontView from './Screens/CheckPointScreen/screens/FrontView/FrontView';
import Main from './Screens/CheckPointScreen/screens/Main';
import Response from './Screens/CheckPointScreen/screens/Response';
import Selfie from './Screens/CheckPointScreen/screens/Selfie';
import Checkpoint from './Screens/CheckPointScreen/screens/checkpoint';
import Mapview from './Screens/Mapview';
import ScheduleTour from './Screens/ScheduleTour';
import TourHistory from './Screens/TourHistory';
import LockInfoScreen from './Screens/LockInfoScreen';
import CreateTour from './Screens/TourReview/CreateTour';
import EditTour from './Screens/TourReview/EditTour';
import NonCustomTour from './Screens/TourReview/NonCustomTour';
import YourTour from './Screens/TourReview/YourTour';


const resetAction = StackActions.reset({
  index: 0,
  actions: [NavigationActions.navigate({routeName: 'FrontView'})],
});

const resetBack = StackActions.reset({
  index: 0,
  actions: [NavigationActions.navigate({routeName: 'BackView'})],
});


const AppNavigator = createStackNavigator({

  Launch: {
    screen: Launch,
  },

  OnboardingScreen: {
    screen: OnboardingScreen,
  },
  Welcome: {
    screen: Welcome,
    navigationOptions:{
      headerShown:false
    }
  },
  
  LoginWithEmail: { // this screen discontinued
    screen: LoginWithEmail,
    navigationOptions:{
      headerShown:false
    }
  },
  LoginWithPhone: {
    screen: LoginWithPhone,
    navigationOptions:{
      headerShown:false
    }
  },
  WelcomeTour: {
    screen: WelcomeTour,
    navigationOptions:{
      header:null
    }
  },
  TourHistory: {
    screen: TourHistory,
    navigationOptions:{
      headerShown:false
    }
  },

  Path: {
    screen: Path,
  },

  Login: {
    screen: LoginScreen,
    navigationOptions: () => ({
      headerShown:false,
    })
  },

  EditProfileInfo: {
    screen: EditProfileInfo,
    navigationOptions: () => ({
      headerShown:false,
    })
  },

  Home: {
    screen: HomeScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  Search: {
    screen: SearchScreen,
    navigationOptions: ({navigation} ) => ({
      headerShown:false
    })
  },
  
  CommunityCode: {
    screen: CommunityCode,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  TourReview: {
    screen: TourReviewScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },
  
  CreateTour: {
    screen: CreateTour,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  YourTour: {
    screen: YourTour,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  EditTour: {
    screen: EditTour,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  NonCustomTour: {
    screen: NonCustomTour,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  FloorPlatList: {
    screen: FloorPlatListScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  FloorPlatList1: {
    screen: FloorPlatListScreen1,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  ChoseTourStop: {
    screen: ChoseTourStopScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  ChoseTourAmenities: {
    screen: ChoseTourAmenitiesScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  StartPointLockCode: {
    screen: StartPointLockCode,
    navigationOptions: () => ({
      headerShown:false
    })
  },
  
  ScanIdScreen: {
    screen: ScanIdScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },


  SelfieScreen: {
    screen: SelfieScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },
  


  Authenteq: {
    screen: Authenteq,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  CheckPointScreen: {
    screen: CheckPointScreen,
    navigationOptions: () => ({
      title: "Check Point",
      headerStyle: {
        backgroundColor: "black"
      },
      headerRight:(<View/>),
      headerBackImage:(<Image
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
        color:"white",
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
      gesturesEnabled:false,
      headerShown:false
    })
  },

  LockInfoScreen: {
    screen: LockInfoScreen,
    navigationOptions: () => ({
      gesturesEnabled:false,
      headerShown:false
    })
  },

  UnitFloorPlan: {
    screen: UnitFloorPlan,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  ThanksUnit: {
    screen: ThanksUnitScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  TourStop: {
    screen: TourStopScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  ThankProperty: {
    screen: ThankPropertyScreen,
    navigationOptions: () => ({
      headerShown:false
    
    })
  },

  SavedTour: {
    screen: SavedTourScreen,
    navigationOptions: ({navigation}) => ({
      headerShown:false
    })
  },

  StopDetail: {
    screen: StopDetail,
    navigationOptions: ({navigation}) => ({
      headerShown:false

    })
  },

   Notes: {
    screen: NotesScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  
  CheckUnitAvailaibility: {
    screen: CheckUnitAvailaibilityScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  CheckFloorPlanAva: {
    screen: CheckFloorPlanAva,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  ApplyForUnit: {
    screen: ApplyForUnit,
    navigationOptions: () => ({
      headerShown:false
    })
  },


  WebView: {
    screen: WebViewScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  UerNote: {
    screen: UerNoteScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },


  UserGallery: {
    screen: UserGalleryScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },


  SavedTourSearch: {
    screen: SavedTourSearchScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },


  Camera: {
    screen: CameraPreviewScreen,
    navigationOptions: () => ({
      title: "Capture Image",
      headerShown:false,
      headerStyle: {
        backgroundColor: "black"
      },
      headerRight:(<View/>),
      headerBackImage:(<Image
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
        color:"white",
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
      headerShown:false
    })
  },


  ShareSuccess: {
    screen: ShareSuccessScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },


  TourContainer: {
    screen: TourContainer,
    navigationOptions: () => ({
      headerShown:false
    })
  },


  MediaPlayer: {
    screen: MediaPlayer,
    navigationOptions: () => ({
      headerShown:false
    })
  },


  UnplotedAmenities: {
    screen: UnplotedAmenities,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  IdVerificationError: {
    screen: IdVerificationErrorScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  UnitPlot: {
    screen: UnitPlotScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  Chat: {
    screen: ChatScreens,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  PrivacyPolicy: {
    screen: PrivacyPolicyScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },


  UnlockDoorPin: {
    screen: UnlockDoorPin,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  ZervOTPScreen: {
    screen: ZervOTPScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  ZervGetNumberScreen: {
    screen: ZervGetNumberScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  ZervSuccessScreen: {
    screen: ZervSuccessScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  LatchOTPScreen: {
    screen: LatchOTPScreen,
    navigationOptions: () => ({
      headerShown:false
    })
  },

  Checkpoint: {
    screen: Checkpoint,
    navigationOptions: () => ({
      headerShown:false,
      headerTintColor: 'white',
      headerBackTitle: null,
      headerTitle: 'CHECKPOINT',
      headerLeft: (
        <Image
          source={R.images.backArrow}
          style={{
            width: wp('6%'),
            height: hp('5%'),
            marginTop: hp('.5%'),
            resizeMode: 'contain',
            marginLeft: wp('2%'),
          }}
        />
      ),
      headerRight: <View />,
      headerStyle: {
        backgroundColor: 'black',
        borderWidth: 1,
        borderBottomColor: 'black',
      },
      headerTitleStyle: {
        color: 'white',
        fontSize: 15,
        fontFamily: Platform.OS === 'android' ?  "GothamBold" :  "Gotham-Bold",
        flex: 1,
        alignSelf: 'center',
        textAlign: 'center',
      },
    }),
  },
  FrontView: {
    screen: FrontView,
    navigationOptions:{
      headerShown:false
    }
  },
  BackView: {
    screen: BackView,
    navigationOptions: (props) => ({
      headerShown:false,
      headerTintColor: 'white',
      headerBackTitle: null,
      headerTitle: 'SCAN THE BACK OF YOUR ID',
      headerLeft: (
        <TouchableOpacity
          onPress={() => props.navigation.dispatch(resetAction)}>
          <Image
            source={R.images.backArrow}
            style={{
              width: wp('6%'),
              height: hp('5%'),
              marginTop: hp('.5%'),
              resizeMode: 'contain',
              marginLeft: wp('2%'),
            }}
          />
        </TouchableOpacity>
      ),
      headerRight: <View />,
      headerStyle: {
        backgroundColor: 'black',
        borderWidth: 1,
        borderBottomColor: 'black',
      },
      headerTitleStyle: {
        color: 'white',
        fontSize: 15,
        width:"110%",
        fontFamily: Platform.OS === 'android' ?  "GothamBold" :  "Gotham-Bold",
        alignSelf: 'center',
        textAlign: 'center',
      },
    }),
  },
  Main: {
    screen: Main,
    navigationOptions: (props) => ({
      headerShown:false,
      headerTintColor: 'white',
      headerBackTitle: null,
      headerTitle: 'ID VERIFICATION',
      headerLeft: (
        <TouchableOpacity
          onPress={() => props.navigation.navigate("Checkpoint")}>
          <Image
            source={R.images.backArrow}
            style={{
              width: wp('6%'),
              height: hp('5%'),
              marginTop: hp('.5%'),
              resizeMode: 'contain',
              marginLeft: wp('2%'),
            }}
          />
        </TouchableOpacity>
      ),
      headerRight: <View />,
      headerStyle: {
        backgroundColor: 'black',
        borderWidth: 1,
        borderBottomColor: 'black',
      },
      headerTitleStyle: {
        color: 'white',
        fontSize: 15,
        flex: 1,
        fontFamily: Platform.OS === 'android' ?  "GothamBold" :  "Gotham-Bold",
        alignSelf: 'center',
        textAlign: 'center',
      },
    }),
  },
  Selfie: {
    screen: Selfie,
    navigationOptions: (props) => ({
      headerShown:false,
      headerTintColor: 'white',
      headerBackTitle: null,
      headerTitle: 'TAKE A SELFIE',
      headerLeft: (
        <TouchableOpacity
          onPress={() => {
            if (props.navigation.state.params.document != 'Driving') {
              props.navigation.dispatch(resetAction);
            } else {
              props.navigation.dispatch(resetBack);
            }
          } }>
          <Image
            source={R.images.backArrow}
            style={{
              width: wp('6%'),
              height: hp('5%'),
              marginTop: hp('.5%'),
              resizeMode: 'contain',
              marginLeft: wp('2%'),
            }}
          />
        </TouchableOpacity>
      ),
      headerRight: <View />,
      headerStyle: {
        backgroundColor: 'black',
        borderWidth: 1,
        borderBottomColor: 'black',
      },
      headerTitleStyle: {
        color: 'white',
        fontSize: 15,
        flex: 1,
        fontFamily: Platform.OS === 'android' ?  "GothamBold" :  "Gotham-Bold",
        alignSelf: 'center',
        textAlign: 'center',
      },
    }),
  },
  Response: {
    screen: Response,
    navigationOptions: () => ({
      headerShown: false,
    }),
  },
  AddCard: {
    screen: AddCard,
    navigationOptions: () => ({
      headerShown: false,
    }),
  },
  Mapview: {
    screen: Mapview,
    navigationOptions:{
      headerShown:false
    }
  },
  ScheduleTour: {
    screen: ScheduleTour,
    navigationOptions:{
      headerShown:false
    }
  },
  OtpScreen: {
    screen: Otp,
    navigationOptions:{
      headerShown:false
    }
  }
},
{
  // initialRouteName:"Login",
  headerBackTitleVisible:false,
  cardStyle:{backgroundColor:"black"}
});

export default createAppContainer(AppNavigator);