export const SHOW_CHAT_BUTTON = "SHOW_CHAT_BUTTON"
export const UNREAD_MESSAGE_COUNT = "UNREAD_MESSAGE_COUNT"
export const UNREAD_MESSAGE_LAST_COUNT = "UNREAD_MESSAGE_LAST_COUNT"
export const RESET_MESSAGE_COUNT = "RESET_MESSAGE_COUNT"


export const setShowChatButton = payload => ({
    type: SHOW_CHAT_BUTTON,
    payload
})

export const setUnreadMessageCount = payload => ({
    type: UNREAD_MESSAGE_COUNT,
    payload
})

export const setUnreadMessageLastCount = payload => ({
    type: UNREAD_MESSAGE_LAST_COUNT,
    payload
})

export const resetMessageCount = payload => ({
    type: RESET_MESSAGE_COUNT,
    payload
})
