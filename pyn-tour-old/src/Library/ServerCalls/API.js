
import { Platform } from 'react-native';
import Config from "react-native-config";
import DeviceInfo from 'react-native-device-info';
import Singleton from "../../Singleton";
import ServerConfig from "./ServerConfig";
//*********************** Welcome Screen ***********************
let appPlatform = Platform.OS
export function getCommunitiesFromServer(tourUserID) {
    const version = appPlatform === "android" ? "33" : "34";//developer will update this version for every Store push
    let appName = DeviceInfo.getApplicationName();
    if (appName === "Pynwheel Tour") {
        appName = "Pynwheel Tour"
    }
    // debugger
    let endPoint = "/api/v1/communities/portico_list_communities.json"
    if (Config.ENV === 'lincoln') {
        endPoint = "/api/v1/communities/lincoln_list_communities.json"
    }
    let body = new FormData();
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('version', version);
    body.append('appName', appName);
    body.append('appPlatform', appPlatform);
    body.append('token', Singleton.getInstance().getToken())

    let url = `${ServerConfig.BaseURL}` + endPoint
    return fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data'
        },
        body: body
    })
}

export function getAppStoreVersionFromServer() {
    const version = appPlatform === "android" ? "33" : "34"; //developer will update this version for every Store push
    let appName = DeviceInfo.getApplicationName();
    if (appName === "Pynwheel Tour") {
        appName = "Pynwheel Tour"
    }
    // debugger
    let endPoint = `/api/v1/communities/check_version?appName=${appName}&appPlatform=${appPlatform}&version=${version}`
    if (Config.ENV === 'lincoln') {
        endPoint = `/api/v1/communities/check_version?appName=${appName}&appPlatform=${appPlatform}&version=${version}`
    }

    let url = `${ServerConfig.BaseURL}` + endPoint
    return fetch(url, {
        method: 'GET',
        headers: {
        }
    })
}

