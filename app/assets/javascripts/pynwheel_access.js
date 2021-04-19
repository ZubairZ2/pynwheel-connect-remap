var userPhoneNumber;
var community;
var pynwheelAccessUsers = [];
var subLocations = [];
var cardFormates = [];
var userAccesses = [];
var defaultHTML = '';
var blockNumber = 0;
var blockNumbersList = [];
var phoneNumberITI;
var ITIObject;
var userData;
var userID = null;
var otherCommunitiesAccesses = [];
var timerArray = [];
var removedAccessIds = [];
var removedAccessDurationIds = [];

$(document).ready(function() {
  $('#miyazaki').dataTable({
    "searching": true
  });

  var input = document.querySelector("#pynwheelAccessUserPhone");
    
  ITIObject = intlTelInput(input, {
    separateDialCode: true
  });

  pynwheelAccessUsers = $("#pynwheelAccessUsers").data("pynwheelAccessUsers");
  subLocations = $("#pynwheelAccessUsers").data("subLoactions");
  community = $("#pynwheelAccessUsers").data("community");
  cardFormates = $("#pynwheelAccessUsers").data("cardFormates");
  defaultHTML = $( ".pynwheel-access-addresses-list" ).html();
});

function handlePynwheelAccessUserActive(phone) {
  isUserActive = null;

  if($(`#pynwheelAccessUserActiveToggle${phone}`).prop('checked'))
    isUserActive = true;
  else
    isUserActive = false;

  let payload =  {
    id: phone,
    active: isUserActive
  }

  handlePynwheelAccessUserActivation(payload);
} 

function handlePynwheelAccessUserActivation(payload) {
  $.ajax({
    url: `/communities/${community.id}/pynwheel_accesses/active_or_inactive_user`,
    type: "POST",
    data: {userActivationPayload: payload}
  }).done(function() {
    window.location.reload();
  });
}

function onChangeCheckbox(index) {
  isAllChecked(index);
}

function resetTimerModalValues(index) {
  let objIndex = timerArray.findIndex(t => t.index == index);
  let timerObj;
  if(objIndex > -1)
    timerObj = timerArray[objIndex];

  if(timerObj)
    setPreviousTimerValues(index, timerObj);
}

function setPreviousTimerValues(index, timer) {
  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-end-date`).val(timer.accessEndDate);
  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-start-date`).val(timer.accessStartDate);
  
  if(timer.friAccess)
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-check-box`).prop('checked', true);
  else
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-check-box`).prop('checked', false);

  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-end-time`).val(timer.fri_access_end_time);
  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-start-time`).val(timer.fri_access_start_time);
  
  if(timer.monAccess)
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-check-box`).prop('checked', true);
  else
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-check-box`).prop('checked', false);

  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-end-time`).val(timer.mon_access_end_time);
  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-start-time`).val(timer.mon_access_start_time);
  
  if(timer.satAccess)
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-check-box`).prop('checked', true);
  else
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-check-box`).prop('checked', false);

  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-end-time`).val(timer.mon_access_end_time);
  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-start-time`).val(timer.mon_access_start_time);
  
  if(timer.sunAccess)
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-check-box`).prop('checked', true);
  else
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-check-box`).prop('checked', false);

  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-end-time`).val(timer.sun_access_end_time);
  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-start-time`).val(timer.sun_access_start_time);
 
  if(timer.thuAccess)
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-check-box`).prop('checked', true);
  else
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-check-box`).prop('checked', false);

  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-end-time`).val(timer.thu_access_end_time);
  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-start-time`).val(timer.thu_access_start_time);
 
  if(timer.tueAccess)
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-check-box`).prop('checked', true);
  else
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-check-box`).prop('checked', false);

  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-end-time`).val(timer.tue_access_end_time);
  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-start-time`).val(timer.tue_access_start_time);
  
  if(timer.wedAccess)
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-check-box`).prop('checked', true);
  else
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-check-box`).prop('checked', false);

  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-end-time`).val(timer.wed_access_end_time);
  $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-start-time`).val(timer.wed_access_start_time)  

}

