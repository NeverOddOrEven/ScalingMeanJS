'use strict';

var _ = require('lodash');
var cluster = require('cluster');

var ClientComm = function() {
  var _socketio = null;
  var _queue = [];
  
  function init(io) {
    _socketio = io;
    emptyQueue();
  }
  
  function emptyQueue() {
    console.log('Queued items: ' + _queue.length);
    _.forEach(_queue, function(message) {
      _queue.remove(message);
      publish(message.route, message.message);
      console.log('sending');
    });
  }
  
  function subscribe(route, callback) {
    //_.subscribe(route, callback);
  }
  
  function publish(route, message) {
    if (_socketio === null) { 
      console.log('saving message: ' + JSON.stringify(message) + '. Is Master: ' + cluster.isMaster);
      _queue.push({route: route, message: message});
    } else {
      if (_socketio.numConnectedClients > 0) {
        console.log('sending message');
        _socketio.emit(route, JSON.stringify(message));
      }
    }
  }

  return {
    init: init,
    subscribe: subscribe,
    publish: publish
  };
};

module.exports = exports = new ClientComm();
