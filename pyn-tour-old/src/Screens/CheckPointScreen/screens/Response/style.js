import React from 'react';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151515',
  },
  response: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  constainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  btn: {
    marginBottom: 20,
    bottom: 0,
    position: 'absolute',
    width: 250,
    height: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tick: {
    width: 100,
    height: 100,
    borderRadius: 360,
    borderWidth: 1,
    borderColor: '#00ff00',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default styles;