function getTimeObject(index) {
 return {
    index: index,
    accessEndDate: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-end-date`).val(),
    accessStartDate: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-start-date`).val(),
    
    friAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-check-box`).is(':checked'),
    fri_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-end-time`).val(),
    fri_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-start-time`).val(),
    
    monAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-check-box`).is(':checked'),
    mon_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-end-time`).val(),
    mon_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-start-time`).val(),
    
    satAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-check-box`).is(':checked'),
    sat_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-end-time`).val(),
    sat_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-start-time`).val(),
    
    sunAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-check-box`).is(':checked'),
    sun_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-end-time`).val(),
    sun_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-start-time`).val(),
   
    thuAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-check-box`).is(':checked'),
    thu_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-end-time`).val(),
    thu_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-start-time`).val(),
   
    tueAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-check-box`).is(':checked'),
    tue_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-end-time`).val(),
    tue_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-start-time`).val(),
    
    wedAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-check-box`).is(':checked'),
    wed_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-end-time`).val(),
    wed_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-start-time`).val()  
  }
}

function setTimerArray(index) {
  let objIndex = timerArray.findIndex(t => t.index === index);

  if(objIndex > -1) {
    timerArray[objIndex] = getTimeObject(index);
  } else {
    timerArray.push(getTimeObject(index));
  }
}

function openPynwheelAccessTimeModal(index) {
  $(`#pynwheelAccessTimeModal${index}`).modal("show");
  isAllChecked(index)
}

function editPynwheelAccessUser(phoneNumber) {
  blockNumber = 0;
  blockNumbersList = [];
  timerArray = [];
  let selectedUser = filterUserByPhoneNumber(phoneNumber);
  setUserFormData(selectedUser)

  $(".pynwheel-access-modal-title").html("Update Pynwheel Access User");
  $(".pynwheel-access-modal-button").html("Update User");
  getUserAccesses(selectedUser);
}

function getUserAccesses(user) {
  $.ajax({
    url: `/communities/${community.id}/pynwheel_accesses/get_pynwheel_user_accesses`,
    type: "GET",
    data: {phone_number: user.phoneNumber, customer_id: user.customerId}
  }).done(function(resp) {
    if(resp.code === "200" && resp.status === "success") {
      $(".pynwheel-access-addresses-list").empty();
      userData = resp;
      userID = userData.id;


      if(resp.listGetUserAccess) {
        userAccesses = resp.listGetUserAccess.filter((access) => {
          return access["location"] === community.name;
        });

        otherCommunitiesAccesses = resp.listGetUserAccess.filter(x => !userAccesses.some(y => x.id == y.id));
      }

      userAccesses.forEach((access) => {
        addNewPynwheelAccessAddress(access); 
      });

      canAddNewAddress();
      displayUserModal();
    }
  });
}

function onSubLocationChange(index) {
  let subLocationName = $(`#pynwheelAccessLockSubLocation${index}`).val();
  let assignedIds = [];

  if(subLocations.length > 0 && subLocationName) {
    let filteredSubLocation = subLocations.filter((s) => { return s.name === subLocationName});
    
    if(filteredSubLocation.length  > 0){
      blockNumbersList.forEach((i) => {
        if($(`#pynwheelAccessLockDeviceID${i}`).val())
          assignedIds.push($(`#pynwheelAccessLockDeviceID${i}`).val());
      });

      subLoc = filteredSubLocation[0];

      if(assignedIds.includes(subLoc.accessPoint)) {
        alert("Selected Address is already Exists. Please Select New Address.");
        $(`#pynwheelAccessLockDeviceID${index}`).val('');
        $(`#pynwheelAccessLockSubLocation${index}`).val('');
        return;
      }

      $(`#pynwheelAccessLockDeviceID${index}`).val(subLoc.accessPoint);
    }
  } else {
    $(`#pynwheelAccessLockDeviceID${index}`).val('');
  }
}

function isFirstName() {
  if($("#pynwheelAccessUserFirstName").val()) {
    return true;
  } else {
    
    $('.first-name-required').css('display', 'block');
    setTimeout(function(){
      $('.first-name-required').css('display', 'none');
    }, 5000);
    
    return false;
  }
}

function isSecondName() {
  if($("#pynwheelAccessUserSecondName").val()) {
    return true;
  } else {
    
    $('.second-name-required').css('display', 'block');
    setTimeout(function(){
      $('.second-name-required').css('display', 'none');
    }, 5000);

    return false;
  }
}

function isPhoneNumber() {
  if(ITIObject._getFullNumber()) {
    return true;
  } else {
    
    $('.phone-number-required').css('display', 'block');
    setTimeout(function(){
      $('.phone-number-required').css('display', 'none');
    }, 5000);

    return false;
  }
}
function isEmailValid(email) {
  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
}

function onlyNumberKey(evt) {
          
  // Only ASCII charactar in that range allowed
  var ASCIICode = (evt.which) ? evt.which : evt.keyCode
  if (ASCIICode > 31 && (ASCIICode < 48 || ASCIICode > 57))
    return false;

  return true;
}

