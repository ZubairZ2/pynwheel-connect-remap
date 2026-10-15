import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import EntypoIcon from "react-native-vector-icons/Entypo";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome";


const ActionButton = ({ type, disabled, onPress }) => {
    return (
        <TouchableOpacity style={[styles.container, styles.shadow]} disabled={disabled} onPress={onPress}>
            {type === 'UNLOCK' && <FontAwesomeIcon name="unlock-alt" size={wp(5)} color="#000" />}
            <Text style={styles.text}>{type}</Text>
            {type === 'NEXT' && <EntypoIcon name="chevron-thin-right" size={wp(5)} color="#000" />}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopLeftRadius: 100,
        borderBottomLeftRadius: 100,
        backgroundColor: '#C0C0BE',
        flexDirection: "row",
        height: wp(16),
        paddingHorizontal: wp(5),
        justifyContent: 'center',
        alignItems: 'center',
        right: 0
    },
    text: {
        fontSize: wp(5),
        color: '#000',
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        letterSpacing: -1,
        marginHorizontal: wp(1)
    },
    shadow: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    }
});

export default ActionButton;
