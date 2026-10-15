import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
import Geolocation from '@react-native-community/geolocation';
import Spinner from "react-native-loading-spinner-overlay";
import Icon from "react-native-vector-icons/FontAwesome";
import NetInfo from '@react-native-community/netinfo'
import { View, Text, PermissionsAndroid, ImageBackground, TouchableOpacity, Platform, StatusBar, TouchableWithoutFeedback } from "react-native";

import Singleton from "../../Singleton";
import R from "../../assest/R";
import Logo from "../../Library/Components/Logo"
import CopyRight from "../../Library/Components/Copyright"

// import R from "src/assest/R";
import styles from "./styles";
// import Singleton from "src/Singleton";
import Config from "react-native-config";
import * as Constants from '../../Utils/Constants'
// import Logo from "src/Library/Components/Logo";
// import CopyRight from "src/Library/Components/Copyright";
import AppUpgrateView from "../../Library/Components/AppUpgrateView"
import { getCommunitiesFromServer, getDistanceWithCurrentLocation } from "../../Library/ServerCalls/API";
import BackgroundImage from '../../Library/Components/PageBackgroundImage'
import { setSelectedCommunity } from '../../redux/actions/selectedCommunityAction';
import { setAccessToken } from '../../redux/actions/accessTokenAction';
import { getLatLongForDistanceMeasure, calculateNearestCommunitiesFromUserLocation, locationAlertText } from "./Helper";
import { setLocationAlertStatus } from "../../redux/actions/persistPropertyAction";
import ActionSheet from 'react-native-actionsheet'
import { getTrackingStatus, requestTrackingPermission } from 'react-native-tracking-transparency';
import { StackActions, NavigationActions } from "react-navigation";
import ServerConfig from '../../Library/ServerCalls/ServerConfig'
import { scheduleTourURL } from "../../Utils/Helpers";
import Header from "../../Library/Components/Header";
import LoadingIndicator from "../../Components/LoadingIndicator";

