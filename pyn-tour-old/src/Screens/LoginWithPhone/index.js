import React, { useRef, useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import Config from "react-native-config";
import PhoneInput from '../../Components/PhoneNumber';
import CopyRight from "../../Library/Components/Copyright";
import Logo from "../../Library/Components/Logo";
import R from "../../assest/R";
import styles from "./styles";

import LoadingIndicator from "../../Components/LoadingIndicator";
import { generateOTP, getUserByPhone } from "../../Library/ServerCalls/API";

const LoginWithPhone = ({ navigation }) => {

  const [isLoading, setisLoading] = useState(false);
  const [phone, setPhone] = useState(null)
  const phoneInputRef = useRef(null)
  //for passing the value to signup screen
  const country = useRef(null)
  const number = useRef(null)

  function pressLetsGo() {
    if (number?.current?.length == 10) {
      setisLoading(true)
      getUserByPhone(phone)
        .then(response => response.json())
        .then((res) => {
          console.log({res})
          setisLoading(false)
          if (res.status && new String(res.status).trim() !=="404") {
            generateOTP(phone,res.token,res?.data?.id)
            .then(response=>response.json())
            .then(res=>console.log("gen OTP",res))
            navigation.navigate("OtpScreen",{phone,token:res.token, userId: res?.data?.id})
          } else {
            navigation.navigate("Login", { phone:{country:country.current,number:number.current} })
          }
        }).catch((e) => {
          console.log("loginwithPhone error",e)
          setisLoading(false)
        })
    } else {
      alert("Invalid phone number ")
    }
  };

  return (
    <ImageBackground source={R.images.backgroundImage} style={styles.mainContanier}
      imageStyle={{
        resizeMode: "stretch"
      }}>
      <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"}>
        <ScrollView contentContainerStyle={{ flexGrow:1 }}>
          <View style={{ flex: 1 }}>
            {/* <Spinner visible={isLoading} textStyle={styles.spinnerTextStyle} /> */}
            <LoadingIndicator visible={isLoading} />
            <Logo url={true} />
            <View style={styles.welcomeView}>
              {Config.ENV === 'lincoln' ? null
                : <Text style={styles.pnywheel}>Welcome to</Text>
              }
              {Config.ENV === 'lincoln' ? null : <Text style={styles.welcomeText}>Pynwheel</Text>}
            </View>
            <View style={styles.propertyView}>
              <Text style={styles.propertyLabel}>Please enter your phone so that we know who you are</Text>
            </View>
            <View style={{flex:1}} />
            <View style={styles.bottomView}>
              <View style={styles.bottomAddress}>
                  <PhoneInput
                  onRef={(ref)=>{alert(ref)}}
                  onUpdateCountry={(cont)=>{
                    country.current = cont
                  }}
                  onUpdateNumber={(updatedNo)=>{
                    number.current =updatedNo
                  }}
                  updatePhoneNumber={(phone)=>{setPhone(phone)}}/>
              </View>
              <TouchableOpacity onPress={pressLetsGo}>
                <View style={[styles.okButton,{backgroundColor:"#7cc060",}]}>
                  <Text style={styles.ok}>CONTINUE</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CopyRight />
    </ImageBackground>
  );
}
export default LoginWithPhone