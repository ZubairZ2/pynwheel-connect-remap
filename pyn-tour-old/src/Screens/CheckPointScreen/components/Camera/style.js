import React, {Component} from 'react';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    height: '80%',
    width: '100%',
    flexDirection: 'column',
    marginTop: '10%',
    overflow: 'hidden',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'white',
  },
  preview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  driving: {
    height: '100%',
    width: '90%',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drivingText: {
    alignItems: 'flex-end',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  passportId: {
    height: '100%',
    width: '90%',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'white',
  },
  mrzOverlay: {
    bottom: 0,
    position: 'absolute',
    opacity: 0.3,
    backgroundColor: 'white',
    height: '20%',
    width: '100%',
  },
});

export default styles;
