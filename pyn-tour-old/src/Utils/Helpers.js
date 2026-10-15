import RNFS from 'react-native-fs'
import SoundPlayer from 'react-native-sound-player'
import qs from 'qs';
import { Linking } from 'react-native';  
export const downloadFiles = async (data) => {
    let DIR = RNFS.DocumentDirectoryPath + "/images/"
    if (await RNFS.exists(DIR)) { RNFS.unlink(DIR) } // delete images drectory if already {memory cleaning purpose}
    await RNFS.mkdir(DIR) // create images directory

    let updatedData = data
    let downloaded = [] // URLs already downloaded and respective uri {url:String,uri:String}
    try {
        // debugger
        if (data?.tour_stop?.length > 0) {
            for (let i = 0; i < data.tour_stop.length; i++) {
                let is_sitemap = data?.is_sitemap
                let url = data?.tour_stop[i]?.floorplate_image
                // debugger
                if (is_sitemap) { url = data?.image }
                console.log("URL-=-=-=-=-=-=-=", url)
                const { status, index } = exist(downloaded, url)
                if (status === true) { //if already downloaded take local uri from that object
                    updatedData.tour_stop[i].floorplate_image = downloaded[index].uri
                } else {
                    // download file update updatedData push url to downloaded array
                    let path = DIR + url?.split('/').pop() // path of current file
                    if (url) {
                        await RNFS.downloadFile({
                            fromUrl: url,
                            toFile: path
                        }).promise.then((res) => {
                            downloaded.push({url,uri:"file://"+path})
                            if (is_sitemap) { updatedData.image = "file://" + path }
                            else { updatedData.tour_stop[i].floorplate_image = "file://" + path }
                            console.log("download #", i, path)
                        })
                    }
                }
            }
            console.log("donwload floor plan images DONE ==============")
        }
    } catch (error) {
        console.log("error downloading image", error)
    }
    return updatedData
}

// if url already exist in previous object mean already downloaded
const exist = (data = [], url) => {
    for (let i = 0; i < data.length; i++) {
        if(data[i].url===url){
            return { status: true, index: i }
        }
    }
    return { status: false }
}
// Message tone 
export const ringBell = () => {
    SoundPlayer.playSoundFile("bell", 'mp3')
}

export const sendEmail = (to, subject, body, options = {}) => {
    // debugger
    const { cc, bcc } = options;
    let url = `mailto:${to}`;
    // Create email link query
    const query = qs.stringify({
      subject: subject, body: body,
      cc: cc,
      bcc: bcc
    });
    if (query.length) {
      url += `?${query}`;
    }
    // check if we can use this link
    const canOpen = Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error('Provided URL can not be handled');
    }
    return Linking.openURL(url);
  }

/**
 * Calculates the angle (in radians) between two vectors pointing outward from one center
 *
 * @param p0 first point
 * @param p1 second point
 * @param c center point
 */
function find_angle(p0,p1,c) {
    var p0c = Math.sqrt(Math.pow(c.x-p0.x,2)+
                        Math.pow(c.y-p0.y,2)); // p0->c (b)   
    var p1c = Math.sqrt(Math.pow(c.x-p1.x,2)+
                        Math.pow(c.y-p1.y,2)); // p1->c (a)
    var p0p1 = Math.sqrt(Math.pow(p1.x-p0.x,2)+
                         Math.pow(p1.y-p0.y,2)); // p0->p1 (c)
    return Math.acos((p1c*p1c+p0c*p0c-p0p1*p0p1)/(2*p1c*p0c));
}

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
/*
 * Calculates the angle ABC (in radians) 
 *
 * A first point, ex: {x: 0, y: 0}
 * C second point
 * B center point   * start point on map will always be the center point
 * 
 */
