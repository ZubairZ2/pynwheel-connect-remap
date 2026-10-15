import { ACCESS_TOKEN } from '../actions/accessTokenAction';
import { LOGIN_STATUS, LOGIN_STATUS_ID, SET_LOCATION_ALERT_STATUS, ONBRADING_COUNT, SET_USER_INFO_4SLIDER, FIRST_ATTEMPT_COUNT, RESET_FIRST_ATTEMPT_COUNT } from '../actions/persistPropertyAction';

const initialState = {
    userLoginState: false,
    userID: "",
    loacationAlertStatus: true,
    onboardingCount: 0,
    firstAttemptCount: 0,
    userInfo4TopSlider: { name: null, upcoming_tours: 0, visited_history: false },
    access_token: null
}

const persistReducer = (state = initialState, action) => {
    switch (action.type) {
        case LOGIN_STATUS:
            return {
                ...state,
                userLoginState: action.payload,
            };
        case LOGIN_STATUS_ID:
            return {
                ...state,
                userID: action.payload,
            };
        case SET_LOCATION_ALERT_STATUS:
            return {
                ...state,
                loacationAlertStatus: action.payload,
            };
        case ONBRADING_COUNT:
            return {
                ...state,
                onboardingCount: action.payload,
            };
        case FIRST_ATTEMPT_COUNT:
            return {
                ...state,
                firstAttemptCount: action.payload,
            };
        case RESET_FIRST_ATTEMPT_COUNT:
            return {
                ...state,
                firstAttemptCount: 0,
            };
        case SET_USER_INFO_4SLIDER:
            return {
                ...state,
                userInfo4TopSlider: action.payload,
            };
        case ACCESS_TOKEN:
            return {
                ...state,
                access_token: action.payload,
            };
        default:
            return state;
    }
};
export default persistReducer
