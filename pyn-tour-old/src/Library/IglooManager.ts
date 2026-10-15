import IglooModule from './IglooModule'
import {NativeEventEmitter,NativeModules} from 'react-native'
const { ModuleWithEmitter } = NativeModules;
const eventEmitter = new NativeEventEmitter(NativeModules.IglooModule);

class Igloo{
    initialize=async()=>{
        return IglooModule.initIgloo()
    }
    scanLocks=async()=>{
        return IglooModule.scan()
    }
    connect=async(lockName:String,bltKey:String)=>{
        return IglooModule.connect(lockName,bltKey)
    }
    disposeConnection=async()=>{
        return IglooModule.disposeConnection()
    }
    pairLock=async(lockName:String,ranges:[],gmtOffset:Number)=>{
        return IglooModule.pair(lockName,ranges,gmtOffset)
    }
    unpair=async()=>{
        return IglooModule.unpair()
    }
    commitPairing=async(pairingKey:String,masterPin:String)=>{
        return IglooModule.commitPairing(pairingKey,masterPin)
    }
    pairStatus=()=>{
        return IglooModule.pairStatus()
    }
    unlock=async()=>{
        return IglooModule.unlock()
    }
    lock=async()=>{
        return IglooModule.lock()
    }
    isLockOpen=async()=>{
        return IglooModule.isLockOpen()
    }
    lockExist=async(name:String)=>{
        return IglooModule.lockExist(name)
    }
    status=async(name:String)=>{
        return IglooModule.status(name)
    }
    logs=async()=>{
        return IglooModule.logs()
    }
    iglooLockListener=(event)=>{
         return eventEmitter.addListener('iglooLockScanEvent', event);
    }
    autoRelock=async(time:Number)=>{
        return IglooModule.autoRelock(time)
    }

}
export {
    Igloo
}