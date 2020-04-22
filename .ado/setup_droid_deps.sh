BUILD_DEPS_DIR=build_deps

rm -rf $BUILD_DEPS_DIR
mkdir $BUILD_DEPS_DIR

ln ReactAndroid/packages/boost.1.68.0.0/lib/native/include/boost $BUILD_DEPS_DIR/boost
ln double-conversion/double-conversion $BUILD_DEPS_DIR/double-conversion
ln Folly/ $BUILD_DEPS_DIR/Folly
ln glog/ $BUILD_DEPS_DIR/glog

ls -l
ls -l $BUILD_DEPS_DIR
ls -l $BUILD_DEPS_DIR/boost
ls -l $BUILD_DEPS_DIR/boost/accumulators