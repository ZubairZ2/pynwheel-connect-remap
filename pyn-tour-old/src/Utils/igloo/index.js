import Storage from '@react-native-async-storage/async-storage'
import { Igloo } from '../../Library/IglooManager'
const IGLOO_API_KEY="pgGllJuZcxE7q5kGBPE7Hk.sqRoGwXWbcyEwH60FVoBZMNcaFhbw7APLLkGU8lW"
const timezon="EET"//dvcInfo.getTimezone()
const BASE_URL_IGLOO="https://api.igloodeveloper.co/v2/"

class pynwheelServer{
    static fetchIglooTimezone=async()=>{
        const timezone = timezon
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("X-IGLOOCOMPANY-APIKEY", IGLOO_API_KEY);
        const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'};
        return fetch(BASE_URL_IGLOO+"timezone/"+timezone, requestOptions).then(response => response.json())
    }
    static submitPairingData=async(pairingKey)=>{
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("X-IGLOOCOMPANY-APIKEY", IGLOO_API_KEY);
        const raw = JSON.stringify({"payload":pairingKey,"timezone":timezon});
        const requestOptions = {
          method: 'POST',
          headers: myHeaders,
          body: raw,
          redirect: 'follow'
        };
        return fetch(BASE_URL_IGLOO+"locks", requestOptions).then(response => response.json())
    }
    static fetchGuestKey=async(lockId,startDate,endDate)=>{
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("X-IGLOOCOMPANY-APIKEY", IGLOO_API_KEY);

        const raw = JSON.stringify({
            "startDate":startDate,
            "endDate":endDate,
            "permissions":["UNLOCK","SET_TIME","GET_TIME","GET_BATTERY_LEVEL","GET_LOCK_STATUS","SET_VOLUME","RESET_LOCK","SET_AUTORELOCK","SET_MAX_INCORRECT_PINS","GET_LOGS","CREATE_PIN","EDIT_PIN","DELETE_PIN","SET_MASTER_PIN","LOCK","ENABLE_AUTOUNLOCK","BLACKLIST_GUEST_KEY","UNBLACKLIST_GUEST_KEY","ENABLE_DFU","SET_DAYLIGHT_SAVINGS","ADD_CARD","DELETE_CARD","SET_BRIGHTNESS"]});
        const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
        };
        return fetch("https://api.igloodeveloper.co/v2/locks/"+lockId+"/ekeys", requestOptions)
        .then(response => response.json())
        }
    static fetchGuestPin=(lockId,date)=>{
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("X-IGLOOCOMPANY-APIKEY", "pgGllJuZcxE7q5kGBPE7Hk.sqRoGwXWbcyEwH60FVoBZMNcaFhbw7APLLkGU8lW");
        const raw = JSON.stringify({"startDate":date,"variance":5});
        const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
        };
        return fetch(BASE_URL_IGLOO+"locks/"+lockId+"/pin/onetime", requestOptions)
        .then(response => response.json())
    }
}
class IglooDB{
    static storePairingResponse=async(blk,mp)=>{
        return Storage.setItem("pairingData",JSON.stringify({blk,mp}))
    }
    static getPairingResponse=async()=>{
        return Storage.getItem("pairingData")
    }
    static deletePairingData=async()=>{
        return Storage.removeItem("pairingData")
    }
}

class IglooServer{
    static fetchIglooTimezone=async()=>{
        const timezone = timezon
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("X-IGLOOCOMPANY-APIKEY", IGLOO_API_KEY);
        const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'};
        return fetch(BASE_URL_IGLOO+"timezone/"+timezone, requestOptions).then(response => response.json())
    }
    static submitPairingData=async(pairingKey)=>{
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("X-IGLOOCOMPANY-APIKEY", IGLOO_API_KEY);
        const raw = JSON.stringify({"payload":pairingKey,"timezone":timezon});
        const requestOptions = {
          method: 'POST',
          headers: myHeaders,
          body: raw,
          redirect: 'follow'
        };
        return fetch(BASE_URL_IGLOO+"locks", requestOptions).then(response => response.json())
    }
    static fetchGuestKey=async(lockId,startDate,endDate)=>{
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("X-IGLOOCOMPANY-APIKEY", IGLOO_API_KEY);

        const raw = JSON.stringify({
            "startDate":startDate,
            "endDate":endDate,
            "permissions":["UNLOCK","SET_TIME","GET_TIME","GET_BATTERY_LEVEL","GET_LOCK_STATUS","SET_VOLUME","RESET_LOCK","SET_AUTORELOCK","SET_MAX_INCORRECT_PINS","GET_LOGS","CREATE_PIN","EDIT_PIN","DELETE_PIN","SET_MASTER_PIN","LOCK","ENABLE_AUTOUNLOCK","BLACKLIST_GUEST_KEY","UNBLACKLIST_GUEST_KEY","ENABLE_DFU","SET_DAYLIGHT_SAVINGS","ADD_CARD","DELETE_CARD","SET_BRIGHTNESS"]});
        const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
        };
        return fetch("https://api.igloodeveloper.co/v2/locks/"+lockId+"/ekeys", requestOptions)
        .then(response => response.json())
        }
    static fetchGuestPin=(lockId,date)=>{
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("X-IGLOOCOMPANY-APIKEY", "pgGllJuZcxE7q5kGBPE7Hk.sqRoGwXWbcyEwH60FVoBZMNcaFhbw7APLLkGU8lW");
        const raw = JSON.stringify({"startDate":date,"variance":5});
        const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
        };
        return fetch(BASE_URL_IGLOO+"locks/"+lockId+"/pin/onetime", requestOptions)
        .then(response => response.json())
    }
}

