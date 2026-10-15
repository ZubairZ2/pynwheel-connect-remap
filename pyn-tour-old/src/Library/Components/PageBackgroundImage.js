import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

import R from "../../assest/R";

export default class BackgroundImage extends React.Component {
  render() {
    const {style}=this.props
    return (
      <ImageBackground
        source={R.images.backgroundImage}
        style={[style.mainContanier,style]}
        imageStyle={{
          resizeMode: "stretch"
        }}>
          {this.props.children}
      </ImageBackground>
    )
  }
}

const style = StyleSheet.create({
  mainContanier: {
    backgroundColor: 'green',
    flex: 1,
  },
})
