var _dateUpdated = "2020/11/01";
var _timeUpdated = "18:15h";
var _ODWGupdated = "2020/10/31";
var _JHUupdated  = "2020/10/31";

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

