// app/services/api.service.js
(function() {
    'use strict';

    angular.module('perpusApp')
        .service('ApiService', ApiService)
        .config(httpConfig);

    ApiService.$inject = ['$http', '$cookies'];
    httpConfig.$inject = ['$httpProvider'];

    function ApiService($http, $cookies) {
        var service = {
            get: get,
            post: post,
            put: put,
            delete: deleteRequest,
            postFormData: postFormData,
            postFormUrlEncoded: postFormUrlEncoded
        };

        var API_BASE = 'http://perpus-api.mamorasoft.com/api';

        return service;

        function get(endpoint, params) {
            return $http({
                method: 'GET',
                url: API_BASE + endpoint,
                params: params,
                headers: getHeaders()
            });
        }

        function post(endpoint, data) {
            return $http({
                method: 'POST',
                url: API_BASE + endpoint,
                data: data,
                headers: getHeaders('application/json')
            });
        }

        function put(endpoint, data) {
            return $http({
                method: 'PUT',
                url: API_BASE + endpoint,
                data: data,
                headers: getHeaders('application/json')
            });
        }

        function deleteRequest(endpoint) {
            return $http({
                method: 'DELETE',
                url: API_BASE + endpoint,
                headers: getHeaders()
            });
        }

        function postFormData(endpoint, formData) {
            return $http({
                method: 'POST',
                url: API_BASE + endpoint,
                data: formData,
                headers: getHeaders('multipart/form-data'),
                transformRequest: angular.identity
            });
        }

        function postFormUrlEncoded(endpoint, data) {
            var params = new URLSearchParams();
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    params.append(key, data[key]);
                }
            }

            return $http({
                method: 'POST',
                url: API_BASE + endpoint,
                data: params.toString(),
                headers: getHeaders('application/x-www-form-urlencoded')
            });
        }

        function getHeaders(contentType) {
            var headers = {};
            
            if (contentType && contentType !== 'multipart/form-data') {
                headers['Content-Type'] = contentType;
            }

            var token = $cookies.get('authToken');
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }

            return headers;
        }
    }

    function httpConfig($httpProvider) {
        $httpProvider.interceptors.push('AuthInterceptor');
    }

})();

// HTTP Interceptor untuk handle token dan error
(function() {
    'use strict';

    angular.module('perpusApp')
        .factory('AuthInterceptor', AuthInterceptor);

    AuthInterceptor.$inject = ['$cookies', '$location', '$q'];

    function AuthInterceptor($cookies, $location, $q) {
        return {
            request: request,
            responseError: responseError
        };

        function request(config) {
            var token = $cookies.get('authToken');
            if (token && config.url.indexOf('perpus-api.mamorasoft.com') !== -1) {
                config.headers = config.headers || {};
                config.headers.Authorization = 'Bearer ' + token;
            }
            return config;
        }

        function responseError(rejection) {
            if (rejection.status === 401) {
                // Token expired or invalid
                $cookies.remove('authToken');
                $cookies.remove('currentUser');
                $location.path('/login');
            }
            return $q.reject(rejection);
        }
    }

})();