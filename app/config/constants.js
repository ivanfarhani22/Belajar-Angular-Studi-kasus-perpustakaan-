(function() {
    'use strict';

// API Configuration - FIXED
angular.module('perpusApp')
    .constant('API_CONFIG', {
        BASE_URL: 'http://perpus-api.mamorasoft.com/api',
        ENDPOINTS: {
            LOGIN: '/login',
            REGISTER: '/register',
            LOGOUT: '/logout',
            VALIDATE: '/validate',
            PROFILE: '/profile',
            BOOKS: {
                ALL: '/book/all',
                DETAIL: '/book/{id}',
                DASHBOARD: '/book/dashboard',
                LIST: '/book/',
                SEARCH: '/book/search',
                FILTER: '/book/filter/{kategori}',
                CREATE: '/book/create',
                UPDATE: '/book/{id}/update',
                DELETE: '/book/{id}/delete',
                IMPORT: '/book/import/excel',
                EXPORT: {
                    PDF: '/book/export/pdf',
                    EXCEL: '/book/export/excel'
                },
                TEMPLATE: '/book/download/template'
            },
            CATEGORIES: {
                ALL: '/category/all',
                ALL_ALL: '/category/all/all',
                DETAIL: '/category/{id}',
                BOOKS_BY_CATEGORY: '/category/{category}/book/all',
                SEARCH: '/category/search',
                CREATE: '/category/create',
                UPDATE: '/category/update/{id}',
                DELETE: '/category/{id}/delete'
            },
            USERS: {
                ALL: '/user/all',
                DETAIL: '/user/{id}',
                MEMBERS: '/user/member/all'
            },
            MEMBERS: {
                ALL: '/user/member/all',
                DETAIL: '/user/{id}'
            },
            PEMINJAMAN: {
                ALL: '/peminjaman/all',
                LIST: '/peminjaman/',
                DETAIL: '/peminjaman/show/{id}',
                RETURN_LIST: '/peminjaman/return',
                PINJAM_BUKU: '/peminjaman/book/{bukuId}/member/{memberId}',
                ACCEPT: '/peminjaman/book/{id}/accept',
                RETURN: '/peminjaman/book/{id}/return'
            }
        },
        HEADERS: {
            DEFAULT: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data'
            }
        }
    });

    // Application Configuration
    angular.module('perpusApp')
        .constant('APP_CONFIG', {
            APP_NAME: 'Perpustakaan App',
            VERSION: '1.0.0',
            DESCRIPTION: 'Sistem Manajemen Perpustakaan',
            AUTHOR: 'Perpustakaan Team',
            PAGINATION: {
                DEFAULT_PAGE: 1,
                DEFAULT_PER_PAGE: 10,
                MAX_PER_PAGE: 100,
                SHOW_ENTRIES: [10, 25, 50, 100]
            },
            ROLES: {
                ADMIN: 'admin',
                MEMBER: 'member'
            },
            STATUS: {
                ACTIVE: 'active',
                INACTIVE: 'inactive',
                PENDING: 'pending'
            },
            BOOK_STATUS: {
                AVAILABLE: 'available',
                BORROWED: 'borrowed',
                DAMAGED: 'damaged',
                LOST: 'lost'
            },
            LOAN_STATUS: {
                ACTIVE: 'active',
                RETURNED: 'returned',
                OVERDUE: 'overdue'
            },
            DATE_FORMAT: 'DD/MM/YYYY',
            DATETIME_FORMAT: 'DD/MM/YYYY HH:mm'
        });

    // Messages Configuration
    angular.module('perpusApp')
        .constant('MESSAGES', {
            SUCCESS: {
                LOGIN: 'Login berhasil!',
                LOGOUT: 'Logout berhasil!',
                REGISTER: 'Registrasi berhasil!',
                SAVE: 'Data berhasil disimpan!',
                UPDATE: 'Data berhasil diperbarui!',
                DELETE: 'Data berhasil dihapus!',
                IMPORT: 'Import data berhasil!',
                EXPORT: 'Export data berhasil!',
                PINJAM: 'Peminjaman buku berhasil!',
                RETURN: 'Pengembalian buku berhasil!',
                ACCEPT: 'Peminjaman berhasil diterima!'
            },
            ERROR: {
                LOGIN: 'Login gagal! Periksa username dan password.',
                REGISTER: 'Registrasi gagal! Periksa data yang diinput.',
                NETWORK: 'Terjadi kesalahan koneksi. Silakan coba lagi.',
                PERMISSION: 'Anda tidak memiliki akses untuk melakukan aksi ini.',
                VALIDATION: 'Data yang diinput tidak valid.',
                SERVER: 'Terjadi kesalahan server. Silakan hubungi administrator.',
                NOT_FOUND: 'Data tidak ditemukan.',
                DUPLICATE: 'Data sudah ada.',
                UNAUTHORIZED: 'Sesi Anda telah berakhir. Silakan login kembali.'
            },
            CONFIRM: {
                DELETE: 'Apakah Anda yakin ingin menghapus data ini?',
                LOGOUT: 'Apakah Anda yakin ingin keluar?',
                SAVE: 'Apakah Anda yakin ingin menyimpan data ini?',
                CANCEL: 'Apakah Anda yakin ingin membatalkan?',
                RETURN: 'Apakah Anda yakin ingin mengembalikan buku ini?',
                ACCEPT: 'Apakah Anda yakin ingin menerima peminjaman ini?'
            }
        });

})();