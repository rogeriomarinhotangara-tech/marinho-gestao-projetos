import json, sys, datetime as dt
import pandas as pd
pd.set_option('display.width',300); pd.set_option('display.max_colwidth',60); pd.set_option('display.max_rows',600)
raw = json.load(open(sys.argv[1]))
cols = raw['cols']; dic = raw['dic']
df = pd.DataFrame(raw['rows'], columns=cols)
d0 = dt.date(2026,1,1)
for k in ['cat','grp','uni','met','cta','part','srv','rsp','blo']:
    df[k] = df[k].map(lambda i, k=k: dic[k][i] if i is not None else None)
for k in ['de','dv','dp']:
    df[k+'_d'] = df[k].map(lambda n: d0+dt.timedelta(days=int(n)) if n==n and n is not None else None)
df['mv'] = df['dv_d'].map(lambda d: d.strftime('%Y-%m') if d else None)
df['me'] = df['de_d'].map(lambda d: d.strftime('%Y-%m') if d else None)
df.to_pickle(sys.argv[2])
print(df.groupby(['mv','t'])['v'].agg(['sum','count']).unstack())
print(df.groupby(['me','t'])['v'].agg(['sum','count']).unstack())
# trichology
tri = df[df['desc'].str.contains('TRICO|TROCO|PATRIC|CAPILAR|FABRINI', case=False, na=False) | df['part'].str.contains('TRICO|TROCO', case=False, na=False) | df['srv'].str.contains('TRICO|CAPILAR', case=False, na=False)]
print(tri[['t','de_d','dv_d','dp_d','v','cat','grp','cod','blo','desc','uni','cta']].to_string())
print(sorted(df['cod'].unique()))
