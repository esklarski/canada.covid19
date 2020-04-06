var _rawData = null;
var _popData = null;
var dateColumns = [];
var _client_width = -1;
var _intial_load = true;

// Resize
$(window).resize(function() {
    if (_rawData != null) {
        var new_width = $("#sizer").width();
        if (_client_width != new_width) {
            // render(charts['countries']);
            // render(charts['states']);
            // render(charts['countries-normalized']);
            // render(charts['states-normalized']);
            render(charts['experimental']);
        }
    }
});


// reducers
var reducer_sum_with_key = function(result, value, key) {
    if (!result[key]) { result[key] = {} }
    let obj = result[key];

    let date = value["Date"];

    if (!obj[date]) { obj[date] = { active: 0, recovered: 0, deaths: 0, cases: 0 } }
    obj[date].active += value["Active"];
    obj[date].recovered += value["Recovered"];
    obj[date].deaths += value["Deaths"];
    obj[date].cases += value["Confirmed"];

    return result;
};

var reducer_byUSstate = function(result, value, key) {
    country = value["Country_Region"];
    state = value["Province_State"];

    if (state == "") { return result; }
    if (country != "Canada") { return result; }
    if (state.indexOf("Princess") != -1) { return result; }

    // Use the state name as key
    key = state;
    return reducer_sum_with_key(result, value, key);
};

var reducer_byCountry = function(result, value, key) {
    state = value["Province_State"];
    if (state != "") { return result; }

    key = value["Country_Region"];
    return reducer_sum_with_key(result, value, key);
};


// use a cookie to store country data
// - src: https://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// find default state value
var stored;

var defaultState = "British Columbia";
if ((stored = getCookie("state")) != "") { defaultState = stored; }

var defaultCountry = "Canada";
if ((stored = getCookie("country")) != "") { defaultCountry = stored; }


// chart metadata
var charts = {
    'countries': {
        reducer: reducer_byCountry,
        scale: "log",
        highlight: defaultCountry,
        y0: 1,
        xCap: 25,
        id: "chart-countries",
        normalizePopulation: false,
        show: 50,
        sort: function(d) { return -d.maxCases; },
        dataSelection: 'deaths',
        showDelta: false,
        dataSelection_y0: { 'active': 100, 'cases': 100, 'deaths': 1, 'recovered': 100, 'new-cases': 1 },
        xMax: null,
        yMax: null,
        data: null
    },
    'states': {
        reducer: reducer_byUSstate,
        scale: "log",
        highlight: defaultState,
        y0: 5,
        xCap: 40,
        id: "chart-states",
        normalizePopulation: false,
        show: 9999,
        sort: function(d) { return -d.maxCases; },
        dataSelection: 'cases',
        dataSelection_y0: { 'active': 5, 'cases': 5, 'deaths': 1, 'recovered': 1 },
        xMax: null,
        yMax: null,
        data: null
    },

    'countries-normalized': {
        reducer: reducer_byCountry,
        scale: "log",
        highlight: defaultCountry,
        y0: 1,
        xCap: 25,
        id: "chart-countries-normalized",
        normalizePopulation: "country",
        popQuantum: 1e6,
        show: 50,
        sort: function(d) { return -d.maxCases + -(d.pop / 1e2); },
        dataSelection: 'cases',
        dataSelection_y0: { 'active': 1, 'cases': 1, 'deaths': 1, 'recovered': 1 },
        xMax: null,
        yMax: null,
        data: null
    },
    'states-normalized': {
        reducer: reducer_byUSstate,
        scale: "log",
        highlight: defaultState,
        y0: 1,
        xCap: 40,
        id: "chart-states-normalized",
        normalizePopulation: "state",
        popQuantum: 1e5,
        show: 9999,
        sort: function(d) { return -d.maxCases; },
        dataSelection: 'cases',
        dataSelection_y0: { 'active': 1, 'cases': 1, 'deaths': 1, 'recovered': 1 },
        xMax: null,
        yMax: null,
        data: null
    },
    'experimental': {
        reducer: reducer_byUSstate,
        scale: "log",
        highlight: defaultState,
        y0: 1,
        xCap: 40,
        id: "chart-experimental",
        normalizePopulation: "state",
        popQuantum: 5e5,
        show: 9999,
        sort: function(d) { return -d.maxCases; },
        dataSelection: 'deaths',
        dataSelection_y0: { 'active': 1, 'cases': 1, 'deaths': 1, 'recovered': 1 },
        xMax: null,
        yMax: null,
        data: null
    },
};


