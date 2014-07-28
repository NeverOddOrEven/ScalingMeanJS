'use strict';

var messaging = require('../services/messaging'),
    clientcomm = require('../services/socketio');

messaging.subscribe('new.server.online', function(message) {
  clientcomm.publish('test', {hi: 'hi'});
});

/**
 * Module dependencies.
 */
exports.index = function(req, res) {
  res.render('index', {
		user: req.user || null
	});
};