(function() {
    'use strict';

    angular.module('perpusApp')
        .controller('RegisterController', RegisterController);

    RegisterController.$inject = ['$scope', '$location', 'AuthService'];

    function RegisterController($scope, $location, AuthService) {

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
        $scope.userData = {
            name: '',
            username: '',
            email: '',
            password: '',
            confirm_password: ''
        };
        
        $scope.loading = false;
        $scope.error = '';
        $scope.success = '';
        $scope.showPassword = false;
        $scope.showConfirmPassword = false;

        // Functions
        $scope.register = register;
        $scope.goToLogin = goToLogin;
        $scope.togglePassword = togglePassword;
        $scope.toggleConfirmPassword = toggleConfirmPassword;
        $scope.clearMessages = clearMessages;

        function register() {
            
            // Basic validation
            if (!validateForm()) {
                return;
            }

            $scope.loading = true;
            $scope.error = '';
            $scope.success = '';

            AuthService.register($scope.userData)
                .then(function(response) {
                    $scope.loading = false;
                    
                    if (response.success) {
                        $scope.success = 'Registrasi berhasil! Silakan login.';
                        // Reset form
                        $scope.userData = {
                            name: '',
                            username: '',
                            email: '',
                            password: '',
                            confirm_password: ''
                        };
                        
                        // Redirect to login after 2 seconds
                        setTimeout(function() {
                            $scope.$apply(function() {
                                $location.path('/login');
                            });
                        }, 2000);
                    } else {
                        $scope.error = response.message || 'Registrasi gagal';
                    }
                })
                .catch(function(error) {
                    $scope.loading = false;
                    
                    if (error.data && error.data.message) {
                        $scope.error = error.data.message;
                    } else if (error.message) {
                        $scope.error = error.message;
                    } else {
                        $scope.error = 'Registrasi gagal. Silakan coba lagi.';
                    }
                });
        }

        function validateForm() {
            var data = $scope.userData;
            
            // Check required fields
            if (!data.name || !data.username || !data.email || !data.password || !data.confirm_password) {
                $scope.error = 'Semua field harus diisi';
                return false;
            }

            // Check email format
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                $scope.error = 'Format email tidak valid';
                return false;
            }

            // Check password length
            if (data.password.length < 6) {
                $scope.error = 'Password minimal 6 karakter';
                return false;
            }

            // Check password confirmation
            if (data.password !== data.confirm_password) {
                $scope.error = 'Password dan konfirmasi password tidak cocok';
                return false;
            }

            return true;
        }

        function goToLogin() {
            $location.path('/login');
        }

        function togglePassword() {
            $scope.showPassword = !$scope.showPassword;
        }

        function toggleConfirmPassword() {
            $scope.showConfirmPassword = !$scope.showConfirmPassword;
        }

        function clearMessages() {
            $scope.error = '';
            $scope.success = '';
        }

        // Watch for changes in userData to clear messages
        $scope.$watch('userData', function() {
            if ($scope.error || $scope.success) {
                clearMessages();
            }
        }, true);
    }

})();