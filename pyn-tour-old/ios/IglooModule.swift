//
//  IglooModule.swift
//  SelfTour
//
//  Created by Sheraz Raees on 09/07/2021.
//

import Foundation
import React
#if canImport(IgloohomeSDK)
import IgloohomeSDK
import RxSwift
import CoreBluetooth

@objc(IglooModule)
class IglooModule:RCTEventEmitter{
  var scanningDisposable: Disposable? = nil
  public var connectionDisposable: Disposable?
  var bleManager: BleManager!
  var scannedLocks=[IglooLock]()
  var selectedLock: IglooLock? = nil
  var hasListener:Bool=false
  
  
  @objc open override func supportedEvents() -> [String]! {
    return ["iglooLockScanEvent"]
  }
  @objc open override func startObserving() {
    self.hasListener=true
  }
  @objc open override func stopObserving() {
    self.hasListener=false
  }
  @objc open override func removeListeners(_ count: Double) {
    print("count is:",count)
  }
  //initialize igloo sdk
  @objc func initIgloo(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
      BleManager.initialize()
      bleManager=BleManager()
      resolve("success")
  }
  
//  scan
  @objc func scan(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)-> Void {
    if bleManager.getCentralManager().state == .poweredOff {
      reject("please turn Bluetooth on","",nil)
    }
      scanningDisposable?.dispose()
      scanningDisposable = bleManager.scan(options: [CBCentralManagerScanOptionAllowDuplicatesKey: true as AnyObject])
          .subscribe(
              onNext: { lock in
                if(!self.scannedLocks.contains(lock)){
                  self.scannedLocks.append(lock)
                }
                if(self.hasListener){
                  self.sendEvent(withName: "iglooLockScanEvent", body: lock.name)
                }
              },
              onError: { err in
                  reject("error scanning devices","",nil)
              }
          )
  }
//  connect
  @objc func connect(_ name:String, blk:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)-> Void {
    scanningDisposable?.dispose()
    getLockByName(name: name)
    if (self.selectedLock != nil && self.selectedLock!.name == name) {
      print("connecting by",blk)
        if blk.isEmpty {
          connectionDisposable=self.selectedLock?.connectByStringKey(nil)
            .subscribe(onNext: { lock in
              resolve(lock.name)
              print("connected")
            }, onError: { err in
              //print("Local", err.localizedDescription)
              reject(err.localizedDescription,err.localizedDescription,nil)
            })
        }else{
          connectionDisposable=self.selectedLock?.connectByStringKey(blk)
            .subscribe(onNext: { lock in
              resolve(lock.name)
              print("connected")
            }, onError: { err in
              reject(err.localizedDescription,err.localizedDescription,nil)
              //print("Local",err.localizedDescription)
            })
        }
    }else{
      reject("lock not exist","",nil)
    }
  }
//  dispose connection
  @objc func disposeConnection(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)-> Void {
    connectionDisposable?.dispose()
    resolve("disposed")
  }
//  pair
  @objc func pair(_ name:String,ranges:NSArray,gmtOffset:Int,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)-> Void {
    let res: Single<String> = (self.selectedLock?.pair(masterPin: nil,
                                                       pinKey: nil,
                                                       password: nil,
                                                       gmtOffset:gmtOffset,
                                                       dst: self.rangesToDS(ranges: ranges)))!
    res.subscribe { resp in
      resolve(resp)
    } onError: { error in
      print(error.localizedDescription)
      reject(error.localizedDescription,"",nil)
    }
  }
  
