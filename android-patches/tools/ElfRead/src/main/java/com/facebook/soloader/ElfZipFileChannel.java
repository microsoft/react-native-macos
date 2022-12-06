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

import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
// import javax.annotation.Nullable;

public class ElfZipFileChannel implements ElfByteChannel {

  private /*@Nullable*/ InputStream mIs;
  private final ZipEntry mZipEntry;
  private final ZipFile mZipFile;
  private final long mLength;
  private boolean mOpened;
  private long mPos;

  public ElfZipFileChannel(ZipFile zipFile, ZipEntry zipEntry) throws IOException {
    mZipFile = zipFile;
    mZipEntry = zipEntry;

    mOpened = true;
    mPos = 0;
    mLength = mZipEntry.getSize();
    mIs = mZipFile.getInputStream(mZipEntry);
    if (mIs == null) {
      throw new IOException(mZipEntry.getName() + "'s InputStream is null");
    }
  }

  @Override
  public long position() throws IOException {
    return mPos;
  }

  @Override
  public ElfByteChannel position(long newPosition) throws IOException {
    if (mIs == null) {
      throw new IOException(mZipEntry.getName() + "'s InputStream is null");
    }

    if (newPosition == mPos) {
      return this;
    }

    if (newPosition > mLength) {
      newPosition = mLength;
    }
    if (newPosition >= mPos) {
      mIs.skip(newPosition - mPos);
    } else {
      mIs.close();
      mIs = mZipFile.getInputStream(mZipEntry);
      if (mIs == null) {
        throw new IOException(mZipEntry.getName() + "'s InputStream is null");
      }
      mIs.skip(newPosition);
    }
    mPos = newPosition;
    return this;
  }

  /**
   * Reads a sequence of bytes from this channel into the given buffer. Bytes are read starting at
   * this channel's current file position, and then the file position is updated with the number of
   * bytes actually read.
   *
   * @return The number of bytes read, possibly zero, or -1 if the channel has reached end-of-stream
   */
  @Override
  public int read(ByteBuffer dst) throws IOException {
    return read(dst, mPos);
  }

  /**
   * Reads a sequence of bytes from this channel into the given buffer, starting at the given file
   * position.
   *
   * <p>N.B. The file position is updated with the number of bytes actually read. It's different
   * from <a
   * href="https://docs.oracle.com/javase/7/docs/api/java/nio/channels/FileChannel.html#read(java.nio.ByteBuffer,%20long)">FileChannel.html#read(java.nio.ByteBuffer,
   * long)</a>.
   *
   * @return The number of bytes read, possibly zero, or -1 if the given position is greater than or
   *     equal to the file's current size
   */
  @Override
  public int read(ByteBuffer dst, long position) throws IOException {
    if (mIs == null) {
      throw new IOException("InputStream is null");
    }

    int wanted = dst.remaining();
    long possible = mLength - position;
    if (possible <= 0) {
      return -1;
    }
    if (wanted > (int) possible) {
      wanted = (int) possible;
    }
    position(position);
    if (dst.hasArray()) {
      mIs.read(dst.array(), 0, wanted);
      dst.position(dst.position() + wanted);
    } else {
      byte[] bytes = new byte[wanted];
      mIs.read(bytes, 0, wanted);
      dst.put(bytes, 0, wanted);
    }
    mPos += wanted;
    return wanted;
  }

  @Override
  public long size() throws IOException {
    return mLength;
  }

  @Override
  public ElfByteChannel truncate(long size) throws IOException {
    throw new UnsupportedOperationException("ElfZipFileChannel doesn't support truncate");
  }

  @Override
  public int write(ByteBuffer src) throws IOException {
    // Readonly byte channel
    throw new UnsupportedOperationException("ElfZipFileChannel doesn't support write");
  }

  @Override
  public boolean isOpen() {
    return mOpened;
  }

  @Override
  public void close() throws IOException {
    if (mIs != null) {
      mIs.close();
      mOpened = false;
    }
  }
}
