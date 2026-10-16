import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    ImageBackground,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Spinner from 'react-native-loading-spinner-overlay';
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { SvgXml } from 'react-native-svg';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../../Library/Components/Header';
import {
    generateLatchAccessToken,
    generateLatchOTP,
} from '../../Library/ServerCalls/API';
import { resetNavigate } from '../../Utils/Helpers';
import R from '../../assest/R';
import {
    deleteLatchAccessToken,
    storeLatchAccessToken,
} from './LatchTokenStorage';
import LoadingIndicator from '../../Components/LoadingIndicator';
import Singleton from '../../Singleton'

const LatchOTPScreen = ({ navigation }) => {
    const latchLogo = `
    <svg width="614" height="143" viewBox="0 0 614 143" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M463.465 97.2026L479.821 107.523L478.536 109.548C465.373 130.46 442.747 142.883 418.135 142.883C378.841 142.883 346.752 110.794 346.752 71.5C346.752 32.2062 378.724 0.116821 418.135 0.116821C442.669 0.116821 465.179 12.4229 478.342 33.1408L479.627 35.1659L463.271 45.4858L461.985 43.4608C452.327 28.4676 435.971 19.4327 418.135 19.4327C389.434 19.4327 366.068 42.7988 366.068 71.5C366.068 100.201 389.434 123.567 418.135 123.567C436.166 123.567 452.639 114.416 462.18 99.2277L463.465 97.2026Z" fill="white"/>
    <path d="M19.6664 123.139H96.1122V142.883H0V0.116821H19.6664V123.139Z" fill="white"/>
    <path d="M195.106 0L257.883 143H236.308L187.98 32.9461L139.768 143H118.115L180.658 0H195.106Z" fill="white"/>
    <path d="M343.558 19.8611H299.513V142.883H279.847V19.8611H235.88V0.116821H343.558V19.8611Z" fill="white"/>
    <path d="M593.692 0.116821H613.436V143H593.692V81.3916H517.635V142.883H497.891V0.116821H517.635V61.6084H593.692V0.116821Z" fill="white"/>
    </svg>
  `;

    const otpScreenIcon = `
    <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M55.2002 136V79C55.2002 65.1929 66.3931 54 80.2002 54H245.2C259.007 54 270.2 65.1929 270.2 79V193C270.2 206.807 259.007 218 245.2 218H162.7" stroke="white" stroke-width="7"/>
    <path d="M54 74C47.6348 74 41.5303 77.0006 37.0294 82.3417C32.5286 87.6828 30 94.9269 30 102.48V119.013L131.292 179.121C133.375 180.357 135.671 181 138 181C140.329 181 142.625 180.357 144.708 179.121L246 119.027V102.48C246 94.9269 243.471 87.6828 238.971 82.3417C234.47 77.0006 228.365 74 222 74H54Z" fill="#0090DB"/>
    <path d="M246 143L152.76 198.337C148.177 201.058 143.124 202.474 138 202.474C132.876 202.474 127.823 201.058 123.24 198.337L30 143V216.512C30 224.068 32.5286 231.314 37.0294 236.656C41.5303 241.999 47.6348 245 54 245H222C228.365 245 234.47 241.999 238.971 236.656C243.471 231.314 246 224.068 246 216.512V143Z" fill="#0090DB"/>
    </svg>

  `;

    const { userData } = useSelector((state) => state.loginUserReducer);

    const otpIsValid = useRef(false);
    let timer = useRef();
    const [timerCounter, setTimerCounter] = useState(60);
    const [resentCodeTitle, setresentCodeTitle] = useState('RESEND CODE');
    const [resetButtonDiable, setresetButtonDiable] = useState(true);
    const [otp, setOtp] = useState('');
    const [isLoading, setLoadingStatus] = useState(false);
    const count = useRef(60);
    const dispatch = useDispatch();
    const phone = userData?.email;
    const phone_number = userData?.phone_number.slice(2);
    // console.log('USER-DATA', userData)

    // Generate OTP
    useEffect(() => {
        setLoadingStatus(true);
        generateLatchOTP()
            .then((response) => response.json())
            .then((res) => {
                console.log('GENERATE_LATCH_OTP', res);
                setLoadingStatus(false);
            })
            .catch((e) => {
                setLoadingStatus(false);
                console.log('loginwithPhone error', e);
            });
    }, []);

    useEffect(() => {
        if (timerCounter === 0) {
            // exit early when we reach 0
            setresentCodeTitle('RESEND CODE');
            clearInterval(timer.current);
            setresetButtonDiable(false);
        } else if (timerCounter > 0) {
            // save intervalId to clear the interval when the
            // csomponent re-renders
            setresentCodeTitle('RESEND CODE IN ' + timerCounter);
            timer.current = setInterval(() => {
                setTimerCounter(timerCounter - 1);
            }, 1000);
        } else {
            console.log('else called');
        }
        // clear interval on re-render to avoid memory leaks
        return () => clearInterval(timer.current);
        // add timeLeft as a dependency to re-rerun the effect
        // when we update it
    }, [timerCounter]);

    // send otp to server
    const verifyOtp = (otp) => {
        if (otp.length < 6) {
            alert('OTP must have 6 digit');
            return;
        }
        setLoadingStatus(true);
        Keyboard.dismiss();
        generateLatchAccessToken(otp)
            .then((response) => response.json())
            .then((res) => {
                setLoadingStatus(false);
                if (res.access_token) {
                    //storeLatchAccessToken(res?.access_token);
                    Singleton.getInstance().getTourSetting().latch_access_token = res?.access_token
                    // navigation.navigate('TourMap');
                    const callback = navigation.getParam('callback', '');
                    navigation.goBack();
                    if (callback) callback()
                } else {
                    setTimeout(() => {
                        alert('Your OTP is invalid');
                    }, 500);
                }
            })
            .catch((e) => {
                console.log('verify otp error', e);
                setLoadingStatus(false);
            });
    };

    const validateOtp = (text) => {
        if (String(text).length < 6) {
            console.log('OTP is Not Correct');
            setOtp(text);
            otpIsValid.current = false;
            return false;
        } else {
            clearInterval(timer.current);
            setOtp(text);
            setresentCodeTitle('RESEND CODE');
            setresetButtonDiable(false);
            otpIsValid.current = true;
            //verify otp
        }
    };

    ///////////////////resend Otp//////////////////////
    const resendCode = () => {
        //resend otp
        startTimer();
        setLoadingStatus(true);
        generateLatchOTP()
            .then((response) => response.json())
            .then((res) => {
                console.log('GENERATE_LATCH_OTP', res);
                setLoadingStatus(false);
            })
            .catch((e) => {
                setLoadingStatus(false);
                console.log('loginwithPhone error', e);
            });
    };
    const changeNumber = () => {
        setOtp('');
        AsyncStorage.clear();
        deleteLatchAccessToken();
        resetNavigate(navigation, 'EditProfileInfo');

        // navigation.goBack()
    };

    const startTimer = () => {
        // save intervalId to clear the interval when the
        // csomponent re-renders
        count.current = 60;
        setresetButtonDiable(true);
        console.log('current', timer.current);
        clearInterval(timer.current);
        timer.current = setInterval(() => {
            console.log({ timerCounter });
            setTimerCounter(count.current - 1);
            count.current = count.current - 1;
        }, 1000);
    };

    return (
        <ImageBackground
            source={R.images.backgroundImage}
            style={styles.rootView}
            imageStyle={{
                resizeMode: 'stretch',
            }}>
            {/* <Spinner visible={isLoading} textStyle={styles.spinnerTextStyle} /> */}
            <LoadingIndicator visible={isLoading} />
            <KeyboardAvoidingView behavior="position" keyboardVerticalOffset={40}>
                <Header
                    onGoBack={() => navigation.navigate('YourTour')}
                    backBtnVisible
                />
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View>
                        <View style={styles.container}>
                            {/* <View style={styles.logoImage}>
                                <SvgXml xml={latchLogo} width={'100%'} height={'100%'} />
                            </View>
                            */}
                            <View style={[{ ...styles.logoImage, height: hp('16%') }]}>
                                <SvgXml xml={otpScreenIcon} width={'100%'} height={'100%'} />
                            </View>
                            {/* <Image
                                source={R.images.otpScreenIcon}
                                style={styles.logoImage} /> */}

                            <Text style={{ marginTop: hp('5%'), textAlign: 'center' }}>
                                <Text style={styles.greeting}>
                                    A verification code has been sent to{' '}
                                </Text>
                                <Text style={styles.number}> {phone}</Text>
                            </Text>
                            <Text style={[{ ...styles.greeting, marginTop: hp('15%') }]}>
                                Enter the verification code below{' '}
                            </Text>

                            <View style={styles.bottomAddress}>
                                <TextInput
                                    value={otp}
                                    textContentType="oneTimeCode"
                                    onChangeText={(text) => validateOtp(text)}
                                    placeholderTextColor="#d6d6d6"
                                    keyboardType="phone-pad"
                                    maxLength={6}
                                    placeholder="Enter code"
                                    style={{
                                        flex: 1,
                                        height: hp('6%'),
                                        marginLeft: wp('2%'),
                                        color: 'black',
                                        fontSize: wp('4'),
                                    }}
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.verifyBtn}
                                onPress={() => verifyOtp(otp)}>
                                <Text style={styles.ok}>VERIFY CODE</Text>
                            </TouchableOpacity>
                        </View>
                        <View
                            style={{
                                alignItems: 'center',
                                marginTop: hp('6%'),
                                width: '100%',
                            }}>
                            <Text style={styles.dontReciveText}>
                                Didn't receive the code?
                            </Text>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginTop: hp('2%'),
                                    marginHorizontal: wp('2%'),
                                }}>
                                <TouchableOpacity
                                    disabled={resetButtonDiable}
                                    onPress={() => resendCode()}>
                                    <View
                                        style={[
                                            styles.resendOtp,
                                            resetButtonDiable && { opacity: 0.7 },
                                            { marginRight: wp('2') },
                                        ]}>
                                        <Text style={[styles.ok]}> {resentCodeTitle}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => changeNumber()}>
                                    <View style={[styles.resendOtp]}>
                                        <Text style={styles.ok}>CHANGE EMAIL ADDRESS</Text>
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
        backgroundColor: '#0000',
    },
    rootView: {
        resizeMode: 'contain',
        flex: 5,
        flexDirection: 'column',
        backgroundColor: 'black',
        alignItems: 'center',
    },
    container: {
        marginTop: hp('7%'),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 20,
        marginRight: 20,
    },
    logoImage: {
        width: wp('60%'),
        height: hp('12%'),
        resizeMode: 'contain',
    },

    greeting: {
        fontSize: wp('4%'),
        color: 'white',
        textAlign: 'center',
        lineHeight: hp('2.5%'),
        fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
    },
    number: {
        fontSize: wp('4%'),
        marginTop: hp('3%'),
        color: 'white',
        fontWeight: 'bold',
        lineHeight: hp('2.5%'),
        fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
    },

    dontReciveText: {
        fontSize: wp('4%'),
        marginTop: hp('.5%'),
        color: '#FFF',
        lineHeight: hp('2.5%'),
        fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
    },

    bottomAddress: {
        flexDirection: 'row',
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        width: wp('93%'),
        height: hp('5.1%'),
        marginTop: hp('1%'),
        opacity: 0.8,
    },
    verifyBtn: {
        marginTop: hp('1%'),
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        width: wp('93%'),
        height: hp('5.1%'),
        backgroundColor: 'black',
    },

    resendOtp: {
        width: wp('45%'),
        height: hp('9%'),
        paddingVertical: 10,
        paddingHorizontal: 5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    ok: {
        textAlign: 'center',
        color: 'white',
        fontSize: hp('1.7`%'),
        fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
    },
    spinnerTextStyle: {
        color: '#FFF',
    },
});

export default LatchOTPScreen;
