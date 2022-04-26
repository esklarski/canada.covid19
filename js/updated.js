var _dateUpdated = "2022/04/26";
var _timeUpdated = "00:55h";
var _ODWGupdated = "2022/04/25";
var _JHUupdated  = "2022/04/25";

function initPage() {
    // update updated time
    document.getElementById("update-date").textContent = _dateUpdated;
    document.getElementById("update-time").textContent = _timeUpdated;

    // set all select elements to default index
    Array.from( document.getElementsByClassName("data-select") )
         .forEach( function(select) { select.selectedIndex = "0"; } );
    Array.from( document.getElementsByClassName("yaxis-select") )
         .forEach( function(select) { select.selectedIndex = "0"; } );
}
