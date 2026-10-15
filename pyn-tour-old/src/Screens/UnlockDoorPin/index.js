import { black } from "ansi-colors";
import React, { Component } from "react";
import { Platform, StyleSheet, Text, View, TouchableOpacity, ImageBackground, } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

import R from "../../assest/R";
import CopyRight from "../../Library/Components/Copyright"
import Singleton from "../../Singleton"

import Header from '../../Library/Components/Header'


export default class App extends Component {
    state = {

    }
    componentWillMount() {
        const { navigation } = this.props;
        //this.setState({ floorPlanName: navigation.getParam("floorPlanName", "") })
    }
    pressOK = () => {
        // this.props.navigation.navigate("CheckUnitAvailaibility", { floorPlanName: this.state.floorPlanName, unitID: this.state.unitID, navigationForm: "ThanksUnitScreen" })
    }

    noThanksButtonPressed = () => {
        // if (Singleton.getInstance().getTourSetting().show_map) {
        //   Singleton.getInstance().setShouldUserMoveToNextStop(true)
        //   this.props.navigation.navigate("TourMap")
        // } 
        // else {
        //   Singleton.getInstance().setShouldUserMoveToNextStopOnStopList(true)
        //   this.props.navigation.navigate("TourContainer")
        // }

    }
    render() {
        const { navigation } = this.props;
        return (
            <View style={styles.container}>
                <ImageBackground
                    source={R.images.backgroundImage}
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: null,
                        height: null
                    }}
                    imageStyle={{
                        resizeMode: "stretch"
                    }}>
                    <Header backBtnVisible={true} title= "Call To Support team" navigation={navigation} onGoBack={() => {
                        if (navigation.goBack()) {
                            navigation.goBack()
                        } else {
                            navigation.replace("Welcome");
                        }
                    }} />
                    <View style={styles.middleContainer}>
                        <Text style={styles.middleContainerText}>If the door does not unlock after multiple tries, call our support team at 415-582-6701 and we will issue you with a temporary pin code in order to gain access.</Text>
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
        flex: 2.5,
        justifyContent: "flex-end",
        alignItems: "center"
    },
    middleContainer: {
        //flex: 0.5
        //backgroundColor: 'red'
    },
    bottomContainer: {
        flex: 2,
        justifyContent: "center"
    },
    bottomButtonsContainer: {
        flex: 0.5,
        justifyContent: "space-around",
        flexDirection: "row",
        marginBottom: 20
    },
    upperContainerText: {
        fontSize: wp("9.5%"),
        fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
        textAlign: "center",
        color: "white"
    },
    middleContainerText: {
        fontSize: wp("5%"),
        fontFamily: "Gotham-Light",
        textAlign: "center",
        lineHeight: 35,
        marginTop: 20,
        color: "white"
    },
    middleContainerText2: {
        fontSize: wp("5.5%"),
        fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
        textAlign: "center",
        color: "white"
    },
    bottomContainerText: {
        fontSize: wp("5%"),
        fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
        textAlign: "center",
        color: "white",
        lineHeight: hp("4%"),
        marginLeft: wp("3%"),
        marginRight: wp("3%")
    },
    noThanksButtonView: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
        width: "45%",
        height: 50
    },
    yesButtonView: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
        width: "45%",
        height: 50
    },

    yesButton: {
        fontSize: wp("3%")
        //fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light",
    },

    noButton: {
        fontSize: wp("3%"),
        color: "white"
        //fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light",
    }
});
