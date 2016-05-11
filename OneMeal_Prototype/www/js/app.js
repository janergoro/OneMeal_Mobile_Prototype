var OneMeal = angular.module('starter', ['ionic', 'ngStorage', 'ngCordova', 'ion-datetime-picker'])
var serverSideUrl = "http://onemeal.azurewebsites.net/";

OneMeal.run(function ($ionicPlatform) {
    $ionicPlatform.ready(function() {
        if(window.StatusBar) {
            StatusBar.styleDefault();
        }
    });
});

OneMeal.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('login', {
            url: '/login',
            templateUrl: 'templates/login.html',
            controller: 'LoginController'
        })
        .state('logout', {
            url: '/logout',
            templateUrl: 'templates/logout.html',
            controller: 'LogoutController'
        })
        .state('mainscreen', {
            url: '/mainscreen',
            templateUrl: 'templates/mainscreen.html',
            controller: 'MainScreenController'
        })
        .state('post', {
            url: '/post',
            templateUrl: 'templates/post.html',
            controller: 'DateTimePickerControl'
        })
        .state('myprofile', {
            url: '/myprofile',
            templateUrl: 'templates/myprofile.html',
            controller: 'MyProfileController'
        })
        .state('history', {
            url: '/history',
            templateUrl: 'templates/history.html',
            controller: 'MyHistoryController'
        })
        .state('profile', {
            url: '/profile/:UserID/:MealID/:ProfileState',
            templateUrl: 'templates/profile.html',
            controller: 'ProfileController'
        });
    $urlRouterProvider.otherwise('/login');
});

OneMeal.controller("LoginController", function ($scope, $cordovaOauth, $localStorage, $location, $http) {
    if ($localStorage.hasOwnProperty("accessToken") === true && $localStorage.hasOwnProperty("userId") === true)
        $location.path("/mainscreen");
    $scope.login = function() {
        $cordovaOauth.facebook("912306072188546", ["public_profile", "user_birthday", "user_work_history"]).then(function (result) {
            $localStorage.accessToken = result.access_token;
            $http.get("https://graph.facebook.com/v2.2/me", { params: { access_token: $localStorage.accessToken, fields: "id,first_name,last_name,work,birthday", format: "json" }}).then(function(result) {
                $scope.profileData = result.data;
                $localStorage.userId = $scope.profileData.id;
                var data = {
                    userId: $scope.profileData.id,
                    token: $localStorage.acessToken,
                    FirstName: $scope.profileData.first_name,
                    LastName: $scope.profileData.last_name,
                    Profession: getCurrentPosition($scope.profileData.work),
                    Birthday: $scope.profileData.birthday,
                    About: "",
                    Keywords:""
                };
                $http.post(serverSideUrl+'api/FacebookProfile', data).
                    then(function (response){
                        $location.path("/mainscreen");             
                    });
            }, function(error) {
                alert("There was a problem getting your profile.");
                console.log(error);
            });         
        }, function(error) {
            alert("There was a problem signing in!");
            console.log(error);
        });
    };

});

OneMeal.controller("LogoutController", function ($scope, $localStorage, $location, $http) {
    //$ionicHistory
    //'$ionicHistory'
    $scope.init = function () {
        if ($localStorage.hasOwnProperty("accessToken") === true && $localStorage.hasOwnProperty("userId") === true) {
            //$localStorage.clearAll();
            //$ionicHistory.clearCache();
            //$ionicHistory.clearHistory();
            $localStorage.$reset();
            $location.path("/login");
        }
        else {
            alert("You are already logged out!");
            $location.path("/login");
        }
    };
});

OneMeal.controller("MainScreenController", function ($scope, $http, $localStorage, $location) {

    $scope.init = function() {
        if ($localStorage.hasOwnProperty("accessToken") === true) {
            $scope.getCurrentPosition = function () {
                function onSuccess(position) {
                    $http.get(serverSideUrl + "api/activeprofiles/" + position.coords.latitude + "/" + position.coords.longitude + "/" + 0.5).then(function (response) {
                        $scope.names = response.data;
                    });
                };
                function onError(error) {
                    alert("Please turn on your GPS");
                };
                navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, maximumAge: 30000000, timeout: 30000 });
            }
            $scope.getCurrentPosition();
            $scope.showModal = false;
            
        } else {
            alert("Not signed in");
            $location.path("/login");
        }
    };
    $scope.openProfile = function (userID, mealID) {
        $location.path("/profile/" + userID + "/" + mealID + "/" + PROFILESTATE.PRE_REQUEST_PROFILE.value);
    };

});

