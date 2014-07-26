'use strict';

var messaging = require('../services/messaging');

  (function() {
    setTimeout(function() {
      messaging.publish('magic' + process.pid);
    }, 5000);
  })();
  

messaging.subscribe(function(message) {
  console.log('1 - ' + message);
});

messaging.subscribe(function(message) {
  console.log('2 - ' + message);
});

/**
 * Module dependencies.
 */
exports.index = function(req, res) {
  res.render('index', {
		user: req.user || null
	});
};