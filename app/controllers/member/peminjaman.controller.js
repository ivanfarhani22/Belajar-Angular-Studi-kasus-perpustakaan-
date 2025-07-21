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

        // TAMBAHAN: Fungsi untuk mendapatkan tanggal batas pengembalian
$scope.getDueDate = function(borrow) {
    var dueDate = borrow.tanggal_kembali || 
                  borrow.due_date || 
                  borrow.return_date ||
                  borrow.tanggal_pengembalian_target ||
                  borrow.target_return_date;
    
    if (!dueDate) {
        console.log('No due date found for ID:', borrow.id);
        return null;
    }
    
    return dueDate;
};

// TAMBAHAN: Fungsi untuk menghitung sisa waktu dalam hari
$scope.getRemainingTime = function(borrow) {
    var dueDate = $scope.getDueDate(borrow);
    if (!dueDate) return 0;
    
    var today = moment().startOf('day');
    var due = moment(dueDate).startOf('day');
    var remaining = due.diff(today, 'days');
    
    console.log('Remaining time for ID', borrow.id, ':', remaining, 'days');
    return remaining;
};

// TAMBAHAN: Fungsi untuk format tampilan sisa waktu
$scope.formatRemainingTime = function(borrow) {
    var remaining = $scope.getRemainingTime(borrow);
    
    if (remaining > 0) {
        return remaining + ' hari lagi';
    } else if (remaining === 0) {
        return 'Jatuh tempo hari ini';
    } else {
        var overdue = Math.abs(remaining);
        return 'Terlambat ' + overdue + ' hari';
    }
};

// TAMBAHAN: Fungsi untuk mendapatkan class CSS berdasarkan sisa waktu
$scope.getRemainingTimeClass = function(borrow) {
    var remaining = $scope.getRemainingTime(borrow);
    
    if (remaining > 3) {
        return 'text-success'; // Hijau - masih banyak waktu
    } else if (remaining > 0) {
        return 'text-warning'; // Kuning - hampir jatuh tempo
    } else {
        return 'text-danger'; // Merah - sudah terlambat
    }
};

// TAMBAHAN: Fungsi untuk cek apakah buku sudah overdue
$scope.isOverdue = function(borrow) {
    var remaining = $scope.getRemainingTime(borrow);
    return remaining < 0;
};
        
        // PERBAIKAN: Fungsi untuk mendapatkan status yang disederhanakan
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
            // Status 2 = Dipinjam - Cek apakah overdue
            if ($scope.isOverdue(borrow)) {
                console.log('Result: overdue (status = 2, terlambat)');
                return 'overdue';
            } else {
                console.log('Result: borrowed (status = 2)');
                return 'borrowed';
            }
            
        case 3:
            console.log('Result: returned (status = 3)');
            return 'returned';
            
        default:
            console.log('Result: pending (default - status tidak dikenali:', status, ')');
            return 'pending';
    }
};

        // PERBAIKAN: Fungsi untuk cek apakah buku bisa dikembalikan
     $scope.canReturnBook = function(borrow) {
    var actualStatus = $scope.getActualStatus(borrow);
    console.log('Can return book check - ID:', borrow.id, 'Status:', actualStatus);
    
    // Buku bisa dikembalikan jika statusnya 'borrowed' atau 'overdue'
    return actualStatus === 'borrowed' || actualStatus === 'overdue';
};
        // PERBAIKAN: Fungsi untuk menampilkan tombol return
$scope.shouldShowReturnButton = function(borrow) {
    var actualStatus = $scope.getActualStatus(borrow);
    console.log('shouldShowReturnButton - ID:', borrow.id, 'Status:', actualStatus);
    
    // Tampilkan tombol jika status borrowed atau overdue
    return (actualStatus === 'borrowed' || actualStatus === 'overdue') && !$scope.returning;
};
        
        // PERBAIKAN: Return book function
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
        
        // PERBAIKAN: Fungsi untuk meminjam buku
        $scope.borrowBook = function(bukuId) {
            if (!bukuId) {
                $scope.error = 'ID buku tidak valid';
                return;
            }
            
            $scope.loading = true;
            $scope.error = '';
            $scope.success = '';
            
            console.log('Borrowing book with ID:', bukuId);
            
            BorrowService.borrowBookAuto(bukuId)
                .then(function(response) {
                    $scope.loading = false;
                    console.log('Borrow book response:', response);
                    
                    if (response.success) {
                        $scope.success = 'Permintaan peminjaman berhasil dikirim';
                        $scope.loadBorrows(); // Reload data
                    } else {
                        $scope.error = response.message || 'Gagal meminjam buku';
                    }
                })
                .catch(function(error) {
                    $scope.loading = false;
                    console.error('Error borrowing book:', error);
                    $scope.error = error.message || 'Gagal meminjam buku';
                });
        };
        
        // PERBAIKAN: Fungsi untuk menghitung sisa hari (tetap ada untuk keperluan display)
        $scope.getRemainingDays = function(returnDate) {
            if (!returnDate) return 0;
            
            var remaining = moment(returnDate).diff(moment().startOf('day'), 'days');
            console.log('Remaining days for date', returnDate, ':', remaining);
            return remaining;
        };
        
        // Get overdue days (tetap ada untuk keperluan display)
        $scope.getOverdueDays = function(borrow) {
            var returnDate = borrow.tanggal_pengembalian || borrow.tanggal_kembali || borrow.return_date;
            if (!returnDate) return 0;
            
            var overdueDays = moment().diff(moment(returnDate), 'days');
            return overdueDays > 0 ? overdueDays : 0;
        };

        // PERBAIKAN BARU: Fungsi untuk mendapatkan tanggal pinjam
 $scope.getBorrowDate = function(borrow) {
    var borrowDate = borrow.tanggal_peminjaman || // INI YANG UTAMA
                    borrow.borrow_date || 
                    borrow.created_at || 
                    borrow.tanggal_pinjam || 
                    borrow.date_borrowed;

    if (!borrowDate) {
        console.log('No borrow date found for ID:', borrow.id);
        return null;
    }

    return borrowDate;
};


        // PERBAIKAN BARU: Fungsi untuk mendapatkan tanggal kembali aktual
