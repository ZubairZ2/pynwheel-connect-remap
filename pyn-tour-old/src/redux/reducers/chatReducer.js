import { UNREAD_MESSAGE_COUNT, SHOW_CHAT_BUTTON, UNREAD_MESSAGE_LAST_COUNT, RESET_MESSAGE_COUNT } from '../actions/chatActions';

const initialState = {
    unreadMessageCount: 0,
    unreadMessageLastCount: 0,
    showChatButton: false,
}

const chatReducer = (state = initialState, action) => {
    switch (action.type) {
        case SHOW_CHAT_BUTTON:
            return {
                ...state,
                showChatButton: action.payload,
            };
        case UNREAD_MESSAGE_COUNT:
            return {
                ...state,
                unreadMessageCount: action.payload,
            };
        case UNREAD_MESSAGE_LAST_COUNT:
            return {
                ...state,
                unreadMessageLastCount: action.payload,
            };
            case RESET_MESSAGE_COUNT:
            return {
                ...state,
                unreadMessageCount: 0,
                unreadMessageLastCount: 0,
            };

        default:
            return state;
    }
};
export default chatReducer
