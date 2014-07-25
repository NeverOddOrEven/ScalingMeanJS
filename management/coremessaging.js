var amqp = require('./amqp');
var _ = require('lodash');
var cluster = require('cluster');

function CoreMessaging() {
  var _amqpService = null;
  var _clientCallbacks = [];  // When worker callback invoked, it will call these
  var _masterCallback = null; // When master receives an IPC message
  var _workerCallback = null; // When worker receives an IPC message
  
  (function() {
    if (cluster.isMaster) {
      setTimeout(function() {
        emitToAmqp('hello');
      }, 5000);
    }
  })();
  
  
  function initializeAmqp(amqpServerPath) {
    if (_amqpService === null) {
      _amqpService = amqp.service(amqpServerPath);
      connectAmqpListener();
    }
  }
  
  // End point consumers will register their methods with this
  function connectListener(callbackMethod) {
    _clientCallbacks.push(callbackMethod);
  }
  
  // If a worker receives a message then it needs to be handled
  function onWorkerIpcMessage(message) {
    if (_clientCallbacks.length === 0)
      console.info('No clients registered to receive messages');
    
    _.forEach(_clientCallbacks, function(method) {
      method(message);
    });
  }
  
  // If a master receives a message then it needs to be transmitted to everyone else
  function onMasterIpcMessage(message) {
    emitToAmqp(message);
    emitToNonOriginChildProcesses(message);
  }
  function onAmqpMessage(message) {
    emitToNonOriginChildProcesses(message);
  }
  
  // Message forwarding services used by master process
  function emitToAmqp(message) {
    console.log('emitting message');
    if (_amqpService)
      _amqpService.sendMessage({messageObject: message});
    else 
      console.info('Amqp not connected');
  }
  function emitToNonOriginChildProcesses(message) {
    if (_masterCallback)
      _masterCallback(message);
    else
      console.info('not able to send to other processes, no master callback connected');
  }
  
  // The connections necessary to the server core
  function connectAmqpListener() {
    if (_amqpService)
      _amqpService.addConsumer({consumerCallback: onAmqpMessage});
    else
      console.info('Amqp not connected');
  }
  function connectMasterIpcListener(callbackMethod) {
    _masterCallback = callbackMethod;
  }
  function getOnMessageToWorkerIpcConsumer() {
    return onWorkerIpcMessage;
  }
  
  return {
    // Used by core server
    initializeAmqp: initializeAmqp,
    connectMasterIpcListener: connectMasterIpcListener,
    getOnMessageToWorkerIpcConsumer: getOnMessageToWorkerIpcConsumer,
    
    // Client usability
    connectListener: connectListener
  }
}

module.exports = exports = new CoreMessaging();
