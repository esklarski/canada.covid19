var _dateUpdated = "2021/08/05";
var _timeUpdated = "01:00h";
var _ODWGupdated = "2021/08/04";
var _JHUupdated  = "2021/08/04";

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