var findNextExp = function(x) {
    var pow10 = Math.pow(10, Math.ceil(Math.log10(x)));

    var val;
    if (x < pow10 / 2) { val = pow10 / 2; } else { val = pow10; }

    if (x > 0.8 * val) { val *= 1.5; }
    return val;
};

var prep_data = function(chart) {
    var caseData = chart.fullData;

    if (chart.show < 9999) { caseData = _.take(caseData, chart.show); }
    var countries = _.map(caseData, 'country').sort();

    // ensure highlighted country shows when new page load with cookie
    if (_intial_load && countries.indexOf(chart.highlight) == -1) {
        chart.show = 9999;
        caseData = chart.fullData;
        countries = _.map(caseData, 'country').sort();
        $("#filter-" + chart.id).val(9999);
    }

    var $highlight = $("#highlight-" + chart.id);
    $highlight.html("");

    if (countries.indexOf(chart.highlight) == -1) {
        if (chart.id.indexOf("states") == -1) { chart.highlight = "Canada"; } else { chart.highlight = "British Columbia"; }
    }

    $.each(countries, function() {
        var el = $("<option />").val(this).text(this);
        if (chart.highlight == this) { el.attr("selected", true); }
        $highlight.append(el);
    });

    $highlight.change(function(e) {
        var val = $(e.target).val()
        chart.highlight = val;

        if (chart.id.indexOf("countries") != -1) { setCookie('country', val, 30); }
        if (chart.id.indexOf("states") != -1) { setCookie('state', val, 30); }
        render(chart);
    });

    chart.data = caseData;
    return chart;
};


var process_data = function(data, chart) {
    var agg = _.reduce(data, chart.reducer, {});

    var caseData = [];
    var maxDayCounter = 0;

    for (var country in agg) {
        var popSize = -1;
        if (chart.normalizePopulation) {
            popSize = _popData[chart.normalizePopulation][country];

            if (!popSize && location.hostname === "localhost") {
                console.log("Missing " + chart.normalizePopulation + ": " + country);
            }
        }

        dayCounter = -1;
        maxCases = 0;
        maxDay = -1;
        lastDayCases = -1;
        countryData = [];
        var dataIndex = 0;
        var dates = Object.keys(agg[country])
        for (var i = 0; i < dates.length; i++) {
            date = dates[i];
            // Start counting days only after the first day w/ 100 cases:
            //console.log(agg[country][date]);
            var cases = agg[country][date][chart.dataSelection];
            if (chart.normalizePopulation) { cases = (cases / popSize) * chart.popQuantum; }

            if (chart.showDelta) {
                if (i == 0) { cases = 0; } else {
                    prevCases = agg[country][dates[i - 1]][chart.dataSelection];
                    if (chart.normalizePopulation) {
                        cases = agg[country][date][chart.dataSelection];
                        cases = cases - prevCases;
                        cases = (cases / popSize) * 1e6;
                    } else {
                        cases = cases - prevCases;
                    }
                }
            }

            if (dayCounter == -1 && cases >= chart.y0) {
                dayCounter = 0;
            }


            // Once we start counting days, add data
            if (dayCounter > -1) {
                //if (cases >= chart.y0 || (chart.showDelta && cases > 1)) {
                if (cases >= chart.y0 || chart.showDelta) {
                    countryData.push({
                        pop: popSize,
                        country: country,
                        dayCounter: dayCounter,
                        date: date,
                        cases: cases,
                        i: dataIndex++
                    });

                    if (!(chart.showDelta && cases < 1)) {
                        lastDayCases = cases;
                        maxDay = dayCounter;
                    }
                }
                if (cases > maxCases) { maxCases = cases; }

                dayCounter++;
            }
        }

        if (maxDay > 0) {
            caseData.push({
                pop: popSize,
                country: country,
                data: countryData,
                maxCases: maxCases,
                maxDay: maxDay,
                lastDayCases: lastDayCases
            });

            if (dayCounter > maxDayCounter) {
                maxDayCounter = dayCounter + 2;
            }
        }
    }

    caseData = _.sortBy(caseData, chart.sort);
    chart.fullData = caseData;

    casesMax = _.sortBy(caseData, function(d) { return -d.maxCases; })[0];
    chart.yMax = findNextExp(casesMax.maxCases);

    chart.xMax = maxDayCounter;
    if (chart.xMax > 40) { chart.xMax = 40; }

    return prep_data(chart);
};

