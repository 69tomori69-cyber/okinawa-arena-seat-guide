import numpy as np, cv2
def load(n):
    im=cv2.imread('p%d.png'%n, cv2.IMREAD_UNCHANGED)
    if im.shape[2]==4:
        a=im[:,:,3:4]/255.0; im=(im[:,:,:3]*a+255*(1-a)).astype(np.uint8)
    return im
