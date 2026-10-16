import React from 'react'
import { TouchableOpacity, View, Text, Platform, Image, StyleSheet } from 'react-native'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import R from "../../assest/R";

export default class VideoPlayButton extends React.Component {
    render() {
        return (
            <View style={style.okbuttonContainer} >
                <TouchableOpacity style={{ flexDirection: 'column' }} onPress={this.props.goPressed}>
                    <Image source={R.images.playicon} style={{ alignSelf: 'center', width: 20, height: 22 }} />
                    <Text style={{ color: "white", textAlign: "center", marginTop: 8, marginLeft: 10, marginRight: 10, fontSize: wp('2.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{this.props.title}</Text>
                </TouchableOpacity>
            </View>
        )
    }
}

const style = StyleSheet.create({
    okbuttonContainer: {
        width: 70,
        height: 70,
        alignContent: "center",
        justifyContent: 'center',
        borderRadius: 35,
        position: 'absolute',
        right: wp('40%'),
        bottom: hp('17%'),
        backgroundColor: 'black'
    },
}
)