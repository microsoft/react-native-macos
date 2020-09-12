#pragma once

#include <string>
#include <locale>
#include <codecvt>
#include <cwchar>
#include <memory>
#include <map>
#include <vector>
#include <type_traits>
#include <cmath>
#include <functional>

inline int64_t _wcstoi64(const wchar_t* str, wchar_t** str_end, int base)
{
  return std::wcstol(str, str_end, base);
}

namespace std
{

inline std::wstring operator+(const wchar_t* a, const std::wstring_view& b)
{
  return a + std::wstring(b.cbegin(), b.cend());
}

}

namespace winrt
{

using hstring = std::wstring;

inline hstring to_hstring(const std::string& s)
{
  return std::wstring_convert<std::codecvt_utf8<wchar_t>, wchar_t>().from_bytes(s);
}

inline hstring to_hstring(const char* s)
{
  return std::wstring_convert<std::codecvt_utf8<wchar_t>, wchar_t>().from_bytes(s);
}

inline hstring to_hstring(const std::string_view& w)
{
  return to_hstring(std::string(w.cbegin(), w.cend()));
}

inline hstring to_hstring(const std::wstring& s)
{
  return s;
}

inline hstring to_hstring(const wchar_t* s)
{
  return s;
}

inline hstring to_hstring(const std::wstring_view& w)
{
  return to_hstring(std::wstring(w.cbegin(), w.cend()));
}

inline std::string to_string(const hstring& s)
{
  return std::wstring_convert<std::codecvt_utf8<wchar_t>, wchar_t>().to_bytes(s);
}

template<typename TClass, typename TInterface>
struct implements : TInterface::Itf
{
  using InterfaceHolder = TInterface;
};

template<typename TClass, typename ...TArgs>
typename TClass::InterfaceHolder make(TArgs&& ...args)
{
  using TIH = typename TClass::InterfaceHolder;
  auto obj = std::make_shared<TClass>(std::forward<TArgs>(args)...);
  std::shared_ptr<typename TIH::Itf> ptr(obj);
  return TIH(obj);
}

template<typename TClass, typename TInterface>
TClass* get_self(const TInterface& itf)
{
  return dynamic_cast<TClass*>(itf.winrt_get_impl());
}

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
  Itf* winrt_get_impl() const noexcept { return m_itf.get(); }\
private:\
  std::shared_ptr<Itf> m_itf\

// IJSValueReader.idl

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
  
  bool GetNextObjectProperty(const std::wstring_view &propertyName) const noexcept
  {
    auto str = std::wstring(propertyName.cbegin(), propertyName.cend());
    return GetNextObjectProperty(str);
  }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IJSValueReader);
};

// IJSValueWriter.idl

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
  
  void WriteString(const std::wstring_view &value) const noexcept
  {
    auto str = std::wstring(value.cbegin(), value.cend());
    WriteString(str);
  }
  
  void WritePropertyName(const std::wstring_view &name) const noexcept
  {
    auto str = std::wstring(name.cbegin(), name.cend());
    WritePropertyName(str);
  }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IJSValueWriter);
};

using JSValueArgWriter = std::function<void(const IJSValueWriter&)>;

// IReactPackageBuilder.idl

struct IReactPackageBuilder;

using ReactModuleProvider = std::function<void(const IReactPackageBuilder&)>;

struct IReactPackageBuilder
{
  struct Itf
  {
    virtual void AddModule(const hstring& moduleName, ReactModuleProvider moduleProvider) noexcept = 0;
  };
  
  void AddModule(const hstring& moduleName, const ReactModuleProvider& moduleProvider) const noexcept { m_itf->AddModule(moduleName, moduleProvider); }
  
  void AddModule(const wchar_t* moduleName, const ReactModuleProvider& moduleProvider) const noexcept
  {
    AddModule(moduleName, moduleProvider);
  }
  
  void AddModule(const std::wstring_view& moduleName, const ReactModuleProvider& moduleProvider) const noexcept
  {
    auto str = std::wstring(moduleName.cbegin(), moduleName.cend());
    AddModule(str, moduleProvider);
  }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IReactPackageBuilder);
};
                 
}
