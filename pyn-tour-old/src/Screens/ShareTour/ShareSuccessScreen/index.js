import React, { Component } from "react";
import { Platform, StyleSheet, Text, View, Image, TouchableOpacity, ImageBackground, } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

import R from "../../../assest/R";
import GoButton from '../../../Library/Components/GoButton'
import CopyRight from "../../../Library/Components/Copyright"
import Header from '../../../Library/Components/Header/index'


export default class App extends Component {
    state = {
        applyKnowVisited: false
    }
    pressOk = () => {
        this.props.navigation.navigate("SavedTour")
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
                    <Header backBtnVisible={true} title="SHARE" navigation={navigation} onGoBack={() => {
                        if (navigation.goBack()) {
                            navigation.goBack()
                        } else {
                            navigation.replace("Welcome");
                        }
                    }} />
                    <View style={styles.upperContainer}>
                        <Image source={R.images.success} style={styles.successImage} />
                        <Text style={styles.upperContainerText}>Success!</Text>
                        <Text style={styles.upperContainerText}>Your Tour Highlights have been shared</Text>
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
        marginTop: hp('20%'),
    },
    upperContainerText: {
        fontSize: wp("6%"),
        fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
        textAlign: "center",
        lineHeight: 35,
        color: "white"
    },
    successImage: {
        width: hp("14%"),
        height: hp("14%"),
        marginBottom: wp('6%'),
        resizeMode: "contain"
    }
});
