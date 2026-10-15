import React, { Component } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import Spinner from "react-native-loading-spinner-overlay";
import CopyRight from "../../../Library/Components/Copyright"
import { View, TextInput, TouchableOpacity, Text, Keyboard } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header from '../../../Library/Components/Header/index'

import { uploadNotes } from "../../../Library/ServerCalls/API";
import LoadingIndicator from '../../../Components/LoadingIndicator';

class NotesScreen extends Component {
    constructor(props) {
        super(props);

        this.stopID = null,
            this.state = {
                isLoading: false,
                inputNotes: null,
            };
        this.uploadNotes = this.uploadNotes.bind(this);
    }
    componentDidMount() {
        const { navigation } = this.props;
        this.stopID = navigation.getParam("stopData", null);
    }

    saveNotes() {
        if (this.state.inputNotes != null) {
            this.uploadNotes();
        } else {
            alert("Notes can't be empty.")
        }
    }

    uploadNotes() {
        this.setState({
            isLoading: true
        })
        // debugger
        uploadNotes(this.state.inputNotes, this.stopID)
            // .then((res) => checkStatus(res))
            .then((res) => res.json())
            .then((res) => {
                this.setState({
                    isLoading: false
                })
                // alert("response" + JSON.stringify(res))
            })
            .catch((e) => console.warn(e))
            .done(
                this.setState({
                    isLoading: false
                }),
                this.props.navigation.goBack()
            )
    }

    handleKeyDown(e) {
        if (e.nativeEvent.key == 'Enter') {
            Keyboard.dismiss()
        }
    }

    render() {
        const { navigation } = this.props;

        return (
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS==="android"?"height":"padding"} enabled>
                <Header backBtnVisible={true} title= "ADD NOTES" navigation={navigation} onGoBack={() => {
                    if (navigation.goBack()) {
                        navigation.goBack()
                    } else {
                        navigation.replace("Welcome");
                    }
                }} />
                {/* <Spinner visible={this.state.isLoading} color='black' textStyle={{ color: '#FFF' }}/> */}
                <LoadingIndicator visible={this.state.isLoading} />
                <TextInput placeholder={'Write Note'} style={styles.textInputContainer} multiline={true} onChangeText={(text) => this.setState({ inputNotes: text })} returnKeyType='done' onKeyPress={this.handleKeyDown}></TextInput>
                <View style={[styles.overlay, styles.bottomOverlay]}>
                    <TouchableOpacity style={{width: wp("100%"), height: hp("7%"), justifyContent: 'center',alignItems: 'center'}} onPress={this.saveNotes.bind(this)}>
                        <Text style={styles.enterBarcodeManualButton}>SAVE</Text>
                    </TouchableOpacity>
                    
                </View>
                <CopyRight/>
            </KeyboardAvoidingView>
        );
    }
}

const styles = {
    container: {
        flex: 1,
        backgroundColor:"#FFF"
    },
    textInputContainer: {
        flex: 0.95,
        padding: 10,
        width: wp("100%"),
        height: hp("50%")
    },
    bottomOverlay: {
        backgroundColor: "#D3D3D3",
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    enterBarcodeManualButton: {
        padding: wp('5%'),
        fontSize: wp('4%'),
        color: 'black',
        // fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
    },
};
// export default withKeyboardAwareScrollView(NotesScreen);
export default NotesScreen;