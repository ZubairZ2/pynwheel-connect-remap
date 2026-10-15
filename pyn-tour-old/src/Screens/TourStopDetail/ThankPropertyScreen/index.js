import qs from 'qs';
import styles from "./style";
import React, { Component } from "react";
import Spinner from "react-native-loading-spinner-overlay";
import { Linking, View, Text, ImageBackground, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Animated } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

import { connect } from 'react-redux'

import R from "../../../assest/R";
import ChatButtonSquar from "../../../Library/Components/ChatButtonSquar";
import Header from '../../../Library/Components/Header'
import Singleton from "../../../Singleton";
import Logo from "../../../Library/Components/Logo"
import { sendEmail } from '../../../Utils/Helpers'
import CopyRight from "../../../Library/Components/Copyright"
import { postSavedTour } from "../../../Library/ServerCalls/API";
import { postUserFeedback } from "../../../Library/ServerCalls/API";
import { Rating, AirbnbRating } from 'react-native-ratings';
import Dialog, { SlideAnimation, DialogContent, DialogTitle, DialogFooter, DialogButton, } from 'react-native-popup-dialog';
import { AppConsumer } from '../../../Library/Components/MyContext'
import LoadingIndicator from '../../../Components/LoadingIndicator';

class ThankPropertyScreen extends Component {
  static navigationOptions = {
    header: null
  };
  constructor(props) {
    super(props);
    // this.fadeAnim = 1
    this.fadeAnim = new Animated.Value(1)
    this.verticalStarMargin = new Animated.Value(0)
    this.fadeInAnimation = new Animated.Value(0)

    this.state = {
      show: false,
      isLoading: false,
      isModalVisible: false,
      showInputReating: false,
      modelHeight: 20,
      userRating: 0,
      feedback: "",
      isSuccessModalVisible: false,
    };
  }

  componentDidMount() {
    this.postSavedTour()
  }

  postSavedTour = () => {
    // debugger
    const { navigation } = this.props;
    this.setState({ isLoading: true })
    // const value = navigation.getParam("tourData", null);
    const visitedStops = navigation.getParam("visitedStops", null);
    // const visitedStopLatlong = navigation.getParam("visitedStopLatlong", null);
    Singleton.getInstance().setVirtualTour(false)
    postSavedTour(visitedStops)
      .then((res) => res.json())
      .then((res) => {
        // debugger
        this.setState({ isLoading: false })
        if ((typeof (res.feedback_option !== 'undefined'))) {
          if (res.feedback_option) {
            this.getFeedbackFormUser()
          }
        }
      })
      .catch((e) => {
        // debugger
        this.setState({ isLoading: false })
        const vc = e
      })
    // .done(this.setState({ isLoading: false }),)
  }

  getFeedbackFormUser = () => {
    this.setState({ isModalVisible: true });
  }

  ratingCompleted = (rating) => {
    this.setState({ userRating: rating })
    this.fadeOut()
    this.setState({ showInputReating: true })
    this.setState({ modelHeight: 40 })
    this.secondTextInput.focus();
  }

  fadeOut() {
    Animated.timing(this.fadeAnim, {
      toValue: 0,
      duration: 500
    }).start(() => { this.moveToTop() });
  };

  moveToTop() {
    Animated.timing(this.verticalStarMargin, {
      toValue: -60,
      duration: 500
    }).start(() => { this.fadeIn() });
  };

  fadeIn() {
    Animated.timing(this.fadeInAnimation, {
      toValue: 1,
      duration: 500
    }).start();
  };

  submitPressed = () => {
    this.setState({ isModalVisible: false });
    this.setState({ isLoading: true })
    postUserFeedback(this.state.userRating, this.state.feedback, false, "")
      // .then((res) => checkStatus(res))
      .then((res) => res.json())
      .then((res) => {
        // debugger
        this.setState({ isLoading: false })
        this.setState({ isSuccessModalVisible: true })
      })
      .catch((e) => {
        const vc = e
        this.setState({ isLoading: false })
      })
    this.resetAllAnimation()
  }

  ratingModalHide = () => {
    this.setState({ isModalVisible: false });
    postUserFeedback("", "", true, new Date().toString())
      .then((res) => res.json())
      .then((res) => {
        // debugger
      })
      .catch((e) => { const vc = e })
    this.resetAllAnimation()
  }

  resetAllAnimation = () => {
    this.fadeAnim = new Animated.Value(1)
    this.verticalStarMargin = new Animated.Value(0)
    this.fadeInAnimation = new Animated.Value(0)
    this.setState({ modelHeight: 20 })
  }

  successModilHide = () => {
    this.setState({ isSuccessModalVisible: false });
  }

