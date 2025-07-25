(function() {
    'use strict';

    angular.module('perpusApp')
        .service('MemberService', MemberService);

    MemberService.$inject = ['ApiService', 'API_CONFIG'];

    function MemberService(ApiService, API_CONFIG) {
        var service = {
            // Admin functions based on checklist
            getServerSideMembers: getServerSideMembers,
            searchMembers: searchMembers,
            getMemberDetail: getMemberDetail,
            searchMembersForBorrowing: searchMembersForBorrowing,
            // Tambahan untuk pagination manual
            getAllMembersWithPagination: getAllMembersWithPagination,
            // Fungsi baru untuk ambil semua data sekaligus
            getAllMembers: getAllMembers,
            // Cache untuk menyimpan semua data member
            _allMembersCache: null,
            _cacheTimestamp: null,
            _cacheExpiry: 5 * 60 * 1000 // 5 menit
        };

        return service;

        function getServerSideMembers(datatableParams) {
            // Jika ada search query, gunakan client-side filtering
            if (datatableParams.search && datatableParams.search.value && datatableParams.search.value.trim()) {
                return performClientSideSearch(datatableParams);
            }
            
            // Jika tidak ada search, gunakan server-side biasa
            var params = buildDatatableParams(datatableParams);
            
            return ApiService.get(API_CONFIG.ENDPOINTS.MEMBERS.ALL, params)
                .then(function(response) {
                    return formatDatatableResponse(response.data, datatableParams.draw);
                })
                .catch(function(error) {
                    return handleDatatableError(error, datatableParams.draw);
                });
        }

        function performClientSideSearch(datatableParams) {
            return getAllMembersFromCache()
                .then(function(allMembers) {
                    var searchQuery = datatableParams.search.value.toLowerCase().trim();
                    
                    // Filter data berdasarkan search query
                    var filteredMembers = allMembers.filter(function(member) {
                        return (
                            (member.name && member.name.toLowerCase().includes(searchQuery)) ||
                            (member.username && member.username.toLowerCase().includes(searchQuery)) ||
                            (member.email && member.email.toLowerCase().includes(searchQuery)) ||
                            (member.phone && member.phone.toLowerCase().includes(searchQuery)) ||
                            (member.member_number && member.member_number.toLowerCase().includes(searchQuery))
                        );
                    });
                    
                    // Handle sorting
                    if (datatableParams.order && datatableParams.order[0]) {
                        var orderColumn = datatableParams.columns[datatableParams.order[0].column];
                        var sortDirection = datatableParams.order[0].dir;
                        
                        if (orderColumn && orderColumn.data) {
                            filteredMembers.sort(function(a, b) {
                                var aVal = a[orderColumn.data] || '';
                                var bVal = b[orderColumn.data] || '';
                                
                                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                                
                                if (sortDirection === 'asc') {
                                    return aVal > bVal ? 1 : (aVal < bVal ? -1 : 0);
                                } else {
                                    return aVal < bVal ? 1 : (aVal > bVal ? -1 : 0);
                                }
                            });
                        }
                    }
                    
                    // Handle pagination
                    var start = datatableParams.start || 0;
                    var length = datatableParams.length || 10;
                    var paginatedMembers = filteredMembers.slice(start, start + length);
                    
                    return {
                        draw: parseInt(datatableParams.draw),
                        recordsTotal: allMembers.length,
                        recordsFiltered: filteredMembers.length,
                        data: paginatedMembers,
                        success: true,
                        message: 'Search completed'
                    };
                })
                .catch(function(error) {
                    return handleDatatableError(error, datatableParams.draw);
                });
        }
        function getAllMembersFromCache() {
            var now = Date.now();
            
            // Check if cache is valid
            if (service._allMembersCache && 
                service._cacheTimestamp && 
                (now - service._cacheTimestamp) < service._cacheExpiry) {
                return Promise.resolve(service._allMembersCache);
            }
            
            // Fetch all members data (tanpa pagination)
            return fetchAllMembersData()
                .then(function(members) {
                    service._allMembersCache = members;
                    service._cacheTimestamp = now;
                    return members;
                });
        }
        function fetchAllMembersData() {
            var allMembers = [];
            var currentPage = 1;
            var perPage = 50; // Ambil dalam batch yang lebih besar
            
            function fetchPage(page) {
                var params = {
                    page: page,
                    per_page: perPage,
                    search: '',
                    sort_by: 'created_at',
                    sort_direction: 'desc'
                };
                
                return ApiService.get(API_CONFIG.ENDPOINTS.MEMBERS.ALL, params)
                    .then(function(response) {
                        var result = processApiResponse(response.data);
                        allMembers = allMembers.concat(result.users);
                        
                        // Check if there are more pages
                        if (result.pagination && result.pagination.has_more_pages) {
                            return fetchPage(page + 1);
                        }
                        
                        return allMembers;
                    });
            }
            
            return fetchPage(currentPage);
        }

        function searchMembers(query, limit, page) {
            if (!query || query.trim() === '') {
                // Jika tidak ada query, gunakan getAllMembers biasa
                return getAllMembers({
                    sort_by: 'created_at',
                    sort_direction: 'desc'
                });
            }
            
            return getAllMembersFromCache()
                .then(function(allMembers) {
                    var searchQuery = query.toLowerCase().trim();
                    
                    // Filter data berdasarkan search query
                    var filteredMembers = allMembers.filter(function(member) {
                        return (
                            (member.name && member.name.toLowerCase().includes(searchQuery)) ||
                            (member.username && member.username.toLowerCase().includes(searchQuery)) ||
                            (member.email && member.email.toLowerCase().includes(searchQuery)) ||
                            (member.phone && member.phone.toLowerCase().includes(searchQuery)) ||
                            (member.member_number && member.member_number.toLowerCase().includes(searchQuery))
                        );
                    });
                    
                    // Handle pagination jika ada limit dan page
                    if (limit && page) {
                        var start = (page - 1) * limit;
                        var paginatedMembers = filteredMembers.slice(start, start + limit);
                        
                        return {
                            success: true,
                            data: paginatedMembers,
                            total: filteredMembers.length,
                            pagination: {
                                current_page: page,
                                per_page: limit,
                                total: filteredMembers.length,
                                last_page: Math.ceil(filteredMembers.length / limit),
                                has_more_pages: (page * limit) < filteredMembers.length
                            },
                            message: 'Search completed'
                        };
                    }
                    
                    // Tanpa pagination
                    return {
                        success: true,
                        data: filteredMembers,
                        total: filteredMembers.length,
                        message: 'Search completed'
                    };
                })
                .catch(function(error) {
                    return handleError(error, 'Search failed');
                });
        }

        function searchMembersForBorrowing(query, limit) {
            if (!query || query.trim() === '') {
                // Jika tidak ada query, ambil data terbaru
                return getAllMembers({
                    sort_by: 'created_at',
                    sort_direction: 'desc'
                }).then(function(response) {
                    if (response.success) {
                        var members = limit ? response.data.slice(0, limit) : response.data;
                        return formatMembersForBorrowing(members, response.total, response.message);
                    }
                    return response;
                });
            }
            
            return getAllMembersFromCache()
                .then(function(allMembers) {
                    var searchQuery = query.toLowerCase().trim();
                    
                    // Filter data berdasarkan search query
                    var filteredMembers = allMembers.filter(function(member) {
                        return (
                            (member.name && member.name.toLowerCase().includes(searchQuery)) ||
                            (member.username && member.username.toLowerCase().includes(searchQuery)) ||
                            (member.email && member.email.toLowerCase().includes(searchQuery)) ||
                            (member.phone && member.phone.toLowerCase().includes(searchQuery)) ||
                            (member.member_number && member.member_number.toLowerCase().includes(searchQuery))
                        );
                    });
                    
                    // Limit hasil jika ada
                    if (limit) {
                        filteredMembers = filteredMembers.slice(0, limit);
                    }
                    
                    return formatMembersForBorrowing(filteredMembers, filteredMembers.length, 'Search completed');
                })
                .catch(function(error) {
                    return handleError(error, 'Search failed');
                });
        }

        function clearCache() {
            service._allMembersCache = null;
            service._cacheTimestamp = null;
        }

        // Expose clearCache function
        service.clearCache = clearCache;


        function getAllMembers(options) {
            options = options || {};
            
            var params = {
                search: options.search || '',
                sort_by: options.sort_by || 'created_at',
                sort_direction: options.sort_direction || 'desc'
            };

            return ApiService.get(API_CONFIG.ENDPOINTS.MEMBERS.ALL, params)
                .then(function(response) {
                    var result = processApiResponse(response.data);
                    
                    return {
                        success: true,
                        data: result.users,
                        total: result.total,
                        message: response.data.message || 'Success'
                    };
                })
                .catch(function(error) {
                    return handleError(error, 'Failed to fetch all members');
                });
        }


        function getAllMembersWithPagination(options) {
            options = options || {};
            
            var params = {
                page: options.page || 1,
                per_page: options.per_page || 10,
                search: options.search || '',
                sort_by: options.sort_by || 'created_at',
                sort_direction: options.sort_direction || 'desc'
            };

            return ApiService.get(API_CONFIG.ENDPOINTS.MEMBERS.ALL, params)
                .then(function(response) {
                    var result = processApiResponse(response.data);
                    
                    return {
                        success: true,
                        data: result.users,
                        pagination: result.pagination,
                        total: result.total,
                        message: response.data.message || 'Success'
                    };
                })
                .catch(function(error) {
                    return handleError(error, 'Failed to fetch members');
                });
        }

        function getMemberDetail(memberId) {
            if (!memberId) {
                return Promise.reject({
                    success: false,
                    message: 'Member ID is required'
                });
            }

            var endpoint = API_CONFIG.ENDPOINTS.MEMBERS.DETAIL.replace('{id}', memberId);
            
            return ApiService.get(endpoint)
                .then(function(response) {
                    return {
                        success: true,
                        data: response.data.user || response.data,
                        message: response.data.message || 'Success'
                    };
                })
                .catch(function(error) {
                    return handleError(error, 'Failed to fetch member detail');
                });
        }

        function formatMembersForBorrowing(members, total, message) {
            var formattedMembers = members.map(function(member) {
                return {
                    id: member.id,
                    text: member.name + ' (' + (member.username || member.email) + ')',
                    name: member.name,
                    username: member.username,
                    email: member.email,
                    status: member.status,
                    phone: member.phone,
                    address: member.address,
                    member_number: member.member_number,
                    joined_date: member.joined_date
                };
            });

            return {
                success: true,
                data: formattedMembers,
                total: total,
                message: message
            };
        }


        function processApiResponse(responseData) {
            var result = {
                users: [],
                pagination: {
                    current_page: 1,
                    per_page: 10,
                    total: 0,
                    last_page: 1,
                    from: 0,
                    to: 0,
                    has_more_pages: false
                },
                total: 0
            };

            // Handle different response structures
            var usersData = null;
            var paginationSource = null;

            // Check for nested structure: data.users
            if (responseData && responseData.data && responseData.data.users) {
                usersData = responseData.data.users.data || responseData.data.users;
                paginationSource = responseData.data.users;
            }
            // Check for direct users array
            else if (responseData && responseData.users) {
                usersData = responseData.users.data || responseData.users;
                paginationSource = responseData.users;
            }
            // Check for direct data array
            else if (responseData && responseData.data && Array.isArray(responseData.data)) {
                usersData = responseData.data;
                paginationSource = responseData;
            }
            // Check for root array
            else if (responseData && Array.isArray(responseData)) {
                usersData = responseData;
                paginationSource = null;
            }
            // Fallback
            else if (responseData) {
                usersData = responseData.data || responseData.users || [];
                paginationSource = responseData;
            }

            // Extract users array
            if (Array.isArray(usersData)) {
                result.users = usersData;
            } else if (usersData && Array.isArray(usersData.data)) {
                result.users = usersData.data;
            } else {
                result.users = [];
            }

            // Extract pagination data
            if (paginationSource) {
                result.pagination.current_page = paginationSource.current_page || paginationSource.page || 1;
                result.pagination.per_page = paginationSource.per_page || paginationSource.limit || 10;
                result.pagination.total = paginationSource.total || 0;
                result.pagination.last_page = paginationSource.last_page || 
                    Math.ceil(result.pagination.total / result.pagination.per_page) || 1;
                result.pagination.from = paginationSource.from || 0;
                result.pagination.to = paginationSource.to || 0;
                result.pagination.has_more_pages = paginationSource.has_more_pages || 
                    (result.pagination.current_page < result.pagination.last_page);
            }

            // Set total
            result.total = result.pagination.total || result.users.length;

            return result;
        }

        function buildDatatableParams(datatableParams) {
            var params = {
                page: Math.floor(datatableParams.start / datatableParams.length) + 1,
                per_page: datatableParams.length,
                search: datatableParams.search.value || '',
                sort_by: 'created_at',
                sort_direction: 'desc'
            };

            // Add sorting if available
            if (datatableParams.order && datatableParams.order[0]) {
                var orderColumn = datatableParams.columns[datatableParams.order[0].column];
                if (orderColumn && orderColumn.data) {
                    params.sort_by = orderColumn.data;
                    params.sort_direction = datatableParams.order[0].dir || 'desc';
                }
            }

            return params;
        }

        function formatDatatableResponse(responseData, draw) {
            var result = processApiResponse(responseData);
            
            var datatableResult = {
                draw: parseInt(draw),
                recordsTotal: result.total,
                recordsFiltered: result.total,
                data: result.users,
                success: true,
                message: responseData.message || 'Success'
            };
            
            return datatableResult;
        }

        function handleDatatableError(error, draw) {
            return {
                draw: parseInt(draw),
                recordsTotal: 0,
                recordsFiltered: 0,
                data: [],
                success: false,
                message: (error && error.data && error.data.message) || 'Failed to fetch members'
            };
        }

        function handleError(error, defaultMessage) {
            return {
                success: false,
                data: [],
                total: 0,
                message: (error && error.data && error.data.message) || defaultMessage
            };
        }
    }
})();