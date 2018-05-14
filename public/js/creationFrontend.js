var markers = [];
var travelpath;
var markerCluster;
var map;
function initMap() {

    //Find the first entry in the images containing coordinates
    var center = {lat: 48.2081743, lng: 16.3738189}; //fallback center
    for (i = 0; i < album.images.length; i++) {
        var image = album.images[i];
        if (image.lat && image.lng) {
            center = image;
            break;
        }
    }

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 3,
        center: center
    });

    createPathfromLocations(album.images).setMap(map);
    addImagesToMap();
}

// all images from the album are added to the map as markers, those without
// geographic location are indicated by the UI
// In addition, listeners are set to enable each marker to be dragged to update
// the location
function addImagesToMap() {
    // Create an array of alphabetical characters used to label the markers.
    var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    markers.forEach(marker => {
        marker.setMap(null);
    });

    markers = [];
    var playable = true;
    album.images.forEach(function (image, i) {
        //Remove thumbnails from the js object to save memory and post-space
        delete image.thumbnail;

        if (image.lat && image.lng) {
            markers.push(new google.maps.Marker({
                _id: image.filename,
                position: image,
                label: labels[i % labels.length],
                draggable: true
            }));
        }
        else {
            document.getElementById(image.filename).classList.add('list-group-item-warning');
            playable = false;
        }
    });
    updatePlayableUIElements(playable);
    //Clear out previous marker Clusterers
    /*
     if(markerCluster){
     markerCluster.setMap(null);
     console.log("markercluster map set to null");
     }


     markerCluster = new MarkerClusterer(map, markers, {
     imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
     gridSize: '12'
     });
     */

    markers.forEach((marker) => {
        marker.setMap(map);
        marker.addListener('dragend', function () {
            album.images.forEach((image, index) => {
                if (image.filename == marker._id) {
                    image.lat = marker.position.lat();
                    image.lng = marker.position.lng();
                }
            });
            resetPath();
            //document.getElementById("updateLocButton").disabled = false;
        });
    });

}

// a path is created from all locations that posess lat and lng information
function createPathfromLocations(locs) {
    var locswithoutempty = locs.filter(location => location.lat && location.lng);

    travelpath = new google.maps.Polyline({
        path: locswithoutempty,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    return travelpath;
}

// create a listener to set the location for the current image.
// once the user chooses a location, the image, path and map are updated
function setNewMarker(filename) {
    map.setOptions({draggableCursor: 'crosshair'})

    var listener = map.addListener('click', function (e) {
        var playable = true;
        album.images.forEach((image) => {
            if (image.filename == filename) {
                image.lat = e.latLng.lat();
                image.lng = e.latLng.lng();
                document.getElementById(image.filename).classList.remove('list-group-item-warning');
            }
            if (!(image.lat && image.lng)) {
                playable = false;
            }
        });
        updatePlayableUIElements(playable);
        resetPath();
        addImagesToMap();
        google.maps.event.removeListener(listener);
        map.setOptions({draggableCursor: 'default'});

        //document.getElementById("updateLocButton").disabled = false;
    });
}

// removes a single file from the current album according to the filename,
// also updates the playable state of the album
function removeFileFromAlbum(filename) {
    album.images.forEach((image, index, object) => {
        if (image.filename == filename) {
            object.splice(index, 1);
        }
    });

    var playable = true;
    album.images.forEach(image => {
        if (!(image.lat && image.lng)) {
            playable = false;
        }
    });
    updatePlayableUIElements(playable);


    var element = document.getElementById(filename);
    element.parentNode.removeChild(element);
    resetPath();
}

// redraws the path of the locations
function resetPath() {
    travelpath.setMap(null);
    createPathfromLocations(album.images);
    travelpath.setMap(map);
    persistCreation(album);
}


var idsInOrder = [];
function sortArrayWithComparatorArray(a, b) {
    return idsInOrder.indexOf(a.filename) - idsInOrder.indexOf(b.filename);
}

//the sortable element is read and the images in the album are sorted
//according to this order.
var sortAndUpdateMap = function () {
    idsInOrder = $("#sortable").sortable("toArray");

    album.images.sort(sortArrayWithComparatorArray);

    resetPath();
}


$("#sortable").sortable({
    stop: sortAndUpdateMap
});


function persistCreation(album) {
    $.ajax({
        type: "POST",
        url: "/creation",
        data: {
            album: album,
            _csrf: _csrf
        }
    });
}

function updatePlayableUIElements(playable) {
    album.playable = playable;
    if (playable) {
        console.log("disabled = false");
        $(".playablebutton").prop('disabled', false);
    }
    else {
        console.log("disabled = true");
        $(".playablebutton").prop('disabled', true);
    }
}

/*
Unused, because this functionality is not part of the Google API
function updateLocationsGoogleDrive() {
    $.ajax({
        type: "POST",
        url: "/creation/updatelocations",
        data: {
            album: album,
            _csrf: "#{_csrf}"
        }
    });
    //document.getElementById("updateLocButton").disabled = true;
}
*/


//Code for editable label
$('.editableTitle').click(function () {
    "use strict";
    $(this).hide();
    $('#' + $(this).attr('for'))
        .val($(this).text())
        .toggleClass("form-control")
        .show()
        .focus();
});

$(function () {
    $("#sortable").sortable();
    $("#sortable").disableSelection();
});

document.getElementById('titleTextBox').addEventListener('keyup', function (e) {
    if (e.which == 13) this.blur();
});

$(document).ready(function () {
    $('.pre-scrollable').slimScroll({height: '75vh'});
});

// on removing focus from the title editing field, the album is persisted
$('.blur').blur(function () {
    "use strict";
    $(this)
        .hide()
        .toggleClass("form-control");
    var myid = (this).id;
    $('span[for=' + myid + ']')
        .text($(this).val())
        .show();
    album.title = $(this).val();
    persistCreation(album);
});