import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';

import { View, Text, ImageBackground, TouchableOpacity, Image, Alert } from "react-native";
import Spinner from "react-native-loading-spinner-overlay";
import deviceInfo from "react-native-device-info"

import styles from "./styles";
import R from "../../assest/R";
import Singleton from "../../Singleton";
import Logo from "../../Library/Components/Logo"
import ActionSheet from 'react-native-actionsheet'
import { InitializeTourFromServer, getFloorPlansForEditTour, getTourConfigrationsFromServer, getUserDataFromServer } from "../../Library/ServerCalls/API"
import CopyRight from "../../Library/Components/Copyright"
import Geolocation from '@react-native-community/geolocation';
import { setLoginUser } from '../../redux/actions/loginUserAction';
import * as Constants from '../../Utils/Constants'
import { alertForVirtuarTour, userNotInCommunityRadiousAlert } from './Helper'
import Header from '../../Library/Components/Header'
import LoadingIndicator from "../../Components/LoadingIndicator";

const HomeScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [willShowSavedButton, setSaveButtonStatus] = useState(false)
  const [canCustomizeTour, setCanCustomizeTour] = useState(false)
  const actionSheet = useRef(null);
  const tourConfigrations = useRef("")
  let location = useRef({ coords: { latitude: "", longitude: "" } })
  const bedroomFilter = useRef("any");
  const radioValueStr = useRef("price_asc")
  const offset = useRef(1);
  const perPage = useRef(4);

  const dispatch = useDispatch();
  const selectedCommunityName = useSelector(state => state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.name);
  const selectedCommunityLogo = useSelector(state => state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.logo);
  const userID = useSelector(state => state.persistReducer && state.persistReducer.userID);

  useEffect(() => {
    getDeviceId()
    setUserID()
  }, []);

  setUserID = () => {
    Singleton.getInstance().setTourUserId(userID)
    getUserData();
  }

  getDeviceId = () => {
    var id = deviceInfo.getUniqueID();
    Singleton.getInstance().setDeviceId(id)
    return id;
  };

  getUserData = () => {
    setIsInitializing(true)
    // debugger
    getUserDataFromServer()
      .then(response => response.json())
      .then(responseJson => {
        setTimeout(() => {
          setIsLoading(false)
          // debugger
          //if (typeof(responseJson.status) !== 'undefined' && responseJson.status) {
          if (typeof (responseJson.data) !== 'undefined' && responseJson.data) {
            // console.log(responseJson.data.tour_user)
            setSaveButtonStatus(responseJson.data.visited_history)
            setCanCustomizeTour(!!responseJson.data.allow_tours_customization)
            dispatch(setLoginUser(responseJson.data.tour_user))
            Singleton.getInstance().setTourUserData(responseJson.data.tour_user)
          }
          else { showServerError() }
          setIsInitializing(false)
        }, 800);
      })
      .catch((error) => {
        console.log(error)
        showServerError()
        setIsInitializing(false)
      });
  };

  showServerError = () => {
    setIsLoading(false)
    setIsInitializing(false)
    setTimeout(() => {
      alert('Server Error, Please try again.')
    }, 500);
  }

  startTourButtonPressed = () => {
    if (isLoading) return
    setIsLoading(true)
    userLocation()
  }

  userLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        // debugger
        location.current = position
        getTourConfigrations();
      },
      error => {
        console.log({ error })
        getTourConfigrations();
      }
    );
  }

  getTourConfigrations = async (donotCheckStatus) => {
    return new Promise((resolve, reject) => {
      setIsLoading(true)
      // debugger
      getTourConfigrationsFromServer(location.current)
        .then(response => response.json())
        .then(responseJson => {
          setIsLoading(false)
          // debugger
          if (typeof (responseJson.status) !== 'undefined' && responseJson.status === "true") {
            console.log("getTourConfigrations responseJson", responseJson);
            tourConfigrations.current = responseJson.data
            Singleton.getInstance().setVirtualTour(tourConfigrations.current.tour_type)
            Singleton.getInstance().setLocksThreadRef(tourConfigrations.current.locks_thread_ref)
            Singleton.getInstance().setGetCardInfo(tourConfigrations.current.get_user_card_info)
            if (!donotCheckStatus) {
              setTimeout(() => {
                checkTourStatus()
              }, 600);
            }
            Singleton.getInstance().setTourSessionType(tourConfigrations.current.tour_session_type)
          }
          else { showServerError() }
          setIsLoading(false)
          resolve()
        })
        .catch(() => {
          reject()
          showServerError()
          setIsLoading(false)
        });
    })
  };

  checkTourStatus = () => {
    // debugger
    if (tourConfigrations.current.tour_type === "virtual_tour") {
      showAlertForVirtuarTour()
    } else {
      checkUserInCommunityRadious()
    }
  }

  confirmed = () => {
    Singleton.getInstance().setVirtualTour("virtual_tour")
    tourConfigrations.current.visual_id_verification = false
    moveForward()
  }

  showAlertForVirtuarTour = () => {
    if (tourConfigrations.current.scheduler_widget_allowed) {
      Alert.alert(
        'Alert',
        tourConfigrations.current.tour_alert,
        [
          { text: 'Schedule Tour', onPress: () => moveToSchedulerTourWebView() },
          // { text: 'Take a Virtual Tour', onPress: () => confirmed() },
          { text: 'No Thanks', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
        ],
        { cancelable: false }
      )
    } else {
      alertForVirtuarTour(tourConfigrations.current.tour_alert)
    }
  }

  checkUserInCommunityRadious = () => {
    if (location.current.coords.latitude === "") {
      showAlertUnableToDetectLocation()
    } else {
      if (tourConfigrations.current.with_in_radius) {
        moveForward()
      } else {
        userNotInCommunityRadious()
      }
    }
  }

  showAlertUnableToDetectLocation = (message) => {
    setTimeout(() => { showActionSheet() }, 500);
  }

  showActionSheet = () => {
    console.log("actionSheet.current.show()")
    actionSheet.current.show()
  }

  actionSheetButtonPressed = (stop) => {
    if (stop == 0) {
      moveForward()
    }
    // else if (stop === 1) {
    //   confirmed()
    // }
  }

  userNotInCommunityRadious = (message) => {
    userNotInCommunityRadiousAlert()
  }

  moveForward = () => {
    if (tourConfigrations.current.visual_id_verification) {
      switch (tourConfigrations.current.verification_type) {
        case Constants.AUTHENTEQ:
          navigation.navigate("Authenteq", { get_user_card_info: tourConfigrations.current.get_user_card_info, getTourConfigrations: getTourConfigrations })
          break;
        case Constants.CHECK_POINT_ID:
          navigation.navigate("Checkpoint")
          break;
        case Constants.EMAIL:
          navigation.navigate("ScanIdScreen")
          break;
        default:
          Alert.alert("Something went wrong, please try again.");
      }
    } else {
      setIsLoading(true)
      InitializeTourFromServer()
        .then(response => response.json())
        .then(responseJson => {
          if ((typeof (responseJson) !== 'undefined') || responseJson !== null) {
            console.log("responseJson ::: ", responseJson)
            Singleton.getInstance().setBedroomFilter(addAfter(responseJson.unit_bedrooms, 0, { id: 0, title: 'Any', value: 'any', is_selected: true }))
            getFloorPlansForEditTour(perPage.current, offset.current, bedroomFilter.current, radioValueStr.current)
              .then(response => response.json())
              .then(responseJson1 => {
                setIsLoading(false)
                // console.log("responseJson1.floorplans", responseJson1.floorplans);
                // responseJson.allow_tours_customization && responseJson1.floorplans.length > 0 ? navigation.navigate("FloorPlatList1") : navigation.navigate("TourReview")
                //navigation.navigate(responseJson.allow_tours_customization ? responseJson.skip_tour_editing ? 'YourTour' : "CreateTour" : 'NonCustomTour')
                if (responseJson.allow_tours_customization) {
                  if (!responseJson.show_add_units_button) {
                    navigation.navigate('YourTour')
                  } else if (responseJson.skip_tour_editing) {
                    navigation.navigate('YourTour')
                  } else {
                    navigation.navigate('CreateTour')
                  }
                } else {
                  navigation.navigate('NonCustomTour')
                }
              })
              .catch(error => {
                console.log(error);
              });
          }
          else { this.showServerError() }
        })
        .catch(() => { this.showServerError() });
    }
  }

  moveToSchedulerTourWebView = () => {
    navigation.navigate("WebView", { title: '', applyUnitURL: tourConfigrations.current.scheduler_widget_url })
  }

  function addAfter(array, index, newItem) {
    return [
      ...array.slice(0, index),
      newItem,
      ...array.slice(index)
    ];
  }

  Singleton.getInstance().setPropertyName(selectedCommunityName)
  Singleton.getInstance().setPropertyLogo(selectedCommunityLogo)
  return (
    <ImageBackground source={R.images.backgroundImage} style={styles.rootView}
      imageStyle={{
        resizeMode: "stretch"
      }}>
      <Header backBtnVisible={true} navigation={navigation} onGoBack={() => {
        if (navigation.goBack()) {
          navigation.navigate("Welcome")
        } else {
          navigation.replace("Welcome");
        }
      }} />
      {/* <Spinner visible={isLoading || isInitializing} textStyle={{ color: '#FFF' }} /> */}
      <LoadingIndicator visible={isLoading || isInitializing} />
      <Logo url LogoUrl={selectedCommunityLogo} ></Logo>
      <View style={styles.welcomeView}>
        <Text style={styles.welcomeToTextView}>Welcome to </Text>
        {/* <Text style={styles.propertyTextNameView}>{value.name}</Text> */}
        <Text style={styles.propertyTextNameView}>{selectedCommunityName}</Text>
      </View>
      <View style={styles.startTourRoot}>
        {!isInitializing && <TouchableOpacity onPress={startTourButtonPressed} style={styles.startTourButton}>
          <Image style={styles.bottomImages} source={R.images.starTour} />
          {/* <Text style={styles.startTourBtnText}>{canCustomizeTour ? 'CREATE TOUR' : 'START TOUR'}</Text> */}
          <Text style={styles.startTourBtnText}>TOUR</Text>
        </TouchableOpacity>}
        {willShowSavedButton ? (
          <View style={styles.saveResumeTour}>
            <TouchableOpacity onPress={() => navigation.navigate("SavedTour")} style={styles.savedTourButton}>
              <Image style={styles.bottomImages} source={R.images.seeTourIcon} />
              {/* <Text style={styles.savedTourBtnText}>{canCustomizeTour ? 'YOUR SAVED TOUR' : 'SEE SAVED TOUR'}</Text> */}
              <Text style={styles.savedTourBtnText}>COMPLETED TOURS</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      <CopyRight />
      <ActionSheet
        // ref={o => this.ActionSheet = o}
        ref={actionSheet}
        title={'Alert'}
        titleTextStyle={{ size: 20 }}
        message={'Unable to detect location. Please select one of the options below.'}
        options={[
          'I am at the property',
          // 'I am taking a virtual tour.',
          'Cancel']}
        cancelButtonIndex={1}
        onPress={(index) => actionSheetButtonPressed(index)}
      />
    </ImageBackground>
  );
}
export default HomeScreen;