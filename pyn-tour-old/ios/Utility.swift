//
//  Utility.swift
//  ZervDemo
//
//  Created by Gowtham Mulumudi on 23/12/20.
//

import UIKit

class Utility: NSObject {
    var dict_AuthDetails:AnyObject?
    
    
    static let SharedInstance : Utility = {
           let instance = Utility()
           return instance
       }()
       
       override init() {
           super.init()
       }
       
}
struct PairingDataResponse : Codable {
    let bluetoothAdminKey: String?
    let masterPin: String?
}

