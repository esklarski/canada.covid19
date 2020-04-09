
path = '../../data/'


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

def processDate(date):
  print(date)
  df = pd.read_csv(path + date + ".csv")

  if 'Country/Region' in df:
    df = df.rename(columns={
      'Country/Region': 'Country_Region',
      'Province/State': 'Province_State'
    })

  df = df[ df['Province_State'].str.contains('Diamond Princess') != True ]
  df = df[ df['Province_State'].str.contains('Grand Princess') != True ]

  df = df.apply( translateState, axis=1 )

  stateData = df.groupby(['Country_Region', 'Province_State']).agg('sum').reset_index()
  stateData = stateData[ stateData["Country_Region"] == "Canada" ]

  countrydata = df.groupby(['Country_Region']).agg('sum').reset_index()
  countrydata['Province_State'] = ""

  df = stateData.append( countrydata )
  if 'Active' not in df:
    df['Active'] = df['Confirmed'] - df['Recovered'] - df['Deaths']
  df = df[ ["Country_Region", "Province_State", "Confirmed", "Recovered", "Active", "Deaths"] ] 
  df["Date"] = date

  return df



import pandas as pd
import os

df = pd.DataFrame()
files = os.listdir(path)
files.sort()
for filename in files:
  if not filename.endswith(".csv"): continue
  date = filename[0:10]

  df = df.append(processDate(date))


# == replace country name to match population ==
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

# == Fix state names ==
stateReplacement = {
  "United States Virgin Islands": "Virgin Islands"
}

for key in stateReplacement:
  old = key
  new = stateReplacement[key]
  df["Province_State"] = df["Province_State"].replace(old, new)

# == Remove 'Recovered' province entry ==
entryRemoval = {
  "Recovered": "Recovered",
}

for key in entryRemoval:
  df = df[ df['Province_State'].str.contains(entryRemoval[key]) != True ]

# == Add Population ==
df = df.astype({"Confirmed": "int32", "Recovered": "int32", "Active": "int32", "Deaths": "int32"})

#print(df)
df.to_csv('jhu-data-delta.csv', index=False)
