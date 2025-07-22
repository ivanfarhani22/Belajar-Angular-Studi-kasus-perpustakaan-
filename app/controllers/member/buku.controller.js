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
        
        // Duration selection (sesuai HTML)
        $scope.selectedDuration = '';
        $scope.borrowDurationInfo = '';

        // Utility function untuk mendapatkan tanggal hari ini
        $scope.getTodayString = function() {
            return new Date();
        };

        // Utility function untuk menghitung tanggal pengembalian berdasarkan durasi
        $scope.getReturnDateFromDuration = function() {
            if (!$scope.selectedDuration) return null;
            
            var returnDate = new Date();
            returnDate.setDate(returnDate.getDate() + parseInt($scope.selectedDuration));
            return returnDate;
        };

        // Load books with pagination and filtering
        $scope.loadBooks = function() {
            $scope.loading = true;
            $scope.error = '';
            
            BookService.getAllBooks($scope.currentPage, $scope.perPage, $scope.search, $scope.selectedCategory)
                .then(function(response) {
                    $scope.loading = false;
                    console.log('Books API Response:', response);
                    
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
                        
                        console.log('Books loaded:', $scope.books.length);
                    } else {
                        $scope.error = response.message || 'Failed to load books';
                    }
                })
                .catch(function(error) {
                    $scope.loading = false;
                    console.error('Error loading books:', error);
                    $scope.error = error.data?.message || error.message || 'Failed to load books';
                });
        };
        
        // Load categories for filter
        $scope.loadCategories = function() {
            CategoryService.getAllCategories()
                .then(function(response) {
                    console.log('Categories API Response:', response);
                    
                    if (response.success || response.status === 200) {
                        if (response.data && response.data.categories) {
                            $scope.categories = response.data.categories;
                        } else if (response.data && Array.isArray(response.data)) {
                            $scope.categories = response.data;
                        } else {
                            $scope.categories = response.data || [];
                        }
                        
                        console.log('Categories loaded:', $scope.categories.length);
                    }
                })
                .catch(function(error) {
                    console.error('Error loading categories:', error);
                });
        };
        
        // Show book detail - reset duration selection
        $scope.showDetail = function(book) {
            console.log('=== SHOW DETAIL DEBUG ===');
            $scope.selectedBook = book;
            $scope.showDetailModal = true;
            $scope.clearAlert();

            // Reset duration selection
            $scope.selectedDuration = '';
            $scope.borrowDurationInfo = '';
            
            console.log('Modal opened - duration reset to empty');
            console.log('=== END SHOW DETAIL DEBUG ===');
        };

        // Function yang dipanggil saat duration berubah (sesuai HTML: ng-change="onDurationChange()")
        $scope.onDurationChange = function() {
            console.log('=== DURATION CHANGE DEBUG ===');
            console.log('Selected duration:', $scope.selectedDuration);
            
            if ($scope.selectedDuration && $scope.selectedDuration !== '') {
                var days = parseInt($scope.selectedDuration);
                
                if (days === 1) {
                    $scope.borrowDurationInfo = 'Peminjaman untuk 1 hari';
                } else if (days === 7) {
                    $scope.borrowDurationInfo = 'Peminjaman untuk 1 minggu (' + days + ' hari)';
                } else if (days === 14) {
                    $scope.borrowDurationInfo = 'Peminjaman untuk 2 minggu (' + days + ' hari)';
                } else if (days === 21) {
                    $scope.borrowDurationInfo = 'Peminjaman untuk 3 minggu (' + days + ' hari)';
                } else if (days === 28) {
                    $scope.borrowDurationInfo = 'Peminjaman untuk 4 minggu (' + days + ' hari)';
                } else if (days === 30) {
                    $scope.borrowDurationInfo = 'Peminjaman untuk 1 bulan (' + days + ' hari)';
                } else {
                    $scope.borrowDurationInfo = 'Peminjaman untuk ' + days + ' hari';
                }
                
                $scope.error = ''; // Clear any previous errors
            } else {
                $scope.borrowDurationInfo = '';
            }
            
            console.log('Duration info:', $scope.borrowDurationInfo);
            console.log('=== END DURATION CHANGE DEBUG ===');
        };

        // Fungsi borrowBook sesuai dengan HTML
        $scope.borrowBook = function(bookId) {
            console.log('=== BORROW BOOK DEBUG START ===');
            console.log('Selected duration when borrowing:', $scope.selectedDuration);
            
            // Validasi input
            if (!bookId) {
                $scope.error = 'Book ID is required';
                return;
            }
            
            // Validasi durasi peminjaman WAJIB dipilih (sesuai HTML)
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
            var days = parseInt($scope.selectedDuration);
            
            // Hitung tanggal pengembalian
            var returnDate = new Date();
            returnDate.setDate(returnDate.getDate() + days);
            var returnDateString = returnDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
            
            // Data yang dikirim ke API
            var borrowData = {
                tanggal_pengembalian: returnDateString,
                durasi_hari: days
            };
            
            console.log('Data akan dikirim ke API:');
            console.log('- Book ID:', bookId);
            console.log('- Member ID:', memberId);
            console.log('- Duration (days):', days);
            console.log('- Return Date:', returnDateString);
            
            // Kirim data ke API
            BorrowService.borrowBook(bookId, memberId, borrowData)
            .then(function(response) {
                $scope.borrowing = false;
                console.log('=== API SUCCESS RESPONSE ===');
                console.log('Full API Response:', response);
                
                if (response.success || response.status === 201 || response.status === 200) {
                    var successMessage = response.message || 'Buku berhasil dipinjam';
                    successMessage += '. Durasi: ' + days + ' hari';
                    successMessage += '. Tanggal pengembalian: ' + returnDate.toLocaleDateString('id-ID');
                    
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
                console.error('=== API ERROR ===');
                console.error('Full error object:', error);
                
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
            
            console.log('=== BORROW BOOK DEBUG END ===');
        };
        
        // Validasi ketersediaan buku
        $scope.isBookAvailable = function(book) {
            if (!book) {
                console.log('Book is null or undefined');
                return false;
            }
            
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
        
        // Validasi apakah user sudah meminjam buku
        $scope.hasBookBorrowed = function(book) {
            if (!book) {
                return false;
            }
            
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
            console.log('=== CLOSE MODAL DEBUG ===');
            $scope.showDetailModal = false;
            $scope.selectedBook = null;
            $scope.selectedDuration = '';
            $scope.borrowDurationInfo = '';
            $scope.error = '';
            $scope.success = '';
            console.log('Modal closed and duration data reset');
        };
        
        // Clear alerts
        $scope.clearAlert = function() {
            $scope.error = '';
            $scope.success = '';
        };
        
        // Refresh current user
        $scope.refreshCurrentUser = function() {
            $scope.currentUser = AuthService.getCurrentUser();
            console.log('Current user refreshed:', $scope.currentUser);
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
                console.warn('User not logged in or invalid user data');
                $scope.error = 'Please log in to access this page';
                return;
            }
            
            $scope.loadCategories();
            $scope.loadBooks();
        };
        
        // Initialize controller
        $scope.init();
    }]);