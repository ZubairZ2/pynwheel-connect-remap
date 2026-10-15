import React, {Component} from 'react';
import {Text, View, Image, TouchableOpacity,Platform, StyleSheet} from 'react-native';
import R from '../../../../assest/R';
import BackgroundImage from '../../../../Library/Components/PageBackgroundImage';
import styles from './style';
import CPHeader from '../../../../Library/Components/Header';
export class Checkpoint extends Component {
  
  onGoBack=()=>{
    this.props.navigation.navigate("Home")
  }
  render() {
    return (
      <View style={{flex:1}}>
        <CPHeader backBtnVisible onGoBack={this.onGoBack} title="CHECKPOINT" />
      <BackgroundImage style={styles.container}>
        <View style={{marginTop: '20%', alignItems: 'center'}}>
          <Image
            source={R.images.checkpoint}
            style={{height: 150, width: 150,tintColor:"#FFF"}}
            resizeMode="contain"
          />

          <View
            style={{
              width: '70%',
              marginTop: '15%',
            }}>

            <Text style={styles.beforProceed}>
              Before we can proceed, we need to verify your identity.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            this.props.navigation.navigate('Main');
          }}>
          <Image
            source={R.images.goButtonImage}
            style={{width: '35%', height: '100%'}}
          />
        </TouchableOpacity>
      </BackgroundImage>
      </View>
    );
  }
}

export default Checkpoint;
