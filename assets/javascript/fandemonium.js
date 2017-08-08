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

$(document).ready(function () {
    // When user clicks "search" button, add a new artist to firebase (assuming it doesn't already
    // exist in the db) and get info from bandsintown about artist and upcoming events and use the info
    // to populate the screen sections.
    $("#search-events").on("click", function () {
        event.preventDefault();
        $('.social-links').empty();

        var artist = $("#artist-input").val().trim();
        var startDate = $("#start-date-input").val().trim();
        var endDate = $("#end-date-input").val().trim();

        // TODO: validate input here for dates if entered - use modals for error messages


        // TODO: put the searched artist in DB - Need to check for dup's before adding to DB
        // database.ref().push(artist);

        // Start of Denis' AJAX call to get band ID
        var musicGraphKey = '40fa13bb567aa61a95cd54d12c4badad';
        var bandId;

        $.ajax({
            url: "http://api.musicgraph.com/api/v2/artist/suggest?api_key=" + musicGraphKey + "&prefix=" + artist + "&limit=1",
            method:'GET'
        })
        .done(function (response) {
            bandId = response.data[0].id;
            $.ajax({
                url: "http://api.musicgraph.com/api/v2/artist/" + bandId + "/social-urls?api_key=" + musicGraphKey,
                method:'GET'
            })
            .done(function (response) {
                $('.artist-name').text(response.data.name + " Links");
                var responseObject = response.data;
                var linkCounter = 0;
                if (responseObject.hasOwnProperty("official_url")) {
                    linkCounter++;
                    var officialUrl = response.data.official_url[0];
                    $('.social-links').append("<a class='icon-link' href=" + officialUrl +" target='_blank'><img alt='official band website' data-toggle='tooltip' title='Official Homepage' src='assets/images/homepage.png' width='75'></a>");
                }

                if (responseObject.hasOwnProperty("wikipedia_url")){
                    linkCounter++;
                    var wikipedia = response.data.wikipedia_url[0];
                    $('.social-links').append("<a class='icon-link' href=" + wikipedia +" target='_blank'><img alt='wikipedia page' data-toggle='tooltip' title='Wikipedia Page' src='assets/images/wikipedia.png' width='75'></a>");
                }
                
                if (responseObject.hasOwnProperty("twitter_url")){
                    linkCounter++;
                    var twitter = response.data.twitter_url[0];
                    $('.social-links').append("<a class='icon-link' href=" + twitter +" target='_blank'><img alt='twitter page' data-toggle='tooltip' title='Official Twitter' src='assets/images/twitter.png' width='75'></a>");
                }
                
                if (responseObject.hasOwnProperty("facebook_url")){
                    linkCounter++;
                    var facebook = response.data.facebook_url;
                    $('.social-links').append("<a class='icon-link' href=" + facebook +" target='_blank'><img alt='facebook page' data-toggle='tooltip' title='Official Facebook' src='assets/images/facebook.png' width='75'></a>");
                }
                

                if (responseObject.hasOwnProperty("instagram_url")){
                    linkCounter++;
                    var instagram = response.data.instagram_url[0];
                    $('.social-links').append("<a class='icon-link' href=" + instagram +" target='_blank'><img alt='instagram page' data-toggle='tooltip' title='Official Instagram' src='assets/images/instagram.png' width='75'></a>");
                }

                
                if (responseObject.hasOwnProperty("youtube_url")){
                    linkCounter++;
                    var youtube = response.data.youtube_url[0];
                    $('.social-links').append("<a class='icon-link' href=" + youtube +" target='_blank'><img alt='youtube page' data-toggle='tooltip' title='Official YouTube Channel' src='assets/images/youtube.png' width='75'></a>");
                }

                if (linkCounter === 0){
                    alert("no social links found");
                    //use modal instead
                }
            });


        });
        
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
                var event;

                // THIS IS THE PART THAT POPULATES THE EVENTS TABLE AND THE MAP MARKERS, ETC. ON SCREEN
                // Clear the table body rows
                $("#events-table-body tr").remove();

                // This is the main loop where we will do things with each of the event dates/venues/etc.
                for (var i = 0; i < response.length; i++) {

                    // save event object off into a variable for easier access
                    event = response[i];

                    // add a row to the on-screen events table
                    $("#events-table-body").append("<tr><td>" + event.datetime + "</td>" +
                        "<td>" + event.venue.city + ", " + event.venue.region + ", " + event.venue.country + "</td>" +
                        "<td>" + event.venue.name + "</td>" +
                        "<td>" + GetTicketOfferUrl(event) + "</td></tr>");

                    // TODO Scott: use the event.venue.latitude and event.venue.longitude fields for this event to put a marker
                    // on the map for this venue


                }


            });


        // clear the on-screen fields
        $("#artist-input").val('');
        $("#start-date-input").val('');
        $("#end-date-input").val('');

    });

    // On changes to DB - this will be called once on first page load
    // and then every time a new entry is added to the DB
    database.ref().on("value", function (snapshot) {
        // TODO: add new artist to the "your artists" list
    }, function (errorObject) {
        // Handle the errors
        console.log("Errors handled: " + errorObject.code);
    });


    // Utility function
    function GetTicketOfferUrl(event) {
        var offer;
        for (var i=0; i<event.offers.length; i++) {
            offer = event.offers[i];
            if ((offer.type === "Tickets") && (offer.status === "available")) {
                return "<a href='"+ offer.url + "'><span class=\"glyphicon glyphicon-qrcode\"></span></a>";
            }
        }

        return "none";
    }
});