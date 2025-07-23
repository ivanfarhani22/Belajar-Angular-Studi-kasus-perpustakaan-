angular.module('perpusApp')
    .service('CategoryService', ['$http', '$q', function($http, $q) {
        const baseUrl = 'http://perpus-api.mamorasoft.com/api/category';
        
        // Response handler
        const handleResponse = (response) => {
            
            if (!response?.data) {
                return {
                    success: false,
                    data: null,
                    message: 'Invalid response format'
                };
            }
            
            // Handle different response structures
            if (response.data.status !== undefined) {
                return {
                    success: response.data.status === 200,
                    data: response.data.data || response.data,
                    message: response.data.message || 'Success',
                    status: response.data.status
                };
            }
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || 'Success'
            };
        };
        
        // Error handler
        const handleError = (error) => {
            
            let errorMessage = 'Terjadi kesalahan pada server';
            
            switch (error.status) {
                case 0:
                    errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
                    break;
                case 404:
                    errorMessage = 'Endpoint tidak ditemukan';
                    break;
                case 500:
                    errorMessage = 'Terjadi kesalahan pada server';
                    break;
                default:
                    errorMessage = error.data?.message || error.message || errorMessage;
            }
            
            return {
                success: false,
                data: null,
                message: errorMessage,
                status: error.status || 0
            };
        };
        
        // Common HTTP request configuration
        const getRequestConfig = (method, url, data = null, timeout = 10000) => ({
            method,
            url,
            data,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout
        });
        
        // Generic request handler
        const makeRequest = (config) => {
            const deferred = $q.defer();
            
            $http(config)
                .then(response => deferred.resolve(handleResponse(response)))
                .catch(error => deferred.reject(handleError(error)));
            
            return deferred.promise;
        };
        
        // Service methods
        return {
            // Get all categories
            getAllCategories() {
                return makeRequest(getRequestConfig('GET', `${baseUrl}/all/all`, null, 15000));
            },
            
            // Get paginated categories
            getPaginatedCategories(page = 1) {
                return makeRequest(getRequestConfig('GET', `${baseUrl}/all?page=${page}`, null, 15000));
            },
            
            // Get category by ID
            getCategoryById(id) {
                const deferred = $q.defer();
                
                if (!id) {
                    deferred.reject({
                        success: false,
                        message: 'ID kategori tidak valid'
                    });
                    return deferred.promise;
                }
                
                return makeRequest(getRequestConfig('GET', `${baseUrl}/${id}`));
            },
            
            // Search categories - now uses all categories for comprehensive search
            searchCategories(query) {
                const deferred = $q.defer();

                if (!query || query.trim() === '') {
                    // If no query, return paginated results
                    return this.getPaginatedCategories(1);
                }

                const searchTerm = query.trim().toLowerCase();

                // Get all categories for comprehensive search
                this.getAllCategories()
                    .then(response => {
                        if (response.success && response.data?.categories) {
                            const allCategories = response.data.categories;
                            
                            // Filter categories based on search term
                            const filteredCategories = allCategories.filter(category => 
                                category.nama_kategori.toLowerCase().includes(searchTerm)
                            );

                            // Create pagination-like structure for search results
                            const searchResults = {
                                current_page: 1,
                                last_page: 1,
                                total: filteredCategories.length,
                                from: filteredCategories.length > 0 ? 1 : 0,
                                to: filteredCategories.length,
                                data: filteredCategories
                            };

                            deferred.resolve({
                                success: true,
                                data: searchResults,
                                message: filteredCategories.length > 0 ? 
                                    `Ditemukan ${filteredCategories.length} kategori` : 
                                    'Tidak ditemukan kategori'
                            });
                        } else {
                            // No categories found
                            deferred.resolve({
                                success: true,
                                data: {
                                    current_page: 1,
                                    last_page: 1,
                                    total: 0,
                                    from: 0,
                                    to: 0,
                                    data: []
                                },
                                message: 'Tidak ada kategori ditemukan'
                            });
                        }
                    })
                    .catch(error => {
                        deferred.resolve({
                            success: true,
                            data: {
                                current_page: 1,
                                last_page: 1,
                                total: 0,
                                from: 0,
                                to: 0,
                                data: []
                            },
                            message: 'Gagal melakukan pencarian'
                        });
                    });

                return deferred.promise;
            },
            
            // Create new category
            createCategory(categoryData) {
                const deferred = $q.defer();
                
                if (!categoryData?.nama_kategori?.trim()) {
                    deferred.reject({
                        success: false,
                        message: 'Nama kategori harus diisi'
                    });
                    return deferred.promise;
                }
                
                const data = {
                    nama_kategori: categoryData.nama_kategori.trim()
                };
                
                return makeRequest(getRequestConfig('POST', `${baseUrl}/create`, data));
            },
            
            // Update category
            updateCategory(id, categoryData) {
                const deferred = $q.defer();
                
                if (!id || !categoryData?.nama_kategori?.trim()) {
                    deferred.reject({
                        success: false,
                        message: 'Data kategori tidak valid'
                    });
                    return deferred.promise;
                }
                
                const data = {
                    nama_kategori: categoryData.nama_kategori.trim()
                };
                
                return makeRequest(getRequestConfig('POST', `${baseUrl}/update/${id}`, data));
            },
            
            // Delete category
            deleteCategory(id) {
                const deferred = $q.defer();
                
                if (!id) {
                    deferred.reject({
                        success: false,
                        message: 'ID kategori tidak valid'
                    });
                    return deferred.promise;
                }
                
                return makeRequest(getRequestConfig('DELETE', `${baseUrl}/${id}/delete`));
            }
        };
    }]);