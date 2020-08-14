var _rawJHU = null;
var _rawC19C = null;
var _popData = null;
var _client_width = -1;
var _intial_load = true;


// resize site when width changes
$(window).resize(function() {
    if (_rawJHU != null && _rawC19C != null) {
        var new_width = $("#sizer").width();
        if (_client_width != new_width) {
            render(charts['countries']);
            render(charts['states']);
            render(charts['countries-normalized']);
            render(charts['states-normalized']);
        }
    }
});


// chart data reducers
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

var reducer_byProv_State = function(result, value, key) {
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


// default province and country value
var defaultProv_State = "British Columbia";
var defaultCountry = "Canada";


// chart metadata
var charts = {
    'countries': {
        reducer: reducer_byCountry,
        scale: "log",
        highlight: defaultCountry,
        y0: 100,
        xCap: 25,
        id: "chart-countries",
        normalizePopulation: false,
        show: 25,
        sort: function(d) { return -d.maxCases; },
        dataSelection: 'active',
        showDelta: false,
        dataSelection_y0: { 'active': 100, 'cases': 100, 'deaths': 10, 'recovered': 100, 'new-cases': 0 },
        yAxisScale: 'fixed',
        xMax: null, yMax: null, data: null,
    },
    'states': {
        reducer: reducer_byProv_State,
        scale: "log",
        highlight: defaultProv_State,
        y0: 5,
        xCap: 40,
        id: "chart-states",
        normalizePopulation: false,
        show: 25,
        sort: function(d) { return -d.maxCases; },
        dataSelection: 'active',
        dataSelection_y0: { 'active': 5, 'cases': 5, 'deaths': 1, 'recovered': 1 },
        yAxisScale: 'fixed',
        xMax: null, yMax: null, data: null,
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
        show: 25,
        sort: function(d) { return -d.maxCases + -(d.pop / 1e2); },
        dataSelection: 'active',
        dataSelection_y0: { 'active': 10, 'cases': 10, 'deaths': 1, 'recovered': 1 },
        yAxisScale: 'fixed',
        xMax: null, yMax: null, data: null,
    },
    'states-normalized': {
        reducer: reducer_byProv_State,
        scale: "log",
        highlight: defaultProv_State,
        y0: 1,
        xCap: 40,
        id: "chart-states-normalized",
        normalizePopulation: "state",
        popQuantum: { 'active': 1e5, 'cases': 1e5, 'deaths': 5e5, 'recovered': 1e6 },
        show: 25,
        sort: function(d) { return -d.maxCases; },
        dataSelection: 'active',
        dataSelection_y0: { 'active': 1, 'cases': 1, 'deaths': 1, 'recovered': 1 },
        yAxisScale: 'fixed',
        xMax: null, yMax: null, data: null,
    },
};


// math function
var findNextExp = function(x) {
    return x * 1.5;
};


// ? filter final data for dispaly, handle page ?
var prep_data = function(chart) {
    var caseData = chart.fullData;

    // grab Canada data
    let canada = caseData.find(o => o.country === 'Canada');

    if (chart.show < 9999) {
        // filter number of displayed countries
        caseData = _.take(caseData, chart.show);
        // append Canada if missing
        if (caseData.find(o => o.country === 'Canada') === undefined) {
            caseData.push(canada);
        }
    }

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
        if (chart.id.indexOf("states") == -1) { chart.highlight = "Canada"; }
        else { chart.highlight = "British Columbia"; }
    }

    $.each(countries, function() {
        var el = $("<option />").val(this).text(this);
        if (chart.highlight == this) { el.attr("selected", true); }
        $highlight.append(el);
    });

    $highlight.change(function(e) {
        var val = $(e.target).val()
        chart.highlight = val;
        render(chart);
    });

    chart.data = caseData;
  
    casesMax = _.sortBy(chart.data, function(d) { return -d.maxCases; } )[0];
    chart.yMax = findNextExp(casesMax.maxCases);
  
    return chart;
};