// export const findAngForRotation=(A,B,C)=> {
//     var AB = Math.sqrt(Math.pow(B.x-A.x,2)+ Math.pow(B.y-A.y,2));    
//     var BC = Math.sqrt(Math.pow(B.x-C.x,2)+ Math.pow(B.y-C.y,2)); 
//     var AC = Math.sqrt(Math.pow(C.x-A.x,2)+ Math.pow(C.y-A.y,2));
//     let rad = Math.acos((BC*BC+AB*AB-AC*AC)/(2*BC*AB));
//     let ang = rad*180/Math.PI;
//     console.log("angle1",ang)
//     if(A.y > C.y){
//     ang=-90-ang
//     }else{
//         ang=90-ang
//     }
//     console.log("angle",ang)
//     return ang+"deg"
// }
export const rotationAngleOfPoints = (userLoacationBaseX, userLoacationBaseY, nextStopBaseX, nextStopBaseY) => {
    let isStartAbove = userLoacationBaseY < nextStopBaseY
    let startEqEnd = userLoacationBaseY === nextStopBaseY
    let isStartBeforeEnd = userLoacationBaseX < nextStopBaseX
    console.log({userLoacationBaseX,userLoacationBaseY,nextStopBaseX,nextStopBaseY})
    const l1 = {
        x1: isStartAbove?userLoacationBaseX:nextStopBaseX,
        y1: isStartAbove?userLoacationBaseY:nextStopBaseY,
        x2: isStartAbove?nextStopBaseX:userLoacationBaseX,
        y2: isStartAbove?nextStopBaseY:userLoacationBaseY
    }
    const l2 = {
        x1: isStartAbove ? userLoacationBaseX : nextStopBaseX,
        y1: isStartAbove ? userLoacationBaseY : nextStopBaseY,
        x2: 0,
        y2: isStartAbove ? userLoacationBaseY : nextStopBaseY
    }
    let angle = 0
    if (isStartAbove) {
        angle = calcAngTowLines(l1, l2)
        if(angle >0){
            angle=angle+90
            console.log("TAG", 1)
        }
        if(angle <0){
            angle=angle-90
            console.log("TAG", 2)
        }
    } else if (startEqEnd) {
        angle = calcAngTowLines(l1, l2)
        console.log("TAG", 3)
    }else{
        angle = calcAngTowLines(l1, l2)
        if(isStartBeforeEnd) {
            if(angle > 0){
                angle=-90+angle
                console.log("TAG", 4)
            }else if(angle < 0){
                angle=angle-180-90
                console.log("TAG", 5)
            }
        }else{
            if(angle > 0){
                angle=angle-90
                console.log("TAG", 6)
            }else{
                angle=-180+(-1*angle)
                angle=angle-270
                console.log("TAG", 7)
            }
        }
    }
    console.log({angle})
    return normalise_angle(angle)
}
// convert negative angle to positive 
export const normalise_angle = (angle) => {
    // """ If angle is negative then convert it to positive. """
    while (angle != 0 && (Math.abs(angle) == (angle * -1))) {
        angle = 360 + angle
    }
    return angle
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const getMonthName = (month) =>{
    return MONTHS[month]
}
export const formatAMPM = (date) => {
    let hours = date.getUTCHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    const strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
  }

  import ServerConfig from '../Library/ServerCalls/ServerConfig'
  export const scheduleTourURL=(communityId,communityCode)=> `${ServerConfig.BaseURL}/scheduler_widget/test_widget?community_id=${communityId}&community_code=${communityCode}&schedule_tours_page=true&direct=true`
  
  import { NavigationActions, StackActions } from 'react-navigation';
import { base64, gothamFontBase64 } from './Constants';
  export const resetNavigate=(navigation,routeName,params)=>{
    const resetAction = StackActions.reset({
    index: 0,
    actions: [NavigationActions.navigate({ routeName, params: params })],
    });
    navigation.dispatch(resetAction)
}


export const customWebviewFontCSS = () => {
    const css = `@font-face {
        font-family: 'Gotham-Light';
        src: url('data:font/woff2;charset=utf-8;base64,${gothamFontBase64}') format('woff');
    }
    *{
        margin-top:0;
        margin-bottom:0;
        padding-top:0;
        padding-bottom:0;
    }
    `
     return css;
}