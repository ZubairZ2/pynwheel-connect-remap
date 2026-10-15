export const LOGIN_STATUS = "LOGIN_STATUS"
export const LOGIN_STATUS_ID = "LOGIN_STATUS_ID"
export const SET_LOCATION_ALERT_STATUS="SET_LOCATION_ALERT_STATUS"
export const ONBRADING_COUNT="ONBRADING_COUNT"
export const FIRST_ATTEMPT_COUNT="FIRST_ATTEMPT_COUNT"
export const RESET_FIRST_ATTEMPT_COUNT="RESET_FIRST_ATTEMPT_COUNT"
export const SET_USER_INFO_4SLIDER="SET_USER_INFO_4SLIDER"

export const setLoginStatus = payload => ({
    type: LOGIN_STATUS,
    payload
})

export const setLoginUserID = payload => ({
    type: LOGIN_STATUS_ID,
    payload
})
export const setLocationAlertStatus = payload => ({
    type: SET_LOCATION_ALERT_STATUS,
    payload
})
export const setOnboardingCount = payload => ({
    type: ONBRADING_COUNT,
    payload
})
export const setFirstAttemptCount = payload => ({
    type: FIRST_ATTEMPT_COUNT,
    payload
})
export const setResetFirstAttemptCount = () => ({
    type: RESET_FIRST_ATTEMPT_COUNT
})
export const setUserinfo4Slider = payload => ({
    type: SET_USER_INFO_4SLIDER,
    payload
})