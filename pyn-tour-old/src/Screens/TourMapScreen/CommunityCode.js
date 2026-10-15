import React, { Component } from "react";
import { Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Config from 'react-native-config';
import Spinner from "react-native-loading-spinner-overlay";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { NavigationEvents } from 'react-navigation';
import { connect } from 'react-redux';

import { NavigationActions, StackActions } from 'react-navigation';
import LoadingIndicator from "../../Components/LoadingIndicator";
import CopyRight from "../../Library/Components/Copyright";
import GoButton from '../../Library/Components/GoButton';
import Header from '../../Library/Components/Header';
import { trackTourUserActivity } from '../../Library/Managers/APICalls';
import ActivityTrackerManager from '../../Library/Managers/ActivityTrackerManager';
import { deleteTourStop, generateLocksAccessesFromServer, getRemortAlocationStatus, verifyCommuityOTP } from '../../Library/ServerCalls/API';
import Singleton from '../../Singleton';
import { downloadFiles } from '../../Utils/Helpers';
import R from "../../assest/R";
import { setShowChatButton } from '../../redux/actions/chatActions';
import { authenticateZerv } from '../TourReview/ZERV';
class CommunityCode extends Component {
    constructor(props) {
        super(props)
        this.lockAccessCallInProgress = false
        this.deletedStopsID = null
        this.state = {
            isLoading: false,
            isGifLoading: false,
            otp: null,
        }
    }

    componentDidMount() {
        const { navigation } = this.props
        this.deletedStopsID = navigation.getParam('deletedStopsID', '');
        console.log("this.deletedStopsID", this.deletedStopsID)
    }

    componentWillUnmount() {
        // AppState.removeEventListener('change', this._handleAppStateChange);
        clearInterval(this.checkLockStatusTimer);
    }

    pressOk = () => {
        if (!this.validateOTP()) return this.showAlert("Invalid OTP")
        const { otp } = this.state
        this.setState({ isLoading: true })
        verifyCommuityOTP(otp)
            // .then((res) => {
            .then(response => response.json())
            .then(res => {
                console.log("res Hello", res)
                if (res.success) {
                    // if (true) {
                    //this.showAlert("Sucess")
                    this.checkloclAccess()
                } else {
                    setTimeout(() => {
                        this.setState({ isLoading: false })
                    }, 1000)
                    this.showAlert(res.message)
                }
            }).catch((error) => {
                this.setState({ isLoading: false })
                this.showAlert(error)
            })
    }

    showAlert = (message) => {
        setTimeout(() => {
            alert(message)
        }, 100);
    }


    checkloclAccess = () => {
        this.setState({ isGifLoading: true })
        this.generateLocksAccesses()
        //this.checkLockStatusTimer = setInterval(this.checkLockStatusTimerTick, 4000)
    }

    generateLocksAccesses = () => {
        generateLocksAccessesFromServer()
            .then(response => response.json())
            .then(responseJson => {
                if ((typeof (responseJson.status !== 'undefined')) || responseJson.status !== null) {
                    if (responseJson.code == 200) {
                        this.setState({ isGifLoading: true })
                        this.checkLockStatusTimer = setInterval(this.checkLockStatusTimerTick, 4000)
                    }
                }
                else { this.showServerError() }
            })
            .catch(() => {
                this.showServerError()
            });
    };

    checkLockStatusTimerTick = () => {
        if (!this.lockAccessCallInProgress) {
            this.lockAccessCallInProgress = true
            this.checkLockStatus()
        }
    }

    checkLockStatus() {
        getRemortAlocationStatus()
            .then(response => response.json())
            .then(async (responseJson) => {
                this.lockAccessCallInProgress = false
                if (typeof (responseJson.completed) !== 'undefined') {
                    if (responseJson.success) {
                        this.deleteTourStops()
                        clearInterval(this.checkLockStatusTimer);
                    }
                }
                else {
                    clearInterval(this.checkLockStatusTimer);
                    this.setState({ isGifLoading: false });
                    this.showServerError()
                }
            })
            .catch(() => {
                clearInterval(this.checkLockStatusTimer);
                this.setState({ isGifLoading: false });
                this.showServerError()
            });
    }

    deleteTourStops = () => {
        this.setState({ isGifLoading: true })
        deleteTourStop(this.deletedStopsID, Singleton.getInstance().getLocksThreadRef())
            .then(response => response.json())
            .then(async (responseJson) => {
                if (typeof (responseJson.tours) !== 'undefined') {
                    if (responseJson.tours.length !== 0) {
                        var activeTourTemp = responseJson.tours[0]
                        activeTourTemp = await downloadFiles(activeTourTemp)
                        Singleton.getInstance().setTourKey(activeTourTemp.tour_key)
                        Singleton.getInstance().setTourId(activeTourTemp.id)
                        Singleton.getInstance().setTourSetting(activeTourTemp.tour_setting)
                        this.props.setChatButtonStatus(activeTourTemp.tour_setting.chat_control)
                        Singleton.getInstance().setLastMessageId(activeTourTemp.tour_setting.last_message_id)
                        Singleton.getInstance().setZervCredentials(activeTourTemp.tour_setting.pynwheel_access_username, activeTourTemp.tour_setting.pynwheel_access_password)
                        this.activeTourData = activeTourTemp
                        this.startUserTracking()
                    }
                }
                else { this.showServerError() }
            })
            .catch(() => {
                this.setState({ isGifLoading: false });
                this.showServerError()
            });
    };

    startUserTracking() {
        ActivityTrackerManager.getInstance().setClear()
        ActivityTrackerManager.getInstance().setArrivedTime()
        trackTourUserActivity()
            .then(response => response.json())
            .then(responseJson => {
                if (typeof (responseJson.data) !== 'undefined') {
                    ActivityTrackerManager.getInstance().setID(responseJson.data.id)
                    if (responseJson.data.id_mismatch === true) {
                        this.props.navigation.navigate("IdVerificationError")
                    }
                    else if (Singleton.getInstance().getTourSetting().authenticate_zerv) {
                        this.authenticateZerv()
                    }
                    else {
                        this.moveFowrwed()
                    }
                    this.setState({ isGifLoading: false });
                } else {
                    this.showServerError()
                }
            })
            .catch(() => {
                this.setState({ isGifLoading: false });
                this.showServerError()
            });
    }

    authenticateZerv = () => {
        setTimeout(() => {
            const phone = Singleton.getInstance().getTourUserData()?.phone_number
            const zervUser = this.activeTourData.tour_setting.pynwheel_access_username
            const password = this.activeTourData.tour_setting.pynwheel_access_password
            const data = {
                phone, zervUser, password
            }
            // this.moveToTourMapScreen("ZervOTPScreen", { tourData: this.activeTourData, phone }) zerv screens are not in use may be we can remove
            authenticateZerv((res) => {
                // success
                this.moveFowrwed()
            }, (error) => {
                // failure
                alert(error)
            }, data)
        }, 500);
    }

    moveFowrwed = () => {
        this.setState({ isLoading: false })
        if (Singleton.getInstance().getTourSetting().tour_start_point_lock_type !== "") {
            setTimeout(() => {
                this.moveToTourMapScreen("StartPointLockCode", { tourData: this.activeTourData })
            }, 500);
        }
        else if (Singleton.getInstance().getTourSetting().show_map) {
            setTimeout(() => {
                this.moveToTourMapScreen("TourMap", { tourData: this.activeTourData })
            }, 500);
        }
        else {
            this.props.navigation.navigate("TourContainer", { tourData: this.activeTourData })
        }
    }

    moveToTourMapScreen = (name, params) => {
        const resetAction = StackActions.reset({
            index: 1,
            actions: [
                NavigationActions.navigate({ routeName: 'Home',}),
                NavigationActions.navigate({ routeName: name, params: params }),
            ],
        });
        // const resetAction = StackActions.reset({
        //     index: 0,
        //     actions: [NavigationActions.navigate({ routeName: name, params: params })],
        // });
        this.props.navigation.dispatch(resetAction)
    }

    showServerError = () => {
        this.setState({ isLoading: false });
        this.setState({ isGifLoading: false });
        this.setState({ message: " Server Error." })
        setTimeout(() => {
            alert('Server Error, Please try again.')
        }, 500);
    }


    validateOTP = () => {
        const { otp } = this.state
        // if (phone[0] + phone[1] != "+1") this.setState({ phone: "+1" + phone })
        if (!otp || String(otp).length < 5) { return false }
        return true
    }

    // getPhoneNumber = () => {
    //     this.props.navigation.navigate("ZervGetNumberScreen")
    // };

    /**
     * if navigated from i did not received a code then do not start auth process 
     * as it will send OTP again 
     * else start auth process (restore session if possible or auth user using OTP)
     */

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
                            <Spinner
                                visible={this.state.isGifLoading}
                                //textStyle={{ color: '#FFF' }}  
                                animation='fade'
                                children={<ImageBackground source={R.images.backgroundImage} style={styles.backgroundImage} imageStyle={{
                                    resizeMode: 'stretch'
                                }} >
                                    <Image source={R.images.gifCreateTour} style={styles.gifLoader} defaultSource={R.images.gifCreateTour} />
                                    {Config.ENV === 'lincoln' ? <Text style={styles.loderText}>CREATING TOUR...</Text> : null}
                                </ImageBackground>} />
                            {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
                            <LoadingIndicator visible={this.state.isLoading} />
                            <KeyboardAvoidingView
                                keyboardVerticalOffset={0.1}
                                behavior={Platform.OS === "android" ? "height" : "position"}>
                                <View style={styles.upperContainer}>
                                    <Text style={styles.upperContainerText}>Please check in with leasing staff to get a code to enter below to proceed with the tour.</Text>
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
                                    {/* <TouchableOpacity style={styles.btn} onPress={this.getPhoneNumber}>
                                <Text style={styles.didNotReceiveText}>I did not receive a code</Text>
                            </TouchableOpacity> */}
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

export default connect(mapStateToPropsps, mapDispatchToProps)(CommunityCode)
function mapStateToPropsps(state) {
    return {
        //showChatButton1: state.chatReducer && state.chatReducer.showChatButton
    }
}

function mapDispatchToProps(dispatch) {
    return {
        //setUnreadMegCount: payload => dispatch(setUnreadMessageCount(payload)),
        setChatButtonStatus: payload => dispatch(setShowChatButton(payload)),
    }
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black"
    },
    backgroundImage: { flex: 1, alignItems: "center", justifyContent: "center", width: null, height: null, },
    gifLoader: { width: Config.ENV === 'lincoln' ? wp("70%") : wp("100%"), height: Config.ENV === 'lincoln' ? hp("30%") : hp("100%"), marginBottom: Config.ENV === 'lincoln' ? hp("3%") : 0, resizeMode: 'contain', bottom: hp('.5%') },
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
    loderText: {
        fontSize: hp('3%'),
        color: 'white',
        textAlign: 'center',
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
    },

});
