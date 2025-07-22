angular.module('perpusApp')
    .controller('AdminDashboardController', [
        '$scope', 'AuthService', 'BookService', 'CategoryService', 'MemberService', 'BorrowService',
        function ($scope, AuthService, BookService, CategoryService, MemberService, BorrowService) {

            // Initialize
            $scope.currentUser = AuthService.getCurrentUser();
            $scope.loading = false;
            $scope.error = '';

            // Dashboard stats
            $scope.stats = {
                totalBooks: 0,
                totalCategories: 0,
                totalMembers: 0,
                totalBorrows: 0
            };

            // Recent activities
            $scope.recentBooks = [];
            $scope.recentCategories = [];
            $scope.recentMembers = [];
            $scope.recentBorrows = [];

            // Load all dashboard data
            $scope.loadDashboardData = function () {
                $scope.loading = true;
                $scope.error = '';

                let allBooks = [];
                let categories = [];
                let promises = [];

                // Load books
                promises.push(
                    BookService.getAllBooks()
                        .then(function (response) {
                            if (response && response.data && response.data.books && response.data.books.data) {
                                allBooks = response.data.books.data;
                                $scope.stats.totalBooks = response.data.books.total || allBooks.length;
                                $scope.recentBooks = allBooks.slice(0, 5);
                            }
                        })
                        .catch(function (error) {
                            console.error('Error loading books:', error);
                            $scope.stats.totalBooks = 0;
                            $scope.recentBooks = [];
                        })
                );

                // Load categories
                promises.push(
                    CategoryService.getAllCategories()
                        .then(function (response) {
                            if (response && response.data && response.data.categories) {
                                categories = response.data.categories;
                                $scope.stats.totalCategories = categories.length;

                                // Hitung jumlah buku per kategori
                                categories.forEach(function (cat) {
                                    cat.jumlah_buku = allBooks.filter(function (book) {
                                        return book.category_id === cat.id;
                                    }).length;
                                });

                                $scope.recentCategories = categories.slice(0, 5);
                            }
                        })
                        .catch(function (error) {
                            console.error('Error loading categories:', error);
                            $scope.stats.totalCategories = 0;
                            $scope.recentCategories = [];
                        })
                );

                // Load members
                promises.push(
                    MemberService.getAllMembers(1, 5)
                        .then(function (response) {
                            if (response && response.data) {
                                $scope.stats.totalMembers = response.data.total || 0;
                                $scope.recentMembers = response.data.data || [];
                            }
                        })
                        .catch(function (error) {
                            console.error('Error loading members:', error);
                            $scope.stats.totalMembers = 0;
                            $scope.recentMembers = [];
                        })
                );

                // Load borrows
                promises.push(
                    BorrowService.getAllBorrows(1, 5)
                        .then(function (response) {
                            if (response && response.data) {
                                $scope.stats.totalBorrows = response.data.total || 0;
                                $scope.recentBorrows = response.data.data || [];
                            }
                        })
                        .catch(function (error) {
                            console.error('Error loading borrows:', error);
                            $scope.stats.totalBorrows = 0;
                            $scope.recentBorrows = [];
                        })
                );

                // Setelah semua selesai
                Promise.all(promises)
                    .finally(function () {
                        $scope.loading = false;
                        // Jika tidak update view, pakai $scope.$applyAsync();
                        $scope.$applyAsync(); // pastikan update tampilan
                    });
            };

            // Refresh dashboard data
            $scope.refreshDashboard = function () {
                $scope.loadDashboardData();
            };

            // Navigasi ke halaman tertentu (hanya placeholder log)
            $scope.navigateToBooks = function () {
                console.log('Navigate to books');
            };

            $scope.navigateToCategories = function () {
                console.log('Navigate to categories');
            };

            $scope.navigateToMembers = function () {
                console.log('Navigate to members');
            };

            $scope.navigateToBorrows = function () {
                console.log('Navigate to borrows');
            };

            // Logout
            $scope.logout = function () {
                AuthService.logout();
            };

            // Jalankan saat controller inisialisasi
            $scope.loadDashboardData();
        }
    ]);
