
import React from 'react';
import { ImageBackground, Platform, StyleSheet, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { WebView } from 'react-native-webview';
import CopyRight from "../../Library/Components/Copyright";
import Header from '../../Library/Components/Header/index';
import { customWebviewFontCSS } from '../../Utils/Helpers';
import R from "../../assest/R";

export default class PrivacyPolicy extends React.Component {

  // static navigationOptions = ({ navigation }) => {
  //   return {
  //     title: typeof (navigation.state.params) === 'undefined' || typeof (navigation.state.params.title) === 'undefined' ? '' : navigation.state.params.title.toUpperCase()
  //   }
  // }

  constructor() {
    super();
    this.state = {
      htmlString: null,
      title: ""
    }
  }

  // ChangeThisTitle = (titleText) => {
  //   const { setParams } = this.props.navigation;
  //   setParams({ title: titleText })
  // }
  componentWillMount() {
    const { navigation } = this.props;
    const title = navigation.getParam("title", null);
    const des = navigation.getParam("des", null);
    //this.ChangeThisTitle(title)
    this.setState({ 
      htmlString: des,
      title: title
     })
  }
  pressAgree() {
    alert("agree")
  }

  pressDisagree() {
    alert("disagree")
  }

  render() {
    const { navigation } = this.props;

    let scaleFactor = Platform.OS === 'android' ? '0.35' : '0'
    const INJECTEDJAVASCRIPT = `const meta = document.createElement('meta'); meta.setAttribute('content', 'width=device-width, initial-scale=${scaleFactor}, maximum-scale=${scaleFactor}, user-scalable=0'); meta.setAttribute('name', 'viewport'); document.getElementsByTagName('head')[0].appendChild(meta);`
    return (
      <ImageBackground source={R.images.backgroundImage} style={styles.backgroundImage} imageStyle={{
        resizeMode: 'stretch'
      }} >
        <Header backBtnVisible={true} title={this.state.title.toUpperCase()} navigation={navigation} onGoBack={() => {
          if (navigation.goBack()) {
            navigation.goBack()
          } else {
            navigation.replace("Welcome");
          }
        }} />
        <View style={{ flex: 1 }}>
          <View style={{ flex: .96, backgroundColor: 'transparent' }}>
            {/* {
              this.state.comeFrom == 'showMoreText' ? */}
                <WebView style={{ backgroundColor: 'transparent', marginLeft: 10, marginRight: 10 }}
                  originWhitelist={['*']}
                  // injectedJavaScript={Platform.OS === 'android' ? INJECTEDJAVASCRIPT : ""}
                  // scalesPageToFit={Platform.OS === 'android' ? false : true}
                  source={{
                    // html: `<>${this.stopData?.long_stop_description}` 
                    html: ` <head><meta content="initial-scale=1.1, maximum-scale=1.1" name="viewport"></meta>
                    <style>
                    ${customWebviewFontCSS()}
                    </style>
                    </head>
                    <body>
                        ${this.state.htmlString}
                    </body>`
                  }}
                /> 
                 {/* : */}
                 {/* <WebView style={{ backgroundColor: 'transparent', marginLeft: 10, marginRight: 10 }}
                  originWhitelist={['*']}
                  injectedJavaScript={Platform.OS === 'android' ? INJECTEDJAVASCRIPT : ""}
                  // scalesPageToFit={Platform.OS === 'android' ? false : true}
                  source={{ html: this.state.htmlString }}
                /> */}
            {/* } */}

          </View>
          <CopyRight />
        </View>
      </ImageBackground>
    );
  }
}

const styles = StyleSheet.create({

  okButton: {
    width: wp("45%"),
    height: hp("7%"),
    backgroundColor: "#D3D3D3",
    justifyContent: "center",
    alignItems: "center"
  },
  backgroundImage: {
    flex: 1,
    width: null,
    height: null,
  },
  ok: {
    textAlign: 'center',
    color: 'black',
    fontSize: hp('1.9%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
});