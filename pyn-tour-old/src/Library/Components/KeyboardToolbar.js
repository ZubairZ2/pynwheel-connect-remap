import React, { useState } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { View } from "react-native-animatable";
import { TouchableOpacity } from "react-native-gesture-handler";
const isAndroid=Platform.OS==="android"?true:false
const KeyboardToolbar = ({onDonePress}) => {
  

    const [kbh, setKbh] = useState(0);
    if (kbh >0) {
        return (
            <View style={styles.constinaer}>
            <TouchableOpacity
            onPress={onDonePress}
            style = {[ 
                isAndroid?styles.android:styles.ios,
                !isAndroid&&{bottom:kbh}
                ]}>
                <Text style={{color:"#325bfc",fontWeight:"bold",padding:5}}>Done</Text>
            </TouchableOpacity>
           </View>
  )
}
else {
    return null
}
}

export default KeyboardToolbar;

const styles=StyleSheet.create({
    constinaer:{
        zIndex:999,
        elevation:10,
        width:"100%",backgroundColor: "#e6e6e6",justifyContent:"flex-start"
    },
    android:{
    },
    ios:{
        position: "absolute",
        backgroundColor: "#e6e6e6",
    }
})