export function getDistanceWithCurrentLocation(origin, destination) {
    return fetch('https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + origin + '&destinations=' + destination + '&key=' + Config.GOOGLE_API_KEY, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    });
}
export function getUserByEmail(email) {//End Point Depricated
    let url = `${ServerConfig.BaseURL}/api/v1/get_user_by_email?user_email=${email}`
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}

export function getUserByPhone(phone) {
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/tour_users/get_tour_user`
    const formData = new FormData()
    formData.append("phone_number", phone)
    formData.append("licenseKey", Config?.licenseKey)
    const requestOptions = {
        ios: {
            method: "POST",
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: formData
        },
        android: {
            method: 'POST',
            body: formData,
            redirect: 'follow'
        }
    };
    const option = appPlatform === "android" ? requestOptions.android : requestOptions.ios
    return fetch(url, option)
}
export function generateOTP(phone, token, userID) {
    console.log(phone, token)
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/tour_users/generate_otp`
    const formData = new FormData()
    formData.append("phone_number", phone)
    formData.append("token", token)
    if (userID) {
        formData.append('tour_user_id', userID)
    }
    const requestOptions = {
        ios: {
            method: "POST",
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: formData
        },
        android: {
            method: 'POST',
            body: formData,
            redirect: 'follow'
        }
    };
    const option = appPlatform === "android" ? requestOptions.android : requestOptions.ios
    return fetch(url, option)
}
export function verifyOtpFromServer(phone, otp, tour_user_id, token) {
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/tour_users/verify_otp`
    const formData = new FormData()
    formData.append("phone_number", phone)
    formData.append("pin_code", otp)
    formData.append('token', token)
    if (tour_user_id) {
        formData.append("tour_user_id", tour_user_id)
    }
    if (Config.ENV === 'lincoln') {
        formData.append("app", "lincoln")
    } else {
        formData.append("app", "portico")
    }
    console.log(formData)
    const requestOptions = {
        ios: {
            method: "POST",
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: formData
        },
        android: {
            method: 'POST',
            body: formData,
            redirect: 'follow'
        }
    };
    const option = appPlatform === "android" ? requestOptions.android : requestOptions.ios
    return fetch(url, option)
}

export function deleteUserById(userID) {
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/tour_users/${userID}/delete_account?token=${Singleton.getInstance().getToken()}&tour_user_id=${userID}`
    const requestOptions = {
        ios: {
            method: "DELETE",
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        },
        android: {
            method: 'DELETE',
            redirect: 'follow'
        }
    };
    const option = appPlatform === "android" ? requestOptions.android : requestOptions.ios
    return fetch(url, option)
}

//***************************** Home Screen++++***********************
export function getUserDataFromServer() {
    const selectedComunnityID = Singleton.getInstance().getPropertyId();
    let url1 = `${ServerConfig.BaseURL}/api/v1/communities/` + selectedComunnityID + "/tour_user_data?tour_user_id=" + Singleton.getInstance().getTourUserId() + "&token=" + Singleton.getInstance().getToken()

    // debugger
    return fetch(url1, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}

export function getTourConfigrationsFromServer(location) {
    const selectedComunnityID = Singleton.getInstance().getPropertyId();
    let url1 = `${ServerConfig.BaseURL}/api/self_tour/v1/communities/` + selectedComunnityID + "/user_tour_status?tour_user_id=" + Singleton.getInstance().getTourUserId() + "&id_verification=" + 1 + "&current_time=" + new Date() + "&latitude=" + location.coords.latitude + "&longitude=" + location.coords.longitude + "&token=" + Singleton.getInstance().getToken()

    // debugger
    return fetch(url1, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}
export function addCreditCard(data) {
    const { card_no, cvv, exp_month, exp_year } = data
    const formdata = new FormData();
    formdata.append("tour_user_id", Singleton.getInstance().getTourUserId());
    formdata.append("number", card_no);
    formdata.append("exp_month", exp_month);
    formdata.append("exp_year", exp_year);
    formdata.append("cvc", cvv);
    formdata.append("token", Singleton.getInstance().getToken());

    const requestOptions = {
        method: 'POST',
        body: formdata,
    };
    return fetch(ServerConfig.BaseURL + "/api/v1/tours/save_tour_user_card_info", requestOptions)
}

//*********************** ScanIDSelfiScreen ***********************

export function uploadPicture(imageURl, endPoint) {
    let body = new FormData();
    body.append('image', { uri: imageURl, name: 'photo.png', filename: 'imageName.png', type: 'image/png' });
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('community_id', Singleton.getInstance().getPropertyId());
    body.append('token', Singleton.getInstance().getToken());

    let Url = `${ServerConfig.BaseURL}` + endPoint
    return fetch(Url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data'
        },
        body: body
    })
}

// Rough implementation. Untested.
export function timeout(ms, promise) {
    // debugger
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            reject(new Error("timeout"))
        }, ms)
        promise.then(resolve, reject)
    })
}
//***************************** LatchOTPScreen ++++***********************
export function generateLatchOTP() {
    const community_id = Singleton.getInstance().getPropertyId();
    const tour_user_id = Singleton.getInstance().getTourUserId()
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/latch_accounts/generate_verification_code?community_id=${community_id}&tour_user_id=${tour_user_id}`
    console.log("GENERATE_LATCH_OTP_URL", url);
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: 'application/json',
        }
    })
}

export function generateLatchAccessToken(otp) {
    const community_id = Singleton.getInstance().getPropertyId();
    const tour_user_id = Singleton.getInstance().getTourUserId()
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/latch_accounts/get_user_auth_token?community_id=${community_id}&tour_user_id=${tour_user_id}&verification_code=${otp}`
    console.log("GENERATE_LATCH_VERIFICATION_CODE_URL", url);
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
        }
    })
}

