/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.facebook.soloader;

import android.content.Context;
import java.io.EOFException;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.util.Arrays;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
//import javax.annotation.Nullable;

/**
 * Unpacks native deps file from APK to disk. Only needed when native deps are compressed in the
 * APK. The file is extracted on first start, and replaced if the file is corrupt or the APK
 * changes.
 */
public final class NativeDepsUnpacker {

  private static final byte STATE_DIRTY = 0;
  private static final byte STATE_CLEAN = 1;

  private static final String NATIVE_DEPS_DIR_NAME = "native_deps";
  private static final String LOCK_FILE_NAME = "lock";
  private static final String STATE_FILE_NAME = "state";
  private static final String APK_IDENTIFIER_FILE_NAME = "apk_id";
  private static final String NATIVE_DEPS_FILE_NAME = "deps";
  private static final String NATIVE_DEPS_FILE_APK_PATH = "assets/native_deps.txt";

  private NativeDepsUnpacker() {}

  public static File getNativeDepsFilePath(Context context) {
    return new File(getNativeDepsDir(context), NATIVE_DEPS_FILE_NAME);
  }

  public static File getNativeDepsDir(Context context) {
    return new File(context.getApplicationInfo().dataDir, NATIVE_DEPS_DIR_NAME);
  }

  /**
   * Makes sure that the native deps file has been extracted from the APK to disk so it can be used
   * to load libraries. If either the file hasn't been extracted, the extracted file is corrupt, or
   * the APK changed, the file will be extracted from the APK. If the file was already extracted,
   * this is a no-op. If extraction fails, an IOException will be thrown.
   *
   * @param context application context
   * @throws IOException IOException
   */
  public static void ensureNativeDepsAvailable(Context context) throws IOException {
    File dir = getNativeDepsDir(context);
    if (!ensureDirExists(dir)) {
      return;
    }

    File lockFile = new File(dir, LOCK_FILE_NAME);
    // try (FileLocker lock = SysUtil.getOrCreateLockOnDir(dir, lockFile, true)) {
      byte state = readState(dir);

      if (state == STATE_CLEAN && apkChanged(context, dir)) {
        state = STATE_DIRTY;
      }

      if (state == STATE_CLEAN) {
        return;
      }

      writeState(dir, STATE_DIRTY);

      extractNativeDeps(context);
      writeApkIdentifier(context, dir);
      SysUtil.fsyncRecursive(dir);

      writeState(dir, STATE_CLEAN);
    // }
  }

  private static boolean ensureDirExists(File dir) {
    if (dir.exists() && !dir.isDirectory()) {
      dir.delete();
    }

    if (!dir.exists()) {
      dir.mkdir();
    }

    if (!dir.isDirectory()) {
      return false;
    }

    return true;
  }

  private static byte[] getApkIdentifier(Context context) throws IOException {
    File apk = new File(context.getApplicationInfo().sourceDir);
    return SysUtil.makeApkDepBlock(apk, context);
  }

  static byte[] readAllBytes(InputStream in, int length) throws IOException {
    byte[] buffer = new byte[length];

    int offset = 0;
    while (offset < length) {
      int bytesRead = in.read(buffer, offset, length - offset);
      if (bytesRead == -1) {
        throw new EOFException("EOF found unexpectedly");
      }
      if (offset + bytesRead > length) {
        throw new IllegalStateException("Read more bytes than expected");
      }
      offset += bytesRead;
    }

    return buffer;
  }

  static byte[] readNativeDepsFromDisk(Context context) throws IOException {
    File file = getNativeDepsFilePath(context);
    try (FileInputStream in = new FileInputStream(file)) {
      return readAllBytes(in, (int) file.length());
    }
  }

  static byte[] readNativeDepsFromApk(Context context) throws IOException {
    File apk = new File(context.getApplicationInfo().sourceDir);
    try (ZipFile zipFile = new ZipFile(apk)) {
      ZipEntry nativeDepsEntry = zipFile.getEntry(NATIVE_DEPS_FILE_APK_PATH);
      if (nativeDepsEntry == null) {
        throw new FileNotFoundException("Could not find native_deps file in APK");
      }

      try (InputStream nativeDepsIs = zipFile.getInputStream(nativeDepsEntry)) {
        if (nativeDepsIs == null) {
          throw new FileNotFoundException("Failed to read native_deps file from APK");
        }
        return readAllBytes(nativeDepsIs, (int) nativeDepsEntry.getSize());
      }
    }
  }

  private static void extractNativeDeps(Context context) throws IOException {
    byte[] newDeps = readNativeDepsFromApk(context);
    byte[] apkIdentifier = getApkIdentifier(context);
    int depsLen = newDeps.length;
    File depsFileName = getNativeDepsFilePath(context);
    try (RandomAccessFile depsFile = new RandomAccessFile(depsFileName, "rw")) {
      depsFile.write(apkIdentifier);
      depsFile.writeInt(depsLen);
      depsFile.write(newDeps);
      depsFile.setLength(depsFile.getFilePointer());
    }
  }

  private static void writeApkIdentifier(Context context, File dir) throws IOException {
    File apkIdentifierFileName = new File(dir, APK_IDENTIFIER_FILE_NAME);
    byte[] apkIdentifier = getApkIdentifier(context);
    try (RandomAccessFile apkIdentifierFile = new RandomAccessFile(apkIdentifierFileName, "rw")) {
      apkIdentifierFile.write(apkIdentifier);
      apkIdentifierFile.setLength(apkIdentifierFile.getFilePointer());
    }
  }

  private static void writeState(File dir, byte state) throws IOException {
    final File stateFileName = new File(dir, STATE_FILE_NAME);
    try (RandomAccessFile stateFile = new RandomAccessFile(stateFileName, "rw")) {
      stateFile.seek(0);
      stateFile.write(state);
      stateFile.setLength(stateFile.getFilePointer());
      stateFile.getFD().sync();
    }
  }

  private static byte readState(File dir) throws IOException {
    final File stateFileName = new File(dir, STATE_FILE_NAME);
    byte state;
    try (RandomAccessFile stateFile = new RandomAccessFile(stateFileName, "rw")) {
      try {
        state = stateFile.readByte();
        if (state != STATE_CLEAN) {
          state = STATE_DIRTY;
        }
      } catch (EOFException ex) {
        // Empty file, state should be set to dirty
        state = STATE_DIRTY;
      }
    }
    return state;
  }

  private static /*@Nullable*/ byte[] getExistingApkIdentifier(Context context, File dir)
      throws IOException {
    File apkIdentifierFileName = new File(dir, APK_IDENTIFIER_FILE_NAME);
    try (RandomAccessFile apkIdentifierFile = new RandomAccessFile(apkIdentifierFileName, "rw")) {
      byte[] existingDeps = new byte[(int) apkIdentifierFile.length()];
      if (apkIdentifierFile.read(existingDeps) != existingDeps.length) {
        return null;
      }
      return existingDeps;
    }
  }

  private static boolean apkChanged(Context context, File dir) throws IOException {
    byte[] existingApkId = getExistingApkIdentifier(context, dir);
    byte[] currentApkId = getApkIdentifier(context);
    if (existingApkId == null || currentApkId == null) {
      return true;
    }

    if (existingApkId.length != currentApkId.length) {
      return true;
    }

    return !Arrays.equals(existingApkId, currentApkId);
  }
}
