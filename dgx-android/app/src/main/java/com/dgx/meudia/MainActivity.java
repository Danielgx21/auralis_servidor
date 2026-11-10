package com.dgx.meudia;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String HOME = "https://dgx-meu-dia.onrender.com/";
    private static final String HOST = "dgx-meu-dia.onrender.com";
    private static final int REQ_SPEECH = 2001;
    private static final int REQ_LOCATION = 2002;
    private WebView webView;
    private ProgressBar progress;
    private GeolocationPermissions.Callback pendingLocation;
    private String pendingOrigin;

    private boolean isOwnSite(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme())
            && HOST.equalsIgnoreCase(uri.getHost());
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(8, 16, 26));
        getWindow().setNavigationBarColor(Color.rgb(8, 16, 26));
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 16, 26));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(8, 16, 26));
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        FrameLayout.LayoutParams bar = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(3), Gravity.TOP);
        root.addView(progress, bar);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);      // A interface DGX depende de JavaScript.
        settings.setDomStorageEnabled(true);     // Persistencia de sessao e preferencias.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setUserAgentString(settings.getUserAgentString() + " DGXAndroid/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri url = request.getUrl();
                if ("dgxvoice".equals(url.getScheme()) && "listen".equals(url.getHost())) {
                    if (view.getUrl() != null && isOwnSite(Uri.parse(view.getUrl()))) launchSpeech();
                    return true;
                }
                if (isOwnSite(url)) return false;
                if ("https".equals(url.getScheme()) || "http".equals(url.getScheme())
                    || "mailto".equals(url.getScheme()) || "tel".equals(url.getScheme())
                    || "spotify".equals(url.getScheme()) || "market".equals(url.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); }
                    catch (ActivityNotFoundException ex) { Toast.makeText(MainActivity.this, "Nenhum aplicativo pode abrir este link.", Toast.LENGTH_SHORT).show(); }
                }
                return true; // Bloqueia esquemas de URL desconhecidos.
            }
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!isOwnSite(Uri.parse(url))) return;
                // Usa o reconhecedor nativo do Android sem expor ponte JavaScript ao site.
                view.evaluateJavascript("(function(){var b=document.getElementById('micBtn');"
                    + "if(b){b.onclick=function(e){if(e)e.preventDefault();"
                    + "window.location.href='dgxvoice://listen';};}})();", null);
                CookieManager.getInstance().flush();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Sem conexao com o DGX")
                        .setMessage("Confira a internet e tente novamente.")
                        .setPositiveButton("Tentar novamente", (dialog, which) -> webView.reload())
                        .setNegativeButton("Fechar", (dialog, which) -> finish())
                        .show();
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            }
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!isOwnSite(Uri.parse(origin))) {
                    callback.invoke(origin, false, false); return;
                }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false); return;
                }
                pendingLocation = callback;
                pendingOrigin = origin;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
            }
        });

        if (savedInstanceState == null) webView.loadUrl(HOME);
        else webView.restoreState(savedInstanceState);
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private void launchSpeech() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR");
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "O que deseja pedir ao DGX?");
        try { startActivityForResult(intent, REQ_SPEECH); }
        catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Reconhecimento de voz nao instalado neste Android.", Toast.LENGTH_LONG).show();
        }
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_SPEECH || resultCode != RESULT_OK || data == null) return;
        ArrayList<String> alternatives = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (alternatives == null || alternatives.isEmpty()) return;
        String text = JSONObject.quote(alternatives.get(0));
        webView.evaluateJavascript("(function(){var f=document.getElementById('voiceInput');"
            + "var b=document.getElementById('voiceSend');if(f&&b){f.value=" + text + ";b.click();}})();", null);
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION && pendingLocation != null) {
            boolean allowed = false;
            for (int result : grantResults) if (result == PackageManager.PERMISSION_GRANTED) allowed = true;
            pendingLocation.invoke(pendingOrigin, allowed, false);
            pendingLocation = null;
            pendingOrigin = null;
        }
    }
    @Override public void onBackPressed() {
        if (webView.canGoBack()) { webView.goBack(); return; }
        webView.evaluateJavascript("(function(){var a=document.querySelector('.section.active');"
            + "return a?a.id:'page-home';})()", result -> {
            if (!"\"page-home\"".equals(result) && webView != null) {
                webView.evaluateJavascript("window.DGXgoto&&window.DGXgoto('home');", null);
            } else finish();
        });
    }
    @Override protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState); webView.saveState(outState);
    }
    @Override protected void onPause() { super.onPause(); webView.onPause(); }
    @Override protected void onResume() { super.onResume(); webView.onResume(); }
    @Override protected void onDestroy() { if (webView != null) { webView.destroy(); webView = null; } super.onDestroy(); }
}