//***************************** TourReview ++++***********************
export function InitializeTourFromServer() {
    const selectedComunnityID = Singleton.getInstance().getPropertyId();
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/communities/` + selectedComunnityID + `/initialize_tour?tour_user_id=` + Singleton.getInstance().getTourUserId() + "&tour_status=" + Singleton.getInstance().getVirtualTour() + "&verified_at=" + new Date().toString() + "&verfied_by_provider=" + Singleton.getInstance().getIdVerificationProvider() + "&token=" + Singleton.getInstance().getToken()
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
        }
    })
}
export function CustomizeTourFromServer() {
    const selectedComunnityID = Singleton.getInstance().getPropertyId();
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/communities/` + selectedComunnityID + `/customize_tour?tour_user_id=` + Singleton.getInstance().getTourUserId() + "&token=" + Singleton.getInstance().getToken()
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
        }
    })
}

export function generateLocksAccessesFromServer() {
    const selectedComunnityID = Singleton.getInstance().getPropertyId();
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/communities/` + selectedComunnityID + `/generate_locks_accesses?tour_user_id=` + Singleton.getInstance().getTourUserId() + "&time_zone=" + DeviceInfo.getTimezone() + "&current_time=" + new Date() + "&token=" + Singleton.getInstance().getToken()
    // debugger
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
        }
    })
}
export function getTourData() {
    const selectedComunnityID = Singleton.getInstance().getPropertyId();
    let url = `${ServerConfig.BaseURL}/api/v1/communities/` + selectedComunnityID + `/community_tours.json?tour_user_id=` + Singleton.getInstance().getTourUserId() + "&current_time=" + new Date() + "&tour_status=" + Singleton.getInstance().getVirtualTour() + "&verfied_by_provider=" + Singleton.getInstance().getIdVerificationProvider() + "&token=" + Singleton.getInstance().getToken() + "&verified_at=" + new Date().toString() + "&time_zone=" + DeviceInfo.getTimezone()
    // debugger
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
        }
    })
}

export function getRemortAlocationStatus() {
    const selectedComunnityID = Singleton.getInstance().getPropertyId();
    let body = new FormData();
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('token', Singleton.getInstance().getToken());
    body.append('tour_type', Singleton.getInstance().getVirtualTour())

    // debugger
    let url = `${ServerConfig.BaseURL}/api/v1/communities/` + selectedComunnityID + `/check_lock_access`

    console.log(url)
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: 'application/json',
        },
        body: body
    })
}

export function deleteTourStop(StopID, locks_thread_ref) {
    const selectedComunnityID = Singleton.getInstance().getPropertyId();
    let body = new FormData();
    body.append('tour_id', Singleton.getInstance().getTourId());
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('stop_id', StopID);
    body.append('token', Singleton.getInstance().getToken());
    body.append('current_time', new Date().toString());
    body.append('locks_thread_ref', locks_thread_ref)
    // debugger
    console.log("SELF_TOUR", `${ServerConfig.BaseURL}/api/self_tour/v1/communities/` + selectedComunnityID + `/start_tour`)
    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/communities/` + selectedComunnityID + `/start_tour`
    return fetch(url, {
        method: "DELETE",
        headers: {
            Accept: 'application/json',
        },
        body: body
    })
}

//***************************** Edit Tour Stopd ++++***********************

export function getFloorPlansForEditTour(perPage, pageNumber, bedRooms, sortBy) {
    let url = `${ServerConfig.BaseURL}/api/v1/floorplans?community_id=` + Singleton.getInstance().getPropertyId() + "&page=" + pageNumber + "&per_page=" + perPage + "&bedrooms=" + bedRooms + "&sort_by=" + sortBy + "&token=" + Singleton.getInstance().getToken() + "&tour_user_id=" + Singleton.getInstance().getTourUserId()
    //// debugger
    console.log(url)
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}

export function getUnitsForEditTour(id) {
    let url = `${ServerConfig.BaseURL}/api/v1/floorplans/${id}/units?community_id=` + Singleton.getInstance().getPropertyId() + "&tour_user_id=" + Singleton.getInstance().getTourUserId() + "&token=" + Singleton.getInstance().getToken()
    //// debugger
    console.log(url)
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}

