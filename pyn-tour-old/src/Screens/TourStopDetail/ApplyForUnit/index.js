import styles from "./style";
import React, { Component } from "react";
import { View, StyleSheet, Text, ImageBackground } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
//import Icon from "react-native-vector-icons/FontAwesome";

import Moment from 'moment';

import R from "../../../assest/R";
import CopyRight from "../../../Library/Components/Copyright"
import RNPickerSelect from 'react-native-picker-select';
import DatePicker from 'react-native-datepicker'
import GoButton from '../../../Library/Components/GoButton'
import Header from '../../../Library/Components/Header/index'

class HomeScreen extends Component {
    constructor(props) {
        super(props);
        this.applyUnit = null
        this.applyURL = ""
        this.state = {
            //show: false,
            isLoading: false,
            date: new Date(),
            leaseTerm: '1 month',
            pickerData: [
                { label: '1 month', value: '1' },
                { label: '2 months', value: '2' },
                { label: '3 months', value: '3' },
                { label: '4 months', value: '4' },
                { label: '5 months', value: '5' },
                { label: '6 months', value: '6' },
                { label: '7 months', value: '7' },
                { label: '8 months', value: '8' },
                { label: '9 months', value: '9' },
                { label: '10 months', value: '10' },
                { label: '11 months', value: '11' },
                { label: '12 months', value: '12' },
                { label: '13 months', value: '13' },
                { label: '14 months', value: '14' },
                { label: '15 months', value: '15' },
                { label: '16 months', value: '16' },
                { label: '17 months', value: '17' },
                { label: '18 months', value: '18' },
            ]
        };
        // pickerData: [
        //     { label: '1 month', value: '1 month' },
        //     { label: '2 months', value: '2 months' },
        //     { label: '3 months', value: '3 months' },
        //     { label: '4 months', value: '4 months' },
        //     { label: '5 months', value: '5 months' },
        //     { label: '6 months', value: '6 months' },
        //     { label: '7 months', value: '7 months' },
        //     { label: '8 months', value: '8 months' },
        //     { label: '9 months', value: '9 months' },
        //     { label: '10 months', value: '10 months' },
        //     { label: '11 months', value: '11 months' },
        //     { label: '12 months', value: '12' },
        // ]
    }

    componentDidMount() {
        const { navigation } = this.props;
        this.applyUnit = navigation.getParam("applyUnit", "");
    }

    //https://morganton.myresman.com/Portal/Applicants/Availability?a=1098&p=c84bc253-79cb-486a-bbe6-017bfd395dde&moveInDate=6/23/2020&refreshPricing=true
    monthPickerValueChange(value) {
        this.setState({ leaseTerm: value })
    }
    //&leaseTerm=12&moveInDate=2021-04-06
    pressOk = () => {
        // debugger
        if (this.applyUnit.provider == "resman") {
            this.applyURL = this.applyUnit.availability_url + "&moveInDate=" + Moment(this.state.date).format('YYYY-MM-DD').toString() + "&leaseTerm=" + this.state.leaseTerm //+ "&refreshPricing=true"
        }
        if (this.applyUnit.provider == "psi") {
            // this.applyURL = this.applyUnit.availability_url + "term_month/" + this.state.leaseTerm + "/?lease_start_date=" + Moment(this.state.date).format('YYYY-MM-DD').toString()  //+ "&refreshPricing=true"
            this.applyURL = this.applyUnit.availability_url

        }
        this.props.navigation.navigate("WebView", { title: '',applyUnitURL: this.applyURL })
    }

    render() {
        const { navigation } = this.props;
        return (
            <ImageBackground source={R.images.backgroundImage} style={styles.rootView}
                imageStyle={{
                    resizeMode: "stretch"
                }}>
                <Header backBtnVisible={true} title="APPLY" navigation={navigation} onGoBack={() => {
                    if (navigation.goBack()) {
                        navigation.goBack()
                    } else {
                        navigation.replace("Welcome");
                    }
                }} />
                <View style={styles.bottomView}>
                    <Text style={styles.messageText}> Please select your desired move-in date: </Text>
                    <DatePicker
                        style={{ width: wp('95%'), backgroundColor: 'black', }}
                        date={this.state.date}
                        mode="date"
                        placeholder="select date"
                        format="MM/DD/YYYY"
                        minDate={new Date()}
                        confirmBtnText="Confirm"
                        cancelBtnText="Cancel"
                        customStyles={{
                            dateInput: {
                                alignContent: 'flex-start',
                                borderColor: 'black',
                            },
                            dateText: {
                                color: 'gray',
                                textAlign: 'left',
                                left: wp('-28%'),
                            },
                        }}
                        onDateChange={(date) => { this.setState({ date: date }) }}
                    />
                    <View style={styles.messageContainer}>
                        <Text style={styles.messageText}> Please select your desired lease term: </Text>
                        <View style={styles.bottomAddress}>
                            <RNPickerSelect
                                placeholder={{
                                    label: 'Please select lease term...',
                                    value: null,
                                }}
                                style={pickerSelectStyles}
                                onValueChange={(value) => this.monthPickerValueChange(value)}
                                items={this.state.pickerData}
                                value={this.state.leaseTerm}
                            />
                            {/* <Icon name="sort-down" size={20} color="gray" style={styles.tickIcon} /> */}
                        </View>
                    </View>
                </View>
                <GoButton goPressed={() => this.pressOk()} />
                <CopyRight />
            </ImageBackground>
        );
    }
}
export default HomeScreen;

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderColor: 'white',
        width: wp('95%'),
        height: hp('6.5%'),
        borderRadius: 4,
        color: 'white',
        paddingRight: 30, // to ensure the text is never behind the icon
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: "90%",
        paddingVertical: 8,
        borderWidth: 0.5,
        borderColor: 'purple',
        borderRadius: 8,
        color: 'gray',
        paddingRight: 30, // to ensure the text is never behind the icon
    },
});