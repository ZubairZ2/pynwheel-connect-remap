import React, { Component, useRef } from 'react';
import { Text, View, Image, TouchableOpacity, ActivityIndicator, BackHandler, Platfor } from 'react-native';
import { StackActions, NavigationActions } from 'react-navigation';

import styles from './style';
import R from '../../../../assest/R';
import { InitializeTourFromServer, getFloorPlansForEditTour, userFailedInIDVarification } from "../../../../Library/ServerCalls/API"

import Singleton from '../../../../Singleton';
const resetAction = StackActions.reset({
  index: 0,
  actions: [NavigationActions.navigate({ routeName: 'Main' })],
});

export class DocumentScan extends Component {
  constructor(props) {
    super(props);
    this.state = {
      frontImg: this.props.navigation.getParam('frontImg'),
      backImg: this.props.navigation.getParam('backImg'),
      selfie: this.props.navigation.getParam('selfie'),
      scan: this.props.navigation.getParam('scan'),
      response: [],
      error: '',
      loading: false,
      success: true
    };
  }

  checkpointData = () => {
    var request;
    switch (this.state.scan) {
      case 'Passport':
        request = JSON.stringify({
          documentType: 2,
          verifyFace: true,
          frontImageBase64: this.state.frontImg,
          // backOrSecondImageBase64: this.state.img[1],
          faceImageBase64: this.state.selfie,
        });
        break;
      case 'Driving':
        request = JSON.stringify({
          documentType: 1,
          verifyFace: true,
          frontImageBase64: this.state.frontImg,
          backOrSecondImageBase64: this.state.backImg,
          faceImageBase64: this.state.selfie,
        });
        break;
      case 'Id':
        request = JSON.stringify({
          documentType: 6,
          verifyFace: true,
          frontImageBase64: this.state.frontImg,
          // backOrSecondImageBase64: this.state.img[1],
          faceImageBase64: this.state.selfie,
        });
        break;
      case 'PCard':
        request = JSON.stringify({
          documentType: 6,
          verifyFace: true,
          frontImageBase64: this.state.frontImg,
          // backOrSecondImageBase64: this.state.img[1],
          faceImageBase64: this.state.selfie,
        });
        break;
      case 'IID':
        request = JSON.stringify({
          documentType: 6,
          verifyFace: true,
          frontImageBase64: this.state.frontImg,
          // backOrSecondImageBase64: this.state.img[1],
          faceImageBase64: this.state.selfie,
        });
        break;
    }

    const settings = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        // 'Content-Type': 'multipart/form-data; ',
        Authorization: 'Bearer ' + 'sk_2eda9fde-0fb0-45f8-8c7c-af320495b016',
      },
      body: request,
    };
    // Validate images before sending
    if (!this.state.frontImg || !this.state.selfie) {
      this.setState({
        error: 'Missing images. Please retry the scan.',
        loading: false,
      });
      console.warn('Missing images:', {
        hasFront: !!this.state.frontImg,
        hasBack: !!this.state.backImg,
        hasSelfie: !!this.state.selfie,
      });
      return;
    }

    console.log('Sending verify request, body size:', request.length);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://dvs.checkpointid.com/api/verify');
    xhr.setRequestHeader('Content-Type', 'application/json;charset=utf-8');
    xhr.setRequestHeader('Authorization', 'Bearer sk_2eda9fde-0fb0-45f8-8c7c-af320495b016');
    xhr.timeout = 60000;
    xhr.onload = () => {
      console.log('XHR status:', xhr.status);
      console.log('XHR response body:', xhr.responseText);
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        this.setState({ error: 'Invalid response from server', loading: false });
        return;
      }
      this.setState({ response: data, loading: false });
      if (data) {
        this.checkSuccess(data);
      } else {
        this.setState({ error: 'Invalid response data', loading: false });
      }
    };
    xhr.onerror = () => {
      console.log('XHR error');
      this.setState({ error: 'Network error', loading: false });
    };
    xhr.ontimeout = () => {
      console.log('XHR timeout');
      this.setState({ error: 'Request timed out', loading: false });
    };
    xhr.send(request);
  };

  componentDidMount() {
    BackHandler.addEventListener('hardwareBackPress', this.handleBackButton);

    this.setState({
      loading: true,
    });

    const load = async () => {
      let data = await this.checkpointData();
    };

    load();
  }

  moveBack = () => {
    this.props.navigation.dispatch(resetAction);
    // this.props.navigation.navigate("Main");
  };

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackButton);
  }

  handleBackButton() {
    return true;
  }

  checkSuccess = (data) => {
    if (data.code == 'MultipleErrors' ||
      data.code == 'MRZOCRError' ||
      data.code == 'MRZInNotPresentError' ||
      data.code == 'ValidationError' ||
      data.faceVerificationResult?.antiSpoofing < 80 ||
      data.faceVerificationResult?.confidence < 55) {
      this.setState({ success: false })

      if (this.state.response.code == 'MultipleErrors' ||
        this.state.response.code == 'ValidationError' ||
        this.state.response.faceVerificationResult
          ?.antiSpoofing < 80 ||
        this.state.response.faceVerificationResult?.confidence <
        55) {
        userFailedInIDVarification("checkpointid", "The Face has not been matched")
      } else if (this.state.response.code == 'MRZOCRError' ||
        this.state.response.code == 'MRZInNotPresentError') {
        userFailedInIDVarification("checkpointid", "Unable to capture mrz from the image of the document.")
      }
      // debugger

    } else {
      this.setState({ success: true })
      Singleton.getInstance().setIdVerificationProvider("check_point_id")
      console.log("Response Screen this.props.navigation.replaceTourReview");
      // this.props.navigation.replace("TourReview")
      InitializeTourFromServer()
        .then(response => response.json())
        .then(responseJson => {
          if ((typeof (responseJson) !== 'undefined') || responseJson !== null) {
            Singleton.getInstance().setBedroomFilter(this.addAfter(responseJson.unit_bedrooms, 0, { id: 0, title: 'Any', value: 'any', is_selected: true }))
            getFloorPlansForEditTour(4, 1, "any", "price_asc")
              .then(response => response.json())
              .then(responseJson1 => {
                console.log("responseJson.allow_tours_customization && responseJson1.floorplans.length > 0", responseJson.allow_tours_customization && responseJson1.floorplans.length > 0);
                // responseJson.allow_tours_customization && responseJson1.floorplans.length > 0 ? this.props.navigation.navigate("FloorPlatList1") : this.props.navigation.navigate("TourReview")
                //this.props.navigation.navigate(responseJson.allow_tours_customization ? "CreateTour" : "NonCustomTour")
                if (responseJson.allow_tours_customization) {
                  if (!responseJson.show_add_units_button) {
                    this.props.navigation.navigate('YourTour')
                  } else if (responseJson.skip_tour_editing) {
                    this.props.navigation.navigate('YourTour')
                  } else {
                    this.props.navigation.navigate('CreateTour')
                  }
                } else {
                  this.props.navigation.navigate('NonCustomTour')
                }
              })
              .catch(error => {
                console.log(error);
              });
          }
          else { console.log('InitializeTourFromServer Error on Response Screen') }
        })
        .catch(() => { console.log('InitializeTourFromServer Error on Response Screen') });
    }
  }

  addAfter(array, index, newItem) {
    return [
      ...array.slice(0, index),
      newItem,
      ...array.slice(index)
    ];
  }

  render() {
    const { success } = this.state
    return (
      <View style={styles.container}>
        <View style={styles.response}>
          {this.state.loading ? (
            <>
              <ActivityIndicator color="white" size="large" />
              <Text
                style={{
                  marginTop: 15,
                  color: 'white',
                  fontSize: 14,
                  textAlign: 'center',
                }}>Processing...</Text>

            </>) : (
              <>
                {this.state.error == '' ? (
                  !success ? (
                    <View
                      style={{
                        width: '70%',
                        padding: 10,
                      }}>
                      <Text style={{ textAlign: 'center' }}>
                        {(this.state.response.code == 'MultipleErrors' ||
                          this.state.response.code == 'ValidationError' ||
                          this.state.response.faceVerificationResult
                            ?.antiSpoofing < 80 ||
                          this.state.response.faceVerificationResult?.confidence <
                          55) && (
                            <Text
                              style={{
                                color: 'white',
                                fontSize: 14,
                                textAlign: 'center',
                              }}>
                              The Face has not been matched
                            </Text>
                          )}
                        {(this.state.response.code == 'MRZOCRError' ||
                          this.state.response.code == 'MRZInNotPresentError') && (
                            <Text
                              style={{
                                color: 'white',
                                fontSize: 16,
                                textAlign: 'center',
                                fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
                              }}>
                              Unable to capture mrz from the image of the document.
                            </Text>
                          )}
                      </Text>
                      <Text />
                    </View>
                  ) : (
                      <>
                        <View style={styles.tick}>
                          <Image
                            source={R.images.greenTick}
                            style={{ height: 50, width: 50 }}
                          />
                          <Text style={{ color: '#00ff00', fontSize: 18 }}>
                            Verified
                      </Text>
                        </View>
                        <View style={{ margin: 30 }}>
                          <Text style={{ color: '#00ff00', fontSize: 18 }}>
                            The document and face has been verified
                      </Text>
                        </View>
                      </>
                    )
                ) : (
                    <Text>{this.state.error}</Text>
                  )}
              </>
            )}
        </View>
        {!success && (
          <TouchableOpacity style={styles.btn} onPress={() => this.moveBack()}>
            <Text>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
}

export default DocumentScan;
