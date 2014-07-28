'use strict';

var messaging = require('../services/messaging'),
    clientcomm = require('../services/socketio');


messaging.subscribe('new.server.online', function(message) {
  clientcomm.publish('test', {hi: 'hi'});
});

for (var i = 1; i <= 10; ++i) {
  setTimeout(function() {
    clientcomm.publish('test', 'hello there');
  }, i * 5000);
}

/**
 * Module dependencies.
 */
exports.index = function(req, res) {
  res.render('index', {
		user: req.user || null
	});
};