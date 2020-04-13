var JHUsource = JHUsource();

function JHUsource() {
    var temp = _dateUpdated.split('/');
    return "dataset/jhu-data.csv?d=" + temp[0] + temp[1] + temp[2];
}

var POPsource = "dataset/wikipedia-population.csv";
