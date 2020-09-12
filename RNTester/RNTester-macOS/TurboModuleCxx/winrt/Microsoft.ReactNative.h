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
#include "../Crash.h"

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
  return dynamic_cast<TClass*>(itf.get_itf());
}

struct take_ownership_from_abi_t{};
inline const take_ownership_from_abi_t take_ownership_from_abi;

}

namespace winrt::param
{

using hstring = winrt::hstring;

}

#define WINRT_TO_MAC_MAKE_WINRT_INTERFACE(NAME)\
  NAME() = default;\
  NAME(std::nullptr_t){}\
  NAME(const NAME&) = default;\
  NAME(NAME&&) = default;\
  NAME& operator=(const NAME&) = default;\
  NAME& operator=(NAME&&) = default;\
  NAME(const std::shared_ptr<Itf>& itf):IInspectable(itf){}\
  operator bool() const noexcept { return m_itf.get() != nullptr; }\
private:\
  template<typename TClass, typename TInterface>\
  friend TClass* ::winrt::get_self(const TInterface& itf);\
  Itf* get_itf() const noexcept { return static_cast<Itf*>(m_itf.get()); }\

namespace winrt::Windows::Foundation
{

struct IInspectable
{
  struct Itf
  {
    virtual ~Itf() = default;
  };
  
  IInspectable() noexcept = default;
  IInspectable(std::nullptr_t) noexcept {}
  IInspectable(const IInspectable&) noexcept = default;
  IInspectable(IInspectable&&) noexcept = default;
  IInspectable& operator=(const IInspectable&) noexcept = default;
  IInspectable& operator=(IInspectable&&) noexcept = default;
  
  IInspectable(void*, take_ownership_from_abi_t) noexcept
  {
    VerifyElseCrash(false);
  }
  
  template<typename TInterface>
  TInterface try_as() const noexcept
  {
    return dynamic_pointer_cast<typename TInterface::Itf>(m_itf);
  }
  
protected:
  std::shared_ptr<Itf> m_itf;
  
  IInspectable(const std::shared_ptr<Itf>& itf) noexcept
    : m_itf(itf)
  {
  }
};

}

namespace winrt::Microsoft::ReactNative
{

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

struct IJSValueReader : Windows::Foundation::IInspectable
{
  struct Itf : Windows::Foundation::IInspectable::Itf
  {
    virtual JSValueType ValueType() noexcept = 0;
    virtual bool GetNextObjectProperty(hstring &propertyName) noexcept = 0;
    virtual bool GetNextArrayItem() noexcept = 0;
    virtual hstring GetString() noexcept = 0;
    virtual bool GetBoolean() noexcept = 0;
    virtual int64_t GetInt64() noexcept = 0;
    virtual double GetDouble() noexcept = 0;
  };
  
  JSValueType ValueType() const noexcept { return get_itf()->ValueType(); }
  bool GetNextObjectProperty(hstring &propertyName) const noexcept { return get_itf()->GetNextObjectProperty(propertyName); }
  bool GetNextArrayItem() const noexcept { return get_itf()->GetNextArrayItem(); }
  hstring GetString() const noexcept { return get_itf()->GetString(); }
  bool GetBoolean() const noexcept { return get_itf()->GetBoolean(); }
  int64_t GetInt64() const noexcept { return get_itf()->GetInt64(); }
  double GetDouble() const noexcept { return get_itf()->GetDouble(); }
  
  bool GetNextObjectProperty(const std::wstring_view &propertyName) const noexcept
  {
    auto str = std::wstring(propertyName.cbegin(), propertyName.cend());
    return GetNextObjectProperty(str);
  }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IJSValueReader)
};

// IJSValueWriter.idl

struct IJSValueWriter : Windows::Foundation::IInspectable
{
  struct Itf : Windows::Foundation::IInspectable::Itf
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

  void WriteNull() const noexcept { get_itf()->WriteNull(); }
  void WriteBoolean(bool value) const noexcept { get_itf()->WriteBoolean(value); }
  void WriteInt64(int64_t value) const noexcept { get_itf()->WriteInt64(value); }
  void WriteDouble(double value) const noexcept { get_itf()->WriteDouble(value); }
  void WriteString(const winrt::hstring &value) const noexcept { get_itf()->WriteString(value); }
  void WriteObjectBegin() const noexcept { get_itf()->WriteObjectBegin(); }
  void WritePropertyName(const winrt::hstring &name) const noexcept { get_itf()->WritePropertyName(name); }
  void WriteObjectEnd() const noexcept { get_itf()->WriteObjectEnd(); }
  void WriteArrayBegin() const noexcept { get_itf()->WriteArrayBegin(); }
  void WriteArrayEnd() const noexcept { get_itf()->WriteArrayEnd(); }
  
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
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IJSValueWriter)
};

