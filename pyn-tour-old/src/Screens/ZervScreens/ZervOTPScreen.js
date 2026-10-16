import React, { Component } from "react";
import { Platform, TextInput, StyleSheet, Text, View, TouchableOpacity, ImageBackground, ScrollView,KeyboardAvoidingView } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import Spinner from "react-native-loading-spinner-overlay";
import { NavigationEvents } from 'react-navigation'
import R from "../../assest/R";
import GoButton from '../../Library/Components/GoButton'
import CopyRight from "../../Library/Components/Copyright"
import Header from '../../Library/Components/Header'
import Singleton from '../../Singleton'

import {
    initSDK,
    authenticateCustomer,
    authenticateUser,
    verifyOTP,
} from '../../Library/ZervManager'
import LoadingIndicator from "../../Components/LoadingIndicator";

export default class ZervOTPScreen extends Component {
    constructor(props) {
        super(props)
        this.state = {
            envId: 'Production',
            initialized: false,
            customerAuthenticated: false,
            userVarified: false,
            isLoading: true,
            // +13039900834
            phone: props.navigation.getParam("phone") || "",
            username: Singleton.getInstance().getZervUsername(),
            password: Singleton.getInstance().getZervpassword(),
            otp: null
        }
    }
    async logoutSession(){
        initSDK(this.state.envId)
        .then((initResp)=>{
        }).catch((error)=>console.log({error}))
    }
    showAlert = (message) => {
        setTimeout(() => {
            alert(message)
        }, 100);
    }
    sendOTP = () => {
        const { envId, username, password, phone } = this.state
        this.setState({ isLoading: true })
        initSDK(envId).then(() => {
            console.log("SDK init success")
            authenticateCustomer(username, password).then(() => {
                console.log("Auth customer success")
                this.setState({ isLoading: true })
                authenticateUser(phone).then((success) => {
                    console.log("OTP sent succesfully",success)
                    this.setState({ isLoading: false })
                }).catch((error) => { this.setState({ isLoading: false }); this.showAlert(error) })
            }).catch((error) => { 
            console.log(error)
                this.setState({ isLoading: false }); 
            this.showAlert(error) })
        }).catch((error) => { this.setState({ isLoading: false }); this.showAlert(error) })
    }

    pressOk = () => {
        if (!this.validateOTP()) return this.showAlert("Invalid OTP")
        const { otp, phone } = this.state
        this.setState({ isLoading: true })
        verifyOTP(otp, phone)
            .then((res) => {
                this.setState({ isLoading: false })
                if(res==="Validate User OTP Success"){
                    this.moveNext()
                }else{
                    this.showAlert(res)
                }
                console.log("OTP res:", res)
            }).catch((error) => {
                this.setState({ isLoading: false })
                this.showAlert(error)
            })
    }
    validateOTP = () => {
        const { otp, phone } = this.state
        if (phone[0] + phone[1] != "+1") this.setState({ phone: "+1" + phone })
        if (!otp || String(otp).length < 5) { return false }
        return true
    }
    // if authentication success move to next screen
    moveNext = () => {
        const { navigation } = this.props;
        const tourData = navigation.getParam('tourData', '');
        navigation.replace("ZervSuccessScreen", { tourData: tourData })
    }

    getPhoneNumber = () => {
        this.props.navigation.navigate("ZervGetNumberScreen")
    };

    /**
     * if navigated from i did not received a code then do not start auth process 
     * as it will send OTP again 
     * else start auth process (restore session if possible or auth user using OTP)
     */
    onFocus = async () => {
        await this.logoutSession()
        const { navigation } = this.props
        let phone = navigation.getParam("phone") || null
        if (!phone || phone === "" || phone === " " || String(phone).length < 10) {
            this.setState({ isLoading: false });
            return this.getPhoneNumber()
        }
        if (phone[0] + phone[1] !== "+1" && phone?.length < 11) { phone = "+1" + phone }
        let isFromPhoneScreen = navigation.getParam("isFromPhoneScreen")
        this.setState({ phone }, () => {
            if (!isFromPhoneScreen) {
                this.sendOTP()
            }
        })
    }
    render() {
        const { navigation } = this.props;
        return (
            <>
            <Header backBtnVisible={true} title="ACCESS VERIFICATION" navigation={navigation} onGoBack={() => {
                            // navigation.replace("TourReview")
                            navigation.goBack()
                        }} />
            <ScrollView 
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{ flex: 1 }}>
                <View style={styles.container}>
                    <NavigationEvents onDidFocus={this.onFocus} />
                    <ImageBackground
                        source={R.images.backgroundImage}
                        style={{ flex: 1, alignItems: 'center', width: null, height: null }}
                        imageStyle={{
                            resizeMode: "stretch"
                        }}>
                        {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
                        <LoadingIndicator visible={this.state.isLoading}  />
                        <KeyboardAvoidingView 
                            keyboardVerticalOffset={0.1}
                            behavior={Platform.OS==="android"?"height":"position"}>
                        <View style={styles.upperContainer}>
                        <Text style={styles.upperContainerText}>You need to enter a code for us to give you access through locked doors on your tour. We will send a code to you via text at this number: {this.state.phone}. Please enter the code below </Text>
                            <View style={styles.codeInputView}>
                                <TextInput
                                    maxLength={6}
                                    keyboardType="number-pad"
                                    value={this.state.otp}
                                    onChangeText={(text) => this.setState({ otp: text })}
                                    placeholderTextColor='white'
                                    placeholder="Code"
                                    style={{ flex: 1, marginLeft: wp('3%'), backgroundColor: "black", color: "white", borderColor: 'blue' }}
                                />
                            </View>
                            <TouchableOpacity style={styles.btn} onPress={this.getPhoneNumber}>
                                <Text style={styles.didNotReceiveText}>I did not receive a code</Text>
                            </TouchableOpacity>
                        </View>
                        <GoButton goPressed={() => this.pressOk()} />
                        </KeyboardAvoidingView>
                        <CopyRight />
                    </ImageBackground>
                </View>
            </ScrollView>
            </>
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
        width: wp('99%'),
        alignItems: "center",
        marginTop: hp('10%'),
    },
    upperContainerText: {
        fontSize: wp("5%"),
        fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
        textAlign: "center",
        lineHeight: 33,
        color: "white"
    },
    btn: {
        alignSelf: "center",
        top: 40
    },
    didNotReceiveText: {
        fontSize: wp("5.5%"),
        fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
        textAlign: "center",
        lineHeight: 35,
        color: "white",
        textDecorationLine: 'underline',
    },
    codeInputView: {
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
});
