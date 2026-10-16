import { Platform } from 'react-native';
import {
    authenticateCustomer,
    authenticateUser,
    connectDevice,
    initSDK,
    isBluetoothEnabled,
    requestBluetoothPermission
} from '../../Library/ZervManager';
const isAndroid = Platform.OS === 'android';

export const authenticateZerv = async (successCallback, failureCallback, data) => {

    const { phone, zervUser, password } = data
    console.log("ZERV PHONE",{ phone,zervUser, password  })
    // try {
        if (isAndroid) {
            isBluetoothEnabled()
                .then((enabled) => {
                    if (enabled) {
                        requestBluetoothPermission()
                            .then((requestBluetoothPermission) => {
                                console.log(requestBluetoothPermission)
                                initSDK("Production")  //init ZERV SDK
                                    .then(() => {
                                        console.log(zervUser, password)
                                        authenticateCustomer(zervUser, password)
                                            .then((res) => {
                                                console.log("authenticateCustomer success", phone)
                                                authenticateUser(phone)
                                                    .then((res) => {
                                                        console.log("authenticateUser success")
                                                        successCallback(res)
                                                        // setAutoUnlockMode(1)
                                                    }).catch((e) => {
                                                        failureCallback(e)
                                                    })
                                            }).catch((e) => { failureCallback(e) })
                                    }).catch((e) => { failureCallback(e) })
                            })
                            .catch((error) => {
                                console.log(error)
                                failureCallback("Allow Bluetoth permission")
                            })
                    } else {
                        failureCallback("Please turn on Bluetooth")
                    }
                }).catch((error) => failureCallback(error))
        } else {
            initSDK("Production")  //init ZERV SDK
                .then((initSDK) => {
                    console.log("initSDK",{ initSDK })
                    console.log("zervUser,password",zervUser, password)
                    authenticateCustomer(zervUser, password)
                        .then((authenticateCustomer) => {
                            console.log("authenticateCustomer",{ authenticateCustomer })
                            setTimeout(() => {
                                authenticateUser(phone)
                                    .then((authenticateUser) => {
                                        console.log("authenticateUser",{ authenticateUser })
                                        successCallback(authenticateUser)
                                    }).catch((e) => {
                                        failureCallback(e)
                                    })
                            }, 4000)
                        }).catch((e) => { failureCallback(e) })
                }).catch((e) => { failureCallback(e) })
        }

    // } catch (error) {
    //     failureCallback(error)
    // }
}

export const initDeviceListenerAndUnlockZerv = (macID, successCallBack, failCallBack) => {
    console.log("macID",{macID})

    // -------
    // setTimeout(() => {
        connectDevice(macID)
            .then((connectDevice) => {
                console.log({ connectDevice })
                // pushLogs().then((pushLogs)=>{console.log({pushLogs})})
                if(connectDevice ===""){
                    console.log({ connectDevice })
                    failCallBack(connectDevice)
                }else{
                    successCallBack(connectDevice)
                }
            })
            .catch((connectDeviceError) => {
                console.log({ connectDeviceError })
                failCallBack(connectDeviceError)
            })
    // }, 2000)
    // ----- setTimeout End

    return
    // let counter = 0;
    // const intervalID = setInterval(() => {
    //     counter++;
    //     if (counter > 20) {
    //         failCallBack("No device found")
    //         counter = 0;
    //         clearInterval(intervalID)
    //         return
    //     }
    //     onReaderDiscover()
    //         .then((readers) => {
    //             console.log({ readers }, readers.length)
    //             if (readers?.length > 0) {
    //                 for (let i = 0; i < readers.length; i++) {
    //                     console.log("readers[i].serialNumber === macID", readers[i].serialNumber === macID)
    //                     if (readers[i].serialNumber === macID) {
    //                         clearInterval(intervalID)

    //                         // -------
    //                         setTimeout(() => {
    //                             connectDevice(macID)
    //                                 .then((connectDevice) => {
    //                                     console.log("connectDevice",{ connectDevice })
    //                                     successCallBack(connectDevice)
    //                                 })
    //                                 .catch((connectDeviceError) => {
    //                                     console.log({ connectDeviceError })
    //                                     failCallBack(connectDeviceError)
    //                                 })
    //                         }, 2000)
    //                         // ----- setTimeout End


    //                     }
    //                 }
    //             }
    //         })
    // }, 2000)
}