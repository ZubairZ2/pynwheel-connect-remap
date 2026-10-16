import React, { useEffect, useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import Config from "react-native-config";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useDispatch } from 'react-redux';
import LoadingIndicator from "../../Components/LoadingIndicator";
import CopyRight from "../../Library/Components/Copyright";
import Logo from "../../Library/Components/Logo";
import { getUserByEmail } from "../../Library/ServerCalls/API";
import R from "../../assest/R";
import { setLoginUser } from "../../redux/actions/loginUserAction";
import { setLoginStatus, setLoginUserID } from "../../redux/actions/persistPropertyAction";
import styles from "./styles";

const LoginWithEmail = ({ navigation }) => {

  const [isLoading, setisLoading] = useState(false);
  const [email, setEmail] = useState(null)
  const dispatch = useDispatch();

  useEffect(() => {
  }, []);

  function pressLetsGo() {
    let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (reg.test(email)) {
      setisLoading(true)
      getUserByEmail(email)
        .then(response => response.json())
        .then((res) => {
          setisLoading(false)
          if (res.status) {
            dispatch(setLoginUserID(res?.user.id))
            dispatch(setLoginUser(res?.user))
            dispatch(setLoginStatus(true))
            // if (res.access_token !== null) {
            //   Singleton.getInstance().setToken(res.access_token)
            // }
            navigation.navigate("WelcomeTour", { 
              name: res?.user?.name,
              schedule_tour:res?.schedule_tour,
              visited_history:res?.visited_history
            });
          } else {
            navigation.navigate("Login", { email })
          }
        }).catch((e) => {
          console.log("loginwithemail error",e)
          setisLoading(false)
        })
    } else {
      alert("invalid email")
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
              <Text style={styles.propertyLabel}>Please enter your email address so that we know who you are</Text>
            </View>
            <View style={{flex:1}} />
            <View style={styles.bottomView}>
              <View style={styles.bottomAddress}>
                <TextInput value={email} onChangeText={(text) => { setEmail(text) }} placeholderTextColor='white' placeholder="Email" style={{ flex: 1, marginLeft: wp('3%'), backgroundColor: "black", color: "white", borderColor: 'blue', height: hp("5.1%"), fontSize: hp("1.5%"), }} />
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
export default LoginWithEmail

LoginWithEmail['navigationOptions'] = screenProps => ({
  header: null
})
