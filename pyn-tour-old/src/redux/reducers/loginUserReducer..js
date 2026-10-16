import { LOGIN_USER } from '../actions/loginUserAction';

const initialState = {
    userData: null,
}
 
 const loginUserReducer = (state = initialState, action) => {
    switch (action.type) {
        case LOGIN_USER:
            return {
                userData: action.payload,
            };
        default:
            return state;
    }
};
export default loginUserReducer