OneMeal.controller("DateTimePickerControl", function ($scope, $http, $localStorage, $location) {

    $scope.init = function () {
        if ($localStorage.hasOwnProperty("accessToken") === true) {

            var d = new Date()
            $scope.chosen = {};
            $scope.chosen.location = "";
            $scope.chosen.datetimeValue = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
            $scope.OneMeal = function () {
                // Writing it to the server
                //
                if (new Date($scope.chosen.datetimeValue) < new Date())
                {
                    alert("Your OneMeal date is in the past. Please choose a new one");
                    return;
                }
                if ($scope.chosen.location == "")
                {
                    alert("Please choose a location for your OneMeal");
                    return;
                }                   

                    var Data = {
                        chosenDate: $scope.chosen.datetimeValue,
                        userID: 4, // NB! For test purposes,
                        location: $scope.chosen.location

                    };
                    var res = $http.post(serverSideUrl + 'api/activeprofiles', Data);
                    $location.path("/mainscreen");
                
            };

        } else {
            alert("Not signed in");
            $location.path("/login");
        }
    };
    

});
OneMeal.controller("ProfileController", function ($scope, $http, $localStorage, $location, $stateParams) {
    $scope.init = function() {
        if ($localStorage.hasOwnProperty("accessToken") === true) {
            $http.get(serverSideUrl + "api/activeprofiles/" + $stateParams.UserID)
                .then(function (response) { $scope.ProfileInfoFields = response.data; });
            $scope.AcceptMeal = function () {
                switch (parseInt($stateParams.ProfileState)) {
                    case PROFILESTATE.POST_REQUEST_PROFILE.value:
                        var data = {
                            MealId: $stateParams.MealID,
                            PartnerID: $stateParams.UserID,
                            RequestExists: true
                        };
                        var res = $http.post(serverSideUrl + 'api/onemeal', data);
                        $location.path("/mainscreen");
                        break;
                    case PROFILESTATE.MY_PROFILE.value:
                        break;
                    case PROFILESTATE.PRE_REQUEST_PROFILE.value:
                        var data = {
                            MealId: $stateParams.MealID,
                            PartnerID: $localStorage.userId,
                            RequestExists: false
                        };
                        var res = $http.post(serverSideUrl + 'api/onemeal', data);
                        $location.path("/mainscreen");
                        break;
                    case PROFILESTATE.ARCHIVED_PROFILE.value:
                        break;
                    default:
                        alert("How did I get here?");
                        
                }
            }
        } else {
            alert("Not signed in");
            $location.path("/login");
        }
    };

});

OneMeal.controller("MyProfileController", function ($scope, $http, $localStorage, $location, $stateParams) {

    $scope.init = function () {
        if ($localStorage.hasOwnProperty("accessToken") === true) {
            $scope.userId = $localStorage.userId;
            $http.get(serverSideUrl + "api/activeprofiles/" + $scope.userId)
                .then(function (response) { $scope.ProfileInfoFields = response.data; });
            $scope.SubmitProfile = function () {
                var data = {
                    userId: $scope.userId,
                    Profession: $scope.ProfileInfoFields[0].Profession,
                    About: $scope.ProfileInfoFields[0].About,
                    Keywords: $scope.ProfileInfoFields[0].Keywords
                };
                $http.post(serverSideUrl + 'api/FacebookProfile', data).
                    then(function (response) {
                        $location.path("/mainscreen");
                    });
            }
        } else {
            alert("Please sign in!");
            $location.path("/login");
        }
    };

});

OneMeal.controller("MyHistoryController", function ($scope, $http, $localStorage, $location, $stateParams) {

    $scope.init = function () {
        if ($localStorage.hasOwnProperty("accessToken") === true) {
            $scope.userId = $localStorage.userId;
            $scope.POST_REQUEST_PROFILE = PROFILESTATE.POST_REQUEST_PROFILE.value;
            $scope.ARCHIVED_PROFILE = PROFILESTATE.ARCHIVED_PROFILE.value;
            $scope.openProfile = function (mealID, userID, state) {
                
                $location.path("/profile/" + userID + "/" + mealID + "/" + state);
            };
            $http.get(serverSideUrl + "api/pendingmeals/" + $scope.userId)
            .then(function (response) { $scope.names = response.data; });
            $http.get(serverSideUrl + "api/archivemeals/" + $scope.userId)
            .then(function (response) { $scope.archive = response.data; });
        } else {
            $location.path("/login");
        }
    };

});
function getCurrentPosition(arrOfPositions) {
    if (arrOfPositions) {
        var curPos;
        for (var a in arrOfPositions) {
            var curItem = arrOfPositions[a];
            if (!curItem.end_date && curItem.position) {
                if (curPos) curPos += ', ' + curItem.position.name + " at " + curItem.employer.name;
                else curPos = curItem.position.name + " at " + curItem.employer.name;
            }

        }
        return curPos;
    }
}

var PROFILESTATE = {
    MY_PROFILE: { value: 0, name: "My Profile"},
    ARCHIVED_PROFILE: { value: 1, name: "Archived Profile"},
    PRE_REQUEST_PROFILE: { value: 2, name: "Profile that has no active requests" },
    POST_REQUEST_PROFILE: { value: 3, name: "Profile that has an active requests" }

};