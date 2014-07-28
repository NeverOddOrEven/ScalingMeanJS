'use strict';

var ClientComm = function() {
  var _socketio = null;
  
  function init(io) {
    _socketio = io;
  }
  
  function subscribe(route, callback) {
    //_.subscribe(route, callback);
  }
  
  function publish(route, message) {
    _socketio.emit(route, message);
  }
  
  if (_socketio === null) {
    console.log('NULLLLL');
    return {
      init: init
    };
  } else {
    return {
      subscribe: subscribe,
      publish: publish
    };
  }
};

module.exports = exports = new ClientComm();
