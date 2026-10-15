
import React from 'react'


export default class ActivityTrackerManager {

    static myInstance = null;
    id = "";
    arrivedTime = null;
    leftTime = "";
    lengthyStayTime = "";
    abandonedTourAtStop = null;

    /**
  * @returns {ActivityTrackerManager}
  */

    static getInstance() {
        if (ActivityTrackerManager.myInstance == null) {
            ActivityTrackerManager.myInstance = new ActivityTrackerManager();
        }
        return this.myInstance;
    }

    getID() {
        return this.id;
    }

    setID(id) {
        this.id = id;
    }

    getArrivedTime() {
        return this.arrivedTime;
    }

    setArrivedTime() {
        const arriveTime = this.getTime()
        this.arrivedTime = arriveTime;
    }

    getLeftTime() {
        return this.leftTime;
    }

    setLeftTime() {
        const leftTime = this.getTime()
        this.leftTime = leftTime;
    }

    getLengthyStayTime() {
        return this.lengthyStayTime;
    }

    setLengthyStayTime() {
        const lengthyStayTime = this.getTime()
        this.lengthyStayTime = lengthyStayTime;
    }

    setLengthyStayTimeToNull() {
        this.lengthyStayTime = "";
    }

    getAbandonedTourAtStop() {
        return this.abandonedTourAtStop;
    }

    setAbandonedTourAtStop(abandonedTourAtStop) {
        this.abandonedTourAtStop = abandonedTourAtStop;
    }

    setClear() {
        this.id = ""
        this.arrivedTime = ""
        this.leftTime = ""
        this.lengthyStayTime = ""
        this.abandonedTourAtStop = ""
    }

    getTime() {
        //const dateTime = +new Date();new Date()
        const dateTime = new Date();
        const timestamp = Math.floor(dateTime / 1000);
        return timestamp;
    }
}


