//import activity from '../APICalls'

import ActivityTrackerManager from './ActivityTrackerManager';
import Singleton from '../../Singleton';
import ServerConfig from "../../Library/ServerCalls/ServerConfig";
import DeviceInfo from 'react-native-device-info'


export function trackTourUserActivity() {
    let body = new FormData();
    body.append('id', ActivityTrackerManager.getInstance().getID());
    body.append('arrived', ActivityTrackerManager.getInstance().getArrivedTime());
    body.append('lengthy_stay', ActivityTrackerManager.getInstance().getLengthyStayTime());
    body.append('abandoned_tour_at_stop', "");
    body.append('left', ActivityTrackerManager.getInstance().getLeftTime());
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('community_id', Singleton.getInstance().getPropertyId());
    body.append('tour_id', Singleton.getInstance().getTourId());
    body.append('last_msg_id', Singleton.getInstance().getLastMessageId());
    body.append('time_zone', DeviceInfo.getTimezone());
    body.append('active_app', true);

    body.append('price_opened_counter', Singleton.getInstance().getUnitPriceClick() );
    body.append('see_availability_counter', Singleton.getInstance().getUnitAvailabilityClick() );
    body.append('notes_opened_counter', Singleton.getInstance().getNotesClick() );
    body.append('camera_opened_counter', Singleton.getInstance().getCameraClick() );
    body.append('apply_clicks_counter', Singleton.getInstance().getUnitApplyClick());
    body.append('tour_session_type', Singleton.getInstance().getTourSessionType());
    body.append('visited_pages_counter', Singleton.getInstance().getVisitedPagesCounter());
    body.append('tour_site', Singleton.getInstance().getVirtualTour());
    body.append('token', Singleton.getInstance().getToken());
    let Url = `${ServerConfig.BaseURL}/api/v1/save_tour_history?`
// debugger
    return fetch(Url, {
        method: "POST",
        headers: {
            // 'Content-Type': 'application/json',
        },
        body: body
    })
};

export function abandonedTour(visitedStops) {
    let body = new FormData();
    body.append('id', ActivityTrackerManager.getInstance().getID());
    body.append('arrived', ActivityTrackerManager.getInstance().getArrivedTime());
    body.append('lengthy_stay', ActivityTrackerManager.getInstance().getLengthyStayTime());
    body.append('abandoned_tour_at_stop', ActivityTrackerManager.getInstance().getAbandonedTourAtStop());
    body.append('left', ActivityTrackerManager.getInstance().getLeftTime());
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('community_id', Singleton.getInstance().getPropertyId());
    body.append('tour_id', Singleton.getInstance().getTourId());
    body.append('time_zone', DeviceInfo.getTimezone());
    body.append('token', Singleton.getInstance().getToken());
    body.append('active_app', false);

    body.append('price_opened_counter', Singleton.getInstance().getUnitPriceClick() );
    body.append('see_availability_counter', Singleton.getInstance().getUnitAvailabilityClick() );
    body.append('notes_opened_counter', Singleton.getInstance().getNotesClick() );
    body.append('camera_opened_counter', Singleton.getInstance().getCameraClick() );
    body.append('apply_clicks_counter', Singleton.getInstance().getUnitApplyClick());
    body.append('tour_session_type', Singleton.getInstance().getTourSessionType());
    body.append('visited_pages_counter', Singleton.getInstance().getVisitedPagesCounter());
    body.append('tour_site', Singleton.getInstance().getVirtualTour());
    body.append('tour_key', Singleton.getInstance().tour_key);
    body.append('tour_stop_id', visitedStops);

    // debugger
    let Url = `${ServerConfig.BaseURL}/api/v1/save_tour_history?`
    return fetch(Url, {
        method: "POST",
        headers: { 
            // 'Content-Type': 'application/json',
        },
        body: body
    })
};

export function serverPing(currentStopID, latLongs) {

 let data = {'last_msg_id': Singleton.getInstance().getLastMessageId(),'lat_langs':latLongs, 'tour_key': Singleton.getInstance().tour_key, 'tour_user_id':  Singleton.getInstance().getTourUserId() , 'community_id': Singleton.getInstance().getPropertyId(), 'tour_id': Singleton.getInstance().getTourId(), 'tour_history_id': ActivityTrackerManager.getInstance().getID(), 'lengthy_stay': ActivityTrackerManager.getInstance().getLengthyStayTime(), 'current_stop_id': currentStopID , 'token': Singleton.getInstance().getToken()}

    let Url = `${ServerConfig.BaseURL}/api/v1/alerts_during_tour`

    return fetch(Url, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
};
//JSON.stringify(raw)
///active_app