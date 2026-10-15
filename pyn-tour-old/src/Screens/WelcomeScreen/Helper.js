import * as Constants from '../../Utils/Constants'


export function getLatLongForDistanceMeasure (communities) {
    var combinedLatlong = "";
    for (var i = 0; i < communities.length; i++) {
      combinedLatlong =
        combinedLatlong +
        "|" +
        communities[i].latitude +
        "," +
        communities[i].longitude;
    }
    if (combinedLatlong.length > 2) {
      combinedLatlong = combinedLatlong.substring(2);
    }
    return combinedLatlong
    // this.setState({
    //   allLatlong: combinedLatlong
    // });
    // console.log(combinedLatlong);
  };

  export function getCommunitiesName  (communities) {
    var cuname = [];
    for (var i = 0; i < communities.length; i++) {
      cuname.push(communities[i]);
    }
    return cuname
    // this.setState({
    //   cname: cuname
    // });
  };

  export function calculateNearestCommunitiesFromUserLocation(distance) {
    var distances = [];
    // debugger
    var index = -1;
    var min = 10000000;
    for (let i = 0; i < distance.rows[0].elements.length; i++) {
      if (distance.rows[0].elements[i].status !== Constants.ZERO_RESULTS) {
        if (min > distance.rows[0].elements[i].distance.value) {
          min = distance.rows[0].elements[i].distance.value;
          index = i;
          //return index
          //this.setState({ index: i });
        }
      }
    }
    return index
  };
export const locationAlertText="We are capturing location data to determine if a user is nearby a property so that we can initiate the in-person tour experience."
