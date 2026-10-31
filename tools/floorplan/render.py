import cv2, numpy as np, sys
from polys import *
from load import load
S=2  # 出力の倍率
def poly_mask(shape, pts):
    m=np.zeros(shape[:2],np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],255); return m

def render(n, out):
    im=load(n)
    if n<=2:  # 1F・2Fの図面は75ピクセル下にずらして、3F〜5Fと柱の位置をそろえる
        im=cv2.copyMakeBorder(im,75,0,0,0,cv2.BORDER_CONSTANT,value=(255,255,255))
    x0,y0,w,h=FRAME
    im=im[y0:y0+h, x0:x0+w]
    sh=lambda pts:[(x-x0,y-y0) for x,y in pts]
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    # upscale
    g=cv2.resize(g,(w*S,h*S),interpolation=cv2.INTER_CUBIC)
    scale=lambda pts:[(x*S,y*S) for x,y in pts]
    foot=poly_mask(g.shape, scale(sh(FOOT[n])))
    bowl=poly_mask(g.shape, scale(sh(BOWL[n])))
    ink=np.clip((235-g.astype(np.float32))/170,0,1)   # 線の濃さ 0..1
    line=(g<170).astype(np.uint8)
    # 濃いグレーの塗り（構造壁・柱）
    wall=((g>60)&(g<140)).astype(np.uint8)
    wall=cv2.morphologyEx(wall,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    # 客席：線が密集しているところ
    dens=cv2.blur(line.astype(np.float32),(13*S,13*S))
    seat=((dens>0.16)&(bowl>0)).astype(np.uint8)
    seat=cv2.morphologyEx(seat,cv2.MORPH_CLOSE,np.ones((5*S,5*S),np.uint8))
    seat=cv2.morphologyEx(seat,cv2.MORPH_OPEN,np.ones((7*S,7*S),np.uint8))
    cx0,cy0,cx1,cy1=[v*S for v in ((APRON[0]-x0),(APRON[1]-y0),(APRON[2]-x0),(APRON[3]-y0))]
    seat[cy0:cy1,cx0:cx1]=0
    for (ax,ay,bx,by) in NOSEAT[n]:
        seat[(ay-y0)*S:(by-y0)*S,(ax-x0)*S:(bx-x0)*S]=0
    H,W=g.shape
    col=np.zeros((H,W,3),np.float32)
    def fill(mask,bgr):
        col[mask>0]=bgr
    col[:]=(225,229,233)          # 床（明るいグレー）BGR
    fill(seat,(110,58,31))        # 客席：紺
    # コート
    a0,b0,a1,b1=cx0,cy0,cx1,cy1
    col[b0:b1,a0:a1]=(115,63,35)  # コートの周り：紺
    k0,l0,k1,l1=[v*S for v in ((COURT[0]-x0),(COURT[1]-y0),(COURT[2]-x0),(COURT[3]-y0))]
    col[l0:l1,k0:k1]=(141,192,227)  # 木の床
    fill(wall,(75,40,20))
    # 線を重ねる
    lc=np.zeros_like(col)
    lc[:]=(150,140,130)
    lc[seat>0]=(205,160,120)                      # 客席の線は明るい青
    lc[l0:l1,k0:k1]=(255,255,255)                 # コートの線は白
    a=ink[...,None]*0.85
    a[wall>0]=0
    col=col*(1-a)+lc*a
    # 外側は透明、建物の縁に影と線
    alpha=foot.astype(np.float32)/255
    rgba=np.dstack([col,alpha*255]).astype(np.uint8)
    edge=cv2.morphologyEx(foot,cv2.MORPH_GRADIENT,np.ones((3*S,3*S),np.uint8))
    rgba[edge>0]=(80,60,50,255)
    # 影
    shadow=cv2.GaussianBlur(foot,(0,0),8*S)
    shadow=np.roll(np.roll(shadow,6*S,0),4*S,1)
    out_im=np.zeros_like(rgba); out_im[...,3]=(shadow*0.25).astype(np.uint8); out_im[...,:3]=(60,40,20)
    m=rgba[...,3:4]/255.0
    comp=out_im.astype(np.float32); comp[...,:3]=comp[...,:3]*(1-m)+rgba[...,:3]*m; comp[...,3]=np.maximum(comp[...,3],rgba[...,3])
    cv2.imwrite(out, comp.astype(np.uint8))
if __name__=='__main__':
    from PIL import Image
    for n in [2,4]:
        render(n,'r%d.png'%n)
        Image.open('r%d.png'%n).save('../../assets/floors/%df.webp'%n,'WEBP',quality=82,method=6)
