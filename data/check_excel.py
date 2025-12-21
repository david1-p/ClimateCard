import pandas as pd

try:
    df = pd.read_excel('../1._기후동행카드_적용_노선_전체_목록(버스_및_지하철).xlsx')
    print("Columns:", df.columns.tolist())
    print(df.head(3))
except Exception as e:
    print(e)
