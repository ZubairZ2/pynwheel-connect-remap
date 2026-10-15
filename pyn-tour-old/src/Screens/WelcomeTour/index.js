import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from 'react-redux';

import { View, ImageBackground, TouchableOpacity, Image, SafeAreaView, Platform, UIManager } from "react-native";
import Spinner from "react-native-loading-spinner-overlay";

import styles from "./styles";
import R from "../../assest/R";
import CopyRight from "../../Library/Components/Copyright"
import Video from 'react-native-video';
import Text from "../../Components/CustomText";
import { NavigationEvents } from "react-navigation";
import { getWelcomeScreenData } from "../../Library/ServerCalls/API";
import TopSlider from "./TopSlider";
import { setFirstAttemptCount, setUserinfo4Slider } from "../../redux/actions/persistPropertyAction";
import { store } from "../../redux/store";
import Singleton from "../../Singleton";
import LoadingIndicator from "../../Components/LoadingIndicator";

const HomeScreen = ({ navigation, route }) => {
  const attemptCount = useSelector(state => state.persistReducer && state.persistReducer.firstAttemptCount);
  // console.log("firstAttemptCount",attemptCount)
  const [isLoading, setIsLoading] = useState(false)
  const [muted, setMuted] = useState(true)
  const [videoPaused, setVideoPaused] = useState(false)
  const [videoContainerHeight, setVideoContainerHeight] = useState(null)
  const userID = useSelector(state => state.persistReducer?.userID);
  const info = useSelector(state => state.persistReducer?.userInfo4TopSlider);
  const [showDropdown, setShowDropdown] = useState(false)
  const [firstAttemp, setFirstAttemp] = useState(false)
  const dispatch = useDispatch()

  const canUseVideo = useMemo(() => {
    try {
      return Platform.OS !== 'android' || (UIManager.getViewManagerConfig && UIManager.getViewManagerConfig('RCTVideo'));
    } catch (e) {
      return false;
    }
  }, [])

  useEffect(() => {
    const userData = navigation.getParam("userData") || undefined
    // if attempCount is 1 that means user come on screen first time then we set FirstAttemp(true)
    attemptCount == 0 && setFirstAttemp(() => true)

    if (userData) {
      dispatch(setUserinfo4Slider(userData))
    }
    getWelcomeScreenData(userID)
      .then(response => response.json())
      .then((res) => {
        if (res.status === true) {
          dispatch(setUserinfo4Slider(res?.data))
        }
      })
      .catch((error) => {
        console.log("error fetching home screen", error)
      })
  }, [])

  const getName = (name) => {
    if (!name) return null
    const str = new String(name)
    if (str.length > 14) {
      return str.substring(0, 11) + "..."
    }
    return name
  }
  return (
    <ImageBackground source={R.images.backgroundImage} style={styles.rootView}
      imageStyle={{
        resizeMode: "stretch"
      }}>
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationEvents onDidFocus={() => { setVideoPaused(false) }} onWillBlur={() => { setVideoPaused(true) }} />
        {/* <Spinner visible={isLoading} textStyle={{ color: '#FFF' }} /> */}
        <LoadingIndicator visible={isLoading} />
        <View style={{ flex: 1, marginBottom: 15 }}>
          <View style={styles.header}>
            <Image style={styles.logo} source={R.images.logoFinal} />
            <Text style={styles.title}>Welcome, {getName(info?.user?.name)}</Text>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                onPress={() => {
                  setShowDropdown(!showDropdown)
                }}
                style={[styles.infoBtn, { marginRight: 15 }]}>
                <Image style={[styles.icon, { tintColor: "#FFF", }]} source={R.images.dots} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate("OnboardingScreen")
                }}
                style={styles.infoBtn}>
                <Image style={styles.icon} source={R.images.info} />
              </TouchableOpacity>
            </View>
          </View>
          <TopSlider
            firstAttemp={firstAttemp}
            modalClose={() => {
              setFirstAttemp(false)
              dispatch(setFirstAttemptCount(attemptCount + 1))
            }}
            editInfo={() => {
              setFirstAttemp(false)
              setShowDropdown(false)
              dispatch(setFirstAttemptCount(attemptCount + 1))
              navigation.navigate('EditProfileInfo')
            }}
            setLoading={setIsLoading}
            userInfo={info?.user}
            upcomingCount={info?.upcoming_tours}
            completedCount={info?.completed_tours}
            navigation={navigation}
            animate={firstAttemp ? firstAttemp : showDropdown} />
          <View style={[styles.videoContainer]}>
            {canUseVideo ? (
              <Video
                paused={videoPaused}
                resizeMode="cover"
                playInBackground={false}
                onLayout={(e) => {
                  if (!videoContainerHeight) {
                    setVideoContainerHeight(e.nativeEvent.layout)
                  }
                }}
                muted={muted}
                style={{ flex: 1 }}
                source={require('../../assest/video/presentation.mp4')}
                repeat
              />
            ) : (
              <Image
                source={R.images.backgroundImage}
                style={{ flex: 1 }}
                resizeMode="cover"
              />
            )}
            {canUseVideo && (
              <View style={[styles.unmuteBtn, muted && { opacity: 1, backgroundColor: "#7cc060" }]}>
                <TouchableOpacity onPress={() => { setMuted(!muted) }}>
                  <Image source={R.images.unmute} style={[styles.unmute]} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={{ marginTop: 15 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: '#FFF', marginTop: 10 }}>Enjoy a property tour that is uniquely you!</Text>
            <Text style={{ color: '#FFF', marginTop: 10, lineHeight: 18 }}>Choose the stops you’d like to see on your own time & pace while adding personalization through in-app user features!</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("TourHistory");
              dispatch(setFirstAttemptCount(attemptCount + 1));
            }}
            style={styles.btn}>
            <Image style={styles.icon} source={R.images.schedule} />
            <Text style={styles.text}>SEE SCHEDULED TOURS</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.scheduleCount}>
              <View>
                <Text style={[styles.text, { fontWeight: "bold", color: "#000" }]}>{info?.upcoming_tours ? info.upcoming_tours : 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("Welcome")
              // dispatch(setFirstAttemptCount(attemptCount + 1))
            }}
            style={styles.btn}>
            <Image style={styles.icon} source={R.images.search} />
            <Text style={styles.text}>START AN UNSCHEDULED TOUR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            // dispatch(setFirstAttemptCount(attemptCount + 1))
            navigation.navigate("ScheduleTour")
          }} style={styles.btn}>
            <Image style={styles.icon} source={R.images.seeTourIcon} />
            <Text style={styles.text}>COMPLETED TOURS</Text>
          </TouchableOpacity>
        </View>
        <CopyRight />
      </SafeAreaView>
    </ImageBackground>
  );
}
export default HomeScreen;