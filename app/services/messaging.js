'use strict';

/*
 * Messaging Service
 * Manages the interprocess communication and pubsub on the message bus
 *
 */
var cluster = require('cluster');
var _ = require('lodash');


var MessageService = function() {
  var _amqp = null;
  
  function initialize(amqpServerPath) {
    if (cluster.isMaster && _amqp === null) {
      var amqpService = require('../../management/amqp');
      amqpServerPath 
        ? _amqp = amqpService.service(amqpServerPath) 
        : _amqp = amqpService.service();
      
      if (_amqp !== null)
        _amqp.addConsumer(onAmqpMessage);
      
      return this;
    }
  }
  
  function registerListener(worker, callback) {
    /*cluster.worker.on('message', function(message) {
      // Other messages get sent; ignore them unless they are 'comm' messages
      if (!message.type || message.type !== 'comm')
        return;

      if (cluster.isMaster) {
        // Send out to message bus
        sendMessageToExchange(message);

        // Send out to the other processes
        var relevantWorkers = _.select(cluster.workers, function (w) {
          return w.process.pid !== message.originalSenderProcessId;
        });
        sendMessageTo(relevantWorkers, message);
      }

      if (cluster.isWorker) {
        callback(message);
      }
    });*/
  }
  
  
  // Message broker
  function onAmqpMessage(message) {
    if (cluster.isMaster)
      sendMessageTo(cluster.workers, message);
    
    if (cluster.isWorker) 
      console.error('workers should not be receiving amqp messages...');
  }
  
  function sendMessageToExchange(message) {
    if (_amqp !== null)
      _amqp.sendMessage(message);
    else
      console.info('Not able to send message to exchange...');
  }

  function sendMessageTo(workers, message) {
    _.forEach(workers, function(worker) {
      worker.send(message);
    });
  }

  
  function sendMessage(message) {
    var wrapMessage = function(message) {
      return {
        type: 'comm',
        originalSenderProcessId: cluster.worker.process.pid,
        message: message
      };
    }
    
    if (cluster.isMaster) {
      console.info('Sending messages from the master process not supported at this time...');
      //var wrappedMessage = wrapMessage(message);
      //sendMessageToExchange(wrappedMessage);
      //sendMessageTo(cluster.workers, wrappedMessage);
    }
    
    if (cluster.isWorker) {
      cluster.worker.send(wrapMessage(message));
    }
  }
  
  function addOutboundAmqpCallback(cb) {
    _outboundAmqpCb = cb;
  }
  
  function addOutboundIpcCallback(cb) {
    _outboundIpcCb = cb;
  }
  
  // Master process received a message
  function onAmqpMessage(message) {
    
  }
  
  // Master process received a message
  function onMasterIpcMessage(message) {
  }
  
  // Worker received a message
  function onWorkerIpcMessage(message) {
  }
  
  return {
    initialize: initialize,
    registerListener: registerListener,
    sendMessage: sendMessage
  };
};

module.exports = exports = new MessageService();
