//
//  ZervModule.swift
//  ZervDemo
//
//  Created by Gowtham Mulumudi on 23/12/20.
//

import Foundation
import React
#if canImport(SwiftyJWT)
import SwiftyJWT
#endif
#if canImport(RNCryptor)
import RNCryptor
#endif
#if canImport(Zerv_SDK_Library)
import Zerv_SDK_Library
#endif


public class NullHandle:NSObject{
  static func returnStr(value : Any?) -> String?{
    guard let string = value as! String?, !string.isEmpty else {
      return "null"
    }
    return  value as? String
  }
}


#if canImport(Zerv_SDK_Library)
@objc(ZervModule)
class ZervModule: UIViewController,ZervSdkResponseDelegate {
  
  
  var zervSdk : ZervSDK!
  public var configStatus = ""
  public var authenticateCustomer = ""
  public var configureValue = 0
  public var onInit = ""
  public var authenticateUser = ""
  public var userDetailsCheck = ""
  public var onValidateUserOTP = ""
  public var refreshCredentials = ""
  public var stopservice = ""
  public var stopscan = ""
  public var startscan = ""
  public var logOutStatus = ""
  public var onDiscoverReaderData:DeviceData? = nil
  public var deviceData:[DeviceData]? = nil
  public var nearbyDeviceData:NearbyDeviceData? = nil
  public var deviceConnectionSuccessData:ZBleDevice? = nil
  public var deviceConnectionSuccessDataC:ZBleDevice? = nil
  public var deviceConnectionStatus = ""
  public var pushLogStatus = ""
  public var rssi_val = "3"
  public static var authcheck = ""
  
  override func viewDidLoad() {
    super.viewDidLoad()
    zervSdk = ZervSDK(delegate:self)
    self.zervSdk.bluetoothPermissionStatus()
  }
  
  func onInitSuccess() {
    self.onInit = "Success"
  }
  func onInitFailure(errorMessage: String) {
    self.onInit = errorMessage
  }
  func onConfigurationSuccess() {
    self.configStatus = "Success"
  }
  func onConfigurationFailure(errorMessage: String) {
    self.configStatus = errorMessage
  }
  func onCustomerAuthenticationSuccess() {
    self.authenticateCustomer = "Customer authentication success"
  }
  func onCustomerAuthenticationFailure(errorMessage: String) {
    self.authenticateCustomer = errorMessage
  }
  func onAuthenticateUserSuccess() {
    self.authenticateUser = "Authenticate User Success"
  }
  func onAuthenticateUserFailure(errorMessage: String) {
    print("onAuthenticateUserFailure \(errorMessage)")
    self.authenticateUser = errorMessage
  }
  func onValidateUserOTPSuccess() {
    self.onValidateUserOTP = "Validate User OTP Success"
  }
  func onValidateUserOTPFailure(errorMessage: String) {
    self.onValidateUserOTP = errorMessage
  }
  func onLogoutSuccess() {
    logOutStatus = "Successfully Logged Out"
  }
  func onLogoutFailure(errorMessage: String) {
    logOutStatus = "Please Authenticate phoneNumber"
  }
  func onRefreshCredentialsFailure(errorMessage: String) {
    self.refreshCredentials = errorMessage
  }
  
  func readerConnectConfirmation(data: DeviceData) -> Bool {
    return true
  }
  func stopService() {
    self.stopservice = "Service Stopped!"
  }
  
  func onReaderDiscovered(data: DeviceData) {
    onDiscoverReaderData = data
  }
  
  func onReaderLogsData(data: LogsData) {}
  func deviceConnected(_ device: ZBleDevice) {}
  func accessReaderSuccess(_ data: ZBleDevice) {}
  func accessReaderFailure(errorMessage: String) {}
  func onPushLogSuccess() {
    pushLogStatus = "Log file(s) uploaded successfully"
  }
  
  func onPushLogFailed(issue: String) {
    pushLogStatus = "\(issue)"
  }
  
  func onRefreshCredentialsSuccess() {
    self.authenticateUser = "Credentials have been refreshed!"
    self.refreshCredentials = "Credentials have been refreshed!"
  }
  
