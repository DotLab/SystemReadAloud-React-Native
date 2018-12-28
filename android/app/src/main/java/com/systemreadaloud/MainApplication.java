package com.systemreadaloud;

import android.app.Application;

import com.facebook.react.ReactApplication;
import io.github.airamrguez.RNMeasureTextPackage;
import com.github.amarcruz.rntextsize.RNTextSizePackage;
import com.rnfs.RNFSPackage;
import net.no_mad.tts.TextToSpeechPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new RNMeasureTextPackage(),
            new RNTextSizePackage(),
            new RNFSPackage(),
            new TextToSpeechPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
