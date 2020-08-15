########## == Covid19Canada data location == ##########
cases_file        = '../../Covid19Canada/timeseries_prov/cases_timeseries_prov.csv'
recoveries_file   = '../../Covid19Canada/timeseries_prov/recovered_timeseries_prov.csv'
mortality_file    = '../../Covid19Canada/timeseries_prov/mortality_timeseries_prov.csv'
canada_cases      = '../../Covid19Canada/timeseries_canada/cases_timeseries_canada.csv'
canada_recoveries = '../../Covid19Canada/timeseries_canada/recovered_timeseries_canada.csv'
canada_mortality  = '../../Covid19Canada/timeseries_canada/mortality_timeseries_canada.csv'


########## == province_state translation dictionary == ##########
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



########## == main process == ##########
import pandas as pd
import os
import time

## start time
startTime = time.time()

## translate province names to JHU names
def translateProv(row):
    state = str(row["province"]).strip()
    if state in stateDict:
        row["province"] = stateDict[state]

    return row

## translate date
def translateDate(row):
    temp = str(row["date"]).strip().split("-")
    row["date"] = temp[1] + "-" + temp[0] + "-" + temp[2]

    return row

## add recovered and calc active
def modData(row):
    row['Active'] = row['Confirmed'] - row['Recovered'] - row['Deaths']

    return row



########## == create DataFrame == ##########
df = pd.DataFrame(columns = ['Country_Region','Province_State','Confirmed','Recovered','Active','Deaths','Date'])
df = df.astype({"Confirmed": "int32", "Recovered": "int32", "Active": "int32", "Deaths": "int32"})



########## == read in province data files == ##########
print("parsing prov/territory data")

cf = pd.read_csv(cases_file)
rf = pd.read_csv(recoveries_file)
mf = pd.read_csv(mortality_file)

## rename date column
rf = rf.rename( columns = {'date_recovered':'date'} )
cf = cf.rename( columns = {'date_report':'date'} )
mf = mf.rename( columns = {'date_death_report':'date'} )

## deal with invalid entries (0), convert to int
cf['cumulative_cases']     = cf['cumulative_cases'].fillna(0)
rf['cumulative_recovered'] = rf['cumulative_recovered'].fillna(0)
mf['cumulative_deaths']    = mf['cumulative_deaths'].fillna(0)

cf['cumulative_cases']     = cf['cumulative_cases'].round(decimals=0).astype(int)
rf['cumulative_recovered'] = rf['cumulative_recovered'].round(decimals=0).astype(int)
mf['cumulative_deaths']    = mf['cumulative_deaths'].round(decimals=0).astype(int)

## apply date and name transforms
cf = cf.apply( translateDate, axis=1 )
cf = cf.apply( translateProv, axis=1 )

rf = rf.apply( translateDate, axis=1 )
rf = rf.apply( translateProv, axis=1 )

mf = mf.apply( translateDate, axis=1 )
mf = mf.apply( translateProv, axis=1 )



########## == populate DataFrame == ##########
print("merging province data")

## == track current province being added
currentProvince = ''

## populate DataFrame with provincial data
for row in cf.iterrows():
    date = row[1]['date']
    province = row[1]['province']

    if province != currentProvince:
        currentProvince = province
        print("Processing: " + currentProvince)

    confirmed = row[1]['cumulative_cases']
    
    if province == 'Repatriated' or confirmed <= 0:
        continue
    
    rIndex = rf.loc[ (rf['date'] == date) & (rf['province'] == province) ]['cumulative_recovered']
    if rIndex.size == 0:
        recovered = 0
    else:
        recovered = rIndex.values[0]

    mIndex = mf.loc[ (mf['date'] == date) & (mf['province'] == province) ]['cumulative_deaths']
    if mIndex.size == 0:
        deaths = 0
    else:
        deaths = mIndex.values[0]

    ## create new row
    temp_row = { 'Country_Region':'Canada', 'Province_State':province,
                 'Confirmed':confirmed, 'Recovered':recovered, 'Active':0,
                 'Deaths':deaths, 'Date':date }
    temp_row = modData(temp_row)

    ## append row to DataFrame
    df = df.append(temp_row, ignore_index=True )



########## == read in Canada data files == ##########
print("parsing canada data")

CanC = pd.read_csv(canada_cases)
CanR = pd.read_csv(canada_recoveries)
CanM = pd.read_csv(canada_mortality)

## rename date columns
CanC = CanC.rename( columns = {'date_report':'date'} )
CanR = CanR.rename( columns = {'date_recovered':'date'} )
CanM = CanM.rename( columns = {'date_death_report':'date'} )

## deal with invalid entries (0), convert to int
CanC['cumulative_cases']     = CanC['cumulative_cases'].fillna(0)
CanR['cumulative_recovered'] = CanR['cumulative_recovered'].fillna(0)
CanM['cumulative_deaths']    = CanM['cumulative_deaths'].fillna(0)

CanC['cumulative_cases']     = CanC['cumulative_cases'].round(decimals=0).astype(int)
CanR['cumulative_recovered'] = CanR['cumulative_recovered'].round(decimals=0).astype(int)
CanM['cumulative_deaths']    = CanM['cumulative_deaths'].round(decimals=0).astype(int)

## apply date transform
CanC = CanC.apply( translateDate, axis=1 )
CanR = CanR.apply( translateDate, axis=1 )
CanM = CanM.apply( translateDate, axis=1 )

## populate DataFrame
for row in CanC.iterrows():
    date = row[1]['date']

    confirmed = row[1]['cumulative_cases']

    rIndex = CanR.loc[ CanR['date'] == date ]['cumulative_recovered']
    if rIndex.size == 0:
        recovered = 0
    else:
        recovered = rIndex.values[0]

    mIndex = CanM.loc[ CanM['date'] == date ]['cumulative_deaths']
    if mIndex.size == 0:
        deaths = 0
    else:
        deaths = mIndex.values[0]

    ## == create new row == ##
    temp_row = { 'Country_Region':'Canada', 'Province_State':'Canada',
                 'Confirmed':confirmed, 'Recovered':recovered, 'Active':0,
                 'Deaths':deaths, 'Date':date }
    temp_row = modData(temp_row)

    ## == append row to DataFrame == ##
    df = df.append(temp_row, ignore_index=True )



########## == calc 'Mortality' rate data == ##########
print("calculating mortality rate")

df.insert(6, 'Mortality', '')
df['Mortality'] = ( df['Deaths'] / df['Confirmed'] ) * 100
df['Mortality'] = df['Mortality'].round(decimals=2).astype(float)



########## == sort rows by date, province == ##########
print("sorting...")

df = df.sort_values(by=['Date', 'Province_State'])



########## == write final file == ##########
print("writing output")

df.to_csv('odwg-data.csv', index=False)



########## == completion == ##########
completionTime = time.time()
elapsedTime = completionTime - startTime
print("Done! " + str("%5.2f" % (elapsedTime)) + "s elapsed.")
