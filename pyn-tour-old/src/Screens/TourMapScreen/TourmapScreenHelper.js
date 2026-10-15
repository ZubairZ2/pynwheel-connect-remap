
import { Dimensions } from "react-native";


export function calculateXForStop(x, imageWidth, isForNextStop, imageContanierWidth) {
  let w=Dimensions.get("window").width;
  let x1 = 1;
  if (imageWidth !== 1) {
    x1 = (x / imageWidth) * w
    if (isForNextStop) {x1 = x1 - 17}
    else {x1 = x1 - 12}
    x1 = x1 + 1.5
  }
  return x1;
}

export function calculateXForStopNew(x, imageWidth, adjast, imageContanierWidth) {
  let w=Dimensions.get("window").width;
  let x1 = 1;
  if (imageWidth !== 1) {
    x1 = (x / imageWidth) * w
    // if (isForNextStop) {x1 = x1 - 17}
   x1 = x1 - adjast
    x1 = x1 + 1.5
  }
  return x1;
}

export function calculateYForStopNew(y, imageHeight, adgast, imageContanierHeight) {
  var y1 = 1;
  if (imageHeight !== 1) {
    y1 = (y / imageHeight) * imageContanierHeight
    // if (isForNextStop){y1 = y1 - 17}
    y1 = y1 - adgast
    //y1 = y1 - 13 //25 is marker Height
    y1 = y1 + 1.5
  }
  return y1;
}

export function calculateYForStop(y, imageHeight, imageContanierHeight, isForNextStop) {
  var y1 = 1;
  if (imageHeight !== 1) {
    y1 = (y / imageHeight) * imageContanierHeight
    if (isForNextStop){y1 = y1 - 17}
    else {y1 = y1 - 12}
    //y1 = y1 - 13 //25 is marker Height
    y1 = y1 + 1.5
  }
  return y1;
}

export function calculateX(x, imageWidth) {
  let x1 = 1;
  if (imageWidth !== 1) {
    x1 = (x / imageWidth) * Dimensions.get("window").width;
    x1 = x1 + 1.5
  }
  return x1;
}

export function calculateY(y, imageHeight, imageContanierHeight) {
  var y1 = 1;
  if (imageHeight !== 1) {
    y1 = (y / imageHeight) * imageContanierHeight
    y1 = y1 + 1.5
  }
  return y1;
}

export function swapFloorPlatesforElevetor(tours) {
  for (let i = tours.tour_stop.length - 1; i > 0; i--) {
    if (tours.tour_stop[i].type === "elevator") {
      tours.tour_stop[i].floorplate_image = tours.tour_stop[i - 1].floorplate_image;
    } else {
      break
    }
  }
  return tours
}
export function connectLineWithStop(tours) {
  for (let i = 0; i < tours.tour_stop.length; i++) {

    if (i === 0) {
      if (tours.tour_stop[i].path_points.length !== 0) {
        var x = tours.x_plot
        var y = tours.y_plot
        var objact = { "x_plot": x, "y_plot": y }
        tours.tour_stop[i].path_points.splice(0, 0, objact);
      }
    } else {
      if (tours.tour_stop[i].path_points.length !== 0) {
        var x = tours.tour_stop[i - 1].x_plot
        var y = tours.tour_stop[i - 1].y_plot
        var objact = { "x_plot": x, "y_plot": y }
        tours.tour_stop[i].path_points.splice(0, 0, objact);
      }
    }
    if (tours.path_points.length !== 0) {
      if (i === tours.tour_stop.length - 1) {
        var x = tours.tour_stop[i].x_plot
        var y = tours.tour_stop[i].y_plot
        var objact = { "x_plot": x, "y_plot": y }
        tours.path_points.splice(0, 0, objact);
      }
    }
    if (tours.tour_stop[i].path_points.length !== 0) {
      var x = tours.tour_stop[i].x_plot
      var y = tours.tour_stop[i].y_plot
      var objact = { "x_plot": x, "y_plot": y }
      tours.tour_stop[i].path_points.splice(tours.tour_stop[i].path_points.length, 0, objact);
    }
  }
  var x = tours.x_plot
  var y = tours.y_plot
  var objact = { "x_plot": x, "y_plot": y }
  tours.path_points.splice(tours.path_points.length, 0, objact);
  return tours
}

export function calculateDistance(pathData, imageWidth, imageHeight, imageContanierHeight) {
  var Path = "";
  //var PathForWhiteLine = "";
  var totalDistance = 0
  for (let i = 0; i < pathData.length; i++) {
    var x1 = i === -1 ? calculateX(0, imageWidth) : calculateX(typeof (pathData[i].x_plot) !== 'undefined' ? pathData[i].x_plot : 1, imageWidth)
    var y1 = i === -1 ? calculateY(0, imageHeight, imageContanierHeight) : calculateY(typeof (pathData[i].y_plot) !== 'undefined' ? pathData[i].y_plot : 1, imageHeight, imageContanierHeight)

    if (i === 0) {
      var distanceX = 0
      var distanceY = 0
      var previousX = x1
      var previousY = y1
    } else {
      var distanceX = x1 - previousX
      var distanceY = y1 - previousY
      var previousX = x1
      var previousY = y1
    }
    totalDistance = totalDistance + Math.abs(distanceX) + Math.abs(distanceY)
    Path = Path + x1 + "," + y1 + " "
    //PathForWhiteLine = PathForWhiteLine + (x1 + 3) + "," + (y1 + 3) + " "
  }
  var distanceError = (totalDistance / 100) * 15 //elemantion error
  // totalDistance = totalDistance
  var obj = {
    pathPoint: Path,
    //pathPointForWhiteLion: PathForWhiteLine,
    Distance: totalDistance,
    disError: distanceError
  };
  return obj;
}

export const unlockDoorMsg="If the door does not unlock after multiple tries, call our support team at 415-582-6701 and we will issue you with a temporary pin code in order to gain access."
export const zervFailMessage="There may be an issue with the fob reader. If the issue persists, close the app and reopen it. Remove all stops that you have already visited and page forward to this stop to try again."
// calcuclate angle between two lines
export const calcAngTowLines = (a,b,c) => {
  let BA={x:a.x-b.x,y:a.y-b.y}
  let BC={x:c.x-b.x,y:c.y-b.y} 
  let modBA=Math.sqrt(BA.x*BA.x+BA.y*BA.y)
  let modBC=Math.sqrt(BC.x*BC.x+BC.y*BC.y)
  let BABC=BA.x*BC.x+BA.y*BC.y
  angle=Math.acos(BABC/(modBA*modBC))
  var degree_angle = angle * (180 / Math.PI);
  return degree_angle
}