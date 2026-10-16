import shortid from "shortid";
import React, { Component } from "react";
import { Linking } from 'react-native';
import CopyRight from "../../../Library/Components/Copyright"
import { heightPercentageToDP } from "react-native-responsive-screen";
import { StyleSheet, TouchableHighlight, View, ImageBackground, SafeAreaView, Text, YellowBox, Platform } from "react-native";
import { Autocomplete } from "react-native-dropdown-autocomplete";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import Singleton from "../../../Singleton";
import R from "../../../assest/R";
import email from 'react-native-email'


// import qs from 'qs';


class SearchScreen extends Component {

  handleEmail = () => {
    const to = ['usman.khalid@intagleo.co.uk'] // string or array of email addresses
    email(to, {
      // Optional additional arguments
      cc: ['muhammad.khalid.205@gmail.com'], // string or array of email addresses
      subject: 'Show how to use',
      body: 'Some body right here'
    }).catch(console.error)
  }

  // sendEmail(to, subject, body, options = {}) {
  //   const { cc, bcc } = options;

  //   let url = `mailto:${to}`;

  //   // Create email link query
  //   const query = qs.stringify({
  //     subject: subject,
  //     body: body,
  //     cc: cc,
  //     bcc: bcc
  //   });

  //   if (query.length) {
  //     url += `?${query}`;
  //   }

  //   // check if we can use this link
  //   const canOpen = await Linking.canOpenURL(url);

  //   if (!canOpen) {
  //     throw new Error('Provided URL can not be handled');
  //   }

  //   return Linking.openURL(url);
  // }

  //   sendEmail(
  //     'elon@spacex.com',
  //        'Can we get there?',
  //     'Elon, here’s one destination you guys should consider [link]',
  //  { cc: 'elon@tesla.com; elon@solarcity.com; elon@stanford.edu' }
  // ).then(() => {
  //     console.log('Your message was successfully sent!');
  // });

  handleSelectItem(item, index) {
    // const { onDropdownClose } = this.props;
    // onDropdownClose();

    // let single = Singleton.getInstance();
    // single.setName(item);
    this.props.navigation.goBack();
  }

  constructor(props) {
    super(props);
    this.state = {
      cname: []
    };
  }

  render() {
    const autocompletes = [...Array(1).keys()];
    const { navigation } = this.props;
    const communities = navigation.getParam("communities", null);
    const name = navigation.getParam("name", "Enter Property Name");

    //const { scrollToInput, onDropdownClose, onDropdownShow } = this.props;
    return (
      <View style={styles.autocompletesContainer}>
        <ImageBackground source={R.images.backgroundImage} style={styles.autocompletesContainer}
          imageStyle={{
            resizeMode: "stretch"
          }}>
          <SafeAreaView>
            {autocompletes.map(() => (
              <Autocomplete
                key={shortid.generate()}
                style={styles.input}
                placeholder={name}
                inputStyle={{ color: "white" }}
                //scrollToInput={ev => scrollToInput(ev)}
                handleSelectItem={(item, id) => this.handleSelectItem(item, id)}
                // onDropdownClose={() => onDropdownClose()}
                // onDropdownShow={() => onDropdownShow()}
                renderIcon={() => (
                  // <Ionicons name="ios-add-circle-outline" size={20} color="#c7c6c1" style={styles.plus} />
                  null
                )}
                noDataText={name}
                data={communities}
                //fetchDataUrl={apiUrl}
                minimumCharactersCount={0}
                highlightText
                valueExtractor={item => item}
                rightContent
                rightTextExtractor={item => item.properties}
              />
            ))}
          </SafeAreaView>
          <View style={{
            flex: 0.5,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: hp('4%'),
            marginLeft: wp('1.1%'),
            marginRight: wp('1.1%'),
          }}>
            <Text style={{
              textAlign: 'center',
              color: 'white',
              fontSize: hp('1.8%'),
              lineHeight: hp('3.7%'),
              fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
            }}>Type the property name into the search bar above.</Text>
            <Text style={{
              textAlign: 'center',
              color: 'white',
              fontSize: hp('1.8%'),
              lineHeight: hp('3.7%'),
              fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
            }}>Can't find the property your're looking for?</Text>
            <Text style={{
              textAlign: 'center',
              color: 'white',
              fontSize: hp('1.8%'),
              lineHeight: hp('3.7%'),
              fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
            }}>Sorry, they must not have Pynwheel Tour set up! :(</Text>
            {/* 
            <TouchableHighlight
              style={styles.button}
              onPress={this.handleEmail}>
              <Text style={{
                textAlign: 'center',
                color: 'white',
                fontSize: hp('1.6%'),
                lineHeight: hp('3.7%'),
                textDecorationLine: 'underline',
                fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
              }}>Ask them about it! </Text>
            </TouchableHighlight> */}
          </View>
          <CopyRight />
        </ImageBackground>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  autocompletesContainer: {
    paddingTop: 0,
    backgroundColor: 'black',
    zIndex: 1,
    width: "100%",
    height: "100%",
    //paddingHorizontal: 8,
  },
  input: {
    maxHeight: 200,
    height: 800,
    backgroundColor: 'black',
  },

  inputContainer: {
    display: "flex",
    flexShrink: 0,
    flexGrow: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#c7c6c1",
    paddingVertical: 13,
    paddingLeft: 12,
    paddingRight: "5%",
    width: "90%",
    justifyContent: "flex-start",
  },
  container: {
    flex: 1,
    //backgroundColor: "#ffffff",
    backgroundColor: 'black',
  },
  plus: {
    position: "absolute",
    left: 15,
    top: 10,
  },
});

export default SearchScreen;
//export default withKeyboardAwareScrollView(SearchScreen);