'use strict';


angular.module('core').controller('HomeController', ['$scope', '$location', 'Authentication', 
	function($scope, $location, Authentication) {
		// This provides Authentication context.
		$scope.authentication = Authentication;
    
    $scope.servers = [];
    
    $scope.$watchCollection('servers', function() { return true; });
    
    var url = $location.protocol() + '://' + $location.host() + ':' + $location.port();
    console.log(url);
    
    var _socket = io.connect(url) || null;

    _socket.on('server.update.client', function(d) {
      // AngularJS can't see async events that originate outside of angular functionality
      $scope.$apply(updateUi(d));
    });
               
    function updateUi(d) {
      var data = JSON.parse(d);

      $scope.server = data;
      
      var currentTimeInMs = (new Date()).getTime();
      data.timeStamp = currentTimeInMs;
      
      var found = false;
      for (var i = 0; i < $scope.servers.length; ++i) {
        if ($scope.servers[i].serverId === data.serverId) {
          found = true;
          $scope.servers[i].timeStamp = data.timeStamp;
        }
        
        var lastUpdateDuration = currentTimeInMs - $scope.servers[i].timeStamp;

        if (lastUpdateDuration < 5000) {
          $scope.servers[i].status = 'ok';
        } else if (lastUpdateDuration < 10000) {
          $scope.servers[i].status = 'warn';
        } else if (lastUpdateDuration < 15000) {
          $scope.servers[i].status = 'fail';
        }
        
        if (lastUpdateDuration > 15001) {
          console.log('removing');
          $scope.servers.splice(i, 1);
        }
      }
      
      
      
      if (!found) {
        $scope.servers.push(data);
      }
    }
	}
]);