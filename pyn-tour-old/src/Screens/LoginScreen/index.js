import ActionSheet from 'react-native-actionsheet'
import Spinner from "react-native-loading-spinner-overlay";
import { View, Text, ImageBackground, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar, TextInput, LogBox, Keyboard, Dimensions } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
// import CountryPicker from 'react-native-country-picker-modal'

import styles from "./styles";
import R from "../../assest/R";
import Logo from "../../Library/Components/Logo"
import { generateOTP, userLogin } from "../../Library/ServerCalls/API";
import CopyRight from "../../Library/Components/Copyright"
import Config from "react-native-config";
import content from './../PrivacyPolicyAndUserTerms/content';
import { setSelectedCommunity } from './../../redux/actions/selectedCommunityAction';
import { NavigationActions, StackActions } from 'react-navigation';
import Header from '../../Library/Components/Header';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import PhoneInput from '../../Components/PhoneNumber'
import LoadingIndicator from '../../Components/LoadingIndicator';


const LoginScreen = ({ navigation }) => {
  const [fistName, setFirstName] = useState(null)
  const [lastName, setLastName] = useState(null)
  const [email, setEmail] = useState(null)
  const [phone, setPhone] = useState(null)
  const [isLoading, setLoadingStatus] = useState(false)
  const [errorMessageText, setErrorMessage] = useState("Please enter your details")
  const [toggleCheckBox, setToggleCheckBox] = useState(true)
  const emailIDIsValid = useRef(false)
  const phoneIsValid = useRef(false)
  const isNetConnected = useRef(true)
  //populate phone input
  const [inpPhone, setInpPhone] = useState(null)

  const isLoginButtonPressed = useRef(false)
  const allowedUser = useRef(true)
  const actionSheet = useRef(null);
  const [isValidPhone, setIsValidPhone] = useState(true)

  const dispatch = useDispatch();
  const selectedCommunityLogo = useSelector(state => state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.logo);
  const selectedCommunityCMCProvider = useSelector(state => state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.crm_provider);

  const jwtToken = useRef(null)
  const userId = useRef(null)

  useEffect(() => {
    const focusListener = navigation.addListener('didFocus', () => {
      if (isLoginButtonPressed.current) {
        showActionsheetOnDidFocus()
      }

    })
    const p = navigation.getParam("phone") || undefined
    if (p) {
      setInpPhone(p)
      // setPhone(p?.country?.callingCode[0]+p.number)
      // phoneInputRef?.current?.updatePhone(phone)
      // console.log("phoneInputRef",phoneInputRef.current)
    }
    return function cleanup() {
      focusListener.remove();
    };
  }, []);

  const showActionsheetOnDidFocus = () => {
    showActionSheet()
  }

  const pressLogin = () => {
    if (isNetConnected) {
      if (fistName === null) {
        alert("Please enter first name")
      }
      else if (lastName === null) {
        alert("Please enter last name")
      }
      else if (emailIDIsValid.current === false) {
        alert("Please enter valid email Address")
      }
      else if (!isValidPhone) {
        alert("Please enter valid phone Number")
      }
      else {
        Keyboard.dismiss();
        setLoadingStatus(true)
        getLoginUser()
      }
    } else {
      alert("Please check internet connection.");
    }
  };

  //create user
  const getLoginUser = () => {
    // debugger
    userLogin(email, fistName, lastName, phone, toggleCheckBox)
      .then(response => response.json())
      .then(responseJson => {
        if (responseJson.success) {
          console.log(responseJson)
          setLoadingStatus(false)
          jwtToken.current = responseJson?.token;
          userId.current = responseJson?.tour_user?.id;
          console.log(jwtToken.current)
          generateOTP(phone, responseJson?.token, userId.current)
            .then((res) => res.json())
            .then(response => {
              console.log("generate OTP", response)
            })
          if (responseJson.allowed_email !== null) {
            allowedUser.current = responseJson.allowed_email
          }
          isLoginButtonPressed.current = true
          setTimeout(() => { showActionSheet() }, 200);
        } else {
          setTimeout(() => {
            alert(responseJson.message)
          }, 300)
          setLoadingStatus(false)
          setErrorMessage(responseJson.message)
        }
      })
      .catch(error => {
        setLoadingStatus(false)
        console.log(error);
      });
  };

  const showActionSheet = () => {
    actionSheet.current.show()
  }
  const resetNavigate = (routeName, params) => {
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({ routeName, params: params })],
    });
    navigation.dispatch(resetAction)
  }
  const actionSheetButtonPressed = (stop) => {
    if (stop == 0) {
      // dispatch(setLoginStatus(true))
      if (allowedUser.current) {
        // resetNavigate("OtpScreen")
        navigation.navigate("OtpScreen", { phone, token: jwtToken.current, userId: userId.current })
        isLoginButtonPressed.current = false
      } else {
        // alert("Tour Coming Soon! \n This Self Tour is currently under construction. Please check back later.")
        dispatch(setSelectedCommunity(null));
        navigation.navigate("OtpScreen", { phone, token: jwtToken.current, userId: userId.current });
        isLoginButtonPressed.current = false
      }
    } else if (stop === 1) {
      //navigation.navigate("PrivacyPolicy", { title: "PRIVACY POLICY", des: content.PRIVACY_POLICY });
      navigation.navigate("WebView", { title: 'PRIVACY POLICY', applyUnitURL: "https://pynwheeltouchscreens.com/privacy-policy" })
    } else if (stop === 2) {
      //navigation.navigate("PrivacyPolicy", { title: "TERMS OF USE", des: content.TERMS_OF_USE });
      navigation.navigate("WebView", { title: 'TERMS OF USE', applyUnitURL: "https://pynwheel.com/terms/Pynwheel-Self-Tour-Terms-of-Use.pdf" })
    } else if (stop === 3) {
      if (Config.ENV === 'lincoln') {
        navigation.navigate("PrivacyPolicy", { title: "Risk Waiver Language", des: content.RISK_WAIVER_LANGUAGE });
      }
      else {
        //RNExitApp.exitApp();
        // actionSheet.current?.hide();
      }
    } 
    // else if (stop === 4) {
    //   if (Config.ENV === 'lincoln') {
    //     //RNExitApp.exitApp();
    //   }
    //   else {
    //   }
    // }
  }

  const moveToPrivecy = () => {

    navigation.navigate("WebView", { title: 'PRIVACY POLICY', applyUnitURL: "https://pynwheeltouchscreens.com/privacy-policy" })
  }

  const moveTermOfUse = () => {
    navigation.navigate("WebView", { title: 'TERMS OF USE', applyUnitURL: "https://pynwheel.com/terms/Pynwheel-Self-Tour-Terms-of-Use.pdf" })
    //navigation.navigate("PrivacyPolicy", { title: "TERMS OF USE", des: content.TERMS_OF_USE });
  }

  const moveToKnockTermsOfUse = () => {
    navigation.navigate("WebView", { title: 'TERMS OF USE', applyUnitURL: "https://www.knock.com/terms-of-use" })
  }

  const moveToKnockPrivacyPolicy = () => {
    navigation.navigate("WebView", { title: 'PRIVACY POLICY', applyUnitURL: "https://www.knock.com/privacy-policy" })
  }

  const validate = (text) => {
    setErrorMessage("Please enter your email address")
    let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (reg.test(text) === false) {
      console.log("Email is Not Correct");
      setEmail(text)
      return false;
    }
    else {
      setEmail(text)
      emailIDIsValid.current = true
    }
  }

  const validatePhoneNumer = (text) => {
    setErrorMessage("Please enter your phone number")
    let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    //if (reg.test(text) === false) {
    if (String(text).length < 10) {
      setPhone(text)
      phoneIsValid.current = false
      return false;
    }
    else {
      setPhone(text)
      phoneIsValid.current = true
    }
  }
  LogBox.ignoreAllLogs(true)
  return (
    <ImageBackground
      source={R.images.backgroundImage}
      style={styles.mainContanier}
      imageStyle={{
        resizeMode: "stretch"
      }}>
      <Header onGoBack={() => navigation.goBack()} backBtnVisible />
      <TouchableWithoutFeedback style={{ width: Dimensions.get("screen").width }} onPress={() => { Keyboard.dismiss() }}>
        <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
        {/* <Spinner visible={isLoading} textStyle={styles.spinnerTextStyle} /> */}
        <LoadingIndicator visible={isLoading} />
        {Platform.OS === "ios" ?
          <Logo url={true} imageStyle={{ marginTop: 0 }} LogoUrl={selectedCommunityLogo} ></Logo> :
          <Logo url={true} imageStyle={{ marginTop: 0 }} ></Logo>
        }
        <View style={styles.welcomeView}>
          <Text style={styles.pnywheel}>Enter your personal details</Text>
        </View>
      </TouchableWithoutFeedback>
      {/* <View style={styles.bottomView}> */}
      <KeyboardAvoidingView style={{ paddingHorizontal: 5 }} behavior={Platform.OS === "ios" ? 'position' : "none"}>
        <View style={styles.bottomAddress}>
          <TextInput value={fistName} onChangeText={(text) => setFirstName(text)} placeholderTextColor='white' placeholder="First Name" style={{ flex: 1, marginLeft: wp('3%'), backgroundColor: "black", color: "white", borderColor: 'blue', height: hp("5.1%"), fontSize: hp("1.5%"), }} />
        </View>
        <View style={styles.bottomAddress}>
          <TextInput value={lastName} onChangeText={(text) => setLastName(text)} placeholderTextColor='white' placeholder="Last Name" style={{ flex: 1, marginLeft: wp('3%'), backgroundColor: "black", color: "white", borderColor: 'blue', height: hp("5.1%"), fontSize: hp("1.5%"), }} />
        </View>
        <View style={styles.bottomAddress}>
          <TextInput value={email} onChangeText={(text) => validate(text)} placeholderTextColor='white' placeholder="Email" style={{ flex: 1, marginLeft: wp('3%'), backgroundColor: "black", color: "white", borderColor: 'blue', height: hp("5.1%"), fontSize: hp("1.5%"), }} />
        </View>
        <View style={styles.bottomAddress}>
          <PhoneInput
            // onRef={(ref)=>phoneInputRef.current = ref}
            // disable={true}
            phoneParam={inpPhone}
            onUpdateNumber={(phn) => {
              if (phn.length == 10) {
                setIsValidPhone(true)
              } else {
                setIsValidPhone(false)
              }
            }}
            updatePhoneNumber={(phone) => { setPhone(phone) }} />
        </View>

        <View style={{ paddingHorizontal: 3, marginTop: hp(2) }}>
          {selectedCommunityCMCProvider === "knock" ? <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text>
              <Text style={{ color: 'white', fontSize: hp('1.6%') }}>By clicking "Submit," you agree to Knock's</Text>
              <TouchableOpacity onPress={() => moveToKnockTermsOfUse()} ><Text style={{ color: '#3684bf', fontSize: hp('1.7%'), top: hp('.3') }}> Terms of Use </Text></TouchableOpacity>
              <Text style={{ color: 'white', fontSize: hp('1.6%'), }}> and</Text>
              <TouchableOpacity><Text onPress={() => moveToKnockPrivacyPolicy()} style={{ color: '#3684bf', fontSize: hp('1.7%'), top: hp('.3') }}> Privacy Policy </Text></TouchableOpacity>
              <Text style={{ color: 'white', fontSize: hp('1.6%'), }}> and consent to be contacted at this phone number by text message, and/or by autodialer for any purpose, including marketing, by the property and anyone acting on their behalf. Consent is not required to purchase or rent. Also, you consent to receive delivery notifications sent by text and/or email communications. Please visit Pynwheel’s </Text>
              <TouchableOpacity><Text onPress={() => moveToPrivecy()} style={{ color: '#3684bf', fontSize: hp('1.7%'), top: hp('.3') }}> Privacy Policy </Text></TouchableOpacity>
              <Text style={{ color: 'white', fontSize: hp('1.6%'), }}> for more information regarding the protection of your information.</Text>
            </Text>
          </View> : <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text>
              <Text style={{ color: 'white', fontSize: hp('1.8%') }}>By clicking on submit, you consent to receive delivery notification sent by text and/or email communications. Please visit our</Text>
              <TouchableOpacity><Text onPress={() => moveToPrivecy()} style={{ color: '#3684bf', fontSize: hp('1.7%'), top: hp('.3') }}> Privacy Policy </Text></TouchableOpacity>
              <Text style={{ color: 'white', fontSize: hp('1.8%'), }}> for more information regarding the protection of your information.</Text>
            </Text>
          </View>}
        </View>
      </KeyboardAvoidingView>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <TouchableOpacity onPress={() => pressLogin()}>
          <View style={styles.okButton}>
            <Text style={styles.ok}>Sign Up</Text>
          </View>
        </TouchableOpacity>
        {/* </View> */}
        <CopyRight />
      </View>

      {Config.ENV === 'lincoln' ?
        <ActionSheet
          // ref={o => this.ActionSheet = o}
          ref={actionSheet}
          title={'Privacy Policy, Terms of Use & Risk Waiver'}
          titleTextStyle={{ size: 20 }}
          message={'To use this App, you must first agree to our Privacy Policy, Terms of Use, and Risk Waiver. To view our Privacy Policy, Terms of Use, and/or Risk Waiver, click the appropriate button below.'}
          options={['I Agree', 'View Privacy Policy', 'View Terms of Use', 'Terms of Use: Risk Addendum', 'Disagree and Leave']}
          cancelButtonIndex={4}
          onPress={(index) => actionSheetButtonPressed(index)}
        /> : <ActionSheet
          // ref={o => this.ActionSheet = o}
          ref={actionSheet}
          title={'Privacy Policy & Terms of Use'}
          titleTextStyle={{ size: 20 }}
          message={'To use this App, you must first Agree to our Privacy Policy & Terms of Use. To view our Privacy Policy and/or Terms of Use, click the appropriate button below.'}
          options={['I Agree', 'View Privacy Policy', 'View Terms of Use', 'Disagree and Leave']}
          cancelButtonIndex={3}
          onPress={(index) => actionSheetButtonPressed(index)}
        />}
    </ImageBackground>
  );
  // }
}
export default LoginScreen;