var ITIObject;
var pynwheel_access_user_id = null;
var community;
var should_update = false;

$(document).ready(function() {
  $('#pyn-miyazaki').dataTable({
    "searching": true
  });

  $(".datepicker").datepicker({
    dateFormat: "yy-mm-dd"
  });

  const userPhone = document.querySelector("#pynwheelAccessUserPhone")
  if (userPhone) {
    ITIObject = intlTelInput(userPhone, {
      separateDialCode: true
    });
  }

  community = $("#pynwheelAccessUsersData").data("community");
});

function addPynwheelaccessUserModal() {
  console.log("Pynwheel access users modal");
  resetPynwheelAccessUser();
  $(".pynwheel-access-modal-title").html("Add Pynwheel Access User");
  $(".pynwheel-access-modal-button").html("Add User");
  $("#pynwheel-access-add-user-modal").modal("show");
  should_update = false;
}

function closePynwheelAccessAddUserModal() {
  $(`#pynwheel-access-add-user-modal`).modal("hide");  
}

function editPynwheelAccessUser(user) {
  $(".pynwheel-access-modal-title").html("Update Pynwheel Access User");
  $(".pynwheel-access-modal-button").html("Update User");
  $("#pynwheel-access-add-user-modal").modal("show");
  setPynwheelAccessUser(user);
  should_update = true;
  pynwheel_access_user_id = user.id;
}

function addNewPynwheelAccessUser() { 
  if(validateFormFields()) {
    let payload = getPynwheelUserPayload();

    if(should_update)
      updatePynwheelAccessUser(payload)
    else
      createPynwheelAccessUser(payload)
  }
}

function createPynwheelAccessUser(payload){
  $.ajax({
    url: `/communities/${community.id}/pynwheel_access_users`,
    type: "POST",
    data: {pynwheel_access_user: payload}
  }).done(function() {
    window.location.reload();
  });
}

function updatePynwheelAccessUser(payload) {
  $.ajax({
    url: `/communities/${community.id}/pynwheel_access_users/${pynwheel_access_user_id}`,
    type: "PUT",
    data: {pynwheel_access_user: payload}
  }).done(function() {
    window.location.reload();
  });
}

function validateFormFields() {
  if(isFirstNamePresent() && isLastNamePresent() && isUserTypePresent() && isPhoneNumberPresent() && isEmailPresent() )
    return true;
  else 
    return false;
}

function isMoveInDatePresent() {
  let moveInDate = $('#pynwheelUserMoveInDate').val();
  console.log(moveInDate);
  if(moveInDate) {
    return true;
  } else {
    
    $('.move-in-date').css('display', 'block');
    setTimeout(function(){
      $('.move-in-date').css('display', 'none');
    }, 3000);

    return false;
  }
}

function isMoveOutDatePresent() {
  let moveOutDate = $('#pynwheelUserMoveOutDate').val();

  if(moveOutDate) {
    return true;
  } else {
    
    $('.move-out-date').css('display', 'block');
    setTimeout(function(){
      $('.move-out-date').css('display', 'none');
    }, 3000);

    return false;
  }
}

function isLeaseInDatePresent() {
  let leaseInDate = $('#pynwheelUserLeaseInDate').val();

  if(leaseInDate) {
    return true;
  } else {
    
    $('.lease-in-date').css('display', 'block');
    setTimeout(function(){
      $('.lease-in-date').css('display', 'none');
    }, 3000);

    return false;
  }
}

function isLeaseOutDatePresent() {
  let leaseOutDate = $('#pynwheelUserLeaseOutDate').val();

  if(leaseOutDate) {
    return true;
  } else {
    
    $('.lease-out-date').css('display', 'block');
    setTimeout(function(){
      $('.lease-out-date').css('display', 'none');
    }, 3000);

    return false;
  }
}

function isUserTypePresent() {
  let userType = $("#pynwheel-access-user-type").val();

  if(userType) {
    return true;
  } else {
    
    $('.user-type-required').css('display', 'block');
    setTimeout(function(){
      $('.user-type-required').css('display', 'none');
    }, 3000);

    return false;
  }
}

function isEmailPresent() {
  let email = $("#pynwheelAccessUserEmail").val();

  if(email) {

    if(!isEmailValid(email)) {
      $('.email-required').css('display', 'none');
      $('.email-valid').css('display', 'block');
      setTimeout(function() {
        $('.email-valid').css('display', 'none');
      }, 3000);

      return false;
    } else {
      return true;
    }
  } else {
    $('.email-valid').css('display', 'none');
    $('.email-required').css('display', 'block');
    setTimeout(function(){
      $('.email-required').css('display', 'none');
    }, 3000);

    return false;
  }
}

