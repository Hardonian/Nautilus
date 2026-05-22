// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { shellQuote } from "./shell-quote.js";

describe("shellQuote", () => {
  it("returns '' for empty strings", () => {
    expect(shellQuote("")).toBe("''");
  });

  it("returns safe alphanumeric strings unquoted", () => {
    expect(shellQuote("foo")).toBe("foo");
    expect(shellQuote("foo-bar")).toBe("foo-bar");
    expect(shellQuote("foo_bar")).toBe("foo_bar");
    expect(shellQuote("foo.bar")).toBe("foo.bar");
    expect(shellQuote("123")).toBe("123");
  });

  it("wraps strings with spaces in single quotes", () => {
    expect(shellQuote("foo bar")).toBe("'foo bar'");
    expect(shellQuote(" foo")).toBe("' foo'");
    expect(shellQuote("bar ")).toBe("'bar '");
  });

  it("escapes single quotes properly", () => {
    expect(shellQuote("foo'bar")).toBe("'foo'\\''bar'");
    expect(shellQuote("'foo'")).toBe("''\\''foo'\\'''");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });

  it("wraps strings with special shell characters in single quotes", () => {
    expect(shellQuote("$foo")).toBe("'$foo'");
    expect(shellQuote("foo>bar")).toBe("'foo>bar'");
    expect(shellQuote("foo|bar")).toBe("'foo|bar'");
    expect(shellQuote("foo&bar")).toBe("'foo&bar'");
    expect(shellQuote("foo;bar")).toBe("'foo;bar'");
    expect(shellQuote("foo\\bar")).toBe("'foo\\bar'");
    expect(shellQuote("`foo`")).toBe("'`foo`'");
    expect(shellQuote("\"foo\"")).toBe("'\"foo\"'");
    expect(shellQuote("foo\nbar")).toBe("'foo\nbar'");
    expect(shellQuote("foo\tbar")).toBe("'foo\tbar'");
    expect(shellQuote("*")).toBe("'*'");
    expect(shellQuote("?")).toBe("'?'");
    expect(shellQuote("~")).toBe("'~'");
  });
});
