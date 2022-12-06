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
import android.util.Log;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantReadWriteLock;
// import javax.annotation.Nullable;

/**
 * Class for getting native libraries dependencies for a DSO. Dependencies are read either from a
 * file specifying all dependencies, or from the ELF file itself.
 */
public final class NativeDeps {

  private static final int LIB_PREFIX_LEN = "lib".length();
  private static final int LIB_SUFFIX_LEN = ".so".length();
  private static final int LIB_PREFIX_SUFFIX_LEN = LIB_PREFIX_LEN + LIB_SUFFIX_LEN;
  private static final float HASHMAP_LOAD_FACTOR = 1f;
  private static final int INITIAL_HASH = 5381;
  private static final int WAITING_THREADS_WARNING_THRESHOLD = 3;
  private static final String LOG_TAG = "NativeDeps";

  private static volatile boolean sInitialized = false;
  private static /*@Nullable*/ byte[] sEncodedDeps;
  private static List<Integer> sPrecomputedLibs;
  private static Map<Integer, List<Integer>> sPrecomputedDeps;

  private static volatile boolean sUseDepsFileAsync = false;
  private static final ReentrantReadWriteLock sWaitForDepsFileLock = new ReentrantReadWriteLock();

  public static String[] getDependencies(String soName, File elfFile) throws IOException {
    String[] deps = awaitGetDepsFromPrecomputedDeps(soName);
    if (deps != null) {
      return deps;
    }

    return MinElf.extract_DT_NEEDED(elfFile);
  }

  public static String[] getDependencies(String soName, ElfByteChannel bc) throws IOException {
    String[] deps = awaitGetDepsFromPrecomputedDeps(soName);
    if (deps != null) {
      return deps;
    }

    return MinElf.extract_DT_NEEDED(bc);
  }

  /*@Nullable*/
  private static String[] awaitGetDepsFromPrecomputedDeps(String soName) {
    if (sInitialized) {
      return tryGetDepsFromPrecomputedDeps(soName);
    }

    if (sUseDepsFileAsync) {
      sWaitForDepsFileLock.readLock().lock();
      try {
        return tryGetDepsFromPrecomputedDeps(soName);
      } finally {
        sWaitForDepsFileLock.readLock().unlock();
      }
    }

    return null;
  }

  /**
   * Enables fetching dependencies from a deps file expected to be in the APK. If enabled,
   * dependencies will be looked up in the deps file instead of extracting them from the ELF file.
   * The file is read only once when getDependencies is first called. If dependencies for a specific
   * library are not found or the file is corrupt, we fall back to extracting the dependencies from
   * the ELF file.
   *
   * @param context Application context, used to find apk file and data directory.
   * @param async If true, native deps file initialization will be performed in a background thread,
   *     and fetching dependencies will wait for initialization to complete. If false,
   *     initialization is performed synchronously on this call.
   * @param extractToDisk Whether the dependency file got extracted into disk.
   * @return true if initialization succeeded, false otherwise. If async, always returns true.
   */
  public static boolean useDepsFile(
      final Context context, boolean async, final boolean extractToDisk) {
    if (!async) {
      return useDepsFileFromApkSync(context, extractToDisk);
    }

    Runnable runnable =
        new Runnable() {
          @Override
          public void run() {
            sWaitForDepsFileLock.writeLock().lock();
            sUseDepsFileAsync = true;
            try {
              useDepsFileFromApkSync(context, extractToDisk);
            } finally {
              int waitingThreads = sWaitForDepsFileLock.getReadLockCount();
              if (waitingThreads >= WAITING_THREADS_WARNING_THRESHOLD) {
                Log.w(
                    LOG_TAG,
                    "NativeDeps initialization finished with "
                        + Integer.toString(waitingThreads)
                        + " threads waiting.");
              }
              sWaitForDepsFileLock.writeLock().unlock();
              sUseDepsFileAsync = false;
            }
          };
        };

    new Thread(runnable, "soloader-nativedeps-init").start();
    return true;
  }

  private static boolean useDepsFileFromApkSync(final Context context, boolean extractToDisk) {
    boolean success;
    try {
      success = initDeps(context, extractToDisk);
    } catch (IOException e) {
      // File does not exist or reading failed for some reason. We need to make
      // sure the file was extracted from the APK.
      success = false;
    }

    if (!success && extractToDisk) {
      try {
        NativeDepsUnpacker.ensureNativeDepsAvailable(context);
        // Retry, now that we made sure the file was extracted.
        success = initDeps(context, extractToDisk);
      } catch (IOException e) {
        // Failed to read native deps file. We can ignore the exception since
        // we will fall back to using MinElf.
      }
    }

    if (!success) {
      Log.w(
          LOG_TAG,
          "Failed to extract native deps from APK, falling back to using MinElf to get library dependencies.");
    }

    return success;
  }

