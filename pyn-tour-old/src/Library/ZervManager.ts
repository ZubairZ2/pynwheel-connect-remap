import ZervModule from './ZERVModule'
import {NativeEventEmitter,NativeModules} from 'react-native'
const eventEmitter = new NativeEventEmitter(NativeModules.ZervModule);
// initialize
export const initSDK = async (envId: String) => {
    return ZervModule.configure(envId)
 }
 //Authenticate customer login with zerv credentials
export const authenticateCustomer = async(username:String, password:String) => {
     let userData = {
         "userName": username,
         "password": password
     }
     return ZervModule.authenticateCustomer(userData)
 }
 //This method is used to restore session if not validate the user Phone number 
export const restoreSession =async () => {
     return ZervModule.initAndRestoreSession("mobile")
 }
 // Authenticate current user by sending OTP
export const authenticateUser = async(phone:String) => {
     return ZervModule.authenticateUser(phone)
 }
 // Not in use for now
 //This method is used to restore session if not validate the user otp and begins session 
export const callVerifyOtp = () => {
    return ZervModule.initAndRestoreSession("mobile")
}
// varify OTP
export const verifyOTP = async (OTP: String, phoneNumber: String) => {
    let otpData = {
        "otp": OTP,
        "phoneNumber": phoneNumber
    }
    return ZervModule.validateUserOTP(otpData)
}
//  stop service
export const stopService = async () => {
    return ZervModule.stopService("stop")
}
export const saveDeviceRSSI = async () => {
    return ZervModule.saveDeviceRSSI(3)
}

export const onReaderDiscover = async() => {
    return ZervModule.onReaderDiscover("")
   }

   //Start Scan
export const startScan = async () => {
    return ZervModule.startScan("")
   }

export const connectDevice = async (macId) => {
    return ZervModule.connectDevice(macId)
}
//Save setAutoUnlockStatus
export const setAutoUnlockMode = async (index) => {
    return ZervModule.setAutoUnlockMode(index)
}
export const initAndRestoreSession = async () => {
    return ZervModule.initAndRestoreSession("mobile")
}
export const pushLogs = async () => {
    return ZervModule.pushLogs("")
}

export const isGPSEnabled = async () => {
    return ZervModule.isGPSEnabled()
}
export const openGPSSettings = async () => {
    return ZervModule.openGPSSettings()
}
export const isBluetoothEnabled = async () => {
    return ZervModule.isBluetoothEnabled()
}
export const requestBluetoothPermission = async () => {
    return ZervModule.requestBluetoothPermission()
}
export const iosBluetoothPermissionStatus = async () => {
    return ZervModule.bluetoothPermissionStatus("ON")
}