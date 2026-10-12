/*Add an outline to Sprites and
print them to the cmd line.  They
can be cut/pasted from there.
*/
$SP,"<1>",BI=1$


$SP,"<2>",BI=2$



$SP,"<3>",BI=3$



$SP,"<4>",BI=4$



$SP,"<5>",BI=5$



$SP,"<6>",BI=6$



$SP,"<7>",BI=7$


$SP,"<8>",BI=8$



$SP,"<9>",BI=9$



$SP,"<10>",BI=10$



$SP,"<11>",BI=11$



$SP,"<12>",BI=12$



#define NUM	12

U8 *in_img[NUM]={$IB,"<1>",BI=1$,$IB,"<2>",BI=2$,$IB,"<3>",BI=3$,$IB,"<4>",BI=4$,$IB,"<5>",BI=5$,$IB,"<6>",BI=6$,$IB,"<7>",BI=7$,$IB,"<8>",BI=8$,$IB,"<9>",BI=9$,$IB,"<10>",BI=10$,$IB,"<11>",BI=11$,$IB,"<12>",BI=12$};

U0 OutLine()
{
  I64 n,minx,maxx,miny,maxy,w,h,i,j,k,c;
  U8 *out_img;
  CDC *dc;
  for (n=0;n<NUM;n++) {
    SpriteExtents(in_img[n],&minx,&maxx,&miny,&maxy);
    w=maxx-minx+1+2;
    h=maxy-miny+1+2;
    dc=DCNew(w,h);
    dc->color=TRANSPARENT;
    GrRect(dc,0,0,w,h);
    Sprite3(dc,-minx+1,-miny+1,0,in_img[n]);

    for (i=0;i<h;i++)
      for (j=0;j<w;j++)
	if (GrPeek(dc,j,i)==TRANSPARENT) {
	  for (k=0;k<8;k++) {
	    c=GrPeek(dc,j+gr_x_offsets[k],i+gr_y_offsets[k]);
	    if (c!=-1 && c!=BLACK && c!=TRANSPARENT) {
	      dc->color=BLACK;
	      GrPlot(dc,j,i);
	      break;
	    }
	  }
	}

    out_img=DC2Sprite(dc);
    '\n';
    Sprite(out_img);
    '\n\n\n\n';

    DCDel(dc);
    Free(out_img);
  }
}

OutLine;
