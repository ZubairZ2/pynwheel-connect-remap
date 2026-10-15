import ActionSheet from 'react-native-actionsheet'
import Spinner from "react-native-loading-spinner-overlay";
import { View, Text, ImageBackground, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar, TextInput, LogBox, Keyboard, Dimensions } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import React, { useState, useEffect, useRef } from "react";
import Singleton from '../../Singleton';
import { useDispatch, useSelector } from 'react-redux';

import styles from "./styles";
import R from "../../assest/R";
import Logo from "../../Library/Components/Logo"
import { generateOTP, editProfileInfoApi } from "../../Library/ServerCalls/API";
import CopyRight from "../../Library/Components/Copyright"
import Header from '../../Library/Components/Header';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import PhoneInput from '../../Components/PhoneNumber'
import { setLoginStatus, setLoginUserID } from '../../redux/actions/persistPropertyAction';
import { setLoginUser } from '../../redux/actions/loginUserAction';
import { setAccessToken } from '../../redux/actions/accessTokenAction';
import LoadingIndicator from '../../Components/LoadingIndicator';


const EditProfileInfo = ({ navigation }) => {
  const info = useSelector(state => state.persistReducer?.userInfo4TopSlider);
  const [fistName, setFirstName] = useState(info?.user?.first_name)
  const [lastName, setLastName] = useState(info?.user?.last_name)
  const [email, setEmail] = useState(info?.user?.email)
  const [phone, setPhone] = useState(info?.user?.phone_number?.slice(2))
  const [isLoading, setLoadingStatus] = useState(false)
  const [errorMessageText, setErrorMessage] = useState("Please enter your details")
  const emailIDIsValid = useRef(false)
  const [isFirstAttemptValidEmail, setIsFirstAttemptValidEmail] = useState(false)
  const phoneIsValid = useRef(false)
  const isNetConnected = useRef(true)
  //populate phone input
  const [inpPhone, setInpPhone] = useState(null)
  const [isValidPhone, setIsValidPhone] = useState(true)

  const dispatch = useDispatch();
  const selectedCommunityLogo = useSelector(state => state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.logo);
  const selectedCommunityCMCProvider = useSelector(state => state.selectedCommunityReducer.selectedConnunity && state.selectedCommunityReducer.selectedConnunity.crm_provider);

  const jwtToken = useRef(null)
  const userId = useRef(null)
  const numberChangeRef = useRef(false)

  useEffect(() => {
    if (info?.user?.phone_number) {
      setInpPhone({ country: null, number: info?.user?.phone_number.slice(2) })
    }

  }, []);

  const pressLogin = () => {
    if (isFirstAttemptValidEmail === false && info?.user?.email) {
      validate(info?.user?.email)
    }
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
    if (phone !== info?.user?.phone_number) {
      // console.log("params",phone,Singleton.getInstance().getToken(),info?.user?.id);
      // console.log('Token', Singleton.getInstance().getToken())
      generateOTP(phone, Singleton.getInstance().getToken(), info?.user?.id)
        .then((res) => res.json())
        .then(response => {
          setLoadingStatus(false)
          console.log("generate OTP", response)
          const userData = { email, fistName, lastName }
          navigation.navigate("OtpScreen", { phone, token: Singleton.getInstance().getToken(), userId: info?.user?.id, userData })
        })
    } else {
      editProfileInfoApi(email, fistName, lastName, phone)
        .then(response => response.json())
        .then(responseJson => {
          if (responseJson.data) {
            setLoadingStatus(false)
            jwtToken.current = responseJson?.token;
            userId.current = responseJson?.data?.id;
            dispatch(setLoginUserID(userId.current))
            dispatch(setLoginUser(responseJson?.data))
            dispatch(setLoginStatus(true))
            Singleton.getInstance().setToken(jwtToken.current)
            dispatch(setAccessToken(jwtToken.current))

            const params = {
              userData: responseJson?.data
            }
            navigation.replace("WelcomeTour", params)
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
    }
  };

  const validate = (text) => {
    setErrorMessage("Please enter your email address")
    let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (reg.test(text) === false) {
      console.log("Email is Not Correct");
      setEmail(text)
      setIsFirstAttemptValidEmail(() => true)
      emailIDIsValid.current = false
      return false;
    }
    else {
      setEmail(text)
      emailIDIsValid.current = true
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
      <Header onGoBack={() => navigation.goBack()} backBtnVisible title='Edit Profile' />
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
            <Text style={styles.ok}>SUBMIT</Text>
          </View>
        </TouchableOpacity>
        {/* </View> */}
        <CopyRight />
      </View>

    </ImageBackground>
  );
  // }
}
export default EditProfileInfo;