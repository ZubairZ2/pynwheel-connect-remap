import React from 'react';
import { Modal, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import R from '../assest/R';

const LoadingIndicator = ({ visible }) => {
    return (
        <Modal
            transparent
            visible={visible}>
            <View style={{
                flex: 1, justifyContent: "center", alignItems: 'center', backgroundColor: 'rgba(0,0,0, 0.7)'
            }}>
                <FastImage source={R.images.wheel} style={{ width: wp(30), height: wp(30), }} />
            </View>
        </Modal>
    );
};


export default LoadingIndicator;
