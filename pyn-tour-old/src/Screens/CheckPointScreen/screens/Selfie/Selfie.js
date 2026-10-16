import React, {Component} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import BackgroundImage from '../../../../Library/Components/PageBackgroundImage';
import Camera from '../../components/Camera/Camera';
import CPHeader from '../../../../Library/Components/Header';
import { StackActions,NavigationActions } from 'react-navigation';

export class BackView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      document: this.props.navigation.getParam('document'),
      loading: false,
      images: '',
      camera: false,
    };
  }

  changeCategory = (value) => {
    this.setState(
      {
        document: value,
        loading: true,
      },
      () => {
        setTimeout(() => {
          this.setState({
            loading: false,
          });
        }, 100);
      },
    );
  };

  documentScan = () => {
    this.setState({
      camera: true,
    });
  };

  setInImageArr = (picture) => {
    this.setState(
      {
        camera: false,
      },
      () => {
        console.log(this.state.document, 'Se');
        this.props.navigation.navigate('Response', {
          frontImg: this.props.navigation.getParam('frontImg'),
          backImg: this.props.navigation.getParam('backImg'),
          selfie: picture,
          scan: this.state.document,
        });
      },
    );
  };

  onGoBack=()=>{
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({routeName: 'BackView',params:{document:this.state.document}})],
    });
    this.props.navigation.dispatch(resetAction)
  }

  render() {
    console.log(this.state.document);
    return (
      <BackgroundImage style={styles.constainer}>
        <CPHeader title="TAKE A SELFIE" onGoBack={this.onGoBack}/>
        <Text style={{color: 'gray', fontSize: 16, textAlign: 'center'}}>
          Please press "ok" below to take a picture of yourself for ID
          verification.
        </Text>
        {/* </View> */}

        <View style={styles.camera}>
          <Camera
            document={this.state.document}
            setImg={(img) => this.setInImageArr(img)}
            takePicture={this.state.camera}
            type="front"
            // length={this.state.images.length}
          />
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            this.documentScan();
          }}>
          <Text style={styles.verify}>OK</Text>
        </TouchableOpacity>
      </BackgroundImage>
    );
  }
}

export default BackView;

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
  },
  camera: {
    // marginTop: 50,
    height: 450,
    width: '100%',
  },
});