  //  pair
    @objc func commitPairing(_ bltAdminKey:String,masterPin:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)-> Void {
      let currentTimeEpoch = Int( Date().timeIntervalSince1970 )
      self.selectedLock?.pairingCommit(currentTimeInSeconds: currentTimeEpoch)
        .andThen(Single.just(PairingDataResponse(bluetoothAdminKey: bltAdminKey, masterPin: masterPin)))
        .subscribe(onSuccess: { commitSuccess in
          resolve(commitSuccess)
        }, onError: { error in
          reject(error.localizedDescription,"",nil)
        })
    }
  
//  check either lock exist in scanned list or not
  @objc func lockExist(_ name:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)-> Void {
    var exist=false
    for lock in scannedLocks{
      if lock.name==name{
        exist=true
      }
    }
    resolve(exist)
    }
//  unpair
    @objc func unpair(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)-> Void {
      self.selectedLock?.unpair()
        .subscribe(onCompleted: {
          resolve("success")
        }, onError: { error in
          reject(error.localizedDescription,"",nil)
        })
    }
  
//  unlock
  @objc func unlock(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)->Void{
    let currentTimeEpoch = Int( Date().timeIntervalSince1970 )
    self.selectedLock?.unlock(timestamp: currentTimeEpoch)
      .subscribe(onCompleted: {
        resolve("success")
      }, onError: { error in
        reject(error.localizedDescription,"",nil)
      })
  }
//  lock
  @objc func lock(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)->Void{
    let currentTimeEpoch = Int( Date().timeIntervalSince1970 )
    self.selectedLock?.lock(timeInSeconds: currentTimeEpoch)
      .subscribe(onCompleted: {
        resolve("success")
      }, onError: { error in
        reject(error.localizedDescription,"",nil)
      })
  }
  //  lock
  @objc func status(_ name:String, resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock)->Void{
      getLockByName(name: name)
      self.selectedLock?.getLockStatus()
      .subscribe(onSuccess: { status in
        resolve(status)
      }, onError: { error in
        print(error)
        reject(error.localizedDescription,"",nil)
      })
    }
  @objc func pairStatus(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
    if (selectedLock != nil) {
      print(selectedLock?.pairedStatus)
      resolve(selectedLock?.pairedStatus)
    }else{
      reject("No lock connected","",nil)
    }
  }
  @objc func logs(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
    if (selectedLock != nil) {
      let currentTimeEpoch = Int( Date().timeIntervalSince1970 )
      resolve(selectedLock?.getLogs(timeInSeconds: currentTimeEpoch))
    }else{
      reject("No lock connected","",nil)
    }
  }
  @objc func autoRelock(_ time:Int, resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
    if(selectedLock != nil){
      selectedLock?.setAutoRelock(sensorAutoRelockSeconds: time, enable: true)
        .subscribe(onCompleted: {
          resolve("success")
        }, onError: { error in
          //reject(error.localizedDescription,error.localizedDescription,nil)
          print("Local", error.localizedDescription)
        })
    }else{
      reject("No lock connected","",nil)
    }
  }
//  Util
  func getLockByName(name:String){
    var found: IglooLock?? = nil
    for lock in scannedLocks{
      if lock.name == name {
        selectedLock=lock
      }
    }
  }
  func rangesToDS(ranges:NSArray)->[DaylightSavings  ]{
    var result:[DaylightSavings]=[]
    ranges.forEach { item in
      let i:NSDictionary=item as! NSDictionary
      result.append(DaylightSavings(year: i.value(forKey: "year") as! Int,
                                    start_date: i.value(forKey: "start_date") as! Int,
                                    end_date: i.value(forKey: "end_date") as! Int,
                                    offset: i.value(forKey: "offset") as! Int))
    }
    return result
  }
}
#else
@objc(IglooModule)
class IglooModule: NSObject {
  typealias RCTPromiseResolveBlock = (Any?) -> Void
  typealias RCTPromiseRejectBlock = (String?, String?, Error?) -> Void

  @objc override init() { }

  @objc func initIgloo(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve("IgloohomeSDK unavailable - disabled for this build")
  }

  @objc func scan(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func connect(_ name:String, blk:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func disposeConnection(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve("disposed")
  }

  @objc func pair(_ name:String,ranges:NSArray,gmtOffset:Int,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func commitPairing(_ bltAdminKey:String,masterPin:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func lockExist(_ name:String,resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }

  @objc func unpair(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func unlock(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func lock(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func status(_ name:String, resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func pairStatus(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func logs(_ resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }

  @objc func autoRelock(_ time:Int, resolver resolve: @escaping RCTPromiseResolveBlock,rejecter reject: @escaping RCTPromiseRejectBlock) {
    reject("IgloohomeSDK unavailable","", nil)
  }
}
#endif
