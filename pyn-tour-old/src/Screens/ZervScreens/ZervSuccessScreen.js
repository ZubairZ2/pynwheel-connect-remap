import React, { Component } from "react";
import { Platform, StyleSheet, Text, View, Image, TouchableOpacity, ImageBackground, } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

import R from "../../assest/R";
import GoButton from '../../Library/Components/GoButton'
import CopyRight from "../../Library/Components/Copyright"
import Singleton from "../../Singleton"
import Header from '../../Library/Components/Header'

export default class ZervSuccessScreen extends Component {

    pressOk = () => {
        const { navigation } = this.props;
        const tourData = navigation.getParam('tourData', '');
        if (Singleton.getInstance().getTourSetting().tour_start_point_lock_type !== "") {
            setTimeout(() => {
                if (Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Latch" || Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Dwelo" || Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "EdgeState" || Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Manual" || Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Zerv") {
                    this.props.navigation.replace("StartPointLockCode", { tourData: tourData })
                } else {
                }
            }, 500);
        }
        else if (Singleton.getInstance().getTourSetting().show_map) {
            setTimeout(() => {
                this.props.navigation.replace("TourMap", { tourData: tourData })
            }, 500);
        }
        else {
            this.props.navigation.replace("TourContainer", { tourData: tourData })
        }
    }

    render() {
        const { navigation } = this.props;
        return (
            <View style={styles.container}>
                <ImageBackground
                    source={R.images.backgroundImage}
                    style={{ flex: 1, alignItems: 'center', width: null, height: null }}
                    imageStyle={{
                        resizeMode: "stretch"
                    }}>
                    <Header backBtnVisible={true}  title= "ACCESS VERIFICATION" navigation={navigation} onGoBack={() => {
                        if (navigation.goBack()) {
                            navigation.goBack()
                        } else {
                            navigation.replace("Home")
                        }
                    }} />
                    <View style={styles.upperContainer}>
                        <Text style={styles.upperContainerText}>Thank you!</Text>
                        <Text style={styles.letsStartText}>Now, let's start your tour!</Text>
                    </View>
                    <GoButton goPressed={() => this.pressOk()} />
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
        flex: 1.5,
        width: wp('75%'),
        alignItems: "center",
        marginTop: hp('30%'),
    },
    upperContainerText: {
        fontSize: wp("10%"),
        fontFamily: Platform.OS === "android" ? "GothamBold" : "Gotham-Bold",
        textAlign: "center",
        lineHeight: 35,
        color: "white"
    },

    letsStartText: {
        fontSize: wp("5%"),
        fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
        textAlign: "center",
        marginTop: 10,
        lineHeight: 35,
        color: "white"
    },
});
