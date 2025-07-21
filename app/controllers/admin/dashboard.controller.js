angular.module('perpusApp')
    .controller('AdminDashboardController', ['$scope', 'AuthService', 'BookService', 'CategoryService', 'MemberService', 'BorrowService', 
        function($scope, AuthService, BookService, CategoryService, MemberService, BorrowService) {
        
        // Initialize
        $scope.currentUser = AuthService.getCurrentUser();
        $scope.loading = false;
        $scope.error = '';
        
        // Dashboard stats
        $scope.stats = {
            totalBooks: 0,
            totalCategories: 0,
            totalMembers: 0,
            totalBorrows: 0
        };
        
        // Recent activities
        $scope.recentBooks = [];
        $scope.recentCategories = [];
        $scope.recentMembers = [];
        $scope.recentBorrows = [];
        
        // Load dashboard data
 $scope.loadDashboardData = function () {
    $scope.loading = true;
    $scope.error = '';
    
    let allBooks = [];
    let categories = [];

    var promises = [];

    // Load books
    promises.push(
        BookService.getAllBooks()
            .then(function (response) {
                if (response && response.data && response.data.books && response.data.books.data) {
                    allBooks = response.data.books.data;
                    $scope.stats.totalBooks = response.data.books.total || allBooks.length;
                    $scope.recentBooks = allBooks.slice(0, 5);
                }
            })
            .catch(function (error) {
                console.error('Error loading books:', error);
                allBooks = [];
                $scope.stats.totalBooks = 0;
                $scope.recentBooks = [];
            })
    );

    // Load categories
    promises.push(
        CategoryService.getAllCategories()
            .then(function (response) {
                if (response && response.data) {
                    if (response.data.categories) {
                        categories = response.data.categories;
                        $scope.stats.totalCategories = categories.length;

                        // Hitung jumlah buku per kategori
                        categories.forEach(function (cat) {
                            cat.jumlah_buku = allBooks.filter(function (book) {
                                return book.category_id === cat.id;
                            }).length;
                        });

                        $scope.recentCategories = categories.slice(0, 5);
                    }
                }
            })
            .catch(function (error) {
                console.error('Error loading categories:', error);
                categories = [];
                $scope.stats.totalCategories = 0;
                $scope.recentCategories = [];
            })
    );

    Promise.all(promises)
        .finally(function () {
            $scope.loading = false;
            $scope.$apply(); // untuk update view jika di luar Angular digest
        })
        .catch(function (error) {
            $scope.loading = false;
            $scope.error = 'Failed to load dashboard data';
            console.error('Error loading dashboard data:', error);
            $scope.$apply();
        });
};

        
        // Refresh dashboard data
        $scope.refreshDashboard = function() {
            $scope.loadDashboardData();
        };
        
        // Navigate to specific sections
        $scope.navigateToBooks = function() {
            // Implementation for navigation to books page
            console.log('Navigate to books');
        };
        
        $scope.navigateToCategories = function() {
            // Implementation for navigation to categories page
            console.log('Navigate to categories');
        };
        
        $scope.navigateToMembers = function() {
            // Implementation for navigation to members page
            console.log('Navigate to members');
        };
        
        $scope.navigateToBorrows = function() {
            // Implementation for navigation to borrows page
            console.log('Navigate to borrows');
        };
        
        // Logout
        $scope.logout = function() {
            AuthService.logout();
        };
        
        // Load dashboard data on init
        $scope.loadDashboardData();
    }]);