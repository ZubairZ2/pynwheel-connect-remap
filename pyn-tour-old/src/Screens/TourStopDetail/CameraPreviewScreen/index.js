import React, { Component } from 'react';
import { Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

import LoadingIndicator from '../../../Components/LoadingIndicator';
import CopyRight from "../../../Library/Components/Copyright";
import Header from '../../../Library/Components/Header/index';
import { uploadTourStopPicture } from '../../../Library/ServerCalls/API';
import R from "../../../assest/R";

class CameraPreviewScreen extends Component {
  constructor(props) {
    super(props);
    this.camera = null;
    this.stopID = null;
    this.state = {
      isLoading: false,
      imageUri: null,
      photo: null,
      camera: {
        type: RNCamera.Constants.Type.back,
        flashMode: RNCamera.Constants.FlashMode.auto,
        barcodeFinderVisible: false
      }
    };
  }

  componentDidMount() {
    const { navigation } = this.props;
    this.stopID = navigation.getParam("stopData", null);
  }

  uploadPicture = () => {
    this.setState({ isLoading: true });
    uploadTourStopPicture(this.state.photo, this.stopID)
      .then(res => res.json())
      .then(res => {
        this.setState({ isLoading: false });
        this.props.navigation.goBack();
      })
      .catch(() => {
        this.setState({ isLoading: false });
        setTimeout(() => {
          alert('Something went wrong, please try again.');
          this.props.navigation.goBack();
        }, 800);
      });
  }

  takePicture = async () => {
    if (!this.camera) return console.warn('📸 Camera not ready');
    try {
      // fastMode: resolve immediately, actual data arrives via onPictureSaved
      await this.camera.takePictureAsync({ quality: 0.1, base64: true, fastMode: true, id: Date.now() });
    } catch (err) {
      console.error('📸 takePictureAsync error:', err);
    }
  }

  _onPictureSaved = (event) => {
    // Newer RN / patched native may pass { data: { uri } } at top level; legacy uses nativeEvent.data
    const data = event?.nativeEvent?.data ?? event?.data;
    if (!data?.uri) {
      console.warn('📸 Capture failed, no URI returned', event);
      return;
    }
    console.log('📸 Photo captured:', data.uri);

    this.setState({
      photo: data.uri,
      imageUri: { uri: data.uri }
    });
  }

  reCaptureImage = () => {
    this.setState({ imageUri: null, photo: null });
  }

  yesUploadImage = () => {
    this.uploadPicture();
  }

  render() {
    const { navigation } = this.props;
    const { imageUri, isLoading } = this.state;

    if (imageUri) {
      return (
        <View style={styles.container2}>
          <LoadingIndicator visible={isLoading} />
          <Header backBtnVisible title="Capture Image" navigation={navigation} onGoBack={() => navigation.goBack()} />
          <Image source={imageUri} style={styles.previewImage} />
          <View style={styles.bottomButtonsContainer}>
            <TouchableOpacity style={styles.noThanksButtonView} onPress={this.reCaptureImage}>
              <Text style={styles.noButton}> Recapture </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.yesButtonView} onPress={this.yesUploadImage}>
              <Text style={styles.yesButton}> Upload </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Header backBtnVisible title="Capture Image" navigation={navigation} onGoBack={() => navigation.goBack()} />
        <RNCamera
          captureAudio={false}
          ref={ref => this.camera = ref}
          defaultTouchToFocus
          flashMode={this.state.camera.flashMode}
          mirrorImage={false}
          onFocusChanged={() => {}}
          onZoomChanged={() => {}}
          style={styles.preview}
          type={this.state.camera.type}
          onPictureSaved={this._onPictureSaved} // ✅ Critical for fastMode
        />
        <View style={[styles.overlay, styles.bottomOverlay]}>
          <TouchableOpacity style={styles.enterBarcodeManualButton} onPress={this.takePicture}>
            <Image style={{ width: 40, height: 40 }} source={R.images.cameraIcon} />
          </TouchableOpacity>
        </View>
        <CopyRight />
      </View>
    );
  }
}

const styles = {
  container: { flex: 1, backgroundColor: 'black' },
  container2: { flex: 1, backgroundColor: 'white', justifyContent: 'center' },
  previewImage: { flex: 1, marginBottom: hp("3%"), width: wp("100%"), height: hp("75%"), resizeMode: "stretch" },
  preview: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'black' },
  overlay: { position: 'absolute', padding: 16, right: 0, left: 0, alignItems: 'center' },
  bottomOverlay: { bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  enterBarcodeManualButton: { padding: 15, backgroundColor: 'white', borderRadius: 40 },
  bottomButtonsContainer: { flex: 0.5, justifyContent: 'space-around', flexDirection: 'row', marginBottom: 20 },
  noThanksButtonView: { justifyContent: 'center', alignItems: "center", backgroundColor: "#D3D3D3", width: wp("45%"), height: hp("6%") },
  yesButtonView: { justifyContent: 'center', alignItems: "center", backgroundColor: "#D3D3D3", width: wp("45%"), height: hp("6%") },
  yesButton: { fontSize: wp('4%'), color: 'black' },
  noButton: { fontSize: wp('4%'), color: 'black' }
};

export default CameraPreviewScreen;