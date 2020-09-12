#pragma once

#include <string>
#include <memory>
#include <map>
#include <vector>
#include <type_traits>
#include <cmath>

namespace winrt
{
using hstring = std::string;
inline hstring to_hstring(const std::string& s) { return s; }
inline std::string to_string(const hstring& s) { return s; }
}

namespace winrt::Microsoft::ReactNative
{

#define WINRT_TO_MAC_MAKE_WINRT_INTERFACE(NAME)\
  NAME() = default;\
  NAME(const NAME&) = default;\
  NAME(NAME&&) = default;\
  NAME& operator=(const NAME&) = default;\
  NAME& operator=(NAME&&) = default;\
  NAME(const std::shared_ptr<Itf>& itf):m_itf(itf){}\
private:\
  std::shared_ptr<Itf> m_itf\

enum class JSValueType
{
  Null,
  Object,
  Array,
  String,
  Boolean,
  Int64,
  Double,
};

struct IJSValueReader
{
  struct Itf
  {
    virtual JSValueType ValueType() noexcept = 0;
    virtual bool GetNextObjectProperty(hstring &propertyName) noexcept = 0;
    virtual bool GetNextArrayItem() noexcept = 0;
    virtual hstring GetString() noexcept = 0;
    virtual bool GetBoolean() noexcept = 0;
    virtual int64_t GetInt64() noexcept = 0;
    virtual double GetDouble() noexcept = 0;
  };
  
  JSValueType ValueType() const noexcept { return m_itf->ValueType(); }
  bool GetNextObjectProperty(hstring &propertyName) const noexcept { return m_itf->GetNextObjectProperty(propertyName); }
  bool GetNextArrayItem() const noexcept { return m_itf->GetNextArrayItem(); }
  hstring GetString() const noexcept { return m_itf->GetString(); }
  bool GetBoolean() const noexcept { return m_itf->GetBoolean(); }
  int64_t GetInt64() const noexcept { return m_itf->GetInt64(); }
  double GetDouble() const noexcept { return m_itf->GetDouble(); }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IJSValueReader);
};

struct IJSValueWriter
{
  struct Itf
  {
    virtual void WriteNull() noexcept = 0;
    virtual void WriteBoolean(bool value) noexcept = 0;
    virtual void WriteInt64(int64_t value) noexcept = 0;
    virtual void WriteDouble(double value) noexcept = 0;
    virtual void WriteString(const winrt::hstring &value) noexcept = 0;
    virtual void WriteObjectBegin() noexcept = 0;
    virtual void WritePropertyName(const winrt::hstring &name) noexcept = 0;
    virtual void WriteObjectEnd() noexcept = 0;
    virtual void WriteArrayBegin() noexcept = 0;
    virtual void WriteArrayEnd() noexcept = 0;
  };

  void WriteNull() const noexcept { m_itf->WriteNull(); }
  void WriteBoolean(bool value) const noexcept { m_itf->WriteBoolean(value); }
  void WriteInt64(int64_t value) const noexcept { m_itf->WriteInt64(value); }
  void WriteDouble(double value) const noexcept { m_itf->WriteDouble(value); }
  void WriteString(const winrt::hstring &value) const noexcept { m_itf->WriteString(value); }
  void WriteObjectBegin() const noexcept { m_itf->WriteObjectBegin(); }
  void WritePropertyName(const winrt::hstring &name) const noexcept { m_itf->WritePropertyName(name); }
  void WriteObjectEnd() const noexcept { m_itf->WriteObjectEnd(); }
  void WriteArrayBegin() const noexcept { m_itf->WriteArrayBegin(); }
  void WriteArrayEnd() const noexcept { m_itf->WriteArrayEnd(); }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IJSValueWriter);
};
                 
}
