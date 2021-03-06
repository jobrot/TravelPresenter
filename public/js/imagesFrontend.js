//The Browser API key obtained from the Google API Console.
//This is allowed to be in Frontend js, as it must be exposed to the user, and is
// restricted via origin policy on the api side
var developerKey = 'AIzaSyBu_4PKulFGlZtAB10E-ekucVFzm2KzSxk';

// Use the API Loader script to load google.picker and gapi.auth.
function onApiLoad() {
    gapi.load('picker', {'callback': createPicker});
}

// Create and render a Picker object for picking user Photos.
function createPicker() {
    //google.picker.ViewId.PHOTOS  --> all photos in their albums        DOCS_IMAGES --> all photos in gdrive
    var picker = new google.picker.PickerBuilder().addView(google.picker.ViewId.DOCS_IMAGES)
        .setOAuthToken(oauthToken)
        .setDeveloperKey(developerKey)
        .setTitle("Select the Images you want to add to your Presentation")
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED).setCallback(pickerCallback).build();
    picker.setVisible(true);
}

// A simple callback implementation, that gets fed with the results of the users picker selections
function pickerCallback(data) {
    if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
        var docs = data[google.picker.Response.DOCUMENTS];
        var ids = [];
        for (i = 0; i < docs.length; i++) {
            ids.push(docs[i][google.picker.Document.ID]);
        }

        var form = document.forms[0];
        var hiddenField = document.createElement("input");
        hiddenField.setAttribute("type", "hidden");
        hiddenField.setAttribute("name", "pickerresults");
        hiddenField.setAttribute("value", ids);
        form.appendChild(hiddenField);

        document.body.appendChild(form);
        form.submit();
    }
}