package com.zulipmobile;

import android.util.Base64;

import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Promise;

import com.facebook.react.bridge.ReactContextBaseJavaModule;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.zip.DataFormatException;
import java.util.zip.Deflater;
import java.util.zip.Inflater;

import android.util.Log;

class TextCompressionModule extends ReactContextBaseJavaModule {
  public TextCompressionModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "TextCompressionModule";
  }

  private int bufferSize = 8192;

  @ReactMethod
  public void compress(String uncompressedText, Promise promise) {
    try {
      byte[] input = uncompressedText.getBytes("UTF-8");
      // Log.d("java","compressing:"+uncompressedText);
      ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
      byte[] buffer = new byte[bufferSize];
      Deflater deflater = new Deflater();
      deflater.setInput(input);
      deflater.finish();
      while (!deflater.finished()) {
        int byteCount = deflater.deflate(buffer);
        outputStream.write(buffer, 0, byteCount);
      }
      deflater.end();
      outputStream.close();
      byte[] output = outputStream.toByteArray();
      String base64OutputString = Base64.encodeToString(output, Base64.DEFAULT);
      // Log.d("java", "compressed:"+base64OutputString);
      promise.resolve(base64OutputString);
    } catch (UnsupportedEncodingException e) {
      promise.reject("UNSUPPORTED_ENCODING_EXCEPTION", e);
    } catch (IOException e) {
      promise.reject("IO_EXCEPTION", e);
    }
  }

  @ReactMethod
  public void decompress(String compressedText, Promise promise) {
    try {
      byte[] inputBase64 = compressedText.getBytes("ISO-8859-1");
      // Log.d("java", "decompressing:"+compressedText);
      byte[] input = Base64.decode(inputBase64, Base64.DEFAULT);
      // Log.d("java", "base64-decoded:"+input)
      Inflater inflater = new Inflater();
      inflater.setInput(input);
      ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
      byte[] buffer = new byte[bufferSize];
      while (inflater.getRemaining() != 0) {
        int byteCount = inflater.inflate(buffer);
        outputStream.write(buffer, 0, byteCount);
      }
      inflater.end();
      outputStream.close();
      byte[] output = outputStream.toByteArray();
      String uncompressedText = new String(output, 0, output.length, "UTF-8");
      // Log.d("java", "decompressed:"+ uncompressedText);
      promise.resolve(uncompressedText);
    } catch(java.io.UnsupportedEncodingException e) {
      promise.reject("UNSUPPORTED_ENCODING_EXCEPTION", e);
    } catch (IOException e) {
      promise.reject("IO_EXCEPTION", e);
    } catch (DataFormatException e) {
      promise.reject("DATA_FORMAT_EXCEPTION", e);
    }
  }
}
