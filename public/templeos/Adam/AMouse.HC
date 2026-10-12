#help_index "Graphics/Misc;Mouse/Ptr"

$SP,"<1>",BI=1$

gr.empty_sprite=$IB,"<1>",BI=1$;

$SP,"<2>",BI=2$

$SP,"<3>",BI=3$

public U0 DrawGrabMs(CDC *dc,I64 x,I64 y,Bool closed)
{//This is a callback. See $LK,"::/Demo/Graphics/Grid.HC"$.
  dc->flags&=~(DCF_TRANSFORMATION|DCF_SYMMETRY);
  dc->color=ROP_EQU;
  if (closed)
    Sprite3(dc,x,y,0,$IB,"<2>",BI=2$);
  else
    Sprite3(dc,x,y,0,$IB,"<3>",BI=3$);
}
gr.fp_draw_grab_ms=&DrawGrabMs;
