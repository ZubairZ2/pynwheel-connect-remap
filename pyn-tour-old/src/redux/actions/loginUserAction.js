export const LOGIN_USER = "LOGIN_USER"
export const LOGIN_USER_ID = "LOGIN_USER_ID"

export const setLoginUser = payload => ({
    type: LOGIN_USER,
    payload
})

export const setLoginUserId = payload => ({
    type: LOGIN_USER_ID,
    payload
})