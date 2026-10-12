







      $SP,"<1>",BI=1$









I64 glbl_r[4][4];

U0 DrawIt(CTask *,CDC *dc)
{
  I64 *old_r=dc->r;
  dc->x=200;
  dc->y=200;
  dc->z=GR_Z_ALL;
  dc->flags|=DCF_TRANSFORMATION;
  DCDepthBufAlloc(dc);
  DCMat4x4Set(dc,glbl_r); //This assigns to dc->r and sets r_norm.
  DCDepthBufRst(dc);
  Sprite3(dc,0,0,0,$IB,"<1>",BI=1$);
  dc->r=old_r;
}

U0 SpritePlot3D()
{
  F64 é=0,è=0;

  SettingsPush; //See $LK,"SettingsPush",A="MN:SettingsPush"$
  Fs->draw_it=&DrawIt;
  while (!ScanChar) {
    Mat4x4IdentEqu(glbl_r);
    Mat4x4RotX(glbl_r,è);
    Mat4x4RotZ(glbl_r,é);

    Sleep(40);
    é+=2*ã/100;
    è+=2*ã/130;
  }
  SettingsPop;
}

SpritePlot3D;
