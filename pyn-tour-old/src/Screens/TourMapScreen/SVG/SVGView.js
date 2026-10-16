import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { SvgCssUri } from 'react-native-svg';
import Spinner from "react-native-loading-spinner-overlay";

const SVGView = ({
    uri,
    width,
    height,
    children,
    onLayout
}) => {
    let w=width?width:1
    let h=height?height:1
    const [isLoading,setIsLoading]=useState(true)
    return(
        <View style={{aspectRatio:w/h}}>
            <SvgCssUri
                width="100%"
                height="100%"
                fontFamily={Platform.OS === 'android' ?  "GothamBold" :  "Gotham-Bold"}
                // viewBox={"0 0 "+width+" "+height}
                fill="#000"
                onLayout={(e)=>{
                    setIsLoading(false)
                    onLayout(e)
                }}
                uri={uri}
            />
            {!isLoading && children}
        </View>
    );
}
export default SVGView;
