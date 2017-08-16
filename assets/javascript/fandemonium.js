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
    $('.input-daterange').datepicker({
        autoclose: true,
        todayHighlight: true,
        toggleActive: true
    });
    $artistButtons.empty();
    // hide social div and events div and map div on initial page load
    $(".social-div").hide();
    $(".events-div").hide();
    $(".map-div").hide();

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // THIS IS THE MAIN CLICK HANDLER -- A LOT OF THINGS HAPPEN WHEN USER ENTERS ARTIST NAME
    // AND OPTIONAL DATE RANGE AND CLICKS "SEARCH" BUTTON
    // When user clicks "search" button, add a new artist to firebase (assuming it doesn't already
    // exist in the db) and get info from bandsintown and musicgraph APIs about the artist and
    // upcoming events and use the info to populate the screen sections like map, events table,
    // artist social links, etc.
    $("#search-events").unbind('click').click(function (e) {

        e.preventDefault();
        e.stopPropagation();

        var artist = $("#artist-input").val().trim();
        var startDate = $("#start-date-input").val().trim();
        var endDate = $("#end-date-input").val().trim();
        var validArtistEntered = undefined;
        var bandId;  // used with musicgraph API

        // VALIDATE user inputs here!!
        if (artist === "") {
            bootbox.alert({
                message: "Please enter an artist name.",
                size: 'small'
            });
            // No artist entered. Clear input fields and exit the click handler
            clearInputFields();
            return;
        }

        if (startDate === "") {
            // empty start date. Init to today
            startDate = moment().format("YYYY-MM-DD");
        }

        if (endDate === "") {
            // empty end date. Init to 2 yrs in the future
            endDate = moment().add(2, 'y').format("YYYY-MM-DD");
        }

        if (moment(endDate).isBefore(startDate)) {
            // invalid start-end date pair. Start date is after end date
            bootbox.alert({
                message: "Invalid date range.  Please try again.",
                size: 'small'
            });
            $("#start-date-input").val('');
            $("#end-date-input").val('');
            return;

        }

        // AJAX call to musicgraph to get band ID
        $.ajax({
            url: "https://cors-anywhere.herokuapp.com/http://api.musicgraph.com/api/v2/artist/suggest?api_key=" + musicGraphKey + "&prefix=" + artist + "&limit=1",
            method: 'GET'
        })
            .done(function (response) {
                //Handle if no artist or bandId is found (invalid artist name)
                if (response.data.length !== 0) {
                    bandId = response.data[0].id;
                    validArtistEntered = true;
                } else {
                    bootbox.alert({
                        message: "The artist named '" + artist + "' was not found!",
                        size: 'small'
                    });
                    validArtistEntered = false;
                }
                //End If//
            }); // end of API call to musicgraph to get band ID


        // wait until band ID is received so we know if it's a valid artist or not.
        var intervalHandle = setInterval(function () {
            if (validArtistEntered === undefined) {
                console.log("waiting for artist validity check");
            }
            else {
                // we know if it's a valid artist or not now
                clearInterval(intervalHandle);

                // Proceed only if a valid artist was entered
                if (validArtistEntered === true) {
                    // Now that we know artist exists, we can display it on headers
                    $(".events-heading").html(toTitleCase(artist) + " - Upcoming Shows");
                    $(".events-div").show();

                    // And put the searched artist in DB - Need to check for dup's before adding to DB
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

                    // Once we got band id, we make another ajax call to musicgraph to get social URLs for the artist
                    $.ajax({
                        url: "https://cors-anywhere.herokuapp.com/http://api.musicgraph.com/api/v2/artist/" + bandId + "/social-urls?api_key=" + musicGraphKey,
                        method: 'GET'
                    })
                        .done(function (response) {
                            // hide social div first -- we will add links to it and then show it
                            $(".social-div").hide();
                            // Go ahead and add some social links (if they exist)
                            $('.artist-name').text(response.data.name + " Links");
                            var responseObject = response.data;
                            linkCounter = 0;
                            $('.social-links').empty();

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
                        }); // end of API call to musicgraph to get social links

                    // Call bandsintown API to get upcoming events for this artist (if any)
                    // Put the dates in the format expected by the api and form the API url
                    var parsedStart = moment(startDate).format("YYYY-MM-DD");
                    var parsedEnd = moment(endDate).format("YYYY-MM-DD");
                    var parsedRange = parsedStart + "," + parsedEnd;
                    var bandsInTownUrl = "https://rest.bandsintown.com/artists/" + artist + "/events?app_id=UNC-CH-Bootcamp&date=" + parsedRange;
                    // Ajax call for bandsintown
                    $.ajax({
                        url: bandsInTownUrl,
                        method: 'GET'
                    })
                        .done(function (response) {
                            // set global array Events to an empty array.
                            Events.length = 0;
                            var event;

                            // Clear the events table body rows
                            $("#events-table-body tr").remove();
                            //$("#mapbox").empty();

                            if (response.length === 0) {
                                // in case there are no events
                                $(".map-div").hide();
                                $("#events-table-header").html("<tr><th colspan=4>No upcoming events</th></tr>");
                            }
                            else {
                                for (var i = 0; i < response.length; i++) {
                                    // populate Events[] global array entries via a deep copy of the event objects
                                    // drawing the map requires this data
                                    Events[i] = JSON.parse(JSON.stringify(response[i]));
                                }

                                //////////////////////////////////////////////////////////////////////////////
                                // THIS IS WHERE MAP STUFF HAPPENS -- IF THERE ARE ANY EVENTS FOR THIS ARTIST
                                //////////////////////////////////////////////////////////////////////////////
                                // Add the map to the DOM
                                // show the map now
                                $(".map-div").show();
                                mapboxgl.accessToken = "pk.eyJ1Ijoic2NvdHRqYWMwMSIsImEiOiJjajYxamFzdmkwdmNlMndvMzNsam00ZG1oIn0.u5dRjgnkQLTHRcKuxB-KkQ";
                                var mapbox = new mapboxgl.Map({
                                    container: "mapbox",
                                    style: "mapbox://styles/mapbox/streets-v9",
                                    center: [Events[0].venue.longitude, Events[0].venue.latitude],
                                    zoom: 3
                                });

                                for (var i = 0; i < Events.length; i++) {
                                    //Create the geojson for the map w/markers and popups
                                    var geojson = {
                                        type: "FeatureCollection",
                                        features: [{
                                            type: "Feature",
                                            geometry: {
                                                type: "Point",
                                                coordinates: [Events[i].venue.longitude, Events[i].venue.latitude]
                                            },
                                            properties: {
                                                title: Events[i].venue.name,
                                                description: "<a href='#events-table'>" + moment(Events[i].datetime).format('LLL') + " - " + Events[i].venue.city + "," + Events[i].venue.region + "</a>",
                                                "marker-color": "#3bb2d0",
                                                "marker-size": "small",
                                                "marker-symbol": Events.length
                                            }
                                        }]
                                    };

                                    // add markers to map
                                    geojson.features.forEach(function (marker) {

                                        // create a HTML element for each feature
                                        var el = document.createElement("div");
                                        el.className = "marker";

                                        // make a marker for each feature and add to the map
                                        new mapboxgl.Marker(el)
                                            .setLngLat(marker.geometry.coordinates)
                                            .setPopup(new mapboxgl.Popup() // add popups
                                                .setHTML("<h5>" + marker.properties.title + "</h5><p>" + marker.properties.description + "</p>"))
                                            .addTo(mapbox);
                                    });
                                }
                                ////////////////////
                                // END OF MAP STUFF
                                ////////////////////

                                // THIS IS THE PART THAT POPULATES THE EVENTS TABLE ON SCREEN
                                // there are some events -- put a table header
                                $("#events-table-header").html("<tr><th>Date/time</th><th>Location</th><th>Venue</th><th>Tickets</th></tr>");
                                // This is the main loop where we will populate the events table
                                for (var j = 0; j < response.length; j++) {
                                    // save event object off into a variable for easier access
                                    event = response[j];
                                    // Create a row of the events table
                                    var tableRow = $("<tr>");
                                    var dateTimeData = $("<td>");
                                    dateTimeData.html(moment(event.datetime).format('LLL'));
                                    var venueLocationData = $("<td>");
                                    venueLocationData.html(event.venue.city + ", " + event.venue.region + ", " + event.venue.country);

                                    // Create a button to allow/enable the flyto option on the map
                                    var mapBtn = $("<button>");
                                    mapBtn.addClass("flyTo btn btn-default btn-xs");
                                    mapBtn.attr({
                                        type: "button",
                                        "data-lng": event.venue.longitude,
                                        "data-lat": event.venue.latitude
                                    });
                                    // nice icon for the button
                                    mapBtn.html("<i class='material-icons'>gps_fixed</i>");
                                    // attach a click handler to the map flyto button
                                    mapBtn.on("click", function () {
                                        $(window).scrollTop($('.map-div').offset().top);
                                        // Fly to location for this event venue
                                        var flyLat = $(this).attr("data-lat");
                                        var flyLng = $(this).attr("data-lng");
                                        mapbox.flyTo({
                                            center: [flyLng, flyLat],
                                            zoom: 6
                                        });
                                    });
                                    // add the map fly to button to the <td>
                                    venueLocationData.append(mapBtn);

                                    var venueNameData = $("<td>");
                                    venueNameData.html(event.venue.name);
                                    var ticketOfferData = $("<td>");
                                    ticketOfferData.html(GetTicketOfferUrl(event));

                                    tableRow.append(dateTimeData);
                                    tableRow.append(venueLocationData);
                                    tableRow.append(venueNameData);
                                    tableRow.append(ticketOfferData);
                                    $("#events-table-body").append(tableRow);
                                } // end - for loop - events list
                            }  // end - else - there are >= 1 events
                        });     //end of API call to bandsintown
                }           // end of if validArtistEntered
            }           // end wait for artist validity check
        }, 500);    // end setInterval


        // clear the on-screen input fields to be ready for next search
        clearInputFields();

    });
    ////   END OF MAIN CLICK HANDLER FOR SEARCH BUTTON


    /////////////////////////////////////////////////////////////////////////////////////////////
    //  STUFF THAT IS INDEPENDENT OF THE SEARCH BUTTON CLICK HANDLER GOES HERE
    /////////////////////////////////////////////////////////////////////////////////////////////

    // On changes to DB - this will be called on first page load
    // and then every time a new entry is added to the DB
    // We create a button group for each artist. Left side is for quick
    // searches and right side is to delete the artist
    database.ref().on("child_added", function (childSnapshot) {
        var $buttonGrpDiv = $("<div>").addClass("btn-group");

        var $artistButton = $("<button>").addClass("btn btn-info btn-sm artist-button");
        // Add some attributes to our button
        $artistButton.attr("type", "button");
        $artistButton.attr("data-artist", childSnapshot.val().artist);
        // Provide button text
        $artistButton.html(childSnapshot.val().artist);

        var $removeButton = $("<button>").addClass("btn btn-info btn-sm dropdown-toggle remove-button");
        // Add some attributes to our button
        $removeButton.attr("type", "button");
        $removeButton.attr("data-remove-artist", childSnapshot.val().artist);
        $removeButton.attr("data-toggle", "dropdown");
        $removeButton.attr("aria-haspopup", "true");
        $removeButton.attr("aria-expanded", "false");
        $removeButton.html("<span>X</span>");

        $buttonGrpDiv.append($artistButton);
        $buttonGrpDiv.append($removeButton);
        $artistButtons.append($buttonGrpDiv);
        // Handle the errors
    }, function (errorObject) {
        console.log("Errors handled: " + errorObject.code);
    });

    // Click handler for artist buttons at the top.
    // They act as if the user entered the artist name in
    // the form field and clicked "Search"
    $(document).on("click", ".artist-button", function () {
        var clickedArtist = $(this).attr("data-artist");

        $("#artist-input").val(clickedArtist);
        $("#search-events").trigger("click");
    });


    // Click handler for remove buttons attached to artist buttons.
    $(document).on("click", ".remove-button", function () {
        var removeArtist = $(this).attr("data-remove-artist");

        removeArtistFromDB(removeArtist);
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
            $('.social-links').append("<a class='icon-link' href=" + url + " target='_blank'><img alt='" + altText + "' data-toggle='tooltip' title='" + altText + "' src='assets/images/" + imageName + ".png' width='42'></a>");
            linkCounter++;
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    // Display the current day and time on the panel heading for upcoming events
    displayTime();

    function displayTime() {
        var time = moment().format("dddd, MMMM Do YYYY, h:mm a");
        $("#currClock").html(time);
        setTimeout(displayTime, 60000);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    // Clear all onscreen input fields
    function clearInputFields() {
        $("#artist-input").val('');
        $("#start-date-input").val('');
        $("#end-date-input").val('');
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////
    // Remove an artist from the DB and from the screen -- called when the user clicks the X next
    // to an artist button
    function removeArtistFromDB(artist) {
        // remove from db
        database.ref().orderByChild('artist').equalTo(artist).on("value", function (snapshot) {
            snapshot.forEach(function (data) {
                database.ref().child(data.key).remove();
            });
        });

        // remove from screen - along with the x (remove) button
        $artistButtonToRemove = $artistButtons.find("[data-artist='" + artist + "']");
        $xButtonToRemove = $artistButtons.find("[data-remove-artist='" + artist + "']");
        $artistButtonToRemove.remove();
        $xButtonToRemove.remove();
    }

});