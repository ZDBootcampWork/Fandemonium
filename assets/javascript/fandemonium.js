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

var linkCounter;
var database = firebase.database();

$(document).ready(function () {
    var $artistButtons = $("#my-artists-buttons");
    $('input[name="daterange"]').daterangepicker();
    $artistButtons.empty();

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


        // Put the searched artist in DB - Need to check for dup's before adding to DB
        database.ref().orderByChild("artist").equalTo(artist).once("value", function(snapshot) {
            var userData = snapshot.val();
            if (userData){
                console.log(artist + " exists in DB!");
            }
            else {
                database.ref().push({
                    artist: artist
                });
            }
        });

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
                linkCounter = 0;
                // function addSocialLink(data, propertyName, socialUrl, altText, imageName){
                addSocialLink(responseObject, "official_url", 0, "Official Homepage", "homepage");
                addSocialLink(responseObject, "wikipedia_url", 0, "Wikipedia Page", "wikipedia");
                addSocialLink(responseObject, "twitter_url", 0, "Twitter Page", "twitter");
                addSocialLink(responseObject, "facebook_url", null, "Facebook Page", "facebook");
                addSocialLink(responseObject, "instagram_url", 0, "Instagram Page", "instagram");
                addSocialLink(responseObject, "youtube_url", 0, "YouTube Page", "youtube");

                if (linkCounter ===0){
                    $('.artist-name').text("No pages found for " + response.data.name);
                }


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
                        }

                mapboxgl.accessToken = "pk.eyJ1Ijoic2NvdHRqYWMwMSIsImEiOiJjajYxamFzdmkwdmNlMndvMzNsam00ZG1oIn0.u5dRjgnkQLTHRcKuxB-KkQ";
                    var mapbox = new mapboxgl.Map({
                      container: "mapbox",
                      style: "mapbox://styles/mapbox/streets-v9",
                      center: [-78.6382, 35.7769],
                      zoom: 12
                      });                        
            });

        // Display the current day and time on the panel heading -->

        displayTime();
        // clear the on-screen fields
        $("#artist-input").val('');
        $("#start-date-input").val('');
        $("#end-date-input").val('');

        //Display the current date and time in the 
        function displayTime() {
        var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
        $("#currClock").html(time);
        setTimeout(displayTime, 1000);
        }

    });

    // On changes to DB - this will be called on first page load
    // and then every time a new entry is added to the DB
    database.ref().on("child_added", function(childSnapshot) {
        // Add new artist to the "your artists" buttons list
        var $newButton = $("<button>");
        // Add some bootstrap classes and attributes to our button
        $newButton.attr("type", "button");
        $newButton.addClass("btn btn-info btn-sm artist-button");
        // Provide button text
        $newButton.text(childSnapshot.val().artist);
        // Added the button to the buttons-view div
        $artistButtons.append($newButton);
        // Handle the errors
    }, function(errorObject) {
        console.log("Errors handled: " + errorObject.code);
    });

    // TODO: ZD - add click handler for artist buttons.

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

    // anyLinks = anyLinks || addSocialLink(responseObject, "official_url", 0, "Official Homepage", "homepage");
    function addSocialLink(data, propertyName, socialUrl, altText, imageName){
        if (data.hasOwnProperty(propertyName)) {
                    // linkCounter++;
                    var url;
                    if (socialUrl === null){
                        url = data[propertyName];
                    } else {
                        url = data[propertyName][0];
                    }
                    $('.social-links').append("<a class='icon-link' href=" + url +" target='_blank'><img alt='"+altText+"' data-toggle='tooltip' title='"+altText+"' src='assets/images/"+imageName+".png' width='75'></a>");
                    linkCounter++;
                } 
    }
});
});