function isEmail() {
  let email = $("#pynwheelAccessUserEmail").val();

  if(email) {

    if(!isEmailValid(email)) {
      $('.email-required').css('display', 'none');
      $('.email-valid').css('display', 'block');
      setTimeout(function() {
        $('.email-valid').css('display', 'none');
      }, 5000);

      return false;
    } else {
      return true;
    }
  } else {
    $('.email-valid').css('display', 'none');
    $('.email-required').css('display', 'block');
    setTimeout(function(){
      $('.email-required').css('display', 'none');
    }, 5000);

    return false;
  }
}

function isSubloactions() {
  let isSub = true;

  blockNumbersList.forEach((index) => {
    if (!$(`#pynwheelAccessLockSubLocation${index}`).val()) {
      $(`.sub-location-required-${index}`).css('display', 'block');
      setTimeout(function(){
        $(`.sub-location-required-${index}`).css('display', 'none');
      }, 5000);

      isSub = false
    }
  });

  return isSub;
 }

function isFacilityID() {
  let isfac = true;

  blockNumbersList.forEach((index) => {
    if (!$(`#pynwheelAccessLockFacilityID${index}`).val()) {
      $(`.facilityId-required-${index}`).css('display', 'block');
      setTimeout(function(){
        $(`.facilityId-required-${index}`).css('display', 'none');
      }, 5000);

      isfac = false
    }
  });

  return isfac;
 }

function isBadgeID() {
  let isbadge = true;

  blockNumbersList.forEach((index) => {
    if (!$(`#pynwheelAccessLockBadgeID${index}`).val()) {
      $(`.badgeId-required-${index}`).css('display', 'block');
      setTimeout(function(){
        $(`.badgeId-required-${index}`).css('display', 'none');
      }, 5000);

      isbadge = false
    }
  });

  return isbadge;
 }

function isEverythingPresent() {
  let isfirstNamePresent = isFirstName();
  let isSecondNamePresent = isSecondName();
  let isPhoneNumberPresent = isPhoneNumber();
  let isEmailPreset = isEmail();
  let isSubloactionsPresent = isSubloactions();
  let isFacilityPresent = isFacilityID();
  let isBadgePresent = isBadgeID();

  if(isfirstNamePresent && isSecondNamePresent && isPhoneNumberPresent && isEmailPreset && isSubloactionsPresent && isFacilityPresent && isBadgePresent) {
    return true;
  } else {
    return false;
  }

}

function handleAddButtonDisability(flag) {
  $(".pynwheel-access-modal-button").attr('disabled', flag)
}

function addNewPynwheelAccessUser() {
  if(isEverythingPresent()) {
    handleAddButtonDisability(true)
    let firstName = $("#pynwheelAccessUserFirstName").val();
    let secondName = $("#pynwheelAccessUserSecondName").val();
    let phoneNumber = ITIObject._getFullNumber();
    let email = $("#pynwheelAccessUserEmail").val();
    let addressesArray = [];

    blockNumbersList.forEach((index) => {

      let access = userAccesses.filter((access) => {return access.id == index})
      let is_update_access = false;

      if(access.length > 0)
        is_update_access = true;

      let accessJsonObject = {
        access: true,
        accessCode: $(`#pynwheelAccessLockBadgeID${index}`).val(),
        accessEndDate: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-end-date`).val(),
        accessPoint: $(`#pynwheelAccessLockDeviceID${index}`).val(),
        accessStartDate: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-start-date`).val(),
        antiPassBack: parseInt($(`#pynwheelAccessLockAntiPassBack${index}`).val()),
        active: true,
        cardFormat: $(`#pynwheelAccessLockCardFormat${index}`).val(),
        credentialIdentifier: "1234",
        
        facilityId: $(`#pynwheelAccessLockFacilityID${index}`).val(),
        
        friAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-check-box`).is(':checked'),
        fri_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-end-time`).val(),
        fri_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-friday-start-time`).val(),
        
        location: community.name, //Pynwheel HQ or nawal test
        
        monAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-check-box`).is(':checked'),
        mon_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-end-time`).val(),
        mon_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-monday-start-time`).val(),
        
        range: parseInt($(`#pynwheelAccessLockRange${index}`).val()),
        
        satAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-check-box`).is(':checked'),
        sat_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-end-time`).val(),
        sat_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-saturday-start-time`).val(),
        
        subLocation: $(`#pynwheelAccessLockSubLocation${index}`).val(),
        
        sunAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-check-box`).is(':checked'),
        sun_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-end-time`).val(),
        sun_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-sunday-start-time`).val(),
       
        thuAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-check-box`).is(':checked'),
        thu_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-end-time`).val(),
        thu_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-thursday-start-time`).val(),
       
        tueAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-check-box`).is(':checked'),
        tue_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-end-time`).val(),
        tue_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-tuesday-start-time`).val(),
        
        userAccessDurationId: (is_update_access && access[0].userAccessDurationId) ? access[0].userAccessDurationId : 0,
        
        wedAccess: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-check-box`).is(':checked'),
        wed_access_end_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-end-time`).val(),
        wed_access_start_time: $(`#pynwheelAccessTimeModal${index} .pynwheel-access-wednessday-start-time`).val()
      }

      if(is_update_access)
        accessJsonObject["id"] = access[0].id;
      else
        accessJsonObject["id"] = 0;

      addressesArray.push(accessJsonObject);    
    });

    otherCommunitiesAccesses.forEach((access) => {
      access["credentialIdentifier"] = "1234";
      access["active"] = true;
      addressesArray.push(access);
    });

    let userPayload = {
      firstName: firstName,
      lastName: secondName,
      email: email,
      phoneNumber: phoneNumber,
      listAddUserAccess: addressesArray,
      removeExistingAccessDuration: removedAccessDurationIds,
      removedExistingAccess: removedAccessIds
    }

    
    if(userID)
      userPayload["id"] = userID;

    addOrCreateUserWithAccesses(userPayload);
  }
}