// download 
var covidData_promise = d3.csv(JHUsource, function(row) {
    row["Active"] = +row["Active"];
    row["Confirmed"] = +row["Confirmed"];
    row["Recovered"] = +row["Recovered"];
    row["Deaths"] = +row["Deaths"];
    return row;
});

var populationData_promise = d3.csv(POPsource, function(row) {
    row["Population"] = (+row["Population"]);
    return row;
});


var _dataReady = false,
    _pageReady = false;


var tryRender = function() {
    if (_dataReady && _pageReady) {
        process_data(_rawData, charts["countries"]);
        render(charts["countries"]);
        setTimeout(initialRender2, 100);
    }
}

var initialRender2 = function() {
    // process_data(_rawData, charts["states"]);
    // render(charts["states"]);

    // process_data(_rawData, charts["countries-normalized"]);
    // render(charts["countries-normalized"]);

    // process_data(_rawData, charts["states-normalized"]);
    // render(charts["states-normalized"]);

    process_data(_rawData, charts["experimental"]);
    render(charts["experimental"]);

    _intial_load = false;
};



Promise.all([covidData_promise, populationData_promise])
    .then(function(result) {
        data = result[0];
        populationData = result[1];

        _rawData = data;

        _popData = { country: {}, state: {} };
        for (var pop of populationData) {
            if (pop.Country) { _popData.country[pop.Country] = pop.Population; }
            if (pop.State) { _popData.state[pop.State] = pop.Population; }
        }

        _dataReady = true;
        tryRender();
    })
    .catch(function(err) {
        console.error(err);
        alert("Failed to load data.");
    });




// functions for controls
$(function() {
    $(".scaleSelection").mouseup(function(e) {
        var value = $(e.target).data("scale");
        var chartId = $(e.target).data("chart");
        var chart = charts[chartId];

        if (chart && chart.scale != value) {
            chart.scale = value;
            render(chart);
        }
    });

    $(".filter-select").change(function(e) {
        var chartId = $(e.target).data("chart");
        var chart = charts[chartId];

        chart.show = $(e.target).val();
        prep_data(chart);
        render(chart);
    });

    $(".data-select").change(function(e) {
        var chartId = $(e.target).data("chart");
        var chart = charts[chartId];
        var value = $(e.target).val();

        if (value == "cases-daily") {
            value = "cases";
            chart.showDelta = true;
        } else if (value == "deaths-daily") {
            value = "deaths";
            chart.showDelta = true;
        } else {
            chart.showDelta = false;
        }

        chart.dataSelection = value;
        chart.y0 = chart.dataSelection_y0[value];
        process_data(_rawData, chart);
        render(chart);
    });

    _pageReady = true;
    tryRender();
});


