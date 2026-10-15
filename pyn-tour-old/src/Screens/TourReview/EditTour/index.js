import React from 'react';
import TourReview from '../index.js';
import { useDispatch } from 'react-redux';


const EditTour = ({ navigation }) => {
    const dispatch = useDispatch();

    return <TourReview
        mode={'EDIT'}
        navigation={navigation}
        allowTourCustomization={true}
        setChatButtonStatus={payload => dispatch(setShowChatButton(payload))}
    />;
}

export default EditTour;
