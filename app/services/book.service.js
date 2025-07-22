angular.module('perpusApp').service('HttpHelper', ['$http', 'AuthService', 'API_CONFIG', function($http, AuthService, API_CONFIG) {
    
    this.getHeaders = function(requestType) {
        var headers = {
            'Authorization': 'Bearer ' + AuthService.getToken(),
            'Accept': 'application/json'
        };
        
        if (requestType === 'json' || requestType === false) {
            headers['Content-Type'] = 'application/json;charset=utf-8';
        } else if (requestType === 'formdata') {
            delete headers['Content-Type'];
        }
        
        return headers;
    };
    
    this.detectRequestType = function(data) {
        if (data instanceof FormData) return 'formdata';
        
        if (data && typeof data === 'object') {
            for (var key in data) {
                if (data[key] instanceof File) return 'formdata';
            }
        }
        
        return 'json';
    };
    
    this.buildUrl = function(endpoint, params) {
        var url = API_CONFIG.BASE_URL + endpoint;
        
        if (params) {
            for (var key in params) {
                url = url.replace('{' + key + '}', params[key]);
            }
        }
        
        return url;
    };
    
    this.handleResponse = function(response, successMessage) {
        if (response.data) {
            return {
                success: true,
                data: response.data,
                message: response.data.message || successMessage || 'Operation successful'
            };
        }
        throw new Error('Invalid response format');
    };
    
    this.handleError = function(error, defaultMessage) {
        var message = defaultMessage;
        if (error.data?.message) {
            message = error.data.message;
        } else if (error.data?.error) {
            message = error.data.error;
        } else if (error.data?.errors) {
            message = this.formatErrors(error.data.errors);
        }
        
        return {
            success: false,
            message: message,
            status: error.status || 500
        };
    };
    
    this.formatErrors = function(errors) {
        if (typeof errors === 'object') {
            var messages = [];
            for (var field in errors) {
                if (Array.isArray(errors[field])) {
                    messages.push(errors[field].join(', '));
                } else {
                    messages.push(errors[field]);
                }
            }
            return messages.join('; ');
        }
        return Array.isArray(errors) ? errors.join('; ') : 'Validation error';
    };
    
}]);

angular.module('perpusApp').service('FileHelper', ['$window', function($window) {
    
    this.prepareRequestData = function(data) {
        var hasFile = this.hasFileData(data);
        return hasFile ? this.createFormData(data) : this.createJsonData(data);
    };
    
    this.hasFileData = function(data) {
        if (!data || typeof data !== 'object') return false;
        
        for (var key in data) {
            if (data[key] instanceof File) return true;
        }
        return false;
    };
    
    this.createFormData = function(data) {
        var formData = new FormData();
        
        for (var key in data) {
            if (!data.hasOwnProperty(key)) continue;
            
            var value = data[key];
            
            if (value === null || value === undefined) continue;
            if (typeof value === 'string' && value.trim() === '') continue;
            
            if (typeof value === 'number') value = value.toString();
            if (typeof value === 'boolean') value = value ? '1' : '0';
            
            if (value instanceof File) {
                formData.append(key, value, value.name);
            } else {
                formData.append(key, value);
            }
        }
        
        return formData;
    };
    
    this.createJsonData = function(data) {
        var jsonData = {};
        
        for (var key in data) {
            if (!data.hasOwnProperty(key)) continue;
            
            var value = data[key];
            
            if (value === null || value === undefined) continue;
            if (typeof value === 'string' && value.trim() === '') continue;
            if (value instanceof File) continue;
            
            if (typeof value === 'number') {
                jsonData[key] = value;
            } else if (typeof value === 'string') {
                jsonData[key] = value.trim();
            } else {
                jsonData[key] = value;
            }
        }
        
        return jsonData;
    };
    
    this.downloadFile = function(url, filename) {
        return new Promise(function(resolve, reject) {
            try {
                var link = document.createElement('a');
                link.href = url;
                link.download = filename || 'download';
                link.target = '_blank';
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                
                setTimeout(function() {
                    document.body.removeChild(link);
                    resolve({
                        success: true,
                        message: 'Download started successfully',
                        filename: filename
                    });
                }, 100);
                
            } catch (error) {
                reject({
                    success: false,
                    message: 'Download failed: ' + error.message,
                    error: error
                });
            }
        });
    };
    
    this.generateTimestampedFilename = function(baseName, extension) {
        var timestamp = new Date().toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .substring(0, 19);
        return baseName + '_' + timestamp + '.' + extension;
    };
    
}]);

