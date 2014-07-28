'use strict';

var coremessaging = require('../../management/coremessaging');

var AppMessaging = function() {
  function subscribe(route, callback) {
    coremessaging.subscribe(route, callback);
  }
  
  function publish(route, message) {
    coremessaging.publish(route, message);
  }
  
  return {
    subscribe: subscribe,
    publish: publish
  };
};

module.exports = exports = new AppMessaging();
