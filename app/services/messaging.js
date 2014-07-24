'use strict';

/*
 * Messaging Service
 * Manages the interprocess communication and pubsub on the message bus
 *
 */
var amqpService = require('../../management/amqp').service;

var MessageService = function() {
  function addProcessCallback(cb) {
  }

  function sendMessage(message) {
  }

  return {
    addProcessCallback: addProcessCallback,
    sendMessage: sendMessage
  };
};

module.exports = exports = new MessageService();
