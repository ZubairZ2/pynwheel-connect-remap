import { Alert } from "react-native";

export function alertForVirtuarTour(message) {
  Alert.alert(
    'Alert',
    message,
    [
      // { text: 'Yes', onPress: () => confirmed() },
      // { text: 'No', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
      { text: 'OK', onPress: () => console.log('OK Pressed') },
    ],
    { cancelable: false }
  )
}
export function alertForVirtuarSchedulerWidgetAllowed(message) {

  Alert.alert(
    'Alert',
    message,
    [
      { text: 'Schedule Tour', onPress: () => moveToSchedulerTourWebView() },
      // { text: 'Take a Virtual Tour', onPress: () => confirmed() },
      { text: 'No Thanks', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
    ],
    { cancelable: false }
  )
}

export function alertForVirtuarSchedulerWidgetNotAllowed(message) {

  Alert.alert(
    'Alert',
    message,
    [
      { text: 'Yes', onPress: () => confirmed() },
      { text: 'No', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
    ],
    { cancelable: false }
  )
}
export function userNotInCommunityRadiousAlert() {

  Alert.alert(
    'Alert',
    "It looks like you're not at the property. Please start the tour when you arrive.",
    [
      //{ text: 'No', onPress: () => moveForward() },
      // { text: 'No', onPress: () =>  showSAlert()},
      // { text: 'Yes', onPress: () => confirmed() },
      { text: 'OK', onPress: () => console.log('OK Pressed'),},
    ],
    { cancelable: false }
  )
}

export function showSAlert() {
 alert("If you change your mind, please press the “Start Tour” button to begin your virtual tour. Otherwise, you may start the tour when you are within range of the property.")
}