export function addOrRemoveUnitFormTour(stopID, stopType, floor, building) {
    let url = `${ServerConfig.BaseURL}/api/v1/update_tour_stops_list?community_id=` + Singleton.getInstance().getPropertyId() + "&stop_id=" + stopID + "&stop_type=" + stopType + "&floor=" + floor + "&building=" + building + "&tour_user_id=" + Singleton.getInstance().getTourUserId() + "&token=" + Singleton.getInstance().getToken()
    //// debugger
    console.log(url)
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}

export function getAmenitiesForEditTour() {
    let url = `${ServerConfig.BaseURL}/api/v1/floorplan_amenities?community_id=` + Singleton.getInstance().getPropertyId() + "&tour_user_id=" + Singleton.getInstance().getTourUserId() + "&token=" + Singleton.getInstance().getToken()
    //// debugger
    console.log(url)
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}


//***************************** CommuityCode ++++***********************
export function verifyCommuityOTP(accessCode) {
    let body = new FormData();
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('community_id', Singleton.getInstance().getPropertyId());
    body.append('access_code', accessCode);
    body.append('token', Singleton.getInstance().getToken());
    console.log("accessCode", accessCode)
    let Url = `${ServerConfig.BaseURL}/api/v1/verify_property_access_code`
    return fetch(Url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
        },
        body: body
    })
}

//***************************** ShareTour ++++***********************

export function shareTourData(tourID, yourName, recepientName, PhoneNumber, EmailID) {
    let body = new FormData();
    body.append('tour_id', tourID);
    body.append('name', yourName);
    body.append('recipient_name', recepientName);
    body.append('email', EmailID);
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('tour_key', Singleton.getInstance().tour_key);
    body.append('device_id', Singleton.getInstance().deveiceId);
    body.append('token', Singleton.getInstance().getToken());
    let url = `${ServerConfig.BaseURL}/api/v1/save_shared_tour?`
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: 'application/json',
        },
        body: body
    })
}

//***************************** TourStopImageUploadScreen ++++***********************

export function uploadTourStopPicture(imageUrl, stopId) {
    let body = new FormData();
    body.append('image', { uri: imageUrl, name: "image.jpg", filename: 'image.jpg', type: 'image/jpg' });
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('tour_stop_id', stopId);
    body.append('tour_key', Singleton.getInstance().tour_key);
    body.append('device_id', Singleton.getInstance().deveiceId);
    body.append('tour_id', Singleton.getInstance().getTourId());
    body.append('description', '');
    body.append('event_dateTime', new Date().toString());
    body.append('token', Singleton.getInstance().getToken());

    let Url = `${ServerConfig.BaseURL}/api/v1/tours/1/save_user_data`
    return fetch(Url, {
        method: 'POST', headers: {
        }, body: body
    })
}

//***************************** TourStopNotesUploadScreen ++++***********************

export function uploadNotes(notesText, stopId) {
    let body = new FormData();
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('tour_stop_id', stopId);
    body.append('tour_id', Singleton.getInstance().getTourId());
    body.append('tour_key', Singleton.getInstance().tour_key);
    body.append('device_id', Singleton.getInstance().deveiceId);
    body.append('description', notesText);
    body.append('event_dateTime', new Date().toString());
    body.append('token', Singleton.getInstance().getToken());

    let Url = `${ServerConfig.BaseURL}/api/v1/tours/1/save_user_data`
    return fetch(Url, {
        method: 'POST', headers: {
        }, body: body
    })
}

//***************************** ThankPropertyScreen ++++***********************

export function postSavedTour(stopIdsArray) {
    let body = new FormData();
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('tour_stop_id', stopIdsArray);
    body.append('tour_key', Singleton.getInstance().tour_key);
    body.append('device_id', Singleton.getInstance().deveiceId);
    body.append('tour_id', Singleton.getInstance().getTourId());
    body.append('token', Singleton.getInstance().getToken());
    // debugger

    let Url = `${ServerConfig.BaseURL}/api/v1/tours/1/save_user_tour`
    // debugger
    return fetch(Url, {
        method: 'POST', headers: {
        }, body: body
    })
}

