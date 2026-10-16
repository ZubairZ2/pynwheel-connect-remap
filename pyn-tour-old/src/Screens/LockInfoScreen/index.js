import React, { useEffect, useRef, useState } from 'react'
import { Alert, ImageBackground, Platform, Text, Image, TouchableOpacity, View } from 'react-native'
import ImageView from "react-native-image-progress"
import Header from '../../Library/Components/Header'
import R from '../../assest/R'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Igloo } from '../../Library/IglooManager'
import { getNewIgloohomePin, unlockDoor } from '../../Library/ServerCalls/API'
import Singleton from '../../Singleton'
import { unlockDoorMsg, zervFailMessage } from '../TourMapScreen/TourmapScreenHelper'
import { initDeviceListenerAndUnlockZerv } from '../TourReview/ZERV'
import LoadingIndicator from '../../Components/LoadingIndicator'
import { initLatch, listLatchLocks, unlockLatch } from "../../Library/LatchModule"
import { getLatchAccessToken } from '../LatchScreens/LatchTokenStorage'
import { styles } from './styles'

const igloo = new Igloo()

export default function LockInfoScreen({ navigation, route }) {
    const [unlockDoorLoading, setUnlockDoorLoading] = useState(false)
    const [isLatchWebViewLoading, setIsLatchWebViewLoading] = useState(false)
    const [showLatchLink, setShowLatchLink] = useState(false)
    //const [latchWebLink, setlatchWebLink] = useState("www.google.com")
    const [latchLink, setLatchLink] = useState("")
    const [ListLatchLocks1, setListLatchLocks1] = useState([])
    const [ListLatchLocks, setListLatchLocks] = useState([])
    const webviewRef = useRef(null)
    const [nextStop, setNextStop] = useState(null);
    const [showGuestPin, setShowGuestPin] = useState(false)
    const [igloohomePin, setIgloohomePin] = useState({ status: false, pin: '' });

    const [btnTitle, setBtnTitle] = useState('UNLOCK');
    const [loading, setLoading] = useState(false)
    // const [showMoreButton, setShowMoreButton] = useState(false);
    const [isEnd, setIsEnd] = useState(false);
    const [showPinAlert, setShowPinAlert] = useState(false)
    // const [showUnlockNotWorkingButton, setShowUnlockNotWorkingButton] = useState(false)
    const zervUnlockedIndex = useRef(0)
    const zervSuccessCount = useRef(0)
    const latchUnlockIndex = useRef(0)
    const latchSuccessCount = useRef(0)
    const lockListener = useRef(null)
    const [bluetoothPermisson, setBluethoothPermisson] = useState(false)
    // const [numberOfLines, setNumberOfLines] = useState(4)
    const [lockInfo, setLockInfo] = useState({})

    // useEffect(() => {
    //     if (loading)
    //         setTimeout(() => {
    //             loading && setLoading(false)
    //         }, 30000);
    //     if (unlockDoorLoading)
    //         setTimeout(() => {
    //             unlockDoorLoading && setUnlockDoorLoading(false)
    //         }, 30000);
    // }, [loading, unlockDoorLoading])


    const onBackPress = () => {
        navigation.goBack();
    }

    //call from TourMap screen
    const nextButtonPressed = () => {
        if (navigation.getParam('isEnd')) {
            navigation.replace('ThankProperty', {
                tourData: navigation.getParam('tourData'),
                visitedStops: navigation.getParam('visitedStops'),
                visitedStopLatlong: navigation.getParam('visitedStopLatlong'),
            })
            return
        }

        if (nextStop?.type === "starting_point") {
            Singleton.getInstance().setShouldUserMoveToNextStop(true)
            navigation.pop()
        }///********* * If Next Stop is Amenity or elevator *******
        else if (nextStop?.type === "amenity") {
            navigation.replace("TourStop", { stopData: nextStop, isFromUnit: false, formPropertyMap: true })
        }////******** * If next stop is unit ********
        else if (nextStop?.type === "unit") {
            navigation.replace("UnitFloorPlan", { unitData: nextStop })
        }
        else if (nextStop?.type === "elevator") {
            Singleton.getInstance().setShouldUserMoveToNextStop(true)
            navigation.pop()
        }
    }

    const fetchNewPinCode = () => {
        setLoading(true)
        getNewIgloohomePin({ accessName: nextStop?.name, lockId: nextStop?.igloohome_lock_id })
            .then(response => response.json())
            .then((res) => {
                setIgloohomePin({ status: true, pin: res.pin })
                setLoading(false)
            })
            .catch((err) => {
                console.log(err)
                setLoading(false)
            })
    }

    const togglePinAlert = () => {
        if (!showPinAlert) {
            Alert.alert("Not working?", 'It seems there might be a problem with the pin code. \nPlease choose "Retry" below to generate a new pin.', [
                { text: "Skip", onPress: () => nextButtonPressed() },
                { text: "Retry", style: "cancel", onPress: () => fetchNewPinCode() }
            ])
        }
        setShowGuestPin(!showPinAlert)
    }

    const handleLatchLocksList = async () => {
        //const token = await getLatchAccessToken()
        const token = Singleton.getInstance().getTourSetting().latch_access_token
        console.log("TOKEN", token)
        if (token) {
            if (Platform.OS == 'android') {
                setUnlockDoorLoading(true)
                initLatch(token, (message, detail) => {
                    console.log('message', { message, detail })
                    if (message === 'success') {
                        listLatchLocks((res) => {
                            console.log('Latch_List_LOCKS', res, typeof (res))
                            const inputString = res
                            const resultArray = Object.values(JSON.parse(inputString));
                            console.log("resultArray", resultArray, typeof (resultArray));
                            setUnlockDoorLoading(false)
                            if (resultArray.length > 0) {
                                setListLatchLocks(() => resultArray)
                                setBluethoothPermisson(() => true)
                            } else {
                                setBluethoothPermisson(() => false)
                            }
                        })
                    } else if (message === 'PermissionDenied') {
                        setUnlockDoorLoading(false)
                        setTimeout(() => {
                            Alert.alert(
                                "Permission Denied",
                                "To unlock the door, you must provide nearby permissions. Otherwise, you can skip this step by pressing the skip button.",
                                [
                                    {
                                        text: "Skip",
                                        onPress: () => {
                                            nextButtonPressed();
                                        },
                                    },
                                    { text: "Retry", style: "cancel" },
                                ]
                            );
                        }, 800);
                    } else if (message === 'UserConsentDenied') {
                        setUnlockDoorLoading(false)
                        setTimeout(() => {
                            Alert.alert(
                                "Latch consent required",
                                "Please accept Latch permissions in system settings or try again.",
                                [
                                    { text: "Skip", onPress: () => nextButtonPressed() },
                                    { text: "OK", style: "cancel" },
                                ]
                            )
                        }, 300)
                    } else if (message === 'Error' || message === 'InvalidToken') {
                        setUnlockDoorLoading(false)
                        const body = detail || (message === 'InvalidToken'
                            ? 'Latch token was rejected. Try the Latch verification step again.'
                            : 'Latch could not start. Check Bluetooth, location, and network, then try again.')
                        setTimeout(() => {
                            Alert.alert('Latch', body, [
                                { text: 'Skip', onPress: () => nextButtonPressed() },
                                { text: 'OK', style: 'cancel' },
                            ])
                        }, 300)
                    }
                })
            } else {
                setUnlockDoorLoading(true)
                initLatch(token, (message) => {
                    console.log('message', { message })
                    if (message === 'success') {
                        listLatchLocks((res) => {
                            const locks = Array.isArray(res) ? res : []
                            setListLatchLocks(() => locks)
                            setUnlockDoorLoading(false)
                            if (locks.length > 0) {
                                setBluethoothPermisson(() => true)
                            } else {
                                setBluethoothPermisson(() => false)
                            }
                        })
                    } else {
                        setUnlockDoorLoading(false)
                        setBluethoothPermisson(() => false)
                        const body = typeof message === 'string'
                            ? message
                            : 'Latch could not start on this device. Check Bluetooth and try again, or skip to continue.'
                        setTimeout(() => {
                            Alert.alert('Latch', body, [
                                { text: 'Skip', onPress: () => nextButtonPressed() },
                                { text: 'OK', style: 'cancel' },
                            ])
                        }, 300)
                    }
                })
            }
        }
    }

    //expect two paramete in navigation props {isEnd} & {nextStop}
    useEffect(() => {
        // debugger
        if (navigation) {
            const isEnd = navigation.getParam('isEnd') || null
            setIsEnd(isEnd)
            const nxtStp = navigation.getParam('nextStop') || null
            // console.log("NEXT_STOP", nxtStp);
            if (nxtStp.stop_lock_provider === 'Latch') {
                const token = navigation.getParam('latchListLocksToken')
                handleLatchLocksList()
                // if (nxtStp?.latch_version == 'latchWeb') {
                //     latchWebview()
                // } else {
                //     handleLatchLocksList()
                //     setLatchLinkURL(nxtStp)
                // }
                //const token = navigation.getParam('latchListLocksToken')
            }
            getLockInfoByType(nxtStp?.stop_lock_provider, nxtStp)

            if (nxtStp.stop_lock_provider === 'Manual' || nxtStp.stop_lock_provider === 'EdgeState') {
                setShowGuestPin(true)
            }
            const igloohomev2 = nxtStp?.igloohome_version == 'igloohome'
            const iglooworks = nxtStp?.igloohome_version == 'iglooworks'

            if (igloohomev2 || iglooworks) {
                setIgloohomePin({ status: true, pin: nxtStp.igloohome_guest_pin })
            }
            if (nxtStp.stop_lock_provider !== 'Igloohome' && nxtStp.stop_lock_provider !== 'Zerv' && nxtStp.stop_lock_provider !== 'Latch' || igloohomev2) {
                console.log("IN_LOCK_PROVIDER");
                setBtnTitle("CONTINUE")
            }
            if (navigation.getParam('isEnd')) {
                setBtnTitle('CONTINUE')
            }
            setNextStop(nxtStp);
            setLatchLinkURL(nxtStp)
        }
    }, [navigation])


    //call on webview URL update
    const handleWebViewNavigationStateChange = newNavState => {
        const { url } = newNavState;
        if (!url) return;
        if (!newNavState.loading) {
            setTimeout(() => {
                setIsLatchWebViewLoading(false)
            }, 2500);
        }
        // one way to handle errors is via query string
        if (url.includes('?errors=true')) {
            setIsLatchWebViewLoading(false)
        }
    };
    //call in useEffect()
    const setLatchLinkURL = (nxtStp) => {
        if (nxtStp?.stop_lock_provider === "Latch") {
            const elevatorLatchIds = nxtStp.latch_connected_elevator_bluetooth_ids || []
            if (elevatorLatchIds.length > 0) {
                var LatchLockNamelist = []
                elevatorLatchIds.forEach((item, index) => {
                    let LatchLockName = item?.split('|')
                    console.log("LATCH_LINK2", LatchLockName[1].trim())
                    LatchLockNamelist[index] = LatchLockName[1].trim()
                })
                setListLatchLocks1(() => LatchLockNamelist)
            }
            else {
                if (nxtStp?.latch_link !== "") {
                    const LatchLockName = nxtStp?.latch_link.split('|')
                    console.log("LATCH_LINK1", LatchLockName[1].trim())
                    setLatchLink(() => LatchLockName[1].trim())
                    // setShowLatchLink(true)
                    // setIsLatchWebViewLoading(false)
                    if (webviewRef.current != null) {
                        webviewRef.current.reload()
                    }
                }
            }
        }
    }
    const latchWebview = () => {
        //setlatchWebLink()
        setShowLatchLink(true)
        setIsLatchWebViewLoading(false)
        if (webviewRef.current != null) {
            webviewRef.current.reload()
        }
    }
    const onMore = () => {
        navigation.navigate("PrivacyPolicy", { title: "Detail", des: nextStop?.type === 'elevator' ? nextStop?.elevator_long_description : nextStop.type === 'unit' ? lockInfo?.lock_long_description : lockInfo?.amenity_lock_long_description });
    }
    const unlockAutoDoor = async () => {

        if (nextStop.stop_lock_provider === "Igloohome") {
            if (nextStop.igloohome_version == 'v1') {
                unlockDoorForIgloo()
            } else {
                nextButtonPressed()
            }
        } else if (nextStop.stop_lock_provider === "Zerv") {
            console.log("IN ZERV", nextStop)
            setUnlockDoorLoading(true)
            if (nextStop?.list_of_zerv_lock_ids?.length > 0) {
                console.log("macIds", nextStop?.list_of_zerv_lock_ids)
                zervUnlockedIndex.current = 0
                zervSuccessCount.current = 0
                unlockZerv()
            } else {
                initDeviceListenerAndUnlockZerv(nextStop?.lock_provider_mac_id, () => {
                    setUnlockDoorLoading(false)
                    setTimeout(() => {
                        alert("Unlocked")
                        nextButtonPressed()
                    }, 800);
                }, () => {
                    setUnlockDoorLoading(false)
                    setTimeout(() => {
                        Alert.alert("Not working?", zervFailMessage, [
                            { text: "Skip", onPress: () => { nextButtonPressed() } },
                            { text: "Retry", style: "cancel" }
                        ])
                    }, 800)
                })
            }

        } else if (nextStop.stop_lock_provider === "Latch") {
            //console.log("IN_LATCH_LOCK", typeof (ListLatchLocks), ListLatchLocks);
            // console.log("IN_LATCH_LOCK_NEXT_DOOR", nextStop)

            //to unlock the list of latch locks
            if ((nextStop.latch_connected_elevator_bluetooth_ids || []).length > 0) {
                console.log("lock list:", ListLatchLocks1)
                latchSuccessCount.current = 0
                latchUnlockIndex.current = 0
                unlockLatchForElevator()
            } else {//to unlock a single lock
                let ifStatementIsTrue = false
                if (ListLatchLocks.length > 0) {
                    ListLatchLocks?.forEach((item, index) => {
                        console.log("LOCK_ITEM", item)
                        setUnlockDoorLoading(true)
                        if (item.name === latchLink) {
                            ifStatementIsTrue = true
                            unlockLatch(item.uuid, (result) => {
                                console.log("Unlock Latch", { result })
                                if (result == 'success') {
                                    setUnlockDoorLoading(false)
                                    setTimeout(() => {
                                        alert("Unlocked")
                                        nextButtonPressed()
                                    }, 800);
                                } else if (result === 'BleDisabled') {
                                    setUnlockDoorLoading(false)
                                    setTimeout(() => {
                                        Alert.alert("Bluethooth OFF?", 'Turn on your bluethooth first or press skip button to visit next stop', [
                                            { text: "Skip", onPress: () => { nextButtonPressed() } },
                                            { text: "Try Again", style: "cancel" }
                                        ])
                                    }, 800)
                                } else {
                                    setUnlockDoorLoading(false)
                                    setTimeout(() => {
                                        Alert.alert("Not Working?", 'Something went wrong try again or press skip button to visit next stop', [
                                            { text: "Skip", onPress: () => { nextButtonPressed() } },
                                            { text: "Try Again", style: "cancel" }
                                        ])
                                    }, 800)
                                }
                            })
                        }
                    })
                    if (!ifStatementIsTrue) {
                        setUnlockDoorLoading(false)
                        ifStatementIsTrue = false
                        setTimeout(() => {
                            Alert.alert("Not Working?", 'Something went wrong try again or press skip button to visit next stop', [
                                { text: "Skip", onPress: () => { nextButtonPressed() } },
                                { text: "Try Again", style: "cancel" }
                            ])
                        }, 800)
                    }
                } else if (bluetoothPermisson === false) {
                    handleLatchLocksList()
                } else {
                    setTimeout(() => {
                        Alert.alert(
                            'Latch',
                            'No Latch lock was found for this stop. If Latch unlock is not available in this app build, use Skip to continue the tour.',
                            [
                                { text: 'Skip', onPress: () => nextButtonPressed() },
                                { text: 'Retry', style: 'cancel', onPress: () => handleLatchLocksList() },
                            ]
                        )
                    }, 300)
                }
            }
        } else if (nextStop.stop_lock_provider === "Dwelo") {
            unlockDoorForDwelo()
        } else if (nextStop.stop_lock_provider === "Manual") {
            nextButtonPressed()
        }
        else if (nextStop.stop_lock_provider === "EdgeState") {
            nextButtonPressed()
        } else {
            console.log("ELSE", nextStop.stop_lock_provider)
            // nextButtonPressed()
        }
    };

    //iterate latch ids and unlock all latch devices in.
    const unlockLatchForElevator = () => {
        if (ListLatchLocks.length === 0) {
            setTimeout(() => {
                Alert.alert(
                    'Latch',
                    'No Latch locks were found on this device. Use Skip to continue or Retry after ensuring Bluetooth is on.',
                    [
                        { text: 'Skip', onPress: () => nextButtonPressed() },
                        { text: 'Retry', style: 'cancel', onPress: () => handleLatchLocksList() },
                    ]
                )
            }, 300)
            return
        }
        setUnlockDoorLoading(true)
        unlockLatchElevetor(ListLatchLocks1[latchUnlockIndex.current], () => {
            latchUnlockIndex.current = latchUnlockIndex.current + 1
            latchSuccessCount.current = latchSuccessCount.current + 1
            console.log("Latch lock open for multi eleator", ListLatchLocks1[latchUnlockIndex.current])
            // if (latchUnlockIndex.current < ListLatchLocks1.length) {
            //     unlockLatchForElevator()
            // } else {
            latchListItrationCompleted()
            // }
        }, () => {//failure case
            latchUnlockIndex.current = latchUnlockIndex.current + 1
            console.log("Latch lock fail for multiple elevatro ", ListLatchLocks1[latchUnlockIndex.current])
            if (latchUnlockIndex.current < ListLatchLocks1.length) {
                unlockLatchForElevator()
            } else {
                latchListItrationCompleted()
            }
        }, () => {//failure case
            bluetoothNotWorking()

        });
        //    else if (bluetoothPermisson === false) {
        //         handleLatchLocksList()
        //     }
    }

    const bluetoothNotWorking = () => {
        setUnlockDoorLoading(false)
        setTimeout(() => {
            Alert.alert("Bluethooth OFF?", 'Turn on your bluethooth first or press skip button to visit next stop', [
                { text: "Skip", onPress: () => { nextButtonPressed() } },
                { text: "Try Again", style: "cancel" }
            ])
        }, 800)
    }

    const latchListItrationCompleted = () => {
        setUnlockDoorLoading(false)
        if (latchSuccessCount.current > 0) {
            setTimeout(() => {
                alert("Unlocked")
                nextButtonPressed()
            }, 800);
        } else {
            setTimeout(() => {
                Alert.alert("Not Working?", 'Something went wrong try again or press skip button to visit next stop', [
                    { text: "Skip", onPress: () => { nextButtonPressed() } },
                    { text: "Try Again", style: "cancel" }
                ])
            }, 800)
            // setTimeout(() => {
            //     Alert.alert("Not working?", zervFailMessage, [
            //         { text: "Skip", onPress: () => { nextButtonPressed() } },
            //         { text: "Retry", style: "cancel" }
            //     ])
            // }, 800)
        }
    }

    const unlockLatchElevetor = (latchLinkLocal, sussessCallBack, failureCallBack, bluetoothNotWorkingCallback) => {
        let ifStatementIsTrue = false
        if (ListLatchLocks.length > 0) {
            ListLatchLocks?.forEach((item, index) => {
                //setUnlockDoorLoading(true)
                console.log("items name and latch libk: ", item.name + "-" + "-" + latchLinkLocal)
                if (item.name === latchLinkLocal) {
                    console.log("latch match", item.name + " : " + " : " + latchLinkLocal)
                    ifStatementIsTrue = true
                    unlockLatch(item.uuid, (result) => {
                        if (result == 'success') {
                            sussessCallBack()
                        } else if (result === 'BleDisabled') {
                            bluetoothNotWorkingCallback()
                        } else {
                            failureCallBack()
                        }
                    })
                }
            })
            if (!ifStatementIsTrue) {
                failureCallBack()
            }
        }
    }

    //iterate zerv ids and unlock all zerv devices in array
    const unlockZerv = () => {
        const lockIDs = nextStop.list_of_zerv_lock_ids
        console.log("lockIDs" + zervUnlockedIndex.current + "-->", lockIDs[zervUnlockedIndex.current])

        initDeviceListenerAndUnlockZerv(lockIDs[zervUnlockedIndex.current], () => {
            //success case
            zervUnlockedIndex.current = zervUnlockedIndex.current + 1
            zervSuccessCount.current = zervSuccessCount.current + 1
            if (zervUnlockedIndex.current < nextStop?.list_of_zerv_lock_ids?.length) {
                //iterate again
                unlockZerv()
            } else {
                zerCallback()
            }
        }, () => { //failure case
            zervUnlockedIndex.current = zervUnlockedIndex.current + 1
            if (zervUnlockedIndex.current < nextStop?.list_of_zerv_lock_ids?.length) {
                //iterate again
                unlockZerv()
            } else {
                zerCallback()
            }
        })
    }

    const zerCallback = () => {
        console.log(zervSuccessCount.current, zervSuccessCount.current > 0)
        setUnlockDoorLoading(false)
        if (zervSuccessCount.current > 0) {
            // setTimeout(() => {
            //     alert("Unlocked")
            nextButtonPressed()
            // }, 800);
        } else {
            setTimeout(() => {
                Alert.alert("Not working?", zervFailMessage, [
                    { text: "Skip", onPress: () => { nextButtonPressed() } },
                    { text: "Retry", style: "cancel" }
                ])
            }, 800)
        }
    }
    const unlockDoorForIgloo = () => {
        if (unlockDoorLoading) return
        scan()
    }
    const scan = () => {
        console.log("unlocking the lockID:", nextStop.igloohome_lock_id)
        setUnlockDoorLoading(true)
        console.log("Scan start")
        const scanTimeout = setTimeout(() => {
            if (lockListener.current) { lockListener.current.remove(); lockListener.current = null }
            igloo.disposeConnection()
            iglooLockError()
        }, 60000)
        igloo.scanLocks()
            .catch((error) => {
                console.log({ error })
                clearTimeout(scanTimeout)
                if (lockListener.current) { lockListener.current.remove(); lockListener.current = null }
                iglooLockError()
            })
        console.log("Scan Litener start")
        if (nextStop.igloohome_lock_id !== "" && nextStop.igloohome_guest_bluetooth_key !== "") {
            lockListener.current = igloo.iglooLockListener((lockID) => { // listen for locks scan
                console.log("React: lock scanned:", lockID)
                if (lockID && typeof lockID === 'string' && lockID.startsWith('ERROR:')) {
                    console.log("React: scan error event", lockID)
                    clearTimeout(scanTimeout)
                    if (lockListener.current) { lockListener.current.remove(); lockListener.current = null }
                    iglooLockError()
                    return
                }
                if (lockID && nextStop.igloohome_lock_id === lockID) {
                    console.log("Lock found", { lockID })
                    clearTimeout(scanTimeout)
                    if (lockListener.current) { lockListener.current.remove(); lockListener.current = null }

                    igloo.disposeConnection()
                        .then((disposed) => {
                            console.log("React: Dispose success", { disposed })
                            console.log("React: Start connection ", nextStop.igloohome_guest_bluetooth_key)
                            igloo.connect(nextStop.igloohome_lock_id, nextStop.igloohome_guest_bluetooth_key).then((connect) => { //1 connect with blk
                                console.log("React: connect success")
                                igloo.unlock() // unlock the lock
                                    .then((unlock) => {
                                        setUnlockDoorLoading(false)
                                        setTimeout(() => {
                                            alert("Unlocked")
                                            nextButtonPressed()
                                        }, 800);
                                    })
                                    .catch((unlockError) => {
                                        console.log("React: unlock error" + unlockError)
                                        iglooLockError()
                                    })
                            }).catch((connectError) => {
                                console.log("React: connect error" + connectError)
                                iglooLockError()
                            })
                        }).catch((disposeError) => {
                            console.log("React: dispose error" + disposeError)
                            iglooLockError()
                        })
                }
            })
        } else {
            clearTimeout(scanTimeout)
            iglooLockError()
        }
    }
    const iglooLockError = () => {
        setUnlockDoorLoading(false)
        setTimeout(() => {
            Alert.alert("Alert", "If the door does not unlock automatically, use pin code " + nextStop.igloohome_guest_pin + " in order to gain access. \n Note: Tap to wake the lock first then enter pin code provided above. \n NOT WORKING? VISIT NEXT STOP", [
                { text: "Yes", onPress: () => { nextButtonPressed() } },
                { text: "No", style: "cancel" }
            ])
        }, 800);
    }

    const unlockDoorForDwelo = () => {
        setUnlockDoorLoading(true)
        unlockDoor(nextStop.unit_dwelo_lock_id)
            .then(response => response.json())
            .then(responseJson => {
                setUnlockDoorLoading(false)
                setTimeout(() => {
                    if (responseJson.success) {
                        // setShowUnlockNotWorkingButton(false)
                        alert("Unlocked")
                        nextButtonPressed()
                    } else {
                        Alert.alert("Alert", unlockDoorMsg, [
                            {
                                text: "OK",
                                onPress: () => {
                                    Alert.alert("Alert", "NOT WORKING? VISIT NEXT STOP", [
                                        { text: "Yes", onPress: () => { nextButtonPressed() } },
                                        { text: "No", style: "cancel" }
                                    ])
                                }
                            }
                        ])
                    }
                }, 800);
            })
            .catch(() => {
                alert("Server error")
                setUnlockDoorLoading(false)
            });
    }
    const getLockInfoByType = (type, nxtStp) => {
        const communityLocksInfo = navigation.getParam('communityLocksInfo') || null
        if (!communityLocksInfo) return info;
        let info = {};
        for (let i = 0; i < communityLocksInfo?.length; i++) {
            if (communityLocksInfo[i].lock_type === type) {
                info = communityLocksInfo[i]
                break;
            }
        }
        setLockInfo(info)
        console.log("lockInfo::::", info)
    }

    const getDescription = () => {
        let desc = nextStop?.elevator_description;
        if (nextStop?.type === 'elevator') {
            desc = nextStop?.elevator_description
        } else {
            if (nextStop?.type === 'unit') {
                desc = lockInfo?.lock_description
            } else {
                desc = lockInfo?.amenity_lock_description
            }
            console.log('lock_description', lockInfo?.lock_description)
        }
        if (!desc) return ''
        if (desc?.length > 275) {
            desc = desc.slice(0, 275)
        }
        console.log("DESCRIPTION", desc)
        return desc;
    }
    const isShoeMoreButton = () => {
        const d = nextStop?.type === 'elevator' ? nextStop?.elevator_description : nextStop?.type === 'unit' ? lockInfo?.lock_description : lockInfo.amenity_lock_description

        if (d?.length > 275) {
            return true
        }
        return false
    }

    return (
        <View style={styles.container}>
            <ImageBackground source={R.images.backgroundImage} style={styles.backGroundImage}
                imageStyle={{ resizeMode: "stretch" }}>
                <Header backBtnVisible={true} title={navigation.getParam('navigation_title')} onGoBack={onBackPress} />
                <View
                    // style={{flex: 1, justifyContent: 'center'}}
                    style={[styles.topCont,
                        // showLatchLink && { flex: 0.5 }, (!lockInfo?.lock_image?.url && nextStop?.type !== 'elevator') && { flex: 1 }
                    ]}>
                    {/* <Spinner visible={unlockDoorLoading} textStyle={styles.spinnerTextStyle} /> */}
                    <LoadingIndicator visible={unlockDoorLoading || loading} />
                    <View style={styles.titleView}>
                        {/* <Text numberOfLines={numberOfLines}
                            onTextLayout={({ nativeEvent: { lines } }) => {
                                console.log("lines.length === numberOfLines",lines.length , numberOfLines)
                                setShowMoreButton(isAndroid? lines.length > numberOfLines : lines.length == numberOfLines)
                            }}
                            style={styles.titleText}>
                            {nextStop?.type === 'elevator' ? nextStop?.elevator_description : lockInfo?.lock_description}
                        </Text> */}
                        <Text
                            style={styles.titleText}>
                            {getDescription()}
                            {isShoeMoreButton() && <Text onPress={onMore} style={{ color: "rgb(120, 117, 255)", paddingBottom: 10 }}> . . . More {'>'} </Text>}
                        </Text>
                        {showGuestPin && <Text style={styles.titleText}> {isEnd ? "" : (nextStop !== null ? nextStop.guest_pin : "")}</Text>}
                        {igloohomePin.status &&
                            <>
                                <Text style={styles.titleText}>Use code
                                    <Text style={[styles.titleText, styles.titleBold]}> {igloohomePin.pin} </Text>
                                    to enter.
                                </Text>
                            </>
                        }
                    </View>
                    {nextStop?.type === 'elevator' && <Text style={styles.titleText}>Please select floor {nextStop?.stop_description?.match(/\d+/)[0]}</Text>}
                    {/* {isLatchWebViewLoading && <View style={[styles.overlay, styles.latchLoadinView]} ><AnimatedEllipsis numberOfDots={5} style={styles.animatingDot} />
                        <Text style={styles.waitText}>Please wait while the door code loads.</Text>
                    </View>}
                    {showLatchLink && <View style={styles.showLatchLink} >
                        <WebView style={styles.latchWebview}
                            source={{ uri: latchWebLink }}
                            androidHardwareAccelerationDisabled={true}
                            ref={webviewRef}
                            onNavigationStateChange={handleWebViewNavigationStateChange}
                        />
                    </View>} */}
                </View>
                {/* <View style={[styles.imageCont, (!lockInfo?.lock_image?.url && nextStop?.type !== 'elevator') && { flex: 0.1 }]}> */}
                <View style={{
                    justifyContent: 'space-around',
                    // backgroundColor: 'red',
                    flex: 1,

                }}>
                    <Image source={{ uri: nextStop?.type === 'elevator' ? nextStop?.image : nextStop?.type === 'unit' ? lockInfo?.lock_image?.url : lockInfo?.amenity_lock_image?.url }} style={{
                        resizeMode: 'contain',
                        height: 240,
                        width: wp("100%"),
                    }} />
                </View>

                <View style={styles.bottomBtnCont}>
                    <TouchableOpacity onPress={unlockAutoDoor} style={styles.contBtn}>
                        <Text style={styles.btnTxt}>{btnTitle}</Text>
                    </TouchableOpacity>
                    {igloohomePin.status && <TouchableOpacity style={[styles.contBtn, styles.codeBtnContainer]} onPress={togglePinAlert}>
                        <Text style={[styles.btnTxt, { color: "#FFd400" }]}>
                            CODE NOT WORKING?
                        </Text>
                    </TouchableOpacity>}
                </View>
            </ImageBackground>
        </View>
    )
}