var _dateUpdated = "2021/10/20";
var _timeUpdated = "00:40h";
var _ODWGupdated = "2021/10/19";
var _JHUupdated  = "2021/10/19";

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
