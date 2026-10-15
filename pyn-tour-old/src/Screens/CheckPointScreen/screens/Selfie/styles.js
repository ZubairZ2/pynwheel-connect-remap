import React from 'react';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#151515',
    // backgroundColor: '#fe4a49',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    margin: 50,
    borderRadius: 360,
    overflow: 'hidden',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 360,
    height: 50,
    width: 50,
    alignSelf: 'center',
    margin: 20,
  },
  selfie: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default styles;