  callNow = () => {
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

  render() {
    // debugger
    return (
      <ImageBackground source={R.images.backgroundImage} style={styles.rootView}
        imageStyle={{
          resizeMode: "stretch"
        }}>
        {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
        <LoadingIndicator visible={this.state.isLoading} />
        {/* <KeyboardAvoidingView style={{ flex: 1, alignItems: 'center' }} behavior={Platform.OS === "ios" ? 'position' : "none"}> */}
        <Header backBtnVisible={true} navigation={this.props.navigation} onGoBack={() => {
          if (this.props.navigation.goBack()) {
            this.props.navigation.goBack()
          }
        }} />
        <Logo LogoUrl={this.props.selectedCommunityLogo} />
        <View style={styles.welcomeView}>
          <Text style={styles.welcomeToTextView}>Thank you for visiting</Text>
          <Text style={styles.propertyTextNameView}>{this.props.selectedCommunityName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', width: wp('100%'), justifyContent: 'space-evenly', marginTop: hp('5%') }} >
          {this.props.selectedConnunityPhone ? <View style={{ backgroundColor: "black", height: hp('9%'), width: wp('30%'), alignItems: "center", justifyContent: "center" }}>
            <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('41%'), }} onPress={() => this.callNow()}>
              <Image source={R.images.phoneicon} style={{ width: wp("9%"), height: hp("7%"), resizeMode: "contain" }} />
              <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), marginTop: hp('-.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CALL NOW</Text>
            </TouchableOpacity>
          </View> : null}
          {this.props.selectedConnunityEmail ? <View style={{ backgroundColor: "black", height: hp('9%'), width: wp('30%'), alignItems: "center", justifyContent: "center" }}>
            <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('41%'), }} onPress={() => this.emailUs()}>
              <Image source={R.images.mailicon} style={{ width: wp("10%"), height: hp("8%"), resizeMode: "contain", marginTop: hp('-1%') }} />
              <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", marginTop: hp('-1%') }}>EMAIL US</Text>
            </TouchableOpacity>
          </View> : null}
          {/* <AppConsumer>
            {context => context.buttonStatus ? <ChatButtonSquar goPressed={() => this.pressChat()} /> : null}
          </AppConsumer> */}
          {this.props.showChatButton1 ? <ChatButtonSquar goPressed={() => this.pressChat()} width={30} height={9} /> : null}
        </View>
        <View style={styles.startTourRoot}>
          <TouchableOpacity onPress={() => { this.props.navigation.navigate("CheckFloorPlanAva") }}
            style={{ flexDirection: "column", width: wp("92%"), height: hp("6.5%"), backgroundColor: "#D3D3D3", alignItems: "center", justifyContent: "center" }}>
            <Text style={styles.bottomText}>CHECK AVAILABILITY</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { this.props.navigation.navigate("SavedTour") }}
            style={{ flexDirection: "column", width: wp("92%"), height: hp("6.5%"), backgroundColor: "#D3D3D3", alignItems: "center", justifyContent: "center", marginTop: hp('2%') }}>
            <Text style={styles.bottomText}>SEE TOUR SUMMARY</Text>
          </TouchableOpacity>
        </View>
        <Dialog visible={this.state.isModalVisible}
          dialogAnimation={new SlideAnimation({
            slideFrom: 'bottom',
          })} >
          <DialogContent style={{ height: hp(this.state.modelHeight), width: wp('80%') }}>
            <TouchableOpacity style={{ alignSelf: 'flex-end', alignItems: "center", height: hp('5%'), width: wp('10%'), }} onPress={() => this.ratingModalHide()}>
              <Image source={R.images.crossIcon} style={{ width: wp("5%"), height: hp("5%"), alignSelf: 'flex-end', resizeMode: "contain" }} />
            </TouchableOpacity>
            {true ? <Animated.Text style={{ opacity: this.fadeAnim, marginTop: 1, color: "black", textAlign: "center", fontSize: wp('3.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", lineHeight: 20 }}>How would you rate your experience with Pynwheel Tour app? </Animated.Text> : null}
            <Animated.View style={{ marginTop: this.verticalStarMargin }}><Rating startingValue={0} type='star' ratingColor='#3498db' ratingBackgroundColor='#c8c7c8' ratingCount={5} imageSize={30} onFinishRating={this.ratingCompleted} style={{ paddingVertical: 10 }} /></Animated.View>
            <Animated.View style={{ opacity: this.fadeInAnimation }}>
              <Text style={{ marginTop: 5, color: "black", textAlign: "center", fontSize: wp('3.8%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Tell us a bit more about why you choose {this.state.userRating} </Text>
              <TextInput ref={(input) => { this.secondTextInput = input; }} onChangeText={(text) => this.setState({ feedback: text })} placeholderTextColor='black' placeholder="Add text" multiline={true} style={{ borderRadius: 5, borderWidth: 1, borderColor: 'black', backgroundColor: "white", color: "black", height: hp("8%"), top: hp("2%"), paddingLeft: 7, }} />
              <TouchableOpacity onPress={() => { this.submitPressed() }}
                style={{ flexDirection: "column", height: hp("4%"), backgroundColor: "#D3D3D3", alignItems: "center", justifyContent: "center", marginTop: hp("3%") }}>
                <Text style={styles.bottomText}>Submit feedback</Text>
              </TouchableOpacity></Animated.View>
          </DialogContent>
        </Dialog>

        <Dialog visible={this.state.isSuccessModalVisible}
          dialogAnimation={new SlideAnimation({
            slideFrom: 'bottom',
          })} >
          <DialogContent style={{ height: hp('35'), width: wp('80%') }}>
            <View>
              <Image source={R.images.tickIcon} style={{ alignSelf: 'center', width: wp("20%"), height: hp("20%"), resizeMode: "contain", }} />
              <Text style={{ marginTop: 4, color: "black", textAlign: "center", fontSize: wp('3.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}> Thank you, your feedback has been submited </Text>
              <TouchableOpacity onPress={() => { this.successModilHide() }} style={{ flexDirection: "column", height: hp("4%"), backgroundColor: "#D3D3D3", alignItems: "center", justifyContent: "center", top: 20 }}>
                <Text style={styles.bottomText}>CONTINUE</Text>
              </TouchableOpacity></View>
          </DialogContent>
        </Dialog>
        {/* </KeyboardAvoidingView> */}
        <CopyRight />
      </ImageBackground>
    );
  }
}

export default connect(mapStateToPropsps, mapDispatchToProps)(ThankPropertyScreen)
function mapStateToPropsps(state) {
  return {
    selectedCommunityLogo: state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.logo,
    selectedCommunityName: state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.name,
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
    //increaseCounter: (payload) => dispatch({ type: 'SELECTED_COMMUNITY', payload })
  }
}