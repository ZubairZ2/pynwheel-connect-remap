
import React from 'react';
import Video from 'react-native-video';
import { WebView } from 'react-native-webview';
import Spinner from "react-native-loading-spinner-overlay";
import { View, ImageBackground, StyleSheet, NetInfo } from 'react-native';
import ServerConfig from "../../Library/ServerCalls/ServerConfig"
import Singleton from "../../Singleton"

import R from "../../assest/R";
import CopyRight from "../../Library/Components/Copyright"
import { checkPOintServerPing } from "../../Library/ServerCalls/API"
import LoadingIndicator from '../../Components/LoadingIndicator';

export default class CheckPoint extends React.Component {

  constructor() {
    super();
    this.serverPingInProgress = false
    this.state = {
      isLoading: true,
      link: null
    }
  }

  componentWillUnmount() {
    console.log("componentWillUnmount")
    clearInterval(this.serverPingTimer)
  }

  handleWebViewNavigationStateChange = newNavState => {
    // debugger
    const { url } = newNavState;
    if (!url) return;

    if (!newNavState.loading) {
      this.setState({ isLoading: false })
    }
    if (url.includes('metaData.uniq_id=')) {
      var index = (url.lastIndexOf('=') + 1)
      this.ID = url.substring(index);
      console.log("handleWebViewNavigationStateChange")
    this.startTimer()
    }
    if (url.includes('check_point_id_success')) {
      // this.props.navigation.replace("TourReview")
      this.props.navigation.goBack()
    }
    // one way to handle errors is via query string
    if (url.includes('?errors=true')) {
    }
  };
  startTimer =()=> {
    // debugger
    if (!this.serverPingTimer){
      console.log("startTimer")
      this.serverPingTimer = setInterval(this.tick, 20000);
      //this.serverPingTimer = setInterval(this.tick, 2000);
    }
    
  }
  tick = () => {
    console.log("tick")
    if (this.serverPingInProgress === false) {
      this.serverPingInProgress = true
      checkPOintServerPing(this.ID)
      .then(response => response.json())
      .then(responseJson => {
        this.serverPingInProgress = false
        var tourUser = responseJson
        if (tourUser.length > 0) {
          if (tourUser[0].statusName !== 'undefined'){
            if (tourUser[0].statusName === "Success"){
              clearInterval(this.serverPingTimer)
              // this.props.navigation.replace("TourReview")
              this.props.navigation.goBack()
            }
          }
        }
        
        // if (tourUser.un_read_msgs_count !== 'undefined') {
        //   this.setState({ unReadMessageCount: tourUser.un_read_msgs_count })
        // }
        // if (tourUser.id_mismatch === true && this.showIDMisMatch) {
        //   this.showIDMisMatch = false
        //   clearInterval(this.serverPingTimer)
        //   //this.appGoseInBackground()
        //   ActivityTrackerManager.getInstance().setLengthyStayTime()
        //   //this.getLatestLocation()
        //   trackTourUserActivity()
        //   this.props.navigation.navigate("IdVerificationError")
        // }
      })
      .catch(error => { 
        this.serverPingInProgress = false
        console.log(error);
       });
    }
  }
  render() {
    // debugger
    return (
      <ImageBackground source={R.images.backgroundImage} style={styles.backgroundImage} imageStyle={{
        resizeMode: 'stretch'
      }} >
        {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
        <LoadingIndicator visible={this.state.isLoading} />
        <View style={{ flex: 1 }}>
          <View style={{ flex: .96, }}>
            <WebView style={{ marginLeft: 0, marginRight: 0 }}
          
              source={{ uri: `${ServerConfig.BaseURL}` + '/communities/' + Singleton.getInstance().getPropertyId() + '/tour_users/' + Singleton.getInstance().getTourUserId() + "/checkpoint_verification" + '?license_key=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwic2NwIjoidXNlciIsImF1ZCI6bnVsbCwiaWF0IjoxNTgwMjA3MjkxLCJleHAiOjE2NDMzMjExOTUsImp0aSI6ImFjNmE0NzdlLTRkMTktNGE3MC04NTYyLTQxZjNjMjZhMDkyZiJ9.J8He5WI6--B0aRL7pZLkPD8OFPI9ilgxtG1Qy0VUb4U' }}
              onNavigationStateChange={this.handleWebViewNavigationStateChange}
            />
          </View>
          <CopyRight />
        </View>
      </ImageBackground>
    );
  }
}
//https://pynwheel-staging.herokuapp.com/communities/457/tour_users/1/checkpoint_verification
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