(function() {
    'use strict';

    angular.module('perpusApp')
        .service('BorrowService', BorrowService);

    BorrowService.$inject = ['ApiService', 'API_CONFIG', '$window'];

    function BorrowService(ApiService, API_CONFIG, $window) {
        var service = {
            // List dan Search
            getAllBorrows: getAllBorrows,
            getAllBorrowsComplete: getAllBorrowsComplete,
            getMemberBorrows: getMemberBorrows,
            getBorrowById: getBorrowById,
            getReturnList: getReturnList,
            
            // Actions
            borrowBook: borrowBook,
            borrowBookAuto: borrowBookAuto,
            acceptBorrow: acceptBorrow,
            returnBook: returnBook,
            
            // Helper functions
            searchBorrows: searchBorrows,
            getCurrentMemberId: getCurrentMemberId,
            clearUserData: clearUserData
        };

        return service;

        // GET /peminjaman/ - dengan pagination dan filter (untuk admin dan member)
        function getAllBorrows(page, perPage, filters) {
            var params = {
                page: page || 1,
                per_page: perPage || 10
            };
            
            if (filters) {
                if (filters.search) params.search = filters.search;
                if (filters.member_id) params.member_id = filters.member_id;
                if (filters.status) params.status = filters.status;
                if (filters.date_start) params.date_start = filters.date_start;
                if (filters.date_end) params.date_end = filters.date_end;
                if (filters.sort_by) params.sort_by = filters.sort_by;
                if (filters.sort_direction) params.sort_direction = filters.sort_direction;
            }
            
            return ApiService.get('/peminjaman', params)
                .then(function(response) {
                    var responseData = response.data;
                    
                    // Handle response structure berdasarkan backend Laravel response format
                    var peminjamanData = responseData.data?.peminjaman || responseData.peminjaman || {};
                    var borrowData = peminjamanData.data || [];
                    
                    // Transform data untuk memastikan struktur yang konsisten
                    var transformedData = borrowData.map(function(item) {
                        return {
                            id: item.id,
                            id_buku: item.id_buku,
                            id_member: item.id_member,
                            tanggal_peminjaman: item.tanggal_peminjaman,
                            tanggal_pengembalian: item.tanggal_pengembalian,
                            tanggal_pengembalian_actual: item.tanggal_pengembalian_actual,
                            status: item.status,
                            created_at: item.created_at,
                            updated_at: item.updated_at,
                            member: item.member || {},
                            book: item.book || {}
                        };
                    });
                    
                    return {
                        success: true,
                        data: transformedData,
                        total: peminjamanData.total || borrowData.length,
                        current_page: peminjamanData.current_page || 1,
                        per_page: peminjamanData.per_page || perPage,
                        last_page: peminjamanData.last_page || 1,
                        from: peminjamanData.from || 1,
                        to: peminjamanData.to || borrowData.length,
                        message: responseData.message || 'Data berhasil diambil'
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: error.data ? error.data.message : 'Gagal mengambil data peminjaman',
                        error: error
                    };
                });
        }

        // Method khusus untuk member - wrapper around getAllBorrows dengan filter member_id
        function getMemberBorrows(memberId, page, perPage, status, dateStart, dateEnd) {
            // Jika memberId tidak ada, coba ambil dari current user
            if (!memberId) {
                memberId = getCurrentMemberId();
            }
            
            if (!memberId) {
                return Promise.reject({
                    success: false,
                    message: 'ID member tidak ditemukan'
                });
            }
            
            var filters = {
                member_id: memberId
            };
            
            if (status) filters.status = status;
            if (dateStart) filters.date_start = dateStart;
            if (dateEnd) filters.date_end = dateEnd;
            
            return getAllBorrows(page, perPage, filters);
        }

        // GET /peminjaman/all - semua data tanpa pagination
        function getAllBorrowsComplete(filters) {
            var params = {};
            
            if (filters) {
                if (filters.search) params.search = filters.search;
                if (filters.member_id) params.member_id = filters.member_id;
                if (filters.status) params.status = filters.status;
                if (filters.date_start) params.date_start = filters.date_start;
                if (filters.date_end) params.date_end = filters.date_end;
                if (filters.sort_by) params.sort_by = filters.sort_by;
                if (filters.sort_direction) params.sort_direction = filters.sort_direction;
            }
            
            return ApiService.get('/peminjaman/all', params)
                .then(function(response) {
                    var responseData = response.data;
                    var borrowData = responseData.data?.peminjaman || responseData.peminjaman || [];
                    
                    // Transform data jika diperlukan
                    var transformedData = Array.isArray(borrowData) ? borrowData.map(function(item) {
                        return {
                            id: item.id,
                            id_buku: item.id_buku,
                            id_member: item.id_member,
                            tanggal_peminjaman: item.tanggal_peminjaman,
                            tanggal_pengembalian: item.tanggal_pengembalian,
                            tanggal_pengembalian_actual: item.tanggal_pengembalian_actual,
                            status: item.status,
                            created_at: item.created_at,
                            updated_at: item.updated_at,
                            member: item.member || {},
                            book: item.book || {}
                        };
                    }) : [];
                    
                    return {
                        success: true,
                        data: transformedData,
                        message: responseData.message || 'Data berhasil diambil'
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: error.data ? error.data.message : 'Gagal mengambil data peminjaman',
                        error: error
                    };
                });
        }

        // GET /peminjaman/show/{id} - detail peminjaman
        function getBorrowById(id) {
            return ApiService.get('/peminjaman/show/' + id)
                .then(function(response) {
                    var responseData = response.data;
                    
                    return {
                        success: true,
                        data: responseData.data?.book || responseData.book || {},
                        message: responseData.message || 'Data berhasil diambil'
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: error.data ? error.data.message : 'Gagal mengambil detail peminjaman',
                        error: error
                    };
                });
        }

        // GET /peminjaman/return - data pengembalian (riwayat pengembalian)
        function getReturnList(filters) {
            var params = {};
            
            if (filters) {
                if (filters.search) params.search = filters.search;
                if (filters.member_id) params.member_id = filters.member_id;
                if (filters.status) params.status = filters.status;
                if (filters.date_start) params.date_start = filters.date_start;
                if (filters.date_end) params.date_end = filters.date_end;
                if (filters.sort_by) params.sort_by = filters.sort_by;
                if (filters.sort_direction) params.sort_direction = filters.sort_direction;
            }
            
            return ApiService.get('/peminjaman/return', params)
                .then(function(response) {
                    var responseData = response.data;
                    var returnData = responseData.data?.peminjaman || responseData.peminjaman || [];
                    
                    // Transform data jika diperlukan
                    var transformedData = Array.isArray(returnData) ? returnData.map(function(item) {
                        return {
                            id: item.id,
                            id_buku: item.id_buku,
                            id_member: item.id_member,
                            tanggal_peminjaman: item.tanggal_peminjaman,
                            tanggal_pengembalian: item.tanggal_pengembalian,
                            tanggal_pengembalian_actual: item.tanggal_pengembalian_actual,
                            status: item.status,
                            created_at: item.created_at,
                            updated_at: item.updated_at,
                            member: item.member || {},
                            book: item.book || {}
                        };
                    }) : [];
                    
                    return {
                        success: true,
                        data: transformedData,
                        message: responseData.message || 'Data berhasil diambil'
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: error.data ? error.data.message : 'Gagal mengambil data pengembalian',
                        error: error
                    };
                });
        }

        // POST /peminjaman/book/{bukuId}/member/{memberId} - pinjam buku
        function borrowBook(bukuId, memberId, borrowData) {
            var data = borrowData || {};
            
            // Validasi data
            if (!bukuId) {
                return Promise.reject({
                    success: false,
                    message: 'ID buku harus diisi'
                });
            }
            
            if (!memberId) {
                return Promise.reject({
                    success: false,
                    message: 'ID member harus diisi'
                });
            }
            
            return ApiService.post('/peminjaman/book/' + bukuId + '/member/' + memberId, data)
                .then(function(response) {
                    var responseData = response.data;
                    
                    return {
                        success: true,
                        data: {
                            peminjaman: responseData.data?.peminjaman || responseData.peminjaman || {},
                            book: responseData.data?.book || responseData.book || {}
                        },
                        message: responseData.message || 'Peminjaman berhasil'
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: error.data ? error.data.message : 'Gagal melakukan peminjaman',
                        error: error
                    };
                });
        }

        // Fungsi alternatif untuk borrowBook tanpa perlu memberId (otomatis ambil dari session)
        function borrowBookAuto(bukuId, borrowData) {
            var memberId = getCurrentMemberId();
            
            if (!memberId) {
                return Promise.reject({
                    success: false,
                    message: 'ID member tidak ditemukan. Pastikan Anda sudah login.'
                });
            }
            
            return borrowBook(bukuId, memberId, borrowData);
        }

        // GET /peminjaman/book/{id}/accept - setujui peminjaman
        function acceptBorrow(borrowId) {
            if (!borrowId) {
                return Promise.reject({
                    success: false,
                    message: 'ID peminjaman harus diisi'
                });
            }
            
            return ApiService.get('/peminjaman/book/' + borrowId + '/accept')
                .then(function(response) {
                    var responseData = response.data;
                    
                    return {
                        success: true,
                        data: responseData.data?.peminjaman || responseData.peminjaman || {},
                        message: responseData.message || 'Peminjaman berhasil disetujui'
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: error.data ? error.data.message : 'Gagal menyetujui peminjaman',
                        error: error
                    };
                });
        }

        // POST /peminjaman/book/{id}/return - kembalikan buku
        function returnBook(borrowId, returnData) {
            var data = returnData || {};
            
            if (!borrowId) {
                return Promise.reject({
                    success: false,
                    message: 'ID peminjaman harus diisi'
                });
            }
            
            return ApiService.post('/peminjaman/book/' + borrowId + '/return', data)
                .then(function(response) {
                    var responseData = response.data;
                    
                    return {
                        success: true,
                        data: {
                            peminjaman: responseData.data?.peminjaman || responseData.peminjaman || {},
                            buku: responseData.data?.buku || responseData.buku || {}
                        },
                        message: responseData.message || 'Buku berhasil dikembalikan'
                    };
                })
                .catch(function(error) {
                    return {
                        success: false,
                        message: error.data ? error.data.message : 'Gagal mengembalikan buku',
                        error: error
                    };
                });
        }

        // Helper function untuk search peminjaman dengan filters
        function searchBorrows(searchTerm, page, perPage, additionalFilters) {
            var filters = { search: searchTerm };
            
            // Merge dengan filters tambahan jika ada
            if (additionalFilters) {
                angular.extend(filters, additionalFilters);
            }
            
            return getAllBorrows(page, perPage, filters);
        }

        // Fungsi helper untuk mendapatkan member ID dari user yang sedang login
        function getCurrentMemberId() {
            // Pastikan $window tersedia
            if (!$window || !$window.localStorage) {
                return null;
            }
            
            var currentUser = null;
            var memberId = null;
            
            // 1. Coba dari localStorage dengan key 'currentUser'
            try {
                var currentUserStr = $window.localStorage.getItem('currentUser');
                if (currentUserStr && currentUserStr !== 'undefined' && currentUserStr !== 'null') {
                    currentUser = JSON.parse(currentUserStr);
                    if (currentUser && typeof currentUser === 'object') {
                        memberId = currentUser.id || currentUser.member_id || currentUser.user_id;
                        if (memberId) {
                            return memberId;
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing error
            }
            
            // 2. Coba dari sessionStorage dengan key 'user'
            try {
                var userSessionStr = $window.sessionStorage.getItem('user');
                if (userSessionStr && userSessionStr !== 'undefined' && userSessionStr !== 'null') {
                    var userSession = JSON.parse(userSessionStr);
                    if (userSession && typeof userSession === 'object') {
                        memberId = userSession.id || userSession.member_id || userSession.user_id;
                        if (memberId) {
                            return memberId;
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing error
            }
            
            // 3. Coba dari localStorage dengan key 'authData'
            try {
                var authDataStr = $window.localStorage.getItem('authData');
                if (authDataStr && authDataStr !== 'undefined' && authDataStr !== 'null') {
                    var authData = JSON.parse(authDataStr);
                    if (authData && typeof authData === 'object') {
                        memberId = authData.user?.id || authData.user?.member_id || authData.user?.user_id;
                        if (memberId) {
                            return memberId;
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing error
            }
            
            // 4. Coba dari localStorage dengan key 'user'
            try {
                var userStr = $window.localStorage.getItem('user');
                if (userStr && userStr !== 'undefined' && userStr !== 'null') {
                    var user = JSON.parse(userStr);
                    if (user && typeof user === 'object') {
                        memberId = user.id || user.member_id || user.user_id;
                        if (memberId) {
                            return memberId;
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing error
            }
            
            // 5. Coba dari sessionStorage dengan key 'currentUser'
            try {
                var sessionCurrentUserStr = $window.sessionStorage.getItem('currentUser');
                if (sessionCurrentUserStr && sessionCurrentUserStr !== 'undefined' && sessionCurrentUserStr !== 'null') {
                    var sessionCurrentUser = JSON.parse(sessionCurrentUserStr);
                    if (sessionCurrentUser && typeof sessionCurrentUser === 'object') {
                        memberId = sessionCurrentUser.id || sessionCurrentUser.member_id || sessionCurrentUser.user_id;
                        if (memberId) {
                            return memberId;
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing error
            }
            
            return null;
        }

        // Fungsi untuk membersihkan data user (berguna untuk logout)
        function clearUserData() {
            if (!$window || !$window.localStorage) {
                return;
            }
            
            try {
                // Hapus semua kemungkinan key yang menyimpan data user
                var keysToRemove = [
                    'currentUser',
                    'user',
                    'authData',
                    'auth_token',
                    'token',
                    'access_token',
                    'refresh_token'
                ];
                
                keysToRemove.forEach(function(key) {
                    $window.localStorage.removeItem(key);
                    $window.sessionStorage.removeItem(key);
                });
            } catch (e) {
                // Ignore error
            }
        }
    }
})();