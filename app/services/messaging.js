'use strict';

var coremessaging = require('../../management/coremessaging');
var cluster = require('cluster');
var _ = require('lodash');


var AppMessaging = function() {
  

  var _amqp = null;
  
  function subscribe(callback) {
    coremessaging.subscribe(callback);
  }
  
  function publish(message) {
    coremessaging.publish(message);
  }
  
  return {
    subscribe: subscribe,
    publish: publish
  };
};

module.exports = exports = new AppMessaging();
