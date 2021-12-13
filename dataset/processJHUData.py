## == JHU data location == ##
path_JHUdata = '../../COVID-19/csse_covid_19_data/csse_covid_19_daily_reports/'


## == province_state translation dictionary == ##
stateTranslation = [
    # ['Alberta', 'AB'],
    ['British Columbia', 'BC'],
    # ['Manitoba', 'MB'],
    # ['New Brunswick', 'NB'],
    ['Newfoundland and Labrador', 'NL'],
    ['Northwest Territories', 'NWT'],
    # ['Nova Scotia', 'NS'],
    # ['Nunavut', 'NU'],
    ['Ontario', 'ON'],
    ['Prince Edward Island', 'PEI'],
    ['Quebec', 'QC'],
    # ['Saskatchewan', 'SK'],
    # ['Yukon', 'YT'],
]

stateDict = {}

for el in stateTranslation:
    stateDict[ el[1] ] = el[0]

months = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December'
}

# monthDict = {}

# for month in months:
#     monthDict[ month[1] ] = month[0]

## == translate inconsistent provine_state names == ##
def translateState(row):
    state = str(row["Province_State"]).strip()
    if ("," in state):
        if state == "Calgary, Alberta" or state == "Edmonton, Alberta":
            row["Province_State"] = "Alberta"
        else:
            stateCode = state[-2:]
            if stateCode in stateDict:
                row["Province_State"] = stateDict[stateCode]

    return row


currentMonth = ''
## == process file == ##
def processDate(date):
    global currentMonth

    if currentMonth != date[0:2]:
        currentMonth = date[0:2]
        print("Processing: " + months[ currentMonth ])

    # read file
    df = pd.read_csv(path_JHUdata + date + ".csv")

    # rename column headings for consistency
    if 'Country/Region' in df:
        df = df.rename(columns={
        'Country/Region': 'Country_Region',
        'Province/State': 'Province_State'
        })

    # remove cruise ship entries
    df = df[ df['Province_State'].str.contains('Diamond Princess') != True ]
    df = df[ df['Province_State'].str.contains('Grand Princess') != True ]

    # translate province_state names
    df = df.apply( translateState, axis=1 )

    # group and sum country data, set province_state as empty
    countrydata = df.groupby(['Country_Region']).agg('sum').reset_index()
    countrydata['Province_State'] = ""

    df = countrydata.sort_values(by='Country_Region')

    # calculate 'active' cases if not provided
    if 'Active' not in df:
        df['Active'] = df['Confirmed'] - df['Recovered'] - df['Deaths']
    else:
        for value in df['Active']:
            if value <= 0 or value == "":
                df['Active'] = df['Confirmed'] - df['Recovered'] - df['Deaths']
            else:
                continue

    # select only columns used for website
    df = df[ ["Country_Region", "Province_State", "Confirmed", "Recovered", "Active", "Deaths"] ]

    # set date of current data
    df["Date"] = datetime.strptime(date, '%m-%d-%Y')

    return df


## == main process == ##
import pandas as pd
import os
import time
from datetime import datetime

# start time
startTime = time.time()

# create output storage variable
df = pd.DataFrame()

# pull in files and sort
files = os.listdir(path_JHUdata)
files.sort()

print("Processing JHU data")

for filename in files:
    # only take .csv files
    if not filename.endswith(".csv"): continue

    # grab file date from file name
    date = filename[0:10]

    # process and append file to output
    df = df.append(processDate(date))

# replace country name to match population
countryReplacement = {
    "US": "United States",
    "Korea, South": "South Korea",
    "Taiwan*": "Taiwan",
    "Bahamas, The": "Bahamas",
    "The Bahamas": "Bahamas",
    "Gambia, The": "Gambia",
    "The Gambia": "Gambia",
    "Cabo Verde": "Cape Verde",
    "Mainland China": "China",
    "Iran (Islamic Republic of)": "Iran",
    "Republic of Korea": "South Korea",
    "UK": "United Kingdom",
    "Vatican City": "Holy See",
    "Hong Kong SAR": "Hong Kong",
    "Macao SAR": "Macao",
    "Russian Federation": "Russia",
    "St. Martin": "Saint Martin",
    " Azerbaijan": "Azerbaijan",
    "Republic of Ireland": "Ireland",
    "Viet Nam": "Vietnam",
    "Congo (Brazzaville)": "Republic of the Congo",
    "Czech Republic": "Czechia",
    "Republic of Moldova": "Moldova",
}

for key in countryReplacement:
    old = key
    new = countryReplacement[key]
    df["Country_Region"] = df["Country_Region"].replace(old, new)

# Remove 'Recovered' province entry
entryRemoval = {
    "Recovered": "Recovered",
}

for key in entryRemoval:
    df = df[ df['Province_State'].str.contains(entryRemoval[key]) != True ]

# define entry types
df = df.astype({"Confirmed": "int32", "Recovered": "int32", "Active": "int32", "Deaths": "int32"})

## == Calc 'Mortality' rate data == ##
print("calculating mortality rate")
df.insert(6, 'Mortality', '')
df['Mortality'] = ( df['Deaths'] / df['Confirmed'] ) * 100
df['Mortality'] = df['Mortality'].round(decimals=2).astype(float)

## == Sort and format dates == ##
df = df.sort_values(by=['Date', 'Country_Region'])
df['Date'] = df['Date'].dt.strftime('%m-%d-%Y')

## == write final file == ##
print("writing file")
df.to_csv('jhu-data.csv', index=False)

## == wrap up messages == ##
endTime = time.time()
print("Done!")
print( str("%5.2f" % (endTime - startTime)) + "s elapsed" )
