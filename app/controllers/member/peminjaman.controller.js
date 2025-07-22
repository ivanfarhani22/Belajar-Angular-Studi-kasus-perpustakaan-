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
        $scope.perPage = 100;
        $scope.totalItems = 0;
        
        // Filter
        $scope.statusFilter = '';
        $scope.dateFilter = {
            start: '',
            end: ''
        };
        
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
            var filters = {
                member_id: memberId
            };
            
            // Add status filter if selected
            if ($scope.statusFilter) {
                filters.status = $scope.statusFilter;
            }
            
            // Add date filters if provided
            if ($scope.dateFilter.start) {
                filters.date_start = $scope.dateFilter.start;
            }
            if ($scope.dateFilter.end) {
                filters.date_end = $scope.dateFilter.end;
            }
            
            console.log('Loading borrows with filters:', filters);
            
            BorrowService.getAllBorrows($scope.currentPage, $scope.perPage, filters)
                .then(function(response) {
                    $scope.loading = false;
                    console.log('Borrows response:', response);
                    
                    if (response.success) {
                        $scope.borrows = response.data || [];
                        $scope.totalItems = response.total || 0;
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
                    console.error('Error loading borrows:', error);
                    $scope.error = error.message || 'Gagal memuat data peminjaman';
                });
        };
        
        // Initialize DataTable
        $scope.initDataTable = function() {
            $timeout(function() {
                if ($.fn.DataTable.isDataTable('#borrowsTable')) {
                    $('#borrowsTable').DataTable().destroy();
                }
                
                $('#borrowsTable').DataTable({
                    responsive: true,
                    autoWidth: false,
                    searching: false,
                    ordering: true,
                    paging: false,
                    info: false,
                    language: {
                        "decimal": "",
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

        // Fungsi untuk mendapatkan tanggal pinjam
        $scope.getBorrowDate = function(borrow) {
            try {
                console.log('Getting borrow date for:', borrow.id, borrow);
                
                var borrowDate = borrow.tanggal_pinjam || 
                                borrow.tanggal_peminjaman || 
                                borrow.borrow_date || 
                                borrow.created_at || 
                                borrow.date_borrowed;

                if (!borrowDate) {
                    console.log('No borrow date found for ID:', borrow.id);
                    return '-';
                }

                // Check if moment is available
                if (typeof moment !== 'undefined') {
                    return moment(borrowDate).format('DD MMM YYYY');
                } else {
                    // Fallback if moment is not available
                    var date = new Date(borrowDate);
                    return date.toLocaleDateString('id-ID');
                }
            } catch(error) {
                console.error('Error in getBorrowDate:', error);
                return '-';
            }
        };

        // PERBAIKAN: Fungsi untuk mendapatkan tanggal kembali sesuai yang diatur member
        $scope.getReturnDate = function(borrow) {
            try {
                console.log('Getting return date for:', borrow.id, borrow);
                
                // 1. PRIORITAS UTAMA: Cek apakah sudah dikembalikan (actual return date)
                var actualReturnDate = borrow.tanggal_pengembalian || 
                                      borrow.tanggal_pengembalian_actual || 
                                      borrow.tanggal_kembali_aktual || 
                                      borrow.actual_return_date ||
                                      borrow.returned_at ||
                                      borrow.date_returned;
                
                if (actualReturnDate) {
                    console.log('Found actual return date:', actualReturnDate);
                    // Check if moment is available
                    if (typeof moment !== 'undefined') {
                        return moment(actualReturnDate).format('DD MMM YYYY');
                    } else {
                        var date = new Date(actualReturnDate);
                        return date.toLocaleDateString('id-ID');
                    }
                }
                
                // 2. PRIORITAS KEDUA: Tampilkan tanggal target yang SUDAH DIATUR MEMBER di BukuController
                // Ini adalah tanggal yang member pilih saat meminjam buku
                var memberSetReturnDate = borrow.tanggal_kembali || 
                                         borrow.due_date || 
                                         borrow.return_date ||
                                         borrow.tanggal_pengembalian_target ||
                                         borrow.target_return_date ||
                                         borrow.expected_return_date ||
                                         borrow.member_return_date;
                
                if (memberSetReturnDate) {
                    console.log('Found member-set return date:', memberSetReturnDate);
                    // Check if moment is available
                    if (typeof moment !== 'undefined') {
                        return moment(memberSetReturnDate).format('DD MMM YYYY');
                    } else {
                        var date = new Date(memberSetReturnDate);
                        return date.toLocaleDateString('id-ID');
                    }
                }
                
                console.log('No return date found for ID:', borrow.id);
                return 'Belum diatur';
            } catch(error) {
                console.error('Error in getReturnDate:', error);
                return '-';
            }
        };
        
        // Fungsi untuk mendapatkan status yang disederhanakan
        $scope.getActualStatus = function(borrow) {
            console.log('=== DEBUG STATUS UNTUK ID:', borrow.id, '===');
            console.log('Raw status:', borrow.status);
            console.log('Typeof status:', typeof borrow.status);
            
            // 1. Cek apakah sudah dikembalikan (paling penting)
            if (borrow.tanggal_pengembalian_actual || 
                borrow.tanggal_kembali_aktual || 
                borrow.actual_return_date ||
                borrow.returned_at) {
                console.log('Result: returned (ada tanggal pengembalian aktual)');
                return 'returned';
            }
            
            // 2. Konversi status ke integer untuk memastikan
            var status = parseInt(borrow.status);
            console.log('Status after parseInt:', status);
            
            // 3. Handle berdasarkan status numerik
            switch(status) {
                case 1:
                    console.log('Result: pending (status = 1)');
                    return 'pending';
                    
                case 2:
                    console.log('Result: borrowed (status = 2)');
                    return 'borrowed';
                    
                case 3:
                    console.log('Result: returned (status = 3)');
                    return 'returned';
                    
                default:
                    console.log('Result: pending (default - status tidak dikenali:', status, ')');
                    return 'pending';
            }
        };

        // Fungsi untuk cek apakah buku bisa dikembalikan
        $scope.canReturnBook = function(borrow) {
            var actualStatus = $scope.getActualStatus(borrow);
            console.log('Can return book check - ID:', borrow.id, 'Status:', actualStatus);
            
            // Buku bisa dikembalikan jika statusnya 'borrowed'
            return actualStatus === 'borrowed';
        };

        // Fungsi untuk menampilkan tombol return
        $scope.shouldShowReturnButton = function(borrow) {
            var actualStatus = $scope.getActualStatus(borrow);
            console.log('shouldShowReturnButton - ID:', borrow.id, 'Status:', actualStatus);
            
            // Tampilkan tombol jika status borrowed
            return actualStatus === 'borrowed' && !$scope.returning;
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
            
            console.log('Returning book with ID:', borrow.id);
            
            BorrowService.returnBook(borrow.id)
                .then(function(response) {
                    $scope.returning = false;
                    console.log('Return book response:', response);
                    
                    if (response.success) {
                        $scope.success = 'Buku "' + $scope.getBookTitle(borrow) + '" berhasil dikembalikan';
                        $scope.loadBorrows(); // Reload data
                    } else {
                        $scope.error = response.message || 'Gagal mengembalikan buku';
                    }
                })
                .catch(function(error) {
                    $scope.returning = false;
                    console.error('Error returning book:', error);
                    $scope.error = error.message || 'Gagal mengembalikan buku';
                });
        };
        
        // DIHAPUS: Fungsi borrowBook - tidak diperlukan di peminjaman controller
        // karena peminjaman dilakukan di buku controller
        
        // DEBUG: Fungsi untuk log semua data borrow
        $scope.debugAllBorrows = function() {
            console.log('=== DEBUG ALL BORROWS ===');
            angular.forEach($scope.borrows, function(borrow, index) {
                console.log('Borrow', index, ':', {
                    id: borrow.id,
                    status: borrow.status,
                    tanggal_pinjam: borrow.tanggal_pinjam,
                    tanggal_peminjaman: borrow.tanggal_peminjaman,
                    tanggal_kembali: borrow.tanggal_kembali,
                    tanggal_pengembalian: borrow.tanggal_pengembalian,
                    getBorrowDate: $scope.getBorrowDate(borrow),
                    getReturnDate: $scope.getReturnDate(borrow),
                    getActualStatus: $scope.getActualStatus(borrow)
                });
            });
            console.log('=== END DEBUG ===');
        };

        // DEBUG: Fungsi untuk menampilkan semua data borrow untuk debugging
        $scope.debugBorrow = function(borrow) {
            console.log('=== FULL BORROW DATA ===');
            console.log('ID:', borrow.id);
            console.log('Status:', borrow.status, '(type:', typeof borrow.status, ')');
            console.log('Tanggal pinjam:', borrow.tanggal_pinjam);
            console.log('Tanggal peminjaman:', borrow.tanggal_peminjaman);
            console.log('Borrow date:', borrow.borrow_date);
            console.log('Created at:', borrow.created_at);
            console.log('Date borrowed:', borrow.date_borrowed);
            console.log('Tanggal kembali (member set):', borrow.tanggal_kembali);
            console.log('Return date:', borrow.return_date);
            console.log('Due date:', borrow.due_date);
            console.log('Target return date:', borrow.target_return_date);
            console.log('Expected return date:', borrow.expected_return_date);
            console.log('Member return date:', borrow.member_return_date);
            console.log('Tanggal pengembalian (actual):', borrow.tanggal_pengembalian);
            console.log('Tanggal kembali aktual:', borrow.tanggal_kembali_aktual);
            console.log('Actual return date:', borrow.actual_return_date);
            console.log('Returned at:', borrow.returned_at);
            console.log('Tanggal pengembalian actual:', borrow.tanggal_pengembalian_actual);
            console.log('Date returned:', borrow.date_returned);
            console.log('Computed status:', $scope.getActualStatus(borrow));
            console.log('Get borrow date:', $scope.getBorrowDate(borrow));
            console.log('Get return date:', $scope.getReturnDate(borrow));
            console.log('=== END DEBUG ===');
        };
        
        // Filter functions
        $scope.applyFilter = function() {
            $scope.currentPage = 1;
            $scope.loadBorrows();
        };
        
        $scope.clearFilter = function() {
            $scope.statusFilter = '';
            $scope.dateFilter = {
                start: '',
                end: ''
            };
            $scope.applyFilter();
        };
        
        // Format date
        $scope.formatDate = function(date) {
            if (!date) return '-';
            return moment(date).format('DD MMM YYYY');
        };
        
        // Get status class - disederhanakan
        $scope.getStatusClass = function(borrow) {
            var status = $scope.getActualStatus(borrow);
            switch(status) {
                case 'pending':
                    return 'badge-warning';
                case 'borrowed':
                    return 'badge-info';
                case 'returned':
                    return 'badge-success';
                default:
                    return 'badge-secondary';
            }
        };

        // Update fungsi getStatusText
        $scope.getStatusText = function(borrow) {
            var status = $scope.getActualStatus(borrow);
            switch(status) {
                case 'pending':
                    return 'Menunggu Persetujuan';
                case 'borrowed':
                    return 'Dipinjam';
                case 'returned':
                    return 'Sudah Dikembalikan';
                default:
                    return 'Status Tidak Diketahui';
            }
        };
        
        // Get book title safely
        $scope.getBookTitle = function(borrow) {
            if (borrow.book && borrow.book.judul) {
                return borrow.book.judul;
            }
            if (borrow.book_title) {
                return borrow.book_title;
            }
            if (borrow.judul_buku) {
                return borrow.judul_buku;
            }
            return 'Judul tidak tersedia';
        };
        
        // Get book code safely
        $scope.getBookCode = function(borrow) {
            if (borrow.book && borrow.book.kode_buku) {
                return borrow.book.kode_buku;
            }
            if (borrow.book_code) {
                return borrow.book_code;
            }
            if (borrow.kode_buku) {
                return borrow.kode_buku;
            }
            return '-';
        };
        
        // Get book author safely
        $scope.getBookAuthor = function(borrow) {
            if (borrow.book && borrow.book.pengarang) {
                return borrow.book.pengarang;
            }
            if (borrow.book_author) {
                return borrow.book_author;
            }
            if (borrow.pengarang) {
                return borrow.pengarang;
            }
            return '-';
        };
        
        // Clear alerts
        $scope.clearAlert = function() {
            $scope.error = '';
            $scope.success = '';
        };
        
        // Watch for success message to auto-clear
        $scope.$watch('success', function(newValue) {
            if (newValue) {
                $timeout(function() {
                    $scope.success = '';
                }, 5000);
            }
        });
        
        // Watch for error message to auto-clear
        $scope.$watch('error', function(newValue) {
            if (newValue) {
                $timeout(function() {
                    $scope.error = '';
                }, 8000);
            }
        });
        
        // Pagination changed
        $scope.pageChanged = function() {
            $scope.loadBorrows();
        };
        
        // Logout
        $scope.logout = function() {
            AuthService.logout();
        };
        
        // Check if user is logged in
        if (!$scope.currentUser && !BorrowService.getCurrentMemberId()) {
            $scope.error = 'Anda harus login terlebih dahulu';
            return;
        }
        
        // Initialize controller
        $scope.loadBorrows();
    }]);