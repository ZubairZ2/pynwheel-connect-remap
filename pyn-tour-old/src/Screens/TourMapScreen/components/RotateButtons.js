import React from 'react';
import { Pressable, StyleSheet, Image, View, Slider, Text } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import images from '../../../assest/images';

export const RotateButtons = ({
    onLeft, onRight
}) => (
    <View style={styles.container}>
        <Pressable 
        style={styles.btn}
        onPress={onRight}>
            <Image style={[styles.icon,{marginRight:"10%"}]} source={images.turn_left} />
            <Text style={styles.btnTxt}>ROTATE MAP</Text>
        </Pressable>
        <Pressable 
        style={styles.btn}
        onPress={onLeft}>
            <Text style={styles.btnTxt}>ROTATE MAP</Text>
            <Image style={[styles.icon,{marginLeft:"10%"}]} source={images.turn_right} />
        </Pressable>
    </View>
);

export const RotateSlider = ({ onSlide }) => (
    <View style={styles.sliderContainer}>
        <Text style={styles.rotIcon}>+</Text>
        <View style={{flex:1}}>
            <Slider maximumTrackTintColor="grey"
                onValueChange={onSlide}
                minimumTrackTintColor="grey" value={180} maximumValue={360} minimumValue={0} style={{ marginTop: 5, flex: 1 }} />
        </View>
        <Text style={styles.rotIcon}>-</Text>
    </View>
);
const styles = StyleSheet.create({
    container: {
        zIndex: 10,
        elevation: 5,
        flexDirection: "row",
        bottom: 0,
    },
    icon: {
        width: 35,
        height: 35,
        resizeMode: "contain",
    },
    btn:{
        backgroundColor:"#000",
        padding:10,
        flex:1,
        opacity:0.6,
        margin:5,
        flexDirection:"row",
        justifyContent:"center",
        alignItems:"center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,

        elevation: 5,
    },
    btnTxt:{
        textAlign:"center",
        color:"#FFF",
        fontSize: hp('1.7`%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
    },
    hrl: {
        backgroundColor: "grey",
        width: 2,
        opacity: 0.6,
        height: "100%",
    },
    vrlSlider: {
        backgroundColor: "#000",
        width: 2,
        height: "100%",
    },
    sliderContainer: {
        flex: 1,
        zIndex: 10,
        elevation: 5,
        backgroundColor: "white",
        opacity: 0.6,
        flexDirection: "row",
        position: "absolute",
        top: 0,
        right: 0,
        borderWidth: 0.4,
        borderColor: "grey"
    },
    rotIcon: {
        fontSize: 36
    }
})