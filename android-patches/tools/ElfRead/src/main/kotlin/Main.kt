
import com.facebook.soloader.ElfFileChannel
import com.facebook.soloader.NativeDeps
import java.io.File
import kotlinx.cli.*
import java.text.SimpleDateFormat
import java.util.*
import kotlin.collections.ArrayList
import kotlin.collections.LinkedHashMap
import kotlin.io.path.Path

//val soRoot = "/mnt/d/RNApp68/android/app/build/react-ndk/exported/x86_64";
// val soRoot = "C:\\rn_libs\\x86_64"
val rnRootDefault = "D:\\github\\react-native-macos"
val soRelativePathDefault = "ReactAndroid\\build\\intermediates\\stripped_native_libs\\release\\out\\lib\\x86_64"

// val soRootDefault = "/mnt/d/github/react-native-macos/ReactAndroid/build/intermediates/stripped_native_libs/release/out/lib/x86_64"
// val soRootDefault = "C:\\x86_64"
// val blackList = listOf("libc++_shared.so", "libandroid.so", "libc.so", "libdl.so", "libm.so", "liblog.so")
// val assumedList = listOf("libhermes.so")

fun enumDeps(soRoot: String, processedSos: LinkedHashMap<String, ArrayList<String>>, blackList: List<String>, assumedList: List<String>, soName: String) {
    if(soName in blackList || soName in processedSos.keys)
        return;

    val soPath = "${soRoot}${File.separator}${soName}";
    val soFile = File(soPath);

    if(!soFile.exists()) {
        if(assumedList.contains(soName)) {
            processedSos[soName] = ArrayList<String>();
        }
        return;
    }

    val elf = ElfFileChannel(soFile);
    val deps = NativeDeps.getDependencies(soName, elf)

    val filteredSos = deps.asList().minus(blackList)
    processedSos[soName] = ArrayList<String>(filteredSos);

    deps.forEach { enumDeps(soRoot, processedSos, blackList, assumedList, it)  }
}

fun printMap(processedSos: LinkedHashMap<String, java.util.ArrayList<String>>): ArrayList<String> {
    var lines = ArrayList<String>()
    for(key in processedSos.keys) {
        lines.add(key + " :: " + processedSos[key])
    }

    return lines;
}


fun printMap2(processedSos: LinkedHashMap<Int, java.util.ArrayList<Int>>) {
    for(key in processedSos.keys) {
        println("${key} :: ${processedSos[key]}")
    }
}

fun listEquals(list1: List<String>, list2: MutableSet<String>): Boolean {
    return (list1.size == list2.size && list1.containsAll(list2) && list2.containsAll(list1))
}

fun printProcessedMap(processedSos: LinkedHashMap<String, ArrayList<String>>,
                      soListInLoadOrder: ArrayList<String>,
                      processedSosIndexed : LinkedHashMap<Int, ArrayList<Int>>,
                      processedSosIndexed2 : ArrayList<ArrayList<Int>>) {
    var loadedSos = ArrayList<String>();
    var soListInLoadOrderTmp = ArrayList<String>();

    val allSos = processedSos.keys
    while(true) {
        if(listEquals(loadedSos, allSos))
            break;

        for (key in processedSos.keys.minus(loadedSos)) {
            val depSos = processedSos[key];
            if (loadedSos.containsAll(depSos!!)) {
                loadedSos.add(key)

                soListInLoadOrder.add(key.substring(3, key.lastIndexOf('.')));
                soListInLoadOrderTmp.add(key);
                var depsIndexed = processedSos[key]?.map { soListInLoadOrderTmp.indexOf(it) } as ArrayList<Int>
                processedSosIndexed[soListInLoadOrderTmp.indexOf(key)] = depsIndexed
                processedSosIndexed2.add(depsIndexed)
            }
        }
    }
}