  func deviceConnectionSuccess(_ device: ZBleDevice) {
    deviceConnectionSuccessData = device
  }
  func deviceConnectionTimeout(_ device: String) {
    deviceConnectionStatus = "The device connection has timed out!"
  }
  
  func deviceConnectionFailure(_ device: String) {
    deviceConnectionStatus = "Device connection failure!"
  }
  
  func onGetUserDetailsSuccess(associatedCustomerList: Array<Any>?) {
    userDetailsCheck = "User Exists"
  }
  
  func onGetUserDetailsFailed(issue: String) {
    print("onGetUserDetailsFailed::\(issue)")
    userDetailsCheck = issue
  }
  
  func onScanNearbyDevice(data: NearbyDeviceData) {
    nearbyDeviceData = data
  }
  
  func onScanNearbyDeviceFailure(data: String) {}
  
  func onStartScan(data: String) {
    self.startscan = "Scan Started!"
  }
  
  func onStopScan(data: String) {
    self.stopscan = "Scan Stopped!"
  }
  
  //
  func deviceConnectionTimeout(_ device: String, _ macid: String, _ subLocationFriendlyName: String) {}
  func deviceConnectionFailure(_ device: String, _ macid: String) {}
  func onGetCustomerInfoSuccess(customerInfo: [String : Any]) {}
  func onGetCustomerInfoFailed(issue: String) {}
  func bleStatus(status: Bool) {}
  
  
  
  //This method is used to configure the environemnet
  @objc func configure(_ environment: String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
    
    zervSdk = ZervSDK(delegate:self)
    DispatchQueue.main.async {
      if(environment == "Production"){
        self.configureValue = 0
        self.configStatus = "Successfully to configure Production SDK"
      }else if(environment == "UAT"){
        self.configureValue = 1
        self.configStatus = "Successfully to configure Stage SDK"
      }else if(environment == "Integ"){
        self.configureValue = 2
        self.configStatus = "Successfully to configure Integ SDK"
      }else if(environment == "Development"){
        self.configureValue = 3
        self.configStatus = "Successfully to configure Development SDK"
      }else if(environment == "qa"){
        self.configureValue = 4
        self.configStatus = "Successfully to configure QA SDK"
      }else if(environment == "Demo"){
        self.configureValue = 5
        self.configStatus = "Successfully to configure Demo SDK"
      }
      else{
        self.configureValue = 0
        self.configStatus = "Successfully to configure Production SDK"
      }
      
      self.zervSdk.configure(environment:self.configureValue)
      self.zervSdk.setEnableAppConfirmationWhileConnectingToReader(enable: true)
      self.zervSdk.setEnableReaderNotifications(enable: true)
      self.zervSdk.saveDeviceRSSI(rssi: ZervBleSensitiveStatus.Normal.rawValue)
    }
    
    resolve(self.configStatus)
  }
  
  
  //This method is used to getting the token from the custome
  @objc func authenticateCustomer(_ userData: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    
    self.authenticateCustomer = ""
    
    DispatchQueue.main.async {
      self.zervSdk.setAutoUnlockMode(mode: false)
    }
    
    DispatchQueue.main.async {
      self.zervSdk.authenticateCustomer(secureUserName: userData["userName"] as! String, securePassword: userData["password"] as! String)
    }
    DispatchQueue.main.async(){
      var isCustomerAuthenticated = false
      var counter = 0
      while(!isCustomerAuthenticated) {
        counter+=1
        usleep(useconds_t(2 * 100000))//wait for 200ms
        if(self.authenticateCustomer != ""){
          resolve(self.authenticateCustomer)
          isCustomerAuthenticated = true
        }
        else {
          if counter == 50 { //try for 10sec
            isCustomerAuthenticated = true
            resolve("Timeout")
          }
          
        }
      }
    }
  }
  
  
  //This method is used to for validated the user Phone number
  @objc func authenticateUser(_ phoneNumber: String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    self.authenticateUser = ""
    DispatchQueue.main.async {
      self.zervSdk.authenticateUser(userData: phoneNumber)
    }
    
    DispatchQueue.main.async(){
      var isUserAuthenticated = false
      var counter = 0
      while(!isUserAuthenticated) {
        counter+=1
        usleep(1000000) //will sleep for 1 second
        if(self.authenticateUser != ""){
          resolve(self.authenticateUser)
          isUserAuthenticated = true
        }
        else {
          if counter == 50 { //try for 10sec
            isUserAuthenticated = true
            resolve("Timeout for authenticate user")
          }
          
        }
      }
    }
  }
  
