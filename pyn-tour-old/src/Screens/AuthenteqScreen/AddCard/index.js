import React, { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { TextInput } from 'react-native-gesture-handler';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import LoadingIndicator from '../../../Components/LoadingIndicator';
import Header from '../../../Library/Components/Header';
import { addCreditCard } from '../../../Library/ServerCalls/API';
import R from '../../../assest/R';
import { getNext50Yrs, monthsList, validateCVV, validateCard, validateForm, validateMonth, validateYear } from './Utils';


const TAGS={CN:"CARD_NO",CV:"CVV",EM:"EXP_MONTH",EY:"EXP_YEAR"}

const Row = ({ children,style }) =>
    <View style={[{ flexDirection: "row" },style]}>
        {children}
    </View>
const AddCard = ({
    navigation
}) => {
    const [detail,setDetail]=useState({})
    const [isLoading,setIsLoading]=useState(false)
    const onChangeText=(TAG,text)=>{
        switch (TAG) {
            case TAGS.CN:
                setDetail({...detail,card_no:validateCard(text)})
            break;
            case TAGS.CV:
                setDetail({...detail,cvv:validateCVV(text)})
            break;
            case TAGS.EM:
                setDetail({...detail,exp_month:validateMonth(text)})
            break;
            case TAGS.EY:
                setDetail({...detail,exp_year:validateYear(text)})
            break;
            default:
            break;
        }
    }
    const submitForm=()=>{
        let moveToAuthenteq=navigation.getParam("moveToAuthenteq")
        let getTourConfigrations=navigation.getParam("getTourConfigrations")
        let validation=validateForm(detail)
        if(validation.status){
            // =====calll api
            setIsLoading(true)
            addCreditCard(detail)
            .then((response)=>response.json())
            .then((result)=>{
                setIsLoading(false)
                if(result.success){
                    navigation.goBack()
                    getTourConfigrations(true)
                    .then(()=>{
                        moveToAuthenteq()
                    },200)
                }else{
                    setTimeout(()=>{alert(result.message)},250)
                }
            }).catch((e)=>{
                setIsLoading(false)
                console.log(e)
                alert("Server error")
            })
        }else{
            alert(validation.message)
        }
    }
    return(
        <ImageBackground
            source={R.images.backgroundImage}
            style={styles.conatiner}
            imageStyle={{ resizeMode: "stretch" }}>
            <Header backBtnVisible onGoBack={() => { navigation.goBack() }} />
            {/* <Spinner visible={isLoading} textStyle={{ color: '#FFF' }} /> */}
            <LoadingIndicator visible={isLoading} />
            <ScrollView contentContainerStyle={{height:"100%"}}>
                <View style={styles.subCont}>
                <Text style={styles.text}>
                    Add card to complete the ID verification process, your card will
                    be charged $2 for each ID verification processing.
                </Text>
                <KeyboardAvoidingView behavior="padding" style={{flex:1}}>
                <View style={styles.card}>
                    <Row>
                        <View style={styles.body}>
                            <Text style={styles.label}>Credit Card Number</Text>
                            <TextInput
                            textAlignVertical="center"
                            maxLength={19}
                            value={detail.card_no}
                            placeholderTextColor="grey"
                            placeholder="i.e 1111-1111-1111-1111 "
                            keyboardType="number-pad"
                            onChangeText={(t)=>{onChangeText(TAGS.CN,t)}} 
                            style={styles.input} />
                        </View>
                        <View style={styles.body2}>
                            <Text style={styles.label}>CVV</Text>
                            <TextInput
                            value={detail.cvv}
                            placeholderTextColor="grey"
                            placeholder="i.e 123"
                            maxLength={3} 
                            keyboardType="number-pad" 
                            onChangeText={(t)=>{onChangeText(TAGS.CV,t)}} 
                            style={styles.input} />
                        </View>
                    </Row>
                    <Row style={{marginTop:20}}>
                        <View style={styles.body}>
                            <Text style={styles.label}>Exp Month</Text>
                            {/* <TextInput
                            value={detail.exp_month}
                            placeholderTextColor="grey"
                            placeholder="i.e 12"
                            maxLength={2}
                            keyboardType="number-pad" 
                            onChangeText={(t)=>{onChangeText(TAGS.EM,t)}} 
                            style={styles.input} /> */}
                            <DropDownPicker
                                defaultValue={detail.exp_month}
                                items={monthsList}
                                placeholder="i.e 11"
                                containerStyle={{height: 40}}
                                style={styles.pickerStyle}
                                itemStyle={styles.dropItemStyle}
                                labelStyle={styles.dropLabel}
                                arrowColor={'#fff'}
                                dropDownStyle={styles.dropDownStyle}
                                activeItemStyle={styles.activeItemStyle}
                                onChangeItem={(item) => setDetail({...detail,exp_month:item.value})}
                            />
                        </View>
                        <View style={styles.body2}>
                            <Text style={styles.label}>Exp Year</Text>
                            {/* <TextInput
                            value={detail.exp_yea}
                            placeholderTextColor="grey"
                            placeholder="i.e 2026"
                            maxLength={4}
                            onChangeText={(t)=>{onChangeText(TAGS.EY,t)}} 
                            keyboardType="number-pad" style={styles.input} /> */}
                            <DropDownPicker
                                defaultValue={detail.exp_year}
                                items={getNext50Yrs()}
                                placeholder="i.e 2025"
                                containerStyle={{height: 40}}
                                style={styles.pickerStyle}
                                itemStyle={styles.dropItemStyle}
                                labelStyle={styles.dropLabel}
                                arrowColor={'#fff'}
                                dropDownStyle={styles.dropDownStyle}
                                activeItemStyle={styles.activeItemStyle}
                                onChangeItem={(item) => setDetail({...detail,exp_year:item.value})}
                            />
                        </View>
                    </Row>
                </View>
                </KeyboardAvoidingView>
                <Pressable 
                style={styles.btn}
                onPress={submitForm}>
                    <Text style={[styles.label,{color:"#000"}]}>Add Card</Text>
                </Pressable>
                </View>
            </ScrollView>

    </ImageBackground>
    );
}

export default AddCard;
const styles = StyleSheet.create({
    conatiner: {
        resizeMode: "contain",
        flex: 1,
        flexDirection: "column",
        alignItems: 'center',
    },
    subCont: {
        padding: 10,
        flex: 1,
    },
    text: {
        marginTop: "5%",
        color: "#FFF",
        fontSize: hp('2.2%'),
        lineHeight: hp('3.7%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        textAlign: "center"
    },
    card: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    body: {
        width: "62%"
    },
    body2: {
        width: "33%",
        marginLeft: 20
    },
    label: {
        color: "#FFF",
        fontSize: hp('2.2%'),
        lineHeight: hp('3.7%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        marginBottom:5
    },
    input: {
        color: "#FFF",
        backgroundColor:"#000",
        letterSpacing:2,
        height:40,
        paddingLeft:10,
        fontSize: hp('2.2%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        borderRadius:5
    },
    btn:{
        width:"100%",
        backgroundColor:"#D3D3D3",
        padding:10,
        alignItems:"center"
    },
    pickerStyle:{
        flexDirection: 'row',
        backgroundColor: 'black',
        width: '100%',
        borderColor: 'black',
        zIndex: 10,
        },
    dropLabel:{
        color: '#FFF',
        fontSize: hp('2.2%'),
        lineHeight: hp('3.7%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
    },
    dropDownStyle:{
        backgroundColor: 'black',
        width: '100.60%',
        marginLeft: '-0.3%',
        borderColor: 'transparent',
        },
        dropItemStyle:{
        marginLeft: 6,
        width: '100%',
        justifyContent: 'flex-start',
        },
        activeItemStyle:{
            // backgroundColor: '#151515',
            width: '100%',
            flexDirection: 'row',
            marginLeft: 6,
            // paddingVertical: 0,
            }
})