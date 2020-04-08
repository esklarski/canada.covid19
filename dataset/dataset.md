# Dataset generation
This part is a slight mystery to me as I do not know any Python code. It seems straightforward enough.

I want to implement this function in Rust, but that's for another time.


### Initial Process
1) download daily report dataset from JHU repository
2) run processData.py (ensure the path is set correctly)
3) get a .csv file that contains the data for vis.js
    3a) *rename to jhu-data.csv for vis.js*

### My Daily Process
1) download latest daily report
2) run processData.py on single file
3) get jhu-data-delta.csv
4) copy + paste to jhu-data.csv