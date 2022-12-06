package android.content;

import java.io.File;

public class Context {
    public class ApplicationInfo {

        public String sourceDir;
        public File dataDir;
    }
    public ApplicationInfo getApplicationInfo() {
        return new ApplicationInfo();
    }
}
