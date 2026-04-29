/**
 * Centralised W3C error codes. Keeping them as typed constants lets us
 * reference codes by name in source and still get the canonical string.
 *
 * Not exhaustive — populated as features are implemented.
 */

// Static XPath errors (parse/static analysis)
export const XPST0003 = 'XPST0003'; // syntax error
export const XPST0008 = 'XPST0008'; // unknown variable/function
export const XPST0017 = 'XPST0017'; // unknown function call
export const XPST0051 = 'XPST0051'; // unknown atomic type
export const XPST0081 = 'XPST0081'; // unknown namespace prefix

// Dynamic XPath errors
export const XPDY0002 = 'XPDY0002'; // context item absent
export const XPDY0050 = 'XPDY0050'; // treat as failure

// Type errors
export const XPTY0004 = 'XPTY0004'; // type mismatch
export const XPTY0018 = 'XPTY0018'; // last step mixes nodes and atomics
export const XPTY0019 = 'XPTY0019'; // non-node in path step
export const XPTY0020 = 'XPTY0020'; // axis step context item is not a node

// Functions & Operators
export const FORG0001 = 'FORG0001'; // invalid value for cast
export const FORG0006 = 'FORG0006'; // invalid argument type to fn:min/max/etc
export const FORX0001 = 'FORX0001'; // invalid regular expression flags
export const FORX0002 = 'FORX0002'; // invalid regular expression pattern
export const FORX0003 = 'FORX0003'; // regular expression matches a zero-length string
export const FORX0004 = 'FORX0004'; // invalid replacement string
export const FOAR0001 = 'FOAR0001'; // division by zero
export const FOCA0002 = 'FOCA0002'; // invalid lexical value
export const FOCH0001 = 'FOCH0001'; // invalid XML character codepoint
export const FOER0000 = 'FOER0000'; // fn:error with no args

// Static XSLT errors
export const XTSE0010 = 'XTSE0010'; // unknown XSLT element
export const XTSE0165 = 'XTSE0165'; // import/include error
export const XTSE0500 = 'XTSE0500'; // stylesheet module missing version

// Dynamic XSLT errors
export const XTDE0040 = 'XTDE0040'; // no match for initial mode
export const XTDE0160 = 'XTDE0160'; // no match for apply-templates
export const XTDE1360 = 'XTDE1360'; // current-group outside for-each-group

// Serialization
export const SENR0001 = 'SENR0001'; // item is attribute or namespace node
export const SERE0003 = 'SERE0003'; // invalid XML 1.0 character

export type ErrorCode = string;