function addOrCreateUserWithAccesses(payload) {
  $.ajax({
    url: `/communities/${community.id}/pynwheel_accesses/create_or_update_pynwheel_access_user`,
    type: "POST",
    data: {userData: payload}
  }).done(function() {
    handleAddButtonDisability(false);
    window.location.reload();
  });
}

function todayDate() {
  let today = new Date();
  return (today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate())
}

function tenYearAheadDate() {
  let today = new Date();
  return ((today.getFullYear() + 10) + '-' + (today.getMonth() + 1) + '-' + today.getDate())
}

function getStartDate(access) {
  return (access && access.accessStartDate) ? access.accessStartDate : todayDate();
}

function getEndDate(access) {
  return (access && access.accessEndDate) ? access.accessEndDate : tenYearAheadDate();
}

function getSundayStartTime(access) {
  return (access && access.sun_access_start_time) ? access.sun_access_start_time : "00:00";
}

function getSundayEndTime(access) {
  return (access && access.sun_access_end_time) ? access.sun_access_end_time : "23:59";
}

function getMondayStartTime(access) {
  return (access && access.mon_access_start_time) ? access.mon_access_start_time : "00:00";
}  

function getMondayEndTime(access) {
  return (access && access.mon_access_end_time) ? access.mon_access_end_time : "23:59";
}

function getTuesdayStartTime(access) {
  return (access && access.tue_access_start_time) ? access.tue_access_start_time : "00:00";
}

function getTuesdayEndTime(access) {
  return (access && access.tue_access_end_time) ? access.tue_access_end_time : "23:59";
}

function getWednessdayStartTime(access) {
  return (access && access.wed_access_start_time) ? access.wed_access_start_time : "00:00";
}

function getWednessdayEndTime(access) {
  return (access && access.wed_access_end_time) ? access.wed_access_end_time : "23:59";
}

function getThursdayStartTime(access) {
  return (access && access.thu_access_start_time) ? access.thu_access_start_time : "00:00";
}

function getThursdayEndTime(access) {
  return (access && access.thu_access_end_time) ? access.thu_access_end_time : "23:59";
}

function getFridayStartTime(access) {
  return (access && access.fri_access_start_time) ? access.fri_access_start_time : "00:00";
}

function getFridayEndTime(access) {
  return (access && access.fri_access_end_time) ? access.fri_access_end_time : "23:59";
}

function getSaturdayStartTime(access) {
  return (access && access.sat_access_start_time) ? access.sat_access_start_time : "00:00";
}

function getSaturdayEndTime(access) {
  return (access && access.sat_access_end_time) ? access.sat_access_end_time : "23:59";
}

function getSundayAccess(access) {
  return (access && access.sunAccess) ? "checked" : "";
}

function getMondayAccess(access) {
  return (access && access.monAccess) ? "checked" : "";
}

function getTuesdayAccess(access) {
  return (access && access.tueAccess) ? "checked" : "";
}