  private static boolean initDeps(final Context context, boolean extractToDisk) throws IOException {
    verifyUninitialized();
    byte[] depsBytes = null;
    byte[] apkId = null;
    if (extractToDisk) {
      File apkFile = new File(context.getApplicationInfo().sourceDir);
      apkId = SysUtil.makeApkDepBlock(apkFile, context);
      depsBytes = NativeDepsUnpacker.readNativeDepsFromDisk(context);
    } else {
      depsBytes = NativeDepsUnpacker.readNativeDepsFromApk(context);
      // ApkDepBlock is not needed if we are reading directly from APK
    }

    return processDepsBytes(apkId, depsBytes);
  }

  // Given the offset where the dependencies for a library begin in
  // sEncodedDeps, stores indices for mapping from lib name hash to offset,
  // and from lib index to offset.
  private static void indexLib(int hash, int nameBegin) {
    sPrecomputedLibs.add(nameBegin);
    List<Integer> bucket = sPrecomputedDeps.get(hash);
    if (bucket == null) {
      bucket = new ArrayList<Integer>();
      sPrecomputedDeps.put(hash, bucket);
    }
    bucket.add(nameBegin);
  }

  // Preprocess bytes from deps file. The deps file should be ascii encoded,
  // with the format:
  // <lib1_name> [dep_index1 dep_index2 ...]\n
  // <lib2_name> [dep_index1 dep_index2 ...]\n
  //
  // library names must not be prefixed with "lib" or suffixed with ".so".
  // dep_index is the 0-based index of the dependency in the deps file.
  //
  // We want to process the deps fast since the deps file can be large.
  // To do this fast, we read the bytes into memory, we store the
  // offsets in which each library starts, and we hash each library name
  // and map it to its offset.
  private static void indexDepsBytes(byte[] bytes, int offset) {
    boolean inLibName = true;
    int byteOffset = offset;
    int libHash = 0;
    int libNameBegin = 0;
    try {
      while (true) {
        if (inLibName) {
          libNameBegin = byteOffset;
          int nextByte;
          libHash = INITIAL_HASH;
          while ((nextByte = bytes[byteOffset]) > ' ') {
            libHash = ((libHash << 5) + libHash) + nextByte;
            ++byteOffset;
          }
          indexLib(libHash, libNameBegin);
          inLibName = nextByte != ' ';
        } else {
          while (bytes[byteOffset] != '\n') {
            ++byteOffset;
          }
          inLibName = true;
        }
        ++byteOffset;
      }
    } catch (IndexOutOfBoundsException e) {
      if (inLibName && libNameBegin != bytes.length) {
        indexLib(libHash, libNameBegin);
      }
    }
  }

  private static int verifyBytesAndGetOffset(/*@Nullable */byte[] apkId, /*@Nullable */byte[] bytes) {
    if (apkId == null || apkId.length == 0) {
      return -1;
    }

    if (bytes.length < apkId.length + 4) {
      return -1;
    }

    int depsLen = ByteBuffer.wrap(bytes, apkId.length, 4).getInt();
    if (bytes.length != apkId.length + 4 + depsLen) {
      return -1;
    }

    for (int i = 0; i < apkId.length; ++i) {
      if (apkId[i] != bytes[i]) {
        return -1;
      }
    }

    return apkId.length + 4;
  }

  private static int findNextLine(byte[] bytes, int offset) {
    while (offset < bytes.length && bytes[offset] != '\n') {
      offset++;
    }

    if (offset < bytes.length) {
      offset++;
    }

    return offset;
  }

  private static int parseLibCount(byte[] data, int offset, int length) {
    try {
      return Integer.parseInt(new String(data, offset, length));
    } catch (NumberFormatException e) {
      // Invalid data
      return -1;
    }
  }

  static boolean processDepsBytes(byte[] apkId, byte[] deps) throws IOException {
    int offset = 0;
    if (apkId != null) {
      offset = verifyBytesAndGetOffset(apkId, deps);
      if (offset == -1) {
        return false;
      }
    }

    int deps_offset = findNextLine(deps, offset);
    if (deps_offset >= deps.length) {
      return false;
    }

    int libsCount = parseLibCount(deps, offset, deps_offset - offset - 1);
    if (libsCount <= 0) {
      return false;
    }

    sPrecomputedDeps =
        new HashMap<>((int) (libsCount / HASHMAP_LOAD_FACTOR) + 1, HASHMAP_LOAD_FACTOR);
    sPrecomputedLibs = new ArrayList<>(libsCount);
    indexDepsBytes(deps, deps_offset);

    if (sPrecomputedLibs.size() != libsCount) {
      return false;
    }

    sEncodedDeps = deps;
    sInitialized = true;
    return true;
  }