  //This method is used to for validated the user otp and begins session
  @objc func validateUserOTP(_ otpData:NSDictionary,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    self.onValidateUserOTP = ""
    DispatchQueue.main.async {
      self.zervSdk.validateUserOTP(userData: otpData["phoneNumber"] as! String,authCode: otpData["otp"] as! String)
    }
    let mainQueue = DispatchQueue.main
    let deadline = DispatchTime.now() + .seconds(5)
    mainQueue.asyncAfter(deadline: deadline) {
      resolve(self.onValidateUserOTP)
    }
  }
  
  //INIT and Restore method
  @objc func initAndRestoreSession(_ mobile:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    self.onInit = ""
    DispatchQueue.main.async {
      self.zervSdk.initAndRestoreSession()
    }
    
    DispatchQueue.main.async(){
      var isInitAndRestoreDone = false
      var counter = 0
      while(!isInitAndRestoreDone) {
        counter+=1
        usleep(useconds_t(2 * 100000))//wait for 200ms
        if(self.onInit != ""){
          if(self.onInit == "Success") {
            resolve("User already authenticated")
          }
          else{
            reject("User not authenticated", "", nil)
          }
          isInitAndRestoreDone = true
        }
        else {
          if counter == 50 { //try for 10sec
            isInitAndRestoreDone = true
            resolve("Timeout for Session load")
          }
          
        }
      }
    }
    
  }
  
  //refreshCredentials
  @objc func refreshCredentials(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    self.refreshCredentials = ""
    self.zervSdk.refreshCredentials()
    let mainQueue = DispatchQueue.main
    let deadline = DispatchTime.now() + .seconds(10)
    mainQueue.asyncAfter(deadline: deadline) {
      resolve(self.refreshCredentials)
    }
  }
  
  
  //stopService
  
  @objc func stopService(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    self.stopservice = ""
    DispatchQueue.main.async {
      self.zervSdk.stopService()
    }
    let mainQueue = DispatchQueue.main
    let deadline = DispatchTime.now() + .seconds(5)
    mainQueue.asyncAfter(deadline: deadline) {
      resolve(self.stopservice)
    }
  }
  
  //stopService
  @objc func stopScan(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    self.stopscan = ""
    DispatchQueue.main.async {
      self.zervSdk.stopScan()
    }
    let mainQueue = DispatchQueue.main
    let deadline = DispatchTime.now() + .seconds(5)
    mainQueue.asyncAfter(deadline: deadline) {
      resolve(self.stopscan)
    }
  }
  
  //startScan
  @objc func startScan(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    self.startscan = ""
    DispatchQueue.main.async {
      self.zervSdk.startScan()
    }
    let mainQueue = DispatchQueue.main
    let deadline = DispatchTime.now() + .seconds(5)
    mainQueue.asyncAfter(deadline: deadline) {
      resolve(self.startscan)
    }
  }
  
  //pushLogs
  @objc func pushLogs(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    self.pushLogStatus = ""
    DispatchQueue.main.async {
      self.zervSdk.pushLogFiles()
    }
    
    let mainQueue = DispatchQueue.main
    let deadline = DispatchTime.now() + .seconds(10)
    mainQueue.asyncAfter(deadline: deadline) {
      resolve(self.pushLogStatus)
    }
  }
  
