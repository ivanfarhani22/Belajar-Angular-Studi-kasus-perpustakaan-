(function() {
    'use strict';

    angular.module('perpusApp')
        .controller('AdminBorrowingController', AdminBorrowingController);

    AdminBorrowingController.$inject = ['$scope', '$timeout', 'BorrowService', 'MemberService', 'AuthService', '$routeParams'];

    function AdminBorrowingController($scope, $timeout, BorrowService, MemberService, AuthService, $routeParams) {
        var vm = this;
        
        // ===== INITIALIZATION =====
        
        init();

        function init() {
            if (!validateUserAccess()) return;
            initializeScope();
            bindEvents();
            initializePage();
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
                showBorrowingsModal: false,
                selectedMember: null,
                memberFilter: '',
                // Functions
                showMemberBorrowings: showMemberBorrowings,
                closeModal: closeModal,
                refreshBorrowingsTable: refreshBorrowingsTable,
                filterByMember: filterByMember,
                clearMemberFilter: clearMemberFilter,
                logout: logout
            });
            
            // DataTable state
            vm.borrowingsDataTable = null;
            vm.memberId = $routeParams.memberId || null;
            vm.currentRequest = null;
            vm.refreshAttempts = 0;
            vm.lastRefreshTime = null;
            
            // Page persistence
            vm.currentPage = 0;
            vm.savedPageInfo = null;
            vm.isRefreshing = false;
        }

        function bindEvents() {
            $scope.$on('$viewContentLoaded', function() {
                $timeout(() => initializeBorrowingsDataTable(), 100);
            });
            $scope.$on('$destroy', destroyDataTables);
            $scope.$on('memberSelected', handleMemberSelected);
            $scope.$on('showMemberBorrowings', handleShowMemberBorrowings);
        }

        function initializePage() {
            if (vm.memberId) {
                showMemberBorrowings(vm.memberId);
            }
        }

        // ===== EVENT HANDLERS =====

        function handleMemberSelected(event, member) {
            showMemberBorrowings(member.id);
        }

        function handleShowMemberBorrowings(event, data) {
            showMemberBorrowings(data.memberId);
        }

        // ===== PAGE PERSISTENCE =====

        function saveCurrentPageInfo() {
            if (vm.borrowingsDataTable) {
                const pageInfo = vm.borrowingsDataTable.page.info();
                vm.savedPageInfo = {
                    page: pageInfo.page,
                    length: pageInfo.length,
                    pages: pageInfo.pages,
                    recordsTotal: pageInfo.recordsTotal
                };
                vm.currentPage = pageInfo.page;
            }
        }

        function restorePagePosition() {
            if (vm.borrowingsDataTable && vm.savedPageInfo !== null) {
                const currentPageInfo = vm.borrowingsDataTable.page.info();
                
                if (vm.savedPageInfo.page < currentPageInfo.pages && vm.savedPageInfo.page >= 0) {
                    vm.borrowingsDataTable.page(vm.savedPageInfo.page).draw(false);
                }
            }
        }

        function clearSavedPageInfo() {
            vm.savedPageInfo = null;
            vm.currentPage = 0;
        }

        // ===== DATATABLE MANAGEMENT =====
function initializeBorrowingsDataTable(memberId = null) {
    destroyDataTable('#borrowingsTable');
    abortCurrentRequest();
    clearSavedPageInfo();
    
    try {
        vm.borrowingsDataTable = $('#borrowingsTable').DataTable({
            processing: true,
            serverSide: true,
            responsive: true,
            autoWidth: false,
            deferRender: true,
            cache: false,
            ajax: createBorrowingsAjaxConfig(memberId),
            columns: getBorrowingsColumns(),
            order: [[4, 'desc']], // Updated order index (was 3, now 4 because of new No column)
            language: getDataTableLanguage('peminjaman'),
            pageLength: 10,
            lengthMenu: [[10, 13, 25, 50], [10, 13, 25, 50]],
            drawCallback: function(settings) {
                // Update row numbers when table is redrawn
                const api = this.api();
                const pageInfo = api.page.info();
                
                // Update row numbers for current page
                api.column(0, {page: 'current'}).nodes().each(function(cell, i) {
                    cell.innerHTML = pageInfo.start + i + 1;
                });
                
                if (vm.borrowingsDataTable && !vm.isRefreshing) {
                    vm.currentPage = pageInfo.page;
                }
            },
            initComplete: function(settings, json) {
                vm.isRefreshing = false;
            },
            error: function(xhr, error, thrown) {
                showError('Gagal memuat tabel data');
                vm.isRefreshing = false;
            }
        });
        
    } catch (error) {
        showError('Gagal menginisialisasi tabel data');
        vm.isRefreshing = false;
    }
}

function getBorrowingsColumns() {
    return [
        { 
            data: null,
            name: 'row_number',
            title: 'No',
            orderable: false,
            searchable: false,
            width: '50px',
            className: 'text-center',
            render: function (data, type, row, meta) {
                // Calculate row number based on current page and row index
                const pageInfo = vm.borrowingsDataTable ? vm.borrowingsDataTable.page.info() : { start: 0 };
                return pageInfo.start + meta.row + 1;
            }
        },
        { data: 'member_name', name: 'member_name', title: 'Nama Member' },
        { data: 'book_title', name: 'book_title', title: 'Judul Buku' },
        { data: 'book_pengarang', name: 'book_pengarang', title: 'Pengarang' },
        { 
            data: 'borrow_date', 
            name: 'borrow_date', 
            title: 'Tanggal Pinjam',
            render: data => data ? new Date(data).toLocaleDateString('id-ID') : '-'
        },
        { 
            data: 'due_date', 
            name: 'due_date', 
            title: 'Tanggal Kembali',
            render: data => data ? new Date(data).toLocaleDateString('id-ID') : '-'
        },
        { 
            data: 'status', 
            name: 'status', 
            title: 'Status',
            render: renderStatusBadge
        },
        {
            data: null,
            orderable: false,
            searchable: false,
            title: 'Aksi',
            render: renderActionButtons
        }
    ];
}

        function renderStatusBadge(data, type, row) {
            const statusConfig = {
                'Menunggu Persetujuan': 'badge-warning',
                'Disetujui': 'badge-info',
                'Dikembalikan': 'badge-success',
                'Terlambat': 'badge-danger'
            };
            const badgeClass = statusConfig[data] || 'badge-secondary';
            return `<span class="badge ${badgeClass}">${data}</span>`;
        }

        function renderActionButtons(data, type, row) {
            let actions = '';
            const statusCode = parseInt(row.status_code);
            
            if (statusCode === 1) {
                actions += `<button class="btn btn-sm btn-success" onclick="window.approveBorrow(${row.id})" title="Setujui">
                    <i class="fas fa-check"></i>
                </button>`;
            } else if (statusCode === 2 || statusCode === 4) {
                // Baik status "Disetujui" (2) maupun "Terlambat" (4) bisa dikembalikan
                actions += `<button class="btn btn-sm btn-info" onclick="window.markAsReturned(${row.id})" title="Tandai Dikembalikan">
                    <i class="fas fa-undo"></i>
                </button>`;
            }
            
            return actions || '<span class="text-muted">-</span>';
        }

        function createBorrowingsAjaxConfig(memberId) {
            return function(data, callback, settings) {
                const requestParams = buildRequestParams(data, memberId);
                
                abortCurrentRequest();
                
                vm.currentRequest = BorrowService.getAllBorrows(requestParams.page, requestParams.perPage, requestParams.filters)
                    .then(response => handleBorrowingsResponse(response, data, callback))
                    .catch(error => handleBorrowingsError(error, data, callback))
                    .finally(() => vm.currentRequest = null);
            };
        }

        function buildRequestParams(data, memberId) {
            const page = Math.floor(data.start / data.length) + 1;
            const perPage = data.length;
            const searchQuery = data.search.value || '';
            
            let sortBy = 'created_at';
            let sortDirection = 'desc';
            
            if (data.order && data.order[0]) {
                const orderColumn = data.columns[data.order[0].column];
                if (orderColumn && orderColumn.data) {
                    sortBy = orderColumn.data;
                    sortDirection = data.order[0].dir || 'desc';
                }
            }

            const filters = {
                search: searchQuery,
                sort_by: sortBy,
                sort_direction: sortDirection,
                _t: new Date().getTime(),
                _refresh: Math.random(),
                _page: page,
                _nocache: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                _draw: data.draw
            };

            if (memberId) {
                filters.member_id = memberId;
            }

            return { page, perPage, filters };
        }

        function handleBorrowingsResponse(response, data, callback) {
            if (response.success) {
                const transformedData = response.data.map(transformBorrowingData);
                callback({
                    draw: data.draw,
                    recordsTotal: response.total || 0,
                    recordsFiltered: response.total || 0,
                    data: transformedData
                });
            } else {
                callback(createEmptyDataTableResponse(data.draw));
                showError(response.message || 'Gagal memuat data peminjaman');
            }
        }

        function handleBorrowingsError(error, data, callback) {
            callback(createEmptyDataTableResponse(data.draw));
            handleError(error);
        }

        function transformBorrowingData(item) {
            let statusCode = parseInt(item.status) || 0;
            
            // Cek apakah peminjaman terlambat (lebih dari 14 hari)
            if (statusCode === 2) { // Jika status "Disetujui"
                const borrowDate = new Date(item.tanggal_peminjaman);
                const currentDate = new Date();
                const daysDifference = Math.ceil((currentDate - borrowDate) / (1000 * 60 * 60 * 24));
                
                if (daysDifference > 14) {
                    statusCode = 4; // Ubah status menjadi "Terlambat"
                }
            }
            
            return {
                id: item.id,
                member_name: item.member ? item.member.name : '-',
                book_title: item.book ? item.book.judul : '-',
                book_pengarang: item.book ? item.book.pengarang : '-',
                borrow_date: item.tanggal_peminjaman,
                due_date: item.tanggal_pengembalian,
                return_date: item.tanggal_pengembalian_actual || null,
                status: getStatusText(statusCode),
                status_code: statusCode,
                created_at: item.created_at
            };
        }

        // ===== REFRESH FUNCTIONS =====

        function refreshBorrowingsTable() {
            if (vm.borrowingsDataTable) {
                saveCurrentPageInfo();
                vm.isRefreshing = true;
                
                vm.borrowingsDataTable.ajax.reload(function(json) {
                    vm.isRefreshing = false;
                    $timeout(() => restorePagePosition(), 100);
                }, false);
            }
        }

        function smartRefreshBorrowingsTable() {
            if (!vm.borrowingsDataTable) {
                initializeBorrowingsDataTable($scope.selectedMember?.id);
                return;
            }

            resetRefreshAttemptsIfNeeded();
            vm.lastRefreshTime = Date.now();
            vm.refreshAttempts = (vm.refreshAttempts || 0) + 1;

            saveCurrentPageInfo();
            vm.isRefreshing = true;

            vm.borrowingsDataTable.ajax.reload(function(json) {
                if (shouldTryCompleteReinit(json)) {
                    $timeout(() => completeDataTableReinit(), 250);
                } else {
                    vm.refreshAttempts = 0;
                    vm.isRefreshing = false;
                    $timeout(() => restorePagePosition(), 100);
                }
            }, false);
        }

        function resetRefreshAttemptsIfNeeded() {
            if (vm.lastRefreshTime && (Date.now() - vm.lastRefreshTime) > 5000) {
                vm.refreshAttempts = 0;
            }
        }

        function shouldTryCompleteReinit(json) {
            return !json || (json.recordsTotal === 0 && json.recordsFiltered === 0 && vm.refreshAttempts < 3);
        }

        function completeDataTableReinit() {
            const currentMemberId = $scope.selectedMember ? $scope.selectedMember.id : null;
            const savedPage = vm.savedPageInfo;
            
            if (vm.borrowingsDataTable) {
                vm.borrowingsDataTable.destroy();
                vm.borrowingsDataTable = null;
            }
            
            $('#borrowingsTable').empty();
            
            $timeout(() => {
                initializeBorrowingsDataTable(currentMemberId);
                if (savedPage) {
                    vm.savedPageInfo = savedPage;
                    $timeout(() => restorePagePosition(), 500);
                }
            }, 100);
        }

        // ===== MEMBER OPERATIONS =====

        function showMemberBorrowings(memberId) {
            $scope.loading = true;
            clearMessages();
            
            MemberService.getMemberDetail(memberId)
                .then(response => {
                    if (response && response.success) {
                        setSelectedMemberAndShowModal(response.data, memberId);
                    } else {
                        showError(response.message || 'Member tidak ditemukan');
                    }
                })
                .catch(error => handleError(error))
                .finally(() => $scope.loading = false);
        }

        function setSelectedMemberAndShowModal(memberData, memberId) {
            $scope.selectedMember = {
                id: memberData.id,
                name: memberData.name,
                username: memberData.username,
                email: memberData.email,
                created_at: memberData.created_at
            };
            $scope.showBorrowingsModal = true;
            $scope.loading = false;
            
            $('#memberBorrowingsModal').modal('show');
            $timeout(() => initializeBorrowingsDataTable(memberId), 300);
        }

        function closeModal() {
            $scope.showBorrowingsModal = false;
            $scope.selectedMember = null;
            clearMessages();
            clearSavedPageInfo();
            
            $('#memberBorrowingsModal').modal('hide');
            
            if (vm.borrowingsDataTable) {
                vm.borrowingsDataTable.destroy();
                vm.borrowingsDataTable = null;
            }
        }

        function filterByMember() {
            if (vm.borrowingsDataTable) {
                saveCurrentPageInfo();
                vm.borrowingsDataTable.ajax.reload(function() {
                    $timeout(() => restorePagePosition(), 100);
                }, false);
            }
        }

        function clearMemberFilter() {
            $scope.memberFilter = '';
            if (vm.borrowingsDataTable) {
                saveCurrentPageInfo();
                vm.borrowingsDataTable.ajax.reload(function() {
                    $timeout(() => restorePagePosition(), 100);
                }, false);
            }
        }

        // ===== BORROWING ACTIONS =====

        function approveBorrow(borrowId) {
            if (!borrowId) {
                showError('ID peminjaman tidak valid');
                return;
            }
            
            $scope.loading = true;
            clearMessages();
            
            BorrowService.acceptBorrow(borrowId)
                .then(response => {
                    if (response && response.success) {
                        showSuccess('Peminjaman berhasil disetujui');
                        $timeout(() => smartRefreshBorrowingsTable(), 300);
                        forceApplyIfNeeded();
                    } else {
                        showError(response.message || 'Gagal menyetujui peminjaman');
                    }
                })
                .catch(error => handleError(error))
                .finally(() => $scope.loading = false);
        }

        function markAsReturned(borrowId) {
            if (!borrowId) {
                showError('ID peminjaman tidak valid');
                return;
            }
            
            $scope.loading = true;
            clearMessages();
            
            BorrowService.returnBook(borrowId, {})
                .then(response => {
                    if (response && response.success) {
                        showSuccess('Buku berhasil ditandai sebagai dikembalikan');
                        $timeout(() => smartRefreshBorrowingsTable(), 300);
                        forceApplyIfNeeded();
                    } else {
                        showError(response.message || 'Gagal menandai buku sebagai dikembalikan');
                    }
                })
                .catch(error => handleError(error))
                .finally(() => $scope.loading = false);
        }

        function logout() {
            AuthService.logout();
        }

        // ===== UTILITY FUNCTIONS =====

        function getStatusText(statusCode) {
            const code = parseInt(statusCode);
            const statusMap = {
                1: 'Menunggu Persetujuan',
                2: 'Disetujui', 
                3: 'Dikembalikan',
                4: 'Terlambat'
            };
            return statusMap[code] || 'Unknown';
        }

        function getDataTableLanguage(type = 'data') {
            const emptyMessage = type === 'peminjaman' ? 'Tidak ada data peminjaman' : 'Tidak ada data yang tersedia pada tabel ini';
            const searchPlaceholder = type === 'peminjaman' ? 'Cari peminjaman...' : 'Cari data...';
            
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
            if (vm.borrowingsDataTable) {
                vm.borrowingsDataTable.destroy();
                vm.borrowingsDataTable = null;
            }
            
            abortCurrentRequest();
            clearSavedPageInfo();
        }

        function abortCurrentRequest() {
            if (vm.currentRequest) {
                vm.currentRequest.abort();
                vm.currentRequest = null;
            }
        }

        function forceApplyIfNeeded() {
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }

        // ===== MESSAGE HANDLING =====

        function showSuccess(message) {
            $scope.success = message;
            $scope.error = '';
            $timeout(() => $scope.success = '', 5000);
        }

        function showError(message) {
            $scope.error = message;
            $scope.success = '';
            $timeout(() => $scope.error = '', 5000);
        }

        function clearMessages() {
            $scope.error = '';
            $scope.success = '';
        }

        function handleError(error) {
            let message = 'Terjadi kesalahan. Silakan coba lagi.';
            
            if (error && error.message) {
                message = error.message;
            } else if (error && error.data && error.data.message) {
                message = error.data.message;
            } else if (typeof error === 'string') {
                message = error;
            }
            
            showError(message);
        }

        // ===== GLOBAL FUNCTIONS FOR BUTTON ONCLICK =====

        window.approveBorrow = function(borrowId) {
            if ($scope && !$scope.$$destroyed) {
                if ($scope.$$phase) {
                    approveBorrow(borrowId);
                } else {
                    $scope.$apply(() => approveBorrow(borrowId));
                }
            } else {
                approveBorrow(borrowId);
            }
        };

        window.markAsReturned = function(borrowId) {
            if ($scope && !$scope.$$destroyed) {
                if ($scope.$$phase) {
                    markAsReturned(borrowId);
                } else {
                    $scope.$apply(() => markAsReturned(borrowId));
                }
            } else {
                markAsReturned(borrowId);
            }
        };
    }
})();