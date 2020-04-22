BUILD_DEPS_DIR=build_deps

rm -rf $BUILD_DEPS_DIR
mkdir $BUILD_DEPS_DIR

ln -s ReactAndroid/packages/boost.1.68.0.0/lib/native/include/boost $BUILD_DEPS_DIR/boost
ln -s double-conversion/double-conversion $BUILD_DEPS_DIR/double-conversion
ln -s Folly/ $BUILD_DEPS_DIR/Folly
ln -s glog/ $BUILD_DEPS_DIR/glog

ls -l
ls -l $BUILD_DEPS_DIR
ls -l $BUILD_DEPS_DIR/boost
ls -l $BUILD_DEPS_DIR/boost/accumulators