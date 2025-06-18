# UBSAN Fix Summary

This document summarizes the UBSAN fix that has been applied to multiple stable branches to address issue #2516.

## Problem

The `validAttributesForMarkedText` method in `RCTUITextField` could return nil when the current editor's method returns nil, causing UBSAN (UndefinedBehaviorSanitizer) warnings since the method is marked as returning a non-null `NSArray`.

## Solution

Applied the nil-coalescing operator `?: @[]` to ensure the method always returns a valid array.

**Before:**
```objc
- (NSArray<NSAttributedStringKey> *)validAttributesForMarkedText
{
	return ((NSTextView *)self.currentEditor).validAttributesForMarkedText;
}
```

**After:**
```objc
- (NSArray<NSAttributedStringKey> *)validAttributesForMarkedText
{
	return ((NSTextView *)self.currentEditor).validAttributesForMarkedText ?: @[];
}
```

## Branches and Commits

The fix has been applied to the following stable branches:

| Branch | Commit Hash | Line Number |
|--------|-------------|-------------|
| fix-ubsan-0.78-stable | 1538db1621 | Line 164 |
| fix-ubsan-0.77-stable | 391a490906 | Line 156 |
| fix-ubsan-0.76-stable | b29e6f8be0 | Line 156 |
| fix-ubsan-0.75-stable | 91865fc60a | Line 156 |
| fix-ubsan-0.74-stable | d213b40a9f | Line 156 |

## Next Steps

Each branch is ready for creating individual PRs to the corresponding stable branch. The changes are minimal (1 insertion, 1 deletion per branch) and surgical, maintaining consistency with the original fix while ensuring all stable branches benefit from the UBSAN compliance improvement.

## File Modified

- `packages/react-native/Libraries/Text/TextInput/Singleline/RCTUITextField.mm`

Each change is exactly 1 line modified, making this a minimal fix that addresses the UBSAN issue without affecting other functionality.