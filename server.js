'use strict';
/**
 * Module dependencies.
 */
var _ = require('lodash');
var init = require('./config/init')(),
    http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
    monitor = require('./management/cluster'),
    config = require('./config/config'),
    mongoose = require('mongoose'),
    commandLineParser = require('./config/utilities/commandLineParser'),
    coremessaging = require('./management/coremessaging');

function hash(ip, seed) {
  var hash = ip.reduce(function(r, num) {
    r += parseInt(num, 10);
    r %= 2147483648;
    r += (r << 10)
    r %= 2147483648;
    r ^= r >> 6;
    return r;
  }, seed);

  hash += hash << 3;
  hash %= 2147483648;
  hash ^= hash >> 11;
  hash += hash << 15;
  hash %= 2147483648;

  return hash >>> 0;
}

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */

// Bootstrap db connection
var db = mongoose.connect(config.db);

var app;

if (cluster.isMaster) {
  console.info('Server PID: ' + process.pid);
  
  var workers = [];
  var commandLineArguments = commandLineParser.parse();
  coremessaging.initializeAmqp(config.amqpPath);
 
  var emitMessageToWorkers = function(message, fromWorker) {
    _.forEach(cluster.workers, function(worker) {
      if (message.originalSenderProcessId !== worker.process.pid) {
        worker.send(message);
      } 
    });
    if (fromWorker)
      coremessaging.emitToAmqp(message);
  };
  coremessaging.connectMasterIpcListener(emitMessageToWorkers);
  
  var debug = process.execArgv.indexOf('--debug') !== -1;
    cluster.setupMaster({
    execArgv: process.execArgv.filter(function(s) { return s !== '--debug'; })
  });
  
  var port = commandLineArguments.port || config.port || 3000;
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
        emitMessageToWorkers(message, true);
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
    workers.push(newWorker);
    initializeWorkerHttpProcess(newWorker);
  }
  
  // If an HTTP instance dies, respawn it
  cluster.on('exit', function(oldWorker, code, signal) {
    _.remove(workers, function(worker) {
      return worker.id === oldWorker.id;
    })
    var newWorker = spawnWorker(oldWorker, null);
    workers.push(newWorker);
    initializeWorkerHttpProcess(newWorker);
    updateMonitor();
  });
  
  coremessaging.publish('new.server.online', { cores: coreCount });
  
  var net = require('net');
  var seed = ~~(Math.random() * 1e9);
  var stickyServer = net.createServer(function(socket) { //'connection' listener
    // Get int31 hash of ip
    var worker,
        ipHash = hash((socket.remoteAddress || '').split(/\./g), seed);

    // Pass connection to worker
    // TODO: try to find a different persistent value to hash... 
    var index = (ipHash % workers.length);
    worker = workers[index];
    worker.send('sticky-session:connection', socket);
  }).listen(port, function(){
    console.log('Net Server listening on port ' + port + '...');
  });
} else {
  // Init the express application
  app = require('./config/express')(db);

  // Bootstrap passport config
  require('./config/passport')();
  
  var server = http.createServer(app);
  var io = require('socket.io').listen(server);
  
  var clientComm = require('./app/services/socketio');
  clientComm.init(io);
  
  var oldListen = server.listen;
  server.listen = function listen() {
    var lastArg = arguments[arguments.length - 1];

    if (typeof lastArg === 'function') lastArg();

    return oldListen.call(this, null);
  };
  
  coremessaging.connectMasterIpcListener(
    function(message) {
      cluster.worker.send(message);
    }
  );
  
  cluster.worker.on('message', function(message, socket) {
    if (message.type === 'httpstart') {
      var processId = cluster.worker.process.pid;
      console.log('Process: ' + processId + ', listening on provided socket connection...');

      monitor.setPort(message.port);
      monitor.setDebugPort(message.debugPort);
      monitor.setProcess(processId);
    } else if (message.type === 'updatemonitor') {
      monitor.setProcesses(message.processes);
    } else if (message.type === 'comm') {
      coremessaging.getOnMessageToWorkerIpcConsumer()(message);
    } else if (message === 'sticky-session:connection') {
      // The net server in master tells us which socket to use
      // Then we forward this information to the http server
      server.emit('connection', socket);
    }
  });
  
  
  var users = [];
  io.on('connection', function(socket) {
    console.log('user connected');
    if (users.indexOf(socket.id) === -1) {
      users.push(socket.id);
    }
    
    socket.on('disconnect', function(o) {
      var index = users.indexOf(socket.id);
      if (index !== -1) {
        users.splice(index, 1);
      }
      console.log(users.length + ' users are connected.');
    });
  });
}

// Expose app
exports = module.exports = app;
