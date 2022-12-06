import java.util.ArrayList;
import java.util.Arrays;

public class Load {

    private static ArrayList<String> sos = new ArrayList<String>(Arrays.asList(new String[]{"libglog.so", "libfb.so", "libfbjni.so", "libfolly_json.so", "libglog_init.so", "libreact_debug.so", "libreact_render_mapbuffer.so", "libreact_utils.so", "libreact_config.so", "libyoga.so", "libjsi.so", "libreact_render_debug.so", "libreact_render_graphics.so", "liblogger.so", "libruntimeexecutor.so", "libjsinspector.so", "libreactperfloggerjni.so", "libbutter.so", "libfolly_futures.so", "libreact_render_core.so", "librrc_view.so", "libreact_render_leakchecker.so", "libreact_render_runtimescheduler.so", "librrc_unimplementedview.so", "libreactnativejni.so", "libreact_nativemodule_core.so", "libturbomodulejsijni.so", "libreact_render_attributedstring.so", "libmapbufferjni.so", "libreact_render_componentregistry.so", "librrc_root.so", "libreact_codegen_rncore.so", "libreact_render_telemetry.so", "libreact_render_mounting.so", "libreact_render_uimanager.so", "libreact_render_templateprocessor.so", "libreact_render_imagemanager.so", "libreact_render_textlayoutmanager.so", "librrc_image.so", "librrc_text.so", "libreact_render_animations.so", "libreact_render_scheduler.so", "libfabricjni.so"}));
    private static int[][]deps = {{},{},{},{0},{0},{3},{0, 4, 5},{0, 4, 5, 6},{},{1, 2},{3, 0},{3},{0, 1, 2, 3, 5},{0},{},{},{1, 2},{0},{0, 3},{18, 3, 0, 10, 5, 11, 12, 7},{0, 3, 4, 10, 5, 19, 11, 12, 9, 13},{0, 19, 14},{10, 5, 19, 14},{0, 18, 3, 4, 10, 5, 19, 11, 12, 20, 9},{1, 2, 3, 4, 22, 14, 9, 13, 10, 0, 15, 16},{2, 3, 10, 5, 24},{25, 16, 1, 2, 24, 14},{0, 17, 18, 3, 4, 5, 19, 11, 12, 6, 7, 20, 9},{1, 2, 18, 3, 0, 4, 5, 6, 7, 8, 9},{18, 3, 4, 10, 5, 19, 11, 7},{0, 18, 3, 4, 5, 19, 11, 12, 20, 9},{10, 0, 3, 9, 25, 20, 19, 12, 2, 26, 5, 11},{0, 17, 18, 3, 4, 5, 19, 11, 7, 30, 20, 9},{0, 17, 18, 3, 4, 10, 5, 19, 11, 12, 32, 7, 30, 20, 9},{0, 18, 3, 10, 5, 29, 19, 11, 12, 21, 22, 33, 8, 30, 20, 14},{0, 18, 3, 10, 29, 19, 11, 7, 8, 34},{3, 5, 19, 11, 12, 33, 9},{0, 1, 2, 18, 3, 4, 28, 5, 27, 29, 19, 11, 12, 6, 33, 32, 34, 7, 24, 9},{0, 3, 4, 10, 5, 19, 11, 12, 36, 6, 20, 9},{0, 3, 4, 10, 5, 27, 19, 11, 12, 6, 33, 37, 34, 7, 20, 9},{0, 18, 3, 4, 10, 5, 29, 19, 11, 12, 33, 34, 8, 20, 14, 9},{0, 18, 3, 10, 5, 29, 19, 11, 12, 33, 22, 35, 34, 7, 8, 30, 20, 9},{17, 1, 28, 40, 22, 41, 32, 35, 8, 30, 23, 2, 24, 31, 18, 0, 3, 4, 10, 5, 27, 29, 19, 11, 12, 36, 6, 33, 37, 34, 7, 38, 39, 20, 9}};

//    public static void main(String[] args) {
//        load("libfabricjni.so");
//    }

    private static void loadDep(String so, int idx, ArrayList<Integer> loadedSos) {
        // System.out.println("Index of " + so + ": " + sos.indexOf(so));
        // int soIndex = sos.indexOf(so);
        if(idx >=0 ) {
            int[] depss = deps[idx];
            for (int i : depss) {
                if(loadedSos.contains(i))
                    continue;

                loadDep(sos.get(i), i, loadedSos);
            }
        }

        loadedSos.add(idx);
        System.out.println("Loading " + so);
    }

    private static void load(String so) {
        // System.out.println("Index of " + so + ": " + sos.indexOf(so));
        int soIndex = sos.indexOf(so);
        ArrayList<Integer> loadedSos = new ArrayList<Integer>();
        if(soIndex >=0 ) {
            int[] depss = deps[soIndex];
            for (int i : depss) {
                loadDep(sos.get(i), i, loadedSos);
            }
        }
        System.out.println("Loading " + so);
    }
}