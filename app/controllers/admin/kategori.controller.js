angular.module('perpusApp')
    .controller('AdminKategoriController', ['$scope', '$timeout', 'CategoryService', 'AuthService', 
    function($scope, $timeout, CategoryService, AuthService) {
        
        // ===== INITIALIZATION =====
        const init = () => {
            // User & data state
            $scope.currentUser = AuthService.getCurrentUser();
            $scope.categories = [];
            $scope.pagination = { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 };
            
            // UI state
            $scope.loading = false;
            $scope.error = '';
            $scope.success = '';
            $scope.showAddModal = false;
            $scope.showEditModal = false;
            $scope.showDeleteModal = false;
            $scope.categoryForm = {};
            $scope.categoryToDelete = null;
            
            // Search state
            $scope.searchQuery = '';
            $scope.isSearching = false;
            
            // Private variables
            $scope.dataTable = null;
            $scope.clearMessageTimeout = null;
            $scope.searchTimeout = null;
        };
        
        // ===== MESSAGE HELPERS =====
        const autoHideMessage = () => {
            if ($scope.clearMessageTimeout) $timeout.cancel($scope.clearMessageTimeout);
            $scope.clearMessageTimeout = $timeout(() => {
                $scope.error = $scope.success = '';
            }, 5000);
        };
        
        const showMessage = (type, message) => {
            $scope[type] = message;
            $scope[type === 'success' ? 'error' : 'success'] = '';
            autoHideMessage();
        };
        
        $scope.clearError = () => $scope.error = '';
        $scope.clearSuccess = () => $scope.success = '';
        
        // ===== DATATABLE MANAGEMENT =====
        const destroyDataTable = () => {
            if ($scope.dataTable) {
                try { $scope.dataTable.destroy(); $scope.dataTable = null; } 
                catch (e) { console.error('DataTable destroy error:', e); }
            }
        };
        
        const initDataTable = () => {
            $timeout(() => {
                try {
                    destroyDataTable();
                    if ($('#categoriesTable').length && $scope.categories.length > 0) {
                        $scope.dataTable = $('#categoriesTable').DataTable({
                            responsive: true,
                            autoWidth: false,
                            paging: $scope.isSearching,
                            pageLength: 10,
                            info: $scope.isSearching,
                            searching: false,
                            language: {
                                "emptyTable": "Tidak ada data kategori tersedia",
                                "info": "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
                                "infoEmpty": "Menampilkan 0 sampai 0 dari 0 data",
                                "infoFiltered": "(disaring dari _MAX_ total data)",
                                "lengthMenu": "Tampilkan _MENU_ data",
                                "loadingRecords": "Memuat...",
                                "processing": "Memproses...",
                                "search": "Cari:",
                                "zeroRecords": "Tidak ada data yang sesuai ditemukan",
                                "paginate": { "first": "Pertama", "last": "Terakhir", "next": "Selanjutnya", "previous": "Sebelumnya" }
                            },
                            order: [[0, 'asc']],
                            columnDefs: [{ targets: -1, orderable: false, searchable: false }]
                        });
                    }
                } catch (e) { console.error('DataTable init error:', e); }
            }, 200);
        };
        
        // ===== DATA OPERATIONS =====
        const handleResponse = (response, successCallback, errorMsg) => {
            $scope.loading = false;
            if (response.success) {
                successCallback(response);
            } else {
                $scope.categories = [];
                showMessage('error', response.message || errorMsg);
            }
        };
        
        const updatePagination = (data) => {
            $scope.pagination = {
                current_page: data.current_page || 1,
                last_page: data.last_page || 1,
                total: data.total || 0,
                from: data.from || 0,
                to: data.to || 0
            };
        };
        
        const refreshCurrentView = () => {
            if ($scope.isSearching) {
                $scope.performSearch();
            } else {
                $scope.loadCategoriesPaginated($scope.pagination.current_page);
            }
        };
        
        // ===== SEARCH FUNCTIONALITY =====
        $scope.performSearch = function() {
            if ($scope.searchTimeout) $timeout.cancel($scope.searchTimeout);
            
            $scope.searchTimeout = $timeout(() => {
                const query = $scope.searchQuery?.trim();
                
                if (!query) {
                    $scope.isSearching = false;
                    $scope.loadCategoriesPaginated(1);
                    return;
                }
                
                $scope.loading = true;
                $scope.isSearching = true;
                
                CategoryService.searchCategories(query)
                    .then(response => handleResponse(response, 
                        (res) => {
                            if (res.data?.data) {
                                $scope.categories = res.data.data;
                                updatePagination(res.data);
                                initDataTable();
                                if (!$scope.categories.length) {
                                    showMessage('error', 'Tidak ditemukan kategori dengan nama tersebut');
                                }
                            }
                        }, 
                        'Tidak ditemukan kategori dengan nama tersebut'
                    ))
                    .catch(() => {
                        $scope.loading = false;
                        $scope.categories = [];
                        $scope.pagination = { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 };
                        showMessage('error', 'Tidak ditemukan kategori dengan nama tersebut');
                    });
            }, 500);
        };
        
        $scope.clearSearch = function() {
            $scope.searchQuery = '';
            $scope.isSearching = false;
            $scope.loadCategoriesPaginated(1);
        };
        
        // ===== DATA LOADING =====
        $scope.loadCategoriesPaginated = function(page = 1) {
            $scope.loading = true;
            $scope.error = '';
            
            CategoryService.getPaginatedCategories(page)
                .then(response => handleResponse(response,
                    (res) => {
                        const data = res.data.categories || res.data;
                        if (data?.data && Array.isArray(data.data)) {
                            $scope.categories = data.data;
                            updatePagination(data);
                            initDataTable();
                        } else {
                            showMessage('error', 'Tidak ada data ditemukan');
                        }
                    },
                    'Gagal memuat data kategori'
                ))
                .catch(error => {
                    $scope.loading = false;
                    $scope.categories = [];
                    showMessage('error', error.message || 'Gagal memuat data kategori');
                });
        };
        
        // ===== PAGINATION =====
        $scope.goToPage = (page) => {
            if (!$scope.isSearching && page >= 1 && page <= $scope.pagination.last_page && page !== $scope.pagination.current_page) {
                $scope.loadCategoriesPaginated(page);
            }
        };
        
        $scope.previousPage = () => {
            if (!$scope.isSearching && $scope.pagination.current_page > 1) {
                $scope.goToPage($scope.pagination.current_page - 1);
            }
        };
        
        $scope.nextPage = () => {
            if (!$scope.isSearching && $scope.pagination.current_page < $scope.pagination.last_page) {
                $scope.goToPage($scope.pagination.current_page + 1);
            }
        };
        
        // ===== MODAL MANAGEMENT =====
        const resetModal = () => {
            $scope.showAddModal = $scope.showEditModal = $scope.showDeleteModal = false;
            $scope.categoryForm = {};
            $scope.categoryToDelete = null;
            $scope.error = $scope.success = '';
        };
        
        $scope.showAdd = function() {
            resetModal();
            $scope.showAddModal = true;
            $timeout(() => $('#nama_kategori').focus(), 100);
        };
        
        $scope.showEdit = function(category) {
            if (!category) return showMessage('error', 'Data kategori tidak valid');
            
            resetModal();
            $scope.categoryForm = { id: category.id, nama_kategori: category.nama_kategori };
            $scope.showEditModal = true;
            $timeout(() => $('#edit_nama_kategori').focus(), 100);
        };
        
        $scope.showDelete = function(category) {
            if (!category) return showMessage('error', 'Data kategori tidak valid');
            
            resetModal();
            $scope.categoryToDelete = { id: category.id, nama_kategori: category.nama_kategori };
            $scope.showDeleteModal = true;
        };
        
        $scope.closeModal = resetModal;
        
        // ===== FORM VALIDATION =====
        const validateForm = () => {
            const name = $scope.categoryForm.nama_kategori?.trim();
            
            if (!name) return showMessage('error', 'Nama kategori harus diisi'), false;
            if (name.length < 3) return showMessage('error', 'Nama kategori minimal 3 karakter'), false;
            if (name.length > 100) return showMessage('error', 'Nama kategori maksimal 100 karakter'), false;
            
            return true;
        };
        
        // ===== CRUD OPERATIONS =====
        const performCrudOperation = (operation, data, successMsg, errorMsg) => {
            if (operation === 'update' && !$scope.categoryForm.id) {
                return showMessage('error', 'ID kategori tidak valid');
            }
            if (operation === 'delete' && !$scope.categoryToDelete?.id) {
                return showMessage('error', 'Data kategori tidak valid');
            }
            
            $scope.loading = true;
            $scope.error = '';
            
            let serviceCall;
            switch(operation) {
                case 'create': serviceCall = CategoryService.createCategory(data); break;
                case 'update': serviceCall = CategoryService.updateCategory($scope.categoryForm.id, data); break;
                case 'delete': serviceCall = CategoryService.deleteCategory($scope.categoryToDelete.id); break;
            }
            
            serviceCall.then(response => {
                $scope.loading = false;
                if (response.success) {
                    showMessage('success', response.message || successMsg);
                    $scope.closeModal();
                    
                    if (operation === 'create') {
                        $scope.isSearching ? $scope.performSearch() : $scope.loadCategoriesPaginated(1);
                    } else if (operation === 'delete') {
                        if ($scope.isSearching) {
                            $scope.performSearch();
                        } else {
                            const currentPage = $scope.pagination.current_page;
                            const shouldGoBack = $scope.categories.length === 1 && currentPage > 1;
                            $scope.loadCategoriesPaginated(shouldGoBack ? currentPage - 1 : currentPage);
                        }
                    } else {
                        refreshCurrentView();
                    }
                } else {
                    showMessage('error', response.message || errorMsg);
                }
            })
            .catch(error => {
                $scope.loading = false;
                showMessage('error', error.message || errorMsg);
            });
        };
        
        $scope.createCategory = function() {
            if (!validateForm()) return;
            performCrudOperation('create', 
                { nama_kategori: $scope.categoryForm.nama_kategori.trim() },
                'Kategori berhasil ditambahkan',
                'Gagal menambahkan kategori'
            );
        };
        
        $scope.updateCategory = function() {
            if (!validateForm()) return;
            performCrudOperation('update', 
                { nama_kategori: $scope.categoryForm.nama_kategori.trim() },
                'Kategori berhasil diperbarui',
                'Gagal memperbarui kategori'
            );
        };
        
        $scope.deleteCategory = function() {
            performCrudOperation('delete', null, 
                'Kategori berhasil dihapus',
                'Gagal menghapus kategori'
            );
        };
        
        // ===== UTILITY FUNCTIONS =====
        $scope.refreshData = () => $scope.clearSearch();
        $scope.hasCategories = () => $scope.categories?.length > 0;
        
        $scope.logout = function() {
            if (confirm('Apakah Anda yakin ingin logout?')) {
                AuthService.logout()
                    .then(() => window.location.href = '#/login')
                    .catch(error => {
                        window.location.href = '#/login';
                    });
            }
        };
        
        // ===== CLEANUP =====
        $scope.$on('$destroy', () => {
            if ($scope.clearMessageTimeout) $timeout.cancel($scope.clearMessageTimeout);
            if ($scope.searchTimeout) $timeout.cancel($scope.searchTimeout);
            destroyDataTable();
        });
        
        // ===== INITIALIZE =====
        init();
        $scope.loadCategoriesPaginated(1);
    }]);