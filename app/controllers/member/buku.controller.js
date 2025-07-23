angular.module('perpusApp')
    .controller('MemberBukuController', ['$scope', '$timeout', 'BookService', 'CategoryService', 'BorrowService', 'AuthService', 
    function($scope, $timeout, BookService, CategoryService, BorrowService, AuthService) {
        
        // Initialize
        $scope.books = [];
        $scope.categories = [];
        $scope.loading = false;
        $scope.error = '';
        $scope.success = '';
        $scope.currentUser = AuthService.getCurrentUser();
        
        // Pagination
        $scope.currentPage = 1;
        $scope.perPage = 12;
        $scope.totalItems = 0;
        
        // Search and filter
        $scope.search = '';
        $scope.selectedCategory = '';
        
        // Book detail modal
        $scope.showDetailModal = false;
        $scope.selectedBook = null;
        $scope.borrowing = false;
        
        // Duration selection
        $scope.selectedDuration = '';
        $scope.borrowDurationInfo = '';

        // Utility function untuk mendapatkan tanggal hari ini
        $scope.getTodayString = function() {
            return new Date();
        };

        // Utility function untuk menghitung tanggal pengembalian berdasarkan durasi
        $scope.getReturnDateFromDuration = function() {
            var e = new Date($scope.selectedDuration);
            return e;
        };

        // Load books with pagination and filtering
        $scope.loadBooks = function() {
            $scope.loading = true;
            $scope.error = '';
            
            BookService.getAllBooks($scope.currentPage, $scope.perPage, $scope.search, $scope.selectedCategory)
                .then(function(response) {
                    $scope.loading = false;
                    
                    if (response.success || response.status === 200) {
                        // Handle different response structures
                        if (response.data && response.data.books) {
                            if (response.data.books.data) {
                                $scope.books = response.data.books.data;
                                $scope.totalItems = response.data.books.total || response.data.books.length;
                            } else {
                                $scope.books = response.data.books;
                                $scope.totalItems = response.data.books.length;
                            }
                        } else if (response.data && Array.isArray(response.data)) {
                            $scope.books = response.data;
                            $scope.totalItems = response.data.length;
                        } else {
                            $scope.books = response.data || [];
                            $scope.totalItems = response.total || 0;
                        }
                        
                    } else {
                        $scope.error = response.message || 'Failed to load books';
                    }
                })
                .catch(function(error) {
                    $scope.loading = false;
                    $scope.error = error.data?.message || error.message || 'Failed to load books';
                });
        };
        
        // Load categories for filter
        $scope.loadCategories = function() {
            CategoryService.getAllCategories()
                .then(function(response) {
                    if (response.success || response.status === 200) {
                        if (response.data && response.data.categories) {
                            $scope.categories = response.data.categories;
                        } else if (response.data && Array.isArray(response.data)) {
                            $scope.categories = response.data;
                        } else {
                            $scope.categories = response.data || [];
                        }
                    }
                })
                .catch(function(error) {
                    // Silent fail for categories
                });
        };
        
        // Show book detail - reset duration selection
        $scope.showDetail = function(book) {
            $scope.selectedBook = book;
            $scope.showDetailModal = true;
            $scope.clearAlert();

            // Reset duration selection
            $scope.selectedDuration = '';
            $scope.borrowDurationInfo = '';
        };

        // Function yang dipanggil saat duration berubah
        $scope.onDurationChange = function() {
            var d = new Date($scope.selectedDuration),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;
            
            $scope.borrowDurationInfo = `${year}-${month}-${day}`;
        };

        // Fungsi borrowBook
        $scope.borrowBook = function(bookId) {
            // Validasi input
            if (!bookId) {
                $scope.error = 'Book ID is required';
                return;
            }
            
            // Validasi durasi peminjaman WAJIB dipilih
            if (!$scope.selectedDuration || $scope.selectedDuration === '') {
                $scope.error = 'Pilih durasi peminjaman terlebih dahulu sebelum meminjam buku';
                return;
            }
            
            // Refresh current user data
            $scope.currentUser = AuthService.getCurrentUser();
            
            // Validasi user login
            if (!$scope.currentUser || !$scope.currentUser.id) {
                $scope.error = 'You must be logged in to borrow books';
                return;
            }
            
            // Validasi book yang dipilih
            if (!$scope.selectedBook) {
                $scope.error = 'Please select a book first';
                return;
            }
            
            // Validasi ketersediaan buku
            if (!$scope.isBookAvailable($scope.selectedBook)) {
                $scope.error = 'Book is not available for borrowing';
                return;
            }
            
            // Validasi apakah user sudah meminjam buku ini
            if ($scope.hasBookBorrowed($scope.selectedBook)) {
                $scope.error = 'You have already borrowed this book';
                return;
            }
            
            $scope.borrowing = true;
            $scope.error = '';
            $scope.success = '';
            
            var memberId = $scope.currentUser.id;
            
            // Data yang dikirim ke API
            var borrowData = {
                tanggal_pengembalian: $scope.borrowDurationInfo,
            };
        
            // Kirim data ke API
            BorrowService.borrowBook(bookId, memberId, borrowData)
            .then(function(response) {
                $scope.borrowing = false;
                
                if (response.success || response.status === 201 || response.status === 200) {
                    var successMessage = response.message || 'Buku berhasil dipinjam';
                    successMessage += '. Tanggal pengembalian: ' + $scope.borrowDurationInfo;
                    
                    $scope.success = successMessage;
                    $scope.showDetailModal = false;
                    $scope.selectedBook = null;
                    $scope.selectedDuration = '';
                    $scope.borrowDurationInfo = '';
                    $scope.loadBooks();
                    
                    $timeout(function() {
                        $scope.success = '';
                    }, 5000);
                } else {
                    $scope.error = response.message || 'Failed to borrow book';
                }
            })
            .catch(function(error) {
                $scope.borrowing = false;
                
                var errorMessage = 'Failed to borrow book';
                if (error.message) {
                    errorMessage = error.message;
                } else if (error.data && error.data.message) {
                    errorMessage = error.data.message;
                } else if (typeof error === 'string') {
                    errorMessage = error;
                }
                
                $scope.error = errorMessage;
            });
        };
        
        // Validasi ketersediaan buku
        $scope.isBookAvailable = function(book) {
            if (!book) {
                return false;
            }
            
            var stock = book.stock || book.stok || book.available_stock || book.qty || 0;
            return stock > 0;
        };
        
        // Validasi apakah user sudah meminjam buku
        $scope.hasBookBorrowed = function(book) {
            if (!book) {
                return false;
            }
            
            return book.borrowed_by_current_user === true || 
                   book.is_borrowed === true || 
                   book.is_borrowed_by_user === true ||
                   book.borrowed === true;
        };
        
        // Get book image URL
        $scope.getBookImage = function(book) {
            if (!book) return 'assets/images/default-cover.jpg';

            if (book.cover_image) {
                if (book.cover_image.startsWith('http')) {
                    return book.cover_image;
                }
                return 'http://perpus-api.mamorasoft.com/storage/' + book.cover_image;
            }

            if (book.path) {
                return 'http://perpus-api.mamorasoft.com/storage/' + book.path;
            }

            return 'assets/images/default-cover.jpg';
        };

        // Filter functions
        $scope.applyFilter = function() {
            $scope.currentPage = 1;
            $scope.loadBooks();
        };
        
        $scope.clearFilter = function() {
            $scope.search = '';
            $scope.selectedCategory = '';
            $scope.applyFilter();
        };
        
        // Pagination functions
        $scope.pageChanged = function() {
            $scope.loadBooks();
        };
        
        $scope.getTotalPages = function() {
            return Math.ceil($scope.totalItems / $scope.perPage);
        };
        
        $scope.getPaginationArray = function() {
            var totalPages = $scope.getTotalPages();
            var pages = [];
            var startPage = Math.max(1, $scope.currentPage - 2);
            var endPage = Math.min(totalPages, $scope.currentPage + 2);
            
            for (var i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            return pages;
        };
        
        $scope.goToPage = function(page) {
            if (page >= 1 && page <= $scope.getTotalPages()) {
                $scope.currentPage = page;
                $scope.loadBooks();
            }
        };
        
        // Modal functions - reset duration selection
        $scope.closeModal = function() {
            $scope.showDetailModal = false;
            $scope.selectedBook = null;
            $scope.selectedDuration = '';
            $scope.borrowDurationInfo = '';
            $scope.error = '';
            $scope.success = '';
        };
        
        // Clear alerts
        $scope.clearAlert = function() {
            $scope.error = '';
            $scope.success = '';
        };
        
        // Refresh current user
        $scope.refreshCurrentUser = function() {
            $scope.currentUser = AuthService.getCurrentUser();
        };
        
        // Auto-clear messages
        $scope.$watch('success', function(newValue) {
            if (newValue) {
                $timeout(function() {
                    $scope.success = '';
                }, 7000);
            }
        });
        
        $scope.$watch('error', function(newValue) {
            if (newValue) {
                $timeout(function() {
                    $scope.error = '';
                }, 10000);
            }
        });
        
        // Logout
        $scope.logout = function() {
            AuthService.logout();
        };
        
        // Initialize controller
        $scope.init = function() {
            $scope.refreshCurrentUser();
            
            if (!$scope.currentUser || !$scope.currentUser.id) {
                $scope.error = 'Please log in to access this page';
                return;
            }
            
            $scope.loadCategories();
            $scope.loadBooks();
        };
        
        // Initialize controller
        $scope.init();
    }]);