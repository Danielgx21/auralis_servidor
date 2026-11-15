package com.dgx.futbot;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
 private static final String GAME_URL="https://futbot-cloud.onrender.com/";
 private static final String GAME_HOST="futbot-cloud.onrender.com";
 private static final int BG=Color.rgb(6,35,29);
 private static final int ACCENT=Color.rgb(183,236,92);
 private WebView webView;
 private LinearLayout errorPanel;
 private boolean loadFailed;

 @Override public void onCreate(Bundle savedInstanceState) {
  super.onCreate(savedInstanceState);
  getWindow().setFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  if(Build.VERSION.SDK_INT>=28){
   WindowManager.LayoutParams attrs=getWindow().getAttributes();
   attrs.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
   getWindow().setAttributes(attrs);
  }
  showImmersive();
  FrameLayout layout=new FrameLayout(this);
  layout.setBackgroundColor(BG);
  webView=new WebView(this);
  webView.setBackgroundColor(BG);
  webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
  webView.setVerticalScrollBarEnabled(false);
  webView.setHorizontalScrollBarEnabled(false);
  webView.setWebChromeClient(new WebChromeClient());
  WebSettings s=webView.getSettings();
  s.setJavaScriptEnabled(true);
  s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false);
  s.setAllowContentAccess(false);
  s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  s.setJavaScriptCanOpenWindowsAutomatically(false);
  s.setSupportMultipleWindows(false);
  s.setMediaPlaybackRequiresUserGesture(true);
  s.setBuiltInZoomControls(false);
  s.setDisplayZoomControls(false);
  s.setCacheMode(WebSettings.LOAD_NO_CACHE);
  s.setDefaultTextEncodingName("UTF-8");
  webView.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    Uri url=request.getUrl();
    if("https".equalsIgnoreCase(url.getScheme())&&GAME_HOST.equalsIgnoreCase(url.getHost())) return false;
    if(request.isForMainFrame()){
     try{startActivity(new Intent(Intent.ACTION_VIEW,url));}catch(ActivityNotFoundException ignored){}
    }
    return true;
   }
   @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){
    loadFailed=false;
    errorPanel.setVisibility(View.GONE);
   }
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError err){
    if(request.isForMainFrame()) showLoadError();
   }
   @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response){
    if(request.isForMainFrame()&&response.getStatusCode()>=400) showLoadError();
   }
   @Override public void onPageFinished(WebView view,String url){
    if(!loadFailed) errorPanel.setVisibility(View.GONE);
   }
  });
  layout.addView(webView,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
  errorPanel=makeErrorPanel();
  layout.addView(errorPanel,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
  errorPanel.setVisibility(View.GONE);
  setContentView(layout);
  webView.loadUrl(GAME_URL);
 }
 private LinearLayout makeErrorPanel(){
  LinearLayout p=new LinearLayout(this);
  p.setOrientation(LinearLayout.VERTICAL);
  p.setGravity(Gravity.CENTER);
  p.setPadding(36,24,36,24);
  p.setBackgroundColor(BG);
  TextView title=new TextView(this);
  title.setText("FutBot");
  title.setTextColor(ACCENT);
  title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
  title.setTextSize(28);
  title.setGravity(Gravity.CENTER);
  p.addView(title);
  TextView msg=new TextView(this);
  msg.setText("Não foi possível conectar ao jogo. Verifique sua internet e tente novamente.");
  msg.setTextColor(Color.WHITE);
  msg.setTextSize(16);
  msg.setGravity(Gravity.CENTER);
  LinearLayout.LayoutParams mp=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT);
  mp.setMargins(0,20,0,24);
  p.addView(msg,mp);
  Button retry=new Button(this);
  retry.setText("Tentar novamente");
  retry.setAllCaps(false);
  retry.setTextColor(BG);
  retry.setBackgroundTintList(android.content.res.ColorStateList.valueOf(ACCENT));
  retry.setOnClickListener(v->webView.loadUrl(GAME_URL));
  p.addView(retry);
  return p;
 }
 private void showLoadError(){loadFailed=true;errorPanel.setVisibility(View.VISIBLE);}
 @SuppressWarnings("deprecation")
 private void showImmersive(){
  getWindow().getDecorView().setSystemUiVisibility(
   View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|
   View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|
   View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
 }
 @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(focused)showImmersive();}
 @Override public void onConfigurationChanged(android.content.res.Configuration c){super.onConfigurationChanged(c);showImmersive();}
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
 @Override protected void onPause(){if(webView!=null)webView.onPause();super.onPause();}
 @Override protected void onResume(){super.onResume();if(webView!=null)webView.onResume();}
 @Override protected void onDestroy(){if(webView!=null){webView.stopLoading();webView.destroy();webView=null;}super.onDestroy();}
}
