$(function() {
    console.log('--------------- --------')
    console.log('c id =' , $("#widget-button").attr("data-community-id"))
    console.log('b id =' , $("#widget-button").attr("data-browser-id"))
    console.log('--------------- --------')

    var community_id = $("#widget-button").attr("data-community-id")
    var browser_id = $("#widget-button").attr("data-browser-id")
    if (community_id != undefined && community_id != "" && browser_id != "" && browser_id != undefined){
        App.cable.subscriptions.create({channel: "LoggedInChannel" , community_id: community_id , browser_id: browser_id});
    }
});
 