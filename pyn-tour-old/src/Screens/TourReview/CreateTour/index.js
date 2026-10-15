import React from 'react';
import TourReview from '../index.js';
import { useDispatch } from 'react-redux';




const CreateTour = ({ navigation }) => {
    const dispatch = useDispatch();

    return <TourReview
        mode={'CREATE'}
        navigation={navigation}
        setChatButtonStatus={payload => dispatch(setShowChatButton(payload))}
        allowTourCustomization={true}
    />
};

export default CreateTour;
