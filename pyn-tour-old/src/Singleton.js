import { store } from "./redux/store";

export default class Singleton {

  static myInstance = null;

  _userID = "";
  propertyName = null;
  domain = null;
  categories = null;
  current = null;
  selectedPropertyName;
  selectedPropertyLogo;
  tour_key = null;
  tourSetting = null;
  tourUserData = null;
  activeTourId = "";
  deveiceId = null;
  selectedPropertyID;
  tourUser = null;
  willShowSavedButton = false;
  comingBackFromCheckAvalibility = false;
  willUserMoveToNextStopOnSiteMap = false;
  willUserMoveToNextStopOnStopList = false;
  willUserMoveToPreviousStopOnStopList = false
  moveToNextStopOnFloorPlan = false
  lastMessageId = "";
  unReadMessageCount = 0;
  reLoadTourHighlights = true;
  token = ""
  virtualTour = "self_tour"
  locks_thread_ref = null
  tour_session_type = ""
  idVerificationProvider = ""
  isCardInfo=false
  serverPingTimer = null
  // zerv credentials
  zervUsername=null
  zervPassword=null
  bedroomFilter = [];
  isSitemap = false
  currency_symbol = '$'
  zervSDKInitialized = false;

  /**
   * @returns {Singleton}
   */

  static getInstance() {
    if (Singleton.myInstance == null) {
      Singleton.myInstance = new Singleton();
    }

    return this.myInstance;
  }

  // zerv
  getZervUsername(){
    return this.zervUsername
  }
  getZervpassword(){
    return this.zervPassword
  }
  setZervCredentials(username,password){
    this.zervUsername=username
    this.zervPassword=password
  }
  getIsZervInitialized(){
    return this.zervSDKInitialized;
  }
  setZervInitialized(isInitialized){
    this.zervSDKInitialized=isInitialized
  }

  getUserID() {
    return store.getState().persistReducer?.userID;
  }

  setUserID(id) {
    this._userID = id;
  }
  getCardInfo(){
    return this.isCardInfo
  }
  setGetCardInfo(status){
    this.isCardInfo=status
  }

  // setName(propertyName) {
  //   this.propertyName = propertyName;
  // }

  // getName() {
  //   return this.propertyName;
  // }

  setDomain(domain) {
    this.domain = domain;
  }

  getDomain() {
    return this.domain;
  }

  setCategories(categories) {
    this.categories = categories;
  }

  getCategories() {
    return this.categories;
  }
  setCurrent(current) {
    this.current = current;
  }
  getCurrent() {
    return this.current;
  }
  setPropertyName(propertyName) {
    this.selectedPropertyName = propertyName;
  }
  getPrropertyName() {
    return this.selectedPropertyName;
  }
  setPropertyLogo(propertyLogo) {
    this.selectedPropertyLogo = propertyLogo;
  }
  getPropertyLogo() {
    return this.selectedPropertyLogo;
  }

  setTourKey(tourKey) {
    this.tour_key = tourKey;
  }
  getTourKey() {
    return this.tour_key;
  }

  setTourSetting(tourKey) {
    this.tourSetting = tourKey;
  }
  getTourSetting() {
    return this.tourSetting;
  }

  setTourUserData(tourUserData) {
    this.tourUserData = tourUserData;
  }
  getTourUserData() {
    return this.tourUserData;
  }

  setDeviceId(deviceId) {
    this.deveiceId = deviceId;
  }
  getDeviceId() {
    return this.deveiceId;
  }

  setPropertyId(selectedPropertyID) {
    this.selectedPropertyID = selectedPropertyID;
  }
  getPropertyId() {
    return this.selectedPropertyID;
  }

  setTourId(tourID) {
    this.activeTourId = tourID;
  }
  getTourId() {
    return this.activeTourId;
  }

  setIsSitemap(isSitemapLocal) {
    this.isSitemap = isSitemapLocal;
  }
  getIsSitemap() {
    return this.isSitemap;
  }
  setCurrencySymbol(symbol) {
    this.currency_symbol = symbol;
  }
  getCurrencySymbol() {
    return this.currency_symbol;
  }

  setTourUserId(tourUser) {
    this.tourUser = tourUser;
  }
  getTourUserId() {
    return store.getState().persistReducer?.userID;
  }

  setWillShowStartButton(status) {
    this.willShowSavedButton = status;
  }
  getWillShowStartButton() {
    return this.willShowSavedButton;
  }

  setMoveToDetailScreen(status) {
    this.comingBackFromCheckAvalibility = status;
  }
  getMoveToDetailScreen() {
    return this.comingBackFromCheckAvalibility;
  }

  setMoveToNextStopOnFloorPlan(status) {
    this.moveToNextStopOnFloorPlan = status;
  }
  getMoveToNextStopOnFloorPlan() {
    return this.moveToNextStopOnFloorPlan;
  }

