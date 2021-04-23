//
//  JSIRuntimeInitializeStateNotifier-C-Interface.h
//
// TODO(OSS Candidate ISS#2710739)

// This is the C function that will be used to invoke the Objctive-C notification posting method from C++
#ifdef __cplusplus
extern "C"
#endif
void NotifyRuntimeInitializationEnd(void);