angular.module('perpusApp').service('BookValidator', function() {
    
    this.validate = function(bookData) {
        var errors = [];
        
        if (!bookData) {
            return { isValid: false, errors: ['Book data is required'] };
        }
        
        // Required fields validation
        if (!bookData.judul || !bookData.judul.trim()) {
            errors.push('Judul buku wajib diisi');
        }
        if (!bookData.pengarang || !bookData.pengarang.trim()) {
            errors.push('Pengarang wajib diisi');
        }
        if (!bookData.category_id || bookData.category_id === 'null' || bookData.category_id === '') {
            errors.push('Kategori wajib dipilih');
        }
        if (!bookData.penerbit || !bookData.penerbit.trim()) {
            errors.push('Penerbit wajib diisi');
        }
        if (!bookData.tahun) {
            errors.push('Tahun wajib diisi');
        }
        if (!bookData.stok && bookData.stok !== 0) {
            errors.push('Stok wajib diisi');
        }
        
        // Year validation
        if (bookData.tahun) {
            var year = parseInt(bookData.tahun);
            var currentYear = new Date().getFullYear();
            if (isNaN(year) || year < 1000 || year > currentYear + 10) {
                errors.push('Tahun tidak valid (harus antara 1000 - ' + (currentYear + 10) + ')');
            }
        }
        
        // Stock validation
        if (bookData.stok !== undefined && bookData.stok !== null) {
            var stock = parseInt(bookData.stok);
            if (isNaN(stock) || stock < 0) {
                errors.push('Stok harus berupa angka positif');
            }
        }
        
        // File validation
        if (bookData.path instanceof File) {
            var allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            var maxSize = 5 * 1024 * 1024; // 5MB
            
            if (!allowedTypes.includes(bookData.path.type)) {
                errors.push('Format file tidak didukung (hanya JPG, PNG, GIF yang diizinkan)');
            }
            
            if (bookData.path.size > maxSize) {
                errors.push('Ukuran file maksimal 5MB');
            }
            
            if (bookData.path.size === 0) {
                errors.push('File tidak boleh kosong');
            }
        }
        
        return { isValid: errors.length === 0, errors: errors };
    };
    
    this.format = function(bookData) {
        if (!bookData) return {};
        
        var formatted = {
            judul: (bookData.judul || '').trim(),
            pengarang: (bookData.pengarang || '').trim(),
            category_id: parseInt(bookData.category_id) || null,
            penerbit: (bookData.penerbit || '').trim(),
            isbn: (bookData.isbn || '').trim(),
            tahun: parseInt(bookData.tahun) || new Date().getFullYear(),
            stok: parseInt(bookData.stok) || 0
        };
        
        if (bookData.path instanceof File) {
            formatted.path = bookData.path;
        }
        
        return formatted;
    };
    
});

