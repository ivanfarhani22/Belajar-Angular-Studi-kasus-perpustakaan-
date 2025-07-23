angular.module('perpusApp')
    .controller('AdminDashboardController', [
        '$scope', '$http', 'AuthService', '$interval',
        function ($scope, $http, AuthService, $interval) {

            // Initialize
            $scope.currentUser = AuthService.getCurrentUser();
            $scope.loading = false;
            $scope.error = '';

            // Dashboard stats
            $scope.stats = {
                totalBooks: 0,
                totalStock: 0,
                totalMembers: 0,
                totalEmployees: 0,
                totalBorrowed: 0,
                totalReturned: 0
            };

            // API endpoint
            $scope.dashboardApiUrl = 'http://perpus-api.mamorasoft.com/api/book/dashboard';

            // Load dashboard stats
            $scope.loadDashboardStats = function () {
                $scope.loading = true;
                $scope.error = '';
                                
                $http.get($scope.dashboardApiUrl)
                    .then(function (response) {
                        
                        if (response.data && response.data.status === 200 && response.data.data && response.data.data.dashboard) {
                            const dashboard = response.data.data.dashboard;
                            
                            $scope.stats = {
                                totalBooks: dashboard.totalBuku || 0,
                                totalStock: dashboard.totalStok || 0,
                                totalMembers: dashboard.totalMember || 0,
                                totalEmployees: dashboard.totalPegawai || 0,
                                totalBorrowed: dashboard.totalDipinjam || 0,
                                totalReturned: dashboard.totalDikembalikan || 0
                            };
                            
                        } else {
                            $scope.error = 'Format response API tidak valid';
                        }
                    })
                    .catch(function (error) {
                        $scope.error = 'Gagal memuat data dashboard';
                        
                        // Reset stats
                        $scope.stats = {
                            totalBooks: 0,
                            totalStock: 0,
                            totalMembers: 0,
                            totalEmployees: 0,
                            totalBorrowed: 0,
                            totalReturned: 0
                        };
                    })
                    .finally(function () {
                        $scope.loading = false;
                    });
            };

            // Refresh dashboard
            $scope.refreshDashboard = function () {
                $scope.loadDashboardStats();
            };

            // Helper functions
            $scope.getTotalBooks = function () {
                return $scope.stats.totalBooks;
            };

            $scope.getTotalStock = function () {
                return $scope.stats.totalStock;
            };

            $scope.getTotalMembers = function () {
                return $scope.stats.totalMembers;
            };

            $scope.getTotalEmployees = function () {
                return $scope.stats.totalEmployees;
            };

            $scope.getTotalBorrowed = function () {
                return $scope.stats.totalBorrowed;
            };

            $scope.getTotalReturned = function () {
                return $scope.stats.totalReturned;
            };

            // Navigation functions (implement sesuai routing)
            $scope.navigateToBooks = function () {
                // window.location.href = '#/books';
            };

            $scope.navigateToMembers = function () {
                // window.location.href = '#/members';
            };

            $scope.navigateToBorrows = function () {
                // window.location.href = '#/borrows';
            };

            $scope.navigateToEmployees = function () {
                // window.location.href = '#/employees';
            };

            // Clear error
            $scope.clearError = function () {
                $scope.error = '';
            };

            // Logout
            $scope.logout = function () {
                AuthService.logout();
            };

            // Auto refresh setiap 5 menit
            var autoRefreshInterval = $interval(function () {
                $scope.loadDashboardStats();
            }, 300000); // 5 menit

            // Cleanup
            $scope.$on('$destroy', function () {
                if (autoRefreshInterval) {
                    $interval.cancel(autoRefreshInterval);
                }
            });

            // Initialize
            $scope.loadDashboardStats();
        }
    ]);