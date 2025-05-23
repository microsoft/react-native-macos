# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

file(GLOB reactnativejni_SRC CONFIGURE_DEPENDS *.cpp)

add_compile_options(
        -fexceptions
        -Wno-unused-lambda-capture
        -std=c++20)

######################
### reactnativejni ###
######################

include(${REACT_ANDROID_DIR}/src/main/jni/first-party/jni-lib-merge/SoMerging-utils.cmake)

add_library(
        reactnativejni
        OBJECT
        ${reactnativejni_SRC}
)
target_merge_so(reactnativejni)

# TODO This should not be ../../
target_include_directories(reactnativejni PUBLIC ../../)

target_link_libraries(reactnativejni
        android
        callinvokerholder
        fbjni
        folly_runtime
        glog_init
        logger
        react_cxxreact
        react_render_runtimescheduler
        runtimeexecutor
        yoga
        )
