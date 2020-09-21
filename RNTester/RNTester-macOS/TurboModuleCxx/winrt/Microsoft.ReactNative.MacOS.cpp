#include "Microsoft.ReactNative.h"

namespace winrt::Microsoft::ReactNative
{

struct MacOSReactContext : implements<MacOSReactContext, IReactContext>
{
  std::shared_ptr<facebook::react::CallInvoker> _jsInvoker;
  
  MacOSReactContext(const std::shared_ptr<facebook::react::CallInvoker>& jsInvoker)
    : _jsInvoker(jsInvoker)
  {
  }
  
  IReactPropertyBag Properties() const noexcept
  {
    VerifyElseCrash(false);
  }
  
  IReactNotificationService Notifications() const noexcept
  {
    VerifyElseCrash(false);
  }
  
  IReactDispatcher UIDispatcher() const noexcept
  {
    VerifyElseCrash(false);
  }
  
  IReactDispatcher JSDispatcher() const noexcept
  {
    VerifyElseCrash(false);
  }
  
  void CallJSFunction(const hstring& moduleName, const hstring& methodName, const JSValueArgWriter& paramsArgWriter) noexcept
  {
    VerifyElseCrash(false);
  }
  
  void EmitJSEvent(const hstring& eventEmitterName, const hstring& eventName, const JSValueArgWriter& paramsArgWriter) noexcept
  {
    VerifyElseCrash(false);
  }
};

IReactContext CreateMacOSReactContext(const std::shared_ptr<facebook::react::CallInvoker>& jsInvoker) noexcept
{
  return make<MacOSReactContext>(jsInvoker);
}
                 
}
