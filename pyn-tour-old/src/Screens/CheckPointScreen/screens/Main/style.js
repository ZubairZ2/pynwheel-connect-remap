import React from 'react';
import {StyleSheet,Platform} from 'react-native';

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
    marginTop: 25,
    marginBottom: 30,
    fontSize: 18,
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
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
    marginTop: 50,
    height: 350,
    width: '100%',
  },
});

export default styles;