fun createNuSpec(soRoot: String, filePath: String, depsFilePath: String) {
    val prefix = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
            "<package xmlns=\"http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd\">\n" +
            "  <metadata>\n" +
            "    <id>OfficeReact.Android</id>\n" +
            "    <version>\$buildNumber\$</version>\n" +
            "    <description>Contains Android Implementation of React-Native</description>\n" +
            "    <authors>Microsoft</authors>\n" +
            "    <projectUrl>https://github.com/microsoft/react-native</projectUrl>\n" +
            "    <repository type=\"git\" url=\"https://github.com/microsoft/react-native.git\"  commit=\"\$commitId\$\"/>\n" +
            "    <requireLicenseAcceptance>false</requireLicenseAcceptance>\n" +
            "  </metadata>\n" +
            "\n" +
            "  <files>\n\n"

    val suffix = "  </files>\n" +
            "</package>"

    val misc = "\n" +
            "    <!-- AAR and POM -->\n" +
            "    <file src=\"..\\android\\com\\**\\*\" target=\"maven\\com\"/>\n" +
            "\n" +
            "    <!-- Headers, ideally we'd only exported the needed headers, not the complete list -->\n" +
            "    <file src=\".\\build\\third-party-ndk\\double-conversion\\double-conversion\\*.h\" target=\"inc\\double-conversion\"/>\n" +
            "    <file src=\".\\build\\third-party-ndk\\folly\\**\\*.*\" target=\"inc\" />\n" +
            "    <file src=\".\\build\\third-party-ndk\\glog\\exported\\glog\\*.h\" target=\"inc\\glog\" />\n" +
            "    <file src=\".\\build\\third-party-ndk\\jsc\\JavaScriptCore\\*.h\" target=\"inc\\jsc\"/>\n" +
            "    <file src=\"..\\ReactCommon\\cxxreact\\**\\*.h\" target=\"inc\\cxxreact\"/>\n" +
            "    <file src=\"..\\ReactCommon\\runtimeexecutor\\ReactCommon\\*.h\" target=\"inc\\ReactCommon\"/>\n" +
            "    <file src=\"..\\ReactCommon\\callinvoker\\ReactCommon\\*.h\" target=\"inc\\ReactCommon\"/>\n" +
            "    <file src=\"..\\ReactCommon\\jsi\\**\\*.h\" target=\"inc\\jsi\"/>\n" +
            "    <file src=\"..\\ReactCommon\\yoga\\yoga\\**\\*.h\" target=\"inc\\Yoga\"/>\n" +
            "    <file src=\"..\\android\\dependencies\\**\\*.*\" target=\"dependencies\"/>\n"


    val nuspecFile = File(filePath)
    if(!nuspecFile.exists())
        nuspecFile.createNewFile();


    nuspecFile.writeText(prefix)

    val strippedSoSource = "build\\intermediates\\stripped_native_libs\\release\\out\\lib"
    val strippedSoTarget = "lib"

    val unstrippedSoSource = "build\\intermediates\\merged_native_libs\\release\\out\\lib"
    val unstrippedSoTarget = "lib"

    // val platforms = arrayOf<String>("x86", "x86_64", "arm", "arm64")
    val platforms = arrayOf<String>("x86", "x86_64", "armeabi-v7a", "arm64-v8a")
    val platformsMap = mapOf("x86" to "droidx86", "x86_64" to "droidx64", "armeabi-v7a" to "droidarm", "arm64-v8a" to "droidarm64")

    File(soRoot ).walk().forEach {
        if(it.path.equals(soRoot))
            return@forEach

        val fileName =it.name

        nuspecFile.appendText("    <!-- ${fileName} -->\n")
        platforms.forEach {
            val platform = it

            val source = "${strippedSoSource}\\${platform}"
            val target = "${strippedSoTarget}\\${platformsMap[platform]}"

            val unStrippedSource = "${unstrippedSoSource}\\${platform}"
            val unStrippedTarget = "${unstrippedSoTarget}\\${platformsMap[platform]}\\unstripped"

            nuspecFile.appendText("    <file src=\"${source}\\${fileName}\" target=\"${target}\"/>\n")
            nuspecFile.appendText("    <file src=\"${unStrippedSource}\\${fileName}\" target=\"${unStrippedTarget}\"/>\n")
            nuspecFile.appendText("\n")
        }

        nuspecFile.appendText("\n")
    }

    nuspecFile.appendText(misc)

    nuspecFile.appendText("    <file src=\"${depsFilePath}\" target=\"lib\\${File(depsFilePath).name}\"/>\n")

    nuspecFile.appendText(suffix)

}

