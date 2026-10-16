import React from 'react'
import { TouchableOpacity, View, ImageBackground, StyleSheet } from 'react-native'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import R from "../../assest/R";

export default class GoButton extends React.Component {
    render() {
        return (
            <View style={this.props.containerStyle ?? style.okbuttonContainer} >
                <TouchableOpacity disabled={this.props.disabled} onPress={this.props.goPressed}
                    style={{ flex: 1 }}>
                    <ImageBackground source={this.props.icon ?? R.images.nextTextButton} style={{ flex: 1 }}
                        imageStyle={{
                            resizeMode: 'stretch'
                        }}>
                    </ImageBackground>
                </TouchableOpacity>
            </View>
        )
    }
}

const style = StyleSheet.create({
    okbuttonContainer: {
        aspectRatio: 1.45 / 1,
        width: wp('32%'),
        position: 'absolute',
        right: wp('0%'),
        bottom: hp('16%'),
      },
})
