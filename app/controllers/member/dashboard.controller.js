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
            const now = new Date();
            const due = new Date(returnDate);
            const diffTime = due - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0;
        };

        $scope.isOverdue = function (returnDate) {
            return new Date() > new Date(returnDate);
        };

        $scope.getStatusClass = function (status) {
            switch (status) {
                case 'borrowed': return 'badge-warning';
                case 'returned': return 'badge-success';
                case 'overdue': return 'badge-danger';
                default: return 'badge-secondary';
            }
        };

        $scope.logout = function () {
            AuthService.logout();
        };

        function transformBorrowData(raw) {
            return {
                id: raw.id,
                book_title: raw.book?.judul || 'Tidak diketahui',
                borrow_date: raw.tanggal_peminjaman,
                return_date: raw.tanggal_pengembalian,
                return_date_actual: raw.tanggal_pengembalian_actual,
                status: raw.status
            };
        }

        function transformReturnData(raw) {
            return {
                book_title: raw.book?.judul || 'Tidak diketahui',
                return_date: raw.tanggal_pengembalian_actual || raw.tanggal_pengembalian
            };
        }

        function init() {
            const user = AuthService.getCurrentUser();

            if (!user || !user.id) {
                $scope.error = 'Gagal mengambil data user. Silakan login kembali.';
                $scope.loading = false;
                return;
            }

            $scope.currentUser = user;

            Promise.all([
                BorrowService.getMemberBorrows(user.id, 1, 5),
                BorrowService.getMemberBorrows(user.id, 1, 100),
                BorrowService.getReturnList({ member_id: user.id })
            ])
                .then(function ([recentBorrowsResult, allBorrowsResult, returnListResult]) {
                    // Data Peminjaman Terbaru
                    if (recentBorrowsResult.success && Array.isArray(recentBorrowsResult.data)) {
                        $scope.recentBorrows = recentBorrowsResult.data.map(transformBorrowData);
                    }

                    // Statistik
                    if (allBorrowsResult.success && Array.isArray(allBorrowsResult.data)) {
                        const all = allBorrowsResult.data;
                        $scope.stats.totalBorrowed = all.length;
                        $scope.stats.activeBorrows = all.filter(b => b.status === 'borrowed').length;
                        $scope.stats.returnedBooks = all.filter(b => b.status === 'returned').length;
                        $scope.stats.overdueBooks = all.filter(b =>
                            b.status === 'borrowed' && $scope.isOverdue(b.tanggal_pengembalian)
                        ).length;
                    }

                    // Data Pengembalian Terbaru
                    // Data Pengembalian Terbaru
                    if (returnListResult.success && Array.isArray(returnListResult.data)) {
                        $scope.recentReturns = returnListResult.data
                            .filter(item => item.id_member === user.id) // ⬅ Tambahkan ini
                            .map(transformReturnData)
                            .slice(0, 5);
                    }
                })
                .catch(function (err) {
                    console.error('Dashboard Error:', err);
                    $scope.error = 'Gagal memuat data dashboard. Silakan coba lagi.';
                })
                .finally(function () {
                    $timeout(function () {
                        $scope.loading = false;
                    }, 300);
                });
        }

        init();
    }
})();