function getWednessdayAccess(access) {
  return (access && access.wedAccess) ? "checked" : "";
}

function getThursdayAccess(access) {
 return (access && access.thuAccess) ? "checked" : "";
}

function getFridayAccess(access) {
  return (access && access.friAccess) ? "checked" : "";
}

function getSaturdayAccess(access) {
  return (access && access.satAccess) ? "checked" : "";
}

function isAllChecked(index) {
  if($(`#pynwheelAccessTimeModal${index} input[name='checkboxes']:checkbox:checked`).length >= 7) {
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-check-all`).prop('checked', true)
  } else {
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-check-all`).prop('checked', false)
  }
}

function onCheckAllChange(index) {
  if($(`#pynwheelAccessTimeModal${index} .pynwheel-access-check-all`).prop("checked") == true) {
    $(`#pynwheelAccessTimeModal${index} input[name='checkboxes']`).prop('checked', true);
  } else {
    $(`#pynwheelAccessTimeModal${index} input[name='checkboxes']`).prop('checked', false);
  }
}

function getStartDateValue(index) {
  return Date.parse($(`#pynwheelAccessTimeModal${index} .pynwheel-access-start-date`).val());
}

function getEndDateValue(index) {
  return Date.parse($(`#pynwheelAccessTimeModal${index} .pynwheel-access-end-date`).val());
}

function onDateChange(index) {
  if(getStartDateValue(index) > getEndDateValue(index)) {
    alert("End Date should be greater than Start Date");
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-start-date`).val(todayDate());
    $(`#pynwheelAccessTimeModal${index} .pynwheel-access-end-date`).val(tenYearAheadDate());
  }
}