  //This method is used to for save the Device RSSI
  @objc func saveDeviceRSSI(_ rssi:Int,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    switch rssi {
    case 0:
      zervSdk.saveDeviceRSSI(rssi: ZervBleSensitiveStatus.Low.rawValue)
    case 1:
      zervSdk.saveDeviceRSSI(rssi: ZervBleSensitiveStatus.Normal.rawValue)
    case 2:
      zervSdk.saveDeviceRSSI(rssi: ZervBleSensitiveStatus.Medium.rawValue)
    case 3:
      zervSdk.saveDeviceRSSI(rssi: ZervBleSensitiveStatus.High.rawValue)
    default:
      zervSdk.saveDeviceRSSI(rssi: ZervBleSensitiveStatus.Normal.rawValue)
    }
    
    let mainQueue = DispatchQueue.main
    let deadline = DispatchTime.now() + .seconds(5)
    mainQueue.asyncAfter(deadline: deadline) {
      
      let rssi = self.zervSdk.getDeviceRSSI()
      
      switch rssi {
      case ZervBleSensitiveStatus.Low.rawValue:
        self.rssi_val = "0"
      case ZervBleSensitiveStatus.Normal.rawValue:
        self.rssi_val = "1"
      case ZervBleSensitiveStatus.Medium.rawValue:
        self.rssi_val = "2"
      case ZervBleSensitiveStatus.High.rawValue:
        self.rssi_val = "3"
      default:
        self.rssi_val = "1"
      }
    }
    resolve(rssi_val)
  }
  
  //This method is used to for get the Device RSSI
  @objc func getDeviceRSSI(_ rssi:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    
    let rssi = self.zervSdk.getDeviceRSSI()
    switch rssi {
    case ZervBleSensitiveStatus.Low.rawValue:
      rssi_val = "0"
    case ZervBleSensitiveStatus.Normal.rawValue:
      rssi_val = "1"
    case ZervBleSensitiveStatus.Medium.rawValue:
      rssi_val = "2"
    case ZervBleSensitiveStatus.High.rawValue:
      rssi_val = "3"
    default:
      rssi_val = "1"
    }
    resolve(rssi_val)
  }
  
  //This method is used to for setautounlock
  @objc func setAutoUnlockMode(_ setAutoUnlockMode:Int,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    if setAutoUnlockMode == 1{
      zervSdk.setAutoUnlockMode(mode: false)
    }else{
      zervSdk.setAutoUnlockMode(mode: true)
    }
    resolve("Success")
  }
  
  //This method is used to for setuserrole
  @objc func setUserRole(_ setUserRole:Int,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    if setUserRole == 1{
      ZervSDK.saveAppInfo(userRole: ZervUserRole.Visitor.rawValue)
    }else{
      ZervSDK.saveAppInfo(userRole: ZervUserRole.User.rawValue)
    }
    resolve("Success")
  }
  
  //
  @objc func assignNearByReadersData(_ msg:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    
    let result: NSMutableArray = []
    let yourAuxDic: NSMutableDictionary = [:]
    yourAuxDic["deviceMACId"] = nearbyDeviceData?.deviceMACId
    yourAuxDic["rssi"] = nearbyDeviceData?.rssi
    yourAuxDic["location"] = nearbyDeviceData?.location
    yourAuxDic["subLocation"] = nearbyDeviceData?.subLocation
    yourAuxDic["locationFriendly"] = nearbyDeviceData?.locationFriendly
    yourAuxDic["subLocationFriendly"] = nearbyDeviceData?.subLocationFriendly
    yourAuxDic["uniqueName"] = nearbyDeviceData?.uniqueName
    
    result.add(yourAuxDic)
    resolve(result)
  }
  
