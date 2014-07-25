'use strict';

//var cluster = require('cluster'),
//    MessageService = require('../services/messaging').initialize();

//MessageService.registerListener(cluster.worker, listenForMessages);

var listenForMessages = function(message) {
  console.log('Core.Server.Controller received the message');
}

/**
 * Module dependencies.
 */
exports.index = function(req, res) {
	console.log(MessageService.debugInfo());
  res.render('index', {
		user: req.user || null
	});
};