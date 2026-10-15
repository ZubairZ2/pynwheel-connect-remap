import React, { Component } from "react";
import { Platform, StyleSheet, Text, TextInput, View, Image, TouchableOpacity, ImageBackground, ScrollView, } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import Spinner from "react-native-loading-spinner-overlay";

import R from "../../assest/R";
import GoButton from '../../Library/Components/GoButton'
import CopyRight from "../../Library/Components/Copyright"
import Header from '../../Library/Components/Header'
import Singleton from '../../Singleton'

import {
    initSDK,
    authenticateCustomer,
    authenticateUser,
} from '../../Library/ZervManager'
import LoadingIndicator from "../../Components/LoadingIndicator";
export default class ZervGetNumberScreen extends Component {
    constructor() {
        super();
        this.state = {
            envId: 'Production',
            username: Singleton.getInstance().getZervUsername(),
            password: Singleton.getInstance().getZervpassword(),
            phone: null,
            phoneIsValid: false,
            isLoading: false
        }
    }

    showAlert = (message) => {
        setTimeout(() => {
            alert(message)
        }, 100);
    }
    validatePhoneNumer = (text) => {
        console.log(text);
        this.setState({
            errorMessageText: "Please enter your phone number",
        })
        // let reg = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        if (String(text).length < 12) {
            if (String(text).length > 8 && text[0] + [1] != "+1") {
                this.setState({ phone: "+1" + text, phoneIsValid: false })
            } else {
                this.setState({ phone: text, phoneIsValid: false })
            }
            return false;
        }
        else {
            if (String(text).length > 8 && text[0] + [1] != "+1") {
                this.setState({ phone: "+1" + text, phoneIsValid: true })
            } else {
                this.setState({ phone: text, phoneIsValid: true })
            }
        }
    }

    pressOk = () => {
        if (String(this.state.phone).length < 12) {
            this.showAlert("Please enter valid phone Number")
        }
        else {
            this.sendOTP()
        }
    }

    alert = (message) => {
        setTimeout(() => {
            alert(message)
        }, 100);
    }

    goBack = () => {
        const { navigation } = this.props
        navigation.navigate("ZervOTPScreen", { isFromPhoneScreen: true, phone: this.state.phone })
    }
    sendOTP = () => {
        const { envId, username, password, phone } = this.state
        this.setState({ isLoading: true })
        initSDK(envId).then((success) => {
            // this.alert("SDK init success")
            console.log("SDK init success")
            authenticateCustomer(username, password).then((success) => {
                // this.alert("Auth customer success")
                console.log("Auth customer success",success)
                this.setState({ isLoading: true })
                authenticateUser(phone).then((success) => {
                    // this.alert("Auth user success")
                    console.log("OTP sent succesfully",success)
                    this.setState({ isLoading: false })
                    this.goBack()
                }).catch((error) => { this.setState({ isLoading: false }); this.showAlert(error) })
            }).catch((error) => { this.setState({ isLoading: false }); this.showAlert(error) })
        }).catch((error) => { this.setState({ isLoading: false }); this.showAlert(error) })
    }
    render() {
        const { navigation } = this.props;

        return (
            <ScrollView contentContainerStyle={{ flex: 1 }}>
                <View style={styles.container}>
                    {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
                    <LoadingIndicator visible={this.state.isLoading} />
                    <ImageBackground
                        source={R.images.backgroundImage}
                        style={{ flex: 1, alignItems: 'center', width: null, height: null }}
                        imageStyle={{
                            resizeMode: "stretch"
                        }}>
                        <Header backBtnVisible={true} title= "ACCESS VERIFICATION"  navigation={navigation} onGoBack={() => {
                            if (navigation.goBack()) {
                                navigation.goBack()
                            } else {
                                navigation.replace("Home")
                            }
                        }} />
                        <View style={styles.upperContainer}>
                            <Text style={styles.upperContainerText}>Please enter a phone number to receive your code.</Text>
                        </View>
                        <View style={styles.phoneInputView}>
                            <TextInput
                                maxLength={12}
                                keyboardType="phone-pad"
                                value={this.state.phone}
                                onChangeText={(text) => this.validatePhoneNumer(text)}
                                placeholderTextColor='white'
                                placeholder="Phone Number"
                                style={{ flex: 1, marginLeft: wp('3%'), backgroundColor: "black", color: "white", borderColor: 'blue' }}
                            />
                        </View>
                        <GoButton goPressed={() => this.pressOk()} />
                        <CopyRight />
                    </ImageBackground>
                </View>
            </ScrollView>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",

    },
    mainView: {
        backgroundColor: 'red',
        height: hp("50%"),
    },
    upperContainer: {
        width: wp('80%'),
        alignItems: "center",
        marginTop: hp('28%'),
    },
    phoneInputView: {
        flexDirection: 'row',
        borderColor: "white",
        backgroundColor: "black",
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: wp("95%"),
        height: hp("7%"),
        marginTop: hp("3.5%"),
    },
    upperContainerText: {
        fontSize: wp("5%"),
        fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
        textAlign: "center",
        lineHeight: 30,
        color: "white"
    },
});
