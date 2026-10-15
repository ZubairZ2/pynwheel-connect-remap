import React, { Component } from "react";
import { Platform, StyleSheet, TouchableOpacity, Text, View, FlatList, ImageBackground, Dimensions, Image, AppState, UIManager, LayoutAnimation, Animated, ScrollView } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import { WebView } from 'react-native-webview';
import HeaderBackButton from 'react-navigation-stack';
import Spinner from "react-native-loading-spinner-overlay";

import R from "../../assest/R";
import Singleton from '../../Singleton';
import GoButton from '../../Library/Components/GoButton'
import CopyRight from "../../Library/Components/Copyright"
import { unlockDoor } from "../../Library/ServerCalls/API"
import Header from '../../Library/Components/Header/index'

import { Igloo } from '../../Library/IglooManager'
import LoadingIndicator from "../../Components/LoadingIndicator";
const igloo = new Igloo()

export default class StartPointLockCode extends Component {
    static navigationOptions = ({ navigation }) => {
        return {
            title: typeof (navigation.state.params) === 'undefined' || typeof (navigation.state.params.title) === 'undefined' ? '' : navigation.state.params.title.toUpperCase(),
        }
    }

    state = {
        latchLink: "",
        isLoading: false,
        ZervMessageForUse: "",
        //Dwelo lock 
        unit_dwelo_lock_id: "",
        unlockDoorLoading: false,
        showUnlockNotWorkingButton: true,

    }

    constructor() {
        super()
        this.showUnlockNotWorkingButtonCounter = 0
        this.lockListener = null
        this.initIgloo()
    }

    initIgloo() {
        igloo.initialize()
            .then((initialize) => {
                console.log({ initialize })
            })
    }

    componentDidMount() {
        const { navigation } = this.props;
        const tourData = navigation.getParam('tourData', '');
        if (Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Latch") {
            this.setLatchLockData(tourData)
        } else if (Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Dwelo") {
            this.setDweloLockData(tourData)
        }
        else if (Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Igloohome") {
            this.setigloohomeLockData(tourData)
        } else if (Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "EdgeState" || Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Manual" || Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Zerv") {
            this.setTourData(tourData);
        }
    }

    setTourData = (tourData) => {
        this.tourData = tourData
        this.tourStops = tourData.tour_stop
        this.setState({
            ZervMessageForUse: this.tourStops[0].guest_pin
        })
    }

    setLatchLockData = (tourData) => {
        this.tourData = tourData
        this.tourStops = tourData.tour_stop
        this.ChangeThisTitle(this.tourStops[0].navigation_title)
        if (this.tourStops[0].latch_link !== "") {
            this.setState({
                latchLink: this.tourStops[0].latch_link,
                isLoading: true
            })
        }
    }

    setDweloLockData = (tourData) => {
        this.tourData = tourData
        this.tourStops = tourData.tour_stop
        // this.ChangeThisTitle(this.tourStops[0].navigation_title)
        this.setState({
            unit_dwelo_lock_id: this.tourStops[0].unit_dwelo_lock_id
        })
    }

    setigloohomeLockData = (tourData) => {
        this.tourData = tourData
        this.tourStops = tourData.tour_stop
        // this.ChangeThisTitle(this.tourStops[0].navigation_title)
        this.igloohome_lock_id = this.tourStops[0].igloohome_lock_id
        this.igloohome_guest_bluetooth_key = this.tourStops[0].igloohome_guest_bluetooth_key
        this.igloohome_guest_pin = this.tourStops[0].igloohome_guest_pin

    }

    //Dwelo lock 
    unlockDoor = () => {
        this.setState({ unlockDoorLoading: true })
        // debugger
        unlockDoor(this.state.unit_dwelo_lock_id)
            .then(response => response.json())
            .then(responseJson => {
                this.setState({ unlockDoorLoading: false })
                setTimeout(() => {
                    if (responseJson.success) {
                        this.setState({ showUnlockNotWorkingButton: false })
                        alert("Door is unlocked now")
                    } else {
                        if (this.showUnlockNotWorkingButtonCounter > 2) {
                            this.setState({ showUnlockNotWorkingButton: true })
                            this.showUnlockNotWorkingButtonCounter = 0
                        } else {
                            alert("If the door does not unlock after multiple tries, call our support team at 415-582-6701 and we will issue you with a temporary pin code in order to gain access.")
                            this.showUnlockNotWorkingButtonCounter = this.showUnlockNotWorkingButtonCounter + 1
                        }
                    }
                }, 800);
            })
            .catch(error => {
                this.showServerError()
                this.setState({ isLoading: false });
            });
    };

    //Dwelo lock 
    unlockIglooHomeDoor = () => {
        this.scan()
    };