function pynwheelAddressTimerHTMLModule(access, index) {
  return `
    <div class="modal pynwheel-access-time-modal" id="pynwheelAccessTimeModal${index}" role="dialog" tabindex="-1">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header date-time-header">
            <h3 class="modal-title">
              <strong>Set Day & Time Restrictions</strong>
            </h3>
          </div>
          <div class="modal-body">
            <div class="pynwheel-access-date-block">
              <div class="row">
                <div class="col-lg-6 col-md-6 col-sm-12 pynwheel-access-datefield">
                  <strong>Start Date</strong>
                  <div class="input-group start-date date" data-provide="datepicker">
                    <input class="pynwheel-access-start-date pynwheel-access-date datepicker" data-date-format="yyyy/mm/dd" value="${getStartDate(access)}" onchange="onDateChange(${index})" placeholder="Select start date"></input>
                  </div>
                </div>
                <div class="col-lg-6 col-md-6 col-sm-12 pynwheel-access-datefield">
                  <strong>End Date</strong>
                  <div class="input-group end-date date" data-provide="datepicker">
                    <input class="pynwheel-access-end-date pynwheel-access-date datepicker" data-date-format="yyyy/mm/dd" value="${getEndDate(access)}" onchange="onDateChange(${index})" placeholder="Select end date"></input>
                  </div>
                </div>
              </div>
            </div>
            <span style="color: red">Note: End time should be greater than start time</span>
            <div class="pynwheel-access-time-block">
              <div class="time-entries-header">
                <div class="row">
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <div class="form-check">
                      <input class="pynwheel-access-check-all form-check-input" type="checkbox" onchange=onCheckAllChange(${index}) ${!access ? "checked" : ""} ></input>
                      <label class="form-check-label" for="flexCheckDefault">
                        <strong>Select All</strong>
                      </label>
                    </div>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <strong>Start Time</strong>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <strong>End Time</strong>
                  </div>
                </div>
              </div>
              <div class="time-entries">
                <div class="row day-time-entry">
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <div class="form-check">
                      <input name="checkboxes" onchange="onChangeCheckbox(${index})" class="pynwheel-access-sunday-check-box form-check-input" type="checkbox" ${!access ? "checked" : getSundayAccess(access) } ></input>
                      <label class="form-check-label" for="flexCheckDefault">
                        Sunday
                      </label>
                    </div>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-sunday-start-time pynwheel-access-time-entry bg-grey-v" value=${getSundayStartTime(access)} type="time" ></input>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-sunday-end-time pynwheel-access-time-entry bg-grey-v" value=${getSundayEndTime(access)} type="time" ></input>
                  </div>
                </div>
                <div class="row day-time-entry">
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <div class="form-check">
                      <input name="checkboxes" onchange="onChangeCheckbox(${index})" class="pynwheel-access-monday-check-box form-check-input" type="checkbox" ${!access ? "checked" : getMondayAccess(access) } ></input>
                      <label class="form-check-label" for="flexCheckDefault">
                        Monday
                      </label>
                    </div>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-monday-start-time pynwheel-access-time-entry bg-grey-v" value=${getMondayStartTime(access)} type="time" ></input>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-monday-end-time pynwheel-access-time-entry bg-grey-v" value=${getMondayEndTime(access)} type="time" ></input>
                  </div>
                </div>
                <div class="row day-time-entry">
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <div class="form-check">
                      <input name="checkboxes" onchange="onChangeCheckbox(${index})" class="pynwheel-access-tuesday-check-box form-check-input" type="checkbox" ${!access ? "checked" : getTuesdayAccess(access) } ></input>
                      <label class="form-check-label" for="flexCheckDefault">
                        Tuesday
                      </label>
                    </div>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-tuesday-start-time pynwheel-access-time-entry bg-grey-v" value=${getTuesdayStartTime(access)} type="time" ></input>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-tuesday-end-time pynwheel-access-time-entry bg-grey-v" value=${getTuesdayEndTime(access)} type="time" ></input>
                  </div>
                </div>
                <div class="row day-time-entry">
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <div class="form-check">
                      <input name="checkboxes" onchange="onChangeCheckbox(${index})" class="pynwheel-access-wednessday-check-box form-check-input" type="checkbox" ${!access ? "checked" : getWednessdayAccess(access) } ></input>
                      <label class="form-check-label" for="flexCheckDefault">
                        Wednessday
                      </label>
                    </div>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-wednessday-start-time pynwheel-access-time-entry bg-grey-v" value=${getWednessdayStartTime(access)} type="time" ></input>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-wednessday-end-time pynwheel-access-time-entry bg-grey-v" value=${getWednessdayEndTime(access)} type="time" ></input>
                  </div>
                </div>
                <div class="row day-time-entry">
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <div class="form-check">
                      <input name="checkboxes" onchange="onChangeCheckbox(${index})" class="pynwheel-access-thursday-check-box form-check-input" type="checkbox" ${!access ? "checked" : getThursdayAccess(access) } ></input>
                      <label class="form-check-label" for="flexCheckDefault">
                        Thursday
                      </label>
                    </div>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-thursday-start-time pynwheel-access-time-entry bg-grey-v" value=${getThursdayStartTime(access)} type="time" ></input>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-thursday-end-time pynwheel-access-time-entry bg-grey-v" value=${getThursdayEndTime(access)} type="time" ></input>
                  </div>
                </div>
                <div class="row day-time-entry">
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <div class="form-check">
                      <input name="checkboxes" onchange="onChangeCheckbox(${index})" class="pynwheel-access-friday-check-box form-check-input" type="checkbox" ${!access ? "checked" : getFridayAccess(access) }></input>
                      <label class="form-check-label" for="flexCheckDefault">
                        Friday
                      </label>
                    </div>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-friday-start-time pynwheel-access-time-entry bg-grey-v" value=${getFridayStartTime(access)} type="time" ></input>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-friday-end-time pynwheel-access-time-entry bg-grey-v" value=${getFridayEndTime(access)} type="time" ></input>
                  </div>
                </div>
                <div class="row day-time-entry">
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <div class="form-check">
                      <input name="checkboxes" onchange="onChangeCheckbox(${index})" class="pynwheel-access-saturday-check-box form-check-input" type="checkbox" ${!access ? "checked" : getSaturdayAccess(access) }></input>
                      <label class="form-check-label" for="flexCheckDefault">
                        Saturday
                      </label>
                    </div>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-saturday-start-time pynwheel-access-time-entry bg-grey-v" value=${getSaturdayStartTime(access)} type="time" ></input>
                  </div>
                  <div class="col-lg-4 col-md-4 col-sm-4">
                    <input class="day-list pynwheel-access-saturday-end-time pynwheel-access-time-entry bg-grey-v" value=${getSaturdayEndTime(access)} type="time" ></input>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" onclick="closePynwheelAccessTimeModal(${index})" type="button">Cancel</button>
            <button class="btn btn-primary" onclick="saveAddressDateTime(${index})" type="button">Save</button>
          </div>
        </div>
      </div>
    </div>
  `
}