  setShouldUserMoveToNextStop(status) {
    this.willUserMoveToNextStopOnSiteMap = status;
  }
  getShouldUserMoveToNextStop() {
    return this.willUserMoveToNextStopOnSiteMap;
  }

  setShouldUserMoveToNextStopOnStopList(status) {
    this.willUserMoveToNextStopOnStopList = status;
  }
  getShouldUserMoveToNextStopOnStopList() {
    return this.willUserMoveToNextStopOnStopList;
  }

  setShouldUserMoveToPreviousStop(status) {
    this.willUserMoveToPreviousStopOnStopList = status
  }
  getShouldUserMoveToPreviousStop() {
    return this.willUserMoveToPreviousStopOnStopList
  }
  setBedroomFilter(filter) {
    this.bedroomFilter = filter;
  }
  getBedroomFilter() {
    return this.bedroomFilter;
  }

  setLastMessageId(messageID) {
    this.lastMessageId = messageID;
  }
  getLastMessageId() {
    return this.lastMessageId;
  }
  setUnReadMessageCount(count) {
    this.unReadMessageCount = count;
  }
  getUnReadMessageCount() {
    return this.unReadMessageCount;
  }

  reSetPingParameter ()
  {
    this.lastMessageId  = ""
  }

  setReloadTourHighlights(status) {
    this.reLoadTourHighlights = status;
  }
  getReloadTourHighlights() {
    return this.reLoadTourHighlights;
  }

  setToken(token) {
    // debugger
    this.token = token;
  }
  getToken() {
    return store.getState().persistReducer?.access_token;
  }

  setVirtualTour(value) {
    this.virtualTour = value;
  }
  getVirtualTour() {
    return this.virtualTour;
  }

  setLocksThreadRef(value) {
    this.locks_thread_ref = value;
  }
  getLocksThreadRef() {
    return this.locks_thread_ref;
  }

  setTourSessionType(value) {
    this.tour_session_type = value;
  }
  getTourSessionType() {
    return this.tour_session_type;
  }

  setIdVerificationProvider(value) {
    this.idVerificationProvider = value;
  }
  getIdVerificationProvider() {
    return this.idVerificationProvider;
  }


  /////////////Analytic////////////////
  priceClickCounter = 0
  availabilityCounter = 0
  applyClicksCounter = 0
  notesOpenedCounter = 0
  cameraOpenedCounter = 0
  visitedPagesCounter = 0

  setUnitAvailabilityClickIncrement() {
    this.availabilityCounter = this.availabilityCounter + 1;
  }
  getUnitAvailabilityClick() {
    return this.availabilityCounter;
  }
  setUnitPriceClickIncrement() {
    this.priceClickCounter = this.priceClickCounter + 1;
    // debugger
  }
  getUnitPriceClick() {
    return this.priceClickCounter;
  }
  setUnitApplyClickIncrement() {
    this.applyClicksCounter = this.applyClicksCounter + 1;
  }
  getUnitApplyClick() {
    return this.applyClicksCounter;
  }
  setNotesClickIncrement() {
    // debugger
    this.notesOpenedCounter = this.notesOpenedCounter + 1;
  }
  getNotesClick() {
    return this.notesOpenedCounter;
  }

  setCameraClickIncrement() {
    this.cameraOpenedCounter = this.cameraOpenedCounter + 1;
  }
  getCameraClick() {
    return this.cameraOpenedCounter;
  }

  setVisitedPagesCounterIncrement() {
    this.visitedPagesCounter = this.visitedPagesCounter + 1;
  }
  getVisitedPagesCounter() {
    return this.visitedPagesCounter;
  }
  // setCameraClickIncrement() {
  //   this.cameraOpenedCounter = this.cameraOpenedCounter + 1;
  // }
  // getCameraClick() {
  //   return this.cameraOpenedCounter;
  // }
  reSetAllClickCounters() {
    this.priceClickCounter = 0
    this.availabilityCounter = 0
    this.applyClicksCounter = 0
    this.notesOpenedCounter = 0
    this.cameraOpenedCounter = 0
    this.visitedPagesCounter = 0
  }
  /////////////Analytic End////////////////

  CheckConnectivity = () => {
    // For Android devices
    if (Platform.OS === "android") {
      NetInfo.isConnected.fetch().then(isConnected => {
        if (isConnected) {
          return true;
        } else {
          return false;
        }
      });
    } else {
      // For iOS devices
      NetInfo.isConnected.addEventListener(
        "connectionChange",
        this.handleFirstConnectivityChange
      );
    }
  };

  handleFirstConnectivityChange = isConnected => {
    NetInfo.isConnected.removeEventListener(
      "connectionChange",
      this.handleFirstConnectivityChange
    );

    if (isConnected === false) {
      return true;
    } else {
      return false;
    }
  };



}
