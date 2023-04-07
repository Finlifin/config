const std = @import("std");


// zig fmt: off
test "foo bar" {
    std.debug.print("foo", .{});
}
 
// zig fmt: on

// test "foo bar" {
//     return error.Foo;
// }

const U = union(enum) {
    a: bool,
    b,
    @"{",
    @"foo bar"
};
const @"{" = 1;