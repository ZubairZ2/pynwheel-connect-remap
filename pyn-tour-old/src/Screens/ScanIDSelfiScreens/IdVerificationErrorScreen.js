import React, { Component } from "react";
//import { HeaderBackButton } from 'react-navigation';
import { Image, ImageBackground, Platform, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";

import R from "../../assest/R";
import CopyRight from "../../Library/Components/Copyright";
import Header from '../../Library/Components/Header/index';

class IdVerificationErrorScreen extends Component {

  // static navigationOptions = ({ navigation }) => {
  //   return {
  //     headerLeft: (<HeaderBackButton tintColor={'white'} onPress={() => { navigation.navigate("Home") }} />)
  //   }
  // }

  constructor(props) {
    super(props);
  }

  render() {
    const { navigation } = this.props;
    return (
      <ImageBackground
        source={R.images.backgroundImage}
        style={styles.rootView}
        imageStyle={{
          resizeMode: "stretch"
        }}>
          <Header backBtnVisible={true} title="ID VERIFICATION ERROR" navigation={navigation} onGoBack={() => {
          if (navigation.goBack()) {
            navigation.navigate("Home")
          } else {
            navigation.replace("Welcome");
          }
        }} />
        <View style={{ flex: 1.7, flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
          <Image
            source={R.images.errorIcon}
            style={{ width: hp("20%"), height: hp("20%"), marginBottom: wp('0%'), resizeMode: "contain", }}
            defaultSource={R.images.logoFinal} />
        </View>
        <View style={styles.welcomeView}>
          <Text style={styles.errorTextView}>I'm sorry! It looks like there was an error with your ID. Please touch "go back" to try again or contact the property to reschedule your tour.</Text>
        </View>
        <View style={styles.startTourRoot}>
          <TouchableOpacity onPress={() => this.props.navigation.navigate("Home") }
            style={{ flexDirection: "column", width: wp("92%"), height: hp("6.5%"), backgroundColor: "#D3D3D3", alignItems: "center", justifyContent: "center" }}>
            <Text style={styles.bottomText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
        <CopyRight/>
      </ImageBackground>
    );
  }
}
const styles = {
  rootView: {   resizeMode: "contain", flex: 5, flexDirection: "column", backgroundColor: "black", alignItems: "center", },
  welcomeView: { flexDirection: "column", alignItems: "center", justifyContent: 'center', flex: 1.4},
  errorTextView: {   fontSize:hp('2.5%'),color: "white", lineHeight: 30, textAlign:'center', padding: hp("1%"), textAlignVertical: 'center', alignItems: "center", fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light" },
  startTourRoot: { flexDirection: "column", flex: 1.8, alignItems: "center", width: wp('93%'), },
  bottomText:{ color: "black",marginTop:hp('1%'),marginBottom:hp('1%'), fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light" },
};
export default IdVerificationErrorScreen;