const Welcome = ({ navigation }) => {

  const [isLoading, setisLoading] = useState(true);
  const [location, setLocation] = useState("")
  const [tickStatus, setTickStatus] = useState(false)
  const [updateAppView, setUpdateAppView] = useState(true);
  const [appStoreLink, setAppStoreLink] = useState(false);
  const token = useRef("");
  const distance = useRef(null);
  const communitiesList = useRef([]);
  const communitiesLalLong = useRef("");
  const actionSheet = useRef(null);

  const dispatch = useDispatch();
  const selectedCommunityName = useSelector(state => state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.name);
  const selectedCommunityID = useSelector(state => state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.id);
  const selectedCommunity = useSelector(state => state.selectedCommunityReducer.selectedConnunity);
  const loginStaus = useSelector(state => state.persistReducer && state.persistReducer.userLoginState);
  const loacationAlertStatus = useSelector(state => state.persistReducer && state.persistReducer.loacationAlertStatus);
  const userID = useSelector(state => state.persistReducer && state.persistReducer.userID);

  useEffect(() => {
    if (loacationAlertStatus && Platform.OS === "android") {
      actionSheet.current.show()
      dispatch(setLocationAlertStatus(false))
    } else {

      getUserLocation();
    }

    requestTrackingPermission()
  }, []);

  //Get user location 
  getUserLocation = () => {
    //getLocation = async () => {
    //const hasLocationPermission = await this.hasLocationPermission();
    //this.setState({ isLoading: true }, () => {
    Geolocation.getCurrentPosition(
      position => {
        setLocation(position)
        getCommunities();
      },
      error => {
        setLocation(null)
        getCommunities();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000, distanceFilter: 50 }
    );
    //});
  };
  ///////////////Server Calls////////////////////
  //Get community list from Pynwheel server
  getCommunities = () => {
    getCommunitiesFromServer(userID)
      .then(response => response.json())
      .then(responseJson => {
        // debugger
        if (typeof (responseJson.allow_usage) !== "undefined") {
          setUpdateAppView(responseJson.allow_usage)
          setAppStoreLink(responseJson.redirect_url)
          console.log("redirect_url", responseJson.redirect_url)
        }
        if (responseJson.token !== null) {
          token.current = responseJson.token //Todo
          dispatch(setAccessToken(responseJson.token))
        }
        communitiesList.current = responseJson.communities
        if (location != null) {
          getDistance();
        } else {
          setisLoading(false)
        }
      })
      .catch(error => {
        setisLoading(false)
        setTimeout(() => {
          alert(Constants.SERVER_ERROR_MESSAGE)
        }, 800);
        console.log(error);
      });
  };

  // Get all communities distance form user location 
  getDistance = () => {
    communitiesLalLong.current = getLatLongForDistanceMeasure(communitiesList.current)
    // debugger
    getDistanceWithCurrentLocation(
      location.coords.latitude +
      "," +
      location.coords.longitude,
      communitiesLalLong.current
      // 39.663820 +
      // "," + 
      // -104.965090,
      // this.state.allLatlong
    )
      .then(response => response.json())
      .then(responseJson => {
        // debugger
        distance.current = responseJson;
        calculateNearestCommunities();
      })
      .catch(error => {
        setisLoading(false)
      });
  }
  //Calculate nearest community form user
  function calculateNearestCommunities() {
    const index = calculateNearestCommunitiesFromUserLocation(distance.current)
    setisLoading(false)
    if (index !== -1) {
      if (communitiesList.current.length > 0) {
        dispatch(setSelectedCommunity(communitiesList.current[index]));
        setTickStatus(true)
      }
    }
  };

  const replaceNavigate = (routeName, params) => {
    const resetAction = StackActions.replace({ routeName, params })
    navigation.dispatch(resetAction)
  }
  const resetNavigate = (routeName, params) => {
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({ routeName, params: params })],
    });
    navigation.dispatch(resetAction)
  }
  ////////////Move Forward////////////////////
  function pressLetsGo() {
    const lastScreen = navigation.getParam("lastScreen")
    const communityCode = selectedCommunity?.community_code;
    if (!selectedCommunityID || !communityCode) {
      return alert("Please select community")
    }
    if (lastScreen === "TourHistory" && selectedCommunityName !== null) {
      const url = scheduleTourURL(selectedCommunityID, communityCode)
      replaceNavigate("WebView", { applyUnitURL: url, title: "Schedule Tour" })
      return
    }
    //if (this.state.isNetConnected) {
    if (selectedCommunityName !== null) {
      Singleton.getInstance().setPropertyId(selectedCommunityID)
      // Singleton.getInstance().setToken(token.current)
      if (loginStaus === true) {
        navigation.navigate("Home");
      } else {
        navigation.replace("Login")
      }
    }
    // } else {
    //   alert("Please check internet connection.");
    // }
  };

  return (
    <ImageBackground source={R.images.backgroundImage} style={styles.mainContanier}
      imageStyle={{
        resizeMode: "stretch"
      }}>
      <Header onGoBack={() => resetNavigate("WelcomeTour")} backBtnVisible />
      {/* // <View style= {{flex:1, flexDirection:'column', alignItems:'center'}}>
      //   <BackgroundImage> */}
      <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
      {/* <Spinner visible={isLoading} textStyle={styles.spinnerTextStyle} /> */}
      <LoadingIndicator visible={isLoading} />
      <Logo url={true} />
      <View style={styles.welcomeView}>
        {Config.ENV === 'lincoln' ? null
          : <Text style={styles.pnywheel}>Welcome to</Text>
        }
        {Config.ENV === 'lincoln' ? null : <Text style={styles.welcomeText}>Pynwheel</Text>}
      </View>
      <View style={styles.propertyView}>
        <Text style={styles.propertyLabel}>Please enter the property name to begin your tour.</Text>
      </View>
      <View style={styles.bottomView}>
        <TouchableWithoutFeedback onPress={() => navigation.navigate("Search", { communities: communitiesList.current, name: selectedCommunityName })}
          style={styles.bottomAddress} >
          <View style={styles.bottomAddress}>
            {/* <Text numberOfLines={1} ellipsizeMode={"tail"} style={styles.selectedPropertText}>{selectedCommunityName}</Text> */}
            <Text numberOfLines={1} ellipsizeMode={"tail"} style={styles.selectedPropertText}>{selectedCommunityName}</Text>
            {/* {tickStatus ?
                <Icon name="home" size={20} color="green" style={styles.tickIcon} />
                : null} */}
          </View>
        </TouchableWithoutFeedback>
        <TouchableOpacity onPress={pressLetsGo}>
          <View style={styles.okButton}>
            <Text style={styles.ok}>OK</Text>
          </View>
        </TouchableOpacity>
      </View>
      <CopyRight />
      {/* {!updateAppView ? <AppUpgrateView storeUrl={appStoreLink} /> : null} */}
      {/* </BackgroundImage>
        </View> */}
      <ActionSheet
        // ref={o => this.ActionSheet = o}
        ref={actionSheet}
        title={'Alert'}
        titleTextStyle={{ size: 30, lineHeight: 20 }}
        message={locationAlertText}
        options={['OK']}
        cancelButtonIndex={0}
        onPress={(index) => {
          getUserLocation()
        }}
      />
    </ImageBackground>
  );
}
export default Welcome
