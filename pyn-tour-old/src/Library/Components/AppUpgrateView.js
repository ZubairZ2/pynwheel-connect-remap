import React from "react";
//import { HeaderBackButton } from 'react-navigation';
// import HeaderBackButton  from 'react-navigation-stack';
import { Image, ImageBackground, Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import CopyRight from "../../Library/Components/Copyright";
import R from "../../assest/R";

export default class AppUpgrate extends React.Component {

  //   static navigationOptions = ({ navigation }) => {
  //     return {
  //       headerLeft: (<HeaderBackButton tintColor={'white'} onPress={() => { navigation.navigate("Home") }} />)
  //     }
  //   }

  constructor(props) {
    super(props);
  }
  openAppLink = () => {
    // debugger
    Linking.openURL(this.props.storeUrl);
    //let fdsa = this.props.storeUrl
    // https://apps.apple.com/us/app/self-tour/id1488907392
    //https://itunes.apple.com/${appStoreLocale}/app/${appName}/id${appStoreId}`
    //Linking.openURL(`https://itunes.apple.com/${appStoreLocale}/app/${appName}/id${appStoreId}`);
    // AppLink.openInStore({ "Self Tour", '1488907392', 'us', playStoreId }).then(() => {
    //     // do stuff
    //   })
    //   .catch((err) => {
    //     // handle error
    //   });
  }

  render() {
    return (
      <ImageBackground
        source={R.images.backgroundImage}
        style={styles.rootView}
        imageStyle={{
          resizeMode: "stretch"
        }}>
        <View
          style={{
            marginTop: hp('20'),
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end"
          }}>
          <Image
            source={R.images.errorIcon}
            style={{
              width: hp("20%"),
              height: hp("20%"),
              marginBottom: wp('0%'),
              resizeMode: "contain",
            }}
            defaultSource={R.images.logoFinal} />
        </View>
        <View style={styles.welcomeView}>
          <Text style={styles.errorTextView}>Please update your application to latest version.</Text>
        </View>
        <View style={styles.startTourRoot}>
          <TouchableOpacity
            onPress={this.openAppLink}
            style={{
              flexDirection: "column",
              width: wp("92%"),
              height: hp("6.5%"),
              backgroundColor: "#D3D3D3",
              alignItems: "center",
              justifyContent: "center"
            }}>
            <Text style={styles.bottomText}>Update</Text>
          </TouchableOpacity>
        </View>
        <CopyRight />
      </ImageBackground>
    );
  }
}
const styles = {
  rootView: {
    position: 'absolute',
    resizeMode: "contain",
    height: hp('100'),
    width:"100%",
    flexDirection: "column",
    backgroundColor: "black",
    alignItems: "center",
  },
  welcomeView: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: 'center',
    flex: 1.4,
  },

  errorTextView: {
    fontSize: hp('2.5%'),
    color: "white",
    lineHeight: 30,
    textAlign: 'center',
    padding: hp("1%"),
    textAlignVertical: 'center',
    alignItems: "center",
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },

  startTourRoot: {
    flexDirection: "column",
    flex: 1.8,
    alignItems: "center",
    width: wp('93%'),
  },
  bottomText: {
    color: "black", marginTop: hp('1%'), marginBottom: hp('1%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
};