(function () {
    'use strict';

    angular
        .module('perpusApp')
        .controller('MemberDashboardController', MemberDashboardController);

    MemberDashboardController.$inject = ['$scope', '$timeout', 'AuthService', 'BorrowService'];

    function MemberDashboardController($scope, $timeout, AuthService, BorrowService) {
        $scope.loading = true;
        $scope.error = null;
        $scope.currentUser = null;

        $scope.stats = {
            totalBorrowed: 0,
            activeBorrows: 0,
            returnedBooks: 0,
            overdueBooks: 0
        };

        $scope.recentBorrows = [];
        $scope.recentReturns = [];

        $scope.formatDate = function (dateStr) {
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
        };

        $scope.getRemainingDays = function (returnDate) {
            if (!returnDate) return 0;
            const now = new Date();
            const due = new Date(returnDate);
            const diffTime = due - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0;
        };

        $scope.isOverdue = function (returnDate) {
            if (!returnDate) return false;
            return new Date() > new Date(returnDate);
        };

        // Improved function to get actual status
        $scope.getActualStatus = function (borrow) {
            // Check if already returned
            if (borrow.tanggal_pengembalian_actual || 
                borrow.tanggal_kembali_aktual || 
                borrow.actual_return_date ||
                borrow.returned_at) {
                return 'returned';
            }
            
            // Check numeric status
            var status = parseInt(borrow.status);
            switch(status) {
                case 1: return 'pending';
                case 2: return 'borrowed';
                case 3: return 'returned';
                default: 
                    // Check string status as fallback
                    if (typeof borrow.status === 'string') {
                        return borrow.status.toLowerCase();
                    }
                    return 'pending';
            }
        };

        $scope.getStatusClass = function (status) {
            switch (status) {
                case 'borrowed': return 'badge-warning';
                case 'returned': return 'badge-success';
                case 'overdue': return 'badge-danger';
                case 'pending': return 'badge-info';
                default: return 'badge-secondary';
            }
        };

        $scope.logout = function () {
            AuthService.logout();
        };

        function transformBorrowData(raw) {
            var actualStatus = $scope.getActualStatus(raw);
            
            // Check if overdue
            if (actualStatus === 'borrowed' && $scope.isOverdue(raw.tanggal_pengembalian)) {
                actualStatus = 'overdue';
            }
            
            return {
                id: raw.id,
                book_title: raw.book?.judul || 'Tidak diketahui',
                borrow_date: raw.tanggal_peminjaman,
                return_date: raw.tanggal_pengembalian,
                return_date_actual: raw.tanggal_pengembalian_actual,
                status: actualStatus,
                raw_status: raw.status // Keep original for debugging
            };
        }

        function transformReturnData(raw) {
            return {
                book_title: raw.book?.judul || 'Tidak diketahui',
                return_date: raw.tanggal_pengembalian_actual || raw.tanggal_pengembalian
            };
        }

        function calculateStats(borrowsData) {
            console.log('Calculating stats from data:', borrowsData);
            
            var stats = {
                totalBorrowed: 0,
                activeBorrows: 0,
                returnedBooks: 0,
                overdueBooks: 0
            };
            
            if (!Array.isArray(borrowsData)) {
                console.warn('borrowsData is not an array:', borrowsData);
                return stats;
            }
            
            stats.totalBorrowed = borrowsData.length;
            
            borrowsData.forEach(function(borrow) {
                var actualStatus = $scope.getActualStatus(borrow);
                
                console.log('Borrow item:', {
                    id: borrow.id,
                    book_title: borrow.book?.judul,
                    raw_status: borrow.status,
                    actual_status: actualStatus,
                    return_date: borrow.tanggal_pengembalian,
                    actual_return_date: borrow.tanggal_pengembalian_actual
                });
                
                switch(actualStatus) {
                    case 'returned':
                        stats.returnedBooks++;
                        break;
                    case 'borrowed':
                        stats.activeBorrows++;
                        // Check if overdue
                        if ($scope.isOverdue(borrow.tanggal_pengembalian)) {
                            stats.overdueBooks++;
                        }
                        break;
                    case 'pending':
                        // Pending borrows are not active yet
                        break;
                }
            });
            
            console.log('Calculated stats:', stats);
            return stats;
        }

        function init() {
            const user = AuthService.getCurrentUser();

            if (!user || !user.id) {
                $scope.error = 'Gagal mengambil data user. Silakan login kembali.';
                $scope.loading = false;
                return;
            }

            $scope.currentUser = user;
            console.log('Current user:', user);

            // Get member ID
            var memberId = user.id || BorrowService.getCurrentMemberId();
            
            if (!memberId) {
                $scope.error = 'ID member tidak ditemukan. Silakan login kembali.';
                $scope.loading = false;
                return;
            }

            console.log('Loading data for member ID:', memberId);

            Promise.all([
                // Recent borrows (limit 5)
                BorrowService.getMemberBorrows(memberId, 1, 5),
                // All borrows for statistics
                BorrowService.getMemberBorrows(memberId, 1, 1000), // Use large number to get all
                // Return list
                BorrowService.getReturnList({ member_id: memberId })
            ])
                .then(function ([recentBorrowsResult, allBorrowsResult, returnListResult]) {
                    console.log('API Results:', {
                        recentBorrows: recentBorrowsResult,
                        allBorrows: allBorrowsResult,
                        returnList: returnListResult
                    });

                    // Data Peminjaman Terbaru
                    if (recentBorrowsResult.success && Array.isArray(recentBorrowsResult.data)) {
                        $scope.recentBorrows = recentBorrowsResult.data.map(transformBorrowData);
                        console.log('Transformed recent borrows:', $scope.recentBorrows);
                    } else {
                        console.warn('Recent borrows result not successful or data not array:', recentBorrowsResult);
                    }

                    // Statistik from all borrows
                    if (allBorrowsResult.success && Array.isArray(allBorrowsResult.data)) {
                        $scope.stats = calculateStats(allBorrowsResult.data);
                    } else {
                        console.warn('All borrows result not successful or data not array:', allBorrowsResult);
                    }

                    // Data Pengembalian Terbaru
                    if (returnListResult.success && Array.isArray(returnListResult.data)) {
                        $scope.recentReturns = returnListResult.data
                            .filter(item => item.id_member == memberId) // Use == for loose comparison
                            .map(transformReturnData)
                            .slice(0, 5);
                        console.log('Transformed recent returns:', $scope.recentReturns);
                    } else {
                        console.warn('Return list result not successful or data not array:', returnListResult);
                    }
                })
                .catch(function (err) {
                    console.error('Dashboard Error:', err);
                    $scope.error = 'Gagal memuat data dashboard. Silakan coba lagi.';
                })
                .finally(function () {
                    $timeout(function () {
                        $scope.loading = false;
                        console.log('Final dashboard state:', {
                            stats: $scope.stats,
                            recentBorrows: $scope.recentBorrows,
                            recentReturns: $scope.recentReturns
                        });
                    }, 300);
                });
        }

        init();
    }
})();