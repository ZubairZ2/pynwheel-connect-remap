import { SELECTED_COMMUNITY } from '../actions/selectedCommunityAction';

const initialState = {
    selectedConnunity: null,
    age: 10
}

 export const selectedCommunityReducer = (state = initialState, action) => {
    switch (action.type) {
        case SELECTED_COMMUNITY:
            return {
                selectedConnunity: action.payload,
                //age:action.payload,
            };
        default:
            return state;
    }
};
export default selectedCommunityReducer