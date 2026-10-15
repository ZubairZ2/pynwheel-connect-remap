import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

export default class Copyright extends React.Component {
    render() {
        return (
            <View style={style.okbuttonContainer} >
                <Text style={{ color: "#D3D3D3", fontSize: hp("1.6%") }}>© Pynwheel, Inc</Text>
            </View>
        )
    }
}

const style = StyleSheet.create({
    okbuttonContainer: {
        flex: .5,
        width: wp('32%'),
        position: 'absolute',
        left: wp('5.5%'),
        bottom: wp('.3%'),
    },
}
)
