// Initialize Firebase
var config = {
    apiKey: "AIzaSyAA4R950lsqV3fnFfFi9Fiu2_lg7bI1qrU",
    authDomain: "fandemonium-a955d.firebaseapp.com",
    databaseURL: "https://fandemonium-a955d.firebaseio.com",
    projectId: "fandemonium-a955d",
    storageBucket: "",
    messagingSenderId: "588990750187"
};

firebase.initializeApp(config);

var database = firebase.database();
var events = [];

$(document).ready(function () {
    // When user clicks "search" button, add a new artist to firebase (assuming it doesn't already
    // exist in the db) and get info from bandsintown about artist and upcoming events and use the info
    // to populate the screen sections.
    $("#search-events").on("click", function () {
        event.preventDefault();

        var artist = $("#artist-input").val().trim();
        var startDate = $("#start-date-input").val().trim();
        var endDate = $("#end-date-input").val().trim();

        // TODO: validate input here for dates if entered - use modals for error messages


        // TODO: put the searched artist in DB - Need to check for dup's before adding to DB
        // database.ref().push(artist);


        // Call bandsintown API
        $.ajax({
            // TODO: if dates are entered url looks like this
            // url: "https://rest.bandsintown.com/artists/" + $("#search-term").val().trim + "/events?app_id=UNC-CH-Bootcamp&date=" + "2017-08-19%2C2017-09-10",
            // No dates entered
            url: "https://rest.bandsintown.com/artists/" + artist + "/events?app_id=UNC-CH-bootcamp",
            method: 'GET'
        })
            .done(function (response) {
                // Clear our global events array. We will populate it next.
                events.length = 0;
                for (var i = 0; i < response.length; i++) {
                    events[i] = response[i];
                }
            });


        for(var j=0; j<events.length; j++) {
            $("#events-table").append("<tr><td>" + events[j].datetime + "</td>" +
                "<td>" + events[j].venue.city + "</td>" +
                "<td>" + events[j].venue.region + "</td>" +
                "<td>" + events[j].venue.country + "</td></tr>");
        }


        // clear the on-screen fields
        $("#artist-input").val('');
        $("#start-date-input").val('');
        $("#end-date-input").val('');

    });

    // On changes to DB - this will be called once on first page load
    // and then every time a new entry is added to the DB
    database.ref().on("value", function (snapshot) {
        // TODO: add new item to the "your searches" list
    }, function (errorObject) {
        // Handle the errors
        console.log("Errors handled: " + errorObject.code);
    });


});