fun createDepsFile(depsFilePath: String, sosStr: String, depsStr: String, depLines: ArrayList<String>) {
    val depsFile = File(depsFilePath)
    if(!depsFile.exists())
        depsFile.createNewFile();

    depsFile.writeText("\n    <!-- Dependency details -->\n")
    depLines.forEach( {depsFile.appendText("${it}\n") })
    depsFile.appendText("\n")
    depsFile.appendText(sosStr)
    depsFile.appendText("\n")
    depsFile.appendText(depsStr)
    depsFile.appendText("\n")
}

fun main(args: Array<String>) {
    val parser = kotlinx.cli.ArgParser("ElfRead")
    val rnRootArg by parser.option(ArgType.String, shortName = "rn", description = "Absolute path of built React Native Clone").default(rnRootDefault)
    val soRelativePathArg by parser.option(ArgType.String, shortName = "sp", description = "Relative path of SO files in built React Native Clone").default(soRelativePathDefault)
    val soRootOverrideArg by parser.option(ArgType.String, shortName = "sr", description = "SO Root override")
    val soFilesArg by parser.option(ArgType.String, shortName = "so", description = "Command separated list of root SO files").default("reactnativejni,fabricjni,v8executor,hermes-executor-debug,hermes-executor-release")
    val ignoreListArg by parser.option(ArgType.String, shortName = "ig", description = "Command separated list of SO files to be ignored").default("c++_shared,android,c,dl,m,log")
    val bypassListArg by parser.option(ArgType.String, shortName = "bp", description = "Command separated list of SO files to be included without checking for existence and without analyzing dependencies").default("hermes")
    val tmpPathArg by parser.option(ArgType.String, shortName = "tm", description = "Temporary file path").default("c:\\tmp")
    parser.parse(args)

    var soRoot: String
    if(!soRootOverrideArg.isNullOrEmpty()) {
        soRoot = soRootOverrideArg as String;
    } else {
        soRoot = "${rnRootArg}${File.separator}${soRelativePathArg}"
    }

    var rootSoFiles = soFilesArg.split(",").map { "lib${it}.so" }
    var ignoreSoFiles = ignoreListArg.split(",").map { "lib${it}.so" }
    var bypassSoFiles = bypassListArg.split(",").map { "lib${it}.so" }

    val timeStamp: String = SimpleDateFormat("yyyyMMdd_HHmmss").format(Date())
    var nuspecFilePath = Path(rnRootArg, "ReactAndroid${File.separator}ReactAndroid.nuspec")
    var depsFilePath = Path(tmpPathArg, "rnlibs_deps_${timeStamp}.txt")

    val processedSos = LinkedHashMap<String, ArrayList<String>>();
    val soListInLoadOrder = ArrayList<String>();
    val processedSosIndexed = LinkedHashMap<Int, ArrayList<Int>>();
    val processedSosIndexed2 = ArrayList<ArrayList<Int>>();

    rootSoFiles.forEach { enumDeps(soRoot, processedSos, ignoreSoFiles, bypassSoFiles, it) }

    val depLines = printMap(processedSos);
    printProcessedMap(processedSos, soListInLoadOrder, processedSosIndexed, processedSosIndexed2);

    var sosStr = ("[" + soListInLoadOrder.map { "\"" + it + "\"" }.joinToString(",") + "]")
    var depsStr = "{" + processedSosIndexed2.joinToString(",").replace('[', '{').replace(']', '}') + "}";

    println(sosStr)
    println(depsStr)
    println(nuspecFilePath)

    createDepsFile(depsFilePath.toString(), sosStr, depsStr, depLines);
    createNuSpec(soRoot, nuspecFilePath.toString(), depsFilePath.toString())
    return
}
