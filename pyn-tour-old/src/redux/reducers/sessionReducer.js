import { ACCESS_TOKEN } from '../actions/accessTokenAction';

const initialState = {
    accessToken: "",
}
 
 const sessionReducer = (state = initialState, action) => {
    switch (action.type) {
        case ACCESS_TOKEN:
            return {
                accessToken: action.payload,
            };
        default:
            return state;
    }
};
export default sessionReducer