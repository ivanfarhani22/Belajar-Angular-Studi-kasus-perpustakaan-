angular.module('perpusApp')
    .controller('AdminKategoriController', ['$scope', '$timeout', 'CategoryService', 'AuthService', 
    function($scope, $timeout, CategoryService, AuthService) {
        
        // ===== INITIALIZATION =====
        const initializeController = () => {
            $scope.currentUser = AuthService.getCurrentUser();
            $scope.categories = [];
            $scope.pagination = {
                current_page: 1,
                last_page: 1,
                total: 0,
                from: 0,
                to: 0
            };
            $scope.loading = false;
            $scope.error = '';
            $scope.success = '';
            
            // Modal states
            $scope.showAddModal = false;
            $scope.showEditModal = false;
            $scope.showDeleteModal = false;
            $scope.categoryForm = {};
            $scope.categoryToDelete = null;
            
            // Search functionality
            $scope.searchQuery = '';
            $scope.isSearching = false;
            
            // Private variables
            $scope.dataTable = null;
            $scope.clearMessageTimeout = null;
            $scope.searchTimeout = null;
        };
        
        // ===== MESSAGE HANDLING =====
        const autoHideMessage = () => {
            if ($scope.clearMessageTimeout) {
                $timeout.cancel($scope.clearMessageTimeout);
            }
            $scope.clearMessageTimeout = $timeout(() => {
                $scope.error = '';
                $scope.success = '';
            }, 5000);
        };
        
        const showSuccess = (message) => {
            $scope.success = message;
            $scope.error = '';
            autoHideMessage();
        };
        
        const showError = (message) => {
            $scope.error = message;
            $scope.success = '';
            autoHideMessage();
        };
        
        $scope.clearError = () => $scope.error = '';
        $scope.clearSuccess = () => $scope.success = '';
        
        // ===== SEARCH FUNCTIONALITY =====
        $scope.performSearch = function() {
            if ($scope.searchTimeout) {
                $timeout.cancel($scope.searchTimeout);
            }
            
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
                    .then(response => {
                        $scope.loading = false;
                        
                        if (response.success && response.data) {
                            $scope.categories = response.data.data || [];
                            $scope.pagination = {
                                current_page: response.data.current_page || 1,
                                last_page: response.data.last_page || 1,
                                total: response.data.total || 0,
                                from: response.data.from || 0,
                                to: response.data.to || 0
                            };
                            
                            initializeDataTable();
                            
                            if ($scope.categories.length === 0) {
                                showError('Tidak ditemukan kategori dengan nama tersebut');
                            }
                        } else {
                            $scope.categories = [];
                            $scope.pagination = {
                                current_page: 1,
                                last_page: 1,
                                total: 0,
                                from: 0,
                                to: 0
                            };
                            showError('Tidak ditemukan kategori dengan nama tersebut');
                        }
                    })
                    .catch(error => {
                        $scope.loading = false;
                        $scope.categories = [];
                        $scope.pagination = {
                            current_page: 1,
                            last_page: 1,
                            total: 0,
                            from: 0,
                            to: 0
                        };
                        showError('Tidak ditemukan kategori dengan nama tersebut');
                    });
            }, 500);
        };
        
        $scope.clearSearch = function() {
            $scope.searchQuery = '';
            $scope.isSearching = false;
            $scope.loadCategoriesPaginated(1);
        };
        
        // ===== DATATABLE FUNCTIONS =====
        const getDataTableLanguage = () => ({
            "emptyTable": "Tidak ada data kategori tersedia",
            "info": "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
            "infoEmpty": "Menampilkan 0 sampai 0 dari 0 data",
            "infoFiltered": "(disaring dari _MAX_ total data)",
            "lengthMenu": "Tampilkan _MENU_ data",
            "loadingRecords": "Memuat...",
            "processing": "Memproses...",
            "search": "Cari:",
            "zeroRecords": "Tidak ada data yang sesuai ditemukan",
            "paginate": {
                "first": "Pertama",
                "last": "Terakhir",
                "next": "Selanjutnya",
                "previous": "Sebelumnya"
            }
        });
        
        const initializeDataTable = () => {
            $timeout(() => {
                try {
                    destroyDataTable();
                    
                    if ($('#categoriesTable').length && $scope.categories.length > 0) {
                        $scope.dataTable = $('#categoriesTable').DataTable({
                            responsive: true,
                            autoWidth: false,
                            paging: $scope.isSearching ? true : false, // Enable paging for search results
                            pageLength: 10, // Show 10 items per page in search
                            info: $scope.isSearching ? true : false,
                            searching: false, // We handle search manually
                            language: getDataTableLanguage(),
                            order: [[0, 'asc']],
                            columnDefs: [{
                                targets: -1,
                                orderable: false,
                                searchable: false
                            }]
                        });
                    }
                } catch (error) {
                    console.error('Error initializing DataTable:', error);
                }
            }, 200);
        };
        
        const destroyDataTable = () => {
            if ($scope.dataTable) {
                try {
                    $scope.dataTable.destroy();
                    $scope.dataTable = null;
                } catch (error) {
                    console.error('Error destroying DataTable:', error);
                }
            }
        };
        
        // ===== DATA LOADING =====
        $scope.loadCategoriesPaginated = function(page = 1) {
            $scope.loading = true;
            $scope.error = '';
            
            CategoryService.getPaginatedCategories(page)
                .then(response => {
                    $scope.loading = false;
                    
                    if (response.success) {
                        const paginationData = response.data.categories || response.data;
                        
                        if (paginationData?.data && Array.isArray(paginationData.data)) {
                            $scope.categories = paginationData.data;
                            $scope.pagination = {
                                current_page: paginationData.current_page || 1,
                                last_page: paginationData.last_page || 1,
                                total: paginationData.total || 0,
                                from: paginationData.from || 0,
                                to: paginationData.to || 0
                            };
                            
                            initializeDataTable();
                        } else {
                            $scope.categories = [];
                            showError('Tidak ada data ditemukan');
                        }
                    } else {
                        $scope.categories = [];
                        showError(response.message || 'Gagal memuat data kategori');
                    }
                })
                .catch(error => {
                    console.error('Error loading categories:', error);
                    $scope.loading = false;
                    $scope.categories = [];
                    showError(error.message || 'Gagal memuat data kategori');
                });
        };
        
        // ===== PAGINATION =====
        $scope.goToPage = function(page) {
            // Only allow pagination when not searching
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
        
        // ===== MODAL FUNCTIONS =====
        $scope.showAdd = function() {
            $scope.categoryForm = {};
            $scope.showAddModal = true;
            $scope.error = '';
            $scope.success = '';
            
            $timeout(() => $('#nama_kategori').focus(), 100);
        };
        
        $scope.showEdit = function(category) {
            if (!category) {
                showError('Data kategori tidak valid');
                return;
            }
            
            $scope.categoryForm = {
                id: category.id,
                nama_kategori: category.nama_kategori
            };
            $scope.showEditModal = true;
            $scope.error = '';
            $scope.success = '';
            
            $timeout(() => $('#edit_nama_kategori').focus(), 100);
        };
        
        $scope.showDelete = function(category) {
            if (!category) {
                showError('Data kategori tidak valid');
                return;
            }
            
            $scope.categoryToDelete = {
                id: category.id,
                nama_kategori: category.nama_kategori
            };
            $scope.showDeleteModal = true;
            $scope.error = '';
            $scope.success = '';
        };
        
        $scope.closeModal = function() {
            $scope.showAddModal = false;
            $scope.showEditModal = false;
            $scope.showDeleteModal = false;
            $scope.categoryForm = {};
            $scope.categoryToDelete = null;
            $scope.error = '';
            $scope.success = '';
        };
        
        // ===== FORM VALIDATION =====
        const validateCategoryForm = () => {
            const name = $scope.categoryForm.nama_kategori?.trim();
            
            if (!name) {
                showError('Nama kategori harus diisi');
                return false;
            }
            
            if (name.length < 3) {
                showError('Nama kategori minimal 3 karakter');
                return false;
            }
            
            if (name.length > 100) {
                showError('Nama kategori maksimal 100 karakter');
                return false;
            }
            
            return true;
        };
        
        // ===== CRUD OPERATIONS =====
        $scope.createCategory = function() {
            if (!validateCategoryForm()) return;
            
            $scope.loading = true;
            $scope.error = '';
            
            const categoryData = {
                nama_kategori: $scope.categoryForm.nama_kategori.trim()
            };
            
            CategoryService.createCategory(categoryData)
                .then(response => {
                    $scope.loading = false;
                    
                    if (response.success) {
                        showSuccess(response.message || 'Kategori berhasil ditambahkan');
                        $scope.closeModal();
                        
                        // Refresh current view
                        if ($scope.isSearching) {
                            $scope.performSearch();
                        } else {
                            $scope.loadCategoriesPaginated(1);
                        }
                    } else {
                        showError(response.message || 'Gagal menambahkan kategori');
                    }
                })
                .catch(error => {
                    console.error('Error creating category:', error);
                    $scope.loading = false;
                    showError(error.message || 'Gagal menambahkan kategori');
                });
        };
        
        $scope.updateCategory = function() {
            if (!validateCategoryForm() || !$scope.categoryForm.id) {
                showError('ID kategori tidak valid');
                return;
            }
            
            $scope.loading = true;
            $scope.error = '';
            
            const categoryData = {
                nama_kategori: $scope.categoryForm.nama_kategori.trim()
            };
            
            CategoryService.updateCategory($scope.categoryForm.id, categoryData)
                .then(response => {
                    $scope.loading = false;
                    
                    if (response.success) {
                        showSuccess(response.message || 'Kategori berhasil diperbarui');
                        $scope.closeModal();
                        
                        // Refresh current view
                        if ($scope.isSearching) {
                            $scope.performSearch();
                        } else {
                            $scope.loadCategoriesPaginated($scope.pagination.current_page);
                        }
                    } else {
                        showError(response.message || 'Gagal memperbarui kategori');
                    }
                })
                .catch(error => {
                    console.error('Error updating category:', error);
                    $scope.loading = false;
                    showError(error.message || 'Gagal memperbarui kategori');
                });
        };
        
        $scope.deleteCategory = function() {
            if (!$scope.categoryToDelete?.id) {
                showError('Data kategori tidak valid');
                return;
            }
            
            $scope.loading = true;
            $scope.error = '';
            
            CategoryService.deleteCategory($scope.categoryToDelete.id)
                .then(response => {
                    $scope.loading = false;
                    
                    if (response.success) {
                        showSuccess(response.message || 'Kategori berhasil dihapus');
                        $scope.closeModal();
                        
                        // Refresh current view
                        if ($scope.isSearching) {
                            $scope.performSearch();
                        } else {
                            // Smart pagination after delete
                            const currentPage = $scope.pagination.current_page;
                            const shouldGoToPreviousPage = $scope.categories.length === 1 && currentPage > 1;
                            $scope.loadCategoriesPaginated(shouldGoToPreviousPage ? currentPage - 1 : currentPage);
                        }
                    } else {
                        showError(response.message || 'Gagal menghapus kategori');
                    }
                })
                .catch(error => {
                    console.error('Error deleting category:', error);
                    $scope.loading = false;
                    showError(error.message || 'Gagal menghapus kategori');
                });
        };
        
        // ===== UTILITY FUNCTIONS =====
        $scope.refreshData = function() {
            $scope.clearSearch();
        };
        
        $scope.hasCategories = () => $scope.categories?.length > 0;
        
        // ===== LOGOUT FUNCTION =====
        $scope.logout = function() {
            if (confirm('Apakah Anda yakin ingin logout?')) {
                AuthService.logout()
                    .then(() => window.location.href = '#/login')
                    .catch(error => {
                        console.error('Logout error:', error);
                        window.location.href = '#/login';
                    });
            }
        };
        
        // ===== CLEANUP =====
        $scope.$on('$destroy', () => {
            if ($scope.clearMessageTimeout) {
                $timeout.cancel($scope.clearMessageTimeout);
            }
            if ($scope.searchTimeout) {
                $timeout.cancel($scope.searchTimeout);
            }
            destroyDataTable();
        });
        
        // ===== CONTROLLER INITIALIZATION =====
        initializeController();
        $scope.loadCategoriesPaginated(1);
    }]);