function getPynwheelAccessAddressModuleHTML(access) {
  let index;

  if(access && access.id)
    index = access.id;
  else
    index = ++blockNumber;


  blockNumbersList.push(index);    
  canAddNewAddress();

  return `
    <form class="pynwheel-access-locks" id="pynwheelAccessAddressModule${index}">
      <div class="row">
        <i aria-hidden="true" class="fa fa-times lock-location-cross" id="pynwheelAccessAddressCross${index}" onclick="onClickClosePynwheelAccessAddressModule(${index})"></i>
      </div>
      <div class="row">
        <div class="col-lg-3 col-md-3 col-sm-6">
          <div class="form-input-group">
            <label for="pynwheelAccessLockLocation">Location</label>
            <span class="red-required-star"> * </span>
            <div class="custom-select">
              <select id="pynwheelAccessLockLocation${index}">
                <option value=${community.name}>${community.name}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-3 col-sm-6">
          <div class="form-input-group">
            <label for="pynwheelAccessLockSubLocation">Sub Location</label>
            <span class="red-required-star"> * </span>
            <div class="custom-select">
              <select id="pynwheelAccessLockSubLocation${index}" onchange="onSubLocationChange(${index})">
                <option value="">Choose sub location</option>
                ${
                  subLocations.map((sub) => {
                    if(access && sub.name == access.subLocation)
                      return `<option value=${sub.name} selected>${sub.name}</option>`
                    else
                      return `<option value=${sub.name}>${sub.name}</option>`
                  })
                }
              </select>
              <span class="red-required-star sub-location-required-${index} required-field">SubLocation is required</span>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-3 col-sm-6">
          <div class="form-input-group">
            <label for="pynwheelAccessLockFacilityID">Facility ID</label>
            <span class="red-required-star"> * </span>
            <input class="form-control" id="pynwheelAccessLockFacilityID${index}" type="text" value=${(access && access.facilityId) ? access.facilityId : "123"}></input>
            <span class="red-required-star facilityId-required-${index} required-field">Facility ID is required</span>
          </div>
        </div>
        <div class="col-lg-2 col-md-2 col-sm-6">
          <div class="form-input-group">
            <label for="pynwheelAccessLockBadgeID">Badge ID</label>
            <span class="red-required-star"> * </span>
            <input class="form-control" id="pynwheelAccessLockBadgeID${index}" type="text" value="5678"></input>
            <span class="red-required-star badgeId-required-${index} required-field">Badge ID is required</span>
            
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-lg-3 col-md-3 col-sm-6">
          <div class="form-input-group">
            <label for="pynwheelAccessLockCardFormat">Card Format</label>
            <span class="red-required-star"> * </span>
            <div class="custom-select">
              <select id="pynwheelAccessLockCardFormat${index}">
                ${
                  cardFormates.map((card) => {
                    if(access && card == access.cardFormat)
                      return `<option value="${card}" selected>${card}</option>`
                    else
                      return `<option value="${card}" >${card}</option>`
                  })
                }
              </select>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-3 col-sm-6">
          <div class="form-input-group">
            <label for="pynwheelAccessLockDeviceID">Device ID</label>
            <span class="red-required-star"> * </span>
            <input class="form-control" id="pynwheelAccessLockDeviceID${index}" type="text" value="${(access && access.accessPoint) ? access.accessPoint : ''}" disabled="disabled"></input>
          </div>
        </div>
        <div class="col-lg-3 col-md-3 col-sm-6">
          <div class="form-input-group">
            <label for="pynwheelAccessLockAntiPassBack">AntiPassBack</label>
            <input class="form-control" id="pynwheelAccessLockAntiPassBack${index}" value=${(access && access.antiPassBack) ? access.antiPassBack : "0"} max="100" min="0" type="number"></input>
          </div>
        </div>
        <div class="col-lg-2 col-md-2 col-sm-6">
          <div class="form-input-group">
            <label for="pynwheelAccessLockRange">Range</label>
            <input class="form-control" id="pynwheelAccessLockRange${index}" value=${(access && access.range) ? access.range : "10"} max="100" min="1" type="number"></input>
          </div>
        </div>
        <div class="col-lg-1 col-md-4 col-sm-6">
          <div class="form-input-group">
            <i aria-hidden="true" id="pynwheelAccessTimer${index}" class="fa fa-clock-o pynwheel-access-address-timer" onclick="openPynwheelAccessTimeModal(${index})"></i>
          </div>
        </div>
      </div>

      ${pynwheelAddressTimerHTMLModule(access, index)}
    </form>    
  `
}

function filterUserByPhoneNumber(phoneNumber) {
  let selectedUser = pynwheelAccessUsers.filter((f) => { return f.phoneNumber == phoneNumber})[0]

  return selectedUser;
}

