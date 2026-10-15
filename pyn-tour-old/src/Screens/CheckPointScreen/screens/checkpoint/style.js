import React, {Component} from 'react';
import {StyleSheet} from 'react-native';
import {heightPercentageToDP as hp,widthPercentageToDP as wp} from 'react-native-responsive-screen'
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151515',
    alignItems: 'center',
    padding: 10,
  },
  btn: {
    // flex: 1,
    bottom: 50,
    flexDirection: 'row-reverse',
    position: 'absolute',
    width: '100%',
    height: '15%',
  },
  verify: {
    color: 'gray',
    fontSize: 18,
  },
  beforProceed: {
    fontSize: hp(3),
    color: 'white',
    lineHeight: hp('4.2%'),
    textAlign: 'center',
    justifyContent: 'center',
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
  }
});

export default styles;
