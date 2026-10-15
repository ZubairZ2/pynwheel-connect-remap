
import React from 'react';
import { FlatList } from 'react-native-gesture-handler';
import NetInfo from "@react-native-community/netinfo";
import { View, Text, Platform, Image, StatusBar, ImageBackground, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import R from "../../assest/R";
import Singleton from '../../Singleton';
import GoButton from '../../Library/Components/GoButton'
import CopyRight from "../../Library/Components/Copyright"
import ChatButton from '../../Library/Components/ChatButton';
import ActivityTrackerManager from '../../Library/Managers/ActivityTrackerManager';
import { trackTourUserActivity } from '../../Library/Managers/APICalls';
import { Stop } from 'react-native-svg';
import Config from 'react-native-config';
//import { HeaderBackButton } from 'react-navigation';
import HeaderBackButton  from 'react-navigation-stack';
import { abandonedTour } from '../../Library/Managers/APICalls';
import { serverPing } from '../../Library/Managers/APICalls';

import Header from '../../Library/Components/Header'

//import style from '../../ThankPropertyScreen/style';

import { AppConsumer } from '../../Library/Components/MyContext'


export default class TourContainer extends React.Component {

  // static navigationOptions = ({ navigation }) => {
  //   return {
  //     title: typeof (navigation.state.params) === 'undefined' || typeof (navigation.state.params.title) === 'undefined' ? '' : navigation.state.params.title.toUpperCase(),
  //     headerLeft: (<HeaderBackButton tintColor={'white'} onPress={() => {
  //       var timerLocal = (navigation.state.params) === 'undefined' || typeof (navigation.state.params.timer) === 'undefined' ? '' : navigation.state.params.timer
  //       clearInterval(timerLocal);
  //       abandonedTour()
  //         .then(response => response.json())
  //         .then(responseJson => { })
  //         .catch(error => { });
  //       navigation.goBack()
  //     }} />)
  //   }
  // }

  constructor() {
    super();
    this.nextStopIndex = 0
    this.serverUpdateTime = 6000; //60000 one mint
    this.tourStops = []
    this.visitedStops = ""
    this.serverPingTimer=  null
    this.showIDMisMatch = true
    this.serverPingInProgress = false
      this.state = {
        activeTour: null,
        tourStopsData: null,
        isEnd: false,
        index: 0,
        appState: AppState.currentState,
        unReadMessageCount: 0,
        showMoreButton : false
      };
  }

  componentDidMount() {
    const { navigation } = this.props;
    const tourData = navigation.getParam('tourData', '');
    // NetInfo.getConnectionInfo().then(handleConnectivityChange);
    // NetInfo.addEventListener('connectionChange', handleConnectivityChange);
    if (typeof (tourData !== 'undefined')) {
      this.setTourData(tourData);
    }
    this.setTourUserActivityTimer()
    this.showIDMisMatch = true
    AppState.addEventListener('change', this._handleAppStateChange);
    this.focusListener = navigation.addListener('didFocus', () => {
      this.ViewDidFcous()
    });
    this.setState({
      willShowChatButton: Singleton.getInstance().getTourSetting().chat_control
  })
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  setTourData = (tourData) => {
    this.tourData = tourData
    this.tourStops = tourData.tour_stop
    // debugger
    this.setState({
      tourStopsData: tourData.tour_stop,
    });
    this.setState({
     title: this.tourStops[this.nextStopIndex].navigation_title
    })

    //this.ChangeThisTitle(this.tourStops[this.nextStopIndex].navigation_title)
    this.setState({
      showMoreButton : this.tourStops[this.nextStopIndex].show_long_directional_text
    });
    this.selectedStopID = tourData.tour_stop[0].id
    this.visitedStops = this.selectedStopID + "|" + new Date().toString()

    ActivityTrackerManager.getInstance().setAbandonedTourAtStop(this.selectedStopID)
  }

  //will be called on every time when screen will appear   
  ViewDidFcous() {
    if (Singleton.getInstance().getShouldUserMoveToNextStopOnStopList()) {
      this.updateViewForNextStop()
    }
    Singleton.getInstance().setShouldUserMoveToNextStopOnStopList(false)
  }
  /////move to next stop on elevoter and amenity
  updateViewForNextStop = () => {
    // debugger
    this.updateIndex();
    if (this.nextStopIndex === this.tourStops.length) {
      this.setState({ isEnd: true })
      this.leftTourServerCall()
      this.props.navigation.replace("ThankProperty", { tourData: this.tourData, visitedStops: this.visitedStops})
    } 
    else {
      this.updateStopForActivityTreacker()
    }
  }

  /////////////Move to stop detail screen/////////////////
  nextButtonPressed = () => {
    // debugger
    //this.CheckConnectivity();
    //if (isConnected) {
    // }///********* * If Next Stop is Amenity or elevator *******
    if (typeof (this.tourStops[this.nextStopIndex]) !== 'undefined' && this.tourStops[this.nextStopIndex].type !== "unit" && this.tourStops.length > this.nextStopIndex) {

      this.props.navigation.navigate("TourStop", { stopData: this.tourStops[this.nextStopIndex], isFromUnit: false, })
    }////******** * If next stop is unit ********
    if (typeof (this.tourStops[this.nextStopIndex]) !== 'undefined' && this.tourStops[this.nextStopIndex].type === "unit") {
      this.props.navigation.navigate("UnitFloorPlan", { unitData: this.tourStops[this.nextStopIndex] })
    }
  }


  updateIndex = () => {
    this.nextStopIndex = this.nextStopIndex + 1
    this.setState({ index: this.nextStopIndex });
    if (this.tourStops.length > this.nextStopIndex) {
      this.setState({
        title: this.tourStops[this.nextStopIndex].navigation_title
       })
      //this.ChangeThisTitle(this.tourStops[this.nextStopIndex].navigation_title)
      this.setState({
        showMoreButton : this.tourStops[this.nextStopIndex].show_long_directional_text
      });
      this.goIndex() 
    }
  }
  // if (this.nextStop !== 'undefined') {
  //   if (this.nextStop.id !== 'undefined') {
  updateStopForActivityTreacker = () => {
    // debugger
   
    if ( this.tourStops.length > this.nextStopIndex) {
      if (this.tourStops[this.nextStopIndex].id !== 'undefined') {
        this.selectedStopID = this.tourStops[this.nextStopIndex].id
        ActivityTrackerManager.getInstance().setAbandonedTourAtStop(this.selectedStopID)
        this.visitedStops = this.visitedStops + "," + this.selectedStopID + "|" + new Date().toString()

      }
    }
  }

  // ChangeThisTitle = (titleText) => {
  //   const { setParams } = this.props.navigation;
  //   setParams({ title: titleText })
  // }

  goIndex = () => {
    this.flatListRef.scrollToIndex({ animated: true, index: this.nextStopIndex });
  }

  FlatListItemSeparator = () => {
    return (
      <Image source={R.images.separator}
        style={{
          width: wp('70%'),
          height: 1, alignSelf: 'center'
        }} />
    );
  }

  goBackFromFirstStop () {
    clearInterval(this.serverPingTimer);
    abandonedTour()
      .then(response => response.json())
      .then(responseJson => { })
      .catch(error => { });
      
      //this.props.navigation.goBack()
      // if(this.props.navigation.goBack()){
      //   this.props.navigation.goBack()
      // }else{
      //   this.props.navigation.replace("TourReview")
      // }
  }
  //////////////////////Track Tour user Activity////////////////////////
  setTourUserActivityTimer() {
    this.serverPingTimer= setInterval(this.tick, this.serverUpdateTime);
    //const { setParams } = this.props.navigation;
    // setParams({ timer: timer })
    // this.serverPingTimer = timer
    //this.setState({ timer: timer })
  }

  _handleAppStateChange = (nextAppState) => {
    this.setState({ appState: nextAppState });
    if (nextAppState === 'background') {
      // Do something here on app background.
      console.log("App is in Background Mode.")
    }
    if (nextAppState === 'active') {
      // Do something here on app active foreground mode.
      console.log("App is in Active Foreground Mode.")
      //this.setTourUserActivityTimer()

      ActivityTrackerManager.getInstance().setLengthyStayTime()
      trackTourUserActivity()
      this.setTourUserActivityTimer()
    }
    if (nextAppState === 'inactive') {
      this.appGoseInBackground()
      // Do something here on app inactive mode.
      console.log("App is in inactive Mode.")
    }
  };

  appGoseInBackground() {
    clearInterval(this.serverPingTimer);
    abandonedTour()
      .then(response => response.json())
      .then(responseJson => {
        var tourUser = responseJson
      })
      .catch(error => {
        this.setState({ isLoading: false });
      });
  }
  //show_long_directional_text
  tick = () => {
    if (this.serverPingInProgress === false) {
      this.serverPingInProgress = true
    serverPing()
      .then(response => response.json())
      .then(responseJson => {
        this.serverPingInProgress = false

        var tourUser = responseJson
        if (tourUser.chat_control !== 'undefined') {
          console.log("tour user",tourUser)
          // this.setState({ willShowChatButton: tourUser.chat_control })
          Singleton.getInstance().getTourSetting().chat_control = tourUser.chat_control
          //this.setState({ willShowChatButton: Singleton.getInstance().getTourSetting().chat_control })
        }
        if (tourUser.un_read_msgs_count !== 'undefined') {
          this.setState({ unReadMessageCount: tourUser.un_read_msgs_count })
        }
        if (tourUser.id_mismatch === true && this.showIDMisMatch) {
          // debugger
          this.showIDMisMatch = false
          clearInterval(this.serverPingTimer)
          //clearInterval(this.state.timer);
          //this.appGoseInBackground()
          ActivityTrackerManager.getInstance().setLengthyStayTime()
          //this.getLatestLocation()
          trackTourUserActivity()
          this.props.navigation.navigate("IdVerificationError")
        }
      })
      .catch(error => { 
        this.serverPingInProgress = false
        console.log(error); 
      });
    }

    // ActivityTrackerManager.getInstance().setLengthyStayTime()
    // trackTourUserActivity()
    //   .then(response => response.json())
    //   .then(responseJson => {
    //     var tourUser = responseJson
    //     if (tourUser.un_read_msgs_count !== 'undefined') {
    //       //Singleton.getInstance().setUnReadMessageCount(tourUser.un_read_msgs_count)
    //       this.setState({ unReadMessageCount: tourUser.un_read_msgs_count })
    //       //this.props.screenProps.setCount(tourUser.un_read_msgs_count)
    //     }

    //     // if (tourUser.data.id_mismatch === true) {
    //     //   clearInterval(this.state.timer);
    //     //   this.setState({ isLoading: false });
    //     //   this.props.navigation.navigate("IdVerificationError")
    //     // }
    //   })
    //   .catch(error => {
    //     this.setState({ isLoading: false });
    //     console.log(error);
    //   });
  }

  leftTourServerCall() {
    Singleton.getInstance().setWillShowStartButton(true)
    clearInterval(this.serverPingTimer);
    ActivityTrackerManager.getInstance().setLeftTime()
    trackTourUserActivity()
      .then(response => response.json())
      .then(responseJson => {
        var tourUser = responseJson
      })
      .catch(error => {
        this.setState({
          isLoading: false
        });
        console.log(error);
      });
  }

  pressChat = () => {
    this.props.navigation.navigate("Chat",)
}
showMore = () => {
  this.props.navigation.navigate("PrivacyPolicy", { title: "Detail", des: this.tourStops[this.nextStopIndex].long_directional_text });
  //this.props.navigation.navigate("Chat")
  //
}

  render() {

    const { navigation } = this.props;
    const logo = Singleton.getInstance().getPropertyLogo()
    return (
      <View style={{ flex: 1 }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#6a51ae" />
        <ImageBackground source={R.images.backgroundImage} style={styles.backgroundImage} imageStyle={{
          resizeMode: 'stretch'
        }} >
          <Header backBtnVisible={true} title={this.state.title?.toUpperCase()} onGoBack={this.goBackFromFirstStop} />
          <View style={styles.logoContainer} >
            <Image source={{ uri: logo }} style={styles.logo} defaultSource={R.images.logoFinal} />
          </View>
          <View style={styles.messageContainer}>
            {/* <Text style={styles.messageText}> {"Here you go. This is what you are going to see on your tour"} </Text> */}
            {/* <Text style={styles.titleText}> {this.state.isEnd ? "Your tour is completed!  Let's go back where you started." : (typeof (this.tourStops[this.nextStopIndex]) !== "undefined" ? this.tourStops[this.nextStopIndex].type === "unit" ? "Now let's go to " + this.tourStops[this.nextStopIndex].name + "." : this.tourStops[this.nextStopIndex].directional_text : "")}</Text> */}
      <Text style={styles.titleText}> {this.state.isEnd ? "Your tour is completed!  Let's go back where you started." : (typeof (this.tourStops[this.nextStopIndex]) !== "undefined" ? this.tourStops[this.nextStopIndex].directional_text : "")} { this.state.showMoreButton ? <Text onPress={this.showMore} style = {{ color: "rgb(120, 117, 255)" }}>. . . More {'>'} </Text> : null }</Text>
            <Text style={styles.titleText}> {this.state.isEnd ? "" : (typeof (this.tourStops[this.nextStopIndex]) !== "undefined" ? this.tourStops[this.nextStopIndex].type !== "elevator" ? this.tourStops[this.nextStopIndex].guest_pin : "" : "")}</Text>
            {/* <Text style={styles.titleText}> {this.state.isEnd ? "" : (typeof (this.tourStops[this.nextStopIndex]) !== "undefined" ? this.tourStops[this.nextStopIndex].type !== "elevator" ? "hello this is pin text" : "" : "")}</Text> */}
          </View>
          <View style={styles.tourStopsListContainer} >
            <FlatList
              ref={(ref) => { this.flatListRef = ref; }}
              data={this.state.tourStopsData}
              // ItemSeparatorComponent = { this.FlatListItemSeparator }
              renderItem={({ item, index }) =>
                <TouchableOpacity style={styles.listTeamsButton}>
                  <View style={styles.listItemsView}>
                    <View style={styles.listIconView}>
                      <Image source={
                        this.state.index > index
                          ? R.images.checkState1
                          : (this.state.index === index
                            ? R.images.checkState2
                            : R.images.checkState3
                          )}
                        style={styles.listCheckIcon} />
                    </View>
                    <View style={styles.listTextView}>
                      <Text style={[styles.listText, {
                        color:
                          this.state.index > index
                            ? "rgb(74,152,80)"
                            : (this.state.index === index
                              ? "rgb(245,179,75)"
                              : 'white')
                      }]}>{item.name}</Text>
                     

                    </View>
                    <View style={styles.listIconView}>
                        {item.is_favorite ? <Image source={R.images.hearticon}
                          style={styles.listHeartIcon} /> : null}
                      </View>
                  </View>
                </TouchableOpacity>
              }>
            </FlatList>
            <AppConsumer>
             {(context) => {     
               context.setUnReadMessageCount(this.state.unReadMessageCount)            
            }}
          </AppConsumer>
            {this.state.willShowChatButton ? <ChatButton goPressed={() => this.pressChat()} /> : null} 
            <GoButton goPressed={() => this.nextButtonPressed()} />
          </View>
          <CopyRight />
        </ImageBackground>
      </View>
    );
  }
}

const styles = StyleSheet.create({

  backgroundImage: {
    flex: 1,
    // height:Dimensions.get("window").height,
    // width:Dimensions.get("window").width,
    // height: "100%",
    alignItems: "center",
    justifyContent: "center",
    width: null,
    height: null,
  },

  logoContainer: {
    flex: .35,
    width: "100%",
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 0
  },

  logo: {
    width: wp('55%'),
    height: hp('20%'),
    position: 'absolute',
    resizeMode: 'contain',
    bottom: hp('.5%')
  },

  messageContainer: {
    width: "100%",
    flex: .2,
    // aspectRatio: 2.7/1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleText: { color: "white", textAlign: "center", lineHeight: hp('4%'), fontSize: wp('4.5%'), marginLeft: wp('6%'), marginRight: wp('6%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light" },

  messageText: {
    fontSize: hp('2.1%'),
    color: 'white',
    marginLeft: wp('3%'),
    marginRight: wp('3%'),
    lineHeight: hp('3.2%'),
    textAlign: 'center',
    justifyContent: 'center',
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
  },

  tourStopsListContainer: {
    width: "100%",
    flex: .7,
  },

  listCheckIcon:
  {
    position: 'absolute',
    right: wp('1%'),
    width: hp("3%"),
    height: hp("3%"),
    resizeMode: "contain",
  },

  listHeartIcon:
  {
    position: 'absolute',
    left: wp ('1%'),
    top: hp('0%'),
    width: hp("3%"),
    height: hp("3%"),
  },

  listItemsView:
  {
    flexDirection: 'row',
    width: '100%',
  },

  listIconView:
  {
    flex: 1,
  },

  listTextView:
  {
    flex: 5,
    justifyContent: 'flex-start'
  },

  listText:
  {
    fontSize: hp('3%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
    color: 'white',
    marginLeft: wp('2%'),
    marginRight: wp('2%'),
    marginBottom: hp('2%'),
    textAlign: 'left',
  }
});
