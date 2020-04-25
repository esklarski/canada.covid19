## == define Canada 'Recoveries' data location == ##
# path_recoveries = '../../../Covid19Canada/'
recoveries_file = '../../Covid19Canada/recovered_cumulative.csv'

## == define JHU data location == ##
path_JHUdata = '../../COVID-19/csse_covid_19_data/csse_covid_19_daily_reports/'


## == province_state translation == ##
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



###### == ========================= JHU data ============================== == ######
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

  # group and sum provincial data
  stateData = df.groupby(['Country_Region', 'Province_State']).agg('sum').reset_index()

  # group and sum country data, set province_state as empty
  countrydata = df.groupby(['Country_Region']).agg('sum').reset_index()
  countrydata['Province_State'] = ""

  # copy Canada entry, add "Canada" as province_state
  canada = countrydata.copy()
  canada = countrydata.groupby(['Country_Region']).agg('sum').reset_index()
  canada = canada[ canada["Country_Region"] == "Canada" ]
  canada['Province_State'] = "Canada"

  # append Canada to province_state list
  stateData = stateData.append(canada, sort=True)

  # select canadian rows
  stateData = stateData[ stateData["Country_Region"] == "Canada" ]

  # append country data to state data
  df = stateData.append(countrydata, sort=True)

  # calculate 'active' cases if not provided
  if 'Active' not in df:
    df['Active'] = df['Confirmed'] - df['Recovered'] - df['Deaths']
  else:
    for value in df['Active']:
      if value <= "0" or value == "":
        df['Active'] = df['Confirmed'] - df['Recovered'] - df['Deaths']
      else:
        continue

  # select only columns used for website
  df = df[ ["Country_Region", "Province_State", "Confirmed", "Recovered", "Active", "Deaths"] ]

  # set date of current data
  df["Date"] = date

  return df


## == main process == ##
import pandas as pd
import os
import time

# create output storage variable
df = pd.DataFrame()

# pull in files and sort
files = os.listdir(path_JHUdata)
files.sort()

startJHU = time.time()

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
# stateReplacement = {
#   "United States Virgin Islands": "Virgin Islands"
# }

# for key in stateReplacement:
#   old = key
#   new = stateReplacement[key]
#   df["Province_State"] = df["Province_State"].replace(old, new)


## == Remove 'Recovered' province entry == ##
entryRemoval = {
  "Recovered": "Recovered",
}

for key in entryRemoval:
  df = df[ df['Province_State'].str.contains(entryRemoval[key]) != True ]


## == define entry types == ##
df = df.astype({"Confirmed": "int32", "Recovered": "int32", "Active": "int32", "Deaths": "int32"})


## == print(df) to file == ##
temp_file = 'jhu-data-temp.csv'
df.to_csv(temp_file, index=False)

endJHU = time.time()
elapsedJHU = endJHU - startJHU
print(str("%5.2f" % (elapsedJHU))+ "s elapsed")



###### == ================= Canada 'Recoveries' data ====================== == ######
## == translate province names to JHU names == ##

startRecv = time.time()

def translateRecoveryProv(row):
  state = str(row["province"]).strip()
  if state in stateDict:
    row["province"] = stateDict[state]

  return row


## == correct date format == ##
def translateDate(row):
  temp = str(row["date_recovered"]).strip().split("-")
  row["date_recovered"] = temp[1] + "-" + temp[0] + "-" + temp[2]

  return row


## == add recovered and calc active == ##
def modData(row):
  row['Recovered'] = recovered
  row['Active'] = row['Confirmed'] - row['Recovered'] - row['Deaths']

  return row


## == read in recoveries file == ##
print("parsing recoveries data")
rf = pd.read_csv(recoveries_file)

## == deal with invalid entries (0), convert to int == ##
rf['cumulative_recovered'] = rf['cumulative_recovered'].fillna(0)
rf['cumulative_recovered'] = rf['cumulative_recovered'].round(decimals=0).astype(int)

## == apply date and name transforms == ##
rf = rf.apply( translateDate, axis=1 )
rf = rf.apply( translateRecoveryProv, axis=1 )

## == bring in jhu-data again == ##
print("merging datasets")
df = pd.read_csv(temp_file)

for row in rf.iterrows():
  ## == gather data from file == ##
  date = row[1]['date_recovered']
  province = row[1]['province']

  ## == find index of matching line in JHU data == ##
  index = df.index[ (df["Date"] == date) & (df["Province_State"] == province) ]

  ## == ignore empty indexes: == ##
  if df.loc[index].empty:
    continue
  else:
    recovered = row[1]['cumulative_recovered']
    df.loc[index] = modData(df.loc[index])

## == write final file == ##
df.to_csv('merged-data.csv', index=False)


## == remove temp file == ##
if os.path.isfile(temp_file):
    os.remove(temp_file)
else:  ## Show an error ##
    print("Error: %s file not found" % temp_file)

print("Done!")
endRecv = time.time()
elapsedRecv = endRecv - startRecv
print(str("%5.2f" % (elapsedRecv))+ "s elapsed")

totalTime = elapsedJHU + elapsedRecv
print(str("%5.2f" % (totalTime)) + "s total")