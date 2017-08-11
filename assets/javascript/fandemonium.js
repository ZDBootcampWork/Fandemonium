// Global vars, etc. GO HERE

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

var musicGraphKey = '40fa13bb567aa61a95cd54d12c4badad';

var linkCounter;
var database = firebase.database();

var Events = [];

$(document).ready(function () {
    var $artistButtons = $("#my-artists-buttons");
    $artistButtons.empty();
    // hide social div and events div on initial page load
    $(".social-div").hide();
    $(".events-div").hide();

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // THIS IS THE MAIN CLICK HANDLER -- A LOT OF THINGS HAPPEN WHEN USER ENTERS ARTIST NAME
    // AND OPTIONAL DATE RANGE AND CLICKS "SEARCH" BUTTON
    // When user clicks "search" button, add a new artist to firebase (assuming it doesn't already
    // exist in the db) and get info from bandsintown about artist and upcoming events and use the info
    // to populate the screen sections like map, artist links, etc.
    $("#search-events").unbind('click').click(function(e) {

        e.preventDefault();
        e.stopPropagation();
        $('.social-links').empty();

        var bandId;  // used with musicgraph API
        var artist = $("#artist-input").val().trim();
        var startDate = $("#start-date-input").val().trim();
        var endDate = $("#end-date-input").val().trim();

        $(".events-heading").html(artist + " - Upcoming Shows");
        $(".events-div").show();

        // TODO: validate input here for dates if entered - use modals for error messages

        // Put the searched artist in DB - Need to check for dup's before adding to DB
        database.ref().orderByChild("artist").equalTo(toTitleCase(artist)).once("value", function (snapshot) {
            var userData = snapshot.val();
            if (userData) {
                console.log(artist + " exists in DB!");
            }
            else {
                database.ref().push({
                    artist: toTitleCase(artist)
                });
            }
        });


        // Start of AJAX calls to musicgraph to get band ID and then some other info
        $.ajax({
            url: "http://api.musicgraph.com/api/v2/artist/suggest?api_key=" + musicGraphKey + "&prefix=" + artist + "&limit=1",
            method: 'GET'
        })
            .done(function (response) {
                // hide div first
                $(".social-div").hide();
                bandId = response.data[0].id;
                // Once we got band id, we make another ajax call to get social URLs for the artist
                $.ajax({
                    url: "http://api.musicgraph.com/api/v2/artist/" + bandId + "/social-urls?api_key=" + musicGraphKey,
                    method: 'GET'
                })
                    .done(function (response) {
                        // Go ahead and add some social links (if they exist)
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

                        if (linkCounter === 0) {
                            // if no social links for this artist - display a message
                            $('.artist-name').text("No pages found for " + response.data.name);
                        }

                        // show social div
                        $(".social-div").show();
                    }); // end of second API call to musicgraph
            }); // end of first API call to musicgraph


        // Call bandsintown API to get upcoming events for this artist (if any)
        $.ajax({
            // TODO: if dates are entered url looks like this
            // url: "https://rest.bandsintown.com/artists/" + $("#search-term").val().trim + "/events?app_id=UNC-CH-Bootcamp&date=" + "2017-08-19%2C2017-09-10",
            // No dates entered
            url: "https://rest.bandsintown.com/artists/" + artist + "/events?app_id=UNC-CH-bootcamp",
            method: 'GET'
        })
            .done(function (response) {
                // set global array Events to an empty array.
                Events.length = 0;
                var event;

                // THIS IS THE PART THAT POPULATES THE EVENTS TABLE ON SCREEN
                // Clear the table body rows
                $("#events-table-body tr").remove();

                if (response.length === 0) {
                    // in case there are no events
                    $("#events-table-header").html("<tr><th colspan=4>No upcoming events</th></tr>");
                }
                else {
                    // there are some events -- put a table header
                    $("#events-table-header").html("<tr><th>Date/time</th><th>Location</th><th>Venue</th> <th>Tickets</th></tr>");
                    // This is the main loop where we will do things with each of the event dates/venues/etc.
                    for (var i = 0; i < response.length; i++) {

                        // save event object off into a variable for easier access
                        event = response[i];
                        // populate Events[] global array entries via a deep copy of the event objects
                        Events[i] = JSON.parse(JSON.stringify(response[i]));

                        // add a row to the on-screen events table
                        $("#events-table-body").append("<tr><td>" + moment(event.datetime).format('LLL') + "</td>" +
                            "<td>" + event.venue.city + ", " + event.venue.region + ", " + event.venue.country + "</td>" +
                            "<td>" + event.venue.name + "</td>" +
                            "<td>" + GetTicketOfferUrl(event) + "</td></tr>");
                    } // end - for loop - events list
                }  // end - else

                //////////////////////////////////////////////////////////////////////////////
                // THIS IS WHERE MAP STUFF HAPPENS -- IF THERE ARE ANY EVENTS FOR THIS ARTIST
                //////////////////////////////////////////////////////////////////////////////
                if (Events.length > 0) {
                    //Create geojson data ppints for markers
                    var venueName = event.venue.name;
                    var venueCity = event.venue.city;
                    var venueRegion = event.venue.region;
                    var venueLat = event.venue.latitude;
                    var venueLong = event.venue.longitude;

                    //Add the map to the DOM
                    mapboxgl.accessToken = "pk.eyJ1Ijoic2NvdHRqYWMwMSIsImEiOiJjajYxamFzdmkwdmNlMndvMzNsam00ZG1oIn0.u5dRjgnkQLTHRcKuxB-KkQ";
                    var mapbox = new mapboxgl.Map({
                        container: "mapbox",
                        style: "mapbox://styles/mapbox/streets-v9",
                        center: [venueLong, venueLat],
                        zoom: 5
                    });
                    //Create the geojson for the map w/markers and popups
                    var geojson = {
                        type: "FeatureCollection",
                        features: [{
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: [venueLong, venueLat]
                            },
                            properties: {
                                title: venueName,
                                description: venueCity + "," + venueRegion
                            }
                        },
                            {
                                type: 'Feature',
                                geometry: {
                                    type: 'Point',
                                    coordinates: [-122.414, 37.776]
                                },
                                properties: {
                                    title: 'Mapbox',
                                    description: 'San Francisco, California'
                                }
                            }]
                    };
                    // add markers to map
                    geojson.features.forEach(function (marker) {

                        // create a HTML element for each feature
                        var el = document.createElement("div");
                        el.className = "marker";

                        // make a marker for each feature and add to the map
                        new mapboxgl.Marker(el, {offset: [-50 / 2, -50 / 2]})
                            .setLngLat(marker.geometry.coordinates)
                            .setPopup(new mapboxgl.Popup({offset: 5}) // add popups
                                .setHTML("<h5>" + marker.properties.title + "</h5><p>" + marker.properties.description + "</p>"))
                            .addTo(mapbox);
                    });
                }
                ////////////////////
                // END OF MAP STUFF
                ////////////////////

            });   //end of API call to bandsintown


        // clear the on-screen fields to be ready for next search
        $("#artist-input").val('');
        $("#start-date-input").val('');
        $("#end-date-input").val('');

    });
    ////   END OF MAIN CLICK HANDLER FOR SEARCH BUTTON


    /////////////////////////////////////////////////////////////////////////////////////////////
    //  STUFF THAT IS INDEPENDENT OF THE SEARCH BUTTON CLICK HANDLER GOES HERE
    /////////////////////////////////////////////////////////////////////////////////////////////

    // On changes to DB - this will be called on first page load
    // and then every time a new entry is added to the DB
    database.ref().on("child_added", function (childSnapshot) {
        // Add new artist to the "your artists" buttons list
        var $newButton = $("<button>");
        // Add some bootstrap classes and attributes to our button
        $newButton.attr("type", "button");
        $newButton.attr("data-artist", childSnapshot.val().artist);
        $newButton.addClass("btn btn-info btn-sm artist-button");
        // Provide button text
        $newButton.text(childSnapshot.val().artist);
        // Added the button to the buttons-view div
        $artistButtons.append($newButton);
        // Handle the errors
    }, function (errorObject) {
        console.log("Errors handled: " + errorObject.code);
    });

    // Click handler for artist buttons at the top.
    // They act as if the user entered the artist name in
    // the form field and clicked "Search"
    $(document).on("click", ".artist-button", function(){
        var clickedArtist = $(this).attr("data-artist");

        $("#artist-input").val(clickedArtist);
        $("#search-events").trigger("click");
    });

    /////////////////////////////////////////////////////////////////////////////////////////////
    // Utility functions go here
    /////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////
    // Find the first available tickets url in the event object returned by bandsintown API
    function GetTicketOfferUrl(event) {
        var offer;
        var urlHtml = "<i class='material-icons'>clear</i>";
        for (var i = 0; i < event.offers.length; i++) {
            offer = event.offers[i];
            if ((offer.type === "Tickets") && (offer.status === "available")) {
                urlHtml = "<a target='_blank' title='get tickets' href='" + offer.url + "'><i class='material-icons'>queue_music</i></a>";
            }
        }

        return urlHtml;
    }


    ////////////////////////////////////////////////////////////////////////////////////////////
    // Converts a string so that the result has every word starting with a capital letter
    // We use this to store artists in the DB and to display them on screen as buttons
    function toTitleCase(str) {
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////
    // Adds a social link to the right hand side of the page based on the passed in
    // args, if one exists for this artist. Increments link counter if link is added.
    function addSocialLink(data, propertyName, socialUrl, altText, imageName) {
        if (data.hasOwnProperty(propertyName)) {
            // linkCounter++;
            var url;
            if (socialUrl === null) {
                url = data[propertyName];
            } else {
                url = data[propertyName][0];
            }
            $('.social-links').append("<a class='icon-link' href=" + url + " target='_blank'><img alt='" + altText + "' data-toggle='tooltip' title='" + altText + "' src='assets/images/" + imageName + ".png' width='50'></a>");
            linkCounter++;
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    // Display the current day and time on the panel heading for upcoming events
    displayTime();

    function displayTime() {
        var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
        $("#currClock").html(time);
        setTimeout(displayTime, 1000);
    }

});