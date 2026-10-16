import React, { Component } from 'react';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Clipboard, ImageBackground, Image, View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import R from "../../assest/R"
// import AuthenteqFlow from 'react-native-authenteq-flow';
import Logo from "../../Library/Components/Logo";
import GoButton from '../../Library/Components/GoButton'
import CopyRight from "../../Library/Components/Copyright"
import { InitializeTourFromServer, getFloorPlansForEditTour, userFailedInIDVarification } from "../../Library/ServerCalls/API"
import Singleton from "../../Singleton"
import Header from '../../Library/Components/Header/index'


class Authenteq extends Component {
  state = {
    // clientId: '7zewo0RJcqX4YOPf97d2',
    // clientSecret: 'g6wq92eywVAo07KNwwISLr9e5wiZa66GZz5aDoeT',
    // clientId: 'hmJL5eg0yfwWgIAypFqR',
    // clientSecret: 'WuE1CS7iEP5UWZ5dCmjet6l53nJn46oa0tiGDoKi',
    //IMran
    // clientId: 'HMtyDVVx03zcfKPVOSJC',
    // clientSecret: 'tLSiGhGjfOEBPdNxwKLsMPIX7MfzTH5Kkzlqv4s4',
    //Jennifer
    clientId: 'MbFv9yETmUcdTK4b35dj',
    clientSecret: 'F52pkttafpVkU256ORsmYmbOxChKFmqJEP0WgQ6e',
    version: null
  }

  pressOk = () => {
    let isGetInfo = Singleton.getInstance().getCardInfo()
    let getTourConfigrations = this.props.navigation.getParam("getTourConfigrations")
    if (isGetInfo) {
      this.props.navigation.navigate("AddCard", { moveToAuthenteq: this.moveToAuthenteq, getTourConfigrations })
    } else {
      this.moveToAuthenteq()
    }
  }
  moveToAuthenteq = () => {
    // AuthenteqFlow
    //   .identification(this.state.clientId, this.state.clientSecret, [['PP', 'DL', 'NID']])
    //   .then((res) => {
    //     // debugger
    //     Singleton.getInstance().setIdVerificationProvider("authenteq")
    //     // this.props.navigation.replace("TourReview")
    //     InitializeTourFromServer()
    //       .then(response => response.json())
    //       .then(responseJson => {
    //         if ((typeof (responseJson) !== 'undefined') || responseJson !== null) {
    //           Singleton.getInstance().setBedroomFilter(this.addAfter(responseJson.unit_bedrooms, 0, { id: 0, title: 'Any', value: 'any', is_selected: true }))
    //           getFloorPlansForEditTour(4, 1, "any", "price_asc")
    //             .then(response => response.json())
    //             .then(responseJson1 => {
    //               console.log("responseJson.allow_tours_customization && responseJson1.floorplans.length > 0", responseJson.allow_tours_customization && responseJson1.floorplans.length > 0);
    //               // responseJson.allow_tours_customization && responseJson1.floorplans.length > 0 ? this.props.navigation.navigate("FloorPlatList1") : this.props.navigation.navigate("TourReview")
    //               this.props.navigation.navigate(responseJson.allow_tours_customization ? "CreateTour" : "NonCustomTour")
    //             })
    //             .catch(error => {
    //               console.log(error);
    //             });
    //         }
    //         else { console.log('Authenteq Error on Response Screen') }
    //       })
    //       .catch(() => { console.log('Authenteq Error on Response Screen') });
    //   }).catch((error) => {
    //     // debugger
    //     console.log("authenteq Error", error)
    //     userFailedInIDVarification("Authenteq", error)
    //       .then(response => response.json())
    //       .then(responseJson => {
    //         console.log(responseJson)
    //       })
    //     console.error(error);
    //   });
  }

  addAfter(array, index, newItem) {
    return [
      ...array.slice(0, index),
      newItem,
      ...array.slice(index)
    ];
  }

  componentDidMount() {
    // AuthenteqFlow.getVersion(version => {
    //   this.setState(prevState => ({
    //     version: version
    //   }))
    // });
  }

