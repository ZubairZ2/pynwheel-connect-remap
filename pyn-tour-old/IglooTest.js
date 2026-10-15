import React, { Component } from 'react';
import { View, Text, Button,FlatList } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import {Igloo} from './src/Library/IglooManager'
import { IglooServer,IglooDB,processUnlockUsingPynwheelServer } from './src/Utils/igloo';
const date=new Date()
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

export default class IglooTest extends Component {
  constructor(props) {
    super(props);
    this.state = {
        lockName:null,
        connected:false,
        paired:false,
        foundLocks:[],
        blk:null,
        mp:null
    };
    this.lockListener=null
  }
  componentDidMount(){
    igloo.initialize()
    .then((initialize)=>{
      console.log({initialize})
    })
    IglooDB.getPairingResponse()
    .then((res)=>{
      if(res){
        res=JSON.parse(res)
        this.setState({blk:res.blk,mp:res.mp})
      }
    })
  }
// 1 scan
  scan=()=>{
    this.setState({lockName:null,connected:null,paired:null})
    const {foundLocks}=this.state
    igloo.scanLocks()
    .catch((error)=>{
      console.log({error})
    })
    this.lockListener=igloo.iglooLockListener((event)=>{ // listen for locks scan
      if(event && !foundLocks.includes(event)){
        console.log({event})
        this.setState({foundLocks:[...foundLocks,event]})
      }
    })
  }
  // // 2 connect
  // connect=(name,bltk)=>{
  //   //connect to selected lock
  //   console.log(this.state.mp)
  //   this.setState({lockName:name})
  //   if(this.lockListener){
  //     this.lockListener.remove()
  //   }
  //   igloo.connect(name,bltk)
  //   .then((res)=>{
  //     console.log(res)
  //     console.warn("success",res)
  //     this.setState({connected:res})})
  //   .catch((error)=>{
  //     console.error(error)
  //       this.setState({connected:"error"})
  //       console.warn({error})
  //   })
  // }

  // 3 pair
  pair=(name)=>{
    IglooServer.fetchIglooTimezone()
    .then((res)=>{
      igloo.pairLock(name,res.ranges,res.gmtOffset)
      .then((res)=>{
          this.setState({paired:true})
          console.log("pair success",res)
          this.submitPairingData(name,res)
      }).catch((error)=>{
        this.setState({paired:false})
        console.log("pair failed",error)
      })
    }).catch((error)=>{
      console.log("error geting time zone info from igloo",error)
    })
  }
  // 4 submit pairing data to server and commit to sdk
  submitPairingData=(name,res)=>{
    IglooServer.submitPairingData(res)
    .then((res)=>{
      IglooServer.fetchGuestKey(name,date,new Date(date2)) //fetch guest key
      .then((key)=>{
      IglooServer.fetchGuestPin(name,formatedDate()).then((pinRes)=>{
        console.log({pinRes})
        if(pinRes.error)return
        this.setState({blk:key.bluetoothGuestKey,mp:pinRes.pin})
        igloo.commitPairing(key.bluetoothGuestKey,pinRes.pin)
        .then((commit)=>{
        console.log({commit})
        IglooDB.storePairingResponse(res.bluetoothGuestKey,pinRes.pin)
        }).catch((commitError)=>console.log({commitError}))
      }).catch((fetchGuestPinError)=>console.log({fetchGuestPinError}))
      }).catch((fetchGuestKeyError)=>console.log({fetchGuestKeyError}))
    })
  }
  unlock=()=>{
    igloo.unlock()
    .then((unlock)=>console.log({unlock}))
    .catch((error)=>console.log({error}))
  }
  lock=()=>{
    igloo.lock()
  }
  unpair=()=>{
    igloo.unpair()
    .then((res)=>{
      this.setState({blk:null,mp:null})
      IglooDB.deletePairingData()
    }).catch((e)=>alert(e))
    igloo.logs()
    .then((logs)=>{console.log({logs})})
  }

