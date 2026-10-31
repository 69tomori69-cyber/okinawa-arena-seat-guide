import numpy as np
PDF=np.array([[1646,390],[1644,1339.5],[281.5,400],[277.5,1344.5]],float)
PLAN=np.array([[1143.1,949],[637.5,949],[1143.1,211],[637.5,211]],float)
X=np.hstack([PDF,np.ones((4,1))]); M=np.linalg.lstsq(X,PLAN,rcond=None)[0].T
def Mfloor(n):
    m=M.copy()
    if n<=2: m[1,2]-=75   # 1F・2Fの図面は柱が75px上に描かれている
    return m
