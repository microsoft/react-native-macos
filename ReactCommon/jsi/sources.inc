LIBLETNAME = jsi

!include $(OPENSOURCE_REACTNATIVE)\OfficeISS\ReactCommon\make.inc
!include $(OTOOLS)\inc\opensource\reactnative\officereactnative.inc

SOURCES_SHARED = \
  ..\jsi.cpp \
  ..\JSIDynamic.cpp \

SOURCES_V8_FILES = \
  ..\FileUtils.cpp \
  ..\V8Platform.cpp \
  ..\V8Runtime_basic.cpp \
  ..\V8Runtime_droid.cpp \
  ..\V8Runtime_shared.cpp \

SOURCES_ANDROID = \
  $(SOURCES_SHARED) \
  $(SOURCES_V8_FILES) \

SOURCES_WIN32 = \
  $(SOURCES_SHARED) \
  ..\V8Platform.cpp \
  ..\V8Runtime_shared.cpp \
  ..\V8Runtime_win.cpp \

SOURCES_WINRT = \
  $(SOURCES_SHARED) \

SOURCES_JSICORE = \
  ..\jsi.cpp \
  ..\V8Platform.cpp \
  ..\V8Runtime_basic.cpp \
  ..\V8Runtime_shared.cpp \