export function postUserFeedback(rating, feedback, cancelledAt, isCancelled) {
    let body = new FormData();
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('tour_key', Singleton.getInstance().tour_key);
    body.append('tour_id', Singleton.getInstance().getTourId());
    body.append('token', Singleton.getInstance().getToken());
    body.append('rating', rating);
    body.append('comment', feedback);
    body.append('is_cancelled', cancelledAt);
    body.append('cancelled_at', isCancelled);
    // debugger

    let Url = `${ServerConfig.BaseURL}/api/v1/tours/` + Singleton.getInstance().getTourId() + `/feedback`
    // debugger
    return fetch(Url, {
        method: 'POST', headers: {
        }, body: body
    })
}
//***************************** SavedTourScreen ++++***********************

export function getSavedTourData() {
    let body = new FormData();
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('community_id', Singleton.getInstance().getPropertyId());
    body.append('token', Singleton.getInstance().getToken());
    body.append('current_time', new Date().toString());

    // debugger
    let url = `${ServerConfig.BaseURL}/api/v1/communities/1/user_saved_tour.json`
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: 'application/json',
        },
        body: body
    })
}

//***************************** Unlockdoor ++++***********************

export function unlockDoor(lockID) {
    let body = new FormData();
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('lock_id', lockID);
    body.append('command', "unlock");
    body.append('community_id', Singleton.getInstance().getPropertyId());
    let url = `${ServerConfig.BaseURL}/api/v1/device_lock_unlock`
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: 'application/json',
        },
        body: body
    })
}

export function getNewIgloohomePin({ accessName, lockId }) {
    const communityId = Singleton.getInstance().getPropertyId();
    const userId = Singleton.getInstance().getTourUserId();

    const url = `${ServerConfig.BaseURL}/api/self_tour/v1/igloohome_accounts/get_pin_code?community_id=${communityId}&tour_user_id=${userId}&device_id=${lockId}&access_name=${accessName}`
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
        },
    })
}

//***************************** CheckPoint ++++***********************
export function checkPOintServerPing(ID) {
    let Url = "https://my.checkpointid.com/api/PublicOnboarding/Requests?metadata={'uniq_id':'" + ID + "'}"
    return fetch(Url, {
        method: "GET",
        headers: {
            'Authorization': 'Bearer 84672e03-36f3-470c-98eb-679964dc36a5',
            'Content-Type': 'application/json',
        }
    })
};


//***************************** LoginScreen ++++***********************

export function userLogin(userEmail, firstName, lastName, number, isSmsEnabled) {

    let body = new FormData();
    body.append('email', userEmail);
    body.append('first_name', firstName);
    body.append('last_name', lastName);
    body.append('phone_number', number);
    body.append('is_sms_enabled', isSmsEnabled);
    body.append('license_key', `${Config.licenseKey}`);
    body.append('community_id', Singleton.getInstance().getPropertyId());
    console.log(body)
    // debugger
    let Url = `${ServerConfig.BaseURL}/api/v1/tours/tour_user_login`
    return fetch(Url, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
        },
        body: body
    })
}

//***************************** EditProfileInfo ++++***********************

export function editProfileInfoApi(userEmail, fistName, lastName, number) {

    const raw = JSON.stringify({
        "email": userEmail,
        "first_name": fistName,
        "last_name": lastName,
        "phone_number": number
    });

    let url = `${ServerConfig.BaseURL}/api/self_tour/v1/tour_users/${Singleton.getInstance().getTourUserId()}`
    return fetch(url, {
        method: 'PUT',
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: raw
    })
}

