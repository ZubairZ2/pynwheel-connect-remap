
import { black } from 'ansi-colors';
import React, { Component } from 'react';
import { connect } from 'react-redux'
import ImageView from "react-native-image-progress";
//import { HeaderBackButton } from 'react-navigation';
import { StackActions, NavigationActions } from 'react-navigation';
import HeaderBackButton from 'react-navigation-stack';
import Icon from "react-native-vector-icons/FontAwesome";
import Spinner from "react-native-loading-spinner-overlay";
import { WebView } from 'react-native-webview';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Linking, Platform, StyleSheet, Text, View, FlatList, Image, ImageBackground, TouchableOpacity } from 'react-native';

//import qs from 'qs';
import R from "../../../assest/R";
import { AppConsumer } from '../../../Library/Components/MyContext'
import ChatButtonSquar from '../../../Library/Components/ChatButtonSquar'
import CopyRight from "../../../Library/Components/Copyright"
import { getSavedTourData } from '../../../Library/ServerCalls/API';
import { sendEmail } from '../../../Utils/Helpers'
import Singleton from "../../../Singleton"
import Header from '../../../Library/Components/Header/index'
import { serverPing } from '../../../Library/Managers/APICalls';
import { setShowChatButton, setUnreadMessageCount } from '../../../redux/actions/chatActions';
import LoadingIndicator from '../../../Components/LoadingIndicator';
class SavedTourScreen extends Component {

  constructor() {
    super();
    var cellItem = null;
    var cellIndex = 0;
    var dataSetForOptionButton = []

    this.serverUpdateTime = 8000; //60000 one mint
    this.serverPingInProgress = false

    this.state = {
      activeTour: null,
      tourStopsData: null,
      isLoading: false,
      showShareTourButton: false,
      showApplyNow:false
    };
  }

  // static navigationOptions = ({ navigation }) => {
  //   return {
  //     headerLeft: (<HeaderBackButton tintColor={'white'} onPress={() => { navigation.navigate("Home") }} />)
  //   }
  // }

  componentDidMount() {
    // this.getDeviceId()
    const { navigation } = this.props;
    Singleton.getInstance().setReloadTourHighlights(true)
    this.focusListener = navigation.addListener('didFocus', () => {
      this.getTourUserID()
    });
  }

  getTourUserID() {
    if (Singleton.getInstance().getReloadTourHighlights()) {
      Singleton.getInstance().setReloadTourHighlights(false)
      this.getSavedTourData()
    }
  }
  sharePressed = () => {
    this.props.navigation.navigate('Share', {
      tourID: this.state.activeTour.id
    });
  }

  getSavedTourData = () => {
    // debugger
    this.setState({
      isLoading: true
    });
    this.setState({ tourStopsData: [] });
    // debugger
    getSavedTourData()
      .then(response => response.json())
      .then(responseJson => {
        setTimeout(() => {
          // debugger
          if (typeof (responseJson.tours) !== 'undefined' || responseJson.tours != null) {
            if (responseJson.tours.length > 0) {
              var activeTourTemp = responseJson.tours[0]
              Singleton.getInstance().setTourKey(activeTourTemp.tour_key)
              Singleton.getInstance().setTourId(activeTourTemp.id)
              if (typeof (Singleton.getInstance().serverPingTimer) === 'undefined' || Singleton.getInstance().serverPingTimer === null) {
                this.props.setChatButtonStatus(responseJson.chat_control)
                Singleton.getInstance().setLastMessageId(responseJson.latest_message_id)
                this.runAlertACall()
              }
              this.setState({
                activeTour: activeTourTemp,
                tourStopsData: activeTourTemp.visited_tour,
                showShareTourButton: true,
                showApplyNow: activeTourTemp.show_apply_now
              });
            }
            this.setState({
              isLoading: false
            });
          } else {
            this.showServerError()
          }
        }, 800);
      })
      .catch(error => {
        this.showServerError()
      });
  };

  runAlertACall = () => {
    if (typeof (Singleton.getInstance().serverPingTimer) === 'undefined') {
      Singleton.getInstance().serverPingTimer = setInterval(this.tick, this.serverUpdateTime);
    } else {
      console.log('defined ping timer')
    }
  }

