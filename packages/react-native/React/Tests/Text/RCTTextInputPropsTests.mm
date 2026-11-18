/*
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// [macOS]

#import <TargetConditionals.h>

#if TARGET_OS_OSX
#import <XCTest/XCTest.h>

#include <react/renderer/components/iostextinput/TextInputProps.h>
#include <react/renderer/core/RawPropsParser.h>

using namespace facebook::react;

static TextInputProps textInputPropsFromDynamic(const folly::dynamic &value, const TextInputProps &sourceProps = {})
{
  ContextContainer contextContainer;
  PropsParserContext context{-1, contextContainer};
  RawPropsParser parser;
  parser.prepare<TextInputProps>();
  RawProps rawProps{value};
  rawProps.parse(parser);
  return TextInputProps{context, sourceProps, rawProps};
}

@interface RCTTextInputPropsTests : XCTestCase
@end

@implementation RCTTextInputPropsTests

- (void)testSubmitKeyModifiersAndClearText
{
  const auto props = textInputPropsFromDynamic(
      folly::dynamic::object("clearTextOnSubmit", true)(
          "submitKeyEvents",
          folly::dynamic::array(
              folly::dynamic::object("key", "Enter")("metaKey", true),
              folly::dynamic::object("key", "F1")("altKey", true)("shiftKey", true)("ctrlKey", true)(
                  "functionKey", true))));

  XCTAssertTrue(props.traits.clearTextOnSubmit);
  XCTAssertEqual(props.traits.submitKeyEvents.size(), 2u);
  if (props.traits.submitKeyEvents.size() != 2) {
    return;
  }
  const auto &commandEnter = props.traits.submitKeyEvents[0];
  XCTAssertTrue(commandEnter.key == "Enter");
  XCTAssertTrue(commandEnter.metaKey);
  XCTAssertFalse(commandEnter.altKey || commandEnter.shiftKey || commandEnter.ctrlKey || commandEnter.functionKey);
  const auto &functionKey = props.traits.submitKeyEvents[1];
  XCTAssertTrue(functionKey.key == "F1");
  XCTAssertTrue(functionKey.altKey && functionKey.shiftKey && functionKey.ctrlKey && functionKey.functionKey);
  XCTAssertFalse(functionKey.metaKey);
}

- (void)testSubmitTraitsUpdatesAndRemoval
{
  const auto initial = textInputPropsFromDynamic(
      folly::dynamic::object("clearTextOnSubmit", true)(
          "submitKeyEvents", folly::dynamic::array(folly::dynamic::object("key", "Enter")("metaKey", true))));
  const auto unchanged = textInputPropsFromDynamic(folly::dynamic::object(), initial);
  XCTAssertTrue(unchanged.traits.clearTextOnSubmit);
  XCTAssertEqual(unchanged.traits.submitKeyEvents.size(), 1u);

  const auto updated = textInputPropsFromDynamic(
      folly::dynamic::object("clearTextOnSubmit", false)(
          "submitKeyEvents", folly::dynamic::array(folly::dynamic::object("key", "Enter")("shiftKey", true))),
      initial);
  XCTAssertFalse(updated.traits.clearTextOnSubmit);
  XCTAssertEqual(updated.traits.submitKeyEvents.size(), 1u);
  if (updated.traits.submitKeyEvents.size() == 1) {
    XCTAssertTrue(updated.traits.submitKeyEvents[0].shiftKey);
    XCTAssertFalse(updated.traits.submitKeyEvents[0].metaKey);
  }

  const auto removed = textInputPropsFromDynamic(
      folly::dynamic::object("clearTextOnSubmit", nullptr)("submitKeyEvents", nullptr), initial);
  XCTAssertFalse(removed.traits.clearTextOnSubmit);
  XCTAssertTrue(removed.traits.submitKeyEvents.empty());

  const auto emptyKeys =
      textInputPropsFromDynamic(folly::dynamic::object("submitKeyEvents", folly::dynamic::array()), initial);
  XCTAssertTrue(emptyKeys.traits.clearTextOnSubmit);
  XCTAssertTrue(emptyKeys.traits.submitKeyEvents.empty());
}

- (void)testPastedTypesSupportsStringsAndArrays
{
  const auto scalar = textInputPropsFromDynamic(folly::dynamic::object("pastedTypes", "string"));
  XCTAssertTrue(scalar.traits.pastedTypes == std::vector<PastedTypesType>{PastedTypesType::String});

  const auto array = textInputPropsFromDynamic(
      folly::dynamic::object("pastedTypes", folly::dynamic::array("fileUrl", "image", "string")));
  const std::vector<PastedTypesType> expected{
      PastedTypesType::FileUrl, PastedTypesType::Image, PastedTypesType::String};
  XCTAssertTrue(array.traits.pastedTypes == expected);
}

- (void)testInvalidPastedTypesUseDefault
{
  const auto initial = textInputPropsFromDynamic(folly::dynamic::object("pastedTypes", "image"));
  for (const auto &invalid :
       {folly::dynamic("unsupported"),
        folly::dynamic::array("string", "unsupported"),
        folly::dynamic(42),
        folly::dynamic::array("string", 42)}) {
    const auto props = textInputPropsFromDynamic(folly::dynamic::object("pastedTypes", invalid), initial);
    XCTAssertTrue(props.traits.pastedTypes.empty());
  }
}

@end
#endif
