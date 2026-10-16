import React from 'react';
import { Image, TouchableOpacity, View, Modal, SafeAreaView } from 'react-native';
import Gallery from 'react-native-image-gallery';
import R from '../../../assest/R';

const GallaryModel = ({
    images,
    isVisible,
    onClose
}) => (
    <Modal coverScreen visible={isVisible}>
        <SafeAreaView style={{flex:1}}>
            <View style={{ flex: 1, backgroundColor: "black", paddingHorizontal: 10, paddingVertical: 20 }}>
                <TouchableOpacity onPress={onClose} style={{ alignSelf: "flex-end"}}>
                    <Image source={R.images.crossIcon} style={{ width: 25, height: 25, resizeMode: "contain", tintColor: "#FFF" }} />
                </TouchableOpacity>
                <Gallery
                    style={{ flex: 1, backgroundColor: 'black' }}
                    images={images}
                />
            </View>
        </SafeAreaView>
    </Modal>
);

export default GallaryModel;
