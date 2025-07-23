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

                // Load members - DIPERBAIKI sesuai dengan MemberService
                promises.push(
                    MemberService.getAllMembers({
                        sort_by: 'created_at',
                        sort_direction: 'desc'
                    })
                        .then(function (response) {
                            console.log('Members response:', response);
                            if (response && response.success && response.data) {
                                $scope.stats.totalMembers = response.total || response.data.length;
                                $scope.recentMembers = response.data.slice(0, 5);
                            } else if (response && response.data) {
                                // Fallback jika struktur berbeda
                                const members = Array.isArray(response.data) ? response.data : [];
                                $scope.stats.totalMembers = members.length;
                                $scope.recentMembers = members.slice(0, 5);
                            }
                        })
                        .catch(function (error) {
                            console.error('Error loading members:', error);
                            $scope.stats.totalMembers = 0;
                            $scope.recentMembers = [];
                            
                            // Fallback: coba dengan getAllMembersWithPagination
                            return MemberService.getAllMembersWithPagination({
                                page: 1,
                                per_page: 5,
                                sort_by: 'created_at',
                                sort_direction: 'desc'
                            })
                                .then(function (paginatedResponse) {
                                    console.log('Members paginated response:', paginatedResponse);
                                    if (paginatedResponse && paginatedResponse.success) {
                                        $scope.stats.totalMembers = paginatedResponse.total || 0;
                                        $scope.recentMembers = paginatedResponse.data || [];
                                    }
                                })
                                .catch(function (fallbackError) {
                                    console.error('Error loading members (fallback):', fallbackError);
                                });
                        })
                );

                // Load borrows - DIPERBAIKI sesuai dengan BorrowService
                promises.push(
                    BorrowService.getAllBorrows(1, 5, {
                        sort_by: 'created_at',
                        sort_direction: 'desc'
                    })
                        .then(function (response) {
                            console.log('Borrows response:', response);
                            if (response && response.success) {
                                $scope.stats.totalBorrows = response.total || 0;
                                $scope.recentBorrows = response.data || [];
                            } else {
                                // Fallback jika struktur berbeda
                                $scope.stats.totalBorrows = 0;
                                $scope.recentBorrows = [];
                            }
                        })
                        .catch(function (error) {
                            console.error('Error loading borrows:', error);
                            $scope.stats.totalBorrows = 0;
                            $scope.recentBorrows = [];
                            
                            // Fallback: coba dengan getAllBorrowsComplete
                            return BorrowService.getAllBorrowsComplete({
                                sort_by: 'created_at',
                                sort_direction: 'desc'
                            })
                                .then(function (completeResponse) {
                                    console.log('Borrows complete response:', completeResponse);
                                    if (completeResponse && completeResponse.success && completeResponse.data) {
                                        $scope.stats.totalBorrows = completeResponse.data.length;
                                        $scope.recentBorrows = completeResponse.data.slice(0, 5);
                                    }
                                })
                                .catch(function (fallbackError) {
                                    console.error('Error loading borrows (fallback):', fallbackError);
                                });
                        })
                );

                // Setelah semua selesai
                Promise.all(promises)
                    .then(function () {
                        console.log('Dashboard stats loaded:', $scope.stats);
                        console.log('Recent data loaded:', {
                            books: $scope.recentBooks.length,
                            categories: $scope.recentCategories.length,
                            members: $scope.recentMembers.length,
                            borrows: $scope.recentBorrows.length
                        });
                    })
                    .catch(function (error) {
                        console.error('Error in Promise.all:', error);
                        $scope.error = 'Terjadi kesalahan saat memuat data dashboard';
                    })
                    .finally(function () {
                        $scope.loading = false;
                        // Pastikan update tampilan
                        $scope.$applyAsync();
                    });
            };

            // Fungsi tambahan untuk memuat statistik terpisah jika diperlukan
            $scope.loadStatsOnly = function () {
                console.log('Loading stats only...');
                
                // Load members count
                MemberService.getAllMembers({})
                    .then(function (response) {
                        if (response && response.success) {
                            $scope.stats.totalMembers = response.total || (response.data ? response.data.length : 0);
                            console.log('Updated members count:', $scope.stats.totalMembers);
                            $scope.$applyAsync();
                        }
                    })
                    .catch(function (error) {
                        console.error('Error loading members count:', error);
                    });

                // Load borrows count
                BorrowService.getAllBorrowsComplete({})
                    .then(function (response) {
                        if (response && response.success && response.data) {
                            $scope.stats.totalBorrows = response.data.length;
                            console.log('Updated borrows count:', $scope.stats.totalBorrows);
                            $scope.$applyAsync();
                        }
                    })
                    .catch(function (error) {
                        console.error('Error loading borrows count:', error);
                        
                        // Fallback dengan getAllBorrows
                        BorrowService.getAllBorrows(1, 1, {})
                            .then(function (paginatedResponse) {
                                if (paginatedResponse && paginatedResponse.success) {
                                    $scope.stats.totalBorrows = paginatedResponse.total || 0;
                                    console.log('Updated borrows count (fallback):', $scope.stats.totalBorrows);
                                    $scope.$applyAsync();
                                }
                            })
                            .catch(function (fallbackError) {
                                console.error('Error loading borrows count (fallback):', fallbackError);
                            });
                    });
            };

            // Refresh dashboard data
            $scope.refreshDashboard = function () {
                console.log('Refreshing dashboard...');
                $scope.loadDashboardData();
            };

            // Refresh hanya statistik
            $scope.refreshStats = function () {
                console.log('Refreshing stats only...');
                $scope.loadStatsOnly();
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

            // Error handling helper
            $scope.clearError = function () {
                $scope.error = '';
            };

            // Jalankan saat controller inisialisasi
            console.log('AdminDashboardController initialized');
            $scope.loadDashboardData();
        }
    ]);