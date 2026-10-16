import Foundation
import React

@objc(LatchModule)
class LatchModule: NSObject {
  // var latch: Latch! // Temporarily commented out - LatchSDK not available
    
  //init latch sdk
  @objc
  func configuereLatch(_ token: String, callback :@escaping RCTResponseSenderBlock) {
    // Temporarily commented out - LatchSDK not available
    callback(["LatchSDK not available - functionality disabled"])
    
    // Latch.initialize(withToken: token) { result in
    //   switch result {
    //   case .success(let latch):
    //     self.latch=latch
    //     callback(["success"])
    //   case .failure(let error):
    //     callback([error.localizedDescription])
    //   }
    // }
  }
  
  //unlock latch device
  @objc
  func unlock(_ lockID: String, callback: @escaping RCTResponseSenderBlock){
    // Temporarily commented out - LatchSDK not available
    callback(["LatchSDK not available - functionality disabled"])
    
    // if((self.latch) != nil){
    //   self.latch.unlock(lockID: lockID){ result in
    //     switch result{
    //     case .success():
    //       callback(["success"])
    //     case .failure(let error):
    //       callback([error.localizedDescription])
    //     }
    //   }
    // }
  }
  

  //  Lock
  @objc
  func locks(_ callback: @escaping RCTResponseSenderBlock){
    // Temporarily commented out - LatchSDK not available
    callback([[]])
    
    // var list = [[String: String]]()
    // if let latch = self.latch {
    //         latch.locks { locks in
    //             locks.forEach { lock in
    //                 let lockDict = ["name": lock.name, "uuid": lock.id.uuidString]
    //                 list.append(lockDict)
    //             }
    //             callback([list])
    //         }
    //     } else {
    //         callback([list])
    //     }
    }
}
