import React, { PureComponent } from 'react';
import { Text, View } from 'react-native';
import { RNCamera } from 'react-native-camera';
import styles from './style';

export default class ExampleApp extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      images: 0,
      cam: true,
      arr: [],
      scan: 'Passport',
      time: 0,
      type:
        this.props.type == 'front'
          ? RNCamera.Constants.Type.front
          : RNCamera.Constants.Type.back,
    };
    this.camera = null;
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({ time: 1 });
    }, 3000);
  }

  componentDidUpdate(preProps, prevState) {
    if (this.props.takePicture) {
      const picture = async () => {
        await this.takePicture();
      };
      picture();
    }
    if (prevState.time !== this.state.time && this.state.time == 2) {
      setTimeout(() => {
        this.setState({ time: 3 });
      }, 3000);
    }
  }

  documentPassportAndId = () => {
    return (
      <View style={styles.passportId}>
        <View style={styles.mrzOverlay}></View>
      </View>
    );
  };

  documentDriving = () => {
    return (
      <View style={styles.driving}>
        <Text style={styles.drivingText}>
          {this.state.time == 0 && <Text>Take a photo from front side</Text>}
          {this.state.time == 2 && <Text>Take a photo from back side</Text>}
        </Text>
      </View>
    );
  };

  takePicture = async () => {
    if (!this.camera) return;
    try {
      await this.camera.takePictureAsync({ quality: 0.5, base64: true, fastMode: true, id: Date.now() });
    } catch (err) {
      console.error('takePictureAsync error:', err);
    }
  };

  _onPictureSaved = (event) => {
    const data = event?.nativeEvent?.data ?? event?.data;
    if (!data) return;
    if (data.base64) {
      this.props.setImg(data.base64);
    }
    this.setState({ type: RNCamera.Constants.Type.front });
  };

  render() {
    return (
      <View style={styles.container}>
        <RNCamera
          captureAudio={false}
          ref={(ref) => { this.camera = ref; }}
          style={this.props.style ? this.props.style : styles.preview}
          type={this.state.type}
          flashMode={RNCamera.Constants.FlashMode.off}
          onPictureSaved={this._onPictureSaved}
        />
      </View>
    );
  }
}
