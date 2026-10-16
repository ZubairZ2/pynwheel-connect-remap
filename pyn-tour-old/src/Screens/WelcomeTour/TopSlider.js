import React, { useEffect, useRef } from 'react';
import { View, Animated, Modal, SafeAreaView, TouchableOpacity, Image, StyleSheet, TouchableWithoutFeedback, Dimensions, Alert } from 'react-native';
import R from '../../assest/R';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Text from '../../Components/CustomText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetNavigate } from '../../Utils/Helpers';
import { deleteUserById } from '../../Library/ServerCalls/API';
import { useDispatch, useSelector } from 'react-redux';
import { deleteLatchAccessToken } from '../LatchScreens/LatchTokenStorage';
import { setLoginStatus, setResetFirstAttemptCount } from '../../redux/actions/persistPropertyAction';

const TopSlider = ({
    animate,
    userInfo,
    upcomingCount,
    completedCount,
    navigation,
    setLoading,
    firstAttemp,
    modalClose,
    editInfo
}) => {
    const userID = useSelector(state => state.persistReducer?.userID);
    const dispatch = useDispatch()
    const animHeight = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
    const animateDown = () => {
        Animated.spring(animHeight, {
            toValue: { x: wp(90), y: hp(55) },
            useNativeDriver: false,
            bounciness: 10,
            speed: 10
        }).start()
    }
    const animateUp = () => {
        Animated.spring(animHeight, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            bounciness: 0,
        }).start()
    }
    useEffect(() => {
        if (animate) {
            animateDown()
        } else {
            animateUp()
        }
    }, [animate])
    
    const logout = () => {
        AsyncStorage.clear()
        deleteLatchAccessToken()
        resetNavigate(navigation, "LoginWithPhone")
        dispatch(setLoginStatus(false))
        dispatch(setResetFirstAttemptCount())
    }
    const logoutPress = () => {
        Alert.alert(
            'Confirm log out!',
            "Are you sure you want log out?",
            [
                { text: 'Yes', onPress: () => logout() },
                { text: 'No', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
            ],
            { cancelable: false }
        )
    }
    const delteAccount = () => {
        setLoading(true)
        deleteUserById(userID)
            .then(response => response.json())
            .then((res) => {
                if (res.status) {
                    logout()
                } else {
                    alert(res.message)
                }
                setLoading(false)
            }).catch((error) => {
                setLoading(false)
                console.log(error)
            })
    }
    const dltAccountPress = () => {
        Alert.alert(
            'Confirm delete account!',
            "Are you sure you want to permanently delete your account?",
            [
                { text: 'Yes', onPress: () => delteAccount() },
                { text: 'No', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
            ],
            { cancelable: false }
        )
    }

    return (
        <Animated.View
            style={[{
                position: "absolute",
                zIndex: 10000,
                top: hp(10),
                height: animHeight.y,
                borderRadius: 5,
                alignSelf: "center",
                width: animHeight.x,
                backgroundColor: "#FFF",
                overflow: 'hidden',
                padding: animate ? 20 : 0
            }]}>
            <View style={{ flex: 1 }}>
                {firstAttemp ? <View style={{ alignItems: 'center' }}>
                    <Text style={styles.headTitle}>Hi, {userInfo?.first_name} {userInfo?.last_name} </Text>
                    <Text style={styles.headTitle1}>Does everything here look good? </Text>
                </View> : <Text style={styles.headTitle}>User Information</Text>}
                {/* <Text style={styles.headTitle}>User Information</Text> */}
                <View style={styles.rowCont}>
                    <Text style={styles.title}>First name</Text>
                    <Text style={styles.label}>{userInfo?.first_name}</Text>
                </View>
                <View style={styles.rowCont}>
                    <Text style={styles.title}>Last Name</Text>
                    <Text style={styles.label}>{userInfo?.last_name}</Text>
                </View>
                <View style={styles.rowCont}>
                    <Text style={styles.title}>Email</Text>
                    <Text style={styles.label}>{userInfo?.email}</Text>
                </View>
                <View style={styles.rowCont}>
                    <Text style={styles.title}>Phone</Text>
                    <Text style={styles.label}>{userInfo?.phone_number}</Text>
                </View>
                <View style={styles.rowCont}>
                    <Text style={styles.title}>Scheduled Tours</Text>
                    <Text style={styles.label}>{upcomingCount ? upcomingCount : 0}</Text>
                </View>
                <View style={styles.rowCont}>
                    <Text style={styles.title}>Completed Tours</Text>
                    <Text style={styles.label}>{completedCount ? completedCount : 0}</Text>
                </View>
                {firstAttemp ? <View style={styles.btnContainer}>
                    <TouchableOpacity
                        onPress={editInfo}
                        style={styles.editBtn}>
                        <Image source={R.images.edit} resizeMode="contain" style={{ width: 20, height: 20 }} />
                        <Text style={styles.btnTxt}>I NEED TO CHANGE SOMETHING</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={modalClose}
                        style={styles.logoutBtn}>
                        <Image source={R.images.checkbox} resizeMode="contain" style={{ width: 20, height: 20, tintColor: '#000' }} />
                        <Text style={styles.btnTxt}>EVERYTHING LOOKS GOOD!</Text>
                    </TouchableOpacity>
                </View> :
                    <View style={styles.btnContainer}>
                        <TouchableOpacity
                            onPress={editInfo}
                            style={styles.editBtn}>
                            <Image source={R.images.edit} resizeMode="contain" style={{ width: 20, height: 20 }} />
                            <Text style={styles.btnTxt}>EDIT INFORMATION</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={logoutPress}
                            style={styles.logoutBtn}>
                            <Image source={R.images.logout} resizeMode="contain" style={{ width: 20, height: 20 }} />
                            <Text style={styles.btnTxt}>LOGOUT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={dltAccountPress}
                            style={styles.dltAccountBtn}>
                            <Text style={styles.dltAccountTxt}>DELETE ACCOUNT</Text>
                        </TouchableOpacity>
                    </View>
                }
                {/* <View style={styles.btnContainer}>
                        <TouchableOpacity
                            onPress={logoutPress}
                            style={styles.logoutBtn}>
                            <Image source={R.images.logout} resizeMode="contain" style={{ width: 20, height: 20 }} />
                            <Text style={styles.btnTxt}>LOGOUT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={dltAccountPress}
                            style={styles.dltAccountBtn}>
                            <Text style={styles.dltAccountTxt}>Delete Account</Text>
                        </TouchableOpacity>
                    </View> */}
            </View>
        </Animated.View>
    )
};

export default TopSlider;
const styles = StyleSheet.create({
    headTitle: {
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 16,
        marginVertical: 10,
    },
    headTitle1: {
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 16,
        marginVertical: 10,
        width: '60%'
    },
    title: {
        fontWeight: "bold",
    },
    label: {
        marginTop: 5,
        marginLeft: 10
    },
    rowCont: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10
    },
    editBtn: {
        backgroundColor: "#7cc060",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 10,
        flexDirection: "row",
        marginBottom: 10
    },
    logoutBtn: {
        backgroundColor: "#008fd4",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 10,
        flexDirection: "row"
    },
    btnTxt: {
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 10
    },
    btnContainer: {
        flex: 1,
        justifyContent: "flex-end",
        alignItems: "center"
    },
    deleteAccountBtn: {
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
    },
    dltAccountTxt: {
        color: "grey",
        fontSize: 12
    },
    dltAccountBtn: {
        marginTop: 10

    }
})