  tick = () => {
    // if(!this.isTourEnded) {
    //   ActivityTrackerManager.getInstance().setLengthyStayTime()
    // }
    if (this.serverPingInProgress === false) {
      this.serverPingInProgress = true
      serverPing("", "")
        .then(response => response.json())
        .then(responseJson => {
          // this.selectedStopLaLog = []
          this.serverPingInProgress = false
          var tourUser = responseJson
          if (tourUser.un_read_msgs_count !== 'undefined') {
            this.props.setUnreadMegCount(tourUser.un_read_msgs_count)
          }
          if (tourUser.chat_control !== 'undefined') {
            this.props.setChatButtonStatus(tourUser.chat_control)
          }
        })
        .catch(error => {
          this.serverPingInProgress = false
          console.log(error);
        });
    }
  }

  showServerError = () => {
    this.setState({ isLoading: false });
    this.setState({ message: " Server Error." })
    setTimeout(() => {
      alert('Server Error, Please try again.')
    }, 500);
  }

  cameraPressed = (index) => {
    this.props.navigation.navigate('UserGallery', {
      userGalleryDataArray: this.state.tourStopsData[index].user_gallery_v1
    });
  }
  notesPressed = (index) => {
    // debugger
    this.props.navigation.navigate('UerNote', {
      notesDataArray: this.state.tourStopsData[index].notes_v1
    });
  }

  searchPressed = (index) => {
    // debugger
    this.props.navigation.navigate('SavedTourSearch', {
      stopData: this.state.tourStopsData[index],
      showApply: this.state.showApplyNow
    });
  }

  locationPressed = (index) => {
    this.props.navigation.navigate('MediaPlayer', { link: this.state.tourStopsData[index].video_link });
  }

  pressRefresh = (index) => {
    this.props.navigation.navigate("StopDetail", {
      stopData: this.state.tourStopsData[index],
      showApply: this.state.showApplyNow
    })
  }
  onCheckAvailability = (item) => {
    // debugger
    this.props.navigation.navigate("CheckUnitAvailaibility", { floorPlanName: item.stop_data.floorplan_full_name, unitID: item.stop_data.floorplan_id, navigationForm: "UnitFloorPlanScreen", showApply: this.state.showApplyNow})
}

  callNow = () => {
    // debugger
    Linking.openURL(`tel:${this.props.selectedConnunityPhone}`)
  }

  emailUs = () => {
    sendEmail(
      this.props.selectedConnunityEmail,
      'Message from ' + this.props.userName + ' (Pynwheel Tour)',
      "\n" + "\n" + 'Name: ' + this.props.userName + "\n" + 'Mobile: ' + this.props.phoneNumber + "\n" + 'Email: ' + this.props.email,
    ).then(() => {
      // alert('Your email was successfully sent!')
    }).catch((error) => {
      console.log("ERROR", error)
    });
  }

  pressChat = () => {
    this.props.navigation.navigate("Chat")
  }

  // backButtonPressed() {
  //   console.log("fsd")
  //   // debugger
  //   clearInterval(Singleton.getInstance().serverPingTimer)
  //   if (this.props.navigation.goBack()) {
  //     //navigation.goBack()
  //     this.props.navigation.navigate("Home")
  //   } else {
  //     this.props.navigation.navigate("Welcome");
  //   }
  // }

  renderSeparator = () => {
    return (
      <View
        style={{ height: 1, width: "100%", backgroundColor: "gray", }}
      />
    );
  };

