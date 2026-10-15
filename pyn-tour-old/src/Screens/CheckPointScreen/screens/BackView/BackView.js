import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { NavigationActions, StackActions } from 'react-navigation';
import CPHeader from '../../../../Library/Components/Header';
import BackgroundImage from '../../../../Library/Components/PageBackgroundImage';
import Camera from '../../components/Camera/Camera';


export class BackView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      images: '',
      camera: false,
      type: 'back',
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
        type: 'front',
      },
      () => {
        setTimeout(() => {
          this.props.navigation.navigate('Selfie', {
            frontImg: this.props.navigation.getParam('frontImg'),
            backImg: picture,
            document: this.state.document,
          });
        }, 100);
      },
    );
  };
  onGoBack=()=>{
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({routeName: 'FrontView',params:{document:this.state.document}})],
    });
    this.props.navigation.dispatch(resetAction)
  }

  render() {
    return (
      <BackgroundImage style={styles.constainer}>
        <CPHeader title="SCAN THE BACK OF YOUR ID" backBtnVisible onGoBack={this.onGoBack}/>

        <Text style={{color: 'gray', fontSize: 16,marginTop:30,marginBottom:30, textAlign: 'center',fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"}}>
          Now, scan the back of your ID by holding it in the square below.
        </Text>

        <View style={styles.camera}>
          <Camera
            document={this.state.document}
            setImg={(img) => this.setInImageArr(img)}
            takePicture={this.state.camera}
            type={this.state.type}
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
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
  camera: {
    height: 350,
    width: '100%',
  },
});
