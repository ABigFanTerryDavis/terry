
$SP,"<1>",BI=1$


U0 MenuSprite()
{
  I64 i;
  DocPut->flags|=DOCF_FORM; //Cursor navigation will skip empty locations.
  while (TRUE) {
    DocClear;
    '\n';

    //Sprite with flags for left-expression and an exit.
    //See $LK,"doldoc.dft_de_flags",A="MN:CDolDocGlbls"$.	Note the %d in the string for the sprite number.
    Sprite($IB,"<1>",BI=1$,"$$LTBLUE$$$$SP+X,\"50 Hz\",LE=50,BI=%d$$");

    "\n\n\n"
	  "$$MU,\"100 Hz\",LE=100$$\n"
	  "$$MU,\"200 Hz\",LE=200$$\n"
	  "$$MU,\"CANCEL\",LE=DOCM_CANCEL$$\n";
    i=DocMenu(DocPut);
    if (i>0)
      Snd(Freq2Ona(i));
    else
      break;
  }
  Snd;
  DocClear;
  '\n';
  DocPut->flags&=~DOCF_FORM;
}

MenuSprite;