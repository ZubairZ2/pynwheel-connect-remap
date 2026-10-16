import React from 'react';
import { Dimensions, Image, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import Text from '../../Components/CustomText';
import R from '../../assest/R';
const tourTypes = {
    unscheduled_self_tour: "Unscheduled Tour",
    remote_tour: 'Remote Tour',
    guided_tour: 'Guided Tour',
    self_tour: 'Self Tour'
}
const Item = ({
    isExpired,
    isUpcoming,
    isCompleted,
    onScheduleAnOther,
    onTourSummary,
    onReschedule,
    onCustomize,
    onStartTour,
    onCall,
    onMap,
    isLast,
    item
}) => {
    const { address, city, state, zip, logo, name, phone, latitude, longitude, id, community_code } = item?.community
    const userID = useSelector(state => state.persistReducer?.userID);
    const reScheduleURL = () => {
        return item?.schedule_tour_url
    }
    const getFormatedTime = () => {
        if (item?.tour_type === 'guided_tour' || item?.tour_type === 'self_tour') {
            return item?.tour_time;
            // const tobj = item?.tour_time ? new Date(item?.tour_time) : new Date()
            // const dateStr = tobj.getDate() + " " + getMonthName(tobj.getMonth()) + ", " + tobj.getFullYear() + " - "
            // return dateStr + formatAMPM(tobj)
        } else {
            return ''
        }
    }
    const getName = () => {
        const str = new String(name)
        if (str.length > 20) {
            return str.substring(0, 23)
        }
        return str
    }
    const getTourTitle = () => {
        // return tourTypes[item?.display_tour_type]
        return item?.display_tour_type
    }
    const completedButtons = () => {
        return (
            <>
                <TouchableOpacity onPress={() => onScheduleAnOther(reScheduleURL())} style={styles.btn}>
                    <Text style={styles.btnTxt}>SCHEDULE ANOTHER</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onTourSummary} style={styles.btn}>
                    <Text style={styles.btnTxt}>TOUR SUMMARY</Text>
                </TouchableOpacity>
            </>
        )
    }
    const expiredButtons = () => {
        if (item?.tour_type !== 'guided_tour' && item?.tour_type !== 'self_tour') { return null }
        return (
            <TouchableOpacity onPress={() => onReschedule(reScheduleURL())} style={[styles.btn, { width: "100%" }]}>
                <Text style={styles.btnTxt}>RESCHEDULE</Text>
            </TouchableOpacity>
        )
    }
    const upcomingButtons = () => {
        if (item?.tour_type !== 'guided_tour' && item?.tour_type !== 'self_tour') {
            return <TouchableOpacity onPress={() => onStartTour(item)} style={[styles.btn, { width: '98%' }]}>
                <Text style={styles.btnTxt}>START TOUR</Text>
            </TouchableOpacity>
        }
        else {
            return (
                <View style={{ flexDirection: "row", justifyContent: 'space-between', width: "100%" }}>
                    <TouchableOpacity onPress={() => onReschedule(reScheduleURL())} style={[styles.btn, { width: '49%' }]}>
                        <Text style={styles.btnTxt}>RESCHEDULE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onStartTour(item)} style={[styles.btn, { width: '49%' }]}>
                        <Text style={styles.btnTxt}>START TOUR</Text>
                    </TouchableOpacity>
                </View>
            )
        }
    }
    return (
        <View style={styles.container}>
            <View style={styles.mainRow}>
                <View style={styles.iconCont}>
                    <Image source={logo?.url ? { uri: logo.url } : R.images.logoFinal} resizeMode="contain" style={styles.icon} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", flex: 1 }}>
                    <View style={{ marginLeft: 10, width: "80%" }}>
                        <Text style={[styles.text, { fontWeight: "bold", fontSize: 18 }]}>{getName()}</Text>
                        <Text style={[styles.text, { marginTop: 10, fontSize: 16 }]}>{address + " " + city}</Text>
                        <Text style={[styles.text, { marginTop: 10, fontSize: 16 }]}>{state + " " + zip}</Text>
                    </View>
                    <View style={{ width: "25%", justifyContent: "space-between" }}>
                        <TouchableOpacity onPress={() => {
                            Linking.openURL(`tel:${phone}`)
                        }}>
                            <Image style={styles.iconSM} source={R.images.call} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onMap(latitude, longitude)}>
                            <Image style={styles.iconSM} source={R.images.locationIcon} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <View style={{ width: Dimensions.get("screen").width, flexDirection: "row"}}>
                <Text  style={[styles.title, { fontSize: 10, width: 90, textAlign: 'center',  }]}>{getTourTitle()}</Text>
                <Text style={[styles.title, { marginLeft: 20, fontSize: 13 }]}>{getFormatedTime()}</Text>
            </View>
            <View style={[styles.btnContainer, isExpired ? { justifyContent: "center" } : { justifyContent: "space-between", }]}>
                {isExpired && expiredButtons()}
                {isCompleted && completedButtons()}
                {isUpcoming && upcomingButtons()}
            </View>
            {isLast ? null : <View style={styles.divider} />}
        </View>
    )
};

export default Item;

const styles = StyleSheet.create({
    container: {
        marginTop: 10
    },
    mainRow: {
        flexDirection: "row",
    },
    iconCont: {
        width: 88,
        height: 88,
        borderRadius: 44,
        padding: 2,
        backgroundColor: "#000",
        marginLeft: 5
    },
    icon: {
        width: 88,
        height: 88,
        borderRadius: 44
    },
    title: {
        color: "#8d8c8c",
        marginTop: 10,
    },
    divider: {
        backgroundColor: '#4c4a4a',
        height: 2,
        width: "95%",
        alignSelf: "center",
        marginTop: 6
    },
    text: {
        color: "#FFF"
    },
    iconSM: {
        width: 25,
        height: 25,
        marginTop: 20,
    },
    btn: {
        width: "49%",
        paddingVertical: 15,
        backgroundColor: "#040404",
        justifyContent: "center",
    },
    btnTxt: {
        color: "#FFF",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 'bold'
    },
    btnContainer: {
        flexDirection: "row",
        marginTop: 40,
        paddingHorizontal: "2%"
    }
})