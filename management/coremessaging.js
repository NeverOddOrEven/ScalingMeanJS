var amqp = require('./amqp');
var _ = require('lodash');
var cluster = require('cluster');
var uuid = require('node-uuid');

function CoreMessaging() {
  var _amqpService = null;
  var _clientCallbacks = [];  // When worker callback invoked, it will call these
  var _masterCallback = null; // When master receives an IPC message
  var _workerCallback = null; // When worker receives an IPC message
  var _serverId = uuid.v4();
  
  function buildMessage(type, route, messageContent, originalSenderProcessId) {
    return {
      type: type,
      route: route,
      message: messageContent,
      originalSenderProcessId: originalSenderProcessId
    };
  }
  
  function initializeAmqp(amqpServerPath) {
    if (_amqpService === null) {
      _amqpService = amqp.service(amqpServerPath);
      connectAmqpListener();
    }
  }
  
  // End point consumers will register their methods with this
  function connectListener(route, callbackMethod) {
    if (!_clientCallbacks[route])
      _clientCallbacks[route] = [];
    
    _clientCallbacks[route].push(callbackMethod);
  }
  
  // If a worker receives a message then it needs to be forwarded
  function onWorkerIpcMessage(message) {
    if (!_clientCallbacks[message.route]) {
      console.info('No clients registered to receive message on route: ' + message.route.toString());
    }
    
    _.forEach(_clientCallbacks[message.route], function(method) {
      method(message.message);
    });
  }
  
  // If a master receives a message then it needs to be transmitted to everyone else
  function onMasterIpcMessage(message) {
    emitToAmqp(message);
    emitToNonOriginChildProcesses(message);
  }
  function onAmqpMessage(message) {
    if (message.serverId !== _serverId)
      emitToNonOriginChildProcesses(message);
  }
  
  // Message forwarding services used by master process
  function emitToAmqp(message) {
    _.assign(message, {serverId: _serverId});
    _.assign(message, {originalSenderProcessId: null});
    if (_amqpService) {
      console.log('going out to amqp');
      _amqpService.sendMessage(message);
    } else {
      console.info('Amqp not connected');
    }
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
  
  // Message sent in by the application messaging service 
  // May appear this is not going to the message bus, however it is...
  //   workers can not send directly to the bus, only master may
  function publish(route, messageBody) {
    var message = buildMessage('comm', route, messageBody, process.pid);
    emitToNonOriginChildProcesses(message);
  }
  
  return {
    // Used by core server
    initializeAmqp: initializeAmqp,
    connectMasterIpcListener: connectMasterIpcListener,
    emitToAmqp: emitToAmqp,
    getOnMessageToWorkerIpcConsumer: getOnMessageToWorkerIpcConsumer,
    
    // Client app messaging api
    subscribe: connectListener,
    publish: publish
  }
}

module.exports = exports = new CoreMessaging();
