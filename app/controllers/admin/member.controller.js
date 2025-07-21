(function() {
    'use strict';

    angular.module('perpusApp')
        .controller('AdminMemberController', AdminMemberController);

    AdminMemberController.$inject = ['$scope', '$timeout', 'MemberService', 'AuthService'];

    function AdminMemberController($scope, $timeout, MemberService, AuthService) {
        var vm = this;
        
        init();

        function init() {
            if (!validateUserAccess()) return;
            initializeScope();
            bindEvents();
        }

        function validateUserAccess() {
            var currentUser = AuthService.getCurrentUser();
            if (!currentUser || currentUser.role !== 'admin') {
                AuthService.logout();
                return false;
            }
            $scope.currentUser = currentUser;
            return true;
        }

        function initializeScope() {
            // State management
            angular.extend($scope, {
                loading: false,
                error: '',
                success: '',
                searchQuery: '',
                searchResults: [],
                showSearchResults: false,
                // Functions
                searchMembers: searchMembers,
                selectMemberFromSearch: selectMemberFromSearch,
                clearSearch: clearSearch,
                logout: logout
            });
            
            vm.membersDataTable = null;
        }

        function bindEvents() {
            $scope.$on('$viewContentLoaded', initializeMembersDataTable);
            $scope.$on('$destroy', destroyDataTables);
        }

        // ===== DATATABLE MANAGEMENT =====

        function initializeMembersDataTable() {
            console.log('Initializing Members DataTable...');
            destroyDataTable('#membersTable');
            
            vm.membersDataTable = $('#membersTable').DataTable({
                processing: true,
                serverSide: true,
                responsive: true,
                autoWidth: false,
                pagingType: 'full_numbers',
                ajax: createMembersAjaxConfig(),
                columns: [
                    { data: 'name', name: 'name', title: 'Nama' },
                    { data: 'username', name: 'username', title: 'Username' },
                    { data: 'email', name: 'email', title: 'Email' },
                    { 
                        data: 'created_at', 
                        name: 'created_at', 
                        title: 'Tanggal Daftar',
                        render: data => data ? new Date(data).toLocaleDateString('id-ID') : '-'
                    },
                ],
                order: [[3, 'desc']],
                language: getDataTableLanguage(),
                pageLength: 7,
                lengthMenu: [[7, 10, 25, 50], [7, 10, 25, 50]]
            });
        }

        function createMembersAjaxConfig() {
            return function(data, callback, settings) {
                console.log('DataTable request data:', data);
                
                MemberService.getServerSideMembers(data)
                    .then(response => {
                        console.log('DataTable response:', response);
                        
                        if (response.success) {
                            callback({
                                draw: response.draw,
                                recordsTotal: response.recordsTotal,
                                recordsFiltered: response.recordsFiltered,
                                data: response.data
                            });
                        } else {
                            callback(createEmptyDataTableResponse(data.draw));
                            showError(response.message || 'Gagal memuat data member');
                        }
                    })
                    .catch(error => {
                        console.error('DataTable catch error:', error);
                        callback(createEmptyDataTableResponse(data.draw));
                        handleError(error);
                    });
            };
        }

        // ===== SEARCH FUNCTIONS =====

        function searchMembers() {
            console.log('searchMembers called with query:', $scope.searchQuery);
            
            if (vm.searchTimeout) $timeout.cancel(vm.searchTimeout);

            if (!$scope.searchQuery || $scope.searchQuery.trim().length < 2) {
                resetSearchResults();
                return;
            }

            vm.searchTimeout = $timeout(executeSearch, 300);
        }

        function executeSearch() {
            console.log('executeSearch called with query:', $scope.searchQuery);
            $scope.loading = true;
            clearMessages();
            
            const searchQuery = $scope.searchQuery.trim();
            const searchParams = { search: searchQuery, per_page: 10, page: 1 };
            
            console.log('Search params:', searchParams);
            
            const searchMethod = typeof MemberService.searchMembers === 'function' 
                ? () => MemberService.searchMembers(searchParams.search, searchParams.per_page, searchParams.page)
                : () => MemberService.getAllMembers(1, 10, { search: searchQuery });
            
            searchMethod()
                .then(response => {
                    console.log('Search response:', response);
                    
                    if (response && response.success) {
                        $scope.searchResults = Array.isArray(response.data) ? response.data : (response.data.data || []);
                        $scope.showSearchResults = true;
                        console.log('Search results count:', $scope.searchResults.length);
                        
                        if ($scope.searchResults.length === 0) {
                            showError(`Tidak ada member yang ditemukan dengan kata kunci: ${searchQuery}`);
                        }
                    } else {
                        resetSearchResults();
                        showError(response && response.message ? response.message : 'Gagal mencari member');
                    }
                })
                .catch(error => {
                    console.error('Search error:', error);
                    resetSearchResults();
                    handleSearchError(error);
                })
                .finally(() => {
                    $scope.loading = false;
                });
        }

        function resetSearchResults() {
            $scope.searchResults = [];
            $scope.showSearchResults = false;
        }

        function selectMemberFromSearch(member) {
            console.log('selectMemberFromSearch called with:', member);
            
            if (!member || !member.id) {
                console.error('Invalid member data:', member);
                showError('Data member tidak valid');
                return;
            }
            
            $scope.searchQuery = `${member.name} (${member.username || member.email})`;
            $scope.showSearchResults = false;
            
            // Redirect to borrowings page or emit event
            $scope.$emit('memberSelected', member);
        }

        function clearSearch() {
            $scope.searchQuery = '';
            resetSearchResults();
            clearMessages();
        }

        function handleSearchError(error) {
            console.error('Search operation failed:', error);
            let message = 'Terjadi kesalahan saat mencari member. Silakan coba lagi.';
            
            if (error && error.data) {
                message = error.data.message || error.data.error || message;
            } else if (error && error.message) {
                message = error.message;
            } else if (typeof error === 'string') {
                message = error;
            }
            
            if (error && error.status) {
                const statusMessages = {
                    '-1': 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
                    '404': 'Endpoint pencarian tidak ditemukan.',
                    '500': 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
                    '401': 'Sesi Anda telah berakhir. Silakan login kembali.',
                    '403': 'Anda tidak memiliki izin untuk melakukan pencarian.'
                };
                message = statusMessages[error.status] || message;
                
                if (error.status === 401) AuthService.logout();
            }
            
            showError(message);
        }

        function logout() {
            AuthService.logout();
        }

        // ===== UTILITY FUNCTIONS =====

        function getDataTableLanguage(type = 'data') {
            const emptyMessage = 'Tidak ada data yang tersedia pada tabel ini';
            const searchPlaceholder = 'Cari data...';
            
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
                emptyTable: emptyMessage,
                loadingRecords: "Sedang memuat...",
                searchPlaceholder: searchPlaceholder
            };
        }

        function createEmptyDataTableResponse(draw) {
            return { draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
        }

        function destroyDataTable(selector) {
            if ($.fn.DataTable.isDataTable(selector)) {
                $(selector).DataTable().destroy();
            }
        }

        function destroyDataTables() {
            if (vm.membersDataTable) {
                vm.membersDataTable.destroy();
                vm.membersDataTable = null;
            }
        }

        function showSuccess(message) {
            $scope.success = message;
            $scope.error = '';
            $timeout(() => $scope.success = '', 3000);
        }

        function showError(message) {
            $scope.error = message;
            $scope.success = '';
            $timeout(() => $scope.error = '', 3000);
        }

        function clearMessages() {
            $scope.error = '';
            $scope.success = '';
        }

        function handleError(error) {
            console.error('Operation failed:', error);
            let message = 'Terjadi kesalahan. Silakan coba lagi.';
            
            if (error && error.message) {
                message = error.message;
            } else if (error && error.data && error.data.message) {
                message = error.data.message;
            }
            
            showError(message);
        }

        // Global function for button onclick
        window.showMemberBorrowings = function(memberId) {
            // Emit event or redirect to borrowings page
            $scope.$emit('showMemberBorrowings', { memberId: memberId });
        };
    }
})();