var MAXSTEPS = 50;
var MINSTEPS = 1;
var STEPLENGTH = 30;
var WAITATTARGETTIME = 1000;
var PRELOAD_IMG_COUNT = 5;
var IMAGE_SHOW_LENGTH = 3000;
var currentTimeOut; //Id of current Timeout, to enable user to skip it
var currentResolve; //Resolve Function of current timeout
var map;

//creates the map using the google maps API
function initMap() {
    console.log("initmap");
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 8,
        center: locations[0],
        maxZoom: 12
    });

    // Create an array of alphabetical characters used to label the markers.
    var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    locations.map(function (location, i) {
        return new google.maps.Marker({
            _id: location._id,
            position: location,
            label: labels[i % labels.length]
        });
    });
    createPathfromLocations(locations).setMap(map);
    preloadImages(locations);
}

//Entry point for the Animation, reads the values the user has given and
//sets according variables
function setShowLenghtAndStartAnimation() {
    var ms = document.getElementById("inputms").value;
    if (!$('#checkms:checked').val()) {
        IMAGE_SHOW_LENGTH = 99999999999;
    }
    else if (ms) {
        IMAGE_SHOW_LENGTH = ms;
    }
    panMapToAllLocations(map, locations, 0, 0);
}


function createPathfromLocations(locs) {
    var travelpath = new google.maps.Polyline({
        path: locs,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    return travelpath;
}

// This function is the main recursion that shows each image.
// It waits until the previous recursion is done, + a certain time to ensure
// the viewer sees the current location, then the image is shown.
// afterwards, the next unloaded image is loaded and the panning animation is executed
function panMapToAllLocations(map, locs, i, oldSteps) {
    var modal = document.getElementById('playmodal');
    var modalImg = document.getElementById("img" + i % PRELOAD_IMG_COUNT);

    sleep((STEPLENGTH * oldSteps) + WAITATTARGETTIME).then(() => {
        modal.style.display = "block";
        modalImg.style.display = "block";
        // modalImg.style.imageOrientation = "from-image";  This would be the solution to Rotation issues, but only implemented in Firefox

        sleepAndSetTimeoutId(IMAGE_SHOW_LENGTH).then(() => {
            modal.style.display = "none";
            modalImg.style.display = "none";

            //if there are still enough images in the queue, the one that is PRELOAD_IMG_COUNT
            //away from the current index is preloaded
            if (locs[PRELOAD_IMG_COUNT]) {
                modalImg.src = "https://drive.google.com/uc?export=view&id=" + locs[PRELOAD_IMG_COUNT].id;
                modalImg.style.transform = "rotate(" + locs[PRELOAD_IMG_COUNT].rotation * 90 + "deg)";
            }

            var bounds = new google.maps.LatLngBounds();
            bounds.extend({lat: locs[0].lat, lng: locs[0].lng});
            bounds.extend({lat: locs[1].lat, lng: locs[1].lng});
            // the edges of the map are accomodated to fit the current and the next location
            map.fitBounds(bounds);
            var steps = calculateStepsAccordingToDistance(getDistanceFromLatLonInKm(locs[0].lat, locs[0].lng, locs[1].lat, locs[1].lng));

            slowPanTo(map, locs[1].lat, locs[1].lng, steps);

            //locs is used as a queue, the next imag is always at [0]
            locs.shift();

            if (locs.length != 1) {
                panMapToAllLocations(map, locs, i + 1, steps);
            }
            else {
                sleep(STEPLENGTH * steps).then(() => {
                    //Show the last image
                    modalImg = document.getElementById("img" + (i + 1) % PRELOAD_IMG_COUNT);
                    modal.style.display = "block";
                    modalImg.style.display = "block";
                });
            }
        });
    });
}

//Before the start of the Animation the first PRELOAD_IMG_COUNT images are loaded into
//hidden helper image tags. If they need to be rotated, the images are rotated via css
function preloadImages(locs) {
    for (i = 0; i < PRELOAD_IMG_COUNT; i++) {
        var img = document.getElementById("img" + i);
        if (img && locs[i]) {
            img.src = "https://drive.google.com/uc?export=view&id=" + locs[i].id;
            img.style.transform = "rotate(" + locs[i].rotation * 90 + "deg)";
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//Creates a timeout that can be cleared and resolved via the corresponding
//global variables to enable skipping forward
function sleepAndSetTimeoutId(ms) {
    return new Promise(resolve => {
        currentResolve = resolve;
        currentTimeOut = setTimeout(resolve, ms);
    });
}

//as the google maps api panning function is too fast and not smooth enough,
//panning is done manually by recursively calling this function with decreasing steps
function slowPanTo(map, goalLat, goalLong, steps) {
    var curLat = map.getCenter().lat();
    var curLng = map.getCenter().lng();
    var newLat = curLat + ((goalLat - curLat) / steps);
    var newLng = curLng + ((goalLong - curLng) / steps);
    map.panTo({lat: newLat, lng: newLng});
    if (steps == 1) {
        return;
    }
    else {
        sleep(STEPLENGTH).then(() => {
            slowPanTo(map, goalLat, goalLong, steps - 1);
        });
    }
}

//calculated using a logistical growth model, with the defined
//Maxsteps as the maximum of growth and the minSteps as starting value
//and and appropriate growth constant k
function calculateStepsAccordingToDistance(dist) {
    if (dist < 1) {
        return 1;
    }
    var S = MAXSTEPS;
    var a = MINSTEPS;
    var k = 0.004;
    return Math.ceil((a * S) / (a + ((S - a) * Math.pow(Math.E, (-S * k * dist)))));
}

//Haversine Formula to calculate the Distance between two coordinates,
//taking into account the curvature of the earth
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

//once the whole window is loaded, the modal is shown, and a listener is put into place
$(window).on('load', function () {
    $('#msModal').modal('show');
    document.getElementById('checkms').onchange = function () {
        document.getElementById('inputms').disabled = !this.checked;
    };
});