'use strict';

/*
 * Messaging Service
 * Manages the interprocess communication and pubsub on the message bus
 *
 */
var cluster = require('cluster');
var _ = require('lodash');


var MessageService = function() {
  var _amqp;
  
  function initialize(amqpServerPath) {
    if (cluster.isMaster) {
      var amqpService = require('../../management/amqp');
      amqpServerPath 
        ? _amqp = amqpServerPath.service(amqpServerPath) 
        : _amqp = amqpServerPath.service();
      
      _amqp.addConsumer(onAmqpMessage);
    }
  }
  
  function registerWorker(worker, callback) {
      worker.on('message', function(message) {
        // Other messages get sent; ignore them unless they are 'comm' messages
        if (!message.type || message.type !== 'comm')
          return;
        
        if (cluster.isMaster) {
          // Send out to message bus
          _amqp.sendMessage(message);

          // Send out to the other processes
          var relevantWorkers = _.select(cluster.workers, function (w) {
            return w.process.pid !== message.originalSenderProcessId;
          });
          sendMessageTo(relevantWorkers, message);
        }
        
        if (cluster.isWorker) {
          callback(message);
        }
      });
    }
  }
  
  // Message broker
  function onAmqpMessage(message) {
    if (cluster.isMaster)
      sendMessageTo(cluster.workers, message);
    
    if (cluster.isWorker) 
      console.error('workers should not be receiving amqp messages...');
  }
  
  function sendMessageTo(workers, message) {
    _.forEach(workers, function(worker) {
      worker.send(message);
    });
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  function processMessageFromAmqp(message) {
    if (cluster.isMaster) {
      cluster.sendMessage(message);
    }
    
    if (cluster.isWorker) {
      console.error('This code should never be reached unless worker processes are allowed to listen to AMQP channels.');
    }
  }
  
  function sendMessage(message, exceptProcessId) {
    //
    // A master node needs to communicate with all child processes, as well as the world
    //
    if (cluster.isMaster) {
      // Tell all other master listeners
      amqpService.sendMessage(message);
      
      // Tell all local processes, except the one specified (because it's the message origin)
      _.forEach(cluster.workers, 
                  function(worker) { 
                    if (worker.process.pid !== exceptProcessId) {
                      worker.send(message);
                    }
                  }
               );
    } 
    
    //
    // If a worker is trying to send a message, the next stop is the master node
    //
    if (cluster.isWorker) {
      cluster.worker.sendMessage(message);
    }
  }

  function debugInfo() {
    console.info(cluster);
  }
  
  return {
    init: initialize(),
    addProcessCallback: addProcessCallback,
    sendMessage: sendMessage
  };
};

module.exports = exports = new MessageService();
