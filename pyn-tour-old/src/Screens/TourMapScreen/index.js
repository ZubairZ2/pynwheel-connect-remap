import React, { Component } from 'react';
import {
  Animated,
  AppState,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import ImageView from 'react-native-image-progress';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import Svg, { G, Polyline } from 'react-native-svg';
import SvgPanZoom from 'react-native-svg-pan-zoom';
import { connect } from 'react-redux';
import LoadingIndicator from '../../Components/LoadingIndicator';
import ChatButton from '../../Library/Components/ChatButton';
import CopyRight from '../../Library/Components/Copyright';
import GoButton from '../../Library/Components/GoButton';
import Header from '../../Library/Components/Header';
import { Igloo } from '../../Library/IglooManager';
import {
  abandonedTour,
  serverPing,
  trackTourUserActivity,
} from '../../Library/Managers/APICalls';
import ActivityTrackerManager from '../../Library/Managers/ActivityTrackerManager';
import Singleton from '../../Singleton';
import { calcAngTowLines } from '../../Utils/Helpers';
import R from '../../assest/R';
import {
  setShowChatButton,
  setUnreadMessageCount,
} from '../../redux/actions/chatActions';
import { getLatchAccessToken } from '../LatchScreens/LatchTokenStorage';
import { authenticateZerv } from '../TourReview/ZERV';
import {
  calculateDistance,
  calculateX,
  calculateXForStop,
  calculateY,
  calculateYForStop,
  connectLineWithStop,
  swapFloorPlatesforElevetor,
} from './TourmapScreenHelper';
import { RotateButtons } from './components/RotateButtons';
import { styles } from './styles';
const igloo = new Igloo();

const DIRECTIONAL_TEXT_LINES = 3;

class TourMapScreen extends Component {
  state = {
    mapImage: '',
    path: '',
    imageContanierHeight: 300,
    imageContanierWidth: 1,
    isLoading: false,
    isEnd: false,
    showPoints: false,
    appState: AppState.currentState,
    dashOffset: 0,
    dashArray: 0,
    distError: 0,
    showNextStop: false,
    ImageScale: 1,
    userLoacationX: 0,
    userLoacationY: 0,
    nextStopX: 0,
    nextStopY: 0,
    unReadMessageCount: 0,
    willShowChatButton: Singleton.getInstance().getTourSetting().chat_control,
    showMoreButton: false,
    currentLongitude: 'unknown', //Initial Longitude
    currentLatitude: 'unknown', //Initial Latitude
    showUnlockNotWorkingButton: false,
    isSvgLoaded: false,
    youAreHereOpacity: new Animated.Value(0),
    truncatedText: '',
    renderTourTitle: false,
    descriptionOpacity: new Animated.Value(0),
    directionalText: '',
  };

  constructor() {
    super();
    this.ImageZoom = null; //probably unused
    this.polyLine = null;
    this.ImageViewLocal = null;
    this.pathData = [];
    this.markerHeight = 13;
    this.markerWidth = 13;
    this.ZoomMarkerHeight = 13;
    this.ZoomMarkerWidth = 13;
    this.strokeWidth = 3;
    this.serverUpdateTime = 8000; //60000 one mint
    this.selectedStopID = 0;
    this.selectedStopLaLog = [];
    this.visitedStopLatLog = [];
    this.lineAnimationTimer = null;
    this.lineDashAnimationTimer = null;
    this.isLineAnimationRuning = false;
    this.diableNextButton = false;
    this.isImageLoading = false;
    this.userLocationIndex = -1;
    this.nextStopIndex = 0;
    this.currentStop = null;
    this.nextStop = null;
    this.imageWidth = wp(100);
    this.imageHeight = hp(62);
    this.tourData = [];
    this.tourStops = [];
    this.latchListLocks = [];
    this.latchListLocksToken = '';
    this.userLoacationBaseX = 0;
    this.userLoacationBaseY = 0;
    this.nextStopBaseX = 0;
    this.nextStopBaseY = 0;
    this.visitedStops = '';
    this.visitedPagesCounter = 0;
    this.showIDMisMatch = true;
    this.serverPingInProgress = false;
    this.zoomView = null;
    this.helloMoto = 'ni chalda';
    this.lastResizeMarker = null;
    this.isTourEnded = false;
    this.rotationAngle = 0;
    this.hasUserLocationShown = false;
    this.componentMounted = false;
    this.nextButtonPosition = new Animated.Value(-wp(32));
    this.unlockButtonPosition = new Animated.Value(-wp(32));
  }

  //////////////////Default/////////////////////
  componentDidMount() {
    const { navigation } = this.props;
    const tourData = navigation.getParam('tourData', '');
    if (typeof (tourData !== 'undefined')) {
      connectLineWithStop(tourData);
      if (!tourData.is_sitemap) {
        swapFloorPlatesforElevetor(tourData);
      }
      this.setTourData(tourData);
    }
    this.setTourUserActivityTimer();
    this.showIDMisMatch = true;
    AppState.addEventListener('change', this._handleAppStateChange);
    this.focusListener = navigation.addListener('didFocus', () => {
      this.ViewDidFcous();
      if (this.componentMounted) {
        this.updateInfoAndAction();
      }
    });
    this.dottedLineColor =
      Singleton.getInstance().getTourSetting().dotted_line_color;
    if (Singleton.getInstance().getTourSetting().is_igloohome_lock_present) {
      this.initIgloo();
    }
    if (Singleton.getInstance().getTourSetting().authenticate_zerv) {
      // console.log("AUTHENTICATE_ZERV");
      const data = {
        phone: Singleton.getInstance().getTourUserData()?.phone_number,
        zervUser:
          Singleton.getInstance().getTourSetting().pynwheel_access_username,
        password:
          Singleton.getInstance().getTourSetting().pynwheel_access_password,
      };
      authenticateZerv(
        (authenticateZerv) => {
          // console.log("authenticateZerv", { authenticateZerv })
        },
        (authenticateZervError) => {
          console.log('authenticateZervError', { authenticateZervError });
        },
        data,
      );
    }
    console.log(
      'is_latch_lock_present :: ' +
      Singleton.getInstance().getTourSetting().is_latch_lock_present,
    );
    if (Singleton.getInstance().getTourSetting().is_latch_lock_present) {
      if (!Singleton.getInstance().getTourSetting().latch_access_token) {
        this.props.navigation.navigate('LatchOTPScreen', {
          callback: () => {
            this.animateYouAreHereView();
          },
        });
      }

      // const gettingToken = async () => {
      //   const token = await getLatchAccessToken();
      //   console.log('TOKEN1', token);
      //   if (!token) {
      //     this.props.navigation.navigate('LatchOTPScreen', {
      //       callback: () => {
      //         this.animateYouAreHereView();
      //       },
      //     });
      //   }
      //   this.latchListLocksToken = token;
      // };
      // gettingToken();
    }
    this.componentMounted = true;
  }

  updateInfoAndAction = (onBack) => {
    this.updateDirectionalText(onBack);
    this.showTourTitle();
    this.showActionButton(onBack);
  };

  resetInfoAndAction = () => {
    this.setState({
      showMoreButton: false,
      truncatedText: '',
      descriptionOpacity: new Animated.Value(0),
      renderTourTitle: false,
      directionalText: '',
    });
    this.nextButtonPosition = new Animated.Value(-wp(32));
    this.unlockButtonPosition = new Animated.Value(-wp(32));
  };

  animateYouAreHereView() {
    // Start the fade-in animation
    Animated.timing(this.state.youAreHereOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Schedule the fade-out animation after 4 seconds
    setTimeout(() => {
      Animated.timing(this.state.youAreHereOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 4000);
    this.hasUserLocationShown = true;
  }

  initIgloo() {
    igloo.initialize().then((initialize) => {
      // console.log({ initialize })
    });
  }

  componentWillUnmount() {
    //this.stopServerPingTimer()
    //AppState.removeEventListener('change', this._handleAppStateChange);
    clearInterval(this.lineDashAnimationTimer);
  }

  stopServerPingTimer() {
    Geolocation.clearWatch(this.helloMoto);
    clearInterval(this.serverPingTimer);
  }

  setTourData = (tourData) => {
    this.tourData = tourData;
    this.tourStops = tourData.tour_stop;
    this.updateIndex();
    this.setState({
      mapImage: tourData.is_sitemap
        ? tourData.image
        : this.nextStop.floorplate_image,
      isLoading: false,
    });
    this.updateTitleText();
    this.updateStopForActivityTreacker();
    //this.calculateImageSize(tourData.is_sitemap ? tourData.image : this.nextStop.floorplate_image);
    if (tourData.is_sitemap)
      this.calculateImageSize(
        tourData.image,
        tourData.image_width,
        tourData.image_height,
      );
    else
      this.calculateImageSize(
        this.nextStop.floorplate_image,
        this.nextStop.image_width,
        this.nextStop.image_height,
      );
    this.updateInfoAndAction();
  };

  showActionButton = (onBack) => {
    const stop = onBack ? this.currentStop : this.nextStop;
    if (
      (stop.unit_dwelo_lock_id !== '' ||
        stop.stop_lock_provider === 'Igloohome' ||
        stop.stop_lock_provider === 'Zerv' ||
        stop.stop_lock_provider === 'Latch' ||
        stop.stop_lock_provider === 'Dwelo') &&
      !stop.bypass_stop_lock
    ) {
      this.animateUnlockButton();
    } else {
      this.animateNextButton();
    }
  };

  animateNextButton = () => {
    Animated.timing(this.nextButtonPosition, {
      toValue: 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  animateUnlockButton = () => {
    Animated.timing(this.unlockButtonPosition, {
      toValue: 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  //will be called on every time when screen will appear
  ViewDidFcous() {
    // console.log("this?.nextStop?.type", this?.nextStop?.type, Singleton.getInstance().getShouldUserMoveToNextStop())
    if (Singleton.getInstance().getShouldUserMoveToNextStop()) {
      // move to next stop
      this.updateViewForNextStop();
      Singleton.getInstance().setShouldUserMoveToNextStop(false);
    }
    if (!this.isLineAnimationRuning && !this.isImageLoading) {
      this.startLineAimation();
    }
  }

  //move to next stop on elevoter and amenity
  updateViewForNextStop = () => {
    this.resetPathData();
    this.updateIndex();
    if (this.userLocationIndex + 1 === this.tourStops.length) {
      console.log('updateViewForNextStop navigation hit ');
      this.updateViewForPreviousStop();
      this.endTour();
    } else {
      this.updateTitleText();
      this.calculatePath();
      this.drawPoints();
      this.updateStopForActivityTreacker();
      // this.showLoclButton();
      // this.showActionButton();
      this.autoZoom();
    }
    if (!this.tourData.is_sitemap && this.currentStop.type === 'elevator') {
      //this.calculateImageSize(this.nextStop.floorplate_image)
      this.calculateImageSize(
        this.nextStop.floorplate_image,
        this.nextStop.image_width,
        this.nextStop.image_height,
      );
      this.setState({ mapImage: this.nextStop.floorplate_image });
    }
  };

  goBackFromFirstStop() {
    clearInterval(this.serverPingTimer);
    abandonedTour()
      .then((response) => response.json())
      .then((responseJson) => { })
      .catch((error) => { });

    if (this.props.navigation.goBack()) {
      this.props.navigation.replace('WelcomeTour');
    } else {
      this.props.navigation.goBack();
    }
  }

  showDirectionalText() {
    Animated.timing(this.state.descriptionOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }

  onBackPress = () => {
    this.resetMapAnimation();
    this.resetInfoAndAction();
    ///********* * If Next stop is start point*******
    if (this.userLocationIndex - 1 < 0) {
      // if current index is less than 0 mean can't move back
      this.goBackFromFirstStop();
    } else {
      if (this.currentStop.type === 'starting_point') {
        // Singleton.getInstance().setShouldUserMoveToNextStop(true)
        this.ViewDidFcous();
        this.updateInfoAndAction(true);
      } ///********* * If Next Stop is Amenity or elevator *******
      else if (this.currentStop.type === 'amenity') {
        //this.ChangeThisTitle(this.tourStops[this.nextStopIndex].navigation_title)
        this.props.navigation.navigate('TourStop', {
          stopData: this.currentStop,
          isFromUnit: false,
          formPropertyMap: true,
        });
      } ////******** * If next stop is unit ********
      else if (this.currentStop.type === 'unit') {
        this.props.navigation.navigate('UnitFloorPlan', {
          unitData: this.currentStop,
        });
      } else if (this.currentStop.type === 'elevator') {
        this.ViewDidFcous();
        this.updateInfoAndAction(true);
      }
      this.updateViewForPreviousStop();
      this.resetMapAnimation();
    }
  };

  // back button pressed move to previous stop
  updateViewForPreviousStop = () => {
    this.resetPathData();
    this.decIndex();
    this.updateTitleText();
    this.calculatePath();
    this.drawPoints();
    this.updateStopForActivityTreacker();
    // this.showLoclButton();
    // this.showActionButton();
    this.autoZoom();
    if (!this.tourData.is_sitemap && this.currentStop.type === 'elevator') {
      //  this.calculateImageSize(this.nextStop.floorplate_image)
      this.calculateImageSize(
        this.nextStop.floorplate_image,
        this.nextStop.image_width,
        this.nextStop.image_height,
      );
      this.setState({ mapImage: this.nextStop.floorplate_image });
    }
  };

  moveOrReplace = (navigation, route, params) => {
    if (navigation) {
      navigation.replace(route, params);
    } else {
      this.props.navigation.navigate(route, params);
    }
  };
  /////////////Move to stop detail screen/////////////////
  nextButtonPressed = (navigation) => {
    this.resetInfoAndAction();
    if (
      this.nextStop?.stop_lock_provider && //not null or undefined
      this.nextStop?.stop_lock_provider !== '' && //not empty
      !this.nextStop?.bypass_stop_lock
    ) {
      this.moveToLockInfoScreen();
      return;
    }
    this.resetMapAnimation();
    if (this.state.isEnd) {
      //////If tour has been ended :: seems like this code snipet depricated
      AppState.removeEventListener('change', this._handleAppStateChange);
      this.leftTourServerCall();
      Singleton.getInstance().setShouldUserMoveToNextStop(false);
      this.moveOrReplace(navigation, 'ThankProperty', {
        tourData: this.tourData,
        visitedStops: this.visitedStops,
        visitedStopLatlong: this.visitedStopLatLog,
      });
      // this.props.navigation.navigate("ThankProperty", { tourData: this.tourData, visitedStops: this.visitedStops, visitedStopLatlong: this.visitedStopLatLog })
    } ///********* * If Next stop is start point*******
    else if (this?.nextStop?.type === 'starting_point') {
      Singleton.getInstance().setShouldUserMoveToNextStop(true);
      this.ViewDidFcous();
      this.updateInfoAndAction();
    } ///********* * If Next Stop is Amenity or elevator *******
    else if (this?.nextStop?.type === 'amenity') {
      //this.ChangeThisTitle(this.tourStops[this.nextStopIndex].navigation_title)
      // console.log("navigation TourStop")
      this.moveOrReplace(navigation, 'TourStop', {
        stopData: this.nextStop,
        isFromUnit: false,
        formPropertyMap: true,
      });
      // this.props.navigation.navigate("TourStop", { stopData: this.nextStop, isFromUnit: false, formPropertyMap: true })
    } ////******** * If next stop is unit ********
    else if (this?.nextStop?.type === 'unit') {
      this.moveOrReplace(navigation, 'UnitFloorPlan', {
        unitData: this.nextStop,
      });
      // this.props.navigation.navigate("UnitFloorPlan", { unitData: this.nextStop })
    } else if (this?.nextStop?.type === 'elevator') {
      console.log("In elevator")
      Singleton.getInstance().setShouldUserMoveToNextStop(true);
      this.ViewDidFcous();
      this.updateInfoAndAction();
    }
    //}
    // this.resetMapAnimation()
  };

  ////////////////////Helper Mothods////////////////
  updateStopForActivityTreacker = () => {
    if (this.nextStop !== 'undefined') {
      if (this.nextStop.id !== 'undefined') {
        //this.selectedStopID = this.nextStop.id
        ActivityTrackerManager.getInstance().setAbandonedTourAtStop(
          this.nextStop.id,
        );
        this.visitedStops =
          this.visitedStops +
          ',' +
          this.nextStop.id +
          '|' +
          new Date().toString() +
          '|' +
          this.nextStop.type +
          '|' +
          this.nextStop.guest_pin;
        //this.visitedPagesCounter = this.visitedPagesCounter + 1
        Singleton.getInstance().setVisitedPagesCounterIncrement();
      }
    }
  };

  watchPosition1 = () => {
    this.helloMoto = Geolocation.watchPosition(
      (lastPosition) => {
        this.selectedStopLaLog.push({
          lat: lastPosition.coords.latitude,
          lng: lastPosition.coords.longitude,
        });
      },
      (error) => {
        console.log(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 2000,
        maximumAge: 0,
        distanceFilter: 0,
      },
    );
  };

  showTourTitle = () => {
    this.setState({ renderTourTitle: true });
  };

  updateTitleText = () => {
    if (this.nextStop !== 'undefined') {
      this.ChangeThisTitle(this.currentStop?.navigation_title);
      this.pathData = this.nextStop?.path_points;
      // this.setState({
      // showMoreButton: this.nextStop?.show_long_directional_text,
      // });
    }
  };

  updateDirectionalText = (onBack) => {
    const stop = onBack ? this.currentStop : this.nextStop;
    if (stop !== 'undefined') {
      this.setState({
        directionalText: stop.directional_text,
      });
    }
  };

  resetMapAnimation = () => {
    clearInterval(this.lineDashAnimationTimer);
    this.isLineAnimationRuning = false;
    this.resetMapZoomLevel();
  };
  resetPathData = () => {
    this.setState({
      showNextStop: false,
      path: '',
      // showUnlockButton: false,
      showUnlockNotWorkingButton: false,
    });
  };

  endTour = () => {
    this.leftTourServerCall();
    Singleton.getInstance().setShouldUserMoveToNextStop(false);
    AppState.removeEventListener('change', this._handleAppStateChange);
    this.props.navigation.navigate('ThankProperty', {
      tourData: this.tourData,
      visitedStops: this.visitedStops,
      visitedStopLatlong: this.visitedStopLatLog,
    });
  };

  autoZoom = () => {
    // if (!Singleton.getInstance().getTourSetting().enable_auto_zoom) { return }
    var yDis = this.currentStop?.y_plot - this.nextStop?.y_plot;
    var xDis = this.currentStop?.x_plot - this.nextStop?.x_plot;
    if (yDis < 0) {
      yDis *= -1;
    }
    if (xDis < 0) {
      xDis *= -1;
    }

    var zoomfac = this.imageWidth / xDis;
    if (xDis < yDis) {
      zoomfac = this.imageHeight / yDis;
    }
    zoomfac = zoomfac - 0.3;
    if (zoomfac > 6) {
      zoomfac = 6;
    }
    if (zoomfac > 1) {
      zoomfac = zoomfac - 0.3;
    }
    let left = (this.userLoacationBaseX + this.nextStopBaseX) / 2;
    let top = (this.userLoacationBaseY + this.nextStopBaseY) / 2;
    left = left + 13 + zoomfac;
    top = top + 13 + zoomfac;
    this.setState({ left, top });
    if (this?.zoomView && this?.zoomView?.zoomToPoint) {
      this.setState({
        userLoacationX: this.userLoacationBaseX + zoomfac,
        userLoacationY: this.userLoacationBaseY + zoomfac,
        nextStopX: this.nextStopBaseX + zoomfac,
        nextStopY: this.nextStopBaseY + zoomfac,
      });
      setTimeout(() => {
        let next_px = this.nextStopBaseX;
        let next_py = this.nextStopBaseY;
        let user_px = this.userLoacationBaseX;
        let user_py = this.userLoacationBaseY;
        let angle = 0;
        let a = { x: 1, y: 1 };
        let b = { x: 1, y: 1 };
        let c = { x: 1, y: 1 };
        if (user_py < next_py && user_px < next_px) {
          a = { x: user_px, y: user_py };
          b = { x: next_px, y: next_py };
          c = { x: 0, y: next_py };
          angle = -90 - calcAngTowLines(a, b, c);
        } else if (user_py > next_py && user_px < next_px) {
          a = { x: 0, y: next_py };
          b = { x: next_px, y: next_py };
          c = { x: user_px, y: user_py };
          angle = -90 + calcAngTowLines(a, b, c);
        } else if (user_py > next_py && user_px > next_px) {
          a = { x: next_px, y: next_py };
          b = { x: user_px, y: user_py };
          c = { x: 0, y: user_py };
          angle = 90 - calcAngTowLines(a, b, c);
        } else if (user_py < next_py && user_px > next_px) {
          a = { x: 0, y: user_py };
          b = { x: user_px, y: user_py };
          c = { x: next_px, y: next_py };
          angle = 90 + calcAngTowLines(a, b, c);
        }
        if (zoomfac > 2) {
          zoomfac = zoomfac - 0.3;
        }
        if (zoomfac < 1) {
          zoomfac = 1;
        }
        this.setRotationAngle(angle);
        this?.zoomView?.zoomToPoint(left, top, zoomfac, 700, angle);
      }, 600);
    }
  };

  setRotationAngle = (angle) => {
    let rotationAngle = 0;

    const absAngle = Math.abs(angle);
    if (absAngle > 45 && absAngle < 135) {
      rotationAngle = -90;
    } else if (absAngle >= 135 && absAngle < 225) {
      rotationAngle = 180;
    } else if (absAngle >= 225 && absAngle < 315) {
      rotationAngle = 90;
    }
    rotationAngle = angle < 0 ? rotationAngle * -1 : rotationAngle;
    this.rotationAngle = rotationAngle;
    if (!this.hasUserLocationShown) {
      this.animateYouAreHereView();
    }
  };

  updateIndex = () => {
    this.userLocationIndex = this.userLocationIndex + 1;
    this.currentStop = this.tourStops[this.userLocationIndex];
    this.nextStop = this.tourStops[this.userLocationIndex + 1];
  };
  // decreament index for previous screen
  decIndex = () => {
    this.userLocationIndex = this.userLocationIndex - 1;
    this.currentStop = this.tourStops[this.userLocationIndex];
    this.nextStop = this.tourStops[this.userLocationIndex + 1];
  };

  resetMapZoomLevel = () => {
    if (this.ImageZoom !== null) {
      this.ImageZoom.reset();
    }
  };

  //////////////////X, Y value mapper methods /////////////////////
  calculateXForStop = (x, isForNextStop) => {
    return calculateXForStop(
      x,
      this.imageWidth,
      isForNextStop,
      this.state.imageContanierWidth,
    );
  };

  calculateYForStop = (y, isForNextStop) => {
    return calculateYForStop(
      y,
      this.imageHeight,
      this.state.imageContanierHeight,
      isForNextStop,
    );
  };

  calculateX = (x) => {
    return calculateX(x, this.imageWidth);
  };

  calculateY = (y) => {
    return calculateY(y, this.imageHeight, this.state.imageContanierHeight);
  };

  ChangeThisTitle = (titleText) => {
    const { setParams } = this.props.navigation;
    setParams({ title: titleText });
  };

  calculateImageSize = async (image, width, height) => {
    if (Platform.OS === 'ios') {
      await Image.getSize(image);
      this.isImageLoading = true;
      this.setState({
        imageContanierHeight: height * (Dimensions.get('window').width / width),
        isLoading: false,
      });
      this.imageWidth = width;
      this.imageHeight = height;
      this.isImageLoading = false;
      this.calculatePath();
      this.drawPoints();
      this.autoZoom();
    } else {
      this.isImageLoading = true;
      Image.getSize(
        image,
        (width1, height1) => {
          this.setState({
            imageContanierHeight:
              height * (Dimensions.get('window').width / width),
            isLoading: false,
          });
          this.imageWidth = width;
          this.imageHeight = height;
          this.isImageLoading = false;
          this.calculatePath();
          this.drawPoints();
          this.autoZoom();
          if (!this.isLineAnimationRuning && !this.isImageLoading) {
            this.startLineAimation();
          }
        },
        (error) => {
          this.setState({ isLoading: false });
          console.warn('Could not get the image size:' + error.message);
        },
      );
    }
  };

  onLoad = () => {
    setIsSvgLoaded(true);
    // console.log("In SVG Loaded Function");
    if (!isSvgLoaded) {
      this.imageLoaded();
    }
  };
  imageLoaded = () => {
    this.setState({ showPoints: true });
    if (!this.isLineAnimationRuning) {
      this.isLineAnimationRuning = true;
      console.log("Image loading completed ")
      this.startLineAimation();
    }
  };

  /////////////**********Line and Path animation///////// */
  startLineAimation = () => {
    this.diableNextButton = true;
    this.isLineAnimationRuning = true;
    this.lineAnimationTimer = setInterval(this.pathAnimation, 0.5);
  };

  pathAnimation = () => {
    this.setState({ dashOffset: this.state.dashOffset - 2 });
    if (this.state.dashOffset < this.state.distError) {
      clearInterval(this.lineAnimationTimer);
      this.diableNextButton = false;
      this.setState({ showNextStop: true });
      this.setState({ dashArray: 4 });
      this.lineDashAnimationTimer = setInterval(this.pathDashAnimation, 500);
    }
  };

  pathDashAnimation = () => {
    this.setState({ dashOffset: this.state.dashOffset - 10 });
  };

  resize = (zoomFactor) => {
    if (zoomFactor !== null) {
      let height = this.markerHeight - zoomFactor * 2;
      let width = this.markerWidth - zoomFactor * 2;
      this.ZoomMarkerHeight = height;
      this.ZoomMarkerWidth = width;
      if (zoomFactor < 2) {
        this.strokeWidth = 3;
      } else if (zoomFactor < 4) {
        this.strokeWidth = 2;
      } else if (zoomFactor < 7) {
        this.strokeWidth = 1.5;
      } else if (zoomFactor < 9) {
        this.strokeWidth = 1;
      }
      this.setState({
        userLoacationX: this.userLoacationBaseX + zoomFactor,
        userLoacationY: this.userLoacationBaseY + zoomFactor,
        nextStopX: this.nextStopBaseX + zoomFactor,
        nextStopY: this.nextStopBaseY + zoomFactor,
      });
      this.lastResizeMarker = new Date();
    }
  };
  resizeMarker = (zoomFactor) => {
    if (!this.lastResizeMarker) {
      this.resize(zoomFactor);
    } else if (new Date().getTime() - this.lastResizeMarker.getTime() > 50) {
      this.resize(zoomFactor);
    }
  };

  //////////////////////Track Tour user Activity////////////////////////
  setTourUserActivityTimer() {
    this.watchPosition1();
    Singleton.getInstance().serverPingTimer = setInterval(
      this.tick,
      this.serverUpdateTime,
    );
  }

  _handleAppStateChange = (nextAppState) => {
    this.setState({ appState: nextAppState });
    if (nextAppState === 'background') {
      // Do something here on app background.
      if (Platform.OS === 'android') {
        this.appGoseInBackground();
      }
      // console.log("App is in Background Mode.TourMapScreen.js")
    }
    if (nextAppState === 'active') {
      // Do something here on app active foreground mode.
      ActivityTrackerManager.getInstance().setLengthyStayTime();
      trackTourUserActivity();
      //this.setTourUserActivityTimer()
      // console.log("App is in Active Foreground Mode.")
    }
    if (nextAppState === 'inactive') {
      this.appGoseInBackground();
      // Do something here on app inactive mode.
      // console.log("App is in inactive Mode.")
    }
  };
  getLatestLocation = () => {
    var that = this;
    //Checking for the permission just after component loaded
    if (Platform.OS === 'ios') {
      this.callLocation(that);
    } else {
      async function requestLocationPermission() {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Access Required',
              message: 'This App needs to Access your location',
            },
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            //To Check, If Permission is granted
            that.callLocation(that);
          } else {
          }
        } catch (err) {
          console.warn(err);
        }
      }
      requestLocationPermission();
    }
  };

  callLocation = (that) => {
    Geolocation.getCurrentPosition(
      //Will give you the current location
      (position) => {
        const currentLongitude = JSON.stringify(position.coords.longitude);
        //getting the Longitude from the location json
        const currentLatitude = JSON.stringify(position.coords.latitude);
        //getting the Latitude from the location json
        that.setState({ currentLongitude: currentLongitude });
        //Setting state Longitude to re re-render the Longitude Text
        that.setState({ currentLatitude: currentLatitude });
        //Setting state Latitude to re re-render the Longitude Text
      },
      () => { },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
    );
  };

  onRegionChange(lastLat, lastLong) {
    this.setState({
      lat: lastLat,
      log: lastLong,
    });
  }

  appGoseInBackground() {
    abandonedTour(this.visitedStops)
      .then((response) => response.json())
      .then((response) => { })
      .catch((error) => {
        console.log(error, '-----appGoseInBackground error---');
        this.setState({ isLoading: false });
      });
  }

  tick = () => {
    if (!this.isTourEnded) {
      ActivityTrackerManager.getInstance().setLengthyStayTime();
    }
    if (this.serverPingInProgress === false) {
      this.serverPingInProgress = true;
      serverPing(this.selectedStopID, this.selectedStopLaLog)
        .then((response) => response.json())
        .then((responseJson) => {
          // console.log("Check message:" + responseJson.un_read_msgs_count)
          this.selectedStopLaLog = [];
          this.serverPingInProgress = false;
          var tourUser = responseJson;
          // console.log("ping")
          if (tourUser.un_read_msgs_count !== 'undefined') {
            this.props.setUnreadMegCount(tourUser.un_read_msgs_count);
          }
          if (tourUser.chat_control !== 'undefined') {
            this.props.setChatButtonStatus(tourUser.chat_control);
          }
          if (tourUser.id_mismatch === true && this.showIDMisMatch) {
            this.showIDMisMatch = false;
            this.stopServerPingTimer();
            ActivityTrackerManager.getInstance().setLengthyStayTime();
            trackTourUserActivity();
            this.props.navigation.navigate('IdVerificationError');
          }
        })
        .catch((error) => {
          this.serverPingInProgress = false;
          console.log(error);
        });
    }
  };

  leftTourServerCall() {
    Singleton.getInstance().setWillShowStartButton(true);
    ActivityTrackerManager.getInstance().setLeftTime();
    trackTourUserActivity()
      .then((response) => response.json())
      .then(() => {
        Singleton.getInstance().reSetAllClickCounters();
        this.isTourEnded = true;
        ActivityTrackerManager.getInstance().setLengthyStayTimeToNull();
      })
      .catch((error) => {
        this.setState({
          isLoading: false,
        });
        console.log(error);
      });
  }

  //////////// *****UI****** /////////////
  drawPoints() {
    this.userLoacationBaseX = this.calculateXForStop(
      this.currentStop?.x_plot,
      false,
    );
    this.userLoacationBaseY = this.calculateXForStop(
      this.currentStop?.y_plot,
      false,
    );
    this.nextStopBaseX = this.calculateXForStop(this.nextStop?.x_plot, false);
    this.nextStopBaseY = this.calculateXForStop(this.nextStop?.y_plot, false);
    this.setState({
      userLoacationX: this.userLoacationBaseX,
      userLoacationY: this.userLoacationBaseY,
      nextStopX: this.nextStopBaseX,
      nextStopY: this.nextStopBaseY,
    });
  }

  calculatePath = () => {
    if (typeof this.pathData !== 'undefined') {
      var all = calculateDistance(
        this.pathData,
        this.imageWidth,
        this.imageHeight,
        this.state.imageContanierHeight,
      );
      this.setState({
        dashOffset: all.Distance,
        dashArray: all.Distance,
        path: all.pathPoint,
        distError: all.disError,
      });
    }
  };

  pressChat = () => {
    this.props.navigation.navigate('Chat');
  };

  showMore = () => {
    this.props.navigation.navigate('PrivacyPolicy', {
      title: 'Detail',
      des: this.nextStop.long_directional_text,
    });
  };

  moveToLockInfoScreen = () => {
    this.resetInfoAndAction();
    this.resetMapAnimation();
    this.props.navigation.navigate('LockInfoScreen', {
      nextStop: this.nextStop,
      navigation_title: this.currentStop?.navigation_title?.toUpperCase(),
      nextButtonPressed: this.nextButtonPressed,
      communityLocksInfo: this.tourData.community_locks_info,
      // listLatchLocks: this.latchListLocks,
      latchListLocksToken: this.latchListLocksToken,
      isEnd: this.state.isEnd,
      tourData: this.tourData,
      visitedStops: this.visitedStops,
      visitedStopLatlong: this.visitedStopLatLog,
    });
  };
  renderPath = () => {
    return (
      <>
        <Svg
          height={this.state.imageContanierHeight}
          width={Dimensions.get('window').width}>
          {this.state.showPoints ? (
            <View style={styles.positionMainContainer}>
              {this.state.showNextStop ? (
                <Image
                  style={[
                    styles.destinationAvatar,
                    {
                      left: this.state.nextStopX,
                      top: this.state.nextStopY,
                    },
                  ]}
                  source={R.images.gifPulse}
                />
              ) : null}
              <View
                style={[
                  styles.userPositionCotainer,
                  {
                    left: this.state.userLoacationX,
                    top: this.state.userLoacationY,
                  },
                ]}>
                <View
                  style={{
                    transform: [{ rotate: `${this.rotationAngle}deg` }],
                  }}>
                  <Animated.View
                    style={{
                      opacity: this.state.youAreHereOpacity,
                    }}>
                    <View style={styles.youAreHereContainer}>
                      <View style={styles.youAreHereContainerNotch} />
                      <Text style={styles.youAreHereText}>YOU</Text>
                      <Text style={styles.youAreHereText}>ARE</Text>
                      <Text style={styles.youAreHereText}>HERE</Text>
                    </View>
                  </Animated.View>
                  <Image style={styles.userAvatar} source={R.images.user} />
                </View>
              </View>
            </View>
          ) : null}
          <G>
            <Polyline
              ref={(ref) => (this.polyLine = ref)}
              points={this.state.path}
              fill="none"
              stroke={this.dottedLineColor}
              strokeWidth={this.strokeWidth}
              //transition= 'all 0.3s ease-in-out'
              strokeDasharray={this.state.dashArray}
              strokeDashoffset={this.state.dashOffset}
            />
          </G>
        </Svg>
      </>
    );
  };

  render() {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={R.images.backgroundImage}
          style={styles.mainBackgroundContainer}
          imageStyle={styles.mainBackgroundImage}>
          <Header
            backBtnVisible
            title={
              this.state.renderTourTitle
                ? this.currentStop?.navigation_title?.toUpperCase()
                : ''
            }
            onGoBack={this.onBackPress}
          />
          <View style={styles.spinnerContainer}>
            {/* <Spinner
              visible={this.state.isLoading}
              textStyle={styles.spinnerTextStyle}
            /> */}
            <LoadingIndicator visible={this.state.isLoading} />
            {this.state.renderTourTitle && (
              <>
                {this.nextStop?.type === 'elevator' ? (
                  <Text style={[styles.titleText, styles.nextStopDescText]}>
                    {this.nextStop?.stop_description}
                  </Text>
                ) : null}
                {!!this.state.directionalText && (
                  <Animated.Text
                    style={[
                      styles.titleText,
                      { opacity: this.state.descriptionOpacity },
                    ]}
                    onTextLayout={(e) => {
                      if (
                        !this.state.truncatedText &&
                        e.nativeEvent.lines.length > DIRECTIONAL_TEXT_LINES
                      ) {
                        let text = e.nativeEvent.lines
                          .map((line, index) =>
                            index < DIRECTIONAL_TEXT_LINES ? line.text : '',
                          )
                          .join('');
                        this.setState({
                          showMoreButton: true,
                          truncatedText: text.slice(0, -13),
                        });
                      }
                      this.showDirectionalText();
                    }}>
                    {this.state.showMoreButton
                      ? this.state.truncatedText
                      : this.state.directionalText}
                    {this.state.showMoreButton && (
                      <Animated.Text
                        onPress={this.showMore}
                        style={[
                          styles.titleText,
                          styles.showMoreText,
                          { opacity: this.state.descriptionOpacity },
                        ]}>
                        {` . . . More >`}
                      </Animated.Text>
                    )}
                  </Animated.Text>
                )}
              </>
            )}
            {/* {this.nextStop !== null
                ? this.nextStop?.directional_text?.length > 230
                  ? this.nextStop?.directional_text.slice(
                    0,
                    Math.floor(wp('92%') / (wp('4%') * 0.6)) * 4,
                  )
                  : this.nextStop?.directional_text
                : ''}{' '} */}
            {/* {this.state.showMoreButton ? (
                <Text onPress={this.showMore} style={styles.showMoreText}>
                  {`. . .`} {`More >`}{' '}
                </Text>
              ) : null} */}
          </View>
          <View style={styles.mapView}>
            <SvgPanZoom
              ref={(ref) => (this.zoomView = ref)}
              maxScale={10}
              canvasHeight={this.state.imageContanierHeight}
              canvasWidth={Dimensions.get('window').width}
              minScale={1}
              initialZoom={1}
              onZoom={(zoom) => {
                this.resizeMarker(zoom);
              }}>
              {this.state.isLoading === false ? (
                <ImageView
                  ref={(ref) => (this.ImageViewLocal = ref)}
                  resizeMode="contain"
                  style={[
                    styles.pathContainer,
                    {
                      height: this.state.imageContanierHeight,
                      width: Dimensions.get('window').width,
                    },
                  ]}
                  fadeDuration={300}
                  source={{ uri: this.state.mapImage }}
                  onProgress={this.imageOnProgress}
                  onLoadEnd={this.imageLoaded}
                  key={this.state.mapImage}
                  imageStyle={styles.pathViewImage}>
                  {this.renderPath()}
                </ImageView>
              ) : null}
            </SvgPanZoom>
          </View>
          <Animated.View
            style={[
              styles.actionBtnContainer,
              {
                right: this.unlockButtonPosition,
              },
            ]}>
            <GoButton
              icon={R.images.unlockBtn}
              goPressed={() => this.moveToLockInfoScreen()}
              containerStyle={styles.actionBtnSubContainer}
            />
          </Animated.View>
          {this.state.showUnlockNotWorkingButton ? (
            <View style={styles.unlockBtnContainer}>
              <TouchableOpacity
                style={styles.notWorkingBtnContainer}
                onPress={() => this.unlockNotWorking()}>
                <Text style={styles.ok}>NOT WORKING? VISIT NEXT STOP</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {/** Final tour stop with a lock: both buttons open LockInfo — show only the unlock control */}
          {!(
            this.state.isEnd &&
            this.nextStop?.stop_lock_provider &&
            this.nextStop.stop_lock_provider !== '' &&
            !this.nextStop?.bypass_stop_lock
          ) && (
          <Animated.View
            style={[
              styles.actionBtnContainer,
              {
                right: this.nextButtonPosition,
              },
            ]}>
            <GoButton
              disabled={this.diableNextButton}
              goPressed={() => this.nextButtonPressed()}
              containerStyle={styles.actionBtnSubContainer}
            />
          </Animated.View>
          )}
          {this.props.showChatButton1 ? (
            <ChatButton goPressed={() => this.pressChat()} />
          ) : null}
          <View style={styles.rotateBtnMainContainer}>
            <RotateButtons
              onRight={() => {
                this.zoomView.rotateRight(45);
              }}
              onLeft={() => {
                this.zoomView.rotateLeft(45);
              }}
            />
          </View>
        </ImageBackground>
        <CopyRight />
      </View>
    );
  }
}

export default connect(mapStateToPropsps, mapDispatchToProps)(TourMapScreen);
function mapStateToPropsps(state) {
  return {
    showChatButton1: state.chatReducer && state.chatReducer.showChatButton,
    onboarding: state?.persistReducer?.onboardingCount,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setUnreadMegCount: (payload) => dispatch(setUnreadMessageCount(payload)),
    setChatButtonStatus: (payload) => dispatch(setShowChatButton(payload)),
  };
}
