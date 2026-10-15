import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

import R from "../../assest/R";
export default class Logo extends React.Component {
    render() {
        const {imageStyle,url,LogoUrl}=this.props
        let dynamicLogoUrl=LogoUrl
        if(LogoUrl && typeof(LogoUrl)==="object"){
            dynamicLogoUrl=LogoUrl.url
        }
        return (
            <View style={style.logo}>
                <Image
                    source={(url && !dynamicLogoUrl)?R.images.logoFinal:{uri: dynamicLogoUrl }}
                    style={[{
                        width: wp("45%"),
                        height: hp("20%"),
                        marginTop: hp('5%'),
                        resizeMode: "contain",
                    },imageStyle]}
                 defaultSource={R.images.logoFinal}
                />
            </View>
        )
    }
}

const style = StyleSheet.create({
    logo: {
        alignSelf:"center",
        justifyContent:"center"
    },
})