//***************************** ChackUnitAvailability ++++***********************
export function getUnitOfFloorPlanWithUnitID(UnitID) {
    let url = `${ServerConfig.BaseURL}/api/v1/get_floorplan_units?unit_id=` + UnitID + "&stringFormat=" + true + "&token=" + Singleton.getInstance().getToken() + "&tour_user_id=" + Singleton.getInstance().getTourUserId()
    // debugger
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}

export function getUnitOfFloorPlanWithFloorPlanID(id) {
    let url = `${ServerConfig.BaseURL}/api/v1/get_floorplan_units_v1?community_id=` + Singleton.getInstance().getPropertyId() + `&floorplan_id=` + id + "&stringFormat=" + true + "&token=" + Singleton.getInstance().getToken() + "&tour_user_id=" + Singleton.getInstance().getTourUserId()
    // debugger
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}

//***************************** FloorPlan ++++***********************

export function getFloorPlanFromServer() {
    let url = `${ServerConfig.BaseURL}/api/v1/get_floorplan_list?community_id=` + Singleton.getInstance().getPropertyId() + "&stringFormat=" + true + "&token=" + Singleton.getInstance().getToken() + "&tour_user_id=" + Singleton.getInstance().getTourUserId()
    // debugger
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}

//***************************** Check ID Varifaction ++++***********************

export function getAuthenteqURL(UnitID) {
    let url = `${ServerConfig.BaseURL}/api/v1/communities/authenteq?tour_user_id=` + Singleton.getInstance().getTourUserId() + "&community_id=" + Singleton.getInstance().getPropertyId() + "&token=" + Singleton.getInstance().getToken()
    // debugger
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}
export function userFailedInIDVarification(VerificationProvider, reasonToFail) {
    // debugger
    let body = new FormData();
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('verification_provider', VerificationProvider);
    body.append('community_id', Singleton.getInstance().getPropertyId());
    body.append('reason', reasonToFail);
    body.append('token', Singleton.getInstance().getToken());
    let url = `${ServerConfig.BaseURL}/api/v1/mis_match_verification`
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: 'application/json',
        },
        body: body
    })
}

//***************************** Chat ++++***********************
export function getChatHistory() {
    let body = new FormData();
    body.append('tour_id', Singleton.getInstance().getTourId());
    body.append('community_id', Singleton.getInstance().getPropertyId());
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('token', Singleton.getInstance().getToken());
    let url = `${ServerConfig.BaseURL}/chatrooms`
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: 'application/json',
        },
        body: body
    })
}

export function sendChatMessage(message, chatRoomId, date) {
    let body = new FormData();
    body.append('message', message);
    body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    body.append('chatroom_id', chatRoomId);
    body.append('client_date', date.toString())
    body.append('token', Singleton.getInstance().getToken());
    let url = `${ServerConfig.BaseURL}/chats`
    return fetch(url, {
        method: "POST",
        headers: {
            Accept: 'application/json',
        },
        body: body
    })
}

export function getLatestMessages(lastMessageId, chatroomID) {
    let url = `${ServerConfig.BaseURL}/listening_message?chatroom_id=` + chatroomID + `&last_msg_id=` + lastMessageId + "&community_id=" + Singleton.getInstance().getPropertyId() + "&token=" + Singleton.getInstance().getToken()
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    })
}

export function getTourCommunities(userId) {
    const url = `${ServerConfig.BaseURL}/api/v1/get_filtered_tours?tour_user_id=${userId}&token=${Singleton.getInstance().getToken()}`
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Contetn-Type': 'application/json'
        }
    })
}

export function getCompletedTours(userId, page, perPage) {
    const url = `${ServerConfig.BaseURL}/api/self_tour/v1/tour_users/${userId}/completed_tours?page=${page}&per_page=${perPage}`
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Contetn-Type': 'application/json'
        }
    })
}

export function getWelcomeScreenData(userId) {
    const url = `${ServerConfig.BaseURL}/api/v1/get_count_screen?tour_user_id=${userId}&token=${Singleton.getInstance().getToken()}`
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: 'application/json',
            'Contetn-Type': 'application/json'
        }
    })
}