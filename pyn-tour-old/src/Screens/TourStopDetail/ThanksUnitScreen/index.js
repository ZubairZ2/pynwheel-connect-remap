import { black } from "ansi-colors";
import React, { Component } from "react";
import { Platform, StyleSheet, Text, View, TouchableOpacity, ImageBackground, } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

import R from "../../../assest/R";
import CopyRight from "../../../Library/Components/Copyright"
import Singleton from "../../../Singleton"
import Header from '../../../Library/Components/Header'

export default class App extends Component {
  state = {
    unitID: -1,
    floorPlanName: "",
    availibilityUrl: null,
    canApplyForLease: Singleton.getInstance().getTourSetting()?.apply_now_self_tour
  }
  componentDidMount() {
    const { navigation } = this.props;
    this.setState({ floorPlanName: navigation.getParam("floorPlanName", "") })
    this.setState({ unitID: navigation.getParam("unitID", null) })
    this.setState({ availibilityUrl: navigation.getParam("availabilityUrl", null) })
    this.unitData = navigation.getParam("unitData", null)

  }
  pressOK = () => {
    this.props.navigation.navigate("CheckUnitAvailaibility", { floorPlanName: this.state.floorPlanName, unitID: this.state.unitID, navigationForm: "ThanksUnitScreen" })
  }

  noThanksButtonPressed = () => {
    if (Singleton.getInstance().getTourSetting().show_map) {
      Singleton.getInstance().setShouldUserMoveToNextStop(true)
      this.props.navigation.navigate("TourMap")
    }
    else {
      Singleton.getInstance().setShouldUserMoveToNextStopOnStopList(true)
      this.props.navigation.navigate("TourContainer")
    }

  }
  aplyForLease = (url) => {
    console.log(url)
    if (this.unitData.update_apply) {
      this.props.navigation.navigate("ApplyForUnit", { applyUnit: this.unitData })
    } else {
      this.props.navigation.navigate("WebView", { title: '', applyUnitURL: url })
    }

  }


  render() {
    const { navigation } = this.props;
    const { canApplyForLease, availibilityUrl } = this.state
    //console.log({canApplyForLease,availibilityUrl})
    console.log("Usman")
    return (
      <View style={styles.container}>
        <ImageBackground
          source={R.images.backgroundImage}
          style={{ flex: 1, }}
          resizeMode="stretch">
          <Header backBtnVisible={true} title="EXIT" navigation={navigation} onGoBack={() => { navigation?.goBack() }} />
          <View style={{ flex: 1, marginTop: hp('8%') }}>
            <View style={styles.upperContainer}>
              <Text style={styles.upperContainerText}>Thank you</Text>
              <Text style={styles.upperContainerText}>for visiting</Text>
              <Text style={styles.upperContainerText}>{" "}{this.state.floorPlanName} floor plan</Text>
            </View>
            <View>
              <Text style={styles.middleContainerText}>Please close the door</Text>
              <Text style={styles.middleContainerText2}>on your way out</Text>
            </View>
            <View>
              <Text style={styles.bottomContainerText}>Would you like to check the availability of this floor plan?</Text>
            </View>
          </View>
          <View style={styles.bottomButtonsContainer}>
            <TouchableOpacity style={styles.yesButtonView} onPress={() => this.pressOK()}>
              <Text style={styles.yesButton}> CHECK FLOOR PLAN AVAILABILITY  </Text>
            </TouchableOpacity>
            {(canApplyForLease && availibilityUrl) ?
              <TouchableOpacity style={styles.yesButtonView} onPress={() => this.aplyForLease(availibilityUrl)}>
                <Text style={styles.yesButton}>START LEASE APPLICATION</Text>
              </TouchableOpacity> : null
            }
            <TouchableOpacity style={styles.noThanksButtonView} onPress={() => this.noThanksButtonPressed()}>
              <Text style={styles.noButton}>CONTINUE TOUR</Text>
            </TouchableOpacity>
          </View>
          <CopyRight />
        </ImageBackground>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black"
  },
  upperContainer: {
    alignItems: "center"
  },
  bottomButtonsContainer: {
    marginBottom: hp('5%'),
    alignItems: "center"
  },
  upperContainerText: {
    fontSize: wp("9.5%"),
    fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
    textAlign: "center",
    color: "white"
  },
  middleContainerText: {
    fontSize: wp("5.5%"),
    fontFamily: "Gotham-Light",
    textAlign: "center",
    marginTop: hp('4%'),
    color: "darkgray"
  },
  middleContainerText2: {
    fontSize: wp("5.5%"),
    fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
    textAlign: "center",
    color: "darkgray"
  },
  bottomContainerText: {
    fontSize: wp("5%"),
    fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
    textAlign: "center",
    color: "white",
    lineHeight: hp("4%"),
    margin: wp("2%"),
  },
  noThanksButtonView: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    width: "90%",
    height: hp('7%'),
    marginTop: hp('1.5%')
  },
  yesButtonView: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    width: "90%",
    height: hp('7%'),
    marginTop: hp('1.5%')
  },

  yesButton: {
    fontSize: wp("3%"),
    textAlign:"center",
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
  },

  noButton: {
    fontSize: wp("3%"),
    textAlign:"center",
    color: "white",
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
  }
});