  // Returns whether soName is encoded at a specified offset in sEncodedDeps
  private static boolean libIsAtOffset(String soName, int offset) {
    int i, j;
    for (i = LIB_PREFIX_LEN, j = offset;
        i < soName.length() - LIB_SUFFIX_LEN && j < sEncodedDeps.length;
        i++, j++) {
      if ((soName.codePointAt(i) & 0xFF) != sEncodedDeps[j]) {
        break;
      }
    }
    return i == soName.length() - LIB_SUFFIX_LEN;
  }

  // Hashes the name of a library
  private static int hashLib(String soName) {
    int libHash = INITIAL_HASH;
    for (int i = LIB_PREFIX_LEN; i < soName.length() - LIB_SUFFIX_LEN; ++i) {
      libHash = ((libHash << 5) + libHash) + soName.codePointAt(i);
    }
    return libHash;
  }

  // Returns the byte offset in sEncodedDeps for where dependencies for
  // soName start.
  // Returns -1 if soName does not exist in the deps file
  private static int getOffsetForLib(String soName) {
    int libHash = hashLib(soName);
    List<Integer> bucket = sPrecomputedDeps.get(libHash);
    if (bucket == null) {
      return -1;
    }

    for (int offset : bucket) {
      if (libIsAtOffset(soName, offset)) {
        return offset;
      }
    }

    return -1;
  }

  // Given the index of a library in the dependency file, returns a String with
  // the name of that library. The string is prefixed with "lib" and suffixed
  // with ".so".
  private static/* @Nullable*/ String getLibString(int depIndex) {
    if (depIndex >= sPrecomputedLibs.size()) {
      return null;
    }

    int initialOffset = sPrecomputedLibs.get(depIndex);
    int byteOffset = initialOffset;
    while (byteOffset < sEncodedDeps.length && sEncodedDeps[byteOffset] > ' ') {
      ++byteOffset;
    }

    int libNameLength = (byteOffset - initialOffset) + LIB_PREFIX_SUFFIX_LEN;
    char[] libBytes = new char[libNameLength];
    libBytes[0] = 'l';
    libBytes[1] = 'i';
    libBytes[2] = 'b';
    for (int i = 0; i < libNameLength - LIB_PREFIX_SUFFIX_LEN; ++i) {
      libBytes[LIB_PREFIX_LEN + i] = (char) sEncodedDeps[initialOffset + i];
    }
    libBytes[libNameLength - 3] = '.';
    libBytes[libNameLength - 2] = 's';
    libBytes[libNameLength - 1] = 'o';

    return new String(libBytes);
  }

  private static /*@Nullable*/ String[] getDepsForLibAtOffset(int offset, int libNameLength) {
    List<String> deps = new ArrayList<>();
    int depIndex = 0;
    boolean hasDep = false;
    int depsOffset = offset + libNameLength - LIB_PREFIX_SUFFIX_LEN;
    int nextByte;
    for (int byteOffset = depsOffset;
        byteOffset < sEncodedDeps.length && ((nextByte = sEncodedDeps[byteOffset]) != '\n');
        byteOffset++) {
      if (nextByte == ' ') {
        if (hasDep) {
          String dep = getLibString(depIndex);
          if (dep == null) {
            return null;
          }
          deps.add(dep);
          hasDep = false;
          depIndex = 0;
        }
        continue;
      }

      if (nextByte < '0' || nextByte > '9') {
        // Deps are corrupt
        return null;
      }

      hasDep = true;
      depIndex = depIndex * 10 + (nextByte - '0');
    }

    if (hasDep) {
      String dep = getLibString(depIndex);
      if (dep == null) {
        return null;
      }
      deps.add(dep);
    }

    if (deps.size() == 0) {
      // If a library has no dependencies, then we don't know its
      // dependencies, it was just listed in the native deps file because
      // another library depends on this library.
      return null;
    }

    String[] depsArray = new String[deps.size()];
    return deps.toArray(depsArray);
  }

  /*@Nullable*/
  static String[] tryGetDepsFromPrecomputedDeps(String soName) {
    if (!sInitialized) {
      return null;
    }

    if (soName.length() <= LIB_PREFIX_SUFFIX_LEN) {
      // soName must start with "lib" prefix and end with ".so" prefix, so
      // the length of the string must be at least 7.
      return null;
    }

    int offset = getOffsetForLib(soName);
    if (offset == -1) {
      return null;
    }

    return getDepsForLibAtOffset(offset, soName.length());
  }

  private static void verifyUninitialized() {
    if (!sInitialized) {
      return;
    }

    synchronized (NativeDeps.class) {
      if (sInitialized) {
        throw new IllegalStateException(
            "Trying to initialize NativeDeps but it was already initialized");
      }
    }
  }
}
