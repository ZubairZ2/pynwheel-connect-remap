if(($('meta[name=action-cable-url]')).length){
  (function() {
    App.chat = App.cable.subscriptions.create({ channel: "ChatChannel" , support: 1}, {
      connected: function() {},
      disconnected: function() {},
      received: function(data) {
        return $('.Pyn_Modal').append("<div>" + data['message'] + "</div>");
      },
      speak: function(message) {}
    });

  }).call(this);
}


// App.chat = App.cable.subscriptions.create "ChatChannel",
//   connected: ->
//     # Called when the subscription is ready for use on the server

//   disconnected: ->
//     # Called when the subscription has been terminated by the server

//   received: (data) ->
//     $('.Pyn_Modal').append("<div>" + data['message'] + "</div>");
//     # Called when there's incoming data on the websocket for this channel

//   speak: (message) ->
//     # created for futher use if required