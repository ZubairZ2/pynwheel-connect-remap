import React from 'react';
import { Text } from 'react-native';

const CustomText = (props) => {
    const {children,style,}=props
    return(
    <Text {...props} style={[{
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
    },style]}>
        {children}
    </Text>
);}

export default CustomText;
