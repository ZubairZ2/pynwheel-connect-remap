import React from "react";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
//import CountryPicker, { getAllCountries } from 'react-native-country-picker-modal'
import { Image, ImageBackground, KeyboardAvoidingView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
//const NORTH_AMERICA = ['CA', 'MX', 'US']
//import NetInfo from '@react-native-community/netinfo'
import R from "../../../assest/R";
import styles from "./styles";
//import { Dropdown } from 'react-native-material-dropdown';
import LoadingIndicator from "../../../Components/LoadingIndicator";
import CopyRight from "../../../Library/Components/Copyright";
import Header from '../../../Library/Components/Header/index';
import { shareTourData } from "../../../Library/ServerCalls/API";


export default class ShareScreenpp extends React.Component {

    constructor() {
        super();
        var tourID = null;
        // let userLocaleCountryCode = DeviceInfo.getDeviceCountry()
        // const userCountryData = getAllCountries()
        //     .filter(country => NORTH_AMERICA.includes(country.cca2))
        //     .filter(country => country.cca2 === userLocaleCountryCode)
        //     .pop()
        // let callingCode = null
        // let cca2 = userLocaleCountryCode
        // if (!cca2 || !userCountryData) {
        //     cca2 = 'US'
        //     callingCode = '1'
        // } else {
        //     callingCode = userCountryData.callingCode
        // }
        this.state = {
            yourName: null,
            recepientsName: null,
            phoneNumber: null,
            emailAddress: null,
            loginButtonDisable: false,
            emailIDIsValid: false,
            isNetConnected: true,

            callingCode: '1',
            isLoading: false,
            errorMessageText: "Please enter your email address",
        };
    }

    componentDidMount() {
        const { navigation } = this.props;
        const value = navigation.getParam("tourID", null);
        this.tourID = value;
        //this.CheckConnectivity();
    }

    // CheckConnectivity = () => {
    //     // For Android devices
    //     if (Platform.OS === "android") {
    //         NetInfo.isConnected.fetch().then(isConnected => {
    //             if (isConnected) {
    //                 this.setState({
    //                     isNetConnected: true
    //                 });
    //             } else {
    //                 this.setState({
    //                     isNetConnected: false
    //                 });
    //             }
    //         });
    //     } else {
    //         // For iOS devices
    //         NetInfo.isConnected.addEventListener(
    //             "connectionChange",
    //             this.handleFirstConnectivityChange
    //         );
    //     }
    // };

    // handleFirstConnectivityChange = isConnected => {
    //     NetInfo.isConnected.removeEventListener(
    //         "connectionChange",
    //         this.handleFirstConnectivityChange
    //     );
    //     if (isConnected === false) {
    //         this.setState({
    //             isNetConnected: false
    //         });
    //     } else {
    //         this.setState({
    //             isNetConnected: true
    //         });
    //     }
    // };

    validate = (text) => {

        this.setState({
            errorMessageText: "Please enter your email address",
        })
        let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (reg.test(text) === false) {
            console.log("Email is not correct");
            this.setState({
                emailAddress: text,
                loginButtonDisable: true,
            })
            return false;
        }
        else {
            this.setState({
                emailAddress: text,
                loginButtonDisable: false,
                emailIDIsValid: true,
            })
        }
    }

    validateUserDate = () => {
        if (this.state.yourName === null) {
            alert("Please enter name")
        }
        else if (this.state.recepientsName === null) {
            alert("Please enter recepients name")
        }
        // else if (this.state.phoneNumber === null) {
        //     alert("Please enter Phone Number")
        // }
        else if (this.state.emailIDIsValid === false) {
            alert("Please enter valid email address")
        }
        else {
            return true
        }
        return false
    }

    sharePressed = () => {
        if (this.state.isNetConnected) {
            if (this.validateUserDate() !== false) {
                this.setState({
                    isLoading: true,
                })
                // debugger
                //var hello = this.state.callingCode
                shareTourData(this.tourID, this.state.yourName, this.state.recepientsName, (this.state.callingCode + this.state.phoneNumber), this.state.emailAddress)
                    .then(response => response.json())
                    .then(responseJson => {
                        this.setState({ isLoading: false })
                        if (responseJson.success) {
                            this.setState({
                                isLoading: false,
                                yourName: null,
                                recepientsName: null,
                                phoneNumber: null,
                                emailAddress: null,
                            })
                            this.props.navigation.navigate("ShareSuccess");
                        } else {
                            this.setState({ isLoading: false })
                            setTimeout(() => { alert('Something went wrong, please try again.'); }, 800);
                        }
                    })
                    .catch(error => {
                        this.setState({ isLoading: false });
                        setTimeout(() => {
                            alert('Something went wrong, please try again.');
                        }, 800);
                        //console.log(error);
                    });
            }
        } else {
            alert("Please check internet connection.");
        }
    };

    render() {
        const { navigation } = this.props;

        return (
            <ImageBackground source={R.images.backgroundImage} style={styles.mainContanier}
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
                <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
                {/* <Spinner visible={this.state.isLoading} textStyle={styles.spinnerTextStyle} /> */}
                <LoadingIndicator visible={this.state.isLoading}  />
                <KeyboardAvoidingView style={{ flex: 1, alignItems: 'center' }} behavior='padding'>
                    <View style={styles.mainView}>
                        <View style={styles.nameView}>
                            <Text style={{ color: 'white', fontSize: wp('3%'), fontWeight: 'bold' }}>FROM: </Text>
                            <View style={styles.InputTextView}>
                                <TextInput
                                    value={this.state.yourName}
                                    //onChangeText={(text) => this.validate(text)}
                                    onChangeText={(text) => this.setState({ yourName: text })}
                                    placeholderTextColor='gray'
                                    placeholder="Your name"
                                    maxLength={40}
                                    style={{
                                        flex: 1,
                                        marginLeft: wp('3%'),
                                        backgroundColor: "black",
                                        color: "white",
                                        borderColor: 'blue'
                                    }}
                                />
                            </View>
                        </View>
                        <View style={styles.recepientNameView}>
                            <Text style={{ color: 'white', fontSize: wp('3%'), fontWeight: 'bold' }}>TO: </Text>
                            <View style={styles.InputTextView}>
                                <TextInput
                                    value={this.state.recepientsName}
                                    //onChangeText={(text) => this.validate(text)}
                                    onChangeText={(text) => this.setState({ recepientsName: text })}
                                    placeholderTextColor='gray'
                                    placeholder="Recepient's name"
                                    maxLength={40}
                                    style={{
                                        flex: 1,
                                        marginLeft: wp('3%'),
                                        backgroundColor: "black",
                                        color: "white",
                                        borderColor: 'blue'
                                    }}
                                />
                            </View>
                        </View>
                        <View style={styles.emailAddressView}>
                            <Text style={{ color: 'white', fontSize: wp('3%'), fontWeight: 'bold' }}>EMAIL ADDRESS: </Text>
                            <View style={styles.InputTextView}>
                                <TextInput
                                    value={this.state.emailAddress}
                                    onChangeText={(text) => this.validate(text)}
                                    //onChangeText={(text) => this.setState({ emailAddress:text})}
                                    placeholderTextColor='gray'
                                    keyboardType='email-address'
                                    placeholder="example@gmail.com"
                                    maxLength={50}
                                    style={{
                                        flex: 1,
                                        marginLeft: wp('3%'),
                                        backgroundColor: "black",
                                        color: "white",
                                        borderColor: 'blue'
                                    }}
                                />
                            </View>
                        </View>
                        <View style={{ marginTop: hp('45%'), width: wp("95%"), height: hp("20%") }}>
                            <TouchableOpacity onPress={() => this.sharePressed()} style={{ backgroundColor: "#D3D3D3", width: wp('95%'), height: hp('7%'), alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: wp('25%') }}>
                                    <Image style={{ height: hp('3%'), width: wp('6%'), resizeMode: 'contain' }} source={R.images.share} />
                                    <Text style={{ marginLeft: wp('2%'), fontSize: wp('3.5%') }}>SHARE</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
                <CopyRight />
            </ImageBackground>
        );
    }
}
