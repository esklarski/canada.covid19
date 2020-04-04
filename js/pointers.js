var JHUsource = formatJHUsource();

function formatJHUsource() {
    var temp = _dateUpdated.split('/');
    return "https://github.com/esklarski/canada.covid19/blob/master/dataset/jhu-data.csv?d=" + temp[2] + temp[0] + temp[1]
}

var POPsource = "https://github.com/esklarski/canada.covid19/blob/master/dataset/wikipedia-population.csv"