using JSValueArgWriter = std::function<void(const IJSValueWriter&)>;

// IReactPackageBuilder.idl

struct IReactPackageBuilder;

using ReactModuleProvider = std::function<void(const IReactPackageBuilder&)>;

struct IReactPackageBuilder : Windows::Foundation::IInspectable
{
  struct Itf : Windows::Foundation::IInspectable::Itf
  {
    virtual void AddModule(const hstring& moduleName, ReactModuleProvider moduleProvider) noexcept = 0;
  };
  
  void AddModule(const hstring& moduleName, const ReactModuleProvider& moduleProvider) const noexcept { get_itf()->AddModule(moduleName, moduleProvider); }
  
  void AddModule(const wchar_t* moduleName, const ReactModuleProvider& moduleProvider) const noexcept
  {
    AddModule(moduleName, moduleProvider);
  }
  
  void AddModule(const std::wstring_view& moduleName, const ReactModuleProvider& moduleProvider) const noexcept
  {
    auto str = std::wstring(moduleName.cbegin(), moduleName.cend());
    AddModule(str, moduleProvider);
  }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IReactPackageBuilder)
};

// IReactDispatcher.idl

using ReactDispatcherCallback = std::function<void()>;

struct IReactDispatcher : Windows::Foundation::IInspectable
{
  struct Itf : Windows::Foundation::IInspectable::Itf
  {
    virtual bool HasThreadAccess() noexcept = 0;
    virtual void Post(ReactDispatcherCallback callback) noexcept = 0;
  };
  
  bool HasThreadAccess() const noexcept { return get_itf()->HasThreadAccess(); }
  void Post(const ReactDispatcherCallback& callback) const noexcept { return get_itf()->Post(callback); }

  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IReactDispatcher)
};

struct ReactDispatcherHelper
{
  static IReactDispatcher CreateSerialDispatcher() noexcept
  {
    VerifyElseCrash(false);
  }
};

// IReactNonAbiValue.idl

struct IReactNonAbiValue : Windows::Foundation::IInspectable
{
  struct Itf : Windows::Foundation::IInspectable::Itf
  {
    virtual int64_t GetPtr() noexcept = 0;
  };
  
  int64_t GetPtr() const noexcept { return get_itf()->GetPtr(); }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IReactNonAbiValue)
};

// IReactPropertyBag.idl

struct IReactPropertyNamespace : Windows::Foundation::IInspectable
{
  struct Itf : Windows::Foundation::IInspectable::Itf
  {
    virtual hstring NamespaceName() noexcept = 0;
  };
  
  hstring NamespaceName() const noexcept { return get_itf()->NamespaceName(); }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IReactPropertyNamespace)
};

struct IReactPropertyName : Windows::Foundation::IInspectable
{
  struct Itf : Windows::Foundation::IInspectable::Itf
  {
    virtual hstring LocalName() noexcept = 0;
    virtual IReactPropertyNamespace Namespace() noexcept = 0;
  };
  
  hstring LocalName() const noexcept { return get_itf()->LocalName(); }
  IReactPropertyNamespace Namespace() const noexcept { return get_itf()->Namespace(); }
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IReactPropertyName)
};

struct IReactPropertyBag : Windows::Foundation::IInspectable
{
  struct Itf : Windows::Foundation::IInspectable::Itf
  {
  };
  
  WINRT_TO_MAC_MAKE_WINRT_INTERFACE(IReactPropertyBag);
};

struct ReactPropertyBagHelper
{
  static IReactPropertyNamespace GlobalNamespace() noexcept
  {
    VerifyElseCrash(false);
  }
  
  static IReactPropertyNamespace GetNamespace(const hstring& namespaceName) noexcept
  {
    VerifyElseCrash(false);
  }
  
  static IReactPropertyName GetName(IReactPropertyNamespace ns, const hstring& localName) noexcept
  {
    VerifyElseCrash(false);
  }
  
  static IReactPropertyBag CreatePropertyBag()
  {
    VerifyElseCrash(false);
  }
};
                 
}