  //clear previous credentials
  onError=async (error)=>{
    this.setState({blk:null,mp:null})
    await IglooDB.deletePairingData()
    alert(error)
    console.log({error})
    // this.processUnlock()
  }
  reset=async()=>{
    this.setState({blk:null,mp:null})
    await IglooDB.deletePairingData()
  }
// pass through all steps at once
  processUnlock=(name)=>{
    if(this.lockListener){this.lockListener.remove()}
    igloo.disposeConnection()
    .then((disposed)=>{
      console.log({disposed})
      processUnlockUsingPynwheelServer(name,this.state.blk,(blk,mp)=>{
        this.setState({blk,mp})
      })
    }).catch((disposeError)=>{console.log({disposeError})})
    return
    // this.setState({lockName:name})
    // if(this.lockListener){this.lockListener.remove()}
    // const {blk}=this.state
    // if(blk){//already paired
    //   igloo.connect(name,blk).then((connect)=>{ //1 connect with blk
    //     console.log("connect success")
    //     igloo.unlock() // unlock the lock
    //     .then((unlock)=>{
    //       console.log({unlock})
    //     })
    //   }).catch((connectError)=>alert(connectError))
    // }else{
    //   //not already paired
    //   igloo.connect(name,blk).then((connect)=>{ //1 connect
    //     console.log("connect done",connect)
    //     IglooServer.fetchIglooTimezone().then((res)=>{ //2 fetch timezone
    //       console.log("fetchTimeZoneDone")
    //       igloo.pairLock(name,res.ranges,res.gmtOffset) //3 pair lock
    //       .then((res)=>{
    //         console.log("pair lock done",res)
    //         IglooServer.submitPairingData(res).then((res)=>{ //4 fetch blk and master pin
    //           console.log("submit pairing data to igloo server done")
    //           IglooServer.fetchGuestKey(name,date,new Date(date2)) //5 fetch guest key
    //           .then((key)=>{
    //             console.log("fetch guest key done")
    //             IglooServer.fetchGuestPin(name,formatedDate()).then((pinRes)=>{
    //               console.log("fetch guest pin done",res)
    //             if(pinRes.error)return //6
    //             console.log({key})
    //             igloo.commitPairing(key.bluetoothGuestKey,pinRes.pin) //7 commit bluetoothAdminKey
    //             .then((commitPairing)=>{
    //               console.log("commit pairing done",commitPairing)
    //               this.setState({blk:key.bluetoothGuestKey,mp:pinRes.pin})
    //               IglooDB.storePairingResponse(key.bluetoothGuestKey,pinRes.pin) //8 store key to local storage
    //               .then((res)=>{
    //                 this.processUnlock(name)//9 finally unlock
    //               }).catch((storePairingError)=>{this.onError(storePairingError)})//END 8
    //             }).catch((commitPairingError)=>{this.onError(commitPairingError)})//END 7
    //           }).catch((fetchPinError)=>{this.onError(fetchPinError)})//END6
    //           }).catch((fetchGuestKeyError)=>{this.onError(fetchGuestKeyError)}) //END 5
    //         }).catch((submitPairingError)=>{this.onError(submitPairingError)})//END4
    //       }).catch((pairLockError)=>{this.onError(pairLockError)})//END 3
    //     }).catch((fetchTZError)=>{this.onError(fetchTZError)})//END 2
    //   }).catch((connectError)=>{this.onError(connectError)})//END 1
    // }
  }

  lockStatus=()=>{
    igloo.status(this.state.lockName)
    .then((status)=>{console.log({status})})
    .catch((statusError)=>console.log({statusError}))
  }

  render() {
    return (
      <SafeAreaView style={{flex:1}}>
          <View style={{backgroundColor:"#d3d3d3",marginTop:20}}>
                <View style={{flexDirection:"row",justifyContent:"space-between",padding:10}}>
                    <View>
                        <Text>Lock Name:{this.state.lockName}</Text>
                        <Text>Connected:{this.state.connected}</Text>
                        <Text>Paired:{this.state.paired}</Text>
                    </View>
                    <View style={{}}>
                        <Button title="Scan" onPress={this.scan}></Button>
                        <Button title="Reset" onPress={this.reset}></Button>
                        <Button title="Unlock" onPress={this.unlock}></Button>
                        <Button title="Lock" onPress={this.lock}></Button>
                        <Button title="Status" onPress={this.lockStatus}></Button>
                        <Button title="Pair Status" onPress={()=>{
                          igloo.pairStatus()
                          .then((paired)=>alert(paired))
                          .catch((error)=>alert(error))
                        }}><Text>Staus</Text></Button>
                        <Button title="Unpair" onPress={this.unpair}><Text>Unpair</Text></Button>
                        <Button title="Auto relock" onPress={()=>{
                          igloo.autoRelock(20)
                          .then((success)=>console.log({success}))
                          .catch((error)=>console.log({error}))
                          }}></Button>
                    </View>
                </View>
          </View>
          <View>
              <FlatList 
              data={this.state.foundLocks}
              keyExtractor={(item,index)=>item+index}
              renderItem={({item,index})=>{
                  return(
                    <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:10}}>
                        <Text>{item}</Text>
                        <View>
                            <Button title="Connect" onPress={()=>this.processUnlock(item,this.state.blk)}><Text>Connect</Text></Button>
                            <Button title="Pair" onPress={()=>this.pair(item)}><Text>Pair</Text></Button>
                        </View>
                    </View>
                  )
              }}
              />
          </View>
        
      </SafeAreaView>
    );
  }
}
