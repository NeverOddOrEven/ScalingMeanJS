'use strict';


angular.module('core').controller('HomeController', ['$scope', '$location', 'Authentication',
	function($scope, $location, Authentication) {
		// This provides Authentication context.
		$scope.authentication = Authentication;
    
    var url = $location.protocol() + '://' + $location.host() + ':' + $location.port();
    console.log(url);
    
    var _socket = io.connect(url) || null;
    
	}
]);