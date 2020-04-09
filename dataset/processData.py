## == define JHU data location == ##
path = '../../data/'


## == province_state translation == ##
stateTranslation = [
  # ['Alberta', 'AB'],
  # ['British Columbia', 'BC'],
  # ['Manitoba', 'MB'],
  # ['New Brunswick', 'NB'],
  # ['Newfoundland and Labrador', 'NL'],
  # ['Northwest Territories', 'NT'],
  # ['Nova Scotia', 'NS'],
  # ['Nunavut', 'NU'],
  ['Ontario', 'ON'],
  # ['Prince Edward Island', 'PE'],
  ['Quebec', 'QC'],
  # ['Saskatchewan', 'SK'],
  # ['Yukon', 'YT'],
]

stateDict = {}

for el in stateTranslation:
  stateDict[ el[1] ] = el[0]


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


## == process file == ##
def processDate(date):
  print(date)

  # read file
  df = pd.read_csv(path + date + ".csv")

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

  # group and sum provincial data
  stateData = df.groupby(['Country_Region', 'Province_State']).agg('sum').reset_index()
  stateData = stateData[ stateData["Country_Region"] == "Canada" ]

  # group and sum country data
  countrydata = df.groupby(['Country_Region']).agg('sum').reset_index()
  countrydata['Province_State'] = ""

  # append country data to state data
  df = stateData.append( countrydata )

  # calculate 'active' cases if not provided
  if 'Active' not in df:
    df['Active'] = df['Confirmed'] - df['Recovered'] - df['Deaths']

  # ? add column names ?
  df = df[ ["Country_Region", "Province_State", "Confirmed", "Recovered", "Active", "Deaths"] ] 
  df["Date"] = date

  return df


## == main process == ##
import pandas as pd
import os

# create output storage variable
df = pd.DataFrame()

# pull in files and sort
files = os.listdir(path)
files.sort()

for filename in files:
  # only take .csv files
  if not filename.endswith(".csv"): continue

  # grab file date from file name
  date = filename[0:10]

  # process and append file to output
  df = df.append(processDate(date))


## == replace country name to match population == ##
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


## == Fix state names == ##
stateReplacement = {
  "United States Virgin Islands": "Virgin Islands"
}

for key in stateReplacement:
  old = key
  new = stateReplacement[key]
  df["Province_State"] = df["Province_State"].replace(old, new)


## == Remove 'Recovered' province entry == ##
entryRemoval = {
  "Recovered": "Recovered",
}

for key in entryRemoval:
  df = df[ df['Province_State'].str.contains(entryRemoval[key]) != True ]


## == Add Population == ##
df = df.astype({"Confirmed": "int32", "Recovered": "int32", "Active": "int32", "Deaths": "int32"})


## == print(df) to file == ##
df.to_csv('jhu-data-delta.csv', index=False)
