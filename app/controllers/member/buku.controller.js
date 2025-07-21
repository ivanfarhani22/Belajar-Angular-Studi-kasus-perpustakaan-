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

        // Load books with pagination and filtering
        $scope.loadBooks = function() {
            $scope.loading = true;
            $scope.error = '';
            
            BookService.getAllBooks($scope.currentPage, $scope.perPage, $scope.search, $scope.selectedCategory)
                .then(function(response) {
                    $scope.loading = false;
                    console.log('Books API Response:', response); // Debug log
                    
                    if (response.success || response.status === 200) {
                        // Handle different response structures
                        if (response.data && response.data.books) {
                            // Structure: response.data.books.data
                            if (response.data.books.data) {
                                $scope.books = response.data.books.data;
                                $scope.totalItems = response.data.books.total || response.data.books.length;
                            } else {
                                // Structure: response.data.books (array)
                                $scope.books = response.data.books;
                                $scope.totalItems = response.data.books.length;
                            }
                        } else if (response.data && Array.isArray(response.data)) {
                            // Structure: response.data (direct array)
                            $scope.books = response.data;
                            $scope.totalItems = response.data.length;
                        } else {
                            // Fallback to original structure
                            $scope.books = response.data || [];
                            $scope.totalItems = response.total || 0;
                        }
                        
                        console.log('Books loaded:', $scope.books.length); // Debug log
                    } else {
                        $scope.error = response.message || 'Failed to load books';
                    }
                })
                .catch(function(error) {
                    $scope.loading = false;
                    console.error('Error loading books:', error); // Debug log
                    $scope.error = error.data?.message || error.message || 'Failed to load books';
                });
        };
        
        // Load categories for filter
        $scope.loadCategories = function() {
            CategoryService.getAllCategories()
                .then(function(response) {
                    console.log('Categories API Response:', response); // Debug log
                    
                    if (response.success || response.status === 200) {
                        // Handle different response structures
                        if (response.data && response.data.categories) {
                            $scope.categories = response.data.categories;
                        } else if (response.data && Array.isArray(response.data)) {
                            $scope.categories = response.data;
                        } else {
                            $scope.categories = response.data || [];
                        }
                        
                        console.log('Categories loaded:', $scope.categories.length); // Debug log
                    }
                })
                .catch(function(error) {
                    console.error('Error loading categories:', error); // Debug log
                });
        };
        
        // Show book detail
        $scope.showDetail = function(book) {
            $scope.selectedBook = book;
            $scope.showDetailModal = true;
            $scope.clearAlert(); // Clear any previous alerts
        };
        
        // PERBAIKAN: Fungsi borrowBook yang diperbaiki
        $scope.borrowBook = function(bookId) {
            // Validasi input
            if (!bookId) {
                $scope.error = 'Book ID is required';
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
            
            console.log('Attempting to borrow book:', {
                bookId: bookId,
                userId: $scope.currentUser.id,
                currentUser: $scope.currentUser,
                selectedBook: $scope.selectedBook
            });
            
            // PERBAIKAN: Gunakan borrowBook langsung dengan memberId dari currentUser
            var memberId = $scope.currentUser.id;
            console.log('Using memberId:', memberId);
            
            BorrowService.borrowBook(bookId, memberId)
                .then(function(response) {
                    $scope.borrowing = false;
                    console.log('Borrow API Response:', response); // Debug log
                    
                    if (response.success) {
                        $scope.success = response.message || 'Book borrowed successfully';
                        $scope.showDetailModal = false;
                        $scope.selectedBook = null;
                        $scope.loadBooks(); // Refresh book list
                        
                        // Auto clear success message after 3 seconds
                        $timeout(function() {
                            $scope.success = '';
                        }, 3000);
                    } else {
                        $scope.error = response.message || 'Failed to borrow book';
                    }
                })
                .catch(function(error) {
                    $scope.borrowing = false;
                    console.error('Error borrowing book:', error); // Debug log
                    
                    // Handle different error structures
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
        
        // PERBAIKAN: Fungsi validasi ketersediaan buku yang lebih robust
        $scope.isBookAvailable = function(book) {
            if (!book) {
                console.log('Book is null or undefined');
                return false;
            }
            
            // Check various possible field names for stock
            var stock = book.stock || book.stok || book.available_stock || book.qty || 0;
            var isAvailable = stock > 0;
            
            console.log('Book availability check:', {
                book_id: book.id,
                title: book.title || book.judul,
                stock: stock,
                available: isAvailable
            });
            
            return isAvailable;
        };
        
        // PERBAIKAN: Fungsi validasi apakah user sudah meminjam buku
        $scope.hasBookBorrowed = function(book) {
            if (!book) {
                return false;
            }
            
            // Check various possible field names for borrowed status
            var isBorrowed = book.borrowed_by_current_user === true || 
                           book.is_borrowed === true || 
                           book.is_borrowed_by_user === true ||
                           book.borrowed === true;
            
            console.log('Book borrowed check:', {
                book_id: book.id,
                title: book.title || book.judul,
                is_borrowed: isBorrowed
            });
            
            return isBorrowed;
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
            $scope.currentPage = 1; // Reset to first page
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
        
        // Modal functions
        $scope.closeModal = function() {
            $scope.showDetailModal = false;
            $scope.selectedBook = null;
            $scope.error = '';
            $scope.success = '';
        };
        
        // Clear alerts
        $scope.clearAlert = function() {
            $scope.error = '';
            $scope.success = '';
        };
        
        // PERBAIKAN: Fungsi untuk refresh current user
        $scope.refreshCurrentUser = function() {
            $scope.currentUser = AuthService.getCurrentUser();
            console.log('Current user refreshed:', $scope.currentUser);
            
            // Debug: Lihat semua data yang tersimpan di storage
            console.log('=== DEBUG STORAGE ===');
            console.log('localStorage currentUser:', localStorage.getItem('currentUser'));
            console.log('localStorage user:', localStorage.getItem('user'));
            console.log('localStorage authData:', localStorage.getItem('authData'));
            console.log('localStorage auth_token:', localStorage.getItem('auth_token'));
            console.log('localStorage token:', localStorage.getItem('token'));
            console.log('sessionStorage user:', sessionStorage.getItem('user'));
            console.log('sessionStorage currentUser:', sessionStorage.getItem('currentUser'));
            console.log('=== END DEBUG STORAGE ===');
        };
        
        // Watch for success message to auto-clear
        $scope.$watch('success', function(newValue) {
            if (newValue) {
                $timeout(function() {
                    $scope.success = '';
                }, 5000); // Increased to 5 seconds
            }
        });
        
        // Watch for error message to auto-clear after some time
        $scope.$watch('error', function(newValue) {
            if (newValue) {
                $timeout(function() {
                    $scope.error = '';
                }, 8000); // Auto clear error after 8 seconds
            }
        });
        
        // Logout
        $scope.logout = function() {
            AuthService.logout();
        };
        
        // PERBAIKAN: Initialize controller dengan validasi user
        $scope.init = function() {
            // Refresh current user data
            $scope.refreshCurrentUser();
            
            // Check if user is logged in
            if (!$scope.currentUser || !$scope.currentUser.id) {
                console.warn('User not logged in or invalid user data');
                $scope.error = 'Please log in to access this page';
                return;
            }
            
            // Load data
            $scope.loadCategories();
            $scope.loadBooks();
        };
        
        // Initialize controller
        $scope.init();
    }]);