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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;

public class ElfFileChannel implements ElfByteChannel {

  private File mFile;
  private FileInputStream mIs;
  private FileChannel mFc;

  public ElfFileChannel(File file) throws IOException {
    mFile = file;
    openChannel();
  }

  public void openChannel() throws IOException {
    mIs = new FileInputStream(mFile);
    mFc = mIs.getChannel();
  }

  @Override
  public long position() throws IOException {
    return mFc.position();
  }

  @Override
  public ElfByteChannel position(long newPosition) throws IOException {
    mFc.position(newPosition);
    return this;
  }

  @Override
  public int read(ByteBuffer dst) throws IOException {
    return mFc.read(dst);
  }

  @Override
  public int read(ByteBuffer dst, long position) throws IOException {
    return mFc.read(dst, position);
  }

  @Override
  public long size() throws IOException {
    return mFc.size();
  }

  @Override
  public ElfByteChannel truncate(long size) throws IOException {
    mFc.truncate(size);
    return this;
  }

  @Override
  public int write(ByteBuffer src) throws IOException {
    return mFc.write(src);
  }

  @Override
  public void close() throws IOException {
    mIs.close();
  }

  @Override
  public boolean isOpen() {
    return mFc.isOpen();
  }
}
