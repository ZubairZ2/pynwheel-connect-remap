import React from 'react';
import { connect } from 'react-redux';
import { FlatList } from 'react-native-gesture-handler';
import Spinner from 'react-native-loading-spinner-overlay';
import {
  View,
  Alert,
  Platform,
  Animated,
  Image,
  StatusBar,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  AppState,
  SafeAreaView,
  Linking,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

import R from '../../assest/R';
import Singleton from '../../Singleton';
import GoButton from '../../Library/Components/GoButton';
import CopyRight from '../../Library/Components/Copyright';
import {
  InitializeTourFromServer,
  addOrRemoveUnitFormTour,
  CustomizeTourFromServer,
  generateLocksAccessesFromServer,
  getTourData,
  getFloorPlansForEditTour,
} from '../../Library/ServerCalls/API';
import { deleteTourStop } from '../../Library/ServerCalls/API';
import { getRemortAlocationStatus } from '../../Library/ServerCalls/API';
import {
  setShowChatButton,
  setUnreadMessageCount,
} from '../../redux/actions/chatActions';
import ActivityTrackerManager from '../../Library/Managers/ActivityTrackerManager';
import { trackTourUserActivity } from '../../Library/Managers/APICalls';
import Config from 'react-native-config';
import { NavigationActions, StackActions } from 'react-navigation';
import { downloadFiles } from '../../Utils/Helpers';
import Header from '../../Library/Components/Header';
import { authenticateZerv, authenticateZervUsingSingelton } from './ZERV';
import Text from '../../Components/CustomText';
import UnitInformation from './Components/UnitInformation';
import CommunityInfo from './Components/CommunityInf';
import Geolocation from '@react-native-community/geolocation';
import { isGPSEnabled, openGPSSettings } from '../../Library/ZervManager';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LoadingIndicator from '../../Components/LoadingIndicator';

class index extends React.Component {
  //test
  constructor(props) {
    super(props);
    this.state = {
      activeTour: null,
      allowToursCustomization: false,
      unitsAvailable: false,
      amenitiesAvailable: false,
      tourStopsData: [],
      isGifLoading: false,
      isLoading: true,
      message:
        "This is what you'll see on your tour! If you want to remove one, just touch the checkmark.",
      textOpacity: new Animated.Value(0),
    };
    this.locks_thread_ref = null; //need to send this key to deleteTourStop api call
    this.deletedStopsID = null;
    this.activeTourData = null;
    this.lockAccessCallInProgress = false;
    this.propertyAccess = false;
    this.propertyAccessCode = '';
    this.allowToursCustomization = false;
    this.showAddUnitsButton = false;
  }

  componentDidMount() {
    this.InitializeTour();
    this.focusListener = this.props.navigation.addListener('didFocus', () => {
      // if (this.props.allowToursCustomization) {
      this.CustomizeTour();
      // }
    });
    AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
    clearInterval(this.checkLockStatusTimer);
    this.focusListener.remove();
  }

  showText() {
    Animated.timing(this.state.textOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }

  _handleAppStateChange = (nextAppState) => {
    this.setState({ appState: nextAppState });
    if (nextAppState === 'background') {
      // Do something here on app background.
    }
    if (nextAppState === 'active') {
      // Do something here on app active foreground mode.
    }
    if (nextAppState === 'inactive') {
      clearInterval(this.checkLockStatusTimer);
      // Do something here on app inactive mode.
    }
  };

  InitializeTour = () => {
    InitializeTourFromServer()
      .then((response) => {
        console.log('InitializeTour response status:', response.status);
        return response.json();
      })
      .then((responseJson) => {
        console.log('InitializeTour responseJson:', JSON.stringify(responseJson).substring(0, 200));
        if (typeof responseJson !== 'undefined' && responseJson !== null) {
          this.propertyAccess = responseJson.property_access;
          this.propertyAccessCode = responseJson.property_access_code;
          Singleton.getInstance().setBedroomFilter(
            this.addAfter(responseJson.unit_bedrooms, 0, {
              id: 0,
              title: 'Any',
              value: 'any',
              is_selected: true,
            }),
          );
          Singleton.getInstance().setIdVerificationProvider('');
          Singleton.getInstance().setTourKey(responseJson.tour_key);
          Singleton.getInstance().setTourId(responseJson.tour_id);
          getFloorPlansForEditTour(4, 1, 'any', 'price_asc')
            .then((response) => response.json())
            .then((responseJson1) => {
              console.log(
                'responseJson.amenities_available initial',
                responseJson.amenities_available,
              );
              this.setState({
                allowToursCustomization: responseJson.allow_tours_customization,
                // mode: responseJson.allow_tours_customization ? 'CREATE' : "REVIEW",
                unitsAvailable:
                  responseJson1.floorplans.length > 0 ? true : false,
                amenitiesAvailable: responseJson.amenities_available,
                showAddUnitsButton: responseJson.show_add_units_button,
                skipTourEditing: responseJson.skip_tour_editing,
                skipTourEditingUnitNotAvailable: responseJson.show_add_units_button,

              });
              this.CustomizeTour();
            })
            .catch(() => {
              this.showServerError('InitializeTour-floorplans-catch');
            });
        } else {
          this.showServerError('InitializeTour-else');
        }
      })
      .catch(() => {
        this.showServerError('InitializeTour-catch');
      });
  };

  addAfter(array, index, newItem) {
    return [...array.slice(0, index), newItem, ...array.slice(index)];
  }

  CustomizeTour = () => {
    this.setState({ isLoading: true });
    CustomizeTourFromServer()
      .then((response) => {
        console.log('CustomizeTour status:', response.status);
        return response.json();
      })
      .then((responseJson) => {
        console.log('CustomizeTour response:', JSON.stringify(responseJson).substring(0, 300));
        // debugger
        this.setState({ isLoading: false });
        if (responseJson && responseJson.tour_stops) {
          if (responseJson.tour_stops.length !== 0) {
            Singleton.getInstance().setIsSitemap(responseJson.is_sitemap);
            Singleton.getInstance().setCurrencySymbol(
              responseJson?.currency_symbol,
            );
            console.log(
              'responseJson.amenities_available',
              responseJson.amenities_available,
            );
            this.setState({
              activeTour: responseJson,
              tourStopsData: responseJson.tour_stops,
              amenitiesAvailable: responseJson.show_add_amenities_button,
              showAddUnitsButton: responseJson.show_add_units_button,
            });
          } else {
            this.setState({
              message:
                'Tour Coming Soon! \n This Tour is currently under construction. Please check back later.',
            });
          }
        } else {
          this.showServerError('CustomizeTour-else');
        }
      })
      .catch((err) => {
        console.log('CustomizeTour catch error:', err);
        this.showServerError('CustomizeTour-catch');
      });
  };

  deleteItemById = (stop) => {
    if (stop.type !== 'elevator') {
      if (this.state.tourStopsData.length > 1) {
        Alert.alert(
          'Alert',
          'Press OK to delete this stop',
          [
            {
              text: 'Cancel',
              onPress: () => console.log('Cancel Pressed'),
              style: 'cancel',
            },
            { text: 'OK', onPress: () => this.deleteConfirmed(stop) },
          ],
          { cancelable: false },
        );
      } else {
        alert('The last one is not deleteable');
      }
    } else {
      alert('Elevator cannot be deleted.');
    }
  };

  deleteConfirmed = (stop) => {
    if (!this.state.allowToursCustomization) {
      this.deletedStopsID = this.deletedStopsID + stop.stop_id + ',';
      // const filteredData = this.state.tourStopsData.filter(
      //   (item) => item.stop_id !== stop.stop_id,
      // );
      //this.setState({ tourStopsData: filteredData });
      // this.setState({ isLoading: true });
      // addOrRemoveUnitFormTour(
      //   stop.id,
      //   stop.stop_type,
      //   stop.floor,
      //   stop.building,
      // )
      //   .then((response) => response.json())
      //   .then((responseJson) => {
      //     this.setState({ isLoading: false });
      //     this.CustomizeTour();
      //     // if (
      //     //   typeof responseJson.is_unit_already_available !== 'undefined' ||
      //     //   responseJson.is_unit_already_available != null
      //     // ) {
      //     //   this.setState({ isLoading: false });
      //     //   const filteredData = this.state.tourStopsData.filter(
      //     //     (item) => item.stop_id !== stop.stop_id,
      //     //   );
      //     //   this.setState({ tourStopsData: filteredData });
      //     // }
      //   })
      //   .catch((error) => {
      //     this.showServerError();
      //   });

    } else {
      console.log("hello")
    }
    this.setState({ isLoading: true });
    addOrRemoveUnitFormTour(
      stop.id,
      stop.stop_type,
      stop.floor,
      stop.building,
    )
      .then((response) => response.json())
      .then((responseJson) => {
        if (
          typeof responseJson.is_unit_already_available !== 'undefined' ||
          responseJson.is_unit_already_available != null
        ) {
          this.setState({ isLoading: false });
          // const filteredData = this.state.tourStopsData.filter(
          //   (item) => item.stop_id !== stop.stop_id,
          // );
          //this.setState({ tourStopsData: filteredData });
          if (this.state.allowToursCustomization) {
            if (stop.stop_type === 'amenity') {
              this.setState({ amenitiesAvailable: true });
            }
            if (stop.stop_type === 'unit') {
              this.setState({ showAddUnitsButton: true })
            }
          }
          this.CustomizeTour();
        } else {
          this.showServerError();
        }
      })
      .catch((error) => {
        this.showServerError();
      });
  };
  pressOk = () => {
    // this.moveToTourMapScreen('LatchOTPScreen', { deletedStopsID: this.deletedStopsID, tourData: this.activeTourData })
    if (this.propertyAccess) {
      this.moveToTourMapScreen('CommunityCode', {
        deletedStopsID: this.deletedStopsID,
        tourData: this.activeTourData,
      });
    } else {
      if (Singleton.getInstance().getVirtualTour() !== 'virtual_tour') {
        this.generateLocksAccesses();
      } else {
        this.deleteTourStops();
        console.log();
      }
    }
  };

  generateLocksAccesses = () => {
    this.setState({ isGifLoading: true });
    console.log('generateLocksAccesses token:', Singleton.getInstance().getToken());
    generateLocksAccessesFromServer()
      .then((response) => {
        console.log('generateLocksAccesses status:', response.status);
        return response.json();
      })
      .then((responseJson) => {
        console.log('generateLocksAccesses response:', JSON.stringify(responseJson).substring(0, 300));
        if (
          typeof (responseJson.status !== 'undefined') ||
          responseJson.status !== null
        ) {
          if (responseJson.code == 200) {
            this.checkLockStatusTimer = setInterval(
              this.checkLockStatusTimerTick,
              4000,
            );
          }
        } else {
          this.showServerError();
        }
      })
      .catch(() => {
        this.showServerError();
      });
  };

  checkLockStatusTimerTick = () => {
    if (!this.lockAccessCallInProgress) {
      this.lockAccessCallInProgress = true;
      this.checkLockStatus();
    }
  };

  checkLockStatus() {
    getRemortAlocationStatus()
      .then((response) => response.json())
      .then(async (responseJson) => {
        this.lockAccessCallInProgress = false;
        if (typeof responseJson.completed !== 'undefined') {
          if (responseJson.success) {
            this.deleteTourStops();
            clearInterval(this.checkLockStatusTimer);
          }
        } else {
          clearInterval(this.checkLockStatusTimer);
          // this.setState({ isGifLoading: false });
          this.showServerError();
        }
      })
      .catch(() => {
        //console.log((error))
        clearInterval(this.checkLockStatusTimer);
        // this.setState({ isGifLoading: false });
        this.showServerError();
      });
  }
  moveToTourMapScreen = (name, params) => {
    // const resetAction = StackActions.reset({
    //   index: 0,
    //   actions: [NavigationActions.navigate({ routeName: name, params: params })],
    // });
    // this.props.navigation.dispatch(resetAction)
    this.props.navigation.navigate(name, params);
    this.setState({ isGifLoading: false });
  };

  deleteTourStops = () => {
    this.setState({ isGifLoading: true });
    // console.log("response 5")
    deleteTourStop(
      this.deletedStopsID,
      Singleton.getInstance().getLocksThreadRef(),
    )
      .then((response) => response.json())
      .then(async (responseJson) => {
        console.log('response 6', responseJson);
        // debugger
        if (typeof responseJson.tours !== 'undefined') {
          if (responseJson.tours.length !== 0) {
            var activeTourTemp = responseJson.tours[0];
            try {
              const downloaded = await downloadFiles(activeTourTemp);
              if (downloaded) activeTourTemp = downloaded;
            } catch (dlErr) {
              console.log('downloadFiles error (non-fatal):', dlErr);
            }
            Singleton.getInstance().setTourKey(activeTourTemp.tour_key);
            Singleton.getInstance().setTourId(activeTourTemp.id);
            Singleton.getInstance().setTourSetting(activeTourTemp.tour_setting);
            this.props.setChatButtonStatus(
              activeTourTemp.tour_setting.chat_control,
            );
            Singleton.getInstance().setLastMessageId(
              activeTourTemp.tour_setting.last_message_id,
            );

            Singleton.getInstance().setZervCredentials(
              activeTourTemp.tour_setting.pynwheel_access_username,
              activeTourTemp.tour_setting.pynwheel_access_password,
            );
            this.activeTourData = activeTourTemp;
            this.startUserTracking();
          }
        } else {
          this.showServerError('deleteTourStops-else');
        }
      })
      .catch((err) => {
        console.log('deleteTourStops catch error:', err);
        this.showServerError('deleteTourStops-catch');
      });
  };

  startUserTracking() {
    ActivityTrackerManager.getInstance().setClear();
    ActivityTrackerManager.getInstance().setArrivedTime();
    trackTourUserActivity()
      .then((response) => response.json())
      .then((responseJson) => {
        if (typeof responseJson.data !== 'undefined') {
          console.log(
            'Singleton.getInstance().getTourSetting()',
            Singleton.getInstance().getTourSetting(),
          );
          ActivityTrackerManager.getInstance().setID(responseJson.data.id);
          // debugger
          if (responseJson.data.id_mismatch === true) {
            this.props.navigation.navigate('IdVerificationError');
            this.setState({ isGifLoading: false });
          } else if (
            Singleton.getInstance().getTourSetting().authenticate_zerv
          ) {
            // else if (false) {
            this.authenticateZerv();
          } else {
            this.checkGPSEnabled(() => {
              this.moveFowrwed();
            });
          }
          // this.setState({ isGifLoading: false });
        } else {
          this.showServerError();
        }
      })
      .catch(() => {
        // this.setState({ isGifLoading: false });
        this.showServerError();
      });
  }

  authenticateZerv = () => {
    this.setState({ isLoading: true });
    const phone = Singleton.getInstance().getTourUserData()?.phone_number;
    const zervUser = this.activeTourData.tour_setting.pynwheel_access_username;
    const password = this.activeTourData.tour_setting.pynwheel_access_password;
    const data = {
      phone,
      zervUser,
      password,
    };
    authenticateZerv(
      () => {
        setTimeout(() => {
          this.moveFowrwed();
        }, 200);
      },
      (error) => {
        this.setState({ isLoading: false, isGifLoading: false });
        alert(error);
      },
      data,
    );

    // setTimeout(() => {
    //   this.setState({ isLoading: true })
    //   const phone = Singleton.getInstance().getTourUserData()?.phone_number
    //   const zervUser = this.activeTourData.tour_setting.pynwheel_access_username
    //   const password = this.activeTourData.tour_setting.pynwheel_access_password
    //   const data = {
    //     phone, zervUser, password
    //   }
    //   // this.moveToTourMapScreen("ZervOTPScreen", { tourData: this.activeTourData, phone }) zerv screens are not in use may be we can remove
    //   authenticateZerv((res) => {
    //     // success
    //     this.checkGPSEnabled(() => {
    //       this.moveFowrwed()
    //     })
    //   }, (error) => {
    //     // failure
    //     this.setState({isLoading:false})
    //     alert(error)
    //   }, data)
    // }, 500);
  };

  checkGPSEnabled = (successCallback) => {
    if (Platform.OS !== 'android') {
      successCallback();
      return;
    }

    const tourSettings = this.activeTourData?.tour_setting;
    if (
      tourSettings?.is_igloohome_lock_present ||
      tourSettings?.is_latch_lock_present ||
      tourSettings?.authenticate_zerv
    ) {
      isGPSEnabled().then((success) => {
        console.log('GPS enabled', success);
        if (success) {
          successCallback();
        } else {
          this.setState({ isLoading: false, isGifLoading: false });
          setTimeout(() => {
            Alert.alert('Location!', 'Turn your location on for locks', [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Click here to move to settings',
                onPress: () => openGPSSettings(),
              },
            ]);
          }, 1000);
        }
      });
    } else {
      successCallback();
    }
  };

  moveFowrwed = () => {
    this.setState({ isLoading: false });
    this.deletedStopsID = null;
    // console.log("usman", JSON.stringify(this.activeTourData))
    if (
      Singleton.getInstance().getTourSetting().tour_start_point_lock_type !== ''
    ) {
      setTimeout(() => {
        if (
          Singleton.getInstance().getTourSetting()
            .tour_start_point_lock_type === 'Igloohome' ||
          Singleton.getInstance().getTourSetting()
            .tour_start_point_lock_type === 'Latch' ||
          Singleton.getInstance().getTourSetting()
            .tour_start_point_lock_type === 'Dwelo' ||
          Singleton.getInstance().getTourSetting()
            .tour_start_point_lock_type === 'EdgeState' ||
          Singleton.getInstance().getTourSetting()
            .tour_start_point_lock_type === 'Manual' ||
          Singleton.getInstance().getTourSetting()
            .tour_start_point_lock_type === 'Zerv'
        ) {
          this.moveToTourMapScreen('StartPointLockCode', {
            tourData: this.activeTourData,
          });
        } else {
          this.setState({ isGifLoading: false });
        }
      }, 500);
    } else if (Singleton.getInstance().getTourSetting().show_map) {
      setTimeout(() => {
        this.moveToTourMapScreen('TourMap', { tourData: this.activeTourData });
      }, 500);
    } else {
      this.props.navigation.navigate('TourContainer', {
        tourData: this.activeTourData,
      });
      this.setState({ isGifLoading: false });
    }
  };

  addUnitsPressed = () => {
    this.resetFilterValue();
    //this.moveToTourMapScreen("FloorPlatList", { tourData: this.activeTourData })
    this.props.navigation.navigate('FloorPlatList', {
      tourData: this.activeTourData,
      callTourReviewScreen: this.addUnitsPressed1.bind(this),
    });
  };

  resetFilterValue() {
    const newArr = Singleton.getInstance()
      .getBedroomFilter()
      .map((obj) => {
        if (obj.id === 0) {
          return { ...obj, is_selected: true };
        }
        return { ...obj, is_selected: false };
      });

    //const result =  Singleton.getInstance().getBedroomFilter().map((obj, i) => ({ ...obj, is_selected: false }));
    Singleton.getInstance().setBedroomFilter(newArr);
  }

  addUnitsPressed1 = () => {
    this.CustomizeTour();
  };

  addAmenitiesPressed = () => {
    this.props.navigation.navigate('ChoseTourAmenities', {
      tourData: this.activeTourData,
      callTourReviewScreen: this.addUnitsPressed1.bind(this),
    });
  };

  showServerError = (source = 'unknown') => {
    console.log('showServerError called from:', source, new Error().stack);
    this.setState({ isLoading: false });
    this.setState({ isGifLoading: false });
    this.setState({ message: ' Server Error.' });
    setTimeout(() => {
      alert('Server Error, Please try again. (from: ' + source + ')');
    }, 500);
  };

  render() {
    const { navigation } = this.props;
    const logo = Singleton.getInstance().getPropertyLogo();
    console.log('this.state.activeTour', this.state.activeTour === null);
    console.log(
      'this.state.allowToursCustomization',
      this.state.allowToursCustomization,
    );
    console.log('this.state.unitsAvailable', this.state.unitsAvailable);
    console.log('this.state.amenitiesAvailable', this.state.amenitiesAvailable);
    console.log('this.props.mode ', this.props.mode);
    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
        <ImageBackground
          source={R.images.backgroundImage}
          style={styles.backgroundImage}
          imageStyle={{
            resizeMode: 'stretch',
          }}>
          <Spinner
            visible={this.state.isGifLoading}
            //textStyle={{ color: '#FFF' }}
            animation="fade"
            children={
              <ImageBackground
                source={R.images.backgroundImage}
                style={styles.backgroundImage}
                imageStyle={{
                  resizeMode: 'stretch',
                }}>
                <Image
                  source={R.images.gifCreateTour}
                  style={styles.gifLoader}
                  defaultSource={R.images.gifCreateTour}
                />
                {Config.ENV === 'lincoln' ? (
                  <Text style={styles.loderText}>CREATING TOUR...</Text>
                ) : null}
              </ImageBackground>
            }
          />
          {/* <Spinner visible={this.state.isLoading} textStyle={styles.spinnerTextStyle} /> */}
          <LoadingIndicator visible={this.state.isLoading} />
          <SafeAreaView style={styles.logoContainer}>
            <CommunityInfo
              info={{ ...this.state.activeTour, tour_stops: null }}
              navigation={this.props.navigation}
              onBackPress={() => {
                (!this.state.skipTourEditing && this.state.skipTourEditingUnitNotAvailable) && this.props.mode === 'REVIEW'
                  ? this.props.navigation.navigate('CreateTour')
                  : this.props.navigation.goBack();
              }}
            />
          </SafeAreaView>
          <View style={styles.messageContainer}>
            {!this.state.isLoading ? (
              <>
                {/* <View style={styles.divider} /> */}
                <Animated.Text
                  onLayout={() => this.showText()}
                  style={[styles.titleText, { opacity: this.state.textOpacity }]}>
                  {this.props.mode === 'CREATE'
                    ? 'CREATE '
                    : this.props.mode === 'EDIT'
                      ? 'EDIT '
                      : ''}
                  YOUR TOUR
                </Animated.Text>
                <Animated.Text
                  onLayout={() => this.showText()}
                  style={[styles.infoText, { opacity: this.state.textOpacity }]}>
                  {/* Following are the {this.state?.tourStopsData?.length} stops you will visit during your tour. Tap the delete icon to remove stops. */}
                  {this.props.mode === 'CREATE'
                    ? this.state?.tourStopsData?.length
                      ? `There are ${this.state?.tourStopsData?.length} stops on your tour.\nTap the delete icon to remove stops.\nAdd available units using the button below.`
                      : `There are no stops on your tour.`
                    : this.props.mode === 'REVIEW' ? (this.state.showAddUnitsButton || this.state.amenitiesAvailable) ? `Want to make changes? Touch edit tour.\nNot ready? Close the app, your tour is saved.\n Ready? Let's go!` : `Tap the Delete Icon to Remove Stops\nNot Ready? We’ll save your preferences when you close the app\n Ready? Let’s go!`

                      : this.props.mode === 'EDIT'
                        ? `There are ${this.state?.tourStopsData?.length} stops on your tour.\nTap the delete icon to remove stops.\nAdd more stops using the button(s) below.`
                        : this.props.mode === 'NON_CUSTOM_REVIEW'
                          ? this.state?.tourStopsData?.length
                            ? `There are ${this.state?.tourStopsData?.length} stops on your tour.\nTap the delete icon to remove stops.\nReady? Let's go!`
                            : `There are ${this.state?.tourStopsData?.length} stops on your tour.`
                          : ''}
                </Animated.Text>
                <View style={styles.divider} />
              </>
            ) : null}
          </View>
          <View style={styles.tourStopsListContainer}>
            <FlatList
              data={this.state.tourStopsData}
              keyExtractor={(item, index) => index + ''}
              renderItem={({ item }) => {
                return (
                  <UnitInformation
                    navigation={this.props.navigation}
                    onDelete={() => this.deleteItemById(item)}
                    info={item}
                    currency_symbol={this.state.activeTour?.currency_symbol}
                  />
                );
              }}></FlatList>
            {/* {this.state.activeTour === null ? null : <GoButton goPressed={() => this.pressOk()} />} */}
            <Text>{this.state.activeTour === null}</Text>
            {/* {this.state.activeTour === null ? null : (this.state.allowToursCustomization ? */}
            <View style={styles.bottomUnitButtonsView}>
              {this.props.mode === 'CREATE' && (
                <View style={{ alignItems: 'center' }}>
                  {this.state.unitsAvailable && (
                    <TouchableOpacity
                      style={styles.actionBtnContainer}
                      onPress={() => this.addUnitsPressed()}>
                      <Image
                        source={R.images.floorPlan}
                        style={[styles.actionBtnIcon, { tintColor: '#FFA500' }]}
                      />
                      <Text style={styles.actionBtnText}>
                        ADD AVAILABLE UNITS
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.proceedBtnContainer}
                    onPress={() => this.props.navigation.navigate('YourTour')}>
                    <Text style={styles.proceedBtnText}>
                      PROCEED WITHOUT ADDING {'\n'}AVAILABLE UNITS
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {this.props.mode === 'EDIT' && (
                <View style={{ alignItems: 'center' }}>
                  {this.state.amenitiesAvailable && (
                    <TouchableOpacity
                      style={[
                        styles.actionBtnContainer,
                        { marginBottom: hp('1') },
                      ]}
                      onPress={() => this.addAmenitiesPressed()}>
                      <Image
                        source={R.images.star_yellow}
                        style={styles.actionBtnIcon}
                      />
                      <Text style={[styles.actionBtnText]}>ADD AMENITIES</Text>
                    </TouchableOpacity>
                  )}
                  {this.state.unitsAvailable && (
                    <TouchableOpacity
                      style={[
                        styles.actionBtnContainer,
                        { marginBottom: hp('1') },
                      ]}
                      onPress={() => this.addUnitsPressed()}>
                      <Image
                        source={R.images.floorPlan}
                        style={[styles.actionBtnIcon, { tintColor: '#FFA500' }]}
                      />
                      <Text style={[styles.actionBtnText]}>
                        ADD AVAILABLE UNITS
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionBtnContainer}
                    onPress={() => this.props.navigation.navigate('YourTour')}>
                    <Image
                      source={R.images.seeTourIcon}
                      style={styles.actionBtnIcon}
                    />
                    <Text style={[styles.actionBtnText]}>
                      I'M DONE EDITING!
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {this.props.mode === 'REVIEW' && (
                <View style={(this.state.showAddUnitsButton || this.state.amenitiesAvailable) && (styles.reviewBtnsContainer)}>
                  {(this.state.showAddUnitsButton || this.state.amenitiesAvailable) && (
                    <TouchableOpacity
                      style={[styles.actionBtnContainer, { width: wp('46.5') }]}
                      onPress={() => this.props.navigation.navigate('EditTour')}>
                      <Image
                        source={R.images.edit}
                        style={[styles.actionBtnIcon, { tintColor: '#89C765' }]}
                      />
                      <Text style={styles.actionBtnText}>EDIT TOUR</Text>
                    </TouchableOpacity>)}
                  <TouchableOpacity
                    style={[styles.actionBtnContainer, (this.state.showAddUnitsButton || this.state.amenitiesAvailable) ? ({ width: wp('46.5') }) : { alignSelf: 'center', justifyContent: 'center' },]}
                    onPress={() => this.pressOk()}>
                    <Image
                      source={R.images.starTour}
                      style={styles.actionBtnIcon}
                    />
                    <Text style={styles.actionBtnText}>LET'S GO!</Text>
                  </TouchableOpacity>
                </View>
              )}
              {this.props.mode === 'NON_CUSTOM_REVIEW' &&
                this.state?.tourStopsData?.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtnContainer,
                      { alignSelf: 'center', justifyContent: 'center' },
                    ]}
                    onPress={() => this.pressOk()}>
                    <Image
                      source={R.images.starTour}
                      style={[styles.actionBtnIcon]}
                    />
                    <Text style={[styles.actionBtnText]}>LET'S GO!</Text>
                  </TouchableOpacity>
                )}
            </View>
            {/* <View style={{ backgroundColor: "black", alignItems: "center", justifyContent: "center", paddingHorizontal: wp('2.7%') }}>
                  <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), flexDirection: 'row', }} onPress={() => this.pressOk()}>
                    <Image source={R.images.starTour} style={{ width: wp("10%"), height: hp("6%"), resizeMode: "contain" }} />
                    <Text style={{ color: "white", textAlign: "center", fontSize: wp('3.7%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), marginLeft: wp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>START TOUR</Text>
                  </TouchableOpacity>
                </View> */}
            <>
              {/* // <View style={{ height: hp('11%'), marginBottom: hp('2%'), width: wp('100%'), justifyContent: 'space-around', alignItems: 'center', flexDirection: 'column' }}>
              //   <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: wp('90%') }}>
              //     {this.state.amenitiesAvailable ? <TouchableOpacity onPress={() => this.addAmenitiesPressed()} style={{ justifyContent: 'center', alignItems: 'center', height: hp('5%'), flex: 1, backgroundColor: 'black' }}>
              //       <Text style={styles.loginText1}>ADD AMENITIES</Text>
              //     </TouchableOpacity> : null}
              //     {this.state.unitsAvailable ? <TouchableOpacity onPress={() => this.addUnitsPressed()} style={{ marginLeft: wp('.5%'), justifyContent: 'center', alignItems: 'center', height: hp('5%'), flex: 1, backgroundColor: 'black' }}>
              //       <Text style={styles.loginText1}>ADD UNITS</Text>
              //     </TouchableOpacity> : null}
              //   </View>
              //   <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: wp('90%') }}>
              //     <TouchableOpacity onPress={() => this.pressOk()} style={{ justifyContent: 'center', alignItems: 'center', height: hp('5%'), flex: 1, backgroundColor: 'black', flexDirection: "row" }}>
              //       <Image source={R.images.starTour} resizeMode='contain' style={{ width: 25, height: 25, marginRight: 10 }} />
              //       <Text style={styles.loginText1}>START TOUR</Text>
              //     </TouchableOpacity>
              //     {this.state?.activeTour?.schedule_enabled &&
              //       <TouchableOpacity onPress={() => {
              //         console.log(this.state.activeTour?.community_schedule_tour)
              //         this.props.navigation.navigate("WebView", { applyUnitURL: this.state.activeTour?.community_schedule_tour, title: "Schedule Tour" })
              //       }} style={{ marginLeft: wp('.5%'), justifyContent: 'center', alignItems: 'center', height: hp('5%'), flex: 1, backgroundColor: 'black', flexDirection: 'row' }}>
              //         <Image source={R.images.schedule} resizeMode='contain' style={{ width: 25, height: 25, marginRight: 10 }} />
              //         <Text style={styles.loginText1}>SCHEDULE TOUR</Text>
              //       </TouchableOpacity>
              //     }
              //   </View>
              // </View>
              // : <GoButton goPressed={() => this.pressOk()} />)} */}
            </>
          </View>
          <CopyRight />
        </ImageBackground>
      </View>
    );
  }
}

export default connect(mapStateToPropsps, mapDispatchToProps)(index);
function mapStateToPropsps(state) {
  return {
    //showChatButton1: state.chatReducer && state.chatReducer.showChatButton
  };
}

function mapDispatchToProps(dispatch) {
  return {
    //setUnreadMegCount: payload => dispatch(setUnreadMessageCount(payload)),
    setChatButtonStatus: (payload) => dispatch(setShowChatButton(payload)),
  };
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: null,
    height: null,
  },
  logoContainer: {
    marginBottom: wp('2'),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: wp('55%'),
    height: wp('55%'),
    position: 'absolute',
    resizeMode: 'contain',
    bottom: hp('.5%'),
  },
  gifLoader: {
    width: Config.ENV === 'lincoln' ? wp('70%') : wp('100%'),
    height: Config.ENV === 'lincoln' ? hp('30%') : hp('100%'),
    marginBottom: Config.ENV === 'lincoln' ? hp('3%') : 0,
    resizeMode: 'contain',
    bottom: hp('.5%'),
  },
  messageContainer: {
    width: '100%',
    flex: 0.15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontFamily: 'Gotham-Medium',
    fontSize: wp('5'),
    color: '#FFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: wp('4'),
    color: 'white',
    marginLeft: wp('3%'),
    marginRight: wp('3%'),
    lineHeight: wp('4.5'),
    marginBottom: 6,
    textAlign: 'center',
    justifyContent: 'center',
    fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
  },
  tourStopsListContainer: { width: '100%', flex: 0.82 },
  bottomUnitButtonsView: { marginBottom: hp('2%'), paddingHorizontal: wp('2') },
  loginText: {
    fontSize: hp('1.7`%'),
    color: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText1: {
    fontSize: hp('1.7`%'),
    color: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loderText: {
    fontSize: hp('3%'),
    color: 'white',
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
  },
  actionBtnContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    alignItems: 'center',
    height: hp('8'),
    width: wp('90'),
    backgroundColor: 'black',
  },
  actionBtnIcon: {
    width: wp('6%'),
    height: hp('6%'),
    resizeMode: 'contain',
    marginRight: wp(3),
  },
  actionBtnText: {
    color: 'white',
    fontSize: hp('2.3%'),
    fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
  },
  editStopsBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: hp('10%'),
    width: wp('21%'),
  },
  addAmenitiesBtnIcon: {
    width: wp('7%'),
    height: hp('7%'),
    resizeMode: 'contain',
  },
  addAmenitiesBtnText: {
    color: 'white',
    lineHeight: wp('3.5%'),
    marginTop: hp('-1%'),
    textAlign: 'center',
    fontSize: wp('2.7%'),
    fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
  },
  btnContainer: { backgroundColor: 'black' },
  proceedBtnText: {
    color: '#FFA500',
    fontSize: hp('2.3%'),
    fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 2,
    textAlign: 'center',
    lineHeight: hp(2.5),
  },
  proceedBtnContainer: {
    marginTop: hp(1),
    alignSelf: 'center',
    height: hp('8'),
    justifyContent: 'center',
  },
  reviewBtnsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
});
