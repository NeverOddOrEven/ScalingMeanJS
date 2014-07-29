angular.module('core')
  .directive('server', ['$window', 
    function($window) {
      return {
        restrict: 'EA',
        scope: false,
        templateUrl: 'modules/core/views/directive-templates/server.directive.html'
      };
    }
  ]);