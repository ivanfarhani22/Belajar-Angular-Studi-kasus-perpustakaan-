(function() {
    'use strict';

    angular.module('perpusApp')
        .controller('LoginController', LoginController);

    LoginController.$inject = ['$scope', '$location', 'AuthService'];

    function LoginController($scope, $location, AuthService) {

        // Check if user is already logged in
        if (AuthService.isLoggedIn()) {
            var user = AuthService.getCurrentUser();
            if (user && user.role === 'admin') {
                $location.path('/admin/dashboard');
            } else {
                $location.path('/member/dashboard');
            }
            return;
        }

        // Initialize scope variables
        $scope.credentials = {
            username: '',
            password: ''
        };
        
        $scope.loading = false;
        $scope.error = '';
        $scope.showPassword = false;

        // Functions
        $scope.login = login;
        $scope.goToRegister = goToRegister;
        $scope.togglePassword = togglePassword;
        $scope.clearError = clearError;

        function login() {
            
            // Basic validation
            if (!$scope.credentials.username || !$scope.credentials.password) {
                $scope.error = 'Username dan password harus diisi';
                return;
            }

            $scope.loading = true;
            $scope.error = '';

            AuthService.login($scope.credentials)
                .then(function(response) {
                    $scope.loading = false;
                    
                    if (response.success) {
                        // Success feedback
                        // Show success message if needed
                        if (response.message) {
                        }
                        // Redirect is handled in AuthService
                    } else {
                        $scope.error = response.message || 'Login gagal';
                    }
                })
                .catch(function(error) {
                    $scope.loading = false;
                    
                    // Handle error messages more gracefully
                    if (error && error.message) {
                        $scope.error = error.message;
                    } else if (error && error.data && error.data.message) {
                        $scope.error = error.data.message;
                    } else {
                        $scope.error = 'Login gagal. Silakan coba lagi.';
                    }
                    
                    // Apply scope changes
                    $scope.$apply();
                });
        }

        function goToRegister() {
            $location.path('/register');
        }

        function togglePassword() {
            $scope.showPassword = !$scope.showPassword;
        }

        function clearError() {
            $scope.error = '';
        }

        // Watch for changes in credentials to clear error
        $scope.$watch('credentials', function() {
            if ($scope.error) {
                $scope.error = '';
            }
        }, true);
    }

})();