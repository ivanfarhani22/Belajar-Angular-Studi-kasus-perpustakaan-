angular.module('perpusApp')
    .controller('MemberPeminjamanController', ['$scope', '$timeout', 'BorrowService', 'AuthService', 
    function($scope, $timeout, BorrowService, AuthService) {
        
        // Initialize
        $scope.borrows = [];
        $scope.loading = false;
        $scope.returning = false;
        $scope.error = '';
        $scope.success = '';
        $scope.currentUser = AuthService.getCurrentUser();
        
        // Pagination
        $scope.currentPage = 1;
        $scope.perPage = 10;
        $scope.totalItems = 0;
        $scope.totalPages = 0;
        
        // Filter & Search
        $scope.filters = {
            status: '',
            dateStart: '',
            dateEnd: '',
            search: ''
        };
        
        // DataTable instance
        $scope.dataTableInstance = null;
        
        // Load borrows with pagination and filtering
        $scope.loadBorrows = function() {
            $scope.loading = true;
            $scope.error = '';
            
            // Get current member ID
            var memberId = $scope.currentUser?.id || BorrowService.getCurrentMemberId();
            
            if (!memberId) {
                $scope.loading = false;
                $scope.error = 'ID member tidak ditemukan. Silakan login kembali.';
                return;
            }
            
            // Prepare filters
            var params = {
                page: $scope.currentPage,
                per_page: $scope.perPage,
                member_id: memberId
            };
            
            // Add filters
            if ($scope.filters.status) params.status = $scope.filters.status;
            if ($scope.filters.dateStart) params.date_start = $scope.filters.dateStart;
            if ($scope.filters.dateEnd) params.date_end = $scope.filters.dateEnd;
            if ($scope.filters.search) params.search = $scope.filters.search;
            
            BorrowService.getAllBorrows($scope.currentPage, $scope.perPage, params)
                .then(function(response) {
                    $scope.loading = false;
                    
                    if (response.success) {
                        $scope.borrows = response.data || [];
                        $scope.totalItems = response.total || 0;
                        $scope.totalPages = Math.ceil($scope.totalItems / $scope.perPage);
                        
                        $scope.initDataTable();
                        
                        if ($scope.borrows.length === 0) {
                            $scope.success = 'Belum ada data peminjaman';
                        }
                    } else {
                        $scope.error = response.message || 'Gagal memuat data peminjaman';
                    }
                })
                .catch(function(error) {
                    $scope.loading = false;
                    $scope.error = error.message || 'Gagal memuat data peminjaman';
                });
        };
        
        // Initialize DataTable
        $scope.initDataTable = function() {
            $timeout(function() {
                // Destroy existing instance
                if ($scope.dataTableInstance) {
                    $scope.dataTableInstance.destroy();
                    $scope.dataTableInstance = null;
                }
                
                if ($.fn.DataTable.isDataTable('#borrowsTable')) {
                    $('#borrowsTable').DataTable().destroy();
                }
                
                // Create new DataTable instance
                $scope.dataTableInstance = $('#borrowsTable').DataTable({
                    responsive: true,
                    autoWidth: false,
                    searching: false,
                    ordering: true,
                    paging: false,
                    info: false,
                    lengthChange: false,
                    order: [[0, 'asc']],
                    columnDefs: [
                        { targets: [6], orderable: false }
                    ],
                    language: {
                        "emptyTable": "Tidak ada data peminjaman",
                        "info": "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
                        "infoEmpty": "Menampilkan 0 sampai 0 dari 0 data",
                        "infoFiltered": "(difilter dari _MAX_ total data)",
                        "thousands": ",",
                        "lengthMenu": "Tampilkan _MENU_ data",
                        "loadingRecords": "Loading...",
                        "processing": "Processing...",
                        "search": "Cari:",
                        "zeroRecords": "Data tidak ditemukan",
                        "paginate": {
                            "first": "Pertama",
                            "last": "Terakhir",
                            "next": "Selanjutnya",
                            "previous": "Sebelumnya"
                        }
                    }
                });
            }, 100);
        };

        // Pagination functions
        $scope.goToPage = function(page) {
            if (page >= 1 && page <= $scope.totalPages && page !== $scope.currentPage) {
                $scope.currentPage = page;
                $scope.loadBorrows();
            }
        };
        
        $scope.previousPage = function() {
            if ($scope.currentPage > 1) {
                $scope.goToPage($scope.currentPage - 1);
            }
        };
        
        $scope.nextPage = function() {
            if ($scope.currentPage < $scope.totalPages) {
                $scope.goToPage($scope.currentPage + 1);
            }
        };
        
        $scope.getPageNumbers = function() {
            var pages = [];
            var start = Math.max(1, $scope.currentPage - 2);
            var end = Math.min($scope.totalPages, $scope.currentPage + 2);
            
            for (var i = start; i <= end; i++) {
                pages.push(i);
            }
            return pages;
        };
        
        $scope.changePerPage = function() {
            $scope.currentPage = 1;
            $scope.loadBorrows();
        };

        // Filter functions
        $scope.applyFilter = function() {
            $scope.currentPage = 1;
            $scope.loadBorrows();
        };
        
        $scope.clearFilter = function() {
            $scope.filters = {
                status: '',
                dateStart: '',
                dateEnd: '',
                search: ''
            };
            $scope.applyFilter();
        };
        
        // Search function with debounce
        var searchTimeout;
        $scope.onSearchChange = function() {
            if (searchTimeout) {
                $timeout.cancel(searchTimeout);
            }
            searchTimeout = $timeout(function() {
                $scope.applyFilter();
            }, 500);
        };

        // Date functions
        $scope.getBorrowDate = function(borrow) {
            try {
                var borrowDate = borrow.tanggal_pinjam || 
                                borrow.tanggal_peminjaman || 
                                borrow.borrow_date || 
                                borrow.created_at || 
                                borrow.date_borrowed;

                if (!borrowDate) return '-';

                if (typeof moment !== 'undefined') {
                    return moment(borrowDate).format('DD MMM YYYY');
                } else {
                    var date = new Date(borrowDate);
                    return date.toLocaleDateString('id-ID');
                }
            } catch(error) {
                return '-';
            }
        };

        $scope.getReturnDate = function(borrow) {
            try {
                // Check actual return date first
                var actualReturnDate = borrow.tanggal_pengembalian || 
                                      borrow.tanggal_pengembalian_actual || 
                                      borrow.tanggal_kembali_aktual || 
                                      borrow.actual_return_date ||
                                      borrow.returned_at ||
                                      borrow.date_returned;
                
                if (actualReturnDate) {
                    if (typeof moment !== 'undefined') {
                        return moment(actualReturnDate).format('DD MMM YYYY');
                    } else {
                        var date = new Date(actualReturnDate);
                        return date.toLocaleDateString('id-ID');
                    }
                }
                
                // Check planned return date
                var plannedReturnDate = borrow.tanggal_kembali || 
                                       borrow.due_date || 
                                       borrow.return_date ||
                                       borrow.tanggal_pengembalian_target ||
                                       borrow.target_return_date ||
                                       borrow.expected_return_date ||
                                       borrow.member_return_date;
                
                if (plannedReturnDate) {
                    if (typeof moment !== 'undefined') {
                        return moment(plannedReturnDate).format('DD MMM YYYY');
                    } else {
                        var date = new Date(plannedReturnDate);
                        return date.toLocaleDateString('id-ID');
                    }
                }
                
                return 'Belum diatur';
            } catch(error) {
                return '-';
            }
        };
        
        // Status functions
        $scope.getActualStatus = function(borrow) {
            // Check actual return first
            if (borrow.tanggal_pengembalian_actual || 
                borrow.tanggal_kembali_aktual || 
                borrow.actual_return_date ||
                borrow.returned_at) {
                return 'returned';
            }
            
            var status = parseInt(borrow.status);
            
            switch(status) {
                case 1: return 'pending';
                case 2: return 'borrowed';
                case 3: return 'returned';
                default: return 'pending';
            }
        };

        $scope.canReturnBook = function(borrow) {
            return $scope.getActualStatus(borrow) === 'borrowed';
        };

        $scope.shouldShowReturnButton = function(borrow) {
            return $scope.getActualStatus(borrow) === 'borrowed' && !$scope.returning;
        };
        
        $scope.getStatusClass = function(borrow) {
            var status = $scope.getActualStatus(borrow);
            switch(status) {
                case 'pending': return 'badge badge-warning';
                case 'borrowed': return 'badge badge-info';
                case 'returned': return 'badge badge-success';
                default: return 'badge badge-secondary';
            }
        };

        $scope.getStatusText = function(borrow) {
            var status = $scope.getActualStatus(borrow);
            switch(status) {
                case 'pending': return 'Menunggu Persetujuan';
                case 'borrowed': return 'Dipinjam';
                case 'returned': return 'Sudah Dikembalikan';
                default: return 'Status Tidak Diketahui';
            }
        };
        
        // Return book function
        $scope.returnBook = function(borrow) {
            if (!$scope.canReturnBook(borrow)) {
                $scope.error = 'Buku ini tidak dapat dikembalikan saat ini';
                return;
            }
            
            if (!confirm('Apakah Anda yakin ingin mengembalikan buku "' + $scope.getBookTitle(borrow) + '"?')) {
                return;
            }
            
            $scope.returning = true;
            $scope.error = '';
            $scope.success = '';
            
            BorrowService.returnBook(borrow.id)
                .then(function(response) {
                    $scope.returning = false;
                    
                    if (response.success) {
                        $scope.success = 'Buku "' + $scope.getBookTitle(borrow) + '" berhasil dikembalikan';
                        $scope.loadBorrows();
                    } else {
                        $scope.error = response.message || 'Gagal mengembalikan buku';
                    }
                })
                .catch(function(error) {
                    $scope.returning = false;
                    $scope.error = error.message || 'Gagal mengembalikan buku';
                });
        };
        
        // Book info functions
        $scope.getBookTitle = function(borrow) {
            if (borrow.book && borrow.book.judul) return borrow.book.judul;
            if (borrow.book_title) return borrow.book_title;
            if (borrow.judul_buku) return borrow.judul_buku;
            return 'Judul tidak tersedia';
        };
        
        $scope.getBookCode = function(borrow) {
            if (borrow.book && borrow.book.kode_buku) return borrow.book.kode_buku;
            if (borrow.book_code) return borrow.book_code;
            if (borrow.kode_buku) return borrow.kode_buku;
            return '-';
        };
        
        $scope.getBookAuthor = function(borrow) {
            if (borrow.book && borrow.book.pengarang) return borrow.book.pengarang;
            if (borrow.book_author) return borrow.book_author;
            if (borrow.pengarang) return borrow.pengarang;
            return '-';
        };
        
        // Utility functions
        $scope.formatDate = function(date) {
            if (!date) return '-';
            if (typeof moment !== 'undefined') {
                return moment(date).format('DD MMM YYYY');
            } else {
                var d = new Date(date);
                return d.toLocaleDateString('id-ID');
            }
        };
        
        $scope.getRowNumber = function(index) {
            return (($scope.currentPage - 1) * $scope.perPage) + index + 1;
        };
        
        // Alert functions
        $scope.clearAlert = function() {
            $scope.error = '';
            $scope.success = '';
        };
        
        // Auto-clear alerts
        $scope.$watch('success', function(newValue) {
            if (newValue) {
                $timeout(function() {
                    $scope.success = '';
                }, 5000);
            }
        });
        
        $scope.$watch('error', function(newValue) {
            if (newValue) {
                $timeout(function() {
                    $scope.error = '';
                }, 8000);
            }
        });
        
        // Auth functions
        $scope.logout = function() {
            AuthService.logout();
        };
        
        // Initialize
        if (!$scope.currentUser && !BorrowService.getCurrentMemberId()) {
            $scope.error = 'Anda harus login terlebih dahulu';
            return;
        }
        
        // Load initial data
        $scope.loadBorrows();
        
        // Cleanup on destroy
        $scope.$on('$destroy', function() {
            if ($scope.dataTableInstance) {
                $scope.dataTableInstance.destroy();
            }
            if (searchTimeout) {
                $timeout.cancel(searchTimeout);
            }
        });
    }]);