angular.module('perpusApp').service('BookService', [
    '$http', 'API_CONFIG', 'HttpHelper', 'FileHelper', 'BookValidator', 'AuthService',
    function($http, API_CONFIG, HttpHelper, FileHelper, BookValidator, AuthService) {
        
        var self = this;
        
        var STORAGE_URLS = {
            EXPORT: {
                PDF: 'http://perpus-api.mamorasoft.com/storage/export/buku_export.pdf',
                EXCEL: 'http://perpus-api.mamorasoft.com/storage/export/buku_export.xlsx'
            },
            TEMPLATE: 'http://perpus-api.mamorasoft.com/storage/template/template_export.xlsx'
        };
        
        self.smartRequest = function(method, url, data, successMessage, errorMessage) {
            var preparedData = FileHelper.prepareRequestData(data);
            var requestType = HttpHelper.detectRequestType(preparedData);
            
            var config = {
                method: method,
                url: url,
                data: preparedData,
                headers: HttpHelper.getHeaders(requestType)
            };
            
            if (requestType === 'formdata') {
                config.transformRequest = angular.identity;
            }
            
            return $http(config)
                .then(function(response) {
                    return HttpHelper.handleResponse(response, successMessage);
                })
                .catch(function(error) {
                    return HttpHelper.handleError(error, errorMessage);
                });
        };
        
        self.getAllBooks = function(page, perPage, search, filter) {
            var params = { page: page || 1, per_page: perPage || 10 };
            
            if (search?.trim()) params.search = search.trim();
            if (filter?.trim()) params.filter = filter.trim();
            
            return $http({
                method: 'GET',
                url: HttpHelper.buildUrl(API_CONFIG.ENDPOINTS.BOOKS.ALL),
                params: params,
                headers: HttpHelper.getHeaders('json')
            }).then(function(response) {
                var booksData = response.data.books || response.data;
                
                return {
                    success: true,
                    data: booksData.data || booksData,
                    total: booksData.total || 0,
                    current_page: booksData.current_page || page,
                    per_page: booksData.per_page || perPage,
                    last_page: booksData.last_page || 1,
                    from: booksData.from || 0,
                    to: booksData.to || 0
                };
            }).catch(function(error) {
                return HttpHelper.handleError(error, 'Failed to fetch books');
            });
        };

        self.getBooksByCategory = function(categoryId, page, perPage, search) {
            if (!categoryId) {
                return Promise.resolve({ success: false, message: 'Category ID is required' });
            }
            
            var params = { page: page || 1, per_page: perPage || 10 };
            if (search?.trim()) params.search = search.trim();
            
            return $http({
                method: 'GET',
                url: HttpHelper.buildUrl('/book/filter/{id}', { id: categoryId }),
                params: params,
                headers: HttpHelper.getHeaders('json')
            }).then(function(response) {
                var booksData = response.data.books || response.data;
                
                return {
                    success: true,
                    data: booksData.data || booksData,
                    total: booksData.total || 0,
                    current_page: booksData.current_page || page,
                    per_page: booksData.per_page || perPage,
                    last_page: booksData.last_page || 1,
                    from: booksData.from || 0,
                    to: booksData.to || 0
                };
            }).catch(function(error) {
                return HttpHelper.handleError(error, 'Failed to fetch books by category');
            });
        };

        self.getBookDetail = function(id) {
            if (!id) {
                return Promise.resolve({ success: false, message: 'Book ID is required' });
            }
            
            return $http({
                method: 'GET',
                url: HttpHelper.buildUrl(API_CONFIG.ENDPOINTS.BOOKS.DETAIL, { id: id }),
                headers: HttpHelper.getHeaders('json')
            }).then(function(response) {
                return HttpHelper.handleResponse(response, 'Book detail fetched successfully');
            }).catch(function(error) {
                return HttpHelper.handleError(error, 'Failed to fetch book detail');
            });
        };

        self.createBook = function(bookData) {
            var validation = BookValidator.validate(bookData);
            if (!validation.isValid) {
                return Promise.resolve({
                    success: false,
                    message: validation.errors.join('; ')
                });
            }
            
            var formattedData = BookValidator.format(bookData);
            
            return self.smartRequest(
                'POST',
                HttpHelper.buildUrl(API_CONFIG.ENDPOINTS.BOOKS.CREATE),
                formattedData,
                'Book created successfully',
                'Failed to create book'
            );
        };

        self.updateBook = function(id, bookData) {
            if (!id) {
                return Promise.resolve({ success: false, message: 'Book ID is required' });
            }
            
            var validation = BookValidator.validate(bookData);
            if (!validation.isValid) {
                return Promise.resolve({
                    success: false,
                    message: validation.errors.join('; ')
                });
            }
            
            var formattedData = BookValidator.format(bookData);
            
            return self.smartRequest(
                'POST',
                HttpHelper.buildUrl(API_CONFIG.ENDPOINTS.BOOKS.UPDATE, { id: id }),
                formattedData,
                'Book updated successfully',
                'Failed to update book'
            );
        };

        self.deleteBook = function(id) {
            if (!id) {
                return Promise.resolve({ success: false, message: 'Book ID is required' });
            }
            
            return $http({
                method: 'DELETE',
                url: HttpHelper.buildUrl(API_CONFIG.ENDPOINTS.BOOKS.DELETE, { id: id }),
                headers: HttpHelper.getHeaders('json')
            }).then(function(response) {
                return HttpHelper.handleResponse(response, 'Book deleted successfully');
            }).catch(function(error) {
                return HttpHelper.handleError(error, 'Failed to delete book');
            });
        };

        // Fixed importExcel method
        self.importExcel = function(file) {
            if (!file) {
                return Promise.resolve({ success: false, message: 'Excel file is required' });
            }

            var formData = new FormData();
            formData.append('file_import', file, file.name);

            // Log untuk debugging
            for (var pair of formData.entries()) {
                console.log(pair[0] + ':', pair[1]);
            }

            return $http({
                method: 'POST',
                url: HttpHelper.buildUrl(API_CONFIG.ENDPOINTS.BOOKS.IMPORT),
                data: formData,
                headers: {
                    'Authorization': 'Bearer ' + AuthService.getToken(),
                    'Accept': 'application/json',
                    'Content-Type': undefined // Biarkan browser yang set boundary
                },
                transformRequest: angular.identity
            }).then(function(response) {
                return HttpHelper.handleResponse(response, 'Books imported successfully');
            }).catch(function(error) {
                console.error('Import error:', error);
                return HttpHelper.handleError(error, 'Failed to import books');
            });
        };

        self.exportPDF = function() {
            var filename = FileHelper.generateTimestampedFilename('buku_export', 'pdf');
            
            return FileHelper.downloadFile(STORAGE_URLS.EXPORT.PDF, filename)
                .then(function(result) {
                    return {
                        success: true,
                        message: 'PDF export started successfully',
                        filename: filename
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: 'Failed to export PDF: ' + (error.message || 'Unknown error')
                    };
                });
        };

        self.exportExcel = function() {
            var filename = FileHelper.generateTimestampedFilename('buku_export', 'xlsx');
            
            return FileHelper.downloadFile(STORAGE_URLS.EXPORT.EXCEL, filename)
                .then(function(result) {
                    return {
                        success: true,
                        message: 'Excel export started successfully',
                        filename: filename
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: 'Failed to export Excel: ' + (error.message || 'Unknown error')
                    };
                });
        };

        self.downloadTemplate = function() {
            var filename = 'template_import_buku.xlsx';
            
            return FileHelper.downloadFile(STORAGE_URLS.TEMPLATE, filename)
                .then(function(result) {
                    return {
                        success: true,
                        message: 'Template download started successfully',
                        filename: filename
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: 'Failed to download template: ' + (error.message || 'Unknown error')
                    };
                });
        };

        self.generateAndExportPDF = function() {
            return $http({
                method: 'GET',
                url: HttpHelper.buildUrl(API_CONFIG.ENDPOINTS.BOOKS.EXPORT.PDF),
                headers: HttpHelper.getHeaders('json')
            }).then(function(response) {
                return self.exportPDF();
            }).catch(function(error) {
                return HttpHelper.handleError(error, 'Failed to generate PDF');
            });
        };

        self.generateAndExportExcel = function() {
            return $http({
                method: 'GET',
                url: HttpHelper.buildUrl(API_CONFIG.ENDPOINTS.BOOKS.EXPORT.EXCEL),
                headers: HttpHelper.getHeaders('json')
            }).then(function(response) {
                return self.exportExcel();
            }).catch(function(error) {
                return HttpHelper.handleError(error, 'Failed to generate Excel');
            });
        };

        self.searchBooks = function(query, limit) {
            if (!query?.trim()) {
                return Promise.resolve({ success: false, message: 'Search query is required' });
            }
            
            return self.getAllBooks(1, limit || 10, query.trim());
        };

        self.getBookStats = function() {
            return $http({
                method: 'GET',
                url: HttpHelper.buildUrl(API_CONFIG.ENDPOINTS.BOOKS.STATS || '/book/stats'),
                headers: HttpHelper.getHeaders('json')
            }).then(function(response) {
                return HttpHelper.handleResponse(response, 'Book statistics fetched successfully');
            }).catch(function(error) {
                return HttpHelper.handleError(error, 'Failed to fetch book statistics');
            });
        };

        // Utility methods
        self.validateBookData = function(bookData) {
            return BookValidator.validate(bookData);
        };

        self.formatBookData = function(bookData) {
            return BookValidator.format(bookData);
        };

        self.refreshBookList = function(callback) {
            return self.getAllBooks().then(function(result) {
                if (callback) callback(result);
                return result;
            });
        };
        
    }
]);