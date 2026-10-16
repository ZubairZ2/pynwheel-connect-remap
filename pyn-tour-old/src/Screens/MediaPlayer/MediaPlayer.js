
import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import Orientation from 'react-native-orientation';
import LoadingIndicator from '../../Components/LoadingIndicator';
import CopyRight from "../../Library/Components/Copyright";
import Header from '../../Library/Components/Header/index';
import R from "../../assest/R";


export default class MediaPlayer extends React.Component {
  constructor() {
    super();
    this.state = {
      isLoading: true,
      link: null
    }
  }

  videoError = (error) => {
    // debugger
  }

  componentDidMount() {
    Orientation.unlockAllOrientations()
    console.log("Orientation unlocked")
    const { navigation } = this.props;
    const link = navigation.getParam("link", null);
    // debugger
    // this.checkImageURL(link)
    if (link.length != null) {
      if (link.length > 5) {
        var lastFour = link.substr(link.length - 4);
        if (lastFour === ".mp4") {
          this.setState({ isLoading: false })
        }
      }
      this.setState({
        link: link
      })
    }
  }

  checkImageURL = (url) => {
    // debugger
    fetch(url)
      .then(res => {
        if (res.status == 404) {
          console.log("err")
          //return <Image source={require('./Images/default.png')}/>
        } 
        // else {
        //   console.log("err")
          //return <Image source={{uri: `${url}`}}  />
        // }
      })
      .catch(err =>
        console.log(err),
      )
  }

  loadEnded = (state) => {
    this.setState({ isLoading: false })
  }

  loadError = (state) => {
    this.setState({ isLoading: false })
  }

  loadError1 = (state) => {
    // debugger
    var state = state
  }

  handleWebViewNavigationStateChange = newNavState => {
    // debugger
    const { url } = newNavState;
    if (!url) return;

    if (!newNavState.loading) {
      this.setState({ isLoading: false })
    }
    // one way to handle errors is via query string
    if (url.includes('?errors=true')) {
      this.webview.stopLoading();
    }
  };

  render() {
    const { navigation } = this.props;
    return (
      <ImageBackground source={R.images.backgroundImage} style={styles.backgroundImage} imageStyle={{
        resizeMode: 'stretch'
      }} >
        <Header backBtnVisible={true} title= "Video" navigation={navigation} onGoBack={() => {
          if (navigation.goBack()) {
            navigation.goBack()
          } else {
            navigation.replace("Welcome");
          }
        }} />
        {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
        <LoadingIndicator visible={this.state.isLoading} />
        <View style={{ flex: 1 }}>
          <View style={{ flex: .96, backgroundColor: 'transparent' }}>
            <WebView style={{ backgroundColor: 'transparent', marginLeft: 10, marginRight: 10 }}
              source={{ uri: this.state.link }}
              onNavigationStateChange={this.handleWebViewNavigationStateChange}
              onLoadEnd={this.loadEnded}
              onError={this.loadError}
              onHttpError={this.loadError1}
              allowsInlineMediaPlayback={true}
            />
          </View>
          <CopyRight />
        </View>
      </ImageBackground>
    );
  }
  componentWillUnmount(){
    Orientation.lockToPortrait()
    console.log("orientation locked")
  }
}

const styles = StyleSheet.create({

  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'red',
  },

  backgroundImage: {
    flex: 1,
    width: null,
    height: null,
  },
});