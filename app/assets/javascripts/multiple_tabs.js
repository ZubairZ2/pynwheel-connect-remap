var current_user_id, current_user_role, allowed_roles;
var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime)
var isFirefox = typeof InstallTrigger !== 'undefined';


window.addEventListener('load', function () {           // after page is fully loaded
    current_user_id = $( "body" ).data( "user-id" )
    current_user_role = $( "body" ).data( "user-role" )
    allowed_roles = ["Super admin", "Community admin", "Dwelo admin", "Community manager"]
    already_called = false

    if(allowed_roles.includes(current_user_role) && current_user_id != "undefined" && $("#widget-button").length == 1){
        if(window.localStorage.getItem('tabs_count') == null || window.localStorage.getItem('tabs_count') == 0){
            window.localStorage.setItem('tabs_count', 1)
            chat_service_available()
        }
        else if(window.localStorage.getItem('tabs_count') >= 1){
            window.localStorage.setItem('tabs_count', (parseInt(window.localStorage.getItem('tabs_count')) + 1))
        }
        already_called = true
    }

    // if user is just logged in but there were already centain tabs (inactive) present
    if(already_called == false && window.localStorage.getItem('tabs_count') >= 1){
        chat_service_available()
    }
})

window.addEventListener('beforeunload', function () {

    if (allowed_roles.includes(current_user_role) && current_user_id != "undefined" && $("#widget-button").length == 1){
        if(window.localStorage.getItem('tabs_count') > 0)
            window.localStorage.setItem('tabs_count', (parseInt(window.localStorage.getItem('tabs_count')) - 1))
        if(window.localStorage.getItem('tabs_count') <= 0){
            window.localStorage.setItem('tabs_count', 0)
            chat_service_not_available()
        }

        if(isChrome){
            console.log("Blocking for 50 mili-seconds...");
            sleep(200);
            console.log("Done!!");
        }
        else{
            console.log("Blocking for 200 mili-seconds...");
            sleep(200);
            console.log("Done!!");
        }
    }
});

window.addEventListener('storage', storageChange)

function storageChange (event) {
    console.log("total tabs are ", event.newValue)
}

function chat_service_available(){
    $.ajax({ type: 'POST', cache: false, url: '/users/' + current_user_id + '/turn_on_chat'  })
}


function chat_service_not_available(){
    $.ajax({ type: 'POST', cache: false, url: '/users/' + current_user_id + '/turn_off_chat' })
}

function sleep(delay) {
    var start = new Date().getTime();
    while (new Date().getTime() < start + delay);
}