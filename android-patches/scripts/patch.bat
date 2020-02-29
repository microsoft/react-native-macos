set PATCHES=BuildAndThirdPartyFixes DialogModule UIEditText UIScroll UITextFont Accessibility OfficeRNHost SecurityFixes V8Integration AnnotationProcessing
set PATCHSTORE=%~dp0\..\patches-droid-office-grouped
set LOGFOLDER=%~dp0\..\logs

set RUNFROMFORK=1
if '%RUNFROMFORK%'=='1' (
  set TARGETREPO=%~dp0\..\..
) else (
  REM Custom dev.
  set TARGETREPO=D:\work\github\mgan-react-native
)

set RUNBUNDLE=1
if '%RUNBUNDLE%'=='1' (
set SCRIPT=%~dp0\..\bundle\bundle.js
) else (
REM Make sure to npm install.
  set SCRIPT=%~dp0\..\dist\index.js
)

echo "Applying patches .."
node %SCRIPT% patch %TARGETREPO% %PATCHES% --patch-store %PATCHSTORE% --log-folder %LOGFOLDER%