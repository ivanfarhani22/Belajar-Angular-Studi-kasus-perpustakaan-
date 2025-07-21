angular.module('perpusApp')
    .controller('MemberDashboardController', ['$scope', 'AuthService', 'BookService', 'CategoryService', function($scope, AuthService, BookService, CategoryService) {
        
        // Initialize
        $scope.currentUser = AuthService.getCurrentUser();
        $scope.loading = false;
        $scope.error = '';
        
        // Dashboard stats
        $scope.stats = {
            totalBooks: 0,
            totalCategories: 0,
            availableBooks: 0,
            recentlyAdded: 0
        };
        
        // Recent activities
        $scope.recentBooks = [];
        $scope.availableBooks = [];
        $scope.categories = [];
        
        // Search functionality
        $scope.searchData = {
            keyword: '',
            category: '',
            results: []
        };
        
        // Load dashboard data
        $scope.loadDashboardData = function() {
            $scope.loading = true;
            $scope.error = '';
            
            // Load all books with pagination
            BookService.getAllBooks(1, 10)
                .then(function(response) {
                    console.log('Books response:', response);
                    if (response.data && response.data.success) {
                        $scope.stats.totalBooks = response.data.total || 0;
                        $scope.recentBooks = response.data.data || [];
                        
                        // Filter available books (stock > 0)
                        $scope.availableBooks = $scope.recentBooks.filter(function(book) {
                            return book.stok > 0;
                        });
                        $scope.stats.availableBooks = $scope.availableBooks.length;
                        
                        // Count recently added books (this year)
                        var currentYear = new Date().getFullYear();
                        $scope.stats.recentlyAdded = $scope.recentBooks.filter(function(book) {
                            return parseInt(book.tahun) === currentYear;
                        }).length;
                        
                    } else {
                        $scope.error = response.data?.message || 'Failed to load books';
                    }
                })
                .catch(function(error) {
                    console.error('Error loading books:', error);
                    $scope.error = error.data?.message || 'Failed to load books';
                });
            
            // Load categories
            CategoryService.getAllCategories()
                .then(function(response) {
                    console.log('Categories response:', response);
                    if (response.data && response.data.success) {
                        $scope.categories = response.data.data || [];
                        $scope.stats.totalCategories = $scope.categories.length;
                    }
                    $scope.loading = false;
                })
                .catch(function(error) {
                    $scope.loading = false;
                    $scope.error = 'Failed to load dashboard data';
                    console.error('Error loading categories:', error);
                });
        };
        
        // Search books
        $scope.searchBooks = function() {
            if (!$scope.searchData.keyword && !$scope.searchData.category) {
                $scope.searchData.results = [];
                return;
            }
            
            $scope.loading = true;
            
            // Use search parameter from API
            var searchParams = {};
            if ($scope.searchData.keyword) {
                searchParams.search = $scope.searchData.keyword;
            }
            if ($scope.searchData.category) {
                searchParams.filter = $scope.searchData.category;
            }
            
            BookService.getAllBooks(1, 20, $scope.searchData.keyword, $scope.searchData.category)
                .then(function(response) {
                    if (response.data && response.data.success) {
                        $scope.searchData.results = response.data.data || [];
                    } else {
                        $scope.searchData.results = [];
                        $scope.error = response.data?.message || 'No books found';
                    }
                    $scope.loading = false;
                })
                .catch(function(error) {
                    $scope.loading = false;
                    $scope.searchData.results = [];
                    $scope.error = error.data?.message || 'Search failed';
                    console.error('Search error:', error);
                });
        };
        
        // Clear search
        $scope.clearSearch = function() {
            $scope.searchData.keyword = '';
            $scope.searchData.category = '';
            $scope.searchData.results = [];
        };
        
        // Get book by ID (for detailed view)
        $scope.viewBookDetails = function(bookId) {
            BookService.getBookById(bookId)
                .then(function(response) {
                    if (response.data && response.data.success) {
                        $scope.selectedBook = response.data.data;
                        // You can show modal or navigate to detail page
                        console.log('Book details:', $scope.selectedBook);
                    }
                })
                .catch(function(error) {
                    console.error('Error loading book details:', error);
                });
        };
        
        // Format date
        $scope.formatDate = function(date) {
            if (!date) return '-';
            return new Date(date).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        };
        
        // Get availability status
        $scope.getAvailabilityStatus = function(stock) {
            if (stock > 10) return 'Available';
            if (stock > 0) return 'Limited';
            return 'Out of Stock';
        };
        
        // Get availability class
        $scope.getAvailabilityClass = function(stock) {
            if (stock > 10) return 'badge-success';
            if (stock > 0) return 'badge-warning';
            return 'badge-danger';
        };
        
        // Get category name by ID
        $scope.getCategoryName = function(categoryId) {
            var category = $scope.categories.find(function(cat) {
                return cat.id == categoryId;
            });
            return category ? category.nama_kategori : 'Unknown';
        };
        
        // Filter books by category
        $scope.filterByCategory = function(categoryId) {
            $scope.searchData.category = categoryId;
            $scope.searchData.keyword = '';
            $scope.searchBooks();
        };
        
        // Get popular books (highest stock initially or most searched)
        $scope.getPopularBooks = function() {
            return $scope.recentBooks.slice(0, 5).sort(function(a, b) {
                return b.stok - a.stok;
            });
        };
        
        // Get random recommendations
        $scope.getRecommendations = function() {
            var shuffled = $scope.availableBooks.slice();
            for (var i = shuffled.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = shuffled[i];
                shuffled[i] = shuffled[j];
                shuffled[j] = temp;
            }
            return shuffled.slice(0, 4);
        };
        
        // Export functions (member can view exports)
        $scope.exportToPDF = function() {
            BookService.exportToPDF()
                .then(function(response) {
                    console.log('PDF export successful');
                })
                .catch(function(error) {
                    console.error('PDF export failed:', error);
                    $scope.error = 'Failed to export PDF';
                });
        };
        
        $scope.exportToExcel = function() {
            BookService.exportToExcel()
                .then(function(response) {
                    console.log('Excel export successful');
                })
                .catch(function(error) {
                    console.error('Excel export failed:', error);
                    $scope.error = 'Failed to export Excel';
                });
        };
        
        // Logout
        $scope.logout = function() {
            AuthService.logout();
        };
        
        // Initialize controller
        $scope.loadDashboardData();
    }]);