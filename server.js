'use strict';
/**
 * Module dependencies.
 */
var _ = require('lodash');
var init = require('./config/init')(),
        cluster = require('cluster'),
        os = require('os'),
        monitor = require('./management/cluster'),
        config = require('./config/config'),
        mongoose = require('mongoose'),
        coremessaging = require('./management/coremessaging');

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */

// Bootstrap db connection
var db = mongoose.connect(config.db);

// Init the express application
var app = require('./config/express')(db);

// Bootstrap passport config
require('./config/passport')();

if (cluster.isMaster) {
  coremessaging.initializeAmqp(config.amqpPath);
  
  var emitMessageToWorkers = function(message) {
    _.forEach(cluster.workers, function(worker) {
      if (message.originalSenderProcessId != worker.process.pid) {
        worker.send(message);
      } 
    });
  };
  coremessaging.connectMasterIpcListener(emitMessageToWorkers);
  
  var debug = process.execArgv.indexOf('--debug') !== -1;
    cluster.setupMaster({
    execArgv: process.execArgv.filter(function(s) { return s !== '--debug'; })
  });
  
  var port = config.port || 3000;
  var debugPort = config.debugPort || 5858;
  var coreCount = os.cpus().length;
  
  var updateMonitor = function() {
    var processIds = _.mapValues(cluster.workers, function(worker) { return worker.process.pid; });
    _.forEach(cluster.workers, function(worker) {
      worker.send({type: 'updatemonitor', processes: processIds});
    });
  }
  
  var initializeWorkerHttpProcess = function (worker) {
    worker.on('online', function() {
      worker.send({type: 'httpstart', port: port, debugPort: process.debugPort});
      updateMonitor();
    });
    worker.on('listening', function() {
      // The HTTP server is now accepting requests
    });
    worker.on('message', function(message) {
      // A worker sent master a message
      if (message.type === 'comm') {
        emitMessageToWorkers(message);
      }
    });
  };
  
  var spawnWorker = function(deadWorker, debugPort) {
    if (!debug)
      return cluster.fork();
    
    var workerDebugPort = deadWorker === null ? debugPort : deadWorker.debugPort;
    cluster.settings.execArgv.push('--debug=' + workerDebugPort);
    var newWorker = cluster.fork();
    _.assign(newWorker, {debugPort: workerDebugPort});
    cluster.settings.execArgv.pop();
    
    return newWorker;
  }
  
  // Spin up HTTP servers
  for (var i = 1; i <= (config.workers || coreCount); ++i) {
    var newWorker = spawnWorker(null, debugPort + i);
    initializeWorkerHttpProcess(newWorker);
  }
  
  // If an HTTP server dies, respawn it
  cluster.on('exit', function(oldWorker, code, signal) {
    var newWorker = spawnWorker(oldWorker, null);
    initializeWorkerHttpProcess(newWorker);
    updateMonitor();
  });
} else {
  coremessaging.connectMasterIpcListener(
    function(message) {
      cluster.worker.send(message);
    }
  );
  
  cluster.worker.on('message', function(message) {
    if (message.type === 'httpstart') {
      var processId = cluster.worker.process.pid;
      console.log('Process: ' + processId + ', listening on port: ' + message.port + '...');
      app.listen(message.port);
      monitor.setPort(message.port);
      monitor.setDebugPort(message.debugPort);
      monitor.setProcess(processId); 
    } else if (message.type === 'updatemonitor') {
      monitor.setProcesses(message.processes);
    } else if (message.type === 'comm') {
      coremessaging.getOnMessageToWorkerIpcConsumer()(message);
    }
  });
}

// Expose app
exports = module.exports = app;