    scan = () => {
        this.setState({ unlockDoorLoading: true })
        console.log("Scan start")
        const scanTimeout = setTimeout(() => {
            if (this.lockListener) { this.lockListener.remove(); this.lockListener = null }
            igloo.disposeConnection()
            this.iglooLockError()
        }, 60000)
        igloo.scanLocks()
            .catch((error) => {
                console.log({ error })
                clearTimeout(scanTimeout)
                if (this.lockListener) { this.lockListener.remove(); this.lockListener = null }
                this.iglooLockError()
            })
        console.log("Scan Litener start")
        if (this.igloohome_lock_id !== "" && this.igloohome_guest_bluetooth_key !== "") {
            this.lockListener = igloo.iglooLockListener((lockID) => { // listen for locks scan
                console.log("StartPoint: lock scanned:", lockID)
                if (lockID && typeof lockID === 'string' && lockID.startsWith('ERROR:')) {
                    clearTimeout(scanTimeout)
                    if (this.lockListener) { this.lockListener.remove(); this.lockListener = null }
                    this.iglooLockError()
                    return
                }
                if (lockID && this.igloohome_lock_id === lockID) {
                    console.log("Lock found", { lockID })
                    clearTimeout(scanTimeout)
                    if (this.lockListener) { this.lockListener.remove(); this.lockListener = null }
                    igloo.disposeConnection()
                        .then((disposed) => {
                            console.log("Dispose success", { disposed })
                            igloo.connect(this.igloohome_lock_id, this.igloohome_guest_bluetooth_key).then((connect) => { //1 connect with blk
                                console.log("connect success")
                                igloo.unlock() // unlock the lock
                                    .then((unlock) => {
                                        this.setState({ unlockDoorLoading: false })
                                        setTimeout(() => {
                                            alert("Door is unlocked now")
                                        }, 800);
                                    })
                                    .catch((unlockError) => {
                                        console.log("unlock error", unlockError)
                                        this.iglooLockError()
                                    })
                            }).catch((connectError) => {
                                this.iglooLockError()
                            })
                        }).catch((disposeError) => {
                            this.iglooLockError()
                        })
                }
            })
        }
        else {
            clearTimeout(scanTimeout)
            this.iglooLockError()
        }
    }
    iglooLockError = () => {
        this.setState({ unlockDoorLoading: false })
        setTimeout(() => {
            alert("If the door does not unlock automatically, use pin code " + this.igloohome_guest_pin + " in order to gain access. \n Note: Tap to wake the lock first then enter pin code provided above.")
        }, 800);
    }


    unlockNotWorking = () => {
        this.props.navigation.navigate("UnlockDoorPin")
    }

    //Latch Methods
    ChangeThisTitle = (titleText) => {
        const { setParams } = this.props.navigation;
        setParams({ title: "Starting Point" })
    }

    handleWebViewNavigationStateChange = newNavState => {
        // debugger
        const { url } = newNavState;
        if (!url) return;
        console.log(newNavState.loading)
        console.log(url)
        if (!newNavState.loading) {
            setTimeout(() => {
                this.setState({ isLoading: false })
            }, 2500);
        }
        // one way to handle errors is via query string
        if (url.includes('?errors=true')) {
            this.setState({ isLoading: false })
        }
    };

    /////////////Move to map screen/////////////////
    nextButtonPressed = () => {
        const { navigation } = this.props;
        const tourData = navigation.getParam('tourData', '');
        if (Singleton.getInstance().getTourSetting().show_map)
            this.props.navigation.replace("TourMap", { tourData: tourData })
        else
            this.props.navigation.replace("TourContainer", { tourData: tourData })
    }