// ? process data for display ?
var process_data = function(chart) {
    if (chart.id == "chart-countries" || chart.id == "chart-countries-normalized")
         { data = _rawJHU; }
    else { data = _rawC19C }

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
            if (chart.normalizePopulation) {
                var quantum = chart.popQuantum[chart.dataSelection] || chart.popQuantum;
                cases = (cases / popSize) * quantum;
            }

            if (chart.showDelta) {
                if (i == 0) { cases = 0; }
                else {
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
                maxDayCounter = dayCounter + 4;
            }
        }
    }

    caseData = _.sortBy(caseData, chart.sort);
    chart.fullData = caseData;
    
    chart.xMax = maxDayCounter;
    if (chart.xMax > 55) { chart.xMax = 55; }

    prep_data(chart);

    return casesMax;
};


// file downloads
var JHUData_promise = d3.csv(JHUsource, function(row) {
    row["Active"] = +row["Active"];
    row["Confirmed"] = +row["Confirmed"];
    row["Recovered"] = +row["Recovered"];
    row["Deaths"] = +row["Deaths"];
    return row;
});

var C19CData_promise = d3.csv(C19Csource, function(row) {
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


// page status variables
var _dataReady = false, _pageReady = false;


// call renderer for all charts
var tryRender = function() {
    if (_dataReady && _pageReady) {
        // try the first chart
        process_data(charts["countries"]);
        render(charts["countries"]);
        // call other charts with timeout
        setTimeout(initialRender2, 100);
    }
}

var initialRender2 = function() {
    process_data(charts["states"]);
    render(charts["states"]);

    process_data(charts["countries-normalized"]);
    render(charts["countries-normalized"]);

    process_data(charts["states-normalized"]);
    render(charts["states-normalized"]);

    _intial_load = false;
};


// collect promises
Promise.all([JHUData_promise, C19CData_promise, populationData_promise])
    .then(function(result) {
        JHUdata = result[0];
        C19Cdata = result[1];
        populationData = result[2];

        _rawJHU = JHUdata;

        _rawC19C = C19Cdata;

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


// select functions
$(function() {
    $(".yaxis-select").change(function(e) {
        var chartId = $(e.target).data("chart");
        var chart = charts[chartId];
        
        chart.yAxisScale = $(e.target).val();
        render(chart);
    });

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
        } else {
            chart.showDelta = false;
        }

        chart.dataSelection = value;
        chart.y0 = chart.dataSelection_y0[value];
        process_data(chart);
        render(chart);
    });

    _pageReady = true;
    tryRender();
});


// graph tooltip
var tip_html = function(chart) {
    return function(d, i) {
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
        if (chart.normalizePopulation) {
            var quantum = chart.popQuantum[chart.dataSelection] || chart.popQuantum;
            s2 = " per " + quantum.toLocaleString() + " people";
        }

        var tipDate = d.date.split("-");
        tipDate = tipDate[2] + "-" + tipDate[0] + "-" + tipDate[1];

        var dataLabel = "";
        if (chart.showDelta) { dataLabel = "new "; }

        if (chart.dataSelection == 'cases') { dataLabel += "confirmed cases"; }
        else if (chart.dataSelection == 'active') { dataLabel += "active cases"; }
        else if (chart.dataSelection == 'deaths') { dataLabel += "deaths from COVID-19"; }
        else if (chart.dataSelection == 'recovered') { dataLabel += "recoveries"; }

        var s = `<div class="tip-country">${d.country} &ndash; Day ${d.dayCounter}</div>
             <div class="tip-details" style="border-bottom: solid 1px black; padding-bottom: 2px;"><b>${d.cases.toLocaleString("en-US", {maximumFractionDigits: 1})}</b> ${dataLabel}${s2} on ${tipDate} (<b>${d.dayCounter}</b> days after reaching ${chart.y0} ${dataLabel}${s2})</div>`;

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

    if (width < 400) {
        height = 300;
    }

    // X-axis scale (days)
    var daysScale = d3.scaleLinear()
        .domain([0, maxDayRendered])
        .range([0, width]);

    // Y-axis scale (# of cases)                    
    var casesScale;
    if (chart.scale == "log") { casesScale = d3.scaleLog(); }
    else { casesScale = d3.scaleLinear(); }

    scale_y0 = chart.y0;
    if (chart.showDelta) {
        scale_y0 = 1;
    }

    var scale_yMax = chart.yMax;
    if (chart.yAxisScale == "highlight") {
        scale_yMax = f.maxCases * 1.2;
    }

    casesScale.domain([scale_y0, scale_yMax]).range([height, 0]);
    
    // Color Scale
    var colors = ["#ff829a", "#009439", "#a500ab", "#74b000", "#a967ff",
                  "#416b00", "#ff72fb", "#7aba79", "#481c97", "#ff7120",
                  "#0288f9", "#e6001a", "#009c8e", "#ee0060", "#0047ae",
                  "#aa7000", "#aaa1f6", "#a34900", "#333572", "#dd9e5a",
                  "#d30071", "#3c3e07", "#f69064", "#67204b", "#772900"];

    var colorScale = d3.scaleOrdinal(colors);

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

        if (tickValueIncrease == 5) { tickValueIncrease = 2; }
        else { tickValueIncrease = 5; }
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

    var quantum = (chart.normalizePopulation)
        ? " /" + (chart.popQuantum[chart.dataSelection] || chart.popQuantum).toLocaleString()
        : "";

    var xAxisLabel = `Days since ${chart.y0} `
    if (chart.dataSelection == 'cases') { xAxisLabel += "case"; if (chart.y0 != 1) { xAxisLabel += "s"; } }
    else if (chart.dataSelection == 'active') { xAxisLabel += "active case"; if (chart.y0 != 1) { xAxisLabel += "s"; } }
    else if (chart.dataSelection == 'deaths') { xAxisLabel += "death"; if (chart.y0 != 1) { xAxisLabel += "s"; } }
    else if (chart.dataSelection == 'recovered') { xAxisLabel += "recover"; if (chart.y0 != 1) { xAxisLabel += "ies"; } else { xAxisLabel += "y"; } }

    xAxisLabel += quantum;

    svg.append("text")
        .attr("x", width - 5)
        .attr("y", height - 5)
        .attr("class", "axis-title")
        .attr("text-anchor", "end")
        .text(xAxisLabel);

    var yAxisLabel = "";
    if (chart.showDelta) { yAxisLabel += "New Daily "; }
    if (chart.dataSelection == 'cases') { yAxisLabel += "Confirmed Cases"; }
    else if (chart.dataSelection == 'active') { yAxisLabel += "Active Cases"; }
    else if (chart.dataSelection == 'deaths') { yAxisLabel += "COVID-19 Deaths"; }
    else if (chart.dataSelection == 'recovered') { yAxisLabel += "Recoveries" }

    yAxisLabel += quantum;

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
        .text(function() {
            if (chart.id == "chart-countries" || chart.id == "chart-countries-normalized")
                 { return `Data: Johns Hopkins CSSE; Updated: ${_JHUupdated}`; }
            else { return `Data: COVID-19 Canada ODWG; Updated: ${_C19Cupdated}`; }
        });

    last_index = -1;
    for (var i = 0; i < chart.data.length; i++) {
        colorScale(chart.data[i].data[0].country);
        
        if (chart.data[i].data[0].country == chart.highlight) {
            last_index = i;
        }
    }

    var renderLineChart = function(svg, i) {
        var countryData = chart.data[i];

        svg.datum(countryData.data)
            .append("path")
            .attr("fill", "none")
            .attr("stroke", function(d) { return colorScale(d[0].country); } )
            .attr("stroke-width", function(d) {
                if (d[0].country == chart.highlight) { return 3; }
                else if (d[0].country == "Canada") { return 2; }
                else { return 1; }
            })
            .style("opacity", function(d) {
                if (d[0].country == chart.highlight) { return 1; }
                else if (d[0].country == "Canada") { return 0.7; }
                else { return 0.4; }
            })
            .attr("d", d3.line()
                .x(function(d) { return daysScale(d.dayCounter); })
                .y(function(d) { return casesScale(d.cases); })
                .defined(function(d) {
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
                if (d.country == chart.highlight || d.country == "Canada") { return 0.8; }
                else { return 0.3; }
            })
            .attr("r", function(d) {
                if (d.cases < 1) { return 0; }
                if (d.country == chart.highlight) { return 3; }
                else { return 2; }
            })
            .attr("fill", function(d) { return colorScale(d.country); })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

        var countryText = svg.append("text")
            .attr("fill", function () { return colorScale(countryData.data[0].country); })
            .attr("class", "label-country")
            .style("opacity", function() {
                if (countryData.data[0].country == chart.highlight || countryData.data[0].country == "Canada") { return 0.8; }
                else { return 0.5; }
            })
            .style("font-size", function() {
                if (countryData.data[0].country == chart.highlight) { return "12px"; }
                else { return null; }
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