  render() {
    const { navigation } = this.props;

    return (
      <ImageBackground source={R.images.backgroundImage} style={{
        resizeMode: "contain", flex: 1, flexDirection: "column", backgroundColor: "black", alignItems: 'center',
      }}
        imageStyle={{
          resizeMode: "stretch"
        }}>
        <Header backBtnVisible={true} title="ID VERIFICATION" navigation={navigation} onGoBack={() => {
          if (navigation.goBack()) {
            navigation.goBack()
          } else {
            navigation.replace("Welcome");
          }
        }} />
        <View style={{ alignContent: 'center', height: hp('40%') }}>
          <Logo url={true} />
          <Text style={{ fontSize: hp('3%'), color: "white", textAlign: 'center', lineHeight: 40, top: hp('5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light" }}>Before we can proceed, we need to verify your identity</Text>
        </View >
        <GoButton goPressed={() => this.pressOk()} />
        <CopyRight />
      </ImageBackground>
    );
  }
}

export default Authenteq;

// import React from 'react';
// import { WebView } from 'react-native-webview';
// import Spinner from "react-native-loading-spinner-overlay";
// import { View, ImageBackground, StyleSheet, NetInfo } from 'react-native';

// import R from "../../assest/R";
// import CopyRight from "../../Library/Components/Copyright"
// import { getAuthenteqURL } from "../../Library/ServerCalls/API"

// export default class Authenteq extends React.Component {

//   constructor() {
//     super();
//     this.state = {
//       isLoading: true,
//       link: null
//     }
//   }

//   componentDidMount() {
//     this.getAuthenteqURL()
//   }

//   getAuthenteqURL = () => {
//     this.setState({ isLoading: true })
//     // debugger
//     getAuthenteqURL()
//       .then(response => response.json())
//       .then(responseJson => {
//         setTimeout(() => {
//           this.setState({ isLoading: false });
//           // debugger
//           if (typeof (responseJson.url) !== 'undefined' && responseJson.url != null) {
//             this.setState({ link: responseJson.url })
//           }
//           else { status = false }
//           this.setState({
//             isLoading: false,
//           });
//         }, 800);
//       })
//       .catch(error => {
//         this.setState({
//           isLoading: false
//         });
//         console.log(error);
//       });
//   };

//   handleWebViewNavigationStateChange = newNavState => {

//     // debugger
//     const { url } = newNavState;
//     if (!url) return;
//     if (!newNavState.loading) {
//       this.setState({ isLoading: false })
//     }
//     //handle certain doctypes
//     if (url.includes('authenteq_result')) {
//       this.props.navigation.replace("TourReview")
//     }
//     // one way to handle a successful form submit is via query strings
//     // if (url.includes('?message=success')) {
//     //   this.webview.stopLoading();
//     //   // maybe close this view?
//     // }

//     // one way to handle errors is via query string
//     if (url.includes('?errors=true')) {
//       //this.webview.stopLoading();
//     }
//     // redirect somewhere else
//     // if (url.includes('google.com')) {
//     //   const newURL = 'https://reactnative.dev/';
//     //   const redirectTo = 'window.location = "' + newURL + '"';
//     //   this.webview.injectJavaScript(redirectTo);
//     // }
//   };
//   render() {
//     return (
//       <ImageBackground source={R.images.backgroundImage} style={styles.backgroundImage} imageStyle={{
//         resizeMode: 'stretch'
//       }} >
//         <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} />
//         <View style={{ flex: 1 }}>
//           <View style={{ flex: .96, }}>
//             <WebView style={{ marginLeft: 0, marginRight: 0 }}
//               source={{ uri: this.state.link }}
//               onNavigationStateChange={this.handleWebViewNavigationStateChange}
//             />
//           </View>
//           <CopyRight />
//         </View>
//       </ImageBackground>
//     );
//   }
// }

// const styles = StyleSheet.create({
//   backgroundVideo: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     bottom: 0,
//     right: 0,
//     backgroundColor: 'red',
//   },

//   backgroundImage: {
//     flex: 1,
//     width: null,
//     height: null,
//   },
// });