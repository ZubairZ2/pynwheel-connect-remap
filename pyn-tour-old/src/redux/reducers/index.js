import commonReducer from './commonReducer'
import persistReducer from './persistReducer'
import sessionReducer from './sessionReducer'
import loginUserReducer from './loginUserReducer.'
import selectedCommunityReducer from './selectedCommunityReducer'
import chatReducer from './chatReducer'

import {combineReducers} from 'redux'

const rootReducer = combineReducers({
    
    sessionReducer,
    selectedCommunityReducer,
    loginUserReducer,
    chatReducer,
    persistReducer,
})

export default rootReducer