function isEmailValid(email) {
  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
}

function isPhoneNumberPresent() {
  if(ITIObject._getFullNumber()) {
    return true;
  } else {
    
    $('.phone-number-required').css('display', 'block');
    setTimeout(function(){
      $('.phone-number-required').css('display', 'none');
    }, 3000);

    return false;
  }
}

function isLastNamePresent() {
  if($("#pynwheelAccessUserSecondName").val()) {
    return true;
  } else {
    
    $('.second-name-required').css('display', 'block');
    setTimeout(function(){
      $('.second-name-required').css('display', 'none');
    }, 3000);

    return false;
  }
}

function isFirstNamePresent() {
  if($("#pynwheelAccessUserFirstName").val()) {
    return true;
  } else {
    
    $('.first-name-required').css('display', 'block');
    setTimeout(function(){
      $('.first-name-required').css('display', 'none');
    }, 3000);
    
    return false;
  }
}

function onlyNumberKey(evt) {
  var ASCIICode = (evt.which) ? evt.which : evt.keyCode
  if (ASCIICode > 31 && (ASCIICode < 48 || ASCIICode > 57))
    return false;

  return true;
}

function getPynwheelUserPayload() {
  return {
    name: $('#pynwheelAccessUserFirstName').val() + ' ' + $('#pynwheelAccessUserSecondName').val(),
    first_name: $('#pynwheelAccessUserFirstName').val(),
    last_name: $('#pynwheelAccessUserSecondName').val(),
    email: $('#pynwheelAccessUserEmail').val(),
    phone_number: ITIObject._getFullNumber(),
    move_in_date: $('#pynwheelUserMoveInDate').val(),
    move_out_date: $('#pynwheelUserMoveOutDate').val(),
    lease_in_date: $('#pynwheelUserLeaseInDate').val(),
    lease_out_date: $('#pynwheelUserLeaseOutDate').val(),
    user_type: $("#pynwheel-access-user-type").val(),
    community_id: community.id
  }
}

function setPynwheelAccessUser(user) {
  $('#pynwheelAccessUserFirstName').val(user.first_name);
  $('#pynwheelAccessUserSecondName').val(user.last_name);
  $('#pynwheelAccessUserEmail').val(user.email);
  $('#pynwheelUserMoveInDate').datepicker("setDate", formatedDate(user.move_in_date));
  $('#pynwheelUserMoveOutDate').datepicker("setDate", formatedDate(user.move_out_date));
  $('#pynwheelUserLeaseInDate').datepicker("setDate", formatedDate(user.lease_in_date));
  $('#pynwheelUserLeaseOutDate').datepicker("setDate", formatedDate(user.lease_out_date));

  ITIObject.setNumber(user.phone_number);
  $('#pynwheel-access-user-type>option[value="' + user.user_type + '"]').prop('selected', true);
}

function resetPynwheelAccessUser() {
  $('#pynwheelAccessUserFirstName').val("");
  $('#pynwheelAccessUserSecondName').val("");
  $('#pynwheelAccessUserEmail').val("");
  
  $('#pynwheelUserMoveInDate').datepicker("setDate", '');
  $('#pynwheelUserMoveOutDate').datepicker("setDate", '');
  $('#pynwheelUserLeaseInDate').datepicker("setDate", '');
  $('#pynwheelUserLeaseOutDate').datepicker("setDate", '');

  ITIObject.setNumber('');
  $('#pynwheel-access-user-type>option[value="' + "" + '"]').prop('selected', true);
}

function formatedDate(date) {
  if(date)
    return date.split("T")[0];
  else
    return null;
}

function showDeleteUserModal(user_id) {
  $("#deletePynwheelAccessModal").modal("show");
  pynwheel_access_user_id = user_id;
}

function deletePynwheelAccessUser() {
  if(pynwheel_access_user_id && community.id){
    $.ajax({
      url: `/communities/${community.id}/pynwheel_access_users/${pynwheel_access_user_id}`,
      type: "DELETE",
    }).done(function() {
      window.location.reload();
    });
  }

  $("#deletePynwheelAccessModal").modal("hide");
}

function manageAccessesModal(user) {
  console.log("manageAccessesModal");
  console.log(user);
  $("#pynwheelManageAccessesModal").modal("show");
}

function closeManageAccessesModal() {
  $("#pynwheelManageAccessesModal").modal("hide");
}

function managePynwheelUserAccesses() {
  $("#pynwheelManageAccessesModal").modal("hide");
}