  render() {
    const { navigation } = this.props;

    return (
      <ImageBackground
        source={R.images.backgroundColor}
        style={{
          resizeMode: "contain",
          flex: 1,
          flexDirection: "column",
          backgroundColor: "black",
          alignItems: "center"
        }}
        imageStyle={{
          resizeMode: "stretch"
        }}>
        <Header backBtnVisible={true} title="TOUR HIGHLIGHTS" navigation={navigation} onGoBack={() => {
          clearInterval(Singleton.getInstance().serverPingTimer)
          Singleton.getInstance().serverPingTimer = undefined
          const lastRoute =navigation.getParam("lastRoute") || undefined
          const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: lastRoute==='TourHistory'?lastRoute:'Home' })],
          });
          this.props.navigation.dispatch(resetAction);
        }} />
        {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
        <LoadingIndicator visible={this.state.isLoading}/>
        <View style={styles.container}>
          <FlatList style={styles.flatListContainer} data={this.state.tourStopsData} renderItem={({ item, index }) =>
            <View style={styles.renderItemcontainer} >
              <TouchableOpacity style={styles.renderItemcontainer} onPress={() => this.pressRefresh(index)}>
                <View style={styles.occupySuperContainerView}>
                  <ImageView resizeMode="cover" style={styles.imageStyle} source={{ uri: item.image }} defaultSource={R.images.placeholder} key={this.state.mapImage} />
                </View>
                <View style={styles.propertyNameContainerView}>
                  <Text style={styles.item}> {item.name} </Text>
                  <Text style={{
                    fontSize: 14,
                    top: 20,
                    left: 5,
                    // justifyContent: 'center',
                    // alignContent: 'flex-end',
                    color: 'gray',
                    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
                  }}>{item.event_time}</Text>
                </View>
                <View style={styles.occupySuperContainerView}>
                  {item.type==="unit"&&<View style={{ backgroundColor: "black" }}>
                    <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('22%'), }} onPress={() => this.onCheckAvailability(item)}>
                      <Image source={R.images.refreshIcon} style={{ width: wp("8%"), height: hp("6%"), resizeMode: "contain" }} />
                      <Text style={{ color: "white", textAlign: "center", fontSize: wp('2.7%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CHECK{"\n"}AVAILABILITY</Text>
                    </TouchableOpacity>
                  </View>}
                  {/* {this.saveCurrentRowItemAndIndex(item, index)}
                <FlatList style={{ flex: 1, justifyContent: 'center' }} data={this.dataSetForOptionButton} renderItem={({ item, index }) => (
                  <View style={{ flex: 1, marginTop: 2 }}>
                    {this.listOptions(this.cellItem, this.cellIndex, item.type)}
                  </View>
                )}
                  //Setting the number of column
                  numColumns={2}
                  keyExtractor={(item, index) => index} /> */}
                </View>
              </TouchableOpacity>
            </View>
          }
            ItemSeparatorComponent={this.renderSeparator}
            ListFooterComponent={this.renderSeparator} />
          {this.state.showShareTourButton ?
            <View style={{ backgroundColor: 'rgb(30,30,30)', flex: .18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', }}>
              {this.props.selectedConnunityPhone !== "" ? <View style={{ backgroundColor: "black" }}>
                <TouchableOpacity style={{ flexDirection: 'column', alignItems: "center", justifyContent: 'flex-start', height: hp('10%'), width: wp('21%'), }}
                  onPress={() => this.callNow()}>
                  <Image source={R.images.phoneicon}
                    style={{ width: wp("8%"), height: hp("8%"), resizeMode: "contain" }} />
                  <Text style={{ color: "white", textAlign: "center", fontSize: wp('2.7%'), lineHeight: wp('3.5%'), marginTop: hp('-1%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CALL NOW</Text>
                </TouchableOpacity>
              </View> : null}
              {this.props.selectedConnunityEmail !== "" ? <View style={{ backgroundColor: "black" }}>
                <TouchableOpacity style={{ flexDirection: 'column', alignItems: "center", height: hp('10%'), width: wp('21%') }}
                  onPress={() => this.emailUs()}>
                  <Image source={R.images.mailicon}
                    style={{ width: wp("9%"), height: hp("9%"), resizeMode: "contain" }} />
                  <Text style={{ color: "white", lineHeight: wp('3.5%'), marginTop: hp('-2%'), textAlign: "center", fontSize: wp('2.7%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>EMAIL US</Text>
                </TouchableOpacity>
              </View> : null}

              {this.props.showChatButton1 ? <ChatButtonSquar goPressed={() => this.pressChat()} width={22} height={10} /> : null}
              {/* <AppConsumer>
            {context => context.buttonStatus ? <ChatButtonSquar goPressed={() => this.pressChat()} /> : null}
          </AppConsumer> */}
              {/* <View style={{ backgroundColor: "black" }}>
              <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('21%'), }} onPress={() => this.emailUs()}>
                  <Image
                      source={R.images.chat}
                      style={{ width: wp("8%"), height: hp("6%"), resizeMode: "contain", }} />
                  <Text style={{ color: "white", textAlign: "center", fontSize: wp('2.7%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CHAT</Text>
              </TouchableOpacity>
          </View> */}
              <View style={{ backgroundColor: "black" }}>
                <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('22%'), }} onPress={() => this.sharePressed()}>
                  <Image source={R.images.share} style={{ width: wp("8%"), height: hp("6%"), resizeMode: "contain" }} />
                  <Text style={{ color: "white", textAlign: "center", fontSize: wp('2.7%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>SHARE</Text>
                </TouchableOpacity>
              </View>
            </View>
            // <View style={{ flex: 0.17, backgroundColor: 'green' }}>
            //   {/* <TouchableOpacity onPress={() => this.sharePressed()} style={{ backgroundColor: "#D3D3D3", width: wp('95%'), height: hp('7%'), alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
            //     <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', justifyContent: 'center', width: wp('25%') }}>
            //       <Image style={{ height: hp('3%'), width: wp('6%'), resizeMode: 'contain', }} source={R.images.share} />
            //       <Text style={{ marginLeft: wp('2%'), fontSize: wp('3.5%') }}>SHARE</Text>
            //     </View>
            //   </TouchableOpacity> */}
            //   <View style={{ backgroundColor: 'red', flexDirection: 'row', alignItems: 'center', width: wp('100%'), justifyContent: 'space-evenly', marginTop: hp('.5%') }} >
            //     <View style={{ backgroundColor: "black", height: hp('9%'), width: wp('5%'), alignItems: "center", justifyContent: "center" }}>
            //       <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('25%'), }} onPress={() => this.callNow()}>
            //         <Image source={R.images.phoneicon} style={{ width: wp("9%"), height: hp("7%"), resizeMode: "contain" }} />
            //         <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), marginTop: hp('-.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CALL NOW</Text>
            //       </TouchableOpacity>
            //     </View>
            //     <View style={{ backgroundColor: "black", height: hp('9%'), width: wp('25%'), alignItems: "center", justifyContent: "center" }}>
            //       <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('25%'), }} onPress={() => this.emailUs()}>
            //         <Image source={R.images.mailicon} style={{ width: wp("10%"), height: hp("8%"), resizeMode: "contain", marginTop: hp('-1%') }} />
            //         <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", marginTop: hp('-1%') }}>EMAIL US</Text>
            //       </TouchableOpacity>
            //     </View>
            //     <View style={{ backgroundColor: "black", height: hp('9%'), width: wp('25%'), alignItems: "center", justifyContent: "center" }}>
            //       <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('8%'), width: wp('25%'), }} onPress={() => this.emailUs()}>
            //         <Image source={R.images.chat} style={{ width: wp("8%"), height: hp("6%"), resizeMode: "contain" }} />
            //         <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>EMAIL US</Text>
            //       </TouchableOpacity>
            //     </View>
            //     <View style={{ backgroundColor: "black", height: hp('9%'), width: wp('25%'), alignItems: "center", justifyContent: "center" }}>
            //       <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('8%'), width: wp('25%'), }} onPress={() => this.emailUs()}>
            //         <Image source={R.images.share} style={{ width: wp("8%"), height: hp("6%"), resizeMode: "contain" }} />
            //         <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>SHARE</Text>
            //       </TouchableOpacity>
            //     </View>
            //   </View>
            // </View>
            : null}
        </View>
        <CopyRight />
      </ImageBackground>
    );
  }

  saveCurrentRowItemAndIndex(item, index) {

    this.cellItem = item
    this.cellIndex = index
    this.dataSetForOptionButton = []

    if (item.user_gallery.length > 0) {
      this.dataSetForOptionButton.push({ key: 0, type: "camera" })
    }
    if (item.gallery.length > 0) {
      this.dataSetForOptionButton.push({ key: 1, type: "search" })
    }
    if (item.notes.length > 0) {
      this.dataSetForOptionButton.push({ key: 2, type: "notes" })
    }
    if (item.video_link !== "") {
      this.dataSetForOptionButton.push({ key: 3, type: "location" })
    }

  }

  listOptions(item, index, buttonOptionItem) {
    // debugger
    var options = []
    if (item.user_gallery.length > 0 && buttonOptionItem == "camera") {
      return <ListOptionsButtonView index={index} buttonType={buttonOptionItem} cameraPressed={this.cameraPressed} />
    } else if (item.gallery.length > 0 && buttonOptionItem == "search") {
      return <ListOptionsButtonView index={index} buttonType={buttonOptionItem} searchPressed={this.searchPressed} />
    } else if (item.notes.length > 0 && buttonOptionItem == "notes") {
      return <ListOptionsButtonView index={index} buttonType={buttonOptionItem} notesPressed={this.notesPressed} />
    } else if (item.video_link !== "" && buttonOptionItem == "location") {
      return <ListOptionsButtonView index={index} buttonType={buttonOptionItem} locationPressed={this.locationPressed} />
    }
    return <View style={{ flex: 0, backgroundColor: 'red', width: '0%', height: '0%' }} />
  }
}

export default connect(mapStateToPropsps, mapDispatchToProps)(SavedTourScreen)
function mapStateToPropsps(state) {
  // debugger
  return {
    showChatButton1: state.chatReducer && state.chatReducer.showChatButton,
    selectedConnunityPhone: state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.phone,
    selectedConnunityEmail: state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.email,
    userName: state.loginUserReducer.userData && state.loginUserReducer.userData.name,
    email: state.loginUserReducer.userData && state.loginUserReducer.userData.email,
    phoneNumber: state.loginUserReducer.userData && state.loginUserReducer.userData.phone_number,
  }
}

function mapDispatchToProps(dispatch) {
  return {
    setUnreadMegCount: payload => dispatch(setUnreadMessageCount(payload)),
    setChatButtonStatus: payload => dispatch(setShowChatButton(payload)),
    //increaseCounter: (payload) => dispatch({ type: 'SELECTED_COMMUNITY', payload })
  }
}

function ListOptionsButtonView(props) {
  if (props.buttonType == "camera") {
    return (
      <View style={styles.optionsSubInternalContainerButton}>
        <View style={styles.optionsSubInternalContainer}>
          <TouchableOpacity onPress={() => props.cameraPressed(props.index)} style={styles.touchableOpacityStyle}>
            <Image source={R.images.cameraIcon} style={styles.imageStyle}></Image>
          </TouchableOpacity>
        </View>
      </View>
    )
  } else if (props.buttonType == "search") {
    return (
      <View style={styles.optionsSubInternalContainerButton}>
        <View style={styles.optionsSubInternalContainer}>
          <TouchableOpacity onPress={() => props.searchPressed(props.index)} style={styles.touchableOpacityStyle}>
            <Image source={R.images.searchIcon} style={styles.imageStyle}></Image>
          </TouchableOpacity>
        </View>
      </View>
    )
  } else if (props.buttonType == "notes") {
    return (
      <View style={styles.optionsSubInternalContainerButton}>
        <View style={styles.optionsSubInternalContainer}>
          <TouchableOpacity onPress={() => props.notesPressed(props.index)} style={styles.touchableOpacityStyle}>
            <Image source={R.images.notesIcon} style={styles.imageStyle}></Image>
          </TouchableOpacity>
        </View>
      </View>
    )
  } else if (props.buttonType == "location") {
    return (
      <View style={styles.optionsSubInternalContainerButton}>
        <View style={styles.optionsSubInternalContainer}>
          <TouchableOpacity onPress={() => props.locationPressed(props.index)} style={styles.touchableOpacityStyle}>
            <Image source={R.images.playicon} style={styles.imageStyle}></Image>
          </TouchableOpacity>
        </View>
      </View>
    )
  }
}


const styles = StyleSheet.create({
  container: { flex: 1, width: wp('100%'), },
  flatListContainer: { flex: 2, },
  renderItemcontainer: { flex: 1, flexDirection: 'row', },
  occupySuperContainerView: { width: 100, height: 100, padding: 5, },
  propertyNameContainerView: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', },
  optionsSubInternalContainer: { flex: 1, padding: 2, },
  optionsSubInternalContainerButton: { width: wp('11%'), height: hp('5%'), padding: 3, marginHorizontal: 3, backgroundColor: "black", },
  item: {
    // paddingLeft: 10,
    // paddingRight: 10,
    top: 10, fontSize: wp('5%'), justifyContent: 'flex-start', alignContent: 'flex-start', color: 'white', fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
  },
  touchableOpacityStyle: { flex: 1, justifyContent: 'center', alignItems: 'center', width: "100%", height: "100%", },
  imageStyle: { flex: 1, resizeMode: 'contain', width: "100%", height: "100%", },
  buttonText: { fontSize: 13, fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold", },
})