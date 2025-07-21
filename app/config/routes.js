// app/config/routes.js
(function() {
    'use strict';

    angular.module('perpusApp')
        .config(routeConfig);

    // Explicit dependency injection
    routeConfig.$inject = ['$routeProvider', '$locationProvider'];

    function routeConfig($routeProvider, $locationProvider) {
        console.log('Configuring routes...');
        
        try {
            // Set hash prefix untuk URL yang bersih
            $locationProvider.hashPrefix('');
            
            $routeProvider
                // Default route
                .when('/', {
                    redirectTo: '/login'
                })
                
                // Authentication routes
                .when('/login', {
                    templateUrl: 'app/views/auth/login.html',
                    controller: 'LoginController',
                    requireAuth: false
                })
                .when('/register', {
                    templateUrl: 'app/views/auth/register.html',
                    controller: 'RegisterController',
                    requireAuth: false
                })
                
                // Admin routes
                .when('/admin/dashboard', {
                    templateUrl: 'app/views/admin/dashboard.html',
                    controller: 'AdminDashboardController',
                    requireAuth: true,
                    requiredRole: 'admin'
                })
                .when('/admin/kategori', {
                    templateUrl: 'app/views/admin/kategori.html',
                    controller: 'AdminKategoriController',
                    requireAuth: true,
                    requiredRole: 'admin'
                })
                .when('/admin/buku', {
                    templateUrl: 'app/views/admin/buku.html',
                    controller: 'AdminBukuController',
                    requireAuth: true,
                    requiredRole: 'admin'
                })
                .when('/admin/member', {
                    templateUrl: 'app/views/admin/member.html',
                    controller: 'AdminMemberController',
                    requireAuth: true,
                    requiredRole: 'admin'
                })

                .when('/admin/peminjaman', {
                    templateUrl: 'app/views/admin/peminjaman.html',
                    controller: 'AdminBorrowingController',
                    requireAuth: true,
                    requiredRole: 'admin'
                })
                
                // Member routes
                .when('/member/dashboard', {
                    templateUrl: 'app/views/member/dashboard.html',
                    controller: 'MemberDashboardController',
                    requireAuth: true,
                    requiredRole: 'member'
                })
                .when('/member/buku', {
                    templateUrl: 'app/views/member/buku.html',
                    controller: 'MemberBukuController',
                    requireAuth: true,
                    requiredRole: 'member'
                })
                .when('/member/peminjaman', {
                    templateUrl: 'app/views/member/peminjaman.html',
                    controller: 'MemberPeminjamanController',
                    requireAuth: true,
                    requiredRole: 'member'
                })
                
                // Error routes
                .when('/unauthorized', {
                    template: '<div class="container mt-5"><div class="alert alert-danger text-center"><h4><i class="fas fa-exclamation-triangle"></i> Akses Ditolak</h4><p>Anda tidak memiliki akses ke halaman ini.</p><a href="#/login" class="btn btn-primary"><i class="fas fa-sign-in-alt"></i> Kembali ke Login</a></div></div>'
                })
                
                // 404 Not Found
                .when('/404', {
                    template: '<div class="container mt-5"><div class="alert alert-warning text-center"><h4><i class="fas fa-exclamation-circle"></i> Halaman Tidak Ditemukan</h4><p>Halaman yang Anda cari tidak ditemukan.</p><a href="#/login" class="btn btn-primary"><i class="fas fa-home"></i> Kembali ke Beranda</a></div></div>'
                })
                
                // Default fallback
                .otherwise({
                    redirectTo: '/404'
                });
                
            console.log('Routes configured successfully');
        } catch (error) {
            console.error('Error configuring routes:', error);
        }
    }

})();