  //
  @objc func connectDevice(_ msg: String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    var isDeviceConnect =  false
    self.deviceConnectionSuccessData = self.deviceConnectionSuccessDataC
    
    DispatchQueue.main.async {
      if(!ZervSDK.getAutoUnlockMode()){
        isDeviceConnect = true
        self.zervSdk.connectDevice(macid: "\(msg)")
      }else{
        isDeviceConnect = false
        resolve("Failed to connect")
      }
    }
    
    DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
      if(isDeviceConnect){
        if(self.deviceConnectionSuccessData != nil){
          let result: NSMutableArray = []
          let yourAuxDic: NSMutableDictionary = [:]
          yourAuxDic["MacId"] = self.deviceConnectionSuccessData?.MacId
          yourAuxDic["RSSI"] = self.deviceConnectionSuccessData?.RSSI
          yourAuxDic["LocationName"] = self.deviceConnectionSuccessData?.LocationName
          yourAuxDic["SubLocationName"] = self.deviceConnectionSuccessData?.SubLocationName
          yourAuxDic["LocationFriendlyName"] = self.deviceConnectionSuccessData?.LocationFriendlyName
          yourAuxDic["SubLocationFriendlyName"] = self.deviceConnectionSuccessData?.SubLocationFriendlyName
          result.add(yourAuxDic)
          resolve(result)
          
        }else{
          resolve(self.deviceConnectionStatus)
        }
      }
    }
  }
  
  
  // This method is used to for discoved near readers
  @objc func onReaderDiscover(_ msg:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    let result: NSMutableArray = []
    let yourAuxDic: NSMutableDictionary = [:]
    yourAuxDic["rssi"] = onDiscoverReaderData?.rssi
    yourAuxDic["serialNumber"] = onDiscoverReaderData?.serialNumber
    yourAuxDic["location"] = onDiscoverReaderData?.location
    yourAuxDic["subLocation"] = onDiscoverReaderData?.subLocation
    yourAuxDic["locationFriendly"] = onDiscoverReaderData?.locationFriendly
    yourAuxDic["subLocationFriendly"] = onDiscoverReaderData?.subLocationFriendly
    yourAuxDic["uniqueName"] = onDiscoverReaderData?.uniqueName
    
    result.add(yourAuxDic)
    resolve(result)
    
  }
  
  
  // This method is used to for discoved near readers
  @objc func getAllReaders(_ msg:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    deviceData = zervSdk.getAllReaders()
    resolve(deviceData ?? [])
  }
  
  
  //This method is used to for check bluetooth
  @objc func bluetoothPermissionStatus(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    let bluetoothPermissionStatus = self.zervSdk.bluetoothPermissionStatus()
    resolve(bluetoothPermissionStatus)
  }
  
  //This method is used to for check internet
  @objc func internetConnectionStatus(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    let internetConnectionStatus = self.zervSdk.internetConnectionStatus()
    resolve(internetConnectionStatus)
  }
  
  //This method is used to for check internet
  @objc func batterySettingStatus(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    resolve("The feature is not available")
  }
  
  
  //This method is used to for check internet
  @objc func locationPermissionStatus(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    resolve("The feature is not available")
  }
  
  //This method is used to for clear session
  @objc func logout(_ msg:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    
    DispatchQueue.main.async {
      self.zervSdk.logout()
    }
    
    let mainQueue = DispatchQueue.main
    let deadline = DispatchTime.now() + .seconds(6)
    mainQueue.asyncAfter(deadline: deadline) {
      resolve(self.logOutStatus)
    }
  }
  
}
#else
@objc(ZervModule)
class ZervModule: UIViewController {
  @objc func configure(_ environment: String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func authenticateCustomer(_ userData: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func authenticateUser(_ phoneNumber: String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func validateUserOTP(_ otpData:NSDictionary,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func initAndRestoreSession(_ mobile:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func refreshCredentials(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func stopService(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func stopScan(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func startScan(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func pushLogs(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func saveDeviceRSSI(_ rssi:Int,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("1") }
  @objc func getDeviceRSSI(_ rssi:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("1") }
  @objc func setAutoUnlockMode(_ setAutoUnlockMode:Int,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Success") }
  @objc func setUserRole(_ setUserRole:Int,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Success") }
  @objc func assignNearByReadersData(_ msg:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve([]) }
  @objc func connectDevice(_ msg: String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
  @objc func onReaderDiscover(_ msg:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve([]) }
  @objc func getAllReaders(_ msg:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve([]) }
  @objc func bluetoothPermissionStatus(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(false) }
  @objc func internetConnectionStatus(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve(false) }
  @objc func batterySettingStatus(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("The feature is not available") }
  @objc func locationPermissionStatus(_ status:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("The feature is not available") }
  @objc func logout(_ msg:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) { resolve("Zerv SDK unavailable") }
}
#endif
