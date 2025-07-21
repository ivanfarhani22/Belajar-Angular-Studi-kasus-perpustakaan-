// app/services/auth.service.js
(function() {
    'use strict';

    angular.module('perpusApp')
        .service('AuthService', AuthService);

    AuthService.$inject = ['$http', '$cookies', '$location', '$q'];

    function AuthService($http, $cookies, $location, $q) {
        var service = {
            login: login,
            register: register,
            logout: logout,
            isLoggedIn: isLoggedIn,
            getCurrentUser: getCurrentUser,
            getToken: getToken,
            setToken: setToken,
            removeToken: removeToken
        };

        var API_BASE = 'http://perpus-api.mamorasoft.com/api';
        var currentUser = $cookies.getObject('currentUser') || null;

        return service;

        function login(credentials) {
            var deferred = $q.defer();

            // Prepare form data for API
            var params = new URLSearchParams();
            params.append('username', credentials.username);
            params.append('password', credentials.password);

            $http({
                method: 'POST',
                url: API_BASE + '/login',
                data: params.toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
            .then(function(response) {
                console.log('Login response:', response.data);
                
                // Check if response is successful and contains token
                if (response.data && response.data.data && response.data.data.token) {
                    // Save token
                    setToken(response.data.data.token);
                    
                    // Set current user from API response
                    currentUser = {
                        id: response.data.data.user.id,
                        username: response.data.data.user.username,
                        name: response.data.data.user.name,
                        email: response.data.data.user.email,
                        role: response.data.data.user.roles && response.data.data.user.roles.length > 0 
                            ? response.data.data.user.roles[0].name 
                            : 'member' // Default role
                    };
                    
                    // Save user info in cookies
                    $cookies.putObject('currentUser', currentUser);
                    
                    // Redirect based on role
                    if (currentUser.role === 'admin') {
                        $location.path('/admin/dashboard');
                    } else {
                        $location.path('/member/dashboard');
                    }
                    
                    deferred.resolve({
                        success: true,
                        user: currentUser,
                        token: response.data.data.token,
                        message: response.data.message
                    });
                } else {
                    // Handle case where API returns success but no token
                    deferred.resolve({
                        success: false,
                        message: response.data.message || 'Invalid credentials'
                    });
                }
            })
            .catch(function(error) {
                console.error('Login error:', error);
                
                // Handle different error scenarios
                var errorMessage = 'Login failed';
                
                if (error.data) {
                    if (error.data.message) {
                        errorMessage = error.data.message;
                    } else if (error.data.error) {
                        errorMessage = error.data.error;
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                deferred.reject({
                    success: false,
                    message: errorMessage,
                    data: error.data
                });
            });

            return deferred.promise;
        }

        function register(userData) {
            var deferred = $q.defer();

            // Prepare form data for API
            var params = new URLSearchParams();
            params.append('name', userData.name);
            params.append('username', userData.username);
            params.append('email', userData.email);
            params.append('password', userData.password);
            params.append('confirm_password', userData.confirm_password);

            $http({
                method: 'POST',
                url: API_BASE + '/register',
                data: params.toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
            .then(function(response) {
                console.log('Register response:', response.data);
                deferred.resolve({
                    success: true,
                    message: response.data.message || 'Registration successful'
                });
            })
            .catch(function(error) {
                console.error('Register error:', error);
                
                var errorMessage = 'Registration failed';
                if (error.data && error.data.message) {
                    errorMessage = error.data.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                deferred.reject({
                    success: false,
                    message: errorMessage,
                    data: error.data
                });
            });

            return deferred.promise;
        }

        function logout() {
            removeToken();
            currentUser = null;
            $cookies.remove('currentUser');
            $location.path('/login');
        }

        function isLoggedIn() {
            var token = getToken();
            var user = getCurrentUser();
            return !!(token && user);
        }

        function getCurrentUser() {
            if (!currentUser) {
                currentUser = $cookies.getObject('currentUser');
            }
            return currentUser;
        }

        function getToken() {
            return $cookies.get('authToken');
        }

        function setToken(token) {
            $cookies.put('authToken', token);
        }

        function removeToken() {
            $cookies.remove('authToken');
        }
    }

})();