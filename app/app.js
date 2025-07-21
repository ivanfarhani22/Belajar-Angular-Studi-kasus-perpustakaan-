// app/app.js
(function() {
    'use strict';

    angular.module('perpusApp', [
        'ngRoute',
        'ngCookies'
    ])
    .run(appRun);

    console.log('perpusApp module initialized successfully');

    appRun.$inject = ['$rootScope', '$location', '$cookies', 'AuthService'];

    function appRun($rootScope, $location, $cookies, AuthService) {
        console.log('perpusApp run block started');

        // Route change start event
        $rootScope.$on('$routeChangeStart', function(event, next, current) {
            console.log('Route changing to:', next.templateUrl);
            
            // Check if route requires authentication
            if (next.requireAuth) {
                if (!AuthService.isLoggedIn()) {
                    console.log('User not logged in, redirecting to login');
                    event.preventDefault();
                    $location.path('/login');
                    return;
                }

                // Check role requirements
                if (next.requiredRole) {
                    var user = AuthService.getCurrentUser();
                    if (!user || user.role !== next.requiredRole) {
                        console.log('User role mismatch, redirecting to unauthorized');
                        event.preventDefault();
                        $location.path('/unauthorized');
                        return;
                    }
                }
            }

            // Redirect logged in users away from auth pages
            if (next.templateUrl && (next.templateUrl.indexOf('login') !== -1 || next.templateUrl.indexOf('register') !== -1)) {
                if (AuthService.isLoggedIn()) {
                    var user = AuthService.getCurrentUser();
                    console.log('User already logged in, redirecting to dashboard');
                    event.preventDefault();
                    
                    if (user && user.role === 'admin') {
                        $location.path('/admin/dashboard');
                    } else {
                        $location.path('/member/dashboard');
                    }
                    return;
                }
            }
        });

        // Route change success event
        $rootScope.$on('$routeChangeSuccess', function(event, current, previous) {
            console.log('Route changed successfully to:', current.templateUrl);
        });

        // Route change error event
        $rootScope.$on('$routeChangeError', function(event, current, previous, rejection) {
            console.error('Route change error:', rejection);
            $location.path('/login');
        });

        // Global logout function
        $rootScope.logout = function() {
            console.log('Global logout called');
            AuthService.logout();
        };

        // Global function to check if user is logged in
        $rootScope.isLoggedIn = function() {
            return AuthService.isLoggedIn();
        };

        // Global function to get current user
        $rootScope.getCurrentUser = function() {
            return AuthService.getCurrentUser();
        };

        // Handle browser back/forward buttons
        $rootScope.$on('$locationChangeStart', function(event, next, current) {
            // Add any additional logic here if needed
        });
    }

})();