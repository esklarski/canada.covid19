var JHUsource = formatJHUsource();

function formatJHUsource() {
    var temp = _dateUpdated.split('/');
    return "https://raw.githubusercontent.com/esklarski/canada.covid19/c0b17449031ff1e3f60bf8f9cba3c0e03b84164a/dataset/jhu-data.csv?d=" + temp[2] + temp[0] + temp[1]
}

var POPsource = "https://raw.githubusercontent.com/esklarski/canada.covid19/c0b17449031ff1e3f60bf8f9cba3c0e03b84164a/dataset/wikipedia-population.csv"