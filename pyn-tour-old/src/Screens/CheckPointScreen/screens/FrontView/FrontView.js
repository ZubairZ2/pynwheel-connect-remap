import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { NavigationActions, StackActions } from 'react-navigation';
import CPHeader from '../../../../Library/Components/Header';
import BackgroundImage from '../../../../Library/Components/PageBackgroundImage';

export class FrontView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      document: this.props.navigation.getParam('document'),
      loading: false,
      image: '',
      camera: false,
      cameraType: RNCamera.Constants.Type.back,
      headerTitle: "SCAN YOUR ID",
      // views
      frontView: true,
      backView: false,
      selfiView: false,
      // images for
      frontImage: null,
      backImage: null,
      selfiImage: null
    };
    this.camera = null;
  }

  setInImageArr = (picture) => {
    const { document, frontView, backView, selfiView } = this.state
    if (frontView) {
      if (document === "Driving" || document === "Id") { this.setState({ frontImage: picture, backView: true, frontView: false, selfiView: false, headerTitle: "SCAN THE BACK OF YOUR ID" }) }
      else { this.setState({ frontImage: picture, backView: false, frontView: false, selfiView: true, headerTitle: "TAKE A SELFIE" }) }
    }
    if (backView) { this.setState({ backImage: picture, backView: false, frontView: false, selfiView: true, headerTitle: "TAKE A SELFIE" }) }
    if (selfiView) { this.setState({ selfiImage: picture, backView: false, frontView: false }, () => { this.moveToResponseScreen() }) }
  };

  moveToResponseScreen = () => {
    const { frontImage, backImage, selfiImage, document } = this.state
    const params = {
      frontImg: frontImage,
      backImg: backImage,
      selfie: selfiImage,
      scan: document
    }
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({ routeName: 'Response', params: params })],
    });
    this.props.navigation.dispatch(resetAction)
  }
  onGoBack = () => {
    const { frontView, backView, selfiView, document } = this.state
    if (frontView) { this.props.navigation.goBack() }
    if (backView) { this.setState({ backView: false, frontView: true, selfiView: false, headerTitle: "SCAN YOUR ID" }) }
    if (selfiView) {
      if (document === "Driving" || document === "Id") { this.setState({ backView: true, frontView: false, selfiView: false, headerTitle: "SCAN THE BACK OF YOUR ID" }) }
      else { this.setState({ backView: false, frontView: true, selfiView: false, headerTitle: "SCAN YOUR ID" }) }
    }
  }

  _onPictureSaved = (event) => {
    const data = event?.nativeEvent?.data ?? event?.data;
    if (!data) return;
    if (data.base64) {
      this.setInImageArr(data.base64);
    }
  }

  cameraView = () => {
    const { selfiView } = this.state
    return (
      <View style={styles.camCont}>
        <RNCamera
          captureAudio={false}
          ref={(ref) => { this.camera = ref; }}
          style={{ flex: 1 }}
          type={selfiView ? RNCamera.Constants.Type.front : RNCamera.Constants.Type.back}
          flashMode={RNCamera.Constants.FlashMode.off}
          onPictureSaved={this._onPictureSaved}>
        </RNCamera>
      </View>
    )
  }
  onOKPress = () => {
    if (!this.camera) return;
    this.camera.takePictureAsync({ quality: 1, base64: true, fastMode: true, id: Date.now() }).catch(() => {});
  }
  render() {
    const { frontView, backView, selfiView } = this.state
    return (
      <View style={{ flex: 1 }}>
        <CPHeader title={this.state.headerTitle} backBtnVisible onGoBack={this.onGoBack} />
        <BackgroundImage style={styles.constainer}>

          <Text style={ styles.text}>
            {frontView && "First, Please scan your ID by holding it face-up in the square below"}
            {backView && " Now, scan the back of your ID by holding it in the square below."}
            {selfiView && 'Please press "ok" below to take a picture of yourself for ID verification.'}
          </Text>

          <View style={[styles.camera, selfiView && { height: 450 }]}>
            {this.cameraView()}
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={this.onOKPress}>
            <Text style={styles.verify}>OK</Text>
          </TouchableOpacity>
        </BackgroundImage>
      </View>
    );
  }
}

export default FrontView;

const styles = StyleSheet.create({
  constainer: {
    flex: 1,
    backgroundColor: '#151515',
    padding: 15,
  },
  document: {
    color: 'white',
    width: '100%',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 15,
    fontSize: 18,
  },
  btn: {
    flex: 1,
    bottom: 0,
    position: 'absolute',
    width: '100%',
    height: 60,
    margin: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  verify: {
    color: 'gray',
    fontSize: 18,
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
  camera: {
    height: 350,
    width: '100%',
  },
  doc: {
    flex: 1
  },
  selfi: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camCont: {
    height: '80%',
    width: '100%',
    flexDirection: 'column',
    marginTop: '10%',
    overflow: 'hidden',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'white',
  },
  text: {
    color: 'gray', 
    lineHeight:30,
    fontSize: 16, marginTop: 30, marginBottom: 30, textAlign: 'center', fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  }
});

