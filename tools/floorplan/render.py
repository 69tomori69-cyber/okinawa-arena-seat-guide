import cv2, numpy as np, sys
from polys import *
from load import load
S=2  # 出力の倍率
def poly_mask(shape, pts):
    m=np.zeros(shape[:2],np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],255); return m

def _g1():
    """1Fの図面を、ほかの階と同じ枠で切り出した白黒画像"""
    im=load(1); im=cv2.copyMakeBorder(im,75,0,0,0,cv2.BORDER_CONSTANT,value=(255,255,255))
    x0,y0,w,h=FRAME
    return cv2.cvtColor(im[y0:y0+h,x0:x0+w],cv2.COLOR_BGR2GRAY)

def keep_boxes(g1):
    """残す文字（トイレ・授乳室・階段）の場所。1Fの図面から切り出した文字の形で探す"""
    T={'toi':(g1[506:520,336:358],0.78,(-40,-3,50,17)),
       'kai':(g1[523:534,50:67],0.8,(-3,-3,40,14)),
       'jun':(g1[1072:1083,767:792],0.8,(-3,-3,30,25))}
    return T

def find_keep(g, T):
    boxes=[]
    for t,thr,(a,b,c,d) in T.values():
        res=cv2.matchTemplate(g,t,cv2.TM_CCOEFF_NORMED)
        ys,xs=np.where(res>thr)
        for x,y in zip(xs,ys): boxes.append((x+a,y+b,x+c,y+d))
    return boxes

def text_mask(g, bowl1, boxes):
    """文字（電気室・SS などの書き込み）を見つける。客席の中と、残す文字の所は除く。
    文字は「太さのある小さな形」が横に2つ以上並んだもの。細い線（壁や点線）は消さない"""
    ink=(g<200).astype(np.uint8)
    # 文字から伸びる引き出し線（長い縦線・横線）を外して、文字だけを切り離す
    lines=cv2.morphologyEx(ink,cv2.MORPH_OPEN,np.ones((1,21),np.uint8))|cv2.morphologyEx(ink,cv2.MORPH_OPEN,np.ones((21,1),np.uint8))
    rest=ink&(1-lines)
    n,lab,st,_=cv2.connectedComponentsWithStats(rest,8)
    ok=np.zeros(n,np.uint8)
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if 4<=h<=15 and w<=16 and min(w,h)>=3 and a>=5: ok[i]=1
        elif 6<=h<=15 and 16<w<=80 and a/(w*h)>0.2: ok[i]=2    # くっついた文字列
        elif 5<=h<=14 and w<=4: ok[i]=3                          # 「1」「(」「)」など細い文字
    glyph=(ok[lab]>0).astype(np.uint8)
    thick=((ok[lab]>0)&(ok[lab]!=3)).astype(np.uint8)
    word=(ok[lab]==2)
    near=cv2.dilate(glyph,np.ones((3,13),np.uint8))
    n2,lab2,st2,_=cv2.connectedComponentsWithStats(near,8)
    m=np.zeros_like(ink)
    for i in range(1,n2):
        x,y,w,h,a=st2[i]
        sub=lab2[y:y+h,x:x+w]==i
        k=len(set(np.unique(lab[y:y+h,x:x+w][sub&(thick[y:y+h,x:x+w]>0)])))
        if k>=2 or word[y:y+h,x:x+w][sub].any():
            m[y:y+h,x:x+w][sub]=1
    m=m&glyph
    m[bowl1>0]=0
    for (x0,y0,x1,y1) in boxes: m[max(0,y0):y1,max(0,x0):x1]=0
    return cv2.dilate(m,np.ones((3,3),np.uint8))

def seat_cells(g, bowl):
    """客席の図形のうち、線で囲まれた小さな四角（1席ぶん）を見つける"""
    ink=(g<200).astype(np.uint8)
    free=(1-ink)
    n,lab,st,_=cv2.connectedComponentsWithStats(free,4)
    hit=np.zeros(n,np.uint8)
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if 6*S*S<=a<=110*S*S and max(w,h)<=16*S and min(w,h)>=2*S: hit[i]=1
    m=hit[lab]
    # 1Fの折りたたみ椅子のように、小さな四角の中に×が描かれた席は、四角ごと塗る
    n,lab,st,_=cv2.connectedComponentsWithStats(ink,8)
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if 3*S<=min(w,h) and max(w,h)<=7*S and a>=0.4*w*h: m[y:y+h,x:x+w]=1
    m[bowl==0]=0
    return m

def render(n, out, T):
    im=load(n)
    if n<=2:  # 1F・2Fの図面は75ピクセル下にずらして、3F〜5Fと柱の位置をそろえる
        im=cv2.copyMakeBorder(im,75,0,0,0,cv2.BORDER_CONSTANT,value=(255,255,255))
    if n==5:  # 5Fの図面は柱が左に2・上に2ピクセルずれている
        im=cv2.warpAffine(im,np.float32([[1,0,-2],[0,1,2]]),(im.shape[1],im.shape[0]),borderValue=(255,255,255))
    x0,y0,w,h=FRAME
    im=im[y0:y0+h, x0:x0+w]
    sh=lambda pts:[(x-x0,y-y0) for x,y in pts]
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    # 文字を消す（トイレ・授乳室・階段は残す）
    bowl1=poly_mask(g.shape, sh(BOWL[n]))
    g[text_mask(g, bowl1, find_keep(g, T))>0]=255
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
    # 客席：1席ずつ、線で囲まれた四角を塗る
    seat=seat_cells(g, bowl)
    cx0,cy0,cx1,cy1=[v*S for v in ((APRON[0]-x0),(APRON[1]-y0),(APRON[2]-x0),(APRON[3]-y0))]
    seat[cy0:cy1,cx0:cx1]=0
    for (ax,ay,bx,by) in NOSEAT[n]:
        seat[(ay-y0)*S:(by-y0)*S,(ax-x0)*S:(bx-x0)*S]=0
    H,W=g.shape
    col=np.zeros((H,W,3),np.float32)
    def fill(mask,bgr):
        col[mask>0]=bgr
    col[:]=(225,229,233)          # 床（明るいグレー）BGR
    fill(seat,(110,58,31))        # 客席：紺（1席ずつ）
    # コート
    a0,b0,a1,b1=cx0,cy0,cx1,cy1
    col[b0:b1,a0:a1]=(115,63,35)  # コートの周り：紺
    k0,l0,k1,l1=[v*S for v in ((COURT[0]-x0),(COURT[1]-y0),(COURT[2]-x0),(COURT[3]-y0))]
    col[l0:l1,k0:k1]=(141,192,227)  # 木の床
    fill(wall,(75,40,20))
    # 線を重ねる
    lc=np.zeros_like(col)
    lc[:]=(150,140,130)
    lc[(bowl>0)&(cv2.dilate(seat,np.ones((3,3),np.uint8))>0)]=(205,160,120)  # 客席の線は明るい青
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
    T=keep_boxes(_g1())
    for n in [1,2,4,5]:
        render(n,'r%d.png'%n,T)
        Image.open('r%d.png'%n).save('../../assets/floors/%df.webp'%n,'WEBP',quality=82,method=6)
