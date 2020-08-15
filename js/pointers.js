var temp = _JHUupdated.split('/');
var JHUdate = temp[1] + "-" + temp[2] + "-" + temp[0];
temp = _ODWGupdated.split("/");
var ODWGdate = temp[1] + "-" + temp[2] + "-" + temp[0];

var JHUsource =  "https://raw.githubusercontent.com/esklarski/canada.covid19/master/dataset/jhu-data.csv" + "?d=" + JHUdate;

var POPsource = "https://raw.githubusercontent.com/esklarski/canada.covid19/master/dataset/wikipedia-population.csv";

var ODWGsource =  "https://raw.githubusercontent.com/esklarski/canada.covid19/master/dataset/odwg-data.csv" + "?d=" + ODWGdate;