// function for tooltip
var tip_html = function(chart) {
    return function(d, i) {
        var geometicGrowth = Math.pow(d.cases / chart.y0, 1 / d.dayCounter);


        var gData = _.find(chart.data, function(e) { return e.country == d.country }).data;

        var geoGrowth = [];
        if (d.i >= 2) {
            let d0 = gData[i - 1];
            let ggrowth = Math.pow(d.cases / d0.cases, 1 / (d.dayCounter - d0.dayCounter));
            if (isFinite(ggrowth)) {
                geoGrowth.push(`Previous day: <b>${ggrowth.toFixed(2)}x</b> growth`);
            }
        }
        if (d.i >= 8) {
            let d0 = gData[i - 7];
            let ggrowth = Math.pow(d.cases / d0.cases, 1 / (d.dayCounter - d0.dayCounter));
            if (isFinite(ggrowth)) {
                geoGrowth.push(`Previous week: <b>${ggrowth.toFixed(2)}x</b> /day`);
            }
        }
        if (d.i > 0) {
            let d0 = gData[0];
            let ggrowth = Math.pow(d.cases / d0.cases, 1 / (d.dayCounter - d0.dayCounter));
            if (isFinite(ggrowth)) {
                geoGrowth.push(`Previous ${d.dayCounter} days: <b>${ggrowth.toFixed(2)}x</b> /day`);
            }
        }

        var s2 = "";
        if (chart.normalizePopulation) { s2 = " per " + chart.popQuantum.toLocaleString() + " people"; }

        var dataLabel = "";
        if (chart.showDelta) { dataLabel = "new "; }

        if (chart.dataSelection == 'cases') { dataLabel += "confirmed cases"; } else if (chart.dataSelection == 'active') { dataLabel += "active cases"; } else if (chart.dataSelection == 'deaths') { dataLabel += "deaths from COVID-19"; } else if (chart.dataSelection == 'recovered') { dataLabel += "recoveries"; }

        var s = `<div class="tip-country">${d.country} &ndash; Day ${d.dayCounter}</div>
             <div class="tip-details" style="border-bottom: solid 1px black; padding-bottom: 2px;"><b>${d.cases.toLocaleString("en-US", {maximumFractionDigits: 1})}</b> ${dataLabel}${s2} on ${d.date} (<b>${d.dayCounter}</b> days after reaching ${chart.y0} ${dataLabel}${s2})</div>`;

        if (geoGrowth.length > 0) {
            s += `<div class="tip-details"><i><u>Avg. geometric growth</u>:<br>`;
            for (var str of geoGrowth) {
                s += str + "<br>";
            }
            s += `</i></div>`;
        }
        return s;
    }
};

