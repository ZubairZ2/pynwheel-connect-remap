
import { View } from 'react-native';
import React, { Component, styles } from 'react';
// import { WebView } from 'react-native-webview';
import { WebView } from 'react-native-webview';
import Header from "../../../Library/Components/Header/index"
import Spinner from "react-native-loading-spinner-overlay";
import LoadingIndicator from '../../../Components/LoadingIndicator';

export default class App extends Component {

  constructor() {
    super();
    this.state = {
      isLoading: true,
    }
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
    const applyUnitURL = navigation.getParam("applyUnitURL", "");
    const title = navigation.getParam("title", null);


   


    //alert(applyUnitURL)
    // debugger
    return (
      <View style={{ flex: 1 }}>
        <Header backBtnVisible={true} title={title.toUpperCase()} navigation={navigation} onGoBack={() => {
          if (navigation.goBack()) {
            navigation.goBack()
          } else {
            navigation.replace("Welcome");
          }
        }} />
        {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
        <LoadingIndicator visible={this.state.isLoading} />
        {/* <WebView source={{ uri: applyUnitURL }} style={{ marginTop: 20 }}

          onNavigationStateChange={this.handleWebViewNavigationStateChange}

        /> */}
        <WebView scrollIndicatorInsets={{ right: 1 }} style={{ backgroundColor: 'transparent', marginLeft: 10, marginRight: 10 }}
              source={{ uri: applyUnitURL }}
              //  source={{ uri: "www.google.com" }}
              onNavigationStateChange={this.handleWebViewNavigationStateChange}
              onLoadEnd={this.loadEnded}
              onError={()=>{
                this.setState({isLoading:false})
              }}
              onHttpError={()=>{
                this.setState({isLoading:false})
              }}
              allowsInlineMediaPlayback={true}
            />
      </View>
    );
  }
}