$scope.getActualReturnDate = function(borrow) {
    var actualReturnDate = borrow.tanggal_pengembalian || // INI YANG UTAMA
                          borrow.tanggal_pengembalian_actual || 
                          borrow.tanggal_kembali_aktual || 
                          borrow.actual_return_date ||
                          borrow.returned_at ||
                          borrow.date_returned;

    if (!actualReturnDate) {
        console.log('No actual return date found for ID:', borrow.id);
        return null;
    }

    return actualReturnDate;
};


        // PERBAIKAN BARU: Fungsi untuk mendapatkan tanggal yang akan ditampilkan berdasarkan status
        $scope.getDisplayDate = function(borrow) {
            var status = $scope.getActualStatus(borrow);
            
            switch(status) {
                case 'pending':
                    // Untuk status pending, tampilkan tanggal permintaan
                    var requestDate = $scope.getBorrowDate(borrow);
                    return requestDate ? requestDate : null;
                    
                case 'borrowed':
                    // Untuk status dipinjam (status 2), tampilkan tanggal pinjam
                    var borrowDate = $scope.getBorrowDate(borrow);
                    return borrowDate ? borrowDate : null;
                    
                case 'returned':
                    // Untuk status sudah dikembalikan (status 3), tampilkan tanggal kembali aktual
                    var returnDate = $scope.getActualReturnDate(borrow);
                    return returnDate ? returnDate : null;
                    
                default:
                    return null;
            }
        };

        // PERBAIKAN BARU: Fungsi untuk mendapatkan label tanggal berdasarkan status
        $scope.getDateLabel = function(borrow) {
            var status = $scope.getActualStatus(borrow);
            
            switch(status) {
                case 'pending':
                    return 'Tanggal Permintaan';
                case 'borrowed':
                    return 'Tanggal Pinjam';
                case 'returned':
                    return 'Tanggal Kembali';
                default:
                    return 'Tanggal';
            }
        };

        // PERBAIKAN BARU: Fungsi untuk format tanggal yang ditampilkan
        $scope.formatDisplayDate = function(borrow) {
            var displayDate = $scope.getDisplayDate(borrow);
            if (!displayDate) return '-';
            
            return moment(displayDate).format('DD MMM YYYY');
        };
        
        // TEMPORARY: Fungsi untuk menampilkan semua data borrow untuk debugging
        $scope.debugBorrow = function(borrow) {
            console.log('=== FULL BORROW DATA ===');
            console.log('ID:', borrow.id);
            console.log('Status:', borrow.status, '(type:', typeof borrow.status, ')');
            console.log('Tanggal pinjam:', borrow.tanggal_pinjam);
            console.log('Tanggal peminjaman:', borrow.tanggal_peminjaman);
            console.log('Borrow date:', borrow.borrow_date);
            console.log('Created at:', borrow.created_at);
            console.log('Date borrowed:', borrow.date_borrowed);
            console.log('Tanggal kembali:', borrow.tanggal_kembali);
            console.log('Return date:', borrow.return_date);
            console.log('Tanggal pengembalian:', borrow.tanggal_pengembalian);
            console.log('Tanggal kembali aktual:', borrow.tanggal_kembali_aktual);
            console.log('Actual return date:', borrow.actual_return_date);
            console.log('Returned at:', borrow.returned_at);
            console.log('Tanggal pengembalian actual:', borrow.tanggal_pengembalian_actual);
            console.log('Date returned:', borrow.date_returned);
            console.log('Computed status:', $scope.getActualStatus(borrow));
            console.log('Display date:', $scope.getDisplayDate(borrow));
            console.log('Date label:', $scope.getDateLabel(borrow));
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
        
        // PERBAIKAN: Get status class - disederhanakan
$scope.getStatusClass = function(borrow) {
    var status = $scope.getActualStatus(borrow);
    switch(status) {
        case 'pending':
            return 'badge-warning';
        case 'borrowed':
            return 'badge-info';
        case 'overdue':
            return 'badge-danger';
        case 'returned':
            return 'badge-success';
        default:
            return 'badge-secondary';
    }
};

// PERBAIKAN: Update fungsi getStatusText untuk menangani overdue
$scope.getStatusText = function(borrow) {
    var status = $scope.getActualStatus(borrow);
    switch(status) {
        case 'pending':
            return 'Menunggu Persetujuan';
        case 'borrowed':
            return 'Dipinjam';
        case 'overdue':
            return 'Terlambat';
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