// render chart
var render = function(chart) {
    data_y0 = chart.y0;
    gData = undefined;
    var f = _.find(chart.data, function(e) { return e.country == chart.highlight })
    if (f && (gData = f.data) && gData[0]) {
        if (gData[0].cases) { data_y0 = gData[0].cases; }
    }

    var maxDayRendered = chart.xMax;
    if (f && f.maxDay > maxDayRendered) {
        maxDayRendered = f.maxDay + 3;
    }

    var margin = { top: 10, right: 20, bottom: 40, left: 60 };

    var cur_width = $("#sizer").width();
    _client_width = cur_width;

    var width = cur_width - margin.right - margin.left;
    var height = 500;

    var isSmall = false;
    if (width < 400) {
        height = 300;
        isSmall = true;
    }

    // X-axis scale (days)
    var daysScale = d3.scaleLinear()
        .domain([0, maxDayRendered])
        .range([0, width]);

    // Y-axis scale (# of cases)                    
    var casesScale;
    if (chart.scale == "log") { casesScale = d3.scaleLog(); } else { casesScale = d3.scaleLinear(); }

    scale_y0 = chart.y0;
    if (chart.showDelta) {
        scale_y0 = 1;
    }

    casesScale.domain([scale_y0, chart.yMax]).range([height, 0]);

    // Color Scale
    var colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // SVG
    $("#" + chart.id).html("");
    var svg = d3.select("#" + chart.id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("width", width + margin.left + margin.right)
        .style("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Mouseovers
    var tip = d3.tip().attr('class', 'd3-tip').html(tip_html(chart));
    svg.call(tip);

    // Axes
    var x_axis = d3.axisBottom(daysScale);
    svg.append('g')
        .attr("transform", "translate(0, " + height + ")")
        .attr("class", "axis")
        .call(x_axis);

    var x_grid = d3.axisBottom(daysScale).tickSize(-height).tickFormat("");
    svg.append('g')
        .attr("transform", "translate(0, " + height + ")")
        .attr("class", "grid")
        .call(x_grid);

    // Have tickValues at 1, 5, 10, 50, 100, ...
    var tickValue = 1;
    var tickValueIncrease = 5;
    var tickValues = [];
    while (tickValue <= 1e6) {
        if (tickValue >= scale_y0) { tickValues.push(tickValue); }
        tickValue *= tickValueIncrease;

        if (tickValueIncrease == 5) { tickValueIncrease = 2; } else { tickValueIncrease = 5; }
    }

    var y_axis = d3.axisLeft(casesScale).tickFormat(d3.format("0,"));
    if (chart.scale == "log") { y_axis.tickValues(tickValues); }

    svg.append('g')
        .attr("class", "axis")
        .call(y_axis);

    var y_grid = d3.axisLeft(casesScale).tickSize(-width).tickFormat("");
    svg.append('g')
        .attr("class", "grid")
        .call(y_grid);



    // Add Data
    // Create doubling lines
    let scaleLinesMeta = [{
        label: "2 days",
        gRate: Math.pow(2, 1 / 2)
    },
    {
        label: "3 days",
        gRate: Math.pow(2, 1 / 3)
    },
    {
        label: "1 week",
        gRate: Math.pow(2, 1 / 7)
    },
    {
        label: "2 weeks",
        gRate: Math.pow(2, 1 / 14)
    }]

    for (var scaleLineMeta of scaleLinesMeta) {
        var cases = data_y0,
            day = 0,
            xMax_y = -1;
        var pctLine = [];
        while (cases < 2 * chart.yMax) {
            pctLine.push({
                dayCounter: day,
                cases: cases
            })

            if (day == chart.xMax) {
                xMax_y = cases;
            }

            day++;
            cases *= scaleLineMeta.gRate;
        }

        svg.datum(pctLine)
            .append("path")
            .attr("fill", "none")
            .attr("stroke", function() {
                if (scaleLineMeta.color) { return scaleLineMeta.color; } else { return "#999"; }
            })
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", 12)
            .attr("d", d3.line()
                .x(function(d) { return daysScale(d.dayCounter); })
                .y(function(d) { return casesScale(d.cases); })
            );

        svg.append("text")
            .attr("fill", colorScale(i))
            .attr("class", "label-country")
            .attr("x", function() {
                if (xMax_y == -1) {
                    return daysScale(Math.log(chart.yMax / data_y0)) / Math.log(scaleLineMeta.gRate) - ((isSmall) ? 10 : 25);
                } else {
                    return daysScale(Math.log(xMax_y / data_y0)) / Math.log(scaleLineMeta.gRate) + 10;
                }
            })
            .attr("y", function() {
                if (xMax_y == -1) { return casesScale(chart.yMax) + 12; } else { return casesScale(xMax_y) - 5; }
            })
            .attr("text-anchor", "end")
            .attr("fill", function() {
                if (scaleLineMeta.color) { return scaleLineMeta.color; } else { return "black"; }
            })
            .text(scaleLineMeta.label);
    }



    var xAxisLabel = `Days since ${chart.y0} `
    if (chart.dataSelection == 'cases') { xAxisLabel += "case"; if (chart.y0 != 1) { xAxisLabel += "s"; } } else if (chart.dataSelection == 'active') { xAxisLabel += "active case"; if (chart.y0 != 1) { xAxisLabel += "s"; } } else if (chart.dataSelection == 'deaths') { xAxisLabel += "death"; if (chart.y0 != 1) { xAxisLabel += "s"; } } else if (chart.dataSelection == 'recovered') { xAxisLabel += "recover"; if (chart.y0 != 1) { xAxisLabel += "ies"; } else { xAxisLabel += "y"; } }
    if (chart.normalizePopulation) {
        xAxisLabel += " /" + chart.popQuantum.toLocaleString();
    }

    svg.append("text")
        .attr("x", width - 5)
        .attr("y", height - 5)
        .attr("class", "axis-title")
        .attr("text-anchor", "end")
        .text(xAxisLabel);

    var yAxisLabel = "";
    if (chart.showDelta) { yAxisLabel += "New Daily "; }
    if (chart.dataSelection == 'cases') { yAxisLabel += "Confirmed Cases"; } else if (chart.dataSelection == 'active') { yAxisLabel += "Active Cases"; } else if (chart.dataSelection == 'deaths') { yAxisLabel += "COVID-19 Deaths"; } else if (chart.dataSelection == 'recovered') { yAxisLabel += "Recoveries" }
    if (chart.normalizePopulation) {
        yAxisLabel += " /" + chart.popQuantum.toLocaleString();
    }

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -2)
        .attr("y", 15)
        .attr("class", "axis-title")
        .attr("text-anchor", "end")
        .text(yAxisLabel);

    svg.append("text")
        .attr("x", width)
        .attr("y", height + 32)
        .attr("class", "text-credits")
        .attr("text-anchor", "end")
        .text(`Data: Johns Hopkins CSSE; Updated: ${_dateUpdated}`);

    last_index = -1;
    for (var i = 0; i < chart.data.length; i++) {
        colorScale(i);
        //console.log(chart.data[i]);
        if (chart.data[i].data[0].country == chart.highlight) {
            last_index = i;
        }
    }

    var renderLineChart = function(svg, i) {
        var countryData = chart.data[i];

        svg.datum(countryData.data)
            .append("path")
            .attr("fill", "none")
            .attr("stroke", colorScale(i))
            .attr("stroke-width", function(d) {
                if (d[0].country == chart.highlight) { return 4; } else { return 1; }
            })
            .style("opacity", function(d) {
                if (d[0].country == chart.highlight) { return 1; } else { return 0.3; }
            })
            .attr("d", d3.line()
                .x(function(d) { return daysScale(d.dayCounter); })
                .y(function(d) { return casesScale(d.cases); })
                .defined(function(d, i, a) {
                    return (d.cases >= 1);
                })
            );

        svg.selectAll("countries")
            .data(countryData.data)
            .enter()
            .append("circle")
            .attr("cx", function(d) { return daysScale(d.dayCounter); })
            .attr("cy", function(d) {
                if (d.cases < 1) { return -999; }
                return casesScale(d.cases);
            })
            .style("opacity", function(d) {
                if (d.country == chart.highlight) { return 1; } else { return 0.3; }
            })
            .attr("r", function(d) {
                if (d.cases < 1) { return 0; }
                if (d.country == chart.highlight) { return 4; } else { return 3; }
            })
            .attr("fill", colorScale(i))
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

        var countryText = svg.append("text")
            .attr("fill", colorScale(i))
            .attr("class", "label-country")
            .style("opacity", function() {
                if (countryData.data[0].country == chart.highlight) { return 1; } else { return 0.3; }
            })
            .style("font-size", function() {
                if (countryData.data[0].country == chart.highlight) { return "15px"; } else { return null; }
            })
            .text(countryData.country);

        if (countryData.maxDay + 2 < maxDayRendered || !countryData.data[maxDayRendered - 1]) {
            countryText
                .attr("x", 5 + daysScale(countryData.maxDay))
                .attr("y", casesScale(countryData.lastDayCases))
                .attr("alignment-baseline", "middle")
        } else {
            countryText
                .attr("x", daysScale(maxDayRendered) - 5)
                .attr("y", casesScale(countryData.data[maxDayRendered - 1].cases) - 5)
                .attr("text-anchor", "end")
        }
    };

    for (var i = 0; i < chart.data.length; i++) {
        if (i != last_index) { renderLineChart(svg, i); }
    }

    if (last_index != -1) {
        renderLineChart(svg, last_index);
    }
};