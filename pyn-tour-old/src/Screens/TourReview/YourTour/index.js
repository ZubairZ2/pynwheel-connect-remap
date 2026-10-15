import React from 'react';
import TourReview from '../index.js';
import { useDispatch } from 'react-redux';



const YourTour = ({ navigation }) => {
    const dispatch = useDispatch();

    return <TourReview
        mode={'REVIEW'}
        navigation={navigation}
        allowTourCustomization={true}
        setChatButtonStatus={payload => dispatch(setShowChatButton(payload))} />;
}
export default YourTour;
