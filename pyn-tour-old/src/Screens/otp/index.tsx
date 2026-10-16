import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ImageBackground, TextInput, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Spinner from 'react-native-loading-spinner-overlay'
import { setLoginStatus, setLoginUserID } from "../../redux/actions/persistPropertyAction";
import { setLoginUser } from "../../redux/actions/loginUserAction";
import R from '../../assest/R';
import { useDispatch } from 'react-redux';
import Singleton from '../../Singleton';
import { verifyOtpFromServer, generateOTP, editProfileInfoApi } from "../../Library/ServerCalls/API";
import { resetNavigate } from '../../Utils/Helpers';
import Header from '../../Library/Components/Header';
import { setAccessToken } from '../../redux/actions/accessTokenAction';
import LoadingIndicator from '../../Components/LoadingIndicator';


const Otp: React.FC = ({ navigation }) => {
    // const route = useRoute();

    const otpIsValid = useRef(false)
    let timer = useRef<any>()
    const [timerCounter, setTimerCounter] = useState(60)
    const [resentCodeTitle, setresentCodeTitle] = useState("Resend code")
    const [resetButtonDiable, setresetButtonDiable] = useState(true)
    const [otp, setOtp] = useState("")
    const [isLoading, setLoadingStatus] = useState(false)
    const count = useRef(60)
    const dispatch = useDispatch();
    const phone = navigation.getParam("phone")
    const token = navigation.getParam("token")
    const userId = navigation.getParam("userId")
    const userData = navigation.getParam("userData")

    useEffect(() => {
        if (timerCounter === 0) {
            // exit early when we reach 0
            setresentCodeTitle('Resend code')
            clearInterval(timer.current)
            setresetButtonDiable(false)
        } else if (timerCounter > 0) {
            // save intervalId to clear the interval when the
            // csomponent re-renders
            setresentCodeTitle('Resend code in ' + timerCounter)
            timer.current = setInterval(() => {
                setTimerCounter(timerCounter - 1);
            }, 1000);
        } else {
            console.log("else called")
        }
        // clear interval on re-render to avoid memory leaks
        return () => clearInterval(timer.current);
        // add timeLeft as a dependency to re-rerun the effect
        // when we update it
    }, [timerCounter]);

    // send otp to server
    const verifyOtp = (otp: String) => {
        if (otp.length < 4) {
            alert("Invalid OTP")
            return
        }
        setLoadingStatus(true)
        Keyboard.dismiss()
        verifyOtpFromServer(phone, otp, userId, token)
            .then(response => response.json())
            .then((res) => {
                console.log(res)
                setLoadingStatus(false)
                if (res.status && new String(res.status).trim() !== "404") {
                    if (userData) {
                        // console.log("USER_DATA_EXIST", userData);
                        editProfileInfoApi(userData?.email, userData?.fistName, userData?.lastName, phone)
                            .then(response => response.json())
                            .then(responseJson => {
                                if (responseJson.data) {
                                    setLoadingStatus(false)
                                    dispatch(setLoginUserID(responseJson?.data?.id))
                                    dispatch(setLoginUser(responseJson?.data))
                                    dispatch(setLoginStatus(true))
                                    Singleton.getInstance().setToken(responseJson?.token)
                                    dispatch(setAccessToken(responseJson?.token))

                                    const params = {
                                        userData: responseJson?.data
                                    }
                                    navigation.replace("WelcomeTour", params)
                                } else {
                                    setTimeout(() => {
                                        alert(responseJson.message)
                                    }, 300)
                                    setLoadingStatus(false)
                                }
                            })
                            .catch(error => {
                                setLoadingStatus(false)
                                console.log(error);
                            });


                    } else {
                        dispatch(setLoginUserID(userId))
                        dispatch(setLoginUser(res?.data?.user))
                        dispatch(setLoginStatus(true))
                        Singleton.getInstance().setToken(token)
                        dispatch(setAccessToken(token))
                        // if (res.access_token !== null) {
                        //     Singleton.getInstance().setToken(res.access_token)
                        // }
                        const params = {
                            userData: res?.data
                        }
                        resetNavigate(navigation, "WelcomeTour", params)
                    }
                } else {
                    setTimeout(() => {
                        alert(res?.message)
                    }, 500)
                }
            }).catch((e) => {
                console.log("verify otp error", e)
                setLoadingStatus(false)
            })

    }

    const validateOtp = (text: string) => {
        if (String(text).length < 4) {
            console.log("OTP is Not Correct");
            setOtp(text)
            otpIsValid.current = false
            return false;
        }
        else {
            clearInterval(timer.current)
            setOtp(text)
            setresentCodeTitle('Resend code')
            setresetButtonDiable(false)
            otpIsValid.current = true
            //verify otp
        }
    }

    ///////////////////resend Otp//////////////////////
    const resendCode = () => {
        //resend otp
        startTimer()
        setLoadingStatus(true)
        generateOTP(phone, token, userId)
            .then(response => response.json())
            .then((res) => {
                console.log(res, phone)
                setLoadingStatus(false)
            }).catch((e) => {
                setLoadingStatus(false)
                console.log("loginwithPhone error", e)
            })
    }
    const changeNumber = () => {
        navigation.goBack()
        // if (userData) {
        //     navigation.goBack()
        // } else {
        //     setOtp("")
        //     resetNavigate(navigation, "LoginWithPhone")
        // }
    };

    const startTimer = () => {
        // save intervalId to clear the interval when the
        // csomponent re-renders
        count.current = 60
        setresetButtonDiable(true)
        console.log("current", timer.current)
        clearInterval(timer.current)
        timer.current = setInterval(() => {
            console.log({ timerCounter })
            setTimerCounter(count.current - 1);
            count.current = count.current - 1
        }, 1000);
    }

    return (
        <ImageBackground source={R.images.bg} style={styles.bgContanier}
            imageStyle={{
                resizeMode: "stretch"
            }}>
            {/* <Spinner visible={isLoading} textStyle={styles.spinnerTextStyle} /> */}
            <LoadingIndicator visible={isLoading}  />
            <KeyboardAvoidingView behavior='position' keyboardVerticalOffset={40}>
                <Header onGoBack={() => navigation.goBack()} backBtnVisible />
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View>
                        <View style={styles.container}>
                            <Image
                                source={R.images.messageIcon}
                                style={styles.logoImage} />
                            <Text style={{ marginTop: hp('10%'), }}>
                                <Text style={styles.greeting}> We have sent an access code via SMS to </Text>
                                <Text style={styles.number}> {phone}</Text>
                                <Text style={styles.greeting}> for confirmation</Text>
                            </Text>
                            <View style={styles.bottomAddress}>
                                <TextInput value={otp} textContentType="oneTimeCode" onChangeText={(text) => validateOtp(text)} placeholderTextColor='#d6d6d6' keyboardType="phone-pad" maxLength={4} placeholder="Enter code" style={{ flex: 1, height: hp("6%"), marginLeft: wp('2%'), color: "black", fontSize: wp('4') }} />
                            </View>
                            <TouchableOpacity style={styles.verifyBtn} onPress={() => verifyOtp(otp)}>
                                <Text style={styles.ok}>Verify and Proceed</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ alignItems: 'center', marginTop: hp('11%'), width: wp("100%"), }}>
                            <Text style={styles.dontReciveText}>
                                Didn't receive the code?</Text>
                            <View style={{ flexDirection: 'row', width: wp('100%'), justifyContent: 'space-evenly', marginTop: hp('2%') }}>
                                <TouchableOpacity disabled={resetButtonDiable} onPress={() => resendCode()}>
                                    <View style={[styles.resendOtp, resetButtonDiable && { opacity: 0.7, }]}>
                                        <Text style={[styles.ok]}> {resentCodeTitle}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => changeNumber()}>
                                    <View style={[styles.resendOtp]}>
                                        <Text style={styles.ok}>Change Number</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    bgContanier: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: 'black',
    },
    container: {
        marginTop: hp('15%'),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 20,
        marginRight: 20
    },
    logoImage: {
        width: wp("93%"),
        height: hp('12%'),
        resizeMode: "contain",
    },

    greeting: {
        fontSize: wp('4%'),
        color: 'white',
        textAlign: 'center',
        lineHeight: hp('2.5%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
    },
    number: {
        fontSize: wp('4%'),
        marginTop: hp('3%'),
        color: 'white',
        fontWeight: "bold",
        lineHeight: hp('2.5%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
    },

    dontReciveText: {
        fontSize: wp('4%'),
        marginTop: hp('.5%'),
        color: "#FFF",
        lineHeight: hp('2.5%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
    },

    bottomAddress: {
        flexDirection: 'row',
        backgroundColor: "white",
        justifyContent: 'center',
        alignItems: 'center',
        width: wp("93%"),
        height: hp("5.1%"),
        marginTop: hp('4%'),
        opacity: 0.8
    },
    verifyBtn: {
        marginTop: hp('1%'),
        padding: 10,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#7cc060"
    },

    resendOtp: {
        width: wp("45%"),
        paddingVertical: 10,
        paddingHorizontal: 5,

        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#7cc060"
    },
    ok: {
        textAlign: 'center',
        color: 'white',
        fontSize: hp('1.9%'),
        fontWeight: "bold",
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
    },
    spinnerTextStyle: {
        color: '#FFF'
    },
});

export default Otp;