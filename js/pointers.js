var JHUsource = formatJHUsource();

function formatJHUsource() {
    var temp = _dateUpdated.split('/');
    return "dataset/jhu-data.csv?d=" + temp[2] + temp[0] + temp[1]
}

var POPsource = "wikipedia-population.csv";
