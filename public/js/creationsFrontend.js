$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip({'placement': 'top'});
});

// copies a link to the play - section of id to the clipboard
function copyToClipboardWithCurrentHref(id) {
    var copyText = window.location.href.split("/").slice(0,3).join("/")+"/play/"+id;
    const el = document.createElement('textarea');
    el.value = copyText;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

//updates the tooltip for id and calls copyToClipboard
function copyToClipboardAndUpdateTooltips (id) {
    copyToClipboardWithCurrentHref(id);
    $("#share" + id).attr("title", "Copied link to the shared Presentation to Clipboard")
        .tooltip("fixTitle")
        .tooltip("show");
}