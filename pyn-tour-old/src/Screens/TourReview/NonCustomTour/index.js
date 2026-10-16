import React from 'react';
import TourReview from '../index.js';
import { useDispatch } from 'react-redux';


const NonCustomTour = ({ navigation }) => {
    const dispatch = useDispatch();


    return <TourReview
        mode={'NON_CUSTOM_REVIEW'}
        navigation={navigation}
        allowTourCustomization={false}
        setChatButtonStatus={payload => dispatch(setShowChatButton(payload))}
    />;
}

export default NonCustomTour;
