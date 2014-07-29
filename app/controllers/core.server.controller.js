'use strict';

var messaging = require('../services/messaging'),
    clientcomm = require('../services/socketio');

var uuid = require('node-uuid');


messaging.subscribe('server.update', function(message) {
  clientcomm.publish('server.update.client', message);
});

/**
 * Module dependencies.
 */
exports.index = function(req, res) {
  res.render('index', {
		user: req.user || null
	});
};