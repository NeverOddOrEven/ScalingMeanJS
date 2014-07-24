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
        mongoose = require('mongoose');

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
  var debug = process.execArgv.indexOf('--debug') !== -1;
    cluster.setupMaster({
    execArgv: process.execArgv.filter(function(s) { return s !== '--debug'; })
  });
  
  var port = config.port || 3000;
  var debugPort = config.debugPort || 5858;
  var coreCount = os.cpus().length;
  
  cluster.on('exit', function(oldWorker, code, signal) {
    console.dir(arguments);
    if (debug) {
      var workerDebugPort = oldWorker.debugPort;
      cluster.settings.execArgv.push('--debug=' + workerDebugPort);
      var newWorker = cluster.fork();
      _.assign(newWorker, {debugPort: workerDebugPort});
      cluster.settings.execArgv.pop();
    } else {
      cluster.fork();
    }
  });

  for (var i = 1; i <= (config.workers || coreCount); ++i) {
    if (debug) {
      var workerDebugPort = debugPort + i;
      cluster.settings.execArgv.push('--debug=' + workerDebugPort);
      var worker = cluster.fork();
      _.assign(worker, {debugPort: workerDebugPort});
      cluster.settings.execArgv.pop();
    }
    else {
      cluster.fork();
    }
  }
  var processIds = _.mapValues(cluster.workers, function(worker) { return worker.process.pid; });

  var initializeWorkerHttpProcess = function (process) {
    process.on('online', function() {
      process.send({type: 'monitor', port: port, debugPort: process.debugPort, processes: processIds});
    });

    cluster.on('exit', function(worker, code, signal) {
      console.info('Worker ' + worker.process.pid + ' died');
    });
  };
  
  for (var key in cluster.workers) {
    initializeWorkerHttpProcess(cluster.workers[key]);
  }
  
} else {
  cluster.worker.on('message', function(message) {
    if (message.type === 'monitor') {
      var processId = cluster.worker.process.pid;
      console.log('Process: ' + processId + ', listening on port: ' + message.port + '...');
      app.listen(message.port);
      monitor.setPort(message.port);
      monitor.setDebugPort(message.debugPort);
      monitor.setProcess(processId);
      monitor.setProcesses(message.processes);
    }
  });
}

// Expose app
exports = module.exports = app;