function displayUserModal() {
  $(`#pynwheel-access-add-user-modal`).modal("show");  
}

function closePynwheelAccessAddUserModal() {
  $(`#pynwheel-access-add-user-modal`).modal("hide");  
}

function closePynwheelAccessTimeModal(index) {
  $(`#pynwheelAccessTimeModal${index}`).modal("hide");

  resetTimerModalValues(index);
}

function saveAddressDateTime(index) {
  $(`#pynwheelAccessTimeModal${index}`).modal("hide");
  setTimerArray(index);
}

function setUserFormData(user) {
  setUserName(user)
  setUserPhoneNumber(user.phoneNumber)
  setUserEmailAddress(user.email)  
}

function setUserEmailAddress(email = "") {
  $("#pynwheelAccessUserEmail").val(email);  
}

function setUserPhoneNumber(phoneNumber = "") {
  if(phoneNumber) {
    $("#pynwheelAccessUserPhone").prop("disabled", true)
    ITIObject.setNumber(`+${phoneNumber}`);
  }
  else {
    ITIObject.setCountry("us");
    $("#pynwheelAccessUserPhone").prop("disabled", false)
    $("#pynwheelAccessUserPhone").val(phoneNumber);  
  }
}

function setUserFirstName(firstName = "") {
  $("#pynwheelAccessUserFirstName").val(firstName); 
}

function setUserSecondName(lastName = "") {
  $("#pynwheelAccessUserSecondName").val(lastName);
}

function setUserName(user) {
  name_arr = user.name.split(" ");
  let firstName = name_arr[0];
  
  name_arr.shift()
  let lastName = name_arr.join("")

  setUserFirstName(firstName);
  setUserSecondName(lastName)
} 

function showDeleteUserModal(phone_number) {
  $("#deletePynwheelAccessModal").modal("show");
  userPhoneNumber = phone_number;
}

function deletePynwheelAccessUser() {
  $.ajax({
    url: `/communities/${community.id}/pynwheel_accesses/delete_pynwheel_access_user`,
    type: "DELETE",
    data: {phone_number: userPhoneNumber}
  }).done(function() {
    window.location.reload();
  });
}

function canAddNewAddress() {
  if(blockNumbersList.length === subLocations.length)
   $(".new-access-btn").prop("disabled", true);
  else
    $(".new-access-btn").prop("disabled", false);
}

function addPynwheelAccessUser() {
  setUserPhoneNumber();
  setUserEmailAddress();
  setUserFirstName();
  setUserSecondName();
  userID = null;
  blockNumber = 0;
  blockNumbersList = [];
  timerArray = [];

  $(".pynwheel-access-modal-title").html("Add Pynwheel Access User");
  $(".pynwheel-access-modal-button").html("Add User");

  $(".pynwheel-access-addresses-list").empty();
  canAddNewAddress();
  addNewPynwheelAccessAddress(null);
  $("#pynwheel-access-add-user-modal").modal("show");
}

function addNewPynwheelAccessAddress(access = null) {
  if(blockNumbersList.length === subLocations.length) {
   $(".new-access-btn").prop("disabled", true);
  } else {
    let pynwheelAccessAddressHTML = getPynwheelAccessAddressModuleHTML(access);
    $(".pynwheel-access-addresses-list").append(pynwheelAccessAddressHTML);
    let temp = [...blockNumbersList];

    setTimerArray(temp.pop());
    $(`.datepicker`).datepicker({
      dateFormat: 'yy-mm-dd',
      startDate: '-3d'
    });
  }
}

function onClickClosePynwheelAccessAddressModule(index) {
  removeBlockNumberFromArray(index)
  $(`#pynwheelAccessAddressModule${index}`).remove();
  canAddNewAddress();
  setRemovedAccessIds(index);
}

function setRemovedAccessIds(index) {
  let accessIndex = userAccesses.findIndex(access => access.id == index);

  if(accessIndex > -1) {
    if(!removedAccessIds.includes(accessIndex)) {
      removedAccessIds.push(userAccesses[accessIndex].id);
    }

    if(!removedAccessDurationIds.includes(accessIndex)) {
      removedAccessDurationIds.push(userAccesses[accessIndex].userAccessDurationId);
    }

  }

}

function removeBlockNumberFromArray(number) {
  const index = blockNumbersList.indexOf(number);
  if (index > -1) {
    blockNumbersList.splice(index, 1);
  }

  const t_index = timerArray.findIndex(t => t.index === number)
  if (index > -1) {
    timerArray = [...timerArray.splice(t_index, 1)];
  }
}