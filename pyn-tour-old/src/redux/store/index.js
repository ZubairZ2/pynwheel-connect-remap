// import {createStore} from 'redux';
// import  rootReducer  from '../reducers/index';
// export default store = createStore(rootReducer)


import {createStore} from 'redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import  rootReducer  from '../reducers/index';
import {persistStore, persistReducer} from 'redux-persist';
 const persistConfig = {
  key: 'root',
  storage:  AsyncStorage,
  whitelist: ['persistReducer'],
}

 const reducer1 = persistReducer(persistConfig, rootReducer);
 
//  let store = createStore(reducer1)
//  const persistor = persistStore(store);

// export default () => {
  let store = createStore(reducer1)
  const persistor = persistStore(store)
//   return { store, persistor }
// }

export { store, persistor }






// import {persistStore, persistReducer} from 'redux-persist';


// const reducer = persistReducer(config, reducers);
// export const persistor = persistStore(store);


// import { createStore } from 'redux'
// import { persistStore, persistReducer } from 'redux-persist'
// import storage from 'redux-persist/lib/storage' // defaults to localStorage for web
 
// import rootReducer from '../reducers/index'
 
// const persistConfig = {
//   key: 'root',
//   storage,
// }
 
// const persistedReducer = persistReducer(persistConfig, rootReducer)
 
// export default () => {
//   let store = createStore(persistedReducer)
//   let persistor = persistStore(store)
//   return { store, persistor }
// }


// import { createStore } from 'redux'

// import rootReducer from '../reducers/index'
// //import  commonReducer  from '../reducers/commonReducer';


// import {persistStore, persistReducer} from 'redux-persist';
//import AsyncStorage from '@react-native-async-storage/async-storage';
// import { AsyncStorage } from 'react-native';
 
// const persistConfig = {
//     key: 'root',
//     storage: AsyncStorage,
//     whitelist: ['persistReducer']
//   }
  
// const reducer = persistReducer(rootReducer, persistConfig)

// export default () => {
//     let store = createStore(reducer)
//     let persistor = persistStore(store)
//     return { store, persistor }
//   }
