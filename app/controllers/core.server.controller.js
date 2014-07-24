'use strict';

var MessageService = require('../services/messaging');

/**
 * Module dependencies.
 */
exports.index = function(req, res) {
	console.log(MessageService.debugInfo());
  res.render('index', {
		user: req.user || null
	});
};