    render() {
        const { navigation } = this.props;
        // debugger
        return (
            <View style={styles.container}>
                <ImageBackground source={R.images.backgroundImage} style={styles.backGroundImage}
                    imageStyle={{ resizeMode: "stretch" }}>
                    <Header backBtnVisible={true} title="Starting Point" navigation={navigation} onGoBack={() => {
                        // navigation.replace("TourReview");
                        navigation.goBack()
                        // if (navigation.goBack()) {
                        //     // navigation.goBack()
                        //     navigation.replace("TourReview");
                        // } else {
                        //     navigation.replace("Welcome");
                        // }
                    }} />

                    {/* Zerv View */}
                    {Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Zerv" ? <View style={{}}>
                        <Text style={{ fontSize: wp("5%"), fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light", textAlign: "center", marginTop: hp('20%'), lineHeight: 35, color: "white" }}>{this.state.ZervMessageForUse} </Text>
                    </View> : null}
                    {/* Edge State View */}
                    {Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "EdgeState" || Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Manual" ? <View style={{}}>
                        <Text style={{ fontSize: wp("5%"), fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light", textAlign: "center", marginTop: hp('20%'), lineHeight: 35, color: "white" }}>{this.state.ZervMessageForUse} </Text>
                        <Text style={{ fontSize: wp("5%"), fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light", textAlign: "center", marginTop: 30, lineHeight: 35, color: "white" }}>Your tour has started. Use the code above to unlock the door. Enjoy your tour!</Text>
                    </View> : null}
                    {/* Latch  */}
                    {Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Latch" ? <View>
                        {/* <Spinner textContent={"Please wait while the door code loads."} visible={this.state.isLoading} textStyle={styles.spinnerTextStyle} /> */}
                        <Spinner textContent={"Please wait while the door code loads."} visible={this.state.isLoading} textStyle={styles.spinnerTextStyle} />
                        <View style={{ marginTop: hp('10%'), height: hp('10%'), width: wp('100%'), alignItems: 'center' }} >
                            <WebView style={{ height: hp("100%"), width: wp("100%"), backgroundColor: 'black' }}
                                source={{ uri: this.state.latchLink }}
                                //source={{ uri: "https://latch.link/HsoGiCClJqUUEpPnqJZC" }}
                                onNavigationStateChange={this.handleWebViewNavigationStateChange}
                            // onMessage={(event) => {
                            //     alert(event.nativeEvent.data);
                            //   }}
                            // injectedJavaScript={runFirst}
                            />
                        </View>
                        <Text style={{ fontSize: wp("5%"), fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light", textAlign: "center", marginTop: 30, lineHeight: 35, color: "white" }}>Your tour has started. Use the code above to unlock the door. Enjoy your tour!</Text>
                    </View> : null}



                    {/* Dwolo lock  */}
                    {Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Dwelo" ? <View>
                        {/* <Spinner visible={this.state.unlockDoorLoading} textStyle={styles.spinnerTextStyle} /> */}
                        <LoadingIndicator visible={this.state.unlockDoorLoading} />
                        <View style={{ height: hp("9%"), marginTop: hp('15%'), width: wp('100%'), alignItems: 'center' }} >
                            <TouchableOpacity onPress={() => this.unlockDoor()}>
                                <View style={{
                                    width: wp("95%"),
                                    height: hp("6.8%"),
                                    backgroundColor: "black",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    flexDirection: 'row'
                                    //orientation: 'row'
                                }}>
                                    <Image source={R.images.dooricon}
                                        style={{ width: wp("5%"), height: hp("5%"), resizeMode: "contain" }} />
                                    <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), lineHeight: wp('3.5%'), marginLeft: hp('2.5%'), fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold", }}>UNLOCK DOOR</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={{ top: hp("2%"), width: wp("80%"), height: hp("3%"), }} onPress={() => this.unlockNotWorking()}>
                                <Text style={{
                                    textAlign: 'center',
                                    color: "white",
                                    fontSize: hp('1.8%'),
                                    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
                                }}>NOT WORKING?</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: wp("5%"), fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light", textAlign: "center", marginTop: 30, lineHeight: 35, color: "white" }}>Your tour has started. Touch the button above to unlock the door. Make sure your phone is in close proximity to the door. Enjoy your tour!</Text>
                    </View> : null}

                    {/* Igloohome lock  */}
                    {Singleton.getInstance().getTourSetting().tour_start_point_lock_type === "Igloohome" ? <View>
                        {/* <Spinner visible={this.state.unlockDoorLoading} textStyle={styles.spinnerTextStyle} /> */}
                        <LoadingIndicator visible={this.state.unlockDoorLoading}/>
                        <View style={{ height: hp("9%"), marginTop: hp('15%'), width: wp('100%'), alignItems: 'center' }} >
                            <TouchableOpacity onPress={() => this.unlockIglooHomeDoor()}>
                                <View style={{
                                    width: wp("95%"),
                                    height: hp("6.8%"),
                                    backgroundColor: "black",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    flexDirection: 'row'
                                    //orientation: 'row'
                                }}>
                                    <Image source={R.images.dooricon}
                                        style={{ width: wp("5%"), height: hp("5%"), resizeMode: "contain" }} />
                                    <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), lineHeight: wp('3.5%'), marginLeft: hp('2.5%'), fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold", }}>UNLOCK DOOR</Text>
                                </View>
                            </TouchableOpacity>
                            {/* <TouchableOpacity style={{ top: hp("2%"), width: wp("80%"), height: hp("3%"), }} onPress={() => this.unlockNotWorking()}>
                                <Text style={{
                                    textAlign: 'center',
                                    color: "white",
                                    fontSize: hp('1.8%'),
                                    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
                                }}>NOT WORKING?</Text>
                            </TouchableOpacity> */}
                        </View>
                        <Text style={{ fontSize: wp("5%"), fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light", textAlign: "center", marginTop: 30, lineHeight: 35, color: "white" }}>Your tour has started. Touch the button above to unlock the door. Make sure your phone is in close proximity to the door. Enjoy your tour!</Text>
                    </View> : null}

                    <GoButton goPressed={() => this.nextButtonPressed()} />
                </ImageBackground>
                <CopyRight />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5FCFF" },
    backGroundImage: { backgroundColor: 'black', flex: 1, flexDirection: 'column' },
});