// single clik unlock
var date=new Date()
const date2= new Date().setMinutes(date.getMinutes()+40)
const igloo=new Igloo()
const formatedDate=()=>{
  date.setMinutes(0)
  date.setSeconds(0)
  let s=String(date.toISOString())
  s=s.slice(0,s.length-5)
  s=s+"+00:00"
  return s
}
const onError=async (error)=>{
    alert(error)
    console.log({error})
  }
const processUnlockUsingPynwheelServer=(name,blk,callback)=>{
    if(blk){//already paired
      igloo.connect(name,blk).then((connect)=>{ //1 connect with blk
        console.log("connect success")
        igloo.unlock() // unlock the lock
        .then((unlock)=>{
          console.log({unlock})
        })
      }).catch((connectError)=>alert(connectError))
    }else{
      // usign guest only
      pynwheelServer.fetchGuestKey(name,formatedDate(),new Date(date2))
      .then((key)=>{
        console.log({key})
        callback(key.bluetoothGuestKey,null)
      })
      return
      //not already paired
      // igloo.connect(name,blk).then((connect)=>{ //1 connect
      //   console.log("connect done",connect)
      //   pynwheelServer.fetchIglooTimezone().then((res)=>{ //2 fetch timezone
      //     console.log("fetchTimeZoneDone")
      //     igloo.pairLock(name,res.ranges,res.gmtOffset) //3 pair lock
      //     .then((res)=>{
      //       console.log("pair lock done",res)
      //       pynwheelServer.submitPairingData(res).then((res)=>{ //4 fetch blk and master pin
      //         console.log("submit pairing data to igloo server done")
      //         pynwheelServer.fetchGuestKey(name,date,new Date(date2)) //5 fetch guest key
      //         .then((key)=>{
      //           console.log("fetch guest key done")
      //           pynwheelServer.fetchGuestPin(name,formatedDate()).then((pinRes)=>{
      //             console.log("fetch guest pin done",res)
      //           if(pinRes.error)return //6
      //           console.log({key})
      //           igloo.commitPairing(key.bluetoothGuestKey,pinRes.pin) //7 commit bluetoothAdminKey
      //           .then((commitPairing)=>{
      //             console.log("commit pairing done",commitPairing)
      //               callback(key.bluetoothGuestKey,pinRes.pin)
      //             IglooDB.storePairingResponse(key.bluetoothGuestKey,pinRes.pin) //8 store key to local storage
      //             .then((res)=>{
      //               processUnlockUsingPynwheelServer(name,key.bluetoothGuestKey)//9 finally unlock
      //             }).catch((storePairingError)=>{onError(storePairingError)})//END 8
      //           }).catch((commitPairingError)=>{onError(commitPairingError)})//END 7
      //         }).catch((fetchPinError)=>{onError(fetchPinError)})//END6
      //         }).catch((fetchGuestKeyError)=>{onError(fetchGuestKeyError)}) //END 5
      //       }).catch((submitPairingError)=>{onError(submitPairingError)})//END4
      //     }).catch((pairLockError)=>{onError(pairLockError)})//END 3
      //   }).catch((fetchTZError)=>{onError(fetchTZError)})//END 2
      // }).catch((connectError)=>{onError(connectError)})//END 1
    }
  }

export {
  IglooDB, IglooServer, processUnlockUsingPynwheelServer
}
// single click unlock
