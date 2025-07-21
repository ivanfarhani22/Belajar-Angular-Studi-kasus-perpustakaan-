angular.module('perpusApp')
    .controller('AdminBukuController', ['$scope', '$timeout', '$q', '$compile', 'BookService', 'CategoryService', 'AuthService',
        function($scope, $timeout, $q, $compile, BookService, CategoryService, AuthService) {

            // ===== INITIALIZATION =====
            const vm = this;
            
            init();
            
            function init() {
                setupScope();
                loadData();
            }
            
            function setupScope() {
                // Data
                Object.assign($scope, {
                    books: [],
                    filteredBooks: [], // Array untuk menyimpan buku yang sudah difilter
                    categories: [],
                    loading: false,
                    currentUser: AuthService.getCurrentUser(),
                    dataTable: null,
                    modals: { add: false, edit: false, delete: false, import: false, detail: false },
                    success: '',
                    error: '',
                    bookToDelete: null,
                    bookDetail: null,
                    importFile: null,
                    selectedCategory: '' // Untuk menyimpan kategori yang dipilih
                });
                
                resetBookForm();
                bindMethods();
            }
            
            function bindMethods() {
                // CRUD
                Object.assign($scope, {
                    createBook, updateBook, deleteBook, viewBookDetail,
                    editBook, confirmDelete, showAdd: showAddModal,
                    
                    // Modal
                    closeModal: closeAllModals, closeDetailModal,
                    showEditModal: () => $scope.modals.edit,
                    showDeleteModal: () => $scope.modals.delete,
                    showImportModal: () => $scope.modals.import,
                    showDetailModal: () => $scope.modals.detail,
                    
                    // Import/Export
                    showImport: showImportModal, importExcel, exportPDF, exportExcel, downloadTemplate,
                    
                    // File & Utils
                    handleFileSelect, handleExcelImport, getCategoryName, formatDate,
                    filterByCategory, // Perbaikan fungsi filter
                    
                    // Edit dari detail modal
                    editFromDetail
                });
            }
            
            // ===== DATA LOADING =====
            function loadData() {
                $scope.loading = true;
                
                loadCategories()
                    .then(loadBooks)
                    .then(() => $timeout(initializeDataTable, 500))
                    .catch(error => showMessage('error', 'Gagal memuat data: ' + error.message))
                    .finally(() => $scope.loading = false);
            }
            
            function loadCategories() {
                return CategoryService.getAllCategories()
                    .then(response => {
                        if (response?.success) {
                            $scope.categories = extractData(response, ['categories', 'data']);
                            if (!$scope.categories.length) throw new Error('Tidak ada kategori');
                        } else {
                            throw new Error(response?.message || 'Gagal memuat kategori');
                        }
                    });
            }
            
            function loadBooks() {
                return BookService.getAllBooks(1, 1000)
                    .then(response => {
                        if (response?.success) {
                            $scope.books = response.data.books.data;
                            $scope.filteredBooks = [...$scope.books]; // Initialize filtered books
                            if ($scope.dataTable) refreshDataTable();
                        } else {
                            throw new Error(response?.message || 'Gagal memuat buku');
                        }
                    });
            }
            
            // ===== FILTER FUNCTION =====
            function filterByCategory(categoryId) {
                $scope.selectedCategory = categoryId;
                
                if (!categoryId || categoryId === '') {
                    // Tampilkan semua buku jika tidak ada kategori dipilih
                    $scope.filteredBooks = [...$scope.books];
                } else {
                    // Filter buku berdasarkan kategori
                    $scope.filteredBooks = $scope.books.filter(book => 
                        book.category_id == categoryId
                    );
                }
                
                // Refresh DataTable dengan data yang sudah difilter
                refreshDataTable();
            }
            
            // ===== DATATABLE MANAGEMENT =====
            function initializeDataTable() {
                $timeout(() => {
                    try {
                        destroyExistingTable();
                        
                        const tableElement = $('#booksTable');
                        if (!tableElement.length) {
                            console.error('Table element #booksTable not found');
                            return;
                        }
                        
                        tableElement.empty();
                        
                        $scope.dataTable = tableElement.DataTable({
                            destroy: true,
                            data: formatBooksForTable(),
                            columns: getTableColumns(),
                            ...getTableConfig()
                        });
                        
                        console.log('DataTable initialized successfully');
                    } catch (error) {
                        console.error('DataTable initialization error:', error);
                        showMessage('error', 'Gagal menginisialisasi tabel: ' + error.message);
                    }
                }, 100);
            }
            
            function destroyExistingTable() {
                if ($scope.dataTable) {
                    $scope.dataTable.destroy();
                    $scope.dataTable = null;
                }
            }
            
            function formatBooksForTable() {
                // Gunakan filteredBooks sebagai data source
                return $scope.filteredBooks.map(book => ({
                    id: book.id,
                    judul: book.judul || '',
                    pengarang: book.pengarang || '',
                    penerbit: book.penerbit || '',
                    tahun: book.tahun || '',
                    stok: book.stok || 0,
                    category_name: getCategoryName(book.category_id)
                }));
            }
            
            function getTableColumns() {
                return [
                    { data: 'judul', title: 'Judul', width: '25%' },
                    { data: 'pengarang', title: 'Pengarang', width: '20%' },
                    { data: 'category_name', title: 'Kategori', width: '15%' },
                    { data: 'penerbit', title: 'Penerbit', width: '15%' },
                    { data: 'tahun', title: 'Tahun', width: '10%' },
                    { data: 'stok', title: 'Stok', width: '10%' },
                    {
                        data: null,
                        title: 'Aksi',
                        width: '15%',
                        orderable: false,
                        searchable: false,
                        render: (data, type, row) => `
                            <div class="btn-group btn-group-sm">
                                <button type="button" class="btn btn-primary btn-sm" 
                                        onclick="angular.element(this).scope().viewBookDetail(${row.id})" title="Detail">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button type="button" class="btn btn-warning btn-sm" 
                                        onclick="angular.element(this).scope().editBook(${row.id})" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button type="button" class="btn btn-danger btn-sm" 
                                        onclick="angular.element(this).scope().confirmDelete(${row.id})" title="Hapus">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `
                    }
                ];
            }
            
            function getTableConfig() {
                return {
                    processing: false,
                    serverSide: false,
                    responsive: true,
                    autoWidth: false,
                    paging: true,
                    pageLength: 10,
                    lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Semua"]],
                    lengthChange: true,
                    searching: true,
                    search: { regex: false, smart: true },
                    ordering: true,
                    order: [[0, 'asc']],
                    info: true,
                    language: getDataTableLanguage(),
                    dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
                         "<'row'<'col-sm-12'tr>>" +
                         "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
                    initComplete: () => console.log('DataTable initialized successfully'),
                    drawCallback: () => console.log('DataTable draw callback executed')
                };
            }
            
            function refreshDataTable() {
                $timeout(() => {
                    try {
                        if ($scope.dataTable) {
                            $scope.dataTable.clear();
                            $scope.dataTable.rows.add(formatBooksForTable());
                            $scope.dataTable.draw();
                        }
                    } catch (error) {
                        console.error('Error refreshing DataTable:', error);
                    }
                }, 100);
            }
            
            function getDataTableLanguage() {
                return {
                    processing: "Sedang memproses...",
                    lengthMenu: "Tampilkan _MENU_ entri",
                    zeroRecords: "Tidak ditemukan data yang sesuai",
                    info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ entri",
                    infoEmpty: "Menampilkan 0 sampai 0 dari 0 entri",
                    infoFiltered: "(disaring dari _MAX_ entri keseluruhan)",
                    search: "Cari:",
                    paginate: {
                        first: "Pertama",
                        last: "Terakhir",
                        next: "Selanjutnya",
                        previous: "Sebelumnya"
                    },
                    aria: {
                        sortAscending: ": aktifkan untuk mengurutkan kolom secara ascending",
                        sortDescending: ": aktifkan untuk mengurutkan kolom secara descending"
                    }
                };
            }
            
            // ===== FORM MANAGEMENT =====
            function resetBookForm() {
                $scope.bookForm = {
                    id: null,
                    judul: '',
                    pengarang: '',
                    category_id: '',
                    penerbit: '',
                    tahun: new Date().getFullYear(),
                    isbn: '',
                    stok: 1,
                    path: null
                };
            }
            
            function resetAllForms() {
                resetBookForm();
                $scope.bookToDelete = null;
                $scope.bookDetail = null;
                $scope.importFile = null;
                document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
            }
            
            // ===== VALIDATION =====
            function validateForm() {
                $scope.success = '';
                $scope.error = '';
                
                const validations = [
                    { field: 'judul', message: 'Judul buku harus diisi' },
                    { field: 'pengarang', message: 'Pengarang buku harus diisi' },
                    { field: 'category_id', message: 'Kategori buku harus dipilih', condition: val => !val || val === '' }
                ];
                
                for (let validation of validations) {
                    const value = $scope.bookForm[validation.field];
                    const isInvalid = validation.condition ? 
                        validation.condition(value) : 
                        !value?.toString().trim();
                    
                    if (isInvalid) {
                        showMessage('error', validation.message);
                        return false;
                    }
                }
                
                // Validate year
                const year = parseInt($scope.bookForm.tahun);
                const currentYear = new Date().getFullYear();
                if (!year || year < 1000 || year > currentYear + 10) {
                    showMessage('error', `Tahun tidak valid (1000 - ${currentYear + 10})`);
                    return false;
                }
                
                // Validate stock
                const stok = parseInt($scope.bookForm.stok);
                if (isNaN(stok) || stok < 0) {
                    showMessage('error', 'Stok tidak boleh negatif');
                    return false;
                }
                
                return true;
            }
            
            function validateFile(file, allowedTypes, maxSizeMB) {
                if (!allowedTypes.includes(file.type)) {
                    showMessage('error', 'Format file tidak diizinkan');
                    return false;
                }
                
                if (file.size > maxSizeMB * 1024 * 1024) {
                    showMessage('error', `Ukuran file maksimal ${maxSizeMB}MB`);
                    return false;
                }
                
                return true;
            }
            
            // ===== CRUD OPERATIONS =====
            function createBook() {
                if (!validateForm()) return;
                executeBookOperation(
                    () => BookService.createBook($scope.bookForm),
                    'Buku berhasil ditambahkan'
                );
            }
            
            function updateBook() {
                if (!$scope.bookForm.id) {
                    showMessage('error', 'ID buku tidak ditemukan');
                    return;
                }
                
                if (!validateForm()) return;
                executeBookOperation(
                    () => BookService.updateBook($scope.bookForm.id, $scope.bookForm),
                    'Buku berhasil diperbarui'
                );
            }
            
            function deleteBook() {
                if (!$scope.bookToDelete?.id) {
                    showMessage('error', 'Data buku untuk dihapus tidak valid');
                    return;
                }
                
                executeBookOperation(
                    () => BookService.deleteBook($scope.bookToDelete.id),
                    'Buku berhasil dihapus'
                );
            }
            
            function viewBookDetail(bookId) {
                if (!bookId) {
                    showMessage('error', 'ID buku tidak valid');
                    return;
                }
                
                $scope.loading = true;
                $scope.bookDetail = null;
                
                BookService.getBookDetail(bookId)
                    .then(response => {
                        if (response?.success) {
                            $scope.bookDetail = formatBookDetail(response);
                            if ($scope.bookDetail?.id) {
                                $scope.modals.detail = true;
                            } else {
                                throw new Error('Data buku tidak dapat diformat');
                            }
                        } else {
                            throw new Error(response?.message || 'Gagal mengambil detail buku');
                        }
                    })
                    .catch(error => showMessage('error', 'Gagal mengambil detail buku: ' + error.message))
                    .finally(() => $scope.loading = false);
            }
            
            function editBook(id) {
                loadBookData(id, bookData => {
                    $scope.bookForm = {
                        id: bookData.id,
                        judul: bookData.judul || '',
                        pengarang: bookData.pengarang || '',
                        category_id: bookData.category_id || '',
                        penerbit: bookData.penerbit || '',
                        tahun: parseInt(bookData.tahun) || new Date().getFullYear(),
                        isbn: bookData.isbn || '',
                        stok: parseInt(bookData.stok) || 0,
                        path: null
                    };
                    $scope.modals.edit = true;
                });
            }
            
            // Fungsi baru untuk edit dari modal detail
            function editFromDetail(bookId) {
                if (!bookId) {
                    showMessage('error', 'ID buku tidak valid');
                    return;
                }
                
                // Tutup modal detail terlebih dahulu
                $scope.modals.detail = false;
                $scope.bookDetail = null;
                
                // Kemudian buka modal edit
                $timeout(() => {
                    editBook(bookId);
                }, 100);
            }
            
            function confirmDelete(id) {
                loadBookData(id, bookData => {
                    $scope.bookToDelete = bookData;
                    $scope.modals.delete = true;
                });
            }
            
            // ===== IMPORT/EXPORT =====
            function importExcel() {
                if (!$scope.importFile) {
                    showMessage('error', 'Pilih file Excel terlebih dahulu');
                    return;
                }
                
                executeBookOperation(
                    () => BookService.importExcel($scope.importFile),
                    'Import berhasil'
                );
            }
            
            function exportPDF() {
                executeExportOperation(BookService.exportPDF, 'Export PDF');
            }
            
            function exportExcel() {
                executeExportOperation(BookService.exportExcel, 'Export Excel');
            }
            
            function downloadTemplate() {
                executeExportOperation(BookService.downloadTemplate, 'Download template');
            }
            
            // ===== FILE HANDLERS =====
            function handleFileSelect(event) {
                const file = event.target.files[0];
                if (!file) {
                    $scope.bookForm.path = null;
                    return;
                }
                
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                const maxSizeMB = 5;
                
                if (!validateFile(file, allowedTypes, maxSizeMB)) {
                    event.target.value = '';
                    $scope.bookForm.path = null;
                    return;
                }
                
                $scope.bookForm.path = file;
                $scope.$apply();
            }
            
            function handleExcelImport(event) {
                const file = event.target.files[0];
                if (!file) {
                    $scope.importFile = null;
                    return;
                }
                
                const allowedTypes = [
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ];
                
                if (validateFile(file, allowedTypes, 10)) {
                    $scope.importFile = file;
                } else {
                    event.target.value = '';
                    $scope.importFile = null;
                }
            }
            
            // ===== MODAL MANAGEMENT =====
            function closeAllModals() {
                Object.keys($scope.modals).forEach(key => $scope.modals[key] = false);
            }
            
            function closeDetailModal() {
                $scope.modals.detail = false;
                $scope.bookDetail = null;
            }
            
            function showAddModal() {
                resetAllForms();
                $scope.modals.add = true;
            }
            
            function showImportModal() {
                resetAllForms();
                $scope.modals.import = true;
            }
            
            // ===== HELPER FUNCTIONS =====
            function loadBookData(id, callback) {
                if (!id) {
                    showMessage('error', 'ID buku tidak valid');
                    return;
                }
                
                $scope.loading = true;
                
                BookService.getBookDetail(id)
                    .then(response => {
                        if (response?.success) {
                            const bookData = formatBookDetail(response);
                            if (bookData) {
                                callback(bookData);
                            } else {
                                throw new Error('Data buku tidak ditemukan atau format tidak valid');
                            }
                        } else {
                            throw new Error(response?.message || 'Gagal mengambil data buku');
                        }
                    })
                    .catch(error => showMessage('error', error.message))
                    .finally(() => $scope.loading = false);
            }
            
            function executeBookOperation(operation, successMessage) {
                $scope.loading = true;
                
                operation()
                    .then(response => {
                        if (response?.success) {
                            showMessage('success', successMessage);
                            closeAllModals();
                            resetAllForms();
                            return loadBooks().then(() => {
                                // Re-apply filter setelah data dimuat ulang
                                if ($scope.selectedCategory) {
                                    filterByCategory($scope.selectedCategory);
                                }
                            });
                        } else {
                            throw new Error(response?.message || response?.error || 'Operasi gagal');
                        }
                    })
                    .catch(error => showMessage('error', error.message || 'Operasi gagal'))
                    .finally(() => $scope.loading = false);
            }
            
            function executeExportOperation(serviceMethod, operationName) {
                $scope.loading = true;
                
                serviceMethod()
                    .then(response => {
                        if (response?.success) {
                            showMessage('success', `${operationName} berhasil`);
                        } else {
                            throw new Error(response?.message || `${operationName} gagal`);
                        }
                    })
                    .catch(error => showMessage('error', `${operationName} gagal: ${error.message}`))
                    .finally(() => $scope.loading = false);
            }
            
            function showMessage(type, message) {
                $scope.success = type === 'success' ? message : '';
                $scope.error = type === 'error' ? message : '';
                
                $timeout(() => {
                    $scope.success = '';
                    $scope.error = '';
                }, 5000);
            }
            
            function extractData(response, paths) {
                for (let path of paths) {
                    const data = getNestedValue(response, `data.${path}`) || getNestedValue(response, path);
                    if (Array.isArray(data)) return data;
                }
                return [];
            }
            
            function getNestedValue(obj, path) {
                return path.split('.').reduce((o, p) => o && o[p], obj);
            }
            
            function formatBookDetail(response) {
                const bookData = extractBookData(response);
                if (!bookData) return null;
                
                return {
                    id: bookData.id || null,
                    judul: bookData.judul || '',
                    pengarang: bookData.pengarang || '',
                    penerbit: bookData.penerbit || '',
                    tahun: parseInt(bookData.tahun) || new Date().getFullYear(),
                    isbn: bookData.isbn || '',
                    stok: parseInt(bookData.stok) || 0,
                    category_id: bookData.category_id || null,
                    created_at: bookData.created_at || null,
                    updated_at: bookData.updated_at || null,
                    path: bookData.path || null,
                    kode_buku: bookData.kode_buku || '',
                    slug: bookData.slug || '',
                    category: bookData.category || null
                };
            }
            
            function extractBookData(response) {
                const patterns = ['data.books.data', 'data.book', 'data.data.book', 'data.data', 'data'];
                
                for (let pattern of patterns) {
                    const data = getNestedValue(response, pattern);
                    if (data) return Array.isArray(data) ? data[0] : data;
                }
                return null;
            }
            
            function getCategoryName(categoryId) {
                if (!categoryId) return 'Tidak ada kategori';
                if (!$scope.categories.length) return 'Memuat kategori...';
                
                const category = $scope.categories.find(cat => cat.id == categoryId);
                return category ?
                    (category.nama_kategori || category.nama || category.name || 'Kategori tidak bernama') :
                    'Kategori tidak ditemukan';
            }
            
            function formatDate(dateString) {
                if (!dateString) return 'Tidak tersedia';
                
                try {
                    const date = new Date(dateString);
                    return isNaN(date.getTime()) ? 'Tanggal tidak valid' :
                        date.toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                        });
                } catch (error) {
                    return dateString;
                }
            }
            
            // ===== CLEANUP =====
            $scope.$on('$destroy', function() {
                if ($scope.dataTable) {
                    $scope.dataTable.destroy();
                }
            });
        }
    ]);