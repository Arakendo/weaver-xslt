var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@xmldom/xmldom/lib/conventions.js
var require_conventions = __commonJS({
  "node_modules/@xmldom/xmldom/lib/conventions.js"(exports) {
    "use strict";
    function find(list, predicate, ac) {
      if (ac === void 0) {
        ac = Array.prototype;
      }
      if (list && typeof ac.find === "function") {
        return ac.find.call(list, predicate);
      }
      for (var i = 0; i < list.length; i++) {
        if (hasOwn(list, i)) {
          var item = list[i];
          if (predicate.call(void 0, item, i, list)) {
            return item;
          }
        }
      }
    }
    function freeze(object, oc) {
      if (oc === void 0) {
        oc = Object;
      }
      if (oc && typeof oc.getOwnPropertyDescriptors === "function") {
        object = oc.create(null, oc.getOwnPropertyDescriptors(object));
      }
      return oc && typeof oc.freeze === "function" ? oc.freeze(object) : object;
    }
    function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
    }
    function assign(target, source) {
      if (target === null || typeof target !== "object") {
        throw new TypeError("target is not an object");
      }
      for (var key in source) {
        if (hasOwn(source, key)) {
          target[key] = source[key];
        }
      }
      return target;
    }
    var HTML_BOOLEAN_ATTRIBUTES = freeze({
      allowfullscreen: true,
      async: true,
      autofocus: true,
      autoplay: true,
      checked: true,
      controls: true,
      default: true,
      defer: true,
      disabled: true,
      formnovalidate: true,
      hidden: true,
      ismap: true,
      itemscope: true,
      loop: true,
      multiple: true,
      muted: true,
      nomodule: true,
      novalidate: true,
      open: true,
      playsinline: true,
      readonly: true,
      required: true,
      reversed: true,
      selected: true
    });
    function isHTMLBooleanAttribute(name) {
      return hasOwn(HTML_BOOLEAN_ATTRIBUTES, name.toLowerCase());
    }
    var HTML_VOID_ELEMENTS = freeze({
      area: true,
      base: true,
      br: true,
      col: true,
      embed: true,
      hr: true,
      img: true,
      input: true,
      link: true,
      meta: true,
      param: true,
      source: true,
      track: true,
      wbr: true
    });
    function isHTMLVoidElement(tagName) {
      return hasOwn(HTML_VOID_ELEMENTS, tagName.toLowerCase());
    }
    var HTML_RAW_TEXT_ELEMENTS = freeze({
      script: false,
      style: false,
      textarea: true,
      title: true
    });
    function isHTMLRawTextElement(tagName) {
      var key = tagName.toLowerCase();
      return hasOwn(HTML_RAW_TEXT_ELEMENTS, key) && !HTML_RAW_TEXT_ELEMENTS[key];
    }
    function isHTMLEscapableRawTextElement(tagName) {
      var key = tagName.toLowerCase();
      return hasOwn(HTML_RAW_TEXT_ELEMENTS, key) && HTML_RAW_TEXT_ELEMENTS[key];
    }
    function isHTMLMimeType(mimeType) {
      return mimeType === MIME_TYPE.HTML;
    }
    function hasDefaultHTMLNamespace(mimeType) {
      return isHTMLMimeType(mimeType) || mimeType === MIME_TYPE.XML_XHTML_APPLICATION;
    }
    var MIME_TYPE = freeze({
      /**
       * `text/html`, the only mime type that triggers treating an XML document as HTML.
       *
       * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
       * @see https://en.wikipedia.org/wiki/HTML Wikipedia
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
       * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring
       *      WHATWG HTML Spec
       */
      HTML: "text/html",
      /**
       * `application/xml`, the standard mime type for XML documents.
       *
       * @see https://www.iana.org/assignments/media-types/application/xml IANA MimeType
       *      registration
       * @see https://tools.ietf.org/html/rfc7303#section-9.1 RFC 7303
       * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
       */
      XML_APPLICATION: "application/xml",
      /**
       * `text/xml`, an alias for `application/xml`.
       *
       * @see https://tools.ietf.org/html/rfc7303#section-9.2 RFC 7303
       * @see https://www.iana.org/assignments/media-types/text/xml IANA MimeType registration
       * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
       */
      XML_TEXT: "text/xml",
      /**
       * `application/xhtml+xml`, indicates an XML document that has the default HTML namespace,
       * but is parsed as an XML document.
       *
       * @see https://www.iana.org/assignments/media-types/application/xhtml+xml IANA MimeType
       *      registration
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument WHATWG DOM Spec
       * @see https://en.wikipedia.org/wiki/XHTML Wikipedia
       */
      XML_XHTML_APPLICATION: "application/xhtml+xml",
      /**
       * `image/svg+xml`,
       *
       * @see https://www.iana.org/assignments/media-types/image/svg+xml IANA MimeType registration
       * @see https://www.w3.org/TR/SVG11/ W3C SVG 1.1
       * @see https://en.wikipedia.org/wiki/Scalable_Vector_Graphics Wikipedia
       */
      XML_SVG_IMAGE: "image/svg+xml"
    });
    var _MIME_TYPES = Object.keys(MIME_TYPE).map(function(key) {
      return MIME_TYPE[key];
    });
    function isValidMimeType(mimeType) {
      return _MIME_TYPES.indexOf(mimeType) > -1;
    }
    var NAMESPACE = freeze({
      /**
       * The XHTML namespace.
       *
       * @see http://www.w3.org/1999/xhtml
       */
      HTML: "http://www.w3.org/1999/xhtml",
      /**
       * The SVG namespace.
       *
       * @see http://www.w3.org/2000/svg
       */
      SVG: "http://www.w3.org/2000/svg",
      /**
       * The `xml:` namespace.
       *
       * @see http://www.w3.org/XML/1998/namespace
       */
      XML: "http://www.w3.org/XML/1998/namespace",
      /**
       * The `xmlns:` namespace.
       *
       * @see https://www.w3.org/2000/xmlns/
       */
      XMLNS: "http://www.w3.org/2000/xmlns/"
    });
    exports.assign = assign;
    exports.find = find;
    exports.freeze = freeze;
    exports.HTML_BOOLEAN_ATTRIBUTES = HTML_BOOLEAN_ATTRIBUTES;
    exports.HTML_RAW_TEXT_ELEMENTS = HTML_RAW_TEXT_ELEMENTS;
    exports.HTML_VOID_ELEMENTS = HTML_VOID_ELEMENTS;
    exports.hasDefaultHTMLNamespace = hasDefaultHTMLNamespace;
    exports.hasOwn = hasOwn;
    exports.isHTMLBooleanAttribute = isHTMLBooleanAttribute;
    exports.isHTMLRawTextElement = isHTMLRawTextElement;
    exports.isHTMLEscapableRawTextElement = isHTMLEscapableRawTextElement;
    exports.isHTMLMimeType = isHTMLMimeType;
    exports.isHTMLVoidElement = isHTMLVoidElement;
    exports.isValidMimeType = isValidMimeType;
    exports.MIME_TYPE = MIME_TYPE;
    exports.NAMESPACE = NAMESPACE;
  }
});

// node_modules/@xmldom/xmldom/lib/errors.js
var require_errors = __commonJS({
  "node_modules/@xmldom/xmldom/lib/errors.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    function extendError(constructor, writableName) {
      constructor.prototype = Object.create(Error.prototype, {
        constructor: { value: constructor },
        name: { value: constructor.name, enumerable: true, writable: writableName }
      });
    }
    var DOMExceptionName = conventions.freeze({
      /**
       * the default value as defined by the spec
       */
      Error: "Error",
      /**
       * @deprecated
       * Use RangeError instead.
       */
      IndexSizeError: "IndexSizeError",
      /**
       * @deprecated
       * Just to match the related static code, not part of the spec.
       */
      DomstringSizeError: "DomstringSizeError",
      HierarchyRequestError: "HierarchyRequestError",
      WrongDocumentError: "WrongDocumentError",
      InvalidCharacterError: "InvalidCharacterError",
      /**
       * @deprecated
       * Just to match the related static code, not part of the spec.
       */
      NoDataAllowedError: "NoDataAllowedError",
      NoModificationAllowedError: "NoModificationAllowedError",
      NotFoundError: "NotFoundError",
      NotSupportedError: "NotSupportedError",
      InUseAttributeError: "InUseAttributeError",
      InvalidStateError: "InvalidStateError",
      SyntaxError: "SyntaxError",
      InvalidModificationError: "InvalidModificationError",
      NamespaceError: "NamespaceError",
      /**
       * @deprecated
       * Use TypeError for invalid arguments,
       * "NotSupportedError" DOMException for unsupported operations,
       * and "NotAllowedError" DOMException for denied requests instead.
       */
      InvalidAccessError: "InvalidAccessError",
      /**
       * @deprecated
       * Just to match the related static code, not part of the spec.
       */
      ValidationError: "ValidationError",
      /**
       * @deprecated
       * Use TypeError instead.
       */
      TypeMismatchError: "TypeMismatchError",
      SecurityError: "SecurityError",
      NetworkError: "NetworkError",
      AbortError: "AbortError",
      /**
       * @deprecated
       * Just to match the related static code, not part of the spec.
       */
      URLMismatchError: "URLMismatchError",
      QuotaExceededError: "QuotaExceededError",
      TimeoutError: "TimeoutError",
      InvalidNodeTypeError: "InvalidNodeTypeError",
      DataCloneError: "DataCloneError",
      EncodingError: "EncodingError",
      NotReadableError: "NotReadableError",
      UnknownError: "UnknownError",
      ConstraintError: "ConstraintError",
      DataError: "DataError",
      TransactionInactiveError: "TransactionInactiveError",
      ReadOnlyError: "ReadOnlyError",
      VersionError: "VersionError",
      OperationError: "OperationError",
      NotAllowedError: "NotAllowedError",
      OptOutError: "OptOutError"
    });
    var DOMExceptionNames = Object.keys(DOMExceptionName);
    function isValidDomExceptionCode(value) {
      return typeof value === "number" && value >= 1 && value <= 25;
    }
    function endsWithError(value) {
      return typeof value === "string" && value.substring(value.length - DOMExceptionName.Error.length) === DOMExceptionName.Error;
    }
    function DOMException(messageOrCode, nameOrMessage) {
      if (isValidDomExceptionCode(messageOrCode)) {
        this.name = DOMExceptionNames[messageOrCode];
        this.message = nameOrMessage || "";
      } else {
        this.message = messageOrCode;
        this.name = endsWithError(nameOrMessage) ? nameOrMessage : DOMExceptionName.Error;
      }
      if (Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
    }
    extendError(DOMException, true);
    Object.defineProperties(DOMException.prototype, {
      code: {
        enumerable: true,
        get: function() {
          var code = DOMExceptionNames.indexOf(this.name);
          if (isValidDomExceptionCode(code)) return code;
          return 0;
        }
      }
    });
    var ExceptionCode = {
      INDEX_SIZE_ERR: 1,
      DOMSTRING_SIZE_ERR: 2,
      HIERARCHY_REQUEST_ERR: 3,
      WRONG_DOCUMENT_ERR: 4,
      INVALID_CHARACTER_ERR: 5,
      NO_DATA_ALLOWED_ERR: 6,
      NO_MODIFICATION_ALLOWED_ERR: 7,
      NOT_FOUND_ERR: 8,
      NOT_SUPPORTED_ERR: 9,
      INUSE_ATTRIBUTE_ERR: 10,
      INVALID_STATE_ERR: 11,
      SYNTAX_ERR: 12,
      INVALID_MODIFICATION_ERR: 13,
      NAMESPACE_ERR: 14,
      INVALID_ACCESS_ERR: 15,
      VALIDATION_ERR: 16,
      TYPE_MISMATCH_ERR: 17,
      SECURITY_ERR: 18,
      NETWORK_ERR: 19,
      ABORT_ERR: 20,
      URL_MISMATCH_ERR: 21,
      QUOTA_EXCEEDED_ERR: 22,
      TIMEOUT_ERR: 23,
      INVALID_NODE_TYPE_ERR: 24,
      DATA_CLONE_ERR: 25
    };
    var entries = Object.entries(ExceptionCode);
    for (i = 0; i < entries.length; i++) {
      key = entries[i][0];
      DOMException[key] = entries[i][1];
    }
    var key;
    var i;
    function ParseError(message, locator) {
      this.message = message;
      this.locator = locator;
      if (Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
    }
    extendError(ParseError);
    exports.DOMException = DOMException;
    exports.DOMExceptionName = DOMExceptionName;
    exports.ExceptionCode = ExceptionCode;
    exports.ParseError = ParseError;
  }
});

// node_modules/@xmldom/xmldom/lib/grammar.js
var require_grammar = __commonJS({
  "node_modules/@xmldom/xmldom/lib/grammar.js"(exports) {
    "use strict";
    function detectUnicodeSupport(RegExpImpl) {
      try {
        if (typeof RegExpImpl !== "function") {
          RegExpImpl = RegExp;
        }
        var match = new RegExpImpl("\u{1D306}", "u").exec("\u{1D306}");
        return !!match && match[0].length === 2;
      } catch (error) {
      }
      return false;
    }
    var UNICODE_SUPPORT = detectUnicodeSupport();
    function chars(regexp) {
      if (regexp.source[0] !== "[") {
        throw new Error(regexp + " can not be used with chars");
      }
      return regexp.source.slice(1, regexp.source.lastIndexOf("]"));
    }
    function chars_without(regexp, search) {
      if (regexp.source[0] !== "[") {
        throw new Error("/" + regexp.source + "/ can not be used with chars_without");
      }
      if (!search || typeof search !== "string") {
        throw new Error(JSON.stringify(search) + " is not a valid search");
      }
      if (regexp.source.indexOf(search) === -1) {
        throw new Error('"' + search + '" is not is /' + regexp.source + "/");
      }
      if (search === "-" && regexp.source.indexOf(search) !== 1) {
        throw new Error('"' + search + '" is not at the first postion of /' + regexp.source + "/");
      }
      return new RegExp(regexp.source.replace(search, ""), UNICODE_SUPPORT ? "u" : "");
    }
    function reg(args) {
      var self2 = this;
      return new RegExp(
        Array.prototype.slice.call(arguments).map(function(part) {
          var isStr = typeof part === "string";
          if (isStr && self2 === void 0 && part === "|") {
            throw new Error("use regg instead of reg to wrap expressions with `|`!");
          }
          return isStr ? part : part.source;
        }).join(""),
        UNICODE_SUPPORT ? "mu" : "m"
      );
    }
    function regg(args) {
      if (arguments.length === 0) {
        throw new Error("no parameters provided");
      }
      return reg.apply(regg, ["(?:"].concat(Array.prototype.slice.call(arguments), [")"]));
    }
    var UNICODE_REPLACEMENT_CHARACTER = "\uFFFD";
    var Char = /[-\x09\x0A\x0D\x20-\x2C\x2E-\uD7FF\uE000-\uFFFD]/;
    if (UNICODE_SUPPORT) {
      Char = reg("[", chars(Char), "\\u{10000}-\\u{10FFFF}", "]");
    }
    var InvalidChar = new RegExp("[^" + chars(Char) + "]", UNICODE_SUPPORT ? "u" : "");
    var _SChar = /[\x20\x09\x0D\x0A]/;
    var SChar_s = chars(_SChar);
    var S = reg(_SChar, "+");
    var S_OPT = reg(_SChar, "*");
    var NameStartChar = /[:_a-zA-Z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
    if (UNICODE_SUPPORT) {
      NameStartChar = reg("[", chars(NameStartChar), "\\u{10000}-\\u{10FFFF}", "]");
    }
    var NameStartChar_s = chars(NameStartChar);
    var NameChar = reg("[", NameStartChar_s, chars(/[-.0-9\xB7]/), chars(/[\u0300-\u036F\u203F-\u2040]/), "]");
    var Name = reg(NameStartChar, NameChar, "*");
    var Nmtoken = reg(NameChar, "+");
    var EntityRef = reg("&", Name, ";");
    var CharRef = regg(/&#[0-9]+;|&#x[0-9a-fA-F]+;/);
    var Reference = regg(EntityRef, "|", CharRef);
    var PEReference = reg("%", Name, ";");
    var EntityValue = regg(
      reg('"', regg(/[^%&"]/, "|", PEReference, "|", Reference), "*", '"'),
      "|",
      reg("'", regg(/[^%&']/, "|", PEReference, "|", Reference), "*", "'")
    );
    var AttValue = regg('"', regg(/[^<&"]/, "|", Reference), "*", '"', "|", "'", regg(/[^<&']/, "|", Reference), "*", "'");
    var NCNameStartChar = chars_without(NameStartChar, ":");
    var NCNameChar = chars_without(NameChar, ":");
    var NCName = reg(NCNameStartChar, NCNameChar, "*");
    var QName = reg(NCName, regg(":", NCName), "?");
    var QName_exact = reg("^", QName, "$");
    var QName_group = reg("(", QName, ")");
    var SystemLiteral = regg(/"[^"]*"|'[^']*'/);
    var PI = reg(/^<\?/, "(", Name, ")", regg(S, "(", Char, "*?)"), "?", /\?>/);
    var PubidChar = /[\x20\x0D\x0Aa-zA-Z0-9-'()+,./:=?;!*#@$_%]/;
    var PubidLiteral = regg('"', PubidChar, '*"', "|", "'", chars_without(PubidChar, "'"), "*'");
    var COMMENT_START = "<!--";
    var COMMENT_END = "-->";
    var Comment = reg(COMMENT_START, regg(chars_without(Char, "-"), "|", reg("-", chars_without(Char, "-"))), "*", COMMENT_END);
    var PCDATA = "#PCDATA";
    var Mixed = regg(
      reg(/\(/, S_OPT, PCDATA, regg(S_OPT, /\|/, S_OPT, QName), "*", S_OPT, /\)\*/),
      "|",
      reg(/\(/, S_OPT, PCDATA, S_OPT, /\)/)
    );
    var _children_quantity = /[?*+]?/;
    var children = reg(
      /\([^>]+\)/,
      _children_quantity
      /*regg(choice, '|', seq), _children_quantity*/
    );
    var contentspec = regg("EMPTY", "|", "ANY", "|", Mixed, "|", children);
    var ELEMENTDECL_START = "<!ELEMENT";
    var elementdecl = reg(ELEMENTDECL_START, S, regg(QName, "|", PEReference), S, regg(contentspec, "|", PEReference), S_OPT, ">");
    var NotationType = reg("NOTATION", S, /\(/, S_OPT, Name, regg(S_OPT, /\|/, S_OPT, Name), "*", S_OPT, /\)/);
    var Enumeration = reg(/\(/, S_OPT, Nmtoken, regg(S_OPT, /\|/, S_OPT, Nmtoken), "*", S_OPT, /\)/);
    var EnumeratedType = regg(NotationType, "|", Enumeration);
    var AttType = regg(/CDATA|ID|IDREF|IDREFS|ENTITY|ENTITIES|NMTOKEN|NMTOKENS/, "|", EnumeratedType);
    var DefaultDecl = regg(/#REQUIRED|#IMPLIED/, "|", regg(regg("#FIXED", S), "?", AttValue));
    var AttDef = regg(S, Name, S, AttType, S, DefaultDecl);
    var ATTLIST_DECL_START = "<!ATTLIST";
    var AttlistDecl = reg(ATTLIST_DECL_START, S, Name, AttDef, "*", S_OPT, ">");
    var ABOUT_LEGACY_COMPAT = "about:legacy-compat";
    var ABOUT_LEGACY_COMPAT_SystemLiteral = regg('"' + ABOUT_LEGACY_COMPAT + '"', "|", "'" + ABOUT_LEGACY_COMPAT + "'");
    var SYSTEM = "SYSTEM";
    var PUBLIC = "PUBLIC";
    var ExternalID = regg(regg(SYSTEM, S, SystemLiteral), "|", regg(PUBLIC, S, PubidLiteral, S, SystemLiteral));
    var ExternalID_match = reg(
      "^",
      regg(
        regg(SYSTEM, S, "(?<SystemLiteralOnly>", SystemLiteral, ")"),
        "|",
        regg(PUBLIC, S, "(?<PubidLiteral>", PubidLiteral, ")", S, "(?<SystemLiteral>", SystemLiteral, ")")
      )
    );
    var PubidLiteral_match = reg("^", PubidLiteral, "$");
    var SystemLiteral_match = reg("^", SystemLiteral, "$");
    var NDataDecl = regg(S, "NDATA", S, Name);
    var EntityDef = regg(EntityValue, "|", regg(ExternalID, NDataDecl, "?"));
    var ENTITY_DECL_START = "<!ENTITY";
    var GEDecl = reg(ENTITY_DECL_START, S, Name, S, EntityDef, S_OPT, ">");
    var PEDef = regg(EntityValue, "|", ExternalID);
    var PEDecl = reg(ENTITY_DECL_START, S, "%", S, Name, S, PEDef, S_OPT, ">");
    var EntityDecl = regg(GEDecl, "|", PEDecl);
    var PublicID = reg(PUBLIC, S, PubidLiteral);
    var NotationDecl = reg("<!NOTATION", S, Name, S, regg(ExternalID, "|", PublicID), S_OPT, ">");
    var Eq = reg(S_OPT, "=", S_OPT);
    var VersionNum = /1[.]\d+/;
    var VersionInfo = reg(S, "version", Eq, regg("'", VersionNum, "'", "|", '"', VersionNum, '"'));
    var EncName = /[A-Za-z][-A-Za-z0-9._]*/;
    var EncodingDecl = regg(S, "encoding", Eq, regg('"', EncName, '"', "|", "'", EncName, "'"));
    var SDDecl = regg(S, "standalone", Eq, regg("'", regg("yes", "|", "no"), "'", "|", '"', regg("yes", "|", "no"), '"'));
    var XMLDecl = reg(/^<\?xml/, VersionInfo, EncodingDecl, "?", SDDecl, "?", S_OPT, /\?>/);
    var DOCTYPE_DECL_START = "<!DOCTYPE";
    var CDATA_START = "<![CDATA[";
    var CDATA_END = "]]>";
    var CDStart = /<!\[CDATA\[/;
    var CDEnd = /\]\]>/;
    var CData = reg(Char, "*?", CDEnd);
    var CDSect = reg(CDStart, CData);
    exports.chars = chars;
    exports.chars_without = chars_without;
    exports.detectUnicodeSupport = detectUnicodeSupport;
    exports.reg = reg;
    exports.regg = regg;
    exports.ABOUT_LEGACY_COMPAT = ABOUT_LEGACY_COMPAT;
    exports.ABOUT_LEGACY_COMPAT_SystemLiteral = ABOUT_LEGACY_COMPAT_SystemLiteral;
    exports.AttlistDecl = AttlistDecl;
    exports.CDATA_START = CDATA_START;
    exports.CDATA_END = CDATA_END;
    exports.CDSect = CDSect;
    exports.Char = Char;
    exports.Comment = Comment;
    exports.COMMENT_START = COMMENT_START;
    exports.COMMENT_END = COMMENT_END;
    exports.DOCTYPE_DECL_START = DOCTYPE_DECL_START;
    exports.elementdecl = elementdecl;
    exports.EntityDecl = EntityDecl;
    exports.EntityValue = EntityValue;
    exports.ExternalID = ExternalID;
    exports.ExternalID_match = ExternalID_match;
    exports.Name = Name;
    exports.NotationDecl = NotationDecl;
    exports.Reference = Reference;
    exports.PEReference = PEReference;
    exports.PI = PI;
    exports.PUBLIC = PUBLIC;
    exports.PubidLiteral = PubidLiteral;
    exports.PubidLiteral_match = PubidLiteral_match;
    exports.QName = QName;
    exports.QName_exact = QName_exact;
    exports.QName_group = QName_group;
    exports.S = S;
    exports.SChar_s = SChar_s;
    exports.S_OPT = S_OPT;
    exports.SYSTEM = SYSTEM;
    exports.SystemLiteral = SystemLiteral;
    exports.SystemLiteral_match = SystemLiteral_match;
    exports.InvalidChar = InvalidChar;
    exports.UNICODE_REPLACEMENT_CHARACTER = UNICODE_REPLACEMENT_CHARACTER;
    exports.UNICODE_SUPPORT = UNICODE_SUPPORT;
    exports.XMLDecl = XMLDecl;
  }
});

// node_modules/@xmldom/xmldom/lib/dom.js
var require_dom = __commonJS({
  "node_modules/@xmldom/xmldom/lib/dom.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    var find = conventions.find;
    var hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
    var hasOwn = conventions.hasOwn;
    var isHTMLMimeType = conventions.isHTMLMimeType;
    var isHTMLRawTextElement = conventions.isHTMLRawTextElement;
    var isHTMLVoidElement = conventions.isHTMLVoidElement;
    var MIME_TYPE = conventions.MIME_TYPE;
    var NAMESPACE = conventions.NAMESPACE;
    var PDC = /* @__PURE__ */ Symbol();
    var errors = require_errors();
    var DOMException = errors.DOMException;
    var DOMExceptionName = errors.DOMExceptionName;
    var g = require_grammar();
    function checkSymbol(symbol) {
      if (symbol !== PDC) {
        throw new TypeError("Illegal constructor");
      }
    }
    function notEmptyString(input) {
      return input !== "";
    }
    function splitOnASCIIWhitespace(input) {
      return input ? input.split(/[\t\n\f\r ]+/).filter(notEmptyString) : [];
    }
    function orderedSetReducer(current, element) {
      if (!hasOwn(current, element)) {
        current[element] = true;
      }
      return current;
    }
    function toOrderedSet(input) {
      if (!input) return [];
      var list = splitOnASCIIWhitespace(input);
      return Object.keys(list.reduce(orderedSetReducer, {}));
    }
    function arrayIncludes(list) {
      return function(element) {
        return list && list.indexOf(element) !== -1;
      };
    }
    function validateQualifiedName(qualifiedName) {
      if (!g.QName_exact.test(qualifiedName)) {
        throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'invalid character in qualified name "' + qualifiedName + '"');
      }
    }
    function validateAndExtract(namespace, qualifiedName) {
      validateQualifiedName(qualifiedName);
      namespace = namespace || null;
      var prefix = null;
      var localName = qualifiedName;
      if (qualifiedName.indexOf(":") >= 0) {
        var splitResult = qualifiedName.split(":");
        prefix = splitResult[0];
        localName = splitResult[1];
      }
      if (prefix !== null && namespace === null) {
        throw new DOMException(DOMException.NAMESPACE_ERR, "prefix is non-null and namespace is null");
      }
      if (prefix === "xml" && namespace !== conventions.NAMESPACE.XML) {
        throw new DOMException(DOMException.NAMESPACE_ERR, 'prefix is "xml" and namespace is not the XML namespace');
      }
      if ((prefix === "xmlns" || qualifiedName === "xmlns") && namespace !== conventions.NAMESPACE.XMLNS) {
        throw new DOMException(
          DOMException.NAMESPACE_ERR,
          'either qualifiedName or prefix is "xmlns" and namespace is not the XMLNS namespace'
        );
      }
      if (namespace === conventions.NAMESPACE.XMLNS && prefix !== "xmlns" && qualifiedName !== "xmlns") {
        throw new DOMException(
          DOMException.NAMESPACE_ERR,
          'namespace is the XMLNS namespace and neither qualifiedName nor prefix is "xmlns"'
        );
      }
      return [namespace, prefix, localName];
    }
    function copy(src, dest) {
      for (var p in src) {
        if (hasOwn(src, p)) {
          dest[p] = src[p];
        }
      }
    }
    function _extends(Class, Super) {
      var pt = Class.prototype;
      if (!(pt instanceof Super)) {
        let t = function() {
        };
        t.prototype = Super.prototype;
        t = new t();
        copy(pt, t);
        Class.prototype = pt = t;
      }
      if (pt.constructor != Class) {
        if (typeof Class != "function") {
          console.error("unknown Class:" + Class);
        }
        pt.constructor = Class;
      }
    }
    var NodeType = {};
    var ELEMENT_NODE = NodeType.ELEMENT_NODE = 1;
    var ATTRIBUTE_NODE = NodeType.ATTRIBUTE_NODE = 2;
    var TEXT_NODE = NodeType.TEXT_NODE = 3;
    var CDATA_SECTION_NODE = NodeType.CDATA_SECTION_NODE = 4;
    var ENTITY_REFERENCE_NODE = NodeType.ENTITY_REFERENCE_NODE = 5;
    var ENTITY_NODE = NodeType.ENTITY_NODE = 6;
    var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
    var COMMENT_NODE = NodeType.COMMENT_NODE = 8;
    var DOCUMENT_NODE = NodeType.DOCUMENT_NODE = 9;
    var DOCUMENT_TYPE_NODE = NodeType.DOCUMENT_TYPE_NODE = 10;
    var DOCUMENT_FRAGMENT_NODE = NodeType.DOCUMENT_FRAGMENT_NODE = 11;
    var NOTATION_NODE = NodeType.NOTATION_NODE = 12;
    var DocumentPosition = conventions.freeze({
      DOCUMENT_POSITION_DISCONNECTED: 1,
      DOCUMENT_POSITION_PRECEDING: 2,
      DOCUMENT_POSITION_FOLLOWING: 4,
      DOCUMENT_POSITION_CONTAINS: 8,
      DOCUMENT_POSITION_CONTAINED_BY: 16,
      DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32
    });
    function commonAncestor(a, b) {
      if (b.length < a.length) return commonAncestor(b, a);
      var c = null;
      for (var n in a) {
        if (a[n] !== b[n]) return c;
        c = a[n];
      }
      return c;
    }
    function docGUID(doc) {
      if (!doc.guid) doc.guid = Math.random();
      return doc.guid;
    }
    function NodeList() {
    }
    NodeList.prototype = {
      /**
       * The number of nodes in the list. The range of valid child node indices is 0 to length-1
       * inclusive.
       *
       * @type {number}
       */
      length: 0,
      /**
       * Returns the item at `index`. If index is greater than or equal to the number of nodes in
       * the list, this returns null.
       *
       * @param index
       * Unsigned long Index into the collection.
       * @returns {Node | null}
       * The node at position `index` in the NodeList,
       * or null if that is not a valid index.
       */
      item: function(index) {
        return index >= 0 && index < this.length ? this[index] : null;
      },
      /**
       * Returns a string representation of the NodeList.
       *
       * Accepts the same `options` object as `XMLSerializer.prototype.serializeToString`
       * (`requireWellFormed`, `splitCDATASections`, `nodeFilter`). Passing a function is treated as
       * a legacy `nodeFilter` for backward compatibility.
       *
       * @param {Object | function} [options]
       * @param {boolean} [options.requireWellFormed=false]
       * @param {boolean} [options.splitCDATASections=true]
       * @param {function} [options.nodeFilter]
       * @returns {string}
       */
      toString: function(options) {
        var opts;
        if (typeof options === "function") {
          opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: options };
        } else if (!!options) {
          opts = {
            requireWellFormed: !!options.requireWellFormed,
            splitCDATASections: options.splitCDATASections !== false,
            nodeFilter: options.nodeFilter || null
          };
        } else {
          opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: null };
        }
        for (var buf = [], i = 0; i < this.length; i++) {
          serializeToString(this[i], buf, null, opts);
        }
        return buf.join("");
      },
      /**
       * Filters the NodeList based on a predicate.
       *
       * @param {function(Node): boolean} predicate
       * - A predicate function to filter the NodeList.
       * @returns {Node[]}
       * An array of nodes that satisfy the predicate.
       * @private
       */
      filter: function(predicate) {
        return Array.prototype.filter.call(this, predicate);
      },
      /**
       * Returns the first index at which a given node can be found in the NodeList, or -1 if it is
       * not present.
       *
       * @param {Node} item
       * - The Node item to locate in the NodeList.
       * @returns {number}
       * The first index of the node in the NodeList; -1 if not found.
       * @private
       */
      indexOf: function(item) {
        return Array.prototype.indexOf.call(this, item);
      }
    };
    NodeList.prototype[Symbol.iterator] = function() {
      var me = this;
      var index = 0;
      return {
        next: function() {
          if (index < me.length) {
            return {
              value: me[index++],
              done: false
            };
          } else {
            return {
              done: true
            };
          }
        },
        return: function() {
          return {
            done: true
          };
        }
      };
    };
    function LiveNodeList(node, refresh) {
      this._node = node;
      this._refresh = refresh;
      _updateLiveList(this);
    }
    function _updateLiveList(list) {
      var inc = list._node._inc || list._node.ownerDocument._inc;
      if (list._inc !== inc) {
        var ls = list._refresh(list._node);
        __set__(list, "length", ls.length);
        if (!list.$$length || ls.length < list.$$length) {
          for (var i = ls.length; i in list; i++) {
            if (hasOwn(list, i)) {
              delete list[i];
            }
          }
        }
        copy(ls, list);
        list._inc = inc;
      }
    }
    LiveNodeList.prototype.item = function(i) {
      _updateLiveList(this);
      return this[i] || null;
    };
    _extends(LiveNodeList, NodeList);
    function NamedNodeMap() {
    }
    function _findNodeIndex(list, node) {
      var i = 0;
      while (i < list.length) {
        if (list[i] === node) {
          return i;
        }
        i++;
      }
    }
    function _addNamedNode(el, list, newAttr, oldAttr) {
      if (oldAttr) {
        list[_findNodeIndex(list, oldAttr)] = newAttr;
      } else {
        list[list.length] = newAttr;
        list.length++;
      }
      if (el) {
        newAttr.ownerElement = el;
        var doc = el.ownerDocument;
        if (doc) {
          oldAttr && _onRemoveAttribute(doc, el, oldAttr);
          _onAddAttribute(doc, el, newAttr);
        }
      }
    }
    function _removeNamedNode(el, list, attr) {
      var i = _findNodeIndex(list, attr);
      if (i >= 0) {
        var lastIndex = list.length - 1;
        while (i <= lastIndex) {
          list[i] = list[++i];
        }
        list.length = lastIndex;
        if (el) {
          var doc = el.ownerDocument;
          if (doc) {
            _onRemoveAttribute(doc, el, attr);
          }
          attr.ownerElement = null;
        }
      }
    }
    NamedNodeMap.prototype = {
      length: 0,
      item: NodeList.prototype.item,
      /**
       * Get an attribute by name. Note: Name is in lower case in case of HTML namespace and
       * document.
       *
       * @param {string} localName
       * The local name of the attribute.
       * @returns {Attr | null}
       * The attribute with the given local name, or null if no such attribute exists.
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-get-by-name
       */
      getNamedItem: function(localName) {
        if (this._ownerElement && this._ownerElement._isInHTMLDocumentAndNamespace()) {
          localName = localName.toLowerCase();
        }
        var i = 0;
        while (i < this.length) {
          var attr = this[i];
          if (attr.nodeName === localName) {
            return attr;
          }
          i++;
        }
        return null;
      },
      /**
       * Set an attribute.
       *
       * @param {Attr} attr
       * The attribute to set.
       * @returns {Attr | null}
       * The old attribute with the same local name and namespace URI as the new one, or null if no
       * such attribute exists.
       * @throws {DOMException}
       * With code:
       * - {@link INUSE_ATTRIBUTE_ERR} - If the attribute is already an attribute of another
       * element.
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-set
       */
      setNamedItem: function(attr) {
        var el = attr.ownerElement;
        if (el && el !== this._ownerElement) {
          throw new DOMException(DOMException.INUSE_ATTRIBUTE_ERR);
        }
        var oldAttr = this.getNamedItemNS(attr.namespaceURI, attr.localName);
        if (oldAttr === attr) {
          return attr;
        }
        _addNamedNode(this._ownerElement, this, attr, oldAttr);
        return oldAttr;
      },
      /**
       * Set an attribute, replacing an existing attribute with the same local name and namespace
       * URI if one exists.
       *
       * @param {Attr} attr
       * The attribute to set.
       * @returns {Attr | null}
       * The old attribute with the same local name and namespace URI as the new one, or null if no
       * such attribute exists.
       * @throws {DOMException}
       * Throws a DOMException with the name "InUseAttributeError" if the attribute is already an
       * attribute of another element.
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-set
       */
      setNamedItemNS: function(attr) {
        return this.setNamedItem(attr);
      },
      /**
       * Removes an attribute specified by the local name.
       *
       * @param {string} localName
       * The local name of the attribute to be removed.
       * @returns {Attr}
       * The attribute node that was removed.
       * @throws {DOMException}
       * With code:
       * - {@link DOMException.NOT_FOUND_ERR} if no attribute with the given name is found.
       * @see https://dom.spec.whatwg.org/#dom-namednodemap-removenameditem
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-remove-by-name
       */
      removeNamedItem: function(localName) {
        var attr = this.getNamedItem(localName);
        if (!attr) {
          throw new DOMException(DOMException.NOT_FOUND_ERR, localName);
        }
        _removeNamedNode(this._ownerElement, this, attr);
        return attr;
      },
      /**
       * Removes an attribute specified by the namespace and local name.
       *
       * @param {string | null} namespaceURI
       * The namespace URI of the attribute to be removed.
       * @param {string} localName
       * The local name of the attribute to be removed.
       * @returns {Attr}
       * The attribute node that was removed.
       * @throws {DOMException}
       * With code:
       * - {@link DOMException.NOT_FOUND_ERR} if no attribute with the given namespace URI and local
       * name is found.
       * @see https://dom.spec.whatwg.org/#dom-namednodemap-removenameditemns
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-remove-by-namespace
       */
      removeNamedItemNS: function(namespaceURI, localName) {
        var attr = this.getNamedItemNS(namespaceURI, localName);
        if (!attr) {
          throw new DOMException(DOMException.NOT_FOUND_ERR, namespaceURI ? namespaceURI + " : " + localName : localName);
        }
        _removeNamedNode(this._ownerElement, this, attr);
        return attr;
      },
      /**
       * Get an attribute by namespace and local name.
       *
       * @param {string | null} namespaceURI
       * The namespace URI of the attribute.
       * @param {string} localName
       * The local name of the attribute.
       * @returns {Attr | null}
       * The attribute with the given namespace URI and local name, or null if no such attribute
       * exists.
       * @see https://dom.spec.whatwg.org/#concept-element-attributes-get-by-namespace
       */
      getNamedItemNS: function(namespaceURI, localName) {
        if (!namespaceURI) {
          namespaceURI = null;
        }
        var i = 0;
        while (i < this.length) {
          var node = this[i];
          if (node.localName === localName && node.namespaceURI === namespaceURI) {
            return node;
          }
          i++;
        }
        return null;
      }
    };
    NamedNodeMap.prototype[Symbol.iterator] = function() {
      var me = this;
      var index = 0;
      return {
        next: function() {
          if (index < me.length) {
            return {
              value: me[index++],
              done: false
            };
          } else {
            return {
              done: true
            };
          }
        },
        return: function() {
          return {
            done: true
          };
        }
      };
    };
    function DOMImplementation() {
    }
    DOMImplementation.prototype = {
      /**
       * Test if the DOM implementation implements a specific feature and version, as specified in
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/core.html#DOMFeatures DOM Features}.
       *
       * The DOMImplementation.hasFeature() method returns a Boolean flag indicating if a given
       * feature is supported. The different implementations fairly diverged in what kind of
       * features were reported. The latest version of the spec settled to force this method to
       * always return true, where the functionality was accurate and in use.
       *
       * @deprecated
       * It is deprecated and modern browsers return true in all cases.
       * @function DOMImplementation#hasFeature
       * @param {string} feature
       * The name of the feature to test.
       * @param {string} [version]
       * This is the version number of the feature to test.
       * @returns {boolean}
       * Always returns true.
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/hasFeature MDN
       * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-5CED94D7 DOM Level 1 Core
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-hasfeature DOM Living Standard
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-5CED94D7 DOM Level 3 Core
       */
      hasFeature: function(feature, version) {
        return true;
      },
      /**
       * Creates a DOM Document object of the specified type with its document element. Note that
       * based on the {@link DocumentType}
       * given to create the document, the implementation may instantiate specialized
       * {@link Document} objects that support additional features than the "Core", such as "HTML"
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#DOM2HTML DOM Level 2 HTML}.
       * On the other hand, setting the {@link DocumentType} after the document was created makes
       * this very unlikely to happen. Alternatively, specialized {@link Document} creation methods,
       * such as createHTMLDocument
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#DOM2HTML DOM Level 2 HTML},
       * can be used to obtain specific types of {@link Document} objects.
       *
       * __It behaves slightly different from the description in the living standard__:
       * - There is no interface/class `XMLDocument`, it returns a `Document`
       * instance (with it's `type` set to `'xml'`).
       * - `encoding`, `mode`, `origin`, `url` fields are currently not declared.
       *
       * @function DOMImplementation.createDocument
       * @param {string | null} namespaceURI
       * The
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-namespaceURI namespace URI}
       * of the document element to create or null.
       * @param {string | null} qualifiedName
       * The
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-qualifiedname qualified name}
       * of the document element to be created or null.
       * @param {DocumentType | null} [doctype=null]
       * The type of document to be created or null. When doctype is not null, its
       * {@link Node#ownerDocument} attribute is set to the document being created. Default is
       * `null`
       * @returns {Document}
       * A new {@link Document} object with its document element. If the NamespaceURI,
       * qualifiedName, and doctype are null, the returned {@link Document} is empty with no
       * document element.
       * @throws {DOMException}
       * With code:
       *
       * - `INVALID_CHARACTER_ERR`: Raised if the specified qualified name is not an XML name
       * according to {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#XML XML 1.0}.
       * - `NAMESPACE_ERR`: Raised if the qualifiedName is malformed, if the qualifiedName has a
       * prefix and the namespaceURI is null, or if the qualifiedName is null and the namespaceURI
       * is different from null, or if the qualifiedName has a prefix that is "xml" and the
       * namespaceURI is different from "{@link http://www.w3.org/XML/1998/namespace}"
       * {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#Namespaces XML Namespaces},
       * or if the DOM implementation does not support the "XML" feature but a non-null namespace
       * URI was provided, since namespaces were defined by XML.
       * - `WRONG_DOCUMENT_ERR`: Raised if doctype has already been used with a different document
       * or was created from a different implementation.
       * - `NOT_SUPPORTED_ERR`: May be raised if the implementation does not support the feature
       * "XML" and the language exposed through the Document does not support XML Namespaces (such
       * as {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#HTML40 HTML 4.01}).
       * @since DOM Level 2.
       * @see {@link #createHTMLDocument}
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocument MDN
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument DOM Living Standard
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Level-2-Core-DOM-createDocument DOM
       *      Level 3 Core
       * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocument DOM
       *      Level 2 Core (initial)
       */
      createDocument: function(namespaceURI, qualifiedName, doctype) {
        var contentType = MIME_TYPE.XML_APPLICATION;
        if (namespaceURI === NAMESPACE.HTML) {
          contentType = MIME_TYPE.XML_XHTML_APPLICATION;
        } else if (namespaceURI === NAMESPACE.SVG) {
          contentType = MIME_TYPE.XML_SVG_IMAGE;
        }
        var doc = new Document(PDC, { contentType });
        doc.implementation = this;
        doc.childNodes = new NodeList();
        doc.doctype = doctype || null;
        if (doctype) {
          doc.appendChild(doctype);
        }
        if (qualifiedName) {
          var root = doc.createElementNS(namespaceURI, qualifiedName);
          doc.appendChild(root);
        }
        return doc;
      },
      /**
       * Creates an empty DocumentType node. Entity declarations and notations are not made
       * available. Entity reference expansions and default attribute additions do not occur.
       *
       * **This behavior is slightly different from the one in the specs**:
       * - `encoding`, `mode`, `origin`, `url` fields are currently not declared.
       * - `publicId` and `systemId` contain the raw data including any possible quotes,
       *   so they can always be serialized back to the original value
       * - `internalSubset` contains the raw string between `[` and `]` if present,
       *   but is not parsed or validated in any form.
       *
       * @function DOMImplementation#createDocumentType
       * @param {string} qualifiedName
       * The {@link https://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-qualifiedname qualified
       * name} of the document type to be created.
       * @param {string} [publicId]
       * The external subset public identifier. Stored verbatim including surrounding quotes.
       * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
       * if the value is non-empty and does not match the XML `PubidLiteral` production
       * (W3C DOM Parsing §3.2.1.3; XML 1.0 production [12]). Creation-time validation is not
       * enforced — deferred to a future breaking release.
       * @param {string} [systemId]
       * The external subset system identifier. Stored verbatim including surrounding quotes.
       * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
       * if the value is non-empty and does not match the XML `SystemLiteral` production
       * (W3C DOM Parsing §3.2.1.3; XML 1.0 production [11]). Creation-time validation is not
       * enforced — deferred to a future breaking release.
       * @param {string} [internalSubset]
       * The internal subset or an empty string if it is not present. Stored verbatim.
       * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
       * if the value contains `"]>"`. Creation-time validation is not enforced.
       * @returns {DocumentType}
       * A new {@link DocumentType} node with {@link Node#ownerDocument} set to null.
       * @throws {DOMException}
       * With code:
       *
       * - `INVALID_CHARACTER_ERR`: Raised if the specified qualified name is not an XML name
       * according to {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#XML XML 1.0}.
       * - `NAMESPACE_ERR`: Raised if the qualifiedName is malformed.
       * - `NOT_SUPPORTED_ERR`: May be raised if the implementation does not support the feature
       * "XML" and the language exposed through the Document does not support XML Namespaces (such
       * as {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#HTML40 HTML 4.01}).
       * @since DOM Level 2.
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocumentType
       *      MDN
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocumenttype DOM Living
       *      Standard
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Level-3-Core-DOM-createDocType DOM
       *      Level 3 Core
       * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocType DOM
       *      Level 2 Core
       * @see https://github.com/xmldom/xmldom/blob/master/CHANGELOG.md#050
       * @see https://www.w3.org/TR/DOM-Level-2-Core/#core-ID-Core-DocType-internalSubset
       * @prettierignore
       */
      createDocumentType: function(qualifiedName, publicId, systemId, internalSubset) {
        validateQualifiedName(qualifiedName);
        var node = new DocumentType(PDC);
        node.name = qualifiedName;
        node.nodeName = qualifiedName;
        node.publicId = publicId || "";
        node.systemId = systemId || "";
        node.internalSubset = internalSubset || "";
        node.childNodes = new NodeList();
        return node;
      },
      /**
       * Returns an HTML document, that might already have a basic DOM structure.
       *
       * __It behaves slightly different from the description in the living standard__:
       * - If the first argument is `false` no initial nodes are added (steps 3-7 in the specs are
       * omitted)
       * - `encoding`, `mode`, `origin`, `url` fields are currently not declared.
       *
       * @param {string | false} [title]
       * A string containing the title to give the new HTML document.
       * @returns {Document}
       * The HTML document.
       * @since WHATWG Living Standard.
       * @see {@link #createDocument}
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createhtmldocument
       * @see https://dom.spec.whatwg.org/#html-document
       */
      createHTMLDocument: function(title) {
        var doc = new Document(PDC, { contentType: MIME_TYPE.HTML });
        doc.implementation = this;
        doc.childNodes = new NodeList();
        if (title !== false) {
          doc.doctype = this.createDocumentType("html");
          doc.doctype.ownerDocument = doc;
          doc.appendChild(doc.doctype);
          var htmlNode = doc.createElement("html");
          doc.appendChild(htmlNode);
          var headNode = doc.createElement("head");
          htmlNode.appendChild(headNode);
          if (typeof title === "string") {
            var titleNode = doc.createElement("title");
            titleNode.appendChild(doc.createTextNode(title));
            headNode.appendChild(titleNode);
          }
          htmlNode.appendChild(doc.createElement("body"));
        }
        return doc;
      }
    };
    function Node(symbol) {
      checkSymbol(symbol);
    }
    Node.prototype = {
      /**
       * The first child of this node.
       *
       * @type {Node | null}
       */
      firstChild: null,
      /**
       * The last child of this node.
       *
       * @type {Node | null}
       */
      lastChild: null,
      /**
       * The previous sibling of this node.
       *
       * @type {Node | null}
       */
      previousSibling: null,
      /**
       * The next sibling of this node.
       *
       * @type {Node | null}
       */
      nextSibling: null,
      /**
       * The parent node of this node.
       *
       * @type {Node | null}
       */
      parentNode: null,
      /**
       * The parent element of this node.
       *
       * @type {Element | null}
       */
      get parentElement() {
        return this.parentNode && this.parentNode.nodeType === this.ELEMENT_NODE ? this.parentNode : null;
      },
      /**
       * The child nodes of this node.
       *
       * @type {NodeList}
       */
      childNodes: null,
      /**
       * The document object associated with this node.
       *
       * @type {Document | null}
       */
      ownerDocument: null,
      /**
       * The value of this node.
       *
       * @type {string | null}
       */
      nodeValue: null,
      /**
       * The namespace URI of this node.
       *
       * @type {string | null}
       */
      namespaceURI: null,
      /**
       * The prefix of the namespace for this node.
       *
       * @type {string | null}
       */
      prefix: null,
      /**
       * The local part of the qualified name of this node.
       *
       * @type {string | null}
       */
      localName: null,
      /**
       * The baseURI is currently always `about:blank`,
       * since that's what happens when you create a document from scratch.
       *
       * @type {'about:blank'}
       */
      baseURI: "about:blank",
      /**
       * Is true if this node is part of a document.
       *
       * @type {boolean}
       */
      get isConnected() {
        var rootNode = this.getRootNode();
        return rootNode && rootNode.nodeType === rootNode.DOCUMENT_NODE;
      },
      /**
       * Checks whether `other` is an inclusive descendant of this node.
       *
       * @param {Node | null | undefined} other
       * The node to check.
       * @returns {boolean}
       * True if `other` is an inclusive descendant of this node; false otherwise.
       * @see https://dom.spec.whatwg.org/#dom-node-contains
       */
      contains: function(other) {
        if (!other) return false;
        var parent = other;
        do {
          if (this === parent) return true;
          parent = parent.parentNode;
        } while (parent);
        return false;
      },
      /**
       * @typedef GetRootNodeOptions
       * @property {boolean} [composed=false]
       */
      /**
       * Searches for the root node of this node.
       *
       * **This behavior is slightly different from the in the specs**:
       * - ignores `options.composed`, since `ShadowRoot`s are unsupported, always returns root.
       *
       * @param {GetRootNodeOptions} [options]
       * @returns {Node}
       * Root node.
       * @see https://dom.spec.whatwg.org/#dom-node-getrootnode
       * @see https://dom.spec.whatwg.org/#concept-shadow-including-root
       */
      getRootNode: function(options) {
        var parent = this;
        do {
          if (!parent.parentNode) {
            return parent;
          }
          parent = parent.parentNode;
        } while (parent);
      },
      /**
       * Checks whether the given node is equal to this node.
       *
       * Two nodes are equal when they have the same type, defining characteristics (for the type),
       * and the same childNodes. The comparison is iterative to avoid stack overflows on
       * deeply-nested trees. Attribute nodes of each Element pair are also pushed onto the stack
       * and compared the same way.
       *
       * @param {Node} [otherNode]
       * @returns {boolean}
       * @see https://dom.spec.whatwg.org/#concept-node-equals
       * @see ../docs/walk-dom.md.
       */
      isEqualNode: function(otherNode) {
        if (!otherNode) return false;
        var stack = [{ node: this, other: otherNode }];
        while (stack.length > 0) {
          var pair = stack.pop();
          var node = pair.node;
          var other = pair.other;
          if (node.nodeType !== other.nodeType) return false;
          switch (node.nodeType) {
            case node.DOCUMENT_TYPE_NODE:
              if (node.name !== other.name) return false;
              if (node.publicId !== other.publicId) return false;
              if (node.systemId !== other.systemId) return false;
              break;
            case node.ELEMENT_NODE:
              if (node.namespaceURI !== other.namespaceURI) return false;
              if (node.prefix !== other.prefix) return false;
              if (node.localName !== other.localName) return false;
              if (node.attributes.length !== other.attributes.length) return false;
              for (var i = 0; i < node.attributes.length; i++) {
                var attr = node.attributes.item(i);
                var otherAttr = other.getAttributeNodeNS(attr.namespaceURI, attr.localName);
                if (!otherAttr) return false;
                stack.push({ node: attr, other: otherAttr });
              }
              break;
            case node.ATTRIBUTE_NODE:
              if (node.namespaceURI !== other.namespaceURI) return false;
              if (node.localName !== other.localName) return false;
              if (node.value !== other.value) return false;
              break;
            case node.PROCESSING_INSTRUCTION_NODE:
              if (node.target !== other.target || node.data !== other.data) return false;
              break;
            case node.TEXT_NODE:
            case node.CDATA_SECTION_NODE:
            case node.COMMENT_NODE:
              if (node.data !== other.data) return false;
              break;
          }
          if (node.childNodes.length !== other.childNodes.length) return false;
          for (var i = node.childNodes.length - 1; i >= 0; i--) {
            stack.push({ node: node.childNodes[i], other: other.childNodes[i] });
          }
        }
        return true;
      },
      /**
       * Checks whether or not the given node is this node.
       *
       * @param {Node} [otherNode]
       */
      isSameNode: function(otherNode) {
        return this === otherNode;
      },
      /**
       * Inserts a node before a reference node as a child of this node.
       *
       * @param {Node} newChild
       * The new child node to be inserted.
       * @param {Node | null} refChild
       * The reference node before which newChild will be inserted.
       * @returns {Node}
       * The new child node successfully inserted.
       * @throws {DOMException}
       * Throws a DOMException if inserting the node would result in a DOM tree that is not
       * well-formed, or if `child` is provided but is not a child of `parent`.
       * See {@link _insertBefore} for more details.
       * @since Modified in DOM L2
       */
      insertBefore: function(newChild, refChild) {
        return _insertBefore(this, newChild, refChild);
      },
      /**
       * Replaces an old child node with a new child node within this node.
       *
       * @param {Node} newChild
       * The new node that is to replace the old node.
       * If it already exists in the DOM, it is removed from its original position.
       * @param {Node} oldChild
       * The existing child node to be replaced.
       * @returns {Node}
       * Returns the replaced child node.
       * @throws {DOMException}
       * Throws a DOMException if replacing the node would result in a DOM tree that is not
       * well-formed, or if `oldChild` is not a child of `this`.
       * This can also occur if the pre-replacement validity assertion fails.
       * See {@link _insertBefore}, {@link Node.removeChild}, and
       * {@link assertPreReplacementValidityInDocument} for more details.
       * @see https://dom.spec.whatwg.org/#concept-node-replace
       */
      replaceChild: function(newChild, oldChild) {
        _insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
        if (oldChild) {
          this.removeChild(oldChild);
        }
      },
      /**
       * Removes an existing child node from this node.
       *
       * @param {Node} oldChild
       * The child node to be removed.
       * @returns {Node}
       * Returns the removed child node.
       * @throws {DOMException}
       * Throws a DOMException if `oldChild` is not a child of `this`.
       * See {@link _removeChild} for more details.
       */
      removeChild: function(oldChild) {
        return _removeChild(this, oldChild);
      },
      /**
       * Appends a child node to this node.
       *
       * @param {Node} newChild
       * The child node to be appended to this node.
       * If it already exists in the DOM, it is removed from its original position.
       * @returns {Node}
       * Returns the appended child node.
       * @throws {DOMException}
       * Throws a DOMException if appending the node would result in a DOM tree that is not
       * well-formed, or if `newChild` is not a valid Node.
       * See {@link insertBefore} for more details.
       */
      appendChild: function(newChild) {
        return this.insertBefore(newChild, null);
      },
      /**
       * Determines whether this node has any child nodes.
       *
       * @returns {boolean}
       * Returns true if this node has any child nodes, and false otherwise.
       */
      hasChildNodes: function() {
        return this.firstChild != null;
      },
      /**
       * Creates a copy of the calling node.
       *
       * @param {boolean} deep
       * If true, the contents of the node are recursively copied.
       * If false, only the node itself (and its attributes, if it is an element) are copied.
       * @returns {Node}
       * Returns the newly created copy of the node.
       * @throws {DOMException}
       * May throw a DOMException if operations within {@link Element#setAttributeNode} or
       * {@link Node#appendChild} (which are potentially invoked in this method) do not meet their
       * specific constraints.
       * @see {@link cloneNode}
       */
      cloneNode: function(deep) {
        return cloneNode(this.ownerDocument || this, this, deep);
      },
      /**
       * Puts the specified node and all of its subtree into a "normalized" form. In a normalized
       * subtree, no text nodes in the subtree are empty and there are no adjacent text nodes.
       *
       * Specifically, this method merges any adjacent text nodes (i.e., nodes for which `nodeType`
       * is `TEXT_NODE`) into a single node with the combined data. It also removes any empty text
       * nodes.
       *
       * This method iterativly traverses all child nodes to normalize all descendent nodes within
       * the subtree.
       *
       * @throws {DOMException}
       * May throw a DOMException if operations within removeChild or appendData (which are
       * potentially invoked in this method) do not meet their specific constraints.
       * @since Modified in DOM Level 2
       * @see {@link Node.removeChild}
       * @see {@link CharacterData.appendData}
       * @see ../docs/walk-dom.md.
       */
      normalize: function() {
        walkDOM(this, null, {
          enter: function(node) {
            var child = node.firstChild;
            while (child) {
              var next = child.nextSibling;
              if (next !== null && next.nodeType === TEXT_NODE && child.nodeType === TEXT_NODE) {
                node.removeChild(next);
                child.appendData(next.data);
              } else {
                child = next;
              }
            }
            return true;
          }
        });
      },
      /**
       * Checks whether the DOM implementation implements a specific feature and its version.
       *
       * @deprecated
       * Since `DOMImplementation.hasFeature` is deprecated and always returns true.
       * @param {string} feature
       * The package name of the feature to test. This is the same name that can be passed to the
       * method `hasFeature` on `DOMImplementation`.
       * @param {string} version
       * This is the version number of the package name to test.
       * @returns {boolean}
       * Returns true in all cases in the current implementation.
       * @since Introduced in DOM Level 2
       * @see {@link DOMImplementation.hasFeature}
       */
      isSupported: function(feature, version) {
        return this.ownerDocument.implementation.hasFeature(feature, version);
      },
      /**
       * Look up the prefix associated to the given namespace URI, starting from this node.
       * **The default namespace declarations are ignored by this method.**
       * See Namespace Prefix Lookup for details on the algorithm used by this method.
       *
       * **This behavior is different from the in the specs**:
       * - no node type specific handling
       * - uses the internal attribute _nsMap for resolving namespaces that is updated when changing attributes
       *
       * @param {string | null} namespaceURI
       * The namespace URI for which to find the associated prefix.
       * @returns {string | null}
       * The associated prefix, if found; otherwise, null.
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespacePrefix
       * @see https://www.w3.org/TR/DOM-Level-3-Core/namespaces-algorithms.html#lookupNamespacePrefixAlgo
       * @see https://dom.spec.whatwg.org/#dom-node-lookupprefix
       * @see https://github.com/xmldom/xmldom/issues/322
       * @prettierignore
       */
      lookupPrefix: function(namespaceURI) {
        var el = this;
        while (el) {
          var map = el._nsMap;
          if (map) {
            for (var n in map) {
              if (hasOwn(map, n) && map[n] === namespaceURI) {
                return n;
              }
            }
          }
          el = el.nodeType == ATTRIBUTE_NODE ? el.ownerDocument : el.parentNode;
        }
        return null;
      },
      /**
       * This function is used to look up the namespace URI associated with the given prefix,
       * starting from this node.
       *
       * **This behavior is different from the in the specs**:
       * - no node type specific handling
       * - uses the internal attribute _nsMap for resolving namespaces that is updated when changing attributes
       *
       * @param {string | null} prefix
       * The prefix for which to find the associated namespace URI.
       * @returns {string | null}
       * The associated namespace URI, if found; otherwise, null.
       * @since DOM Level 3
       * @see https://dom.spec.whatwg.org/#dom-node-lookupnamespaceuri
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespaceURI
       * @prettierignore
       */
      lookupNamespaceURI: function(prefix) {
        var el = this;
        while (el) {
          var map = el._nsMap;
          if (map) {
            if (hasOwn(map, prefix)) {
              return map[prefix];
            }
          }
          el = el.nodeType == ATTRIBUTE_NODE ? el.ownerDocument : el.parentNode;
        }
        return null;
      },
      /**
       * Determines whether the given namespace URI is the default namespace.
       *
       * The function works by looking up the prefix associated with the given namespace URI. If no
       * prefix is found (i.e., the namespace URI is not registered in the namespace map of this
       * node or any of its ancestors), it returns `true`, implying the namespace URI is considered
       * the default.
       *
       * **This behavior is different from the in the specs**:
       * - no node type specific handling
       * - uses the internal attribute _nsMap for resolving namespaces that is updated when changing attributes
       *
       * @param {string | null} namespaceURI
       * The namespace URI to be checked.
       * @returns {boolean}
       * Returns true if the given namespace URI is the default namespace, false otherwise.
       * @since DOM Level 3
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-isDefaultNamespace
       * @see https://dom.spec.whatwg.org/#dom-node-isdefaultnamespace
       * @prettierignore
       */
      isDefaultNamespace: function(namespaceURI) {
        var prefix = this.lookupPrefix(namespaceURI);
        return prefix == null;
      },
      /**
       * Compares the reference node with a node with regard to their position in the document and
       * according to the document order.
       *
       * @param {Node} other
       * The node to compare the reference node to.
       * @returns {number}
       * Returns how the node is positioned relatively to the reference node according to the
       * bitmask. 0 if reference node and given node are the same.
       * @since DOM Level 3
       * @see https://www.w3.org/TR/2004/REC-DOM-Level-3-Core-20040407/core.html#Node3-compare
       * @see https://dom.spec.whatwg.org/#dom-node-comparedocumentposition
       */
      compareDocumentPosition: function(other) {
        if (this === other) return 0;
        var node1 = other;
        var node2 = this;
        var attr1 = null;
        var attr2 = null;
        if (node1 instanceof Attr) {
          attr1 = node1;
          node1 = attr1.ownerElement;
        }
        if (node2 instanceof Attr) {
          attr2 = node2;
          node2 = attr2.ownerElement;
          if (attr1 && node1 && node2 === node1) {
            for (var i = 0, attr; attr = node2.attributes[i]; i++) {
              if (attr === attr1)
                return DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
              if (attr === attr2)
                return DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
            }
          }
        }
        if (!node1 || !node2 || node2.ownerDocument !== node1.ownerDocument) {
          return DocumentPosition.DOCUMENT_POSITION_DISCONNECTED + DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + (docGUID(node2.ownerDocument) > docGUID(node1.ownerDocument) ? DocumentPosition.DOCUMENT_POSITION_FOLLOWING : DocumentPosition.DOCUMENT_POSITION_PRECEDING);
        }
        if (attr2 && node1 === node2) {
          return DocumentPosition.DOCUMENT_POSITION_CONTAINS + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
        }
        if (attr1 && node1 === node2) {
          return DocumentPosition.DOCUMENT_POSITION_CONTAINED_BY + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
        }
        var chain1 = [];
        var ancestor1 = node1.parentNode;
        while (ancestor1) {
          if (!attr2 && ancestor1 === node2) {
            return DocumentPosition.DOCUMENT_POSITION_CONTAINED_BY + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
          }
          chain1.push(ancestor1);
          ancestor1 = ancestor1.parentNode;
        }
        chain1.reverse();
        var chain2 = [];
        var ancestor2 = node2.parentNode;
        while (ancestor2) {
          if (!attr1 && ancestor2 === node1) {
            return DocumentPosition.DOCUMENT_POSITION_CONTAINS + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
          }
          chain2.push(ancestor2);
          ancestor2 = ancestor2.parentNode;
        }
        chain2.reverse();
        var ca = commonAncestor(chain1, chain2);
        for (var n in ca.childNodes) {
          var child = ca.childNodes[n];
          if (child === node2) return DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
          if (child === node1) return DocumentPosition.DOCUMENT_POSITION_PRECEDING;
          if (chain2.indexOf(child) >= 0) return DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
          if (chain1.indexOf(child) >= 0) return DocumentPosition.DOCUMENT_POSITION_PRECEDING;
        }
        return 0;
      }
    };
    function _xmlEncoder(c) {
      return c == "<" && "&lt;" || c == ">" && "&gt;" || c == "&" && "&amp;" || c == '"' && "&quot;" || "&#" + c.charCodeAt() + ";";
    }
    copy(NodeType, Node);
    copy(NodeType, Node.prototype);
    copy(DocumentPosition, Node);
    copy(DocumentPosition, Node.prototype);
    function _visitNode(node, callback) {
      walkDOM(node, null, {
        enter: function(n) {
          return callback(n) ? walkDOM.STOP : true;
        }
      });
    }
    function walkDOM(node, context, callbacks) {
      var stack = [{ node, context, phase: walkDOM.ENTER }];
      while (stack.length > 0) {
        var frame = stack.pop();
        if (frame.phase === walkDOM.ENTER) {
          var childContext = callbacks.enter(frame.node, frame.context);
          if (childContext === walkDOM.STOP) {
            return walkDOM.STOP;
          }
          stack.push({ node: frame.node, context: childContext, phase: walkDOM.EXIT });
          if (childContext === null || childContext === void 0) {
            continue;
          }
          var child = frame.node.lastChild;
          while (child) {
            stack.push({ node: child, context: childContext, phase: walkDOM.ENTER });
            child = child.previousSibling;
          }
        } else {
          if (callbacks.exit) {
            callbacks.exit(frame.node, frame.context);
          }
        }
      }
    }
    walkDOM.STOP = /* @__PURE__ */ Symbol("walkDOM.STOP");
    walkDOM.ENTER = 0;
    walkDOM.EXIT = 1;
    function Document(symbol, options) {
      checkSymbol(symbol);
      var opt = options || {};
      this.ownerDocument = this;
      this.contentType = opt.contentType || MIME_TYPE.XML_APPLICATION;
      this.type = isHTMLMimeType(this.contentType) ? "html" : "xml";
    }
    function _onAddAttribute(doc, el, newAttr) {
      doc && doc._inc++;
      var ns = newAttr.namespaceURI;
      if (ns === NAMESPACE.XMLNS) {
        el._nsMap[newAttr.prefix ? newAttr.localName : ""] = newAttr.value;
      }
    }
    function _onRemoveAttribute(doc, el, newAttr, remove) {
      doc && doc._inc++;
      var ns = newAttr.namespaceURI;
      if (ns === NAMESPACE.XMLNS) {
        delete el._nsMap[newAttr.prefix ? newAttr.localName : ""];
      }
    }
    function _onUpdateChild(doc, parent, newChild) {
      if (doc && doc._inc) {
        doc._inc++;
        var childNodes = parent.childNodes;
        if (newChild && !newChild.nextSibling) {
          childNodes[childNodes.length++] = newChild;
        } else {
          var child = parent.firstChild;
          var i = 0;
          while (child) {
            childNodes[i++] = child;
            child = child.nextSibling;
          }
          childNodes.length = i;
          delete childNodes[childNodes.length];
        }
      }
    }
    function _removeChild(parentNode, child) {
      if (parentNode !== child.parentNode) {
        throw new DOMException(DOMException.NOT_FOUND_ERR, "child's parent is not parent");
      }
      var oldPreviousSibling = child.previousSibling;
      var oldNextSibling = child.nextSibling;
      if (oldPreviousSibling) {
        oldPreviousSibling.nextSibling = oldNextSibling;
      } else {
        parentNode.firstChild = oldNextSibling;
      }
      if (oldNextSibling) {
        oldNextSibling.previousSibling = oldPreviousSibling;
      } else {
        parentNode.lastChild = oldPreviousSibling;
      }
      _onUpdateChild(parentNode.ownerDocument, parentNode);
      child.parentNode = null;
      child.previousSibling = null;
      child.nextSibling = null;
      return child;
    }
    function hasValidParentNodeType(node) {
      return node && (node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.ELEMENT_NODE);
    }
    function hasInsertableNodeType(node) {
      return node && (node.nodeType === Node.CDATA_SECTION_NODE || node.nodeType === Node.COMMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.DOCUMENT_TYPE_NODE || node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.PROCESSING_INSTRUCTION_NODE || node.nodeType === Node.TEXT_NODE);
    }
    function isDocTypeNode(node) {
      return node && node.nodeType === Node.DOCUMENT_TYPE_NODE;
    }
    function isElementNode(node) {
      return node && node.nodeType === Node.ELEMENT_NODE;
    }
    function isTextNode(node) {
      return node && node.nodeType === Node.TEXT_NODE;
    }
    function isElementInsertionPossible(doc, child) {
      var parentChildNodes = doc.childNodes || [];
      if (find(parentChildNodes, isElementNode) || isDocTypeNode(child)) {
        return false;
      }
      var docTypeNode = find(parentChildNodes, isDocTypeNode);
      return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
    }
    function isElementReplacementPossible(doc, child) {
      var parentChildNodes = doc.childNodes || [];
      function hasElementChildThatIsNotChild(node) {
        return isElementNode(node) && node !== child;
      }
      if (find(parentChildNodes, hasElementChildThatIsNotChild)) {
        return false;
      }
      var docTypeNode = find(parentChildNodes, isDocTypeNode);
      return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
    }
    function assertPreInsertionValidity1to5(parent, node, child) {
      if (!hasValidParentNodeType(parent)) {
        throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Unexpected parent node type " + parent.nodeType);
      }
      if (child && child.parentNode !== parent) {
        throw new DOMException(DOMException.NOT_FOUND_ERR, "child not in parent");
      }
      if (
        // 4. If `node` is not a DocumentFragment, DocumentType, Element, or CharacterData node, then throw a "HierarchyRequestError" DOMException.
        !hasInsertableNodeType(node) || // 5. If either `node` is a Text node and `parent` is a document,
        // the sax parser currently adds top level text nodes, this will be fixed in 0.9.0
        // || (node.nodeType === Node.TEXT_NODE && parent.nodeType === Node.DOCUMENT_NODE)
        // or `node` is a doctype and `parent` is not a document, then throw a "HierarchyRequestError" DOMException.
        isDocTypeNode(node) && parent.nodeType !== Node.DOCUMENT_NODE
      ) {
        throw new DOMException(
          DOMException.HIERARCHY_REQUEST_ERR,
          "Unexpected node type " + node.nodeType + " for parent node type " + parent.nodeType
        );
      }
    }
    function assertPreInsertionValidityInDocument(parent, node, child) {
      var parentChildNodes = parent.childNodes || [];
      var nodeChildNodes = node.childNodes || [];
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        var nodeChildElements = nodeChildNodes.filter(isElementNode);
        if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
        }
        if (nodeChildElements.length === 1 && !isElementInsertionPossible(parent, child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
        }
      }
      if (isElementNode(node)) {
        if (!isElementInsertionPossible(parent, child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
        }
      }
      if (isDocTypeNode(node)) {
        if (find(parentChildNodes, isDocTypeNode)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
        }
        var parentElementChild = find(parentChildNodes, isElementNode);
        if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
        }
        if (!child && parentElementChild) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Doctype can not be appended since element is present");
        }
      }
    }
    function assertPreReplacementValidityInDocument(parent, node, child) {
      var parentChildNodes = parent.childNodes || [];
      var nodeChildNodes = node.childNodes || [];
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        var nodeChildElements = nodeChildNodes.filter(isElementNode);
        if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
        }
        if (nodeChildElements.length === 1 && !isElementReplacementPossible(parent, child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
        }
      }
      if (isElementNode(node)) {
        if (!isElementReplacementPossible(parent, child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
        }
      }
      if (isDocTypeNode(node)) {
        let hasDoctypeChildThatIsNotChild = function(node2) {
          return isDocTypeNode(node2) && node2 !== child;
        };
        if (find(parentChildNodes, hasDoctypeChildThatIsNotChild)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
        }
        var parentElementChild = find(parentChildNodes, isElementNode);
        if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
        }
      }
    }
    function _insertBefore(parent, node, child, _inDocumentAssertion) {
      assertPreInsertionValidity1to5(parent, node, child);
      if (parent.nodeType === Node.DOCUMENT_NODE) {
        (_inDocumentAssertion || assertPreInsertionValidityInDocument)(parent, node, child);
      }
      var cp = node.parentNode;
      if (cp) {
        cp.removeChild(node);
      }
      if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
        var newFirst = node.firstChild;
        if (newFirst == null) {
          return node;
        }
        var newLast = node.lastChild;
      } else {
        newFirst = newLast = node;
      }
      var pre = child ? child.previousSibling : parent.lastChild;
      newFirst.previousSibling = pre;
      newLast.nextSibling = child;
      if (pre) {
        pre.nextSibling = newFirst;
      } else {
        parent.firstChild = newFirst;
      }
      if (child == null) {
        parent.lastChild = newLast;
      } else {
        child.previousSibling = newLast;
      }
      do {
        newFirst.parentNode = parent;
      } while (newFirst !== newLast && (newFirst = newFirst.nextSibling));
      _onUpdateChild(parent.ownerDocument || parent, parent, node);
      if (node.nodeType == DOCUMENT_FRAGMENT_NODE) {
        node.firstChild = node.lastChild = null;
      }
      return node;
    }
    Document.prototype = {
      /**
       * The implementation that created this document.
       *
       * @type DOMImplementation
       * @readonly
       */
      implementation: null,
      nodeName: "#document",
      nodeType: DOCUMENT_NODE,
      /**
       * The DocumentType node of the document.
       *
       * @type DocumentType
       * @readonly
       */
      doctype: null,
      documentElement: null,
      _inc: 1,
      insertBefore: function(newChild, refChild) {
        if (newChild.nodeType === DOCUMENT_FRAGMENT_NODE) {
          var child = newChild.firstChild;
          while (child) {
            var next = child.nextSibling;
            this.insertBefore(child, refChild);
            child = next;
          }
          return newChild;
        }
        _insertBefore(this, newChild, refChild);
        newChild.ownerDocument = this;
        if (this.documentElement === null && newChild.nodeType === ELEMENT_NODE) {
          this.documentElement = newChild;
        }
        return newChild;
      },
      removeChild: function(oldChild) {
        var removed = _removeChild(this, oldChild);
        if (removed === this.documentElement) {
          this.documentElement = null;
        }
        return removed;
      },
      replaceChild: function(newChild, oldChild) {
        _insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
        newChild.ownerDocument = this;
        if (oldChild) {
          this.removeChild(oldChild);
        }
        if (isElementNode(newChild)) {
          this.documentElement = newChild;
        }
      },
      /**
       * Imports a node from another document into this document, creating a new copy owned by this
       * document. The source node and its subtree are not modified.
       *
       * @param {Node} importedNode
       * The node to import.
       * @param {boolean} deep
       * If true, the contents of the node are recursively imported.
       * If false, only the node itself (and its attributes, if it is an element) are imported.
       * @returns {Node}
       * Returns the newly created import of the node.
       * @see {@link importNode}
       * @see {@link https://dom.spec.whatwg.org/#dom-document-importnode}
       */
      importNode: function(importedNode, deep) {
        return importNode(this, importedNode, deep);
      },
      // Introduced in DOM Level 2:
      getElementById: function(id) {
        var rtv = null;
        _visitNode(this.documentElement, function(node) {
          if (node.nodeType == ELEMENT_NODE) {
            if (node.getAttribute("id") == id) {
              rtv = node;
              return true;
            }
          }
        });
        return rtv;
      },
      /**
       * Creates a new `Element` that is owned by this `Document`.
       * In HTML Documents `localName` is the lower cased `tagName`,
       * otherwise no transformation is being applied.
       * When `contentType` implies the HTML namespace, it will be set as `namespaceURI`.
       *
       * __This implementation differs from the specification:__ - The provided name is not checked
       * against the `Name` production,
       * so no related error will be thrown.
       * - There is no interface `HTMLElement`, it is always an `Element`.
       * - There is no support for a second argument to indicate using custom elements.
       *
       * @param {string} tagName
       * @returns {Element}
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement
       * @see https://dom.spec.whatwg.org/#dom-document-createelement
       * @see https://dom.spec.whatwg.org/#concept-create-element
       */
      createElement: function(tagName) {
        var node = new Element(PDC);
        node.ownerDocument = this;
        if (this.type === "html") {
          tagName = tagName.toLowerCase();
        }
        if (hasDefaultHTMLNamespace(this.contentType)) {
          node.namespaceURI = NAMESPACE.HTML;
        }
        node.nodeName = tagName;
        node.tagName = tagName;
        node.localName = tagName;
        node.childNodes = new NodeList();
        var attrs = node.attributes = new NamedNodeMap();
        attrs._ownerElement = node;
        return node;
      },
      /**
       * @returns {DocumentFragment}
       */
      createDocumentFragment: function() {
        var node = new DocumentFragment(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        return node;
      },
      /**
       * @param {string} data
       * @returns {Text}
       */
      createTextNode: function(data) {
        var node = new Text(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.appendData(data);
        return node;
      },
      /**
       * @param {string} data
       * @returns {Comment}
       * @see https://dom.spec.whatwg.org/#dom-document-createcomment
       * @see https://www.w3.org/TR/xml/#NT-Comment XML 1.0 production [15]
       * @see https://www.w3.org/TR/DOM-Parsing/#dfn-concept-serialize-xml §3.2.1.3
       *
       *      Note: no validation is performed at creation time. When the resulting document is
       *      serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
       *      if the comment data contains `--` anywhere, ends with `-`, or contains characters
       *      outside the XML Char production (W3C DOM Parsing §3.2.1.3). Without that option the
       *      data is emitted verbatim.
       */
      createComment: function(data) {
        var node = new Comment(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.appendData(data);
        return node;
      },
      /**
       * Returns a new CDATASection node whose data is `data`.
       *
       * __This implementation differs from the specification:__ - calling this method on an HTML
       * document does not throw `NotSupportedError`.
       *
       * @param {string} data
       * @returns {CDATASection}
       * @throws {DOMException}
       * With code `INVALID_CHARACTER_ERR` if `data` contains `"]]>"`.
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/createCDATASection
       * @see https://dom.spec.whatwg.org/#dom-document-createcdatasection
       */
      createCDATASection: function(data) {
        if (data.indexOf("]]>") !== -1) {
          throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'data contains "]]>"');
        }
        var node = new CDATASection(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.appendData(data);
        return node;
      },
      /**
       * Returns a ProcessingInstruction node whose target is target and data is data.
       *
       * __This behavior is slightly different from the in the specs__:
       * - it does not do any input validation on the arguments and doesn't throw
       * "InvalidCharacterError".
       *
       * Note: When the resulting document is serialized with `requireWellFormed: true`, the
       * serializer throws `InvalidStateError` if `.target` contains `:` or is an ASCII
       * case-insensitive match for `"xml"`, or if `.data` contains `?>` or characters outside the
       * XML Char production (W3C DOM Parsing §3.2.1.7). Without that option the data is emitted
       * verbatim.
       *
       * @param {string} target
       * @param {string} data
       * @returns {ProcessingInstruction}
       * @see https://developer.mozilla.org/docs/Web/API/Document/createProcessingInstruction
       * @see https://dom.spec.whatwg.org/#dom-document-createprocessinginstruction
       * @see https://www.w3.org/TR/DOM-Parsing/#dfn-concept-serialize-xml §3.2.1.7
       */
      createProcessingInstruction: function(target, data) {
        var node = new ProcessingInstruction(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.nodeName = node.target = target;
        node.nodeValue = node.data = data;
        return node;
      },
      /**
       * Creates an `Attr` node that is owned by this document.
       * In HTML Documents `localName` is the lower cased `name`,
       * otherwise no transformation is being applied.
       *
       * __This implementation differs from the specification:__ - The provided name is not checked
       * against the `Name` production,
       * so no related error will be thrown.
       *
       * @param {string} name
       * @returns {Attr}
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/createAttribute
       * @see https://dom.spec.whatwg.org/#dom-document-createattribute
       */
      createAttribute: function(name) {
        if (!g.QName_exact.test(name)) {
          throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'invalid character in name "' + name + '"');
        }
        if (this.type === "html") {
          name = name.toLowerCase();
        }
        return this._createAttribute(name);
      },
      _createAttribute: function(name) {
        var node = new Attr(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.name = name;
        node.nodeName = name;
        node.localName = name;
        node.specified = true;
        return node;
      },
      /**
       * Creates an EntityReference object.
       * The current implementation does not fill the `childNodes` with those of the corresponding
       * `Entity`
       *
       * @deprecated
       * In DOM Level 4.
       * @param {string} name
       * The name of the entity to reference. No namespace well-formedness checks are performed.
       * @returns {EntityReference}
       * @throws {DOMException}
       * With code `INVALID_CHARACTER_ERR` when `name` is not valid.
       * @throws {DOMException}
       * with code `NOT_SUPPORTED_ERR` when the document is of type `html`
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-392B75AE
       */
      createEntityReference: function(name) {
        if (!g.Name.test(name)) {
          throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'not a valid xml name "' + name + '"');
        }
        if (this.type === "html") {
          throw new DOMException("document is an html document", DOMExceptionName.NotSupportedError);
        }
        var node = new EntityReference(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.nodeName = name;
        return node;
      },
      // Introduced in DOM Level 2:
      /**
       * @param {string} namespaceURI
       * @param {string} qualifiedName
       * @returns {Element}
       */
      createElementNS: function(namespaceURI, qualifiedName) {
        var validated = validateAndExtract(namespaceURI, qualifiedName);
        var node = new Element(PDC);
        var attrs = node.attributes = new NamedNodeMap();
        node.childNodes = new NodeList();
        node.ownerDocument = this;
        node.nodeName = qualifiedName;
        node.tagName = qualifiedName;
        node.namespaceURI = validated[0];
        node.prefix = validated[1];
        node.localName = validated[2];
        attrs._ownerElement = node;
        return node;
      },
      // Introduced in DOM Level 2:
      /**
       * @param {string} namespaceURI
       * @param {string} qualifiedName
       * @returns {Attr}
       */
      createAttributeNS: function(namespaceURI, qualifiedName) {
        var validated = validateAndExtract(namespaceURI, qualifiedName);
        var node = new Attr(PDC);
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        node.nodeName = qualifiedName;
        node.name = qualifiedName;
        node.specified = true;
        node.namespaceURI = validated[0];
        node.prefix = validated[1];
        node.localName = validated[2];
        return node;
      }
    };
    _extends(Document, Node);
    function Element(symbol) {
      checkSymbol(symbol);
      this._nsMap = /* @__PURE__ */ Object.create(null);
    }
    Element.prototype = {
      nodeType: ELEMENT_NODE,
      /**
       * The attributes of this element.
       *
       * @type {NamedNodeMap | null}
       */
      attributes: null,
      getQualifiedName: function() {
        return this.prefix ? this.prefix + ":" + this.localName : this.localName;
      },
      _isInHTMLDocumentAndNamespace: function() {
        return this.ownerDocument.type === "html" && this.namespaceURI === NAMESPACE.HTML;
      },
      /**
       * Implementaton of Level2 Core function hasAttributes.
       *
       * @returns {boolean}
       * True if attribute list is not empty.
       * @see https://www.w3.org/TR/DOM-Level-2-Core/#core-ID-NodeHasAttrs
       */
      hasAttributes: function() {
        return !!(this.attributes && this.attributes.length);
      },
      hasAttribute: function(name) {
        return !!this.getAttributeNode(name);
      },
      /**
       * Returns element’s first attribute whose qualified name is `name`, and `null`
       * if there is no such attribute.
       *
       * @param {string} name
       * @returns {string | null}
       */
      getAttribute: function(name) {
        var attr = this.getAttributeNode(name);
        return attr ? attr.value : null;
      },
      getAttributeNode: function(name) {
        if (this._isInHTMLDocumentAndNamespace()) {
          name = name.toLowerCase();
        }
        return this.attributes.getNamedItem(name);
      },
      /**
       * Sets the value of element’s first attribute whose qualified name is qualifiedName to value.
       *
       * @param {string} name
       * @param {string} value
       */
      setAttribute: function(name, value) {
        if (this._isInHTMLDocumentAndNamespace()) {
          name = name.toLowerCase();
        }
        var attr = this.getAttributeNode(name);
        if (attr) {
          attr.value = attr.nodeValue = "" + value;
        } else {
          attr = this.ownerDocument._createAttribute(name);
          attr.value = attr.nodeValue = "" + value;
          this.setAttributeNode(attr);
        }
      },
      removeAttribute: function(name) {
        var attr = this.getAttributeNode(name);
        attr && this.removeAttributeNode(attr);
      },
      setAttributeNode: function(newAttr) {
        return this.attributes.setNamedItem(newAttr);
      },
      setAttributeNodeNS: function(newAttr) {
        return this.attributes.setNamedItemNS(newAttr);
      },
      removeAttributeNode: function(oldAttr) {
        return this.attributes.removeNamedItem(oldAttr.nodeName);
      },
      //get real attribute name,and remove it by removeAttributeNode
      removeAttributeNS: function(namespaceURI, localName) {
        var old = this.getAttributeNodeNS(namespaceURI, localName);
        old && this.removeAttributeNode(old);
      },
      hasAttributeNS: function(namespaceURI, localName) {
        return this.getAttributeNodeNS(namespaceURI, localName) != null;
      },
      /**
       * Returns element’s attribute whose namespace is `namespaceURI` and local name is
       * `localName`,
       * or `null` if there is no such attribute.
       *
       * @param {string} namespaceURI
       * @param {string} localName
       * @returns {string | null}
       */
      getAttributeNS: function(namespaceURI, localName) {
        var attr = this.getAttributeNodeNS(namespaceURI, localName);
        return attr ? attr.value : null;
      },
      /**
       * Sets the value of element’s attribute whose namespace is `namespaceURI` and local name is
       * `localName` to value.
       *
       * @param {string} namespaceURI
       * @param {string} qualifiedName
       * @param {string} value
       * @see https://dom.spec.whatwg.org/#dom-element-setattributens
       */
      setAttributeNS: function(namespaceURI, qualifiedName, value) {
        var validated = validateAndExtract(namespaceURI, qualifiedName);
        var localName = validated[2];
        var attr = this.getAttributeNodeNS(namespaceURI, localName);
        if (attr) {
          attr.value = attr.nodeValue = "" + value;
        } else {
          attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
          attr.value = attr.nodeValue = "" + value;
          this.setAttributeNode(attr);
        }
      },
      getAttributeNodeNS: function(namespaceURI, localName) {
        return this.attributes.getNamedItemNS(namespaceURI, localName);
      },
      /**
       * Returns a LiveNodeList of all child elements which have **all** of the given class name(s).
       *
       * Returns an empty list if `classNames` is an empty string or only contains HTML white space
       * characters.
       *
       * Warning: This returns a live LiveNodeList.
       * Changes in the DOM will reflect in the array as the changes occur.
       * If an element selected by this array no longer qualifies for the selector,
       * it will automatically be removed. Be aware of this for iteration purposes.
       *
       * @param {string} classNames
       * Is a string representing the class name(s) to match; multiple class names are separated by
       * (ASCII-)whitespace.
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getElementsByClassName
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName
       * @see https://dom.spec.whatwg.org/#concept-getelementsbyclassname
       */
      getElementsByClassName: function(classNames) {
        var classNamesSet = toOrderedSet(classNames);
        return new LiveNodeList(this, function(base) {
          var ls = [];
          if (classNamesSet.length > 0) {
            _visitNode(base, function(node) {
              if (node !== base && node.nodeType === ELEMENT_NODE) {
                var nodeClassNames = node.getAttribute("class");
                if (nodeClassNames) {
                  var matches = classNames === nodeClassNames;
                  if (!matches) {
                    var nodeClassNamesSet = toOrderedSet(nodeClassNames);
                    matches = classNamesSet.every(arrayIncludes(nodeClassNamesSet));
                  }
                  if (matches) {
                    ls.push(node);
                  }
                }
              }
            });
          }
          return ls;
        });
      },
      /**
       * Returns a LiveNodeList of elements with the given qualifiedName.
       * Searching for all descendants can be done by passing `*` as `qualifiedName`.
       *
       * All descendants of the specified element are searched, but not the element itself.
       * The returned list is live, which means it updates itself with the DOM tree automatically.
       * Therefore, there is no need to call `Element.getElementsByTagName()`
       * with the same element and arguments repeatedly if the DOM changes in between calls.
       *
       * When called on an HTML element in an HTML document,
       * `getElementsByTagName` lower-cases the argument before searching for it.
       * This is undesirable when trying to match camel-cased SVG elements (such as
       * `<linearGradient>`) in an HTML document.
       * Instead, use `Element.getElementsByTagNameNS()`,
       * which preserves the capitalization of the tag name.
       *
       * `Element.getElementsByTagName` is similar to `Document.getElementsByTagName()`,
       * except that it only searches for elements that are descendants of the specified element.
       *
       * @param {string} qualifiedName
       * @returns {LiveNodeList}
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getElementsByTagName
       * @see https://dom.spec.whatwg.org/#concept-getelementsbytagname
       */
      getElementsByTagName: function(qualifiedName) {
        var isHTMLDocument = (this.nodeType === DOCUMENT_NODE ? this : this.ownerDocument).type === "html";
        var lowerQualifiedName = qualifiedName.toLowerCase();
        return new LiveNodeList(this, function(base) {
          var ls = [];
          _visitNode(base, function(node) {
            if (node === base || node.nodeType !== ELEMENT_NODE) {
              return;
            }
            if (qualifiedName === "*") {
              ls.push(node);
            } else {
              var nodeQualifiedName = node.getQualifiedName();
              var matchingQName = isHTMLDocument && node.namespaceURI === NAMESPACE.HTML ? lowerQualifiedName : qualifiedName;
              if (nodeQualifiedName === matchingQName) {
                ls.push(node);
              }
            }
          });
          return ls;
        });
      },
      getElementsByTagNameNS: function(namespaceURI, localName) {
        return new LiveNodeList(this, function(base) {
          var ls = [];
          _visitNode(base, function(node) {
            if (node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === "*" || node.namespaceURI === namespaceURI) && (localName === "*" || node.localName == localName)) {
              ls.push(node);
            }
          });
          return ls;
        });
      }
    };
    Document.prototype.getElementsByClassName = Element.prototype.getElementsByClassName;
    Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
    Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;
    _extends(Element, Node);
    function Attr(symbol) {
      checkSymbol(symbol);
      this.namespaceURI = null;
      this.prefix = null;
      this.ownerElement = null;
    }
    Attr.prototype.nodeType = ATTRIBUTE_NODE;
    _extends(Attr, Node);
    function CharacterData(symbol) {
      checkSymbol(symbol);
    }
    CharacterData.prototype = {
      data: "",
      substringData: function(offset, count) {
        return this.data.substring(offset, offset + count);
      },
      appendData: function(text) {
        text = this.data + text;
        this.nodeValue = this.data = text;
        this.length = text.length;
      },
      insertData: function(offset, text) {
        this.replaceData(offset, 0, text);
      },
      deleteData: function(offset, count) {
        this.replaceData(offset, count, "");
      },
      replaceData: function(offset, count, text) {
        var start = this.data.substring(0, offset);
        var end = this.data.substring(offset + count);
        text = start + text + end;
        this.nodeValue = this.data = text;
        this.length = text.length;
      }
    };
    _extends(CharacterData, Node);
    function Text(symbol) {
      checkSymbol(symbol);
    }
    Text.prototype = {
      nodeName: "#text",
      nodeType: TEXT_NODE,
      splitText: function(offset) {
        var text = this.data;
        var newText = text.substring(offset);
        text = text.substring(0, offset);
        this.data = this.nodeValue = text;
        this.length = text.length;
        var newNode = this.ownerDocument.createTextNode(newText);
        if (this.parentNode) {
          this.parentNode.insertBefore(newNode, this.nextSibling);
        }
        return newNode;
      }
    };
    _extends(Text, CharacterData);
    function Comment(symbol) {
      checkSymbol(symbol);
    }
    Comment.prototype = {
      nodeName: "#comment",
      nodeType: COMMENT_NODE
    };
    _extends(Comment, CharacterData);
    function CDATASection(symbol) {
      checkSymbol(symbol);
    }
    CDATASection.prototype = {
      nodeName: "#cdata-section",
      nodeType: CDATA_SECTION_NODE
    };
    _extends(CDATASection, Text);
    function DocumentType(symbol) {
      checkSymbol(symbol);
    }
    DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
    _extends(DocumentType, Node);
    function Notation(symbol) {
      checkSymbol(symbol);
    }
    Notation.prototype.nodeType = NOTATION_NODE;
    _extends(Notation, Node);
    function Entity(symbol) {
      checkSymbol(symbol);
    }
    Entity.prototype.nodeType = ENTITY_NODE;
    _extends(Entity, Node);
    function EntityReference(symbol) {
      checkSymbol(symbol);
    }
    EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
    _extends(EntityReference, Node);
    function DocumentFragment(symbol) {
      checkSymbol(symbol);
    }
    DocumentFragment.prototype.nodeName = "#document-fragment";
    DocumentFragment.prototype.nodeType = DOCUMENT_FRAGMENT_NODE;
    _extends(DocumentFragment, Node);
    function ProcessingInstruction(symbol) {
      checkSymbol(symbol);
    }
    ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
    _extends(ProcessingInstruction, CharacterData);
    function XMLSerializer() {
    }
    XMLSerializer.prototype.serializeToString = function(node, options) {
      return nodeSerializeToString.call(node, options);
    };
    Node.prototype.toString = nodeSerializeToString;
    function nodeSerializeToString(options) {
      var opts;
      if (typeof options === "function") {
        opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: options };
      } else if (options != null) {
        opts = {
          requireWellFormed: !!options.requireWellFormed,
          splitCDATASections: options.splitCDATASections !== false,
          nodeFilter: options.nodeFilter || null
        };
      } else {
        opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: null };
      }
      var buf = [];
      var refNode = this.nodeType === DOCUMENT_NODE && this.documentElement || this;
      var prefix = refNode.prefix;
      var uri = refNode.namespaceURI;
      if (uri && prefix == null) {
        var prefix = refNode.lookupPrefix(uri);
        if (prefix == null) {
          var visibleNamespaces = [
            { namespace: uri, prefix: null }
            //{namespace:uri,prefix:''}
          ];
        }
      }
      serializeToString(this, buf, visibleNamespaces, opts);
      return buf.join("");
    }
    function needNamespaceDefine(node, isHTML, visibleNamespaces) {
      var prefix = node.prefix || "";
      var uri = node.namespaceURI;
      if (!uri) {
        return false;
      }
      if (prefix === "xml" && uri === NAMESPACE.XML || uri === NAMESPACE.XMLNS) {
        return false;
      }
      var i = visibleNamespaces.length;
      while (i--) {
        var ns = visibleNamespaces[i];
        if (ns.prefix === prefix) {
          return ns.namespace !== uri;
        }
      }
      return true;
    }
    function addSerializedAttribute(buf, qualifiedName, value) {
      buf.push(" ", qualifiedName, '="', value.replace(/[<>&"\t\n\r]/g, _xmlEncoder), '"');
    }
    function serializeToString(node, buf, visibleNamespaces, opts) {
      if (!visibleNamespaces) {
        visibleNamespaces = [];
      }
      var nodeFilter = opts.nodeFilter;
      var requireWellFormed = opts.requireWellFormed;
      var splitCDATASections = opts.splitCDATASections;
      var doc = node.nodeType === DOCUMENT_NODE ? node : node.ownerDocument;
      var isHTML = doc.type === "html";
      walkDOM(
        node,
        { ns: visibleNamespaces },
        {
          enter: function(n, ctx) {
            var namespaces = ctx.ns;
            if (nodeFilter) {
              n = nodeFilter(n);
              if (n) {
                if (typeof n == "string") {
                  buf.push(n);
                  return null;
                }
              } else {
                return null;
              }
            }
            switch (n.nodeType) {
              case ELEMENT_NODE:
                var attrs = n.attributes;
                var len = attrs.length;
                var nodeName = n.tagName;
                var prefixedNodeName = nodeName;
                if (!isHTML && !n.prefix && n.namespaceURI) {
                  var defaultNS;
                  for (var ai = 0; ai < attrs.length; ai++) {
                    if (attrs.item(ai).name === "xmlns") {
                      defaultNS = attrs.item(ai).value;
                      break;
                    }
                  }
                  if (!defaultNS) {
                    for (var nsi = namespaces.length - 1; nsi >= 0; nsi--) {
                      var nsEntry = namespaces[nsi];
                      if (nsEntry.prefix === "" && nsEntry.namespace === n.namespaceURI) {
                        defaultNS = nsEntry.namespace;
                        break;
                      }
                    }
                  }
                  if (defaultNS !== n.namespaceURI) {
                    for (var nsi = namespaces.length - 1; nsi >= 0; nsi--) {
                      var nsEntry = namespaces[nsi];
                      if (nsEntry.namespace === n.namespaceURI) {
                        if (nsEntry.prefix) {
                          prefixedNodeName = nsEntry.prefix + ":" + nodeName;
                        }
                        break;
                      }
                    }
                  }
                }
                buf.push("<", prefixedNodeName);
                var childNamespaces = namespaces.slice();
                for (var i = 0; i < len; i++) {
                  var attr = attrs.item(i);
                  if (attr.prefix == "xmlns") {
                    childNamespaces.push({
                      prefix: attr.localName,
                      namespace: attr.value
                    });
                  } else if (attr.nodeName == "xmlns") {
                    childNamespaces.push({ prefix: "", namespace: attr.value });
                  }
                }
                for (var i = 0; i < len; i++) {
                  var attr = attrs.item(i);
                  if (needNamespaceDefine(attr, isHTML, childNamespaces)) {
                    var attrPrefix = attr.prefix || "";
                    var uri = attr.namespaceURI;
                    addSerializedAttribute(buf, attrPrefix ? "xmlns:" + attrPrefix : "xmlns", uri);
                    childNamespaces.push({ prefix: attrPrefix, namespace: uri });
                  }
                  var filteredAttr = nodeFilter ? nodeFilter(attr) : attr;
                  if (filteredAttr) {
                    if (typeof filteredAttr === "string") {
                      buf.push(filteredAttr);
                    } else {
                      addSerializedAttribute(buf, filteredAttr.name, filteredAttr.value);
                    }
                  }
                }
                if (nodeName === prefixedNodeName && needNamespaceDefine(n, isHTML, childNamespaces)) {
                  var nodePrefix = n.prefix || "";
                  var uri = n.namespaceURI;
                  addSerializedAttribute(buf, nodePrefix ? "xmlns:" + nodePrefix : "xmlns", uri);
                  childNamespaces.push({ prefix: nodePrefix, namespace: uri });
                }
                var canCloseTag = !n.firstChild;
                if (canCloseTag && (isHTML || n.namespaceURI === NAMESPACE.HTML)) {
                  canCloseTag = isHTMLVoidElement(nodeName);
                }
                if (canCloseTag) {
                  buf.push("/>");
                  return null;
                }
                buf.push(">");
                if (isHTML && isHTMLRawTextElement(nodeName)) {
                  var child = n.firstChild;
                  while (child) {
                    if (child.data) {
                      buf.push(child.data);
                    } else {
                      serializeToString(child, buf, childNamespaces.slice(), opts);
                    }
                    child = child.nextSibling;
                  }
                  buf.push("</", prefixedNodeName, ">");
                  return null;
                }
                return { ns: childNamespaces, tag: prefixedNodeName };
              case DOCUMENT_NODE:
              case DOCUMENT_FRAGMENT_NODE:
                if (requireWellFormed && n.nodeType === DOCUMENT_NODE && n.documentElement == null) {
                  throw new DOMException("The Document has no documentElement", DOMExceptionName.InvalidStateError);
                }
                return { ns: namespaces };
              case ATTRIBUTE_NODE:
                addSerializedAttribute(buf, n.name, n.value);
                return null;
              case TEXT_NODE:
                if (requireWellFormed && g.InvalidChar.test(n.data)) {
                  throw new DOMException(
                    "The Text node data contains characters outside the XML Char production",
                    DOMExceptionName.InvalidStateError
                  );
                }
                buf.push(n.data.replace(/[<&>]/g, _xmlEncoder));
                return null;
              case CDATA_SECTION_NODE:
                if (requireWellFormed && n.data.indexOf("]]>") !== -1) {
                  throw new DOMException('The CDATASection data contains "]]>"', DOMExceptionName.InvalidStateError);
                }
                if (splitCDATASections) {
                  buf.push(g.CDATA_START, n.data.replace(/]]>/g, "]]]]><![CDATA[>"), g.CDATA_END);
                } else {
                  buf.push(g.CDATA_START, n.data, g.CDATA_END);
                }
                return null;
              case COMMENT_NODE:
                if (requireWellFormed) {
                  if (g.InvalidChar.test(n.data)) {
                    throw new DOMException(
                      "The comment node data contains characters outside the XML Char production",
                      DOMExceptionName.InvalidStateError
                    );
                  }
                  if (n.data.indexOf("--") !== -1 || n.data[n.data.length - 1] === "-") {
                    throw new DOMException(
                      'The comment node data contains "--" or ends with "-"',
                      DOMExceptionName.InvalidStateError
                    );
                  }
                }
                buf.push(g.COMMENT_START, n.data, g.COMMENT_END);
                return null;
              case DOCUMENT_TYPE_NODE:
                var pubid = n.publicId;
                var sysid = n.systemId;
                if (requireWellFormed) {
                  if (pubid && !g.PubidLiteral_match.test(pubid)) {
                    throw new DOMException("DocumentType publicId is not a valid PubidLiteral", DOMExceptionName.InvalidStateError);
                  }
                  if (sysid && sysid !== "." && !g.SystemLiteral_match.test(sysid)) {
                    throw new DOMException("DocumentType systemId is not a valid SystemLiteral", DOMExceptionName.InvalidStateError);
                  }
                  if (n.internalSubset && n.internalSubset.indexOf("]>") !== -1) {
                    throw new DOMException('DocumentType internalSubset contains "]>"', DOMExceptionName.InvalidStateError);
                  }
                }
                buf.push(g.DOCTYPE_DECL_START, " ", n.name);
                if (pubid) {
                  buf.push(" ", g.PUBLIC, " ", pubid);
                  if (sysid && sysid !== ".") {
                    buf.push(" ", sysid);
                  }
                } else if (sysid && sysid !== ".") {
                  buf.push(" ", g.SYSTEM, " ", sysid);
                }
                if (n.internalSubset) {
                  buf.push(" [", n.internalSubset, "]");
                }
                buf.push(">");
                return null;
              case PROCESSING_INSTRUCTION_NODE:
                if (requireWellFormed) {
                  if (n.target.indexOf(":") !== -1 || n.target.toLowerCase() === "xml") {
                    throw new DOMException("The ProcessingInstruction target is not well-formed", DOMExceptionName.InvalidStateError);
                  }
                  if (g.InvalidChar.test(n.data)) {
                    throw new DOMException(
                      "The ProcessingInstruction data contains characters outside the XML Char production",
                      DOMExceptionName.InvalidStateError
                    );
                  }
                  if (n.data.indexOf("?>") !== -1) {
                    throw new DOMException('The ProcessingInstruction data contains "?>"', DOMExceptionName.InvalidStateError);
                  }
                }
                buf.push("<?", n.target, " ", n.data, "?>");
                return null;
              case ENTITY_REFERENCE_NODE:
                buf.push("&", n.nodeName, ";");
                return null;
              //case ENTITY_NODE:
              //case NOTATION_NODE:
              default:
                buf.push("??", n.nodeName);
                return null;
            }
          },
          exit: function(n, childCtx) {
            if (childCtx && childCtx.tag) {
              buf.push("</", childCtx.tag, ">");
            }
          }
        }
      );
    }
    function importNode(doc, node, deep) {
      var destRoot;
      walkDOM(node, null, {
        enter: function(srcNode, destParent) {
          var destNode = srcNode.cloneNode(false);
          destNode.ownerDocument = doc;
          destNode.parentNode = null;
          if (destParent === null) {
            destRoot = destNode;
          } else {
            destParent.appendChild(destNode);
          }
          var shouldDeep = srcNode.nodeType === ATTRIBUTE_NODE || deep;
          return shouldDeep ? destNode : null;
        }
      });
      return destRoot;
    }
    function cloneNode(doc, node, deep) {
      var destRoot;
      walkDOM(node, null, {
        enter: function(srcNode, destParent) {
          var destNode = new srcNode.constructor(PDC);
          for (var n in srcNode) {
            if (hasOwn(srcNode, n)) {
              var v = srcNode[n];
              if (typeof v != "object") {
                if (v != destNode[n]) {
                  destNode[n] = v;
                }
              }
            }
          }
          if (srcNode.childNodes) {
            destNode.childNodes = new NodeList();
          }
          destNode.ownerDocument = doc;
          var shouldDeep = deep;
          switch (destNode.nodeType) {
            case ELEMENT_NODE:
              var attrs = srcNode.attributes;
              var attrs2 = destNode.attributes = new NamedNodeMap();
              var len = attrs.length;
              attrs2._ownerElement = destNode;
              for (var i = 0; i < len; i++) {
                destNode.setAttributeNode(cloneNode(doc, attrs.item(i), true));
              }
              break;
            case ATTRIBUTE_NODE:
              shouldDeep = true;
          }
          if (destParent !== null) {
            destParent.appendChild(destNode);
          } else {
            destRoot = destNode;
          }
          return shouldDeep ? destNode : null;
        }
      });
      return destRoot;
    }
    function __set__(object, key, value) {
      object[key] = value;
    }
    function childrenRefresh(node) {
      var ls = [];
      var child = node.firstChild;
      while (child) {
        if (child.nodeType === ELEMENT_NODE) {
          ls.push(child);
        }
        child = child.nextSibling;
      }
      return ls;
    }
    try {
      if (Object.defineProperty) {
        Object.defineProperty(LiveNodeList.prototype, "length", {
          get: function() {
            _updateLiveList(this);
            return this.$$length;
          }
        });
        Object.defineProperty(Node.prototype, "textContent", {
          get: function() {
            if (this.nodeType === ELEMENT_NODE || this.nodeType === DOCUMENT_FRAGMENT_NODE) {
              var buf = [];
              walkDOM(this, null, {
                enter: function(n) {
                  if (n.nodeType === ELEMENT_NODE || n.nodeType === DOCUMENT_FRAGMENT_NODE) {
                    return true;
                  }
                  if (n.nodeType === PROCESSING_INSTRUCTION_NODE || n.nodeType === COMMENT_NODE) {
                    return null;
                  }
                  buf.push(n.nodeValue);
                }
              });
              return buf.join("");
            }
            return this.nodeValue;
          },
          set: function(data) {
            switch (this.nodeType) {
              case ELEMENT_NODE:
              case DOCUMENT_FRAGMENT_NODE:
                while (this.firstChild) {
                  this.removeChild(this.firstChild);
                }
                if (data || String(data)) {
                  this.appendChild(this.ownerDocument.createTextNode(data));
                }
                break;
              default:
                this.data = data;
                this.value = data;
                this.nodeValue = data;
            }
          }
        });
        Object.defineProperty(Element.prototype, "children", {
          get: function() {
            return new LiveNodeList(this, childrenRefresh);
          }
        });
        Object.defineProperty(Document.prototype, "children", {
          get: function() {
            return new LiveNodeList(this, childrenRefresh);
          }
        });
        Object.defineProperty(DocumentFragment.prototype, "children", {
          get: function() {
            return new LiveNodeList(this, childrenRefresh);
          }
        });
        __set__ = function(object, key, value) {
          object["$$" + key] = value;
        };
      }
    } catch (e) {
    }
    exports._updateLiveList = _updateLiveList;
    exports.Attr = Attr;
    exports.CDATASection = CDATASection;
    exports.CharacterData = CharacterData;
    exports.Comment = Comment;
    exports.Document = Document;
    exports.DocumentFragment = DocumentFragment;
    exports.DocumentType = DocumentType;
    exports.DOMImplementation = DOMImplementation;
    exports.Element = Element;
    exports.Entity = Entity;
    exports.EntityReference = EntityReference;
    exports.LiveNodeList = LiveNodeList;
    exports.NamedNodeMap = NamedNodeMap;
    exports.Node = Node;
    exports.NodeList = NodeList;
    exports.Notation = Notation;
    exports.Text = Text;
    exports.ProcessingInstruction = ProcessingInstruction;
    exports.walkDOM = walkDOM;
    exports.XMLSerializer = XMLSerializer;
  }
});

// node_modules/@xmldom/xmldom/lib/entities.js
var require_entities = __commonJS({
  "node_modules/@xmldom/xmldom/lib/entities.js"(exports) {
    "use strict";
    var freeze = require_conventions().freeze;
    exports.XML_ENTITIES = freeze({
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      quot: '"'
    });
    exports.HTML_ENTITIES = freeze({
      Aacute: "\xC1",
      aacute: "\xE1",
      Abreve: "\u0102",
      abreve: "\u0103",
      ac: "\u223E",
      acd: "\u223F",
      acE: "\u223E\u0333",
      Acirc: "\xC2",
      acirc: "\xE2",
      acute: "\xB4",
      Acy: "\u0410",
      acy: "\u0430",
      AElig: "\xC6",
      aelig: "\xE6",
      af: "\u2061",
      Afr: "\u{1D504}",
      afr: "\u{1D51E}",
      Agrave: "\xC0",
      agrave: "\xE0",
      alefsym: "\u2135",
      aleph: "\u2135",
      Alpha: "\u0391",
      alpha: "\u03B1",
      Amacr: "\u0100",
      amacr: "\u0101",
      amalg: "\u2A3F",
      AMP: "&",
      amp: "&",
      And: "\u2A53",
      and: "\u2227",
      andand: "\u2A55",
      andd: "\u2A5C",
      andslope: "\u2A58",
      andv: "\u2A5A",
      ang: "\u2220",
      ange: "\u29A4",
      angle: "\u2220",
      angmsd: "\u2221",
      angmsdaa: "\u29A8",
      angmsdab: "\u29A9",
      angmsdac: "\u29AA",
      angmsdad: "\u29AB",
      angmsdae: "\u29AC",
      angmsdaf: "\u29AD",
      angmsdag: "\u29AE",
      angmsdah: "\u29AF",
      angrt: "\u221F",
      angrtvb: "\u22BE",
      angrtvbd: "\u299D",
      angsph: "\u2222",
      angst: "\xC5",
      angzarr: "\u237C",
      Aogon: "\u0104",
      aogon: "\u0105",
      Aopf: "\u{1D538}",
      aopf: "\u{1D552}",
      ap: "\u2248",
      apacir: "\u2A6F",
      apE: "\u2A70",
      ape: "\u224A",
      apid: "\u224B",
      apos: "'",
      ApplyFunction: "\u2061",
      approx: "\u2248",
      approxeq: "\u224A",
      Aring: "\xC5",
      aring: "\xE5",
      Ascr: "\u{1D49C}",
      ascr: "\u{1D4B6}",
      Assign: "\u2254",
      ast: "*",
      asymp: "\u2248",
      asympeq: "\u224D",
      Atilde: "\xC3",
      atilde: "\xE3",
      Auml: "\xC4",
      auml: "\xE4",
      awconint: "\u2233",
      awint: "\u2A11",
      backcong: "\u224C",
      backepsilon: "\u03F6",
      backprime: "\u2035",
      backsim: "\u223D",
      backsimeq: "\u22CD",
      Backslash: "\u2216",
      Barv: "\u2AE7",
      barvee: "\u22BD",
      Barwed: "\u2306",
      barwed: "\u2305",
      barwedge: "\u2305",
      bbrk: "\u23B5",
      bbrktbrk: "\u23B6",
      bcong: "\u224C",
      Bcy: "\u0411",
      bcy: "\u0431",
      bdquo: "\u201E",
      becaus: "\u2235",
      Because: "\u2235",
      because: "\u2235",
      bemptyv: "\u29B0",
      bepsi: "\u03F6",
      bernou: "\u212C",
      Bernoullis: "\u212C",
      Beta: "\u0392",
      beta: "\u03B2",
      beth: "\u2136",
      between: "\u226C",
      Bfr: "\u{1D505}",
      bfr: "\u{1D51F}",
      bigcap: "\u22C2",
      bigcirc: "\u25EF",
      bigcup: "\u22C3",
      bigodot: "\u2A00",
      bigoplus: "\u2A01",
      bigotimes: "\u2A02",
      bigsqcup: "\u2A06",
      bigstar: "\u2605",
      bigtriangledown: "\u25BD",
      bigtriangleup: "\u25B3",
      biguplus: "\u2A04",
      bigvee: "\u22C1",
      bigwedge: "\u22C0",
      bkarow: "\u290D",
      blacklozenge: "\u29EB",
      blacksquare: "\u25AA",
      blacktriangle: "\u25B4",
      blacktriangledown: "\u25BE",
      blacktriangleleft: "\u25C2",
      blacktriangleright: "\u25B8",
      blank: "\u2423",
      blk12: "\u2592",
      blk14: "\u2591",
      blk34: "\u2593",
      block: "\u2588",
      bne: "=\u20E5",
      bnequiv: "\u2261\u20E5",
      bNot: "\u2AED",
      bnot: "\u2310",
      Bopf: "\u{1D539}",
      bopf: "\u{1D553}",
      bot: "\u22A5",
      bottom: "\u22A5",
      bowtie: "\u22C8",
      boxbox: "\u29C9",
      boxDL: "\u2557",
      boxDl: "\u2556",
      boxdL: "\u2555",
      boxdl: "\u2510",
      boxDR: "\u2554",
      boxDr: "\u2553",
      boxdR: "\u2552",
      boxdr: "\u250C",
      boxH: "\u2550",
      boxh: "\u2500",
      boxHD: "\u2566",
      boxHd: "\u2564",
      boxhD: "\u2565",
      boxhd: "\u252C",
      boxHU: "\u2569",
      boxHu: "\u2567",
      boxhU: "\u2568",
      boxhu: "\u2534",
      boxminus: "\u229F",
      boxplus: "\u229E",
      boxtimes: "\u22A0",
      boxUL: "\u255D",
      boxUl: "\u255C",
      boxuL: "\u255B",
      boxul: "\u2518",
      boxUR: "\u255A",
      boxUr: "\u2559",
      boxuR: "\u2558",
      boxur: "\u2514",
      boxV: "\u2551",
      boxv: "\u2502",
      boxVH: "\u256C",
      boxVh: "\u256B",
      boxvH: "\u256A",
      boxvh: "\u253C",
      boxVL: "\u2563",
      boxVl: "\u2562",
      boxvL: "\u2561",
      boxvl: "\u2524",
      boxVR: "\u2560",
      boxVr: "\u255F",
      boxvR: "\u255E",
      boxvr: "\u251C",
      bprime: "\u2035",
      Breve: "\u02D8",
      breve: "\u02D8",
      brvbar: "\xA6",
      Bscr: "\u212C",
      bscr: "\u{1D4B7}",
      bsemi: "\u204F",
      bsim: "\u223D",
      bsime: "\u22CD",
      bsol: "\\",
      bsolb: "\u29C5",
      bsolhsub: "\u27C8",
      bull: "\u2022",
      bullet: "\u2022",
      bump: "\u224E",
      bumpE: "\u2AAE",
      bumpe: "\u224F",
      Bumpeq: "\u224E",
      bumpeq: "\u224F",
      Cacute: "\u0106",
      cacute: "\u0107",
      Cap: "\u22D2",
      cap: "\u2229",
      capand: "\u2A44",
      capbrcup: "\u2A49",
      capcap: "\u2A4B",
      capcup: "\u2A47",
      capdot: "\u2A40",
      CapitalDifferentialD: "\u2145",
      caps: "\u2229\uFE00",
      caret: "\u2041",
      caron: "\u02C7",
      Cayleys: "\u212D",
      ccaps: "\u2A4D",
      Ccaron: "\u010C",
      ccaron: "\u010D",
      Ccedil: "\xC7",
      ccedil: "\xE7",
      Ccirc: "\u0108",
      ccirc: "\u0109",
      Cconint: "\u2230",
      ccups: "\u2A4C",
      ccupssm: "\u2A50",
      Cdot: "\u010A",
      cdot: "\u010B",
      cedil: "\xB8",
      Cedilla: "\xB8",
      cemptyv: "\u29B2",
      cent: "\xA2",
      CenterDot: "\xB7",
      centerdot: "\xB7",
      Cfr: "\u212D",
      cfr: "\u{1D520}",
      CHcy: "\u0427",
      chcy: "\u0447",
      check: "\u2713",
      checkmark: "\u2713",
      Chi: "\u03A7",
      chi: "\u03C7",
      cir: "\u25CB",
      circ: "\u02C6",
      circeq: "\u2257",
      circlearrowleft: "\u21BA",
      circlearrowright: "\u21BB",
      circledast: "\u229B",
      circledcirc: "\u229A",
      circleddash: "\u229D",
      CircleDot: "\u2299",
      circledR: "\xAE",
      circledS: "\u24C8",
      CircleMinus: "\u2296",
      CirclePlus: "\u2295",
      CircleTimes: "\u2297",
      cirE: "\u29C3",
      cire: "\u2257",
      cirfnint: "\u2A10",
      cirmid: "\u2AEF",
      cirscir: "\u29C2",
      ClockwiseContourIntegral: "\u2232",
      CloseCurlyDoubleQuote: "\u201D",
      CloseCurlyQuote: "\u2019",
      clubs: "\u2663",
      clubsuit: "\u2663",
      Colon: "\u2237",
      colon: ":",
      Colone: "\u2A74",
      colone: "\u2254",
      coloneq: "\u2254",
      comma: ",",
      commat: "@",
      comp: "\u2201",
      compfn: "\u2218",
      complement: "\u2201",
      complexes: "\u2102",
      cong: "\u2245",
      congdot: "\u2A6D",
      Congruent: "\u2261",
      Conint: "\u222F",
      conint: "\u222E",
      ContourIntegral: "\u222E",
      Copf: "\u2102",
      copf: "\u{1D554}",
      coprod: "\u2210",
      Coproduct: "\u2210",
      COPY: "\xA9",
      copy: "\xA9",
      copysr: "\u2117",
      CounterClockwiseContourIntegral: "\u2233",
      crarr: "\u21B5",
      Cross: "\u2A2F",
      cross: "\u2717",
      Cscr: "\u{1D49E}",
      cscr: "\u{1D4B8}",
      csub: "\u2ACF",
      csube: "\u2AD1",
      csup: "\u2AD0",
      csupe: "\u2AD2",
      ctdot: "\u22EF",
      cudarrl: "\u2938",
      cudarrr: "\u2935",
      cuepr: "\u22DE",
      cuesc: "\u22DF",
      cularr: "\u21B6",
      cularrp: "\u293D",
      Cup: "\u22D3",
      cup: "\u222A",
      cupbrcap: "\u2A48",
      CupCap: "\u224D",
      cupcap: "\u2A46",
      cupcup: "\u2A4A",
      cupdot: "\u228D",
      cupor: "\u2A45",
      cups: "\u222A\uFE00",
      curarr: "\u21B7",
      curarrm: "\u293C",
      curlyeqprec: "\u22DE",
      curlyeqsucc: "\u22DF",
      curlyvee: "\u22CE",
      curlywedge: "\u22CF",
      curren: "\xA4",
      curvearrowleft: "\u21B6",
      curvearrowright: "\u21B7",
      cuvee: "\u22CE",
      cuwed: "\u22CF",
      cwconint: "\u2232",
      cwint: "\u2231",
      cylcty: "\u232D",
      Dagger: "\u2021",
      dagger: "\u2020",
      daleth: "\u2138",
      Darr: "\u21A1",
      dArr: "\u21D3",
      darr: "\u2193",
      dash: "\u2010",
      Dashv: "\u2AE4",
      dashv: "\u22A3",
      dbkarow: "\u290F",
      dblac: "\u02DD",
      Dcaron: "\u010E",
      dcaron: "\u010F",
      Dcy: "\u0414",
      dcy: "\u0434",
      DD: "\u2145",
      dd: "\u2146",
      ddagger: "\u2021",
      ddarr: "\u21CA",
      DDotrahd: "\u2911",
      ddotseq: "\u2A77",
      deg: "\xB0",
      Del: "\u2207",
      Delta: "\u0394",
      delta: "\u03B4",
      demptyv: "\u29B1",
      dfisht: "\u297F",
      Dfr: "\u{1D507}",
      dfr: "\u{1D521}",
      dHar: "\u2965",
      dharl: "\u21C3",
      dharr: "\u21C2",
      DiacriticalAcute: "\xB4",
      DiacriticalDot: "\u02D9",
      DiacriticalDoubleAcute: "\u02DD",
      DiacriticalGrave: "`",
      DiacriticalTilde: "\u02DC",
      diam: "\u22C4",
      Diamond: "\u22C4",
      diamond: "\u22C4",
      diamondsuit: "\u2666",
      diams: "\u2666",
      die: "\xA8",
      DifferentialD: "\u2146",
      digamma: "\u03DD",
      disin: "\u22F2",
      div: "\xF7",
      divide: "\xF7",
      divideontimes: "\u22C7",
      divonx: "\u22C7",
      DJcy: "\u0402",
      djcy: "\u0452",
      dlcorn: "\u231E",
      dlcrop: "\u230D",
      dollar: "$",
      Dopf: "\u{1D53B}",
      dopf: "\u{1D555}",
      Dot: "\xA8",
      dot: "\u02D9",
      DotDot: "\u20DC",
      doteq: "\u2250",
      doteqdot: "\u2251",
      DotEqual: "\u2250",
      dotminus: "\u2238",
      dotplus: "\u2214",
      dotsquare: "\u22A1",
      doublebarwedge: "\u2306",
      DoubleContourIntegral: "\u222F",
      DoubleDot: "\xA8",
      DoubleDownArrow: "\u21D3",
      DoubleLeftArrow: "\u21D0",
      DoubleLeftRightArrow: "\u21D4",
      DoubleLeftTee: "\u2AE4",
      DoubleLongLeftArrow: "\u27F8",
      DoubleLongLeftRightArrow: "\u27FA",
      DoubleLongRightArrow: "\u27F9",
      DoubleRightArrow: "\u21D2",
      DoubleRightTee: "\u22A8",
      DoubleUpArrow: "\u21D1",
      DoubleUpDownArrow: "\u21D5",
      DoubleVerticalBar: "\u2225",
      DownArrow: "\u2193",
      Downarrow: "\u21D3",
      downarrow: "\u2193",
      DownArrowBar: "\u2913",
      DownArrowUpArrow: "\u21F5",
      DownBreve: "\u0311",
      downdownarrows: "\u21CA",
      downharpoonleft: "\u21C3",
      downharpoonright: "\u21C2",
      DownLeftRightVector: "\u2950",
      DownLeftTeeVector: "\u295E",
      DownLeftVector: "\u21BD",
      DownLeftVectorBar: "\u2956",
      DownRightTeeVector: "\u295F",
      DownRightVector: "\u21C1",
      DownRightVectorBar: "\u2957",
      DownTee: "\u22A4",
      DownTeeArrow: "\u21A7",
      drbkarow: "\u2910",
      drcorn: "\u231F",
      drcrop: "\u230C",
      Dscr: "\u{1D49F}",
      dscr: "\u{1D4B9}",
      DScy: "\u0405",
      dscy: "\u0455",
      dsol: "\u29F6",
      Dstrok: "\u0110",
      dstrok: "\u0111",
      dtdot: "\u22F1",
      dtri: "\u25BF",
      dtrif: "\u25BE",
      duarr: "\u21F5",
      duhar: "\u296F",
      dwangle: "\u29A6",
      DZcy: "\u040F",
      dzcy: "\u045F",
      dzigrarr: "\u27FF",
      Eacute: "\xC9",
      eacute: "\xE9",
      easter: "\u2A6E",
      Ecaron: "\u011A",
      ecaron: "\u011B",
      ecir: "\u2256",
      Ecirc: "\xCA",
      ecirc: "\xEA",
      ecolon: "\u2255",
      Ecy: "\u042D",
      ecy: "\u044D",
      eDDot: "\u2A77",
      Edot: "\u0116",
      eDot: "\u2251",
      edot: "\u0117",
      ee: "\u2147",
      efDot: "\u2252",
      Efr: "\u{1D508}",
      efr: "\u{1D522}",
      eg: "\u2A9A",
      Egrave: "\xC8",
      egrave: "\xE8",
      egs: "\u2A96",
      egsdot: "\u2A98",
      el: "\u2A99",
      Element: "\u2208",
      elinters: "\u23E7",
      ell: "\u2113",
      els: "\u2A95",
      elsdot: "\u2A97",
      Emacr: "\u0112",
      emacr: "\u0113",
      empty: "\u2205",
      emptyset: "\u2205",
      EmptySmallSquare: "\u25FB",
      emptyv: "\u2205",
      EmptyVerySmallSquare: "\u25AB",
      emsp: "\u2003",
      emsp13: "\u2004",
      emsp14: "\u2005",
      ENG: "\u014A",
      eng: "\u014B",
      ensp: "\u2002",
      Eogon: "\u0118",
      eogon: "\u0119",
      Eopf: "\u{1D53C}",
      eopf: "\u{1D556}",
      epar: "\u22D5",
      eparsl: "\u29E3",
      eplus: "\u2A71",
      epsi: "\u03B5",
      Epsilon: "\u0395",
      epsilon: "\u03B5",
      epsiv: "\u03F5",
      eqcirc: "\u2256",
      eqcolon: "\u2255",
      eqsim: "\u2242",
      eqslantgtr: "\u2A96",
      eqslantless: "\u2A95",
      Equal: "\u2A75",
      equals: "=",
      EqualTilde: "\u2242",
      equest: "\u225F",
      Equilibrium: "\u21CC",
      equiv: "\u2261",
      equivDD: "\u2A78",
      eqvparsl: "\u29E5",
      erarr: "\u2971",
      erDot: "\u2253",
      Escr: "\u2130",
      escr: "\u212F",
      esdot: "\u2250",
      Esim: "\u2A73",
      esim: "\u2242",
      Eta: "\u0397",
      eta: "\u03B7",
      ETH: "\xD0",
      eth: "\xF0",
      Euml: "\xCB",
      euml: "\xEB",
      euro: "\u20AC",
      excl: "!",
      exist: "\u2203",
      Exists: "\u2203",
      expectation: "\u2130",
      ExponentialE: "\u2147",
      exponentiale: "\u2147",
      fallingdotseq: "\u2252",
      Fcy: "\u0424",
      fcy: "\u0444",
      female: "\u2640",
      ffilig: "\uFB03",
      fflig: "\uFB00",
      ffllig: "\uFB04",
      Ffr: "\u{1D509}",
      ffr: "\u{1D523}",
      filig: "\uFB01",
      FilledSmallSquare: "\u25FC",
      FilledVerySmallSquare: "\u25AA",
      fjlig: "fj",
      flat: "\u266D",
      fllig: "\uFB02",
      fltns: "\u25B1",
      fnof: "\u0192",
      Fopf: "\u{1D53D}",
      fopf: "\u{1D557}",
      ForAll: "\u2200",
      forall: "\u2200",
      fork: "\u22D4",
      forkv: "\u2AD9",
      Fouriertrf: "\u2131",
      fpartint: "\u2A0D",
      frac12: "\xBD",
      frac13: "\u2153",
      frac14: "\xBC",
      frac15: "\u2155",
      frac16: "\u2159",
      frac18: "\u215B",
      frac23: "\u2154",
      frac25: "\u2156",
      frac34: "\xBE",
      frac35: "\u2157",
      frac38: "\u215C",
      frac45: "\u2158",
      frac56: "\u215A",
      frac58: "\u215D",
      frac78: "\u215E",
      frasl: "\u2044",
      frown: "\u2322",
      Fscr: "\u2131",
      fscr: "\u{1D4BB}",
      gacute: "\u01F5",
      Gamma: "\u0393",
      gamma: "\u03B3",
      Gammad: "\u03DC",
      gammad: "\u03DD",
      gap: "\u2A86",
      Gbreve: "\u011E",
      gbreve: "\u011F",
      Gcedil: "\u0122",
      Gcirc: "\u011C",
      gcirc: "\u011D",
      Gcy: "\u0413",
      gcy: "\u0433",
      Gdot: "\u0120",
      gdot: "\u0121",
      gE: "\u2267",
      ge: "\u2265",
      gEl: "\u2A8C",
      gel: "\u22DB",
      geq: "\u2265",
      geqq: "\u2267",
      geqslant: "\u2A7E",
      ges: "\u2A7E",
      gescc: "\u2AA9",
      gesdot: "\u2A80",
      gesdoto: "\u2A82",
      gesdotol: "\u2A84",
      gesl: "\u22DB\uFE00",
      gesles: "\u2A94",
      Gfr: "\u{1D50A}",
      gfr: "\u{1D524}",
      Gg: "\u22D9",
      gg: "\u226B",
      ggg: "\u22D9",
      gimel: "\u2137",
      GJcy: "\u0403",
      gjcy: "\u0453",
      gl: "\u2277",
      gla: "\u2AA5",
      glE: "\u2A92",
      glj: "\u2AA4",
      gnap: "\u2A8A",
      gnapprox: "\u2A8A",
      gnE: "\u2269",
      gne: "\u2A88",
      gneq: "\u2A88",
      gneqq: "\u2269",
      gnsim: "\u22E7",
      Gopf: "\u{1D53E}",
      gopf: "\u{1D558}",
      grave: "`",
      GreaterEqual: "\u2265",
      GreaterEqualLess: "\u22DB",
      GreaterFullEqual: "\u2267",
      GreaterGreater: "\u2AA2",
      GreaterLess: "\u2277",
      GreaterSlantEqual: "\u2A7E",
      GreaterTilde: "\u2273",
      Gscr: "\u{1D4A2}",
      gscr: "\u210A",
      gsim: "\u2273",
      gsime: "\u2A8E",
      gsiml: "\u2A90",
      Gt: "\u226B",
      GT: ">",
      gt: ">",
      gtcc: "\u2AA7",
      gtcir: "\u2A7A",
      gtdot: "\u22D7",
      gtlPar: "\u2995",
      gtquest: "\u2A7C",
      gtrapprox: "\u2A86",
      gtrarr: "\u2978",
      gtrdot: "\u22D7",
      gtreqless: "\u22DB",
      gtreqqless: "\u2A8C",
      gtrless: "\u2277",
      gtrsim: "\u2273",
      gvertneqq: "\u2269\uFE00",
      gvnE: "\u2269\uFE00",
      Hacek: "\u02C7",
      hairsp: "\u200A",
      half: "\xBD",
      hamilt: "\u210B",
      HARDcy: "\u042A",
      hardcy: "\u044A",
      hArr: "\u21D4",
      harr: "\u2194",
      harrcir: "\u2948",
      harrw: "\u21AD",
      Hat: "^",
      hbar: "\u210F",
      Hcirc: "\u0124",
      hcirc: "\u0125",
      hearts: "\u2665",
      heartsuit: "\u2665",
      hellip: "\u2026",
      hercon: "\u22B9",
      Hfr: "\u210C",
      hfr: "\u{1D525}",
      HilbertSpace: "\u210B",
      hksearow: "\u2925",
      hkswarow: "\u2926",
      hoarr: "\u21FF",
      homtht: "\u223B",
      hookleftarrow: "\u21A9",
      hookrightarrow: "\u21AA",
      Hopf: "\u210D",
      hopf: "\u{1D559}",
      horbar: "\u2015",
      HorizontalLine: "\u2500",
      Hscr: "\u210B",
      hscr: "\u{1D4BD}",
      hslash: "\u210F",
      Hstrok: "\u0126",
      hstrok: "\u0127",
      HumpDownHump: "\u224E",
      HumpEqual: "\u224F",
      hybull: "\u2043",
      hyphen: "\u2010",
      Iacute: "\xCD",
      iacute: "\xED",
      ic: "\u2063",
      Icirc: "\xCE",
      icirc: "\xEE",
      Icy: "\u0418",
      icy: "\u0438",
      Idot: "\u0130",
      IEcy: "\u0415",
      iecy: "\u0435",
      iexcl: "\xA1",
      iff: "\u21D4",
      Ifr: "\u2111",
      ifr: "\u{1D526}",
      Igrave: "\xCC",
      igrave: "\xEC",
      ii: "\u2148",
      iiiint: "\u2A0C",
      iiint: "\u222D",
      iinfin: "\u29DC",
      iiota: "\u2129",
      IJlig: "\u0132",
      ijlig: "\u0133",
      Im: "\u2111",
      Imacr: "\u012A",
      imacr: "\u012B",
      image: "\u2111",
      ImaginaryI: "\u2148",
      imagline: "\u2110",
      imagpart: "\u2111",
      imath: "\u0131",
      imof: "\u22B7",
      imped: "\u01B5",
      Implies: "\u21D2",
      in: "\u2208",
      incare: "\u2105",
      infin: "\u221E",
      infintie: "\u29DD",
      inodot: "\u0131",
      Int: "\u222C",
      int: "\u222B",
      intcal: "\u22BA",
      integers: "\u2124",
      Integral: "\u222B",
      intercal: "\u22BA",
      Intersection: "\u22C2",
      intlarhk: "\u2A17",
      intprod: "\u2A3C",
      InvisibleComma: "\u2063",
      InvisibleTimes: "\u2062",
      IOcy: "\u0401",
      iocy: "\u0451",
      Iogon: "\u012E",
      iogon: "\u012F",
      Iopf: "\u{1D540}",
      iopf: "\u{1D55A}",
      Iota: "\u0399",
      iota: "\u03B9",
      iprod: "\u2A3C",
      iquest: "\xBF",
      Iscr: "\u2110",
      iscr: "\u{1D4BE}",
      isin: "\u2208",
      isindot: "\u22F5",
      isinE: "\u22F9",
      isins: "\u22F4",
      isinsv: "\u22F3",
      isinv: "\u2208",
      it: "\u2062",
      Itilde: "\u0128",
      itilde: "\u0129",
      Iukcy: "\u0406",
      iukcy: "\u0456",
      Iuml: "\xCF",
      iuml: "\xEF",
      Jcirc: "\u0134",
      jcirc: "\u0135",
      Jcy: "\u0419",
      jcy: "\u0439",
      Jfr: "\u{1D50D}",
      jfr: "\u{1D527}",
      jmath: "\u0237",
      Jopf: "\u{1D541}",
      jopf: "\u{1D55B}",
      Jscr: "\u{1D4A5}",
      jscr: "\u{1D4BF}",
      Jsercy: "\u0408",
      jsercy: "\u0458",
      Jukcy: "\u0404",
      jukcy: "\u0454",
      Kappa: "\u039A",
      kappa: "\u03BA",
      kappav: "\u03F0",
      Kcedil: "\u0136",
      kcedil: "\u0137",
      Kcy: "\u041A",
      kcy: "\u043A",
      Kfr: "\u{1D50E}",
      kfr: "\u{1D528}",
      kgreen: "\u0138",
      KHcy: "\u0425",
      khcy: "\u0445",
      KJcy: "\u040C",
      kjcy: "\u045C",
      Kopf: "\u{1D542}",
      kopf: "\u{1D55C}",
      Kscr: "\u{1D4A6}",
      kscr: "\u{1D4C0}",
      lAarr: "\u21DA",
      Lacute: "\u0139",
      lacute: "\u013A",
      laemptyv: "\u29B4",
      lagran: "\u2112",
      Lambda: "\u039B",
      lambda: "\u03BB",
      Lang: "\u27EA",
      lang: "\u27E8",
      langd: "\u2991",
      langle: "\u27E8",
      lap: "\u2A85",
      Laplacetrf: "\u2112",
      laquo: "\xAB",
      Larr: "\u219E",
      lArr: "\u21D0",
      larr: "\u2190",
      larrb: "\u21E4",
      larrbfs: "\u291F",
      larrfs: "\u291D",
      larrhk: "\u21A9",
      larrlp: "\u21AB",
      larrpl: "\u2939",
      larrsim: "\u2973",
      larrtl: "\u21A2",
      lat: "\u2AAB",
      lAtail: "\u291B",
      latail: "\u2919",
      late: "\u2AAD",
      lates: "\u2AAD\uFE00",
      lBarr: "\u290E",
      lbarr: "\u290C",
      lbbrk: "\u2772",
      lbrace: "{",
      lbrack: "[",
      lbrke: "\u298B",
      lbrksld: "\u298F",
      lbrkslu: "\u298D",
      Lcaron: "\u013D",
      lcaron: "\u013E",
      Lcedil: "\u013B",
      lcedil: "\u013C",
      lceil: "\u2308",
      lcub: "{",
      Lcy: "\u041B",
      lcy: "\u043B",
      ldca: "\u2936",
      ldquo: "\u201C",
      ldquor: "\u201E",
      ldrdhar: "\u2967",
      ldrushar: "\u294B",
      ldsh: "\u21B2",
      lE: "\u2266",
      le: "\u2264",
      LeftAngleBracket: "\u27E8",
      LeftArrow: "\u2190",
      Leftarrow: "\u21D0",
      leftarrow: "\u2190",
      LeftArrowBar: "\u21E4",
      LeftArrowRightArrow: "\u21C6",
      leftarrowtail: "\u21A2",
      LeftCeiling: "\u2308",
      LeftDoubleBracket: "\u27E6",
      LeftDownTeeVector: "\u2961",
      LeftDownVector: "\u21C3",
      LeftDownVectorBar: "\u2959",
      LeftFloor: "\u230A",
      leftharpoondown: "\u21BD",
      leftharpoonup: "\u21BC",
      leftleftarrows: "\u21C7",
      LeftRightArrow: "\u2194",
      Leftrightarrow: "\u21D4",
      leftrightarrow: "\u2194",
      leftrightarrows: "\u21C6",
      leftrightharpoons: "\u21CB",
      leftrightsquigarrow: "\u21AD",
      LeftRightVector: "\u294E",
      LeftTee: "\u22A3",
      LeftTeeArrow: "\u21A4",
      LeftTeeVector: "\u295A",
      leftthreetimes: "\u22CB",
      LeftTriangle: "\u22B2",
      LeftTriangleBar: "\u29CF",
      LeftTriangleEqual: "\u22B4",
      LeftUpDownVector: "\u2951",
      LeftUpTeeVector: "\u2960",
      LeftUpVector: "\u21BF",
      LeftUpVectorBar: "\u2958",
      LeftVector: "\u21BC",
      LeftVectorBar: "\u2952",
      lEg: "\u2A8B",
      leg: "\u22DA",
      leq: "\u2264",
      leqq: "\u2266",
      leqslant: "\u2A7D",
      les: "\u2A7D",
      lescc: "\u2AA8",
      lesdot: "\u2A7F",
      lesdoto: "\u2A81",
      lesdotor: "\u2A83",
      lesg: "\u22DA\uFE00",
      lesges: "\u2A93",
      lessapprox: "\u2A85",
      lessdot: "\u22D6",
      lesseqgtr: "\u22DA",
      lesseqqgtr: "\u2A8B",
      LessEqualGreater: "\u22DA",
      LessFullEqual: "\u2266",
      LessGreater: "\u2276",
      lessgtr: "\u2276",
      LessLess: "\u2AA1",
      lesssim: "\u2272",
      LessSlantEqual: "\u2A7D",
      LessTilde: "\u2272",
      lfisht: "\u297C",
      lfloor: "\u230A",
      Lfr: "\u{1D50F}",
      lfr: "\u{1D529}",
      lg: "\u2276",
      lgE: "\u2A91",
      lHar: "\u2962",
      lhard: "\u21BD",
      lharu: "\u21BC",
      lharul: "\u296A",
      lhblk: "\u2584",
      LJcy: "\u0409",
      ljcy: "\u0459",
      Ll: "\u22D8",
      ll: "\u226A",
      llarr: "\u21C7",
      llcorner: "\u231E",
      Lleftarrow: "\u21DA",
      llhard: "\u296B",
      lltri: "\u25FA",
      Lmidot: "\u013F",
      lmidot: "\u0140",
      lmoust: "\u23B0",
      lmoustache: "\u23B0",
      lnap: "\u2A89",
      lnapprox: "\u2A89",
      lnE: "\u2268",
      lne: "\u2A87",
      lneq: "\u2A87",
      lneqq: "\u2268",
      lnsim: "\u22E6",
      loang: "\u27EC",
      loarr: "\u21FD",
      lobrk: "\u27E6",
      LongLeftArrow: "\u27F5",
      Longleftarrow: "\u27F8",
      longleftarrow: "\u27F5",
      LongLeftRightArrow: "\u27F7",
      Longleftrightarrow: "\u27FA",
      longleftrightarrow: "\u27F7",
      longmapsto: "\u27FC",
      LongRightArrow: "\u27F6",
      Longrightarrow: "\u27F9",
      longrightarrow: "\u27F6",
      looparrowleft: "\u21AB",
      looparrowright: "\u21AC",
      lopar: "\u2985",
      Lopf: "\u{1D543}",
      lopf: "\u{1D55D}",
      loplus: "\u2A2D",
      lotimes: "\u2A34",
      lowast: "\u2217",
      lowbar: "_",
      LowerLeftArrow: "\u2199",
      LowerRightArrow: "\u2198",
      loz: "\u25CA",
      lozenge: "\u25CA",
      lozf: "\u29EB",
      lpar: "(",
      lparlt: "\u2993",
      lrarr: "\u21C6",
      lrcorner: "\u231F",
      lrhar: "\u21CB",
      lrhard: "\u296D",
      lrm: "\u200E",
      lrtri: "\u22BF",
      lsaquo: "\u2039",
      Lscr: "\u2112",
      lscr: "\u{1D4C1}",
      Lsh: "\u21B0",
      lsh: "\u21B0",
      lsim: "\u2272",
      lsime: "\u2A8D",
      lsimg: "\u2A8F",
      lsqb: "[",
      lsquo: "\u2018",
      lsquor: "\u201A",
      Lstrok: "\u0141",
      lstrok: "\u0142",
      Lt: "\u226A",
      LT: "<",
      lt: "<",
      ltcc: "\u2AA6",
      ltcir: "\u2A79",
      ltdot: "\u22D6",
      lthree: "\u22CB",
      ltimes: "\u22C9",
      ltlarr: "\u2976",
      ltquest: "\u2A7B",
      ltri: "\u25C3",
      ltrie: "\u22B4",
      ltrif: "\u25C2",
      ltrPar: "\u2996",
      lurdshar: "\u294A",
      luruhar: "\u2966",
      lvertneqq: "\u2268\uFE00",
      lvnE: "\u2268\uFE00",
      macr: "\xAF",
      male: "\u2642",
      malt: "\u2720",
      maltese: "\u2720",
      Map: "\u2905",
      map: "\u21A6",
      mapsto: "\u21A6",
      mapstodown: "\u21A7",
      mapstoleft: "\u21A4",
      mapstoup: "\u21A5",
      marker: "\u25AE",
      mcomma: "\u2A29",
      Mcy: "\u041C",
      mcy: "\u043C",
      mdash: "\u2014",
      mDDot: "\u223A",
      measuredangle: "\u2221",
      MediumSpace: "\u205F",
      Mellintrf: "\u2133",
      Mfr: "\u{1D510}",
      mfr: "\u{1D52A}",
      mho: "\u2127",
      micro: "\xB5",
      mid: "\u2223",
      midast: "*",
      midcir: "\u2AF0",
      middot: "\xB7",
      minus: "\u2212",
      minusb: "\u229F",
      minusd: "\u2238",
      minusdu: "\u2A2A",
      MinusPlus: "\u2213",
      mlcp: "\u2ADB",
      mldr: "\u2026",
      mnplus: "\u2213",
      models: "\u22A7",
      Mopf: "\u{1D544}",
      mopf: "\u{1D55E}",
      mp: "\u2213",
      Mscr: "\u2133",
      mscr: "\u{1D4C2}",
      mstpos: "\u223E",
      Mu: "\u039C",
      mu: "\u03BC",
      multimap: "\u22B8",
      mumap: "\u22B8",
      nabla: "\u2207",
      Nacute: "\u0143",
      nacute: "\u0144",
      nang: "\u2220\u20D2",
      nap: "\u2249",
      napE: "\u2A70\u0338",
      napid: "\u224B\u0338",
      napos: "\u0149",
      napprox: "\u2249",
      natur: "\u266E",
      natural: "\u266E",
      naturals: "\u2115",
      nbsp: "\xA0",
      nbump: "\u224E\u0338",
      nbumpe: "\u224F\u0338",
      ncap: "\u2A43",
      Ncaron: "\u0147",
      ncaron: "\u0148",
      Ncedil: "\u0145",
      ncedil: "\u0146",
      ncong: "\u2247",
      ncongdot: "\u2A6D\u0338",
      ncup: "\u2A42",
      Ncy: "\u041D",
      ncy: "\u043D",
      ndash: "\u2013",
      ne: "\u2260",
      nearhk: "\u2924",
      neArr: "\u21D7",
      nearr: "\u2197",
      nearrow: "\u2197",
      nedot: "\u2250\u0338",
      NegativeMediumSpace: "\u200B",
      NegativeThickSpace: "\u200B",
      NegativeThinSpace: "\u200B",
      NegativeVeryThinSpace: "\u200B",
      nequiv: "\u2262",
      nesear: "\u2928",
      nesim: "\u2242\u0338",
      NestedGreaterGreater: "\u226B",
      NestedLessLess: "\u226A",
      NewLine: "\n",
      nexist: "\u2204",
      nexists: "\u2204",
      Nfr: "\u{1D511}",
      nfr: "\u{1D52B}",
      ngE: "\u2267\u0338",
      nge: "\u2271",
      ngeq: "\u2271",
      ngeqq: "\u2267\u0338",
      ngeqslant: "\u2A7E\u0338",
      nges: "\u2A7E\u0338",
      nGg: "\u22D9\u0338",
      ngsim: "\u2275",
      nGt: "\u226B\u20D2",
      ngt: "\u226F",
      ngtr: "\u226F",
      nGtv: "\u226B\u0338",
      nhArr: "\u21CE",
      nharr: "\u21AE",
      nhpar: "\u2AF2",
      ni: "\u220B",
      nis: "\u22FC",
      nisd: "\u22FA",
      niv: "\u220B",
      NJcy: "\u040A",
      njcy: "\u045A",
      nlArr: "\u21CD",
      nlarr: "\u219A",
      nldr: "\u2025",
      nlE: "\u2266\u0338",
      nle: "\u2270",
      nLeftarrow: "\u21CD",
      nleftarrow: "\u219A",
      nLeftrightarrow: "\u21CE",
      nleftrightarrow: "\u21AE",
      nleq: "\u2270",
      nleqq: "\u2266\u0338",
      nleqslant: "\u2A7D\u0338",
      nles: "\u2A7D\u0338",
      nless: "\u226E",
      nLl: "\u22D8\u0338",
      nlsim: "\u2274",
      nLt: "\u226A\u20D2",
      nlt: "\u226E",
      nltri: "\u22EA",
      nltrie: "\u22EC",
      nLtv: "\u226A\u0338",
      nmid: "\u2224",
      NoBreak: "\u2060",
      NonBreakingSpace: "\xA0",
      Nopf: "\u2115",
      nopf: "\u{1D55F}",
      Not: "\u2AEC",
      not: "\xAC",
      NotCongruent: "\u2262",
      NotCupCap: "\u226D",
      NotDoubleVerticalBar: "\u2226",
      NotElement: "\u2209",
      NotEqual: "\u2260",
      NotEqualTilde: "\u2242\u0338",
      NotExists: "\u2204",
      NotGreater: "\u226F",
      NotGreaterEqual: "\u2271",
      NotGreaterFullEqual: "\u2267\u0338",
      NotGreaterGreater: "\u226B\u0338",
      NotGreaterLess: "\u2279",
      NotGreaterSlantEqual: "\u2A7E\u0338",
      NotGreaterTilde: "\u2275",
      NotHumpDownHump: "\u224E\u0338",
      NotHumpEqual: "\u224F\u0338",
      notin: "\u2209",
      notindot: "\u22F5\u0338",
      notinE: "\u22F9\u0338",
      notinva: "\u2209",
      notinvb: "\u22F7",
      notinvc: "\u22F6",
      NotLeftTriangle: "\u22EA",
      NotLeftTriangleBar: "\u29CF\u0338",
      NotLeftTriangleEqual: "\u22EC",
      NotLess: "\u226E",
      NotLessEqual: "\u2270",
      NotLessGreater: "\u2278",
      NotLessLess: "\u226A\u0338",
      NotLessSlantEqual: "\u2A7D\u0338",
      NotLessTilde: "\u2274",
      NotNestedGreaterGreater: "\u2AA2\u0338",
      NotNestedLessLess: "\u2AA1\u0338",
      notni: "\u220C",
      notniva: "\u220C",
      notnivb: "\u22FE",
      notnivc: "\u22FD",
      NotPrecedes: "\u2280",
      NotPrecedesEqual: "\u2AAF\u0338",
      NotPrecedesSlantEqual: "\u22E0",
      NotReverseElement: "\u220C",
      NotRightTriangle: "\u22EB",
      NotRightTriangleBar: "\u29D0\u0338",
      NotRightTriangleEqual: "\u22ED",
      NotSquareSubset: "\u228F\u0338",
      NotSquareSubsetEqual: "\u22E2",
      NotSquareSuperset: "\u2290\u0338",
      NotSquareSupersetEqual: "\u22E3",
      NotSubset: "\u2282\u20D2",
      NotSubsetEqual: "\u2288",
      NotSucceeds: "\u2281",
      NotSucceedsEqual: "\u2AB0\u0338",
      NotSucceedsSlantEqual: "\u22E1",
      NotSucceedsTilde: "\u227F\u0338",
      NotSuperset: "\u2283\u20D2",
      NotSupersetEqual: "\u2289",
      NotTilde: "\u2241",
      NotTildeEqual: "\u2244",
      NotTildeFullEqual: "\u2247",
      NotTildeTilde: "\u2249",
      NotVerticalBar: "\u2224",
      npar: "\u2226",
      nparallel: "\u2226",
      nparsl: "\u2AFD\u20E5",
      npart: "\u2202\u0338",
      npolint: "\u2A14",
      npr: "\u2280",
      nprcue: "\u22E0",
      npre: "\u2AAF\u0338",
      nprec: "\u2280",
      npreceq: "\u2AAF\u0338",
      nrArr: "\u21CF",
      nrarr: "\u219B",
      nrarrc: "\u2933\u0338",
      nrarrw: "\u219D\u0338",
      nRightarrow: "\u21CF",
      nrightarrow: "\u219B",
      nrtri: "\u22EB",
      nrtrie: "\u22ED",
      nsc: "\u2281",
      nsccue: "\u22E1",
      nsce: "\u2AB0\u0338",
      Nscr: "\u{1D4A9}",
      nscr: "\u{1D4C3}",
      nshortmid: "\u2224",
      nshortparallel: "\u2226",
      nsim: "\u2241",
      nsime: "\u2244",
      nsimeq: "\u2244",
      nsmid: "\u2224",
      nspar: "\u2226",
      nsqsube: "\u22E2",
      nsqsupe: "\u22E3",
      nsub: "\u2284",
      nsubE: "\u2AC5\u0338",
      nsube: "\u2288",
      nsubset: "\u2282\u20D2",
      nsubseteq: "\u2288",
      nsubseteqq: "\u2AC5\u0338",
      nsucc: "\u2281",
      nsucceq: "\u2AB0\u0338",
      nsup: "\u2285",
      nsupE: "\u2AC6\u0338",
      nsupe: "\u2289",
      nsupset: "\u2283\u20D2",
      nsupseteq: "\u2289",
      nsupseteqq: "\u2AC6\u0338",
      ntgl: "\u2279",
      Ntilde: "\xD1",
      ntilde: "\xF1",
      ntlg: "\u2278",
      ntriangleleft: "\u22EA",
      ntrianglelefteq: "\u22EC",
      ntriangleright: "\u22EB",
      ntrianglerighteq: "\u22ED",
      Nu: "\u039D",
      nu: "\u03BD",
      num: "#",
      numero: "\u2116",
      numsp: "\u2007",
      nvap: "\u224D\u20D2",
      nVDash: "\u22AF",
      nVdash: "\u22AE",
      nvDash: "\u22AD",
      nvdash: "\u22AC",
      nvge: "\u2265\u20D2",
      nvgt: ">\u20D2",
      nvHarr: "\u2904",
      nvinfin: "\u29DE",
      nvlArr: "\u2902",
      nvle: "\u2264\u20D2",
      nvlt: "<\u20D2",
      nvltrie: "\u22B4\u20D2",
      nvrArr: "\u2903",
      nvrtrie: "\u22B5\u20D2",
      nvsim: "\u223C\u20D2",
      nwarhk: "\u2923",
      nwArr: "\u21D6",
      nwarr: "\u2196",
      nwarrow: "\u2196",
      nwnear: "\u2927",
      Oacute: "\xD3",
      oacute: "\xF3",
      oast: "\u229B",
      ocir: "\u229A",
      Ocirc: "\xD4",
      ocirc: "\xF4",
      Ocy: "\u041E",
      ocy: "\u043E",
      odash: "\u229D",
      Odblac: "\u0150",
      odblac: "\u0151",
      odiv: "\u2A38",
      odot: "\u2299",
      odsold: "\u29BC",
      OElig: "\u0152",
      oelig: "\u0153",
      ofcir: "\u29BF",
      Ofr: "\u{1D512}",
      ofr: "\u{1D52C}",
      ogon: "\u02DB",
      Ograve: "\xD2",
      ograve: "\xF2",
      ogt: "\u29C1",
      ohbar: "\u29B5",
      ohm: "\u03A9",
      oint: "\u222E",
      olarr: "\u21BA",
      olcir: "\u29BE",
      olcross: "\u29BB",
      oline: "\u203E",
      olt: "\u29C0",
      Omacr: "\u014C",
      omacr: "\u014D",
      Omega: "\u03A9",
      omega: "\u03C9",
      Omicron: "\u039F",
      omicron: "\u03BF",
      omid: "\u29B6",
      ominus: "\u2296",
      Oopf: "\u{1D546}",
      oopf: "\u{1D560}",
      opar: "\u29B7",
      OpenCurlyDoubleQuote: "\u201C",
      OpenCurlyQuote: "\u2018",
      operp: "\u29B9",
      oplus: "\u2295",
      Or: "\u2A54",
      or: "\u2228",
      orarr: "\u21BB",
      ord: "\u2A5D",
      order: "\u2134",
      orderof: "\u2134",
      ordf: "\xAA",
      ordm: "\xBA",
      origof: "\u22B6",
      oror: "\u2A56",
      orslope: "\u2A57",
      orv: "\u2A5B",
      oS: "\u24C8",
      Oscr: "\u{1D4AA}",
      oscr: "\u2134",
      Oslash: "\xD8",
      oslash: "\xF8",
      osol: "\u2298",
      Otilde: "\xD5",
      otilde: "\xF5",
      Otimes: "\u2A37",
      otimes: "\u2297",
      otimesas: "\u2A36",
      Ouml: "\xD6",
      ouml: "\xF6",
      ovbar: "\u233D",
      OverBar: "\u203E",
      OverBrace: "\u23DE",
      OverBracket: "\u23B4",
      OverParenthesis: "\u23DC",
      par: "\u2225",
      para: "\xB6",
      parallel: "\u2225",
      parsim: "\u2AF3",
      parsl: "\u2AFD",
      part: "\u2202",
      PartialD: "\u2202",
      Pcy: "\u041F",
      pcy: "\u043F",
      percnt: "%",
      period: ".",
      permil: "\u2030",
      perp: "\u22A5",
      pertenk: "\u2031",
      Pfr: "\u{1D513}",
      pfr: "\u{1D52D}",
      Phi: "\u03A6",
      phi: "\u03C6",
      phiv: "\u03D5",
      phmmat: "\u2133",
      phone: "\u260E",
      Pi: "\u03A0",
      pi: "\u03C0",
      pitchfork: "\u22D4",
      piv: "\u03D6",
      planck: "\u210F",
      planckh: "\u210E",
      plankv: "\u210F",
      plus: "+",
      plusacir: "\u2A23",
      plusb: "\u229E",
      pluscir: "\u2A22",
      plusdo: "\u2214",
      plusdu: "\u2A25",
      pluse: "\u2A72",
      PlusMinus: "\xB1",
      plusmn: "\xB1",
      plussim: "\u2A26",
      plustwo: "\u2A27",
      pm: "\xB1",
      Poincareplane: "\u210C",
      pointint: "\u2A15",
      Popf: "\u2119",
      popf: "\u{1D561}",
      pound: "\xA3",
      Pr: "\u2ABB",
      pr: "\u227A",
      prap: "\u2AB7",
      prcue: "\u227C",
      prE: "\u2AB3",
      pre: "\u2AAF",
      prec: "\u227A",
      precapprox: "\u2AB7",
      preccurlyeq: "\u227C",
      Precedes: "\u227A",
      PrecedesEqual: "\u2AAF",
      PrecedesSlantEqual: "\u227C",
      PrecedesTilde: "\u227E",
      preceq: "\u2AAF",
      precnapprox: "\u2AB9",
      precneqq: "\u2AB5",
      precnsim: "\u22E8",
      precsim: "\u227E",
      Prime: "\u2033",
      prime: "\u2032",
      primes: "\u2119",
      prnap: "\u2AB9",
      prnE: "\u2AB5",
      prnsim: "\u22E8",
      prod: "\u220F",
      Product: "\u220F",
      profalar: "\u232E",
      profline: "\u2312",
      profsurf: "\u2313",
      prop: "\u221D",
      Proportion: "\u2237",
      Proportional: "\u221D",
      propto: "\u221D",
      prsim: "\u227E",
      prurel: "\u22B0",
      Pscr: "\u{1D4AB}",
      pscr: "\u{1D4C5}",
      Psi: "\u03A8",
      psi: "\u03C8",
      puncsp: "\u2008",
      Qfr: "\u{1D514}",
      qfr: "\u{1D52E}",
      qint: "\u2A0C",
      Qopf: "\u211A",
      qopf: "\u{1D562}",
      qprime: "\u2057",
      Qscr: "\u{1D4AC}",
      qscr: "\u{1D4C6}",
      quaternions: "\u210D",
      quatint: "\u2A16",
      quest: "?",
      questeq: "\u225F",
      QUOT: '"',
      quot: '"',
      rAarr: "\u21DB",
      race: "\u223D\u0331",
      Racute: "\u0154",
      racute: "\u0155",
      radic: "\u221A",
      raemptyv: "\u29B3",
      Rang: "\u27EB",
      rang: "\u27E9",
      rangd: "\u2992",
      range: "\u29A5",
      rangle: "\u27E9",
      raquo: "\xBB",
      Rarr: "\u21A0",
      rArr: "\u21D2",
      rarr: "\u2192",
      rarrap: "\u2975",
      rarrb: "\u21E5",
      rarrbfs: "\u2920",
      rarrc: "\u2933",
      rarrfs: "\u291E",
      rarrhk: "\u21AA",
      rarrlp: "\u21AC",
      rarrpl: "\u2945",
      rarrsim: "\u2974",
      Rarrtl: "\u2916",
      rarrtl: "\u21A3",
      rarrw: "\u219D",
      rAtail: "\u291C",
      ratail: "\u291A",
      ratio: "\u2236",
      rationals: "\u211A",
      RBarr: "\u2910",
      rBarr: "\u290F",
      rbarr: "\u290D",
      rbbrk: "\u2773",
      rbrace: "}",
      rbrack: "]",
      rbrke: "\u298C",
      rbrksld: "\u298E",
      rbrkslu: "\u2990",
      Rcaron: "\u0158",
      rcaron: "\u0159",
      Rcedil: "\u0156",
      rcedil: "\u0157",
      rceil: "\u2309",
      rcub: "}",
      Rcy: "\u0420",
      rcy: "\u0440",
      rdca: "\u2937",
      rdldhar: "\u2969",
      rdquo: "\u201D",
      rdquor: "\u201D",
      rdsh: "\u21B3",
      Re: "\u211C",
      real: "\u211C",
      realine: "\u211B",
      realpart: "\u211C",
      reals: "\u211D",
      rect: "\u25AD",
      REG: "\xAE",
      reg: "\xAE",
      ReverseElement: "\u220B",
      ReverseEquilibrium: "\u21CB",
      ReverseUpEquilibrium: "\u296F",
      rfisht: "\u297D",
      rfloor: "\u230B",
      Rfr: "\u211C",
      rfr: "\u{1D52F}",
      rHar: "\u2964",
      rhard: "\u21C1",
      rharu: "\u21C0",
      rharul: "\u296C",
      Rho: "\u03A1",
      rho: "\u03C1",
      rhov: "\u03F1",
      RightAngleBracket: "\u27E9",
      RightArrow: "\u2192",
      Rightarrow: "\u21D2",
      rightarrow: "\u2192",
      RightArrowBar: "\u21E5",
      RightArrowLeftArrow: "\u21C4",
      rightarrowtail: "\u21A3",
      RightCeiling: "\u2309",
      RightDoubleBracket: "\u27E7",
      RightDownTeeVector: "\u295D",
      RightDownVector: "\u21C2",
      RightDownVectorBar: "\u2955",
      RightFloor: "\u230B",
      rightharpoondown: "\u21C1",
      rightharpoonup: "\u21C0",
      rightleftarrows: "\u21C4",
      rightleftharpoons: "\u21CC",
      rightrightarrows: "\u21C9",
      rightsquigarrow: "\u219D",
      RightTee: "\u22A2",
      RightTeeArrow: "\u21A6",
      RightTeeVector: "\u295B",
      rightthreetimes: "\u22CC",
      RightTriangle: "\u22B3",
      RightTriangleBar: "\u29D0",
      RightTriangleEqual: "\u22B5",
      RightUpDownVector: "\u294F",
      RightUpTeeVector: "\u295C",
      RightUpVector: "\u21BE",
      RightUpVectorBar: "\u2954",
      RightVector: "\u21C0",
      RightVectorBar: "\u2953",
      ring: "\u02DA",
      risingdotseq: "\u2253",
      rlarr: "\u21C4",
      rlhar: "\u21CC",
      rlm: "\u200F",
      rmoust: "\u23B1",
      rmoustache: "\u23B1",
      rnmid: "\u2AEE",
      roang: "\u27ED",
      roarr: "\u21FE",
      robrk: "\u27E7",
      ropar: "\u2986",
      Ropf: "\u211D",
      ropf: "\u{1D563}",
      roplus: "\u2A2E",
      rotimes: "\u2A35",
      RoundImplies: "\u2970",
      rpar: ")",
      rpargt: "\u2994",
      rppolint: "\u2A12",
      rrarr: "\u21C9",
      Rrightarrow: "\u21DB",
      rsaquo: "\u203A",
      Rscr: "\u211B",
      rscr: "\u{1D4C7}",
      Rsh: "\u21B1",
      rsh: "\u21B1",
      rsqb: "]",
      rsquo: "\u2019",
      rsquor: "\u2019",
      rthree: "\u22CC",
      rtimes: "\u22CA",
      rtri: "\u25B9",
      rtrie: "\u22B5",
      rtrif: "\u25B8",
      rtriltri: "\u29CE",
      RuleDelayed: "\u29F4",
      ruluhar: "\u2968",
      rx: "\u211E",
      Sacute: "\u015A",
      sacute: "\u015B",
      sbquo: "\u201A",
      Sc: "\u2ABC",
      sc: "\u227B",
      scap: "\u2AB8",
      Scaron: "\u0160",
      scaron: "\u0161",
      sccue: "\u227D",
      scE: "\u2AB4",
      sce: "\u2AB0",
      Scedil: "\u015E",
      scedil: "\u015F",
      Scirc: "\u015C",
      scirc: "\u015D",
      scnap: "\u2ABA",
      scnE: "\u2AB6",
      scnsim: "\u22E9",
      scpolint: "\u2A13",
      scsim: "\u227F",
      Scy: "\u0421",
      scy: "\u0441",
      sdot: "\u22C5",
      sdotb: "\u22A1",
      sdote: "\u2A66",
      searhk: "\u2925",
      seArr: "\u21D8",
      searr: "\u2198",
      searrow: "\u2198",
      sect: "\xA7",
      semi: ";",
      seswar: "\u2929",
      setminus: "\u2216",
      setmn: "\u2216",
      sext: "\u2736",
      Sfr: "\u{1D516}",
      sfr: "\u{1D530}",
      sfrown: "\u2322",
      sharp: "\u266F",
      SHCHcy: "\u0429",
      shchcy: "\u0449",
      SHcy: "\u0428",
      shcy: "\u0448",
      ShortDownArrow: "\u2193",
      ShortLeftArrow: "\u2190",
      shortmid: "\u2223",
      shortparallel: "\u2225",
      ShortRightArrow: "\u2192",
      ShortUpArrow: "\u2191",
      shy: "\xAD",
      Sigma: "\u03A3",
      sigma: "\u03C3",
      sigmaf: "\u03C2",
      sigmav: "\u03C2",
      sim: "\u223C",
      simdot: "\u2A6A",
      sime: "\u2243",
      simeq: "\u2243",
      simg: "\u2A9E",
      simgE: "\u2AA0",
      siml: "\u2A9D",
      simlE: "\u2A9F",
      simne: "\u2246",
      simplus: "\u2A24",
      simrarr: "\u2972",
      slarr: "\u2190",
      SmallCircle: "\u2218",
      smallsetminus: "\u2216",
      smashp: "\u2A33",
      smeparsl: "\u29E4",
      smid: "\u2223",
      smile: "\u2323",
      smt: "\u2AAA",
      smte: "\u2AAC",
      smtes: "\u2AAC\uFE00",
      SOFTcy: "\u042C",
      softcy: "\u044C",
      sol: "/",
      solb: "\u29C4",
      solbar: "\u233F",
      Sopf: "\u{1D54A}",
      sopf: "\u{1D564}",
      spades: "\u2660",
      spadesuit: "\u2660",
      spar: "\u2225",
      sqcap: "\u2293",
      sqcaps: "\u2293\uFE00",
      sqcup: "\u2294",
      sqcups: "\u2294\uFE00",
      Sqrt: "\u221A",
      sqsub: "\u228F",
      sqsube: "\u2291",
      sqsubset: "\u228F",
      sqsubseteq: "\u2291",
      sqsup: "\u2290",
      sqsupe: "\u2292",
      sqsupset: "\u2290",
      sqsupseteq: "\u2292",
      squ: "\u25A1",
      Square: "\u25A1",
      square: "\u25A1",
      SquareIntersection: "\u2293",
      SquareSubset: "\u228F",
      SquareSubsetEqual: "\u2291",
      SquareSuperset: "\u2290",
      SquareSupersetEqual: "\u2292",
      SquareUnion: "\u2294",
      squarf: "\u25AA",
      squf: "\u25AA",
      srarr: "\u2192",
      Sscr: "\u{1D4AE}",
      sscr: "\u{1D4C8}",
      ssetmn: "\u2216",
      ssmile: "\u2323",
      sstarf: "\u22C6",
      Star: "\u22C6",
      star: "\u2606",
      starf: "\u2605",
      straightepsilon: "\u03F5",
      straightphi: "\u03D5",
      strns: "\xAF",
      Sub: "\u22D0",
      sub: "\u2282",
      subdot: "\u2ABD",
      subE: "\u2AC5",
      sube: "\u2286",
      subedot: "\u2AC3",
      submult: "\u2AC1",
      subnE: "\u2ACB",
      subne: "\u228A",
      subplus: "\u2ABF",
      subrarr: "\u2979",
      Subset: "\u22D0",
      subset: "\u2282",
      subseteq: "\u2286",
      subseteqq: "\u2AC5",
      SubsetEqual: "\u2286",
      subsetneq: "\u228A",
      subsetneqq: "\u2ACB",
      subsim: "\u2AC7",
      subsub: "\u2AD5",
      subsup: "\u2AD3",
      succ: "\u227B",
      succapprox: "\u2AB8",
      succcurlyeq: "\u227D",
      Succeeds: "\u227B",
      SucceedsEqual: "\u2AB0",
      SucceedsSlantEqual: "\u227D",
      SucceedsTilde: "\u227F",
      succeq: "\u2AB0",
      succnapprox: "\u2ABA",
      succneqq: "\u2AB6",
      succnsim: "\u22E9",
      succsim: "\u227F",
      SuchThat: "\u220B",
      Sum: "\u2211",
      sum: "\u2211",
      sung: "\u266A",
      Sup: "\u22D1",
      sup: "\u2283",
      sup1: "\xB9",
      sup2: "\xB2",
      sup3: "\xB3",
      supdot: "\u2ABE",
      supdsub: "\u2AD8",
      supE: "\u2AC6",
      supe: "\u2287",
      supedot: "\u2AC4",
      Superset: "\u2283",
      SupersetEqual: "\u2287",
      suphsol: "\u27C9",
      suphsub: "\u2AD7",
      suplarr: "\u297B",
      supmult: "\u2AC2",
      supnE: "\u2ACC",
      supne: "\u228B",
      supplus: "\u2AC0",
      Supset: "\u22D1",
      supset: "\u2283",
      supseteq: "\u2287",
      supseteqq: "\u2AC6",
      supsetneq: "\u228B",
      supsetneqq: "\u2ACC",
      supsim: "\u2AC8",
      supsub: "\u2AD4",
      supsup: "\u2AD6",
      swarhk: "\u2926",
      swArr: "\u21D9",
      swarr: "\u2199",
      swarrow: "\u2199",
      swnwar: "\u292A",
      szlig: "\xDF",
      Tab: "	",
      target: "\u2316",
      Tau: "\u03A4",
      tau: "\u03C4",
      tbrk: "\u23B4",
      Tcaron: "\u0164",
      tcaron: "\u0165",
      Tcedil: "\u0162",
      tcedil: "\u0163",
      Tcy: "\u0422",
      tcy: "\u0442",
      tdot: "\u20DB",
      telrec: "\u2315",
      Tfr: "\u{1D517}",
      tfr: "\u{1D531}",
      there4: "\u2234",
      Therefore: "\u2234",
      therefore: "\u2234",
      Theta: "\u0398",
      theta: "\u03B8",
      thetasym: "\u03D1",
      thetav: "\u03D1",
      thickapprox: "\u2248",
      thicksim: "\u223C",
      ThickSpace: "\u205F\u200A",
      thinsp: "\u2009",
      ThinSpace: "\u2009",
      thkap: "\u2248",
      thksim: "\u223C",
      THORN: "\xDE",
      thorn: "\xFE",
      Tilde: "\u223C",
      tilde: "\u02DC",
      TildeEqual: "\u2243",
      TildeFullEqual: "\u2245",
      TildeTilde: "\u2248",
      times: "\xD7",
      timesb: "\u22A0",
      timesbar: "\u2A31",
      timesd: "\u2A30",
      tint: "\u222D",
      toea: "\u2928",
      top: "\u22A4",
      topbot: "\u2336",
      topcir: "\u2AF1",
      Topf: "\u{1D54B}",
      topf: "\u{1D565}",
      topfork: "\u2ADA",
      tosa: "\u2929",
      tprime: "\u2034",
      TRADE: "\u2122",
      trade: "\u2122",
      triangle: "\u25B5",
      triangledown: "\u25BF",
      triangleleft: "\u25C3",
      trianglelefteq: "\u22B4",
      triangleq: "\u225C",
      triangleright: "\u25B9",
      trianglerighteq: "\u22B5",
      tridot: "\u25EC",
      trie: "\u225C",
      triminus: "\u2A3A",
      TripleDot: "\u20DB",
      triplus: "\u2A39",
      trisb: "\u29CD",
      tritime: "\u2A3B",
      trpezium: "\u23E2",
      Tscr: "\u{1D4AF}",
      tscr: "\u{1D4C9}",
      TScy: "\u0426",
      tscy: "\u0446",
      TSHcy: "\u040B",
      tshcy: "\u045B",
      Tstrok: "\u0166",
      tstrok: "\u0167",
      twixt: "\u226C",
      twoheadleftarrow: "\u219E",
      twoheadrightarrow: "\u21A0",
      Uacute: "\xDA",
      uacute: "\xFA",
      Uarr: "\u219F",
      uArr: "\u21D1",
      uarr: "\u2191",
      Uarrocir: "\u2949",
      Ubrcy: "\u040E",
      ubrcy: "\u045E",
      Ubreve: "\u016C",
      ubreve: "\u016D",
      Ucirc: "\xDB",
      ucirc: "\xFB",
      Ucy: "\u0423",
      ucy: "\u0443",
      udarr: "\u21C5",
      Udblac: "\u0170",
      udblac: "\u0171",
      udhar: "\u296E",
      ufisht: "\u297E",
      Ufr: "\u{1D518}",
      ufr: "\u{1D532}",
      Ugrave: "\xD9",
      ugrave: "\xF9",
      uHar: "\u2963",
      uharl: "\u21BF",
      uharr: "\u21BE",
      uhblk: "\u2580",
      ulcorn: "\u231C",
      ulcorner: "\u231C",
      ulcrop: "\u230F",
      ultri: "\u25F8",
      Umacr: "\u016A",
      umacr: "\u016B",
      uml: "\xA8",
      UnderBar: "_",
      UnderBrace: "\u23DF",
      UnderBracket: "\u23B5",
      UnderParenthesis: "\u23DD",
      Union: "\u22C3",
      UnionPlus: "\u228E",
      Uogon: "\u0172",
      uogon: "\u0173",
      Uopf: "\u{1D54C}",
      uopf: "\u{1D566}",
      UpArrow: "\u2191",
      Uparrow: "\u21D1",
      uparrow: "\u2191",
      UpArrowBar: "\u2912",
      UpArrowDownArrow: "\u21C5",
      UpDownArrow: "\u2195",
      Updownarrow: "\u21D5",
      updownarrow: "\u2195",
      UpEquilibrium: "\u296E",
      upharpoonleft: "\u21BF",
      upharpoonright: "\u21BE",
      uplus: "\u228E",
      UpperLeftArrow: "\u2196",
      UpperRightArrow: "\u2197",
      Upsi: "\u03D2",
      upsi: "\u03C5",
      upsih: "\u03D2",
      Upsilon: "\u03A5",
      upsilon: "\u03C5",
      UpTee: "\u22A5",
      UpTeeArrow: "\u21A5",
      upuparrows: "\u21C8",
      urcorn: "\u231D",
      urcorner: "\u231D",
      urcrop: "\u230E",
      Uring: "\u016E",
      uring: "\u016F",
      urtri: "\u25F9",
      Uscr: "\u{1D4B0}",
      uscr: "\u{1D4CA}",
      utdot: "\u22F0",
      Utilde: "\u0168",
      utilde: "\u0169",
      utri: "\u25B5",
      utrif: "\u25B4",
      uuarr: "\u21C8",
      Uuml: "\xDC",
      uuml: "\xFC",
      uwangle: "\u29A7",
      vangrt: "\u299C",
      varepsilon: "\u03F5",
      varkappa: "\u03F0",
      varnothing: "\u2205",
      varphi: "\u03D5",
      varpi: "\u03D6",
      varpropto: "\u221D",
      vArr: "\u21D5",
      varr: "\u2195",
      varrho: "\u03F1",
      varsigma: "\u03C2",
      varsubsetneq: "\u228A\uFE00",
      varsubsetneqq: "\u2ACB\uFE00",
      varsupsetneq: "\u228B\uFE00",
      varsupsetneqq: "\u2ACC\uFE00",
      vartheta: "\u03D1",
      vartriangleleft: "\u22B2",
      vartriangleright: "\u22B3",
      Vbar: "\u2AEB",
      vBar: "\u2AE8",
      vBarv: "\u2AE9",
      Vcy: "\u0412",
      vcy: "\u0432",
      VDash: "\u22AB",
      Vdash: "\u22A9",
      vDash: "\u22A8",
      vdash: "\u22A2",
      Vdashl: "\u2AE6",
      Vee: "\u22C1",
      vee: "\u2228",
      veebar: "\u22BB",
      veeeq: "\u225A",
      vellip: "\u22EE",
      Verbar: "\u2016",
      verbar: "|",
      Vert: "\u2016",
      vert: "|",
      VerticalBar: "\u2223",
      VerticalLine: "|",
      VerticalSeparator: "\u2758",
      VerticalTilde: "\u2240",
      VeryThinSpace: "\u200A",
      Vfr: "\u{1D519}",
      vfr: "\u{1D533}",
      vltri: "\u22B2",
      vnsub: "\u2282\u20D2",
      vnsup: "\u2283\u20D2",
      Vopf: "\u{1D54D}",
      vopf: "\u{1D567}",
      vprop: "\u221D",
      vrtri: "\u22B3",
      Vscr: "\u{1D4B1}",
      vscr: "\u{1D4CB}",
      vsubnE: "\u2ACB\uFE00",
      vsubne: "\u228A\uFE00",
      vsupnE: "\u2ACC\uFE00",
      vsupne: "\u228B\uFE00",
      Vvdash: "\u22AA",
      vzigzag: "\u299A",
      Wcirc: "\u0174",
      wcirc: "\u0175",
      wedbar: "\u2A5F",
      Wedge: "\u22C0",
      wedge: "\u2227",
      wedgeq: "\u2259",
      weierp: "\u2118",
      Wfr: "\u{1D51A}",
      wfr: "\u{1D534}",
      Wopf: "\u{1D54E}",
      wopf: "\u{1D568}",
      wp: "\u2118",
      wr: "\u2240",
      wreath: "\u2240",
      Wscr: "\u{1D4B2}",
      wscr: "\u{1D4CC}",
      xcap: "\u22C2",
      xcirc: "\u25EF",
      xcup: "\u22C3",
      xdtri: "\u25BD",
      Xfr: "\u{1D51B}",
      xfr: "\u{1D535}",
      xhArr: "\u27FA",
      xharr: "\u27F7",
      Xi: "\u039E",
      xi: "\u03BE",
      xlArr: "\u27F8",
      xlarr: "\u27F5",
      xmap: "\u27FC",
      xnis: "\u22FB",
      xodot: "\u2A00",
      Xopf: "\u{1D54F}",
      xopf: "\u{1D569}",
      xoplus: "\u2A01",
      xotime: "\u2A02",
      xrArr: "\u27F9",
      xrarr: "\u27F6",
      Xscr: "\u{1D4B3}",
      xscr: "\u{1D4CD}",
      xsqcup: "\u2A06",
      xuplus: "\u2A04",
      xutri: "\u25B3",
      xvee: "\u22C1",
      xwedge: "\u22C0",
      Yacute: "\xDD",
      yacute: "\xFD",
      YAcy: "\u042F",
      yacy: "\u044F",
      Ycirc: "\u0176",
      ycirc: "\u0177",
      Ycy: "\u042B",
      ycy: "\u044B",
      yen: "\xA5",
      Yfr: "\u{1D51C}",
      yfr: "\u{1D536}",
      YIcy: "\u0407",
      yicy: "\u0457",
      Yopf: "\u{1D550}",
      yopf: "\u{1D56A}",
      Yscr: "\u{1D4B4}",
      yscr: "\u{1D4CE}",
      YUcy: "\u042E",
      yucy: "\u044E",
      Yuml: "\u0178",
      yuml: "\xFF",
      Zacute: "\u0179",
      zacute: "\u017A",
      Zcaron: "\u017D",
      zcaron: "\u017E",
      Zcy: "\u0417",
      zcy: "\u0437",
      Zdot: "\u017B",
      zdot: "\u017C",
      zeetrf: "\u2128",
      ZeroWidthSpace: "\u200B",
      Zeta: "\u0396",
      zeta: "\u03B6",
      Zfr: "\u2128",
      zfr: "\u{1D537}",
      ZHcy: "\u0416",
      zhcy: "\u0436",
      zigrarr: "\u21DD",
      Zopf: "\u2124",
      zopf: "\u{1D56B}",
      Zscr: "\u{1D4B5}",
      zscr: "\u{1D4CF}",
      zwj: "\u200D",
      zwnj: "\u200C"
    });
    exports.entityMap = exports.HTML_ENTITIES;
  }
});

// node_modules/@xmldom/xmldom/lib/sax.js
var require_sax = __commonJS({
  "node_modules/@xmldom/xmldom/lib/sax.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    var g = require_grammar();
    var errors = require_errors();
    var isHTMLEscapableRawTextElement = conventions.isHTMLEscapableRawTextElement;
    var isHTMLMimeType = conventions.isHTMLMimeType;
    var isHTMLRawTextElement = conventions.isHTMLRawTextElement;
    var hasOwn = conventions.hasOwn;
    var NAMESPACE = conventions.NAMESPACE;
    var ParseError = errors.ParseError;
    var DOMException = errors.DOMException;
    var S_TAG = 0;
    var S_ATTR = 1;
    var S_ATTR_SPACE = 2;
    var S_EQ = 3;
    var S_ATTR_NOQUOT_VALUE = 4;
    var S_ATTR_END = 5;
    var S_TAG_SPACE = 6;
    var S_TAG_CLOSE = 7;
    function XMLReader() {
    }
    XMLReader.prototype = {
      parse: function(source, defaultNSMap, entityMap) {
        var domBuilder = this.domBuilder;
        domBuilder.startDocument();
        _copy(defaultNSMap, defaultNSMap = /* @__PURE__ */ Object.create(null));
        parse(source, defaultNSMap, entityMap, domBuilder, this.errorHandler);
        domBuilder.endDocument();
      }
    };
    var ENTITY_REG = /&#?\w+;?/g;
    function parse(source, defaultNSMapCopy, entityMap, domBuilder, errorHandler) {
      var isHTML = isHTMLMimeType(domBuilder.mimeType);
      if (source.indexOf(g.UNICODE_REPLACEMENT_CHARACTER) >= 0) {
        errorHandler.warning("Unicode replacement character detected, source encoding issues?");
      }
      function fixedFromCharCode(code) {
        if (code > 65535) {
          code -= 65536;
          var surrogate1 = 55296 + (code >> 10), surrogate2 = 56320 + (code & 1023);
          return String.fromCharCode(surrogate1, surrogate2);
        } else {
          return String.fromCharCode(code);
        }
      }
      function entityReplacer(a2) {
        var complete = a2[a2.length - 1] === ";" ? a2 : a2 + ";";
        if (!isHTML && complete !== a2) {
          errorHandler.error("EntityRef: expecting ;");
          return a2;
        }
        var match = g.Reference.exec(complete);
        if (!match || match[0].length !== complete.length) {
          errorHandler.error("entity not matching Reference production: " + a2);
          return a2;
        }
        var k = complete.slice(1, -1);
        if (hasOwn(entityMap, k)) {
          return entityMap[k];
        } else if (k.charAt(0) === "#") {
          return fixedFromCharCode(parseInt(k.substring(1).replace("x", "0x")));
        } else {
          errorHandler.error("entity not found:" + a2);
          return a2;
        }
      }
      function appendText(end2) {
        if (end2 > start) {
          var xt = source.substring(start, end2).replace(ENTITY_REG, entityReplacer);
          locator && position(start);
          domBuilder.characters(xt, 0, end2 - start);
          start = end2;
        }
      }
      var lineStart = 0;
      var lineEnd = 0;
      var linePattern = /\r\n?|\n|$/g;
      var locator = domBuilder.locator;
      function position(p, m) {
        while (p >= lineEnd && (m = linePattern.exec(source))) {
          lineStart = lineEnd;
          lineEnd = m.index + m[0].length;
          locator.lineNumber++;
        }
        locator.columnNumber = p - lineStart + 1;
      }
      var parseStack = [{ currentNSMap: defaultNSMapCopy }];
      var unclosedTags = [];
      var start = 0;
      while (true) {
        try {
          var tagStart = source.indexOf("<", start);
          if (tagStart < 0) {
            if (!isHTML && unclosedTags.length > 0) {
              return errorHandler.fatalError("unclosed xml tag(s): " + unclosedTags.join(", "));
            }
            if (!source.substring(start).match(/^\s*$/)) {
              var doc = domBuilder.doc;
              var text = doc.createTextNode(source.substring(start));
              if (doc.documentElement) {
                return errorHandler.error("Extra content at the end of the document");
              }
              doc.appendChild(text);
              domBuilder.currentElement = text;
            }
            return;
          }
          if (tagStart > start) {
            var fromSource = source.substring(start, tagStart);
            if (!isHTML && unclosedTags.length === 0) {
              fromSource = fromSource.replace(new RegExp(g.S_OPT.source, "g"), "");
              fromSource && errorHandler.error("Unexpected content outside root element: '" + fromSource + "'");
            }
            appendText(tagStart);
          }
          switch (source.charAt(tagStart + 1)) {
            case "/":
              var end = source.indexOf(">", tagStart + 2);
              var tagNameRaw = source.substring(tagStart + 2, end > 0 ? end : void 0);
              if (!tagNameRaw) {
                return errorHandler.fatalError("end tag name missing");
              }
              var tagNameMatch = end > 0 && g.reg("^", g.QName_group, g.S_OPT, "$").exec(tagNameRaw);
              if (!tagNameMatch) {
                return errorHandler.fatalError('end tag name contains invalid characters: "' + tagNameRaw + '"');
              }
              if (!domBuilder.currentElement && !domBuilder.doc.documentElement) {
                return;
              }
              var currentTagName = unclosedTags[unclosedTags.length - 1] || domBuilder.currentElement.tagName || domBuilder.doc.documentElement.tagName || "";
              if (currentTagName !== tagNameMatch[1]) {
                var tagNameLower = tagNameMatch[1].toLowerCase();
                if (!isHTML || currentTagName.toLowerCase() !== tagNameLower) {
                  return errorHandler.fatalError('Opening and ending tag mismatch: "' + currentTagName + '" != "' + tagNameRaw + '"');
                }
              }
              var config = parseStack.pop();
              unclosedTags.pop();
              var localNSMap = config.localNSMap;
              domBuilder.endElement(config.uri, config.localName, currentTagName);
              if (localNSMap) {
                for (var prefix in localNSMap) {
                  if (hasOwn(localNSMap, prefix)) {
                    domBuilder.endPrefixMapping(prefix);
                  }
                }
              }
              end++;
              break;
            // end element
            case "?":
              locator && position(tagStart);
              end = parseProcessingInstruction(source, tagStart, domBuilder, errorHandler);
              break;
            case "!":
              locator && position(tagStart);
              end = parseDoctypeCommentOrCData(source, tagStart, domBuilder, errorHandler, isHTML);
              break;
            default:
              locator && position(tagStart);
              var el = new ElementAttributes();
              var currentNSMap = parseStack[parseStack.length - 1].currentNSMap;
              var end = parseElementStartPart(source, tagStart, el, currentNSMap, entityReplacer, errorHandler, isHTML);
              var len = el.length;
              if (!el.closed) {
                if (isHTML && conventions.isHTMLVoidElement(el.tagName)) {
                  el.closed = true;
                } else {
                  unclosedTags.push(el.tagName);
                }
              }
              if (locator && len) {
                var locator2 = copyLocator(locator, {});
                for (var i = 0; i < len; i++) {
                  var a = el[i];
                  position(a.offset);
                  a.locator = copyLocator(locator, {});
                }
                domBuilder.locator = locator2;
                if (appendElement(el, domBuilder, currentNSMap)) {
                  parseStack.push(el);
                }
                domBuilder.locator = locator;
              } else {
                if (appendElement(el, domBuilder, currentNSMap)) {
                  parseStack.push(el);
                }
              }
              if (isHTML && !el.closed) {
                end = parseHtmlSpecialContent(source, end, el.tagName, entityReplacer, domBuilder);
              } else {
                end++;
              }
          }
        } catch (e) {
          if (e instanceof ParseError) {
            throw e;
          } else if (e instanceof DOMException) {
            throw new ParseError(e.name + ": " + e.message, domBuilder.locator, e);
          }
          errorHandler.error("element parse error: " + e);
          end = -1;
        }
        if (end > start) {
          start = end;
        } else {
          appendText(Math.max(tagStart, start) + 1);
        }
      }
    }
    function copyLocator(f, t) {
      t.lineNumber = f.lineNumber;
      t.columnNumber = f.columnNumber;
      return t;
    }
    function parseElementStartPart(source, start, el, currentNSMap, entityReplacer, errorHandler, isHTML) {
      function addAttribute(qname, value2, startIndex) {
        if (hasOwn(el.attributeNames, qname)) {
          return errorHandler.fatalError("Attribute " + qname + " redefined");
        }
        if (!isHTML && value2.indexOf("<") >= 0) {
          return errorHandler.fatalError("Unescaped '<' not allowed in attributes values");
        }
        el.addValue(
          qname,
          // @see https://www.w3.org/TR/xml/#AVNormalize
          // since the xmldom sax parser does not "interpret" DTD the following is not implemented:
          // - recursive replacement of (DTD) entity references
          // - trimming and collapsing multiple spaces into a single one for attributes that are not of type CDATA
          value2.replace(/[\t\n\r]/g, " ").replace(ENTITY_REG, entityReplacer),
          startIndex
        );
      }
      var attrName;
      var value;
      var p = ++start;
      var s = S_TAG;
      while (true) {
        var c = source.charAt(p);
        switch (c) {
          case "=":
            if (s === S_ATTR) {
              attrName = source.slice(start, p);
              s = S_EQ;
            } else if (s === S_ATTR_SPACE) {
              s = S_EQ;
            } else {
              throw new Error("attribute equal must after attrName");
            }
            break;
          case "'":
          case '"':
            if (s === S_EQ || s === S_ATTR) {
              if (s === S_ATTR) {
                errorHandler.warning('attribute value must after "="');
                attrName = source.slice(start, p);
              }
              start = p + 1;
              p = source.indexOf(c, start);
              if (p > 0) {
                value = source.slice(start, p);
                addAttribute(attrName, value, start - 1);
                s = S_ATTR_END;
              } else {
                throw new Error("attribute value no end '" + c + "' match");
              }
            } else if (s == S_ATTR_NOQUOT_VALUE) {
              value = source.slice(start, p);
              addAttribute(attrName, value, start);
              errorHandler.warning('attribute "' + attrName + '" missed start quot(' + c + ")!!");
              start = p + 1;
              s = S_ATTR_END;
            } else {
              throw new Error('attribute value must after "="');
            }
            break;
          case "/":
            switch (s) {
              case S_TAG:
                el.setTagName(source.slice(start, p));
              case S_ATTR_END:
              case S_TAG_SPACE:
              case S_TAG_CLOSE:
                s = S_TAG_CLOSE;
                el.closed = true;
              case S_ATTR_NOQUOT_VALUE:
              case S_ATTR:
                break;
              case S_ATTR_SPACE:
                el.closed = true;
                break;
              //case S_EQ:
              default:
                throw new Error("attribute invalid close char('/')");
            }
            break;
          case "":
            errorHandler.error("unexpected end of input");
            if (s == S_TAG) {
              el.setTagName(source.slice(start, p));
            }
            return p;
          case ">":
            switch (s) {
              case S_TAG:
                el.setTagName(source.slice(start, p));
              case S_ATTR_END:
              case S_TAG_SPACE:
              case S_TAG_CLOSE:
                break;
              //normal
              case S_ATTR_NOQUOT_VALUE:
              //Compatible state
              case S_ATTR:
                value = source.slice(start, p);
                if (value.slice(-1) === "/") {
                  el.closed = true;
                  value = value.slice(0, -1);
                }
              case S_ATTR_SPACE:
                if (s === S_ATTR_SPACE) {
                  value = attrName;
                }
                if (s == S_ATTR_NOQUOT_VALUE) {
                  errorHandler.warning('attribute "' + value + '" missed quot(")!');
                  addAttribute(attrName, value, start);
                } else {
                  if (!isHTML) {
                    errorHandler.warning('attribute "' + value + '" missed value!! "' + value + '" instead!!');
                  }
                  addAttribute(value, value, start);
                }
                break;
              case S_EQ:
                if (!isHTML) {
                  return errorHandler.fatalError(`AttValue: ' or " expected`);
                }
            }
            return p;
          /*xml space '\x20' | #x9 | #xD | #xA; */
          case "\x80":
            c = " ";
          default:
            if (c <= " ") {
              switch (s) {
                case S_TAG:
                  el.setTagName(source.slice(start, p));
                  s = S_TAG_SPACE;
                  break;
                case S_ATTR:
                  attrName = source.slice(start, p);
                  s = S_ATTR_SPACE;
                  break;
                case S_ATTR_NOQUOT_VALUE:
                  var value = source.slice(start, p);
                  errorHandler.warning('attribute "' + value + '" missed quot(")!!');
                  addAttribute(attrName, value, start);
                case S_ATTR_END:
                  s = S_TAG_SPACE;
                  break;
              }
            } else {
              switch (s) {
                //case S_TAG:void();break;
                //case S_ATTR:void();break;
                //case S_ATTR_NOQUOT_VALUE:void();break;
                case S_ATTR_SPACE:
                  if (!isHTML) {
                    errorHandler.warning('attribute "' + attrName + '" missed value!! "' + attrName + '" instead2!!');
                  }
                  addAttribute(attrName, attrName, start);
                  start = p;
                  s = S_ATTR;
                  break;
                case S_ATTR_END:
                  errorHandler.warning('attribute space is required"' + attrName + '"!!');
                case S_TAG_SPACE:
                  s = S_ATTR;
                  start = p;
                  break;
                case S_EQ:
                  s = S_ATTR_NOQUOT_VALUE;
                  start = p;
                  break;
                case S_TAG_CLOSE:
                  throw new Error("elements closed character '/' and '>' must be connected to");
              }
            }
        }
        p++;
      }
    }
    function appendElement(el, domBuilder, currentNSMap) {
      var tagName = el.tagName;
      var localNSMap = null;
      var i = el.length;
      while (i--) {
        var a = el[i];
        var qName = a.qName;
        var value = a.value;
        var nsp = qName.indexOf(":");
        if (nsp > 0) {
          var prefix = a.prefix = qName.slice(0, nsp);
          var localName = qName.slice(nsp + 1);
          var nsPrefix = prefix === "xmlns" && localName;
        } else {
          localName = qName;
          prefix = null;
          nsPrefix = qName === "xmlns" && "";
        }
        a.localName = localName;
        if (nsPrefix !== false) {
          if (localNSMap == null) {
            localNSMap = /* @__PURE__ */ Object.create(null);
            _copy(currentNSMap, currentNSMap = /* @__PURE__ */ Object.create(null));
          }
          currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
          a.uri = NAMESPACE.XMLNS;
          domBuilder.startPrefixMapping(nsPrefix, value);
        }
      }
      var i = el.length;
      while (i--) {
        a = el[i];
        if (a.prefix) {
          if (a.prefix === "xml") {
            a.uri = NAMESPACE.XML;
          }
          if (a.prefix !== "xmlns") {
            a.uri = currentNSMap[a.prefix];
          }
        }
      }
      var nsp = tagName.indexOf(":");
      if (nsp > 0) {
        prefix = el.prefix = tagName.slice(0, nsp);
        localName = el.localName = tagName.slice(nsp + 1);
      } else {
        prefix = null;
        localName = el.localName = tagName;
      }
      var ns = el.uri = currentNSMap[prefix || ""];
      domBuilder.startElement(ns, localName, tagName, el);
      if (el.closed) {
        domBuilder.endElement(ns, localName, tagName);
        if (localNSMap) {
          for (prefix in localNSMap) {
            if (hasOwn(localNSMap, prefix)) {
              domBuilder.endPrefixMapping(prefix);
            }
          }
        }
      } else {
        el.currentNSMap = currentNSMap;
        el.localNSMap = localNSMap;
        return true;
      }
    }
    function parseHtmlSpecialContent(source, elStartEnd, tagName, entityReplacer, domBuilder) {
      var isEscapableRaw = isHTMLEscapableRawTextElement(tagName);
      if (isEscapableRaw || isHTMLRawTextElement(tagName)) {
        var elEndStart = source.indexOf("</" + tagName + ">", elStartEnd);
        var text = source.substring(elStartEnd + 1, elEndStart);
        if (isEscapableRaw) {
          text = text.replace(ENTITY_REG, entityReplacer);
        }
        domBuilder.characters(text, 0, text.length);
        return elEndStart;
      }
      return elStartEnd + 1;
    }
    function _copy(source, target) {
      for (var n in source) {
        if (hasOwn(source, n)) {
          target[n] = source[n];
        }
      }
    }
    function parseUtils(source, start) {
      var index = start;
      function char(n) {
        n = n || 0;
        return source.charAt(index + n);
      }
      function skip(n) {
        n = n || 1;
        index += n;
      }
      function skipBlanks() {
        var blanks = 0;
        while (index < source.length) {
          var c = char();
          if (c !== " " && c !== "\n" && c !== "	" && c !== "\r") {
            return blanks;
          }
          blanks++;
          skip();
        }
        return -1;
      }
      function substringFromIndex() {
        return source.substring(index);
      }
      function substringStartsWith(text) {
        return source.substring(index, index + text.length) === text;
      }
      function substringStartsWithCaseInsensitive(text) {
        return source.substring(index, index + text.length).toUpperCase() === text.toUpperCase();
      }
      function getMatch(args) {
        var expr = g.reg("^", args);
        var match = expr.exec(substringFromIndex());
        if (match) {
          skip(match[0].length);
          return match[0];
        }
        return null;
      }
      return {
        char,
        getIndex: function() {
          return index;
        },
        getMatch,
        getSource: function() {
          return source;
        },
        skip,
        skipBlanks,
        substringFromIndex,
        substringStartsWith,
        substringStartsWithCaseInsensitive
      };
    }
    function parseDoctypeInternalSubset(p, errorHandler) {
      function parsePI(p2, errorHandler2) {
        var match = g.PI.exec(p2.substringFromIndex());
        if (!match) {
          return errorHandler2.fatalError("processing instruction is not well-formed at position " + p2.getIndex());
        }
        if (match[1].toLowerCase() === "xml") {
          return errorHandler2.fatalError(
            "xml declaration is only allowed at the start of the document, but found at position " + p2.getIndex()
          );
        }
        p2.skip(match[0].length);
        return match[0];
      }
      var source = p.getSource();
      if (p.char() === "[") {
        p.skip(1);
        var intSubsetStart = p.getIndex();
        while (p.getIndex() < source.length) {
          p.skipBlanks();
          if (p.char() === "]") {
            var internalSubset = source.substring(intSubsetStart, p.getIndex());
            p.skip(1);
            return internalSubset;
          }
          var current = null;
          if (p.char() === "<" && p.char(1) === "!") {
            switch (p.char(2)) {
              case "E":
                if (p.char(3) === "L") {
                  current = p.getMatch(g.elementdecl);
                } else if (p.char(3) === "N") {
                  current = p.getMatch(g.EntityDecl);
                }
                break;
              case "A":
                current = p.getMatch(g.AttlistDecl);
                break;
              case "N":
                current = p.getMatch(g.NotationDecl);
                break;
              case "-":
                current = p.getMatch(g.Comment);
                break;
            }
          } else if (p.char() === "<" && p.char(1) === "?") {
            current = parsePI(p, errorHandler);
          } else if (p.char() === "%") {
            current = p.getMatch(g.PEReference);
          } else {
            return errorHandler.fatalError("Error detected in Markup declaration");
          }
          if (!current) {
            return errorHandler.fatalError("Error in internal subset at position " + p.getIndex());
          }
        }
        return errorHandler.fatalError("doctype internal subset is not well-formed, missing ]");
      }
    }
    function parseDoctypeCommentOrCData(source, start, domBuilder, errorHandler, isHTML) {
      var p = parseUtils(source, start);
      switch (isHTML ? p.char(2).toUpperCase() : p.char(2)) {
        case "-":
          var comment = p.getMatch(g.Comment);
          if (comment) {
            domBuilder.comment(comment, g.COMMENT_START.length, comment.length - g.COMMENT_START.length - g.COMMENT_END.length);
            return p.getIndex();
          } else {
            return errorHandler.fatalError("comment is not well-formed at position " + p.getIndex());
          }
        case "[":
          var cdata = p.getMatch(g.CDSect);
          if (cdata) {
            if (!isHTML && !domBuilder.currentElement) {
              return errorHandler.fatalError("CDATA outside of element");
            }
            domBuilder.startCDATA();
            domBuilder.characters(cdata, g.CDATA_START.length, cdata.length - g.CDATA_START.length - g.CDATA_END.length);
            domBuilder.endCDATA();
            return p.getIndex();
          } else {
            return errorHandler.fatalError("Invalid CDATA starting at position " + start);
          }
        case "D": {
          if (domBuilder.doc && domBuilder.doc.documentElement) {
            return errorHandler.fatalError("Doctype not allowed inside or after documentElement at position " + p.getIndex());
          }
          if (isHTML ? !p.substringStartsWithCaseInsensitive(g.DOCTYPE_DECL_START) : !p.substringStartsWith(g.DOCTYPE_DECL_START)) {
            return errorHandler.fatalError("Expected " + g.DOCTYPE_DECL_START + " at position " + p.getIndex());
          }
          p.skip(g.DOCTYPE_DECL_START.length);
          if (p.skipBlanks() < 1) {
            return errorHandler.fatalError("Expected whitespace after " + g.DOCTYPE_DECL_START + " at position " + p.getIndex());
          }
          var doctype = {
            name: void 0,
            publicId: void 0,
            systemId: void 0,
            internalSubset: void 0
          };
          doctype.name = p.getMatch(g.Name);
          if (!doctype.name)
            return errorHandler.fatalError("doctype name missing or contains unexpected characters at position " + p.getIndex());
          if (isHTML && doctype.name.toLowerCase() !== "html") {
            errorHandler.warning("Unexpected DOCTYPE in HTML document at position " + p.getIndex());
          }
          p.skipBlanks();
          if (p.substringStartsWith(g.PUBLIC) || p.substringStartsWith(g.SYSTEM)) {
            var match = g.ExternalID_match.exec(p.substringFromIndex());
            if (!match) {
              return errorHandler.fatalError("doctype external id is not well-formed at position " + p.getIndex());
            }
            if (match.groups.SystemLiteralOnly !== void 0) {
              doctype.systemId = match.groups.SystemLiteralOnly;
            } else {
              doctype.systemId = match.groups.SystemLiteral;
              doctype.publicId = match.groups.PubidLiteral;
            }
            p.skip(match[0].length);
          } else if (isHTML && p.substringStartsWithCaseInsensitive(g.SYSTEM)) {
            p.skip(g.SYSTEM.length);
            if (p.skipBlanks() < 1) {
              return errorHandler.fatalError("Expected whitespace after " + g.SYSTEM + " at position " + p.getIndex());
            }
            doctype.systemId = p.getMatch(g.ABOUT_LEGACY_COMPAT_SystemLiteral);
            if (!doctype.systemId) {
              return errorHandler.fatalError(
                "Expected " + g.ABOUT_LEGACY_COMPAT + " in single or double quotes after " + g.SYSTEM + " at position " + p.getIndex()
              );
            }
          }
          if (isHTML && doctype.systemId && !g.ABOUT_LEGACY_COMPAT_SystemLiteral.test(doctype.systemId)) {
            errorHandler.warning("Unexpected doctype.systemId in HTML document at position " + p.getIndex());
          }
          if (!isHTML) {
            p.skipBlanks();
            doctype.internalSubset = parseDoctypeInternalSubset(p, errorHandler);
          }
          p.skipBlanks();
          if (p.char() !== ">") {
            return errorHandler.fatalError("doctype not terminated with > at position " + p.getIndex());
          }
          p.skip(1);
          domBuilder.startDTD(doctype.name, doctype.publicId, doctype.systemId, doctype.internalSubset);
          domBuilder.endDTD();
          return p.getIndex();
        }
        default:
          return errorHandler.fatalError('Not well-formed XML starting with "<!" at position ' + start);
      }
    }
    function parseProcessingInstruction(source, start, domBuilder, errorHandler) {
      var match = source.substring(start).match(g.PI);
      if (!match) {
        return errorHandler.fatalError("Invalid processing instruction starting at position " + start);
      }
      if (match[1].toLowerCase() === "xml") {
        if (start > 0) {
          return errorHandler.fatalError(
            "processing instruction at position " + start + " is an xml declaration which is only at the start of the document"
          );
        }
        if (!g.XMLDecl.test(source.substring(start))) {
          return errorHandler.fatalError("xml declaration is not well-formed");
        }
      }
      domBuilder.processingInstruction(match[1], match[2]);
      return start + match[0].length;
    }
    function ElementAttributes() {
      this.attributeNames = /* @__PURE__ */ Object.create(null);
    }
    ElementAttributes.prototype = {
      setTagName: function(tagName) {
        if (!g.QName_exact.test(tagName)) {
          throw new Error("invalid tagName:" + tagName);
        }
        this.tagName = tagName;
      },
      addValue: function(qName, value, offset) {
        if (!g.QName_exact.test(qName)) {
          throw new Error("invalid attribute:" + qName);
        }
        this.attributeNames[qName] = this.length;
        this[this.length++] = { qName, value, offset };
      },
      length: 0,
      getLocalName: function(i) {
        return this[i].localName;
      },
      getLocator: function(i) {
        return this[i].locator;
      },
      getQName: function(i) {
        return this[i].qName;
      },
      getURI: function(i) {
        return this[i].uri;
      },
      getValue: function(i) {
        return this[i].value;
      }
      //	,getIndex:function(uri, localName)){
      //		if(localName){
      //
      //		}else{
      //			var qName = uri
      //		}
      //	},
      //	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
      //	getType:function(uri,localName){}
      //	getType:function(i){},
    };
    exports.XMLReader = XMLReader;
    exports.parseUtils = parseUtils;
    exports.parseDoctypeCommentOrCData = parseDoctypeCommentOrCData;
  }
});

// node_modules/@xmldom/xmldom/lib/dom-parser.js
var require_dom_parser = __commonJS({
  "node_modules/@xmldom/xmldom/lib/dom-parser.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    var dom = require_dom();
    var errors = require_errors();
    var entities = require_entities();
    var sax = require_sax();
    var DOMImplementation = dom.DOMImplementation;
    var hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
    var isHTMLMimeType = conventions.isHTMLMimeType;
    var isValidMimeType = conventions.isValidMimeType;
    var MIME_TYPE = conventions.MIME_TYPE;
    var NAMESPACE = conventions.NAMESPACE;
    var ParseError = errors.ParseError;
    var XMLReader = sax.XMLReader;
    function normalizeLineEndings(input) {
      return input.replace(/\r[\n\u0085]/g, "\n").replace(/[\r\u0085\u2028\u2029]/g, "\n");
    }
    function DOMParser2(options) {
      options = options || {};
      if (options.locator === void 0) {
        options.locator = true;
      }
      this.assign = options.assign || conventions.assign;
      this.domHandler = options.domHandler || DOMHandler;
      this.onError = options.onError || options.errorHandler;
      if (options.errorHandler && typeof options.errorHandler !== "function") {
        throw new TypeError("errorHandler object is no longer supported, switch to onError!");
      } else if (options.errorHandler) {
        options.errorHandler("warning", "The `errorHandler` option has been deprecated, use `onError` instead!", this);
      }
      this.normalizeLineEndings = options.normalizeLineEndings || normalizeLineEndings;
      this.locator = !!options.locator;
      this.xmlns = this.assign(/* @__PURE__ */ Object.create(null), options.xmlns);
    }
    DOMParser2.prototype.parseFromString = function(source, mimeType) {
      if (!isValidMimeType(mimeType)) {
        throw new TypeError('DOMParser.parseFromString: the provided mimeType "' + mimeType + '" is not valid.');
      }
      var defaultNSMap = this.assign(/* @__PURE__ */ Object.create(null), this.xmlns);
      var entityMap = entities.XML_ENTITIES;
      var defaultNamespace = defaultNSMap[""] || null;
      if (hasDefaultHTMLNamespace(mimeType)) {
        entityMap = entities.HTML_ENTITIES;
        defaultNamespace = NAMESPACE.HTML;
      } else if (mimeType === MIME_TYPE.XML_SVG_IMAGE) {
        defaultNamespace = NAMESPACE.SVG;
      }
      defaultNSMap[""] = defaultNamespace;
      defaultNSMap.xml = defaultNSMap.xml || NAMESPACE.XML;
      var domBuilder = new this.domHandler({
        mimeType,
        defaultNamespace,
        onError: this.onError
      });
      var locator = this.locator ? {} : void 0;
      if (this.locator) {
        domBuilder.setDocumentLocator(locator);
      }
      var sax2 = new XMLReader();
      sax2.errorHandler = domBuilder;
      sax2.domBuilder = domBuilder;
      var isXml = !conventions.isHTMLMimeType(mimeType);
      if (isXml && typeof source !== "string") {
        sax2.errorHandler.fatalError("source is not a string");
      }
      sax2.parse(this.normalizeLineEndings(String(source)), defaultNSMap, entityMap);
      if (!domBuilder.doc.documentElement) {
        sax2.errorHandler.fatalError("missing root element");
      }
      return domBuilder.doc;
    };
    function DOMHandler(options) {
      var opt = options || {};
      this.mimeType = opt.mimeType || MIME_TYPE.XML_APPLICATION;
      this.defaultNamespace = opt.defaultNamespace || null;
      this.cdata = false;
      this.currentElement = void 0;
      this.doc = void 0;
      this.locator = void 0;
      this.onError = opt.onError;
    }
    function position(locator, node) {
      node.lineNumber = locator.lineNumber;
      node.columnNumber = locator.columnNumber;
    }
    DOMHandler.prototype = {
      /**
       * Either creates an XML or an HTML document and stores it under `this.doc`.
       * If it is an XML document, `this.defaultNamespace` is used to create it,
       * and it will not contain any `childNodes`.
       * If it is an HTML document, it will be created without any `childNodes`.
       *
       * @see http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
       */
      startDocument: function() {
        var impl = new DOMImplementation();
        this.doc = isHTMLMimeType(this.mimeType) ? impl.createHTMLDocument(false) : impl.createDocument(this.defaultNamespace, "");
      },
      startElement: function(namespaceURI, localName, qName, attrs) {
        var doc = this.doc;
        var el = doc.createElementNS(namespaceURI, qName || localName);
        var len = attrs.length;
        appendElement(this, el);
        this.currentElement = el;
        this.locator && position(this.locator, el);
        for (var i = 0; i < len; i++) {
          var namespaceURI = attrs.getURI(i);
          var value = attrs.getValue(i);
          var qName = attrs.getQName(i);
          var attr = doc.createAttributeNS(namespaceURI, qName);
          this.locator && position(attrs.getLocator(i), attr);
          attr.value = attr.nodeValue = value;
          el.setAttributeNode(attr);
        }
      },
      endElement: function(namespaceURI, localName, qName) {
        this.currentElement = this.currentElement.parentNode;
      },
      startPrefixMapping: function(prefix, uri) {
      },
      endPrefixMapping: function(prefix) {
      },
      processingInstruction: function(target, data) {
        var ins = this.doc.createProcessingInstruction(target, data);
        this.locator && position(this.locator, ins);
        appendElement(this, ins);
      },
      ignorableWhitespace: function(ch, start, length) {
      },
      characters: function(chars, start, length) {
        chars = _toString.apply(this, arguments);
        if (chars) {
          if (this.cdata) {
            var charNode = this.doc.createCDATASection(chars);
          } else {
            var charNode = this.doc.createTextNode(chars);
          }
          if (this.currentElement) {
            this.currentElement.appendChild(charNode);
          } else if (/^\s*$/.test(chars)) {
            this.doc.appendChild(charNode);
          }
          this.locator && position(this.locator, charNode);
        }
      },
      skippedEntity: function(name) {
      },
      endDocument: function() {
        this.doc.normalize();
      },
      /**
       * Stores the locator to be able to set the `columnNumber` and `lineNumber`
       * on the created DOM nodes.
       *
       * @param {Locator} locator
       */
      setDocumentLocator: function(locator) {
        if (locator) {
          locator.lineNumber = 0;
        }
        this.locator = locator;
      },
      //LexicalHandler
      comment: function(chars, start, length) {
        chars = _toString.apply(this, arguments);
        var comm = this.doc.createComment(chars);
        this.locator && position(this.locator, comm);
        appendElement(this, comm);
      },
      startCDATA: function() {
        this.cdata = true;
      },
      endCDATA: function() {
        this.cdata = false;
      },
      startDTD: function(name, publicId, systemId, internalSubset) {
        var impl = this.doc.implementation;
        if (impl && impl.createDocumentType) {
          var dt = impl.createDocumentType(name, publicId, systemId, internalSubset);
          this.locator && position(this.locator, dt);
          appendElement(this, dt);
          this.doc.doctype = dt;
        }
      },
      reportError: function(level, message) {
        if (typeof this.onError === "function") {
          try {
            this.onError(level, message, this);
          } catch (e) {
            throw new ParseError("Reporting " + level + ' "' + message + '" caused ' + e, this.locator);
          }
        } else {
          console.error("[xmldom " + level + "]	" + message, _locator(this.locator));
        }
      },
      /**
       * @see http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
       */
      warning: function(message) {
        this.reportError("warning", message);
      },
      error: function(message) {
        this.reportError("error", message);
      },
      /**
       * This function reports a fatal error and throws a ParseError.
       *
       * @param {string} message
       * - The message to be used for reporting and throwing the error.
       * @returns {never}
       * This function always throws an error and never returns a value.
       * @throws {ParseError}
       * Always throws a ParseError with the provided message.
       */
      fatalError: function(message) {
        this.reportError("fatalError", message);
        throw new ParseError(message, this.locator);
      }
    };
    function _locator(l) {
      if (l) {
        return "\n@#[line:" + l.lineNumber + ",col:" + l.columnNumber + "]";
      }
    }
    function _toString(chars, start, length) {
      if (typeof chars == "string") {
        return chars.substr(start, length);
      } else {
        if (chars.length >= start + length || start) {
          return new java.lang.String(chars, start, length) + "";
        }
        return chars;
      }
    }
    "endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(
      /\w+/g,
      function(key) {
        DOMHandler.prototype[key] = function() {
          return null;
        };
      }
    );
    function appendElement(handler, node) {
      if (!handler.currentElement) {
        handler.doc.appendChild(node);
      } else {
        handler.currentElement.appendChild(node);
      }
    }
    function onErrorStopParsing(level) {
      if (level === "error") throw "onErrorStopParsing";
    }
    function onWarningStopParsing() {
      throw "onWarningStopParsing";
    }
    exports.__DOMHandler = DOMHandler;
    exports.DOMParser = DOMParser2;
    exports.normalizeLineEndings = normalizeLineEndings;
    exports.onErrorStopParsing = onErrorStopParsing;
    exports.onWarningStopParsing = onWarningStopParsing;
  }
});

// node_modules/@xmldom/xmldom/lib/index.js
var require_lib = __commonJS({
  "node_modules/@xmldom/xmldom/lib/index.js"(exports) {
    "use strict";
    var conventions = require_conventions();
    exports.assign = conventions.assign;
    exports.hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
    exports.isHTMLMimeType = conventions.isHTMLMimeType;
    exports.isValidMimeType = conventions.isValidMimeType;
    exports.MIME_TYPE = conventions.MIME_TYPE;
    exports.NAMESPACE = conventions.NAMESPACE;
    var errors = require_errors();
    exports.DOMException = errors.DOMException;
    exports.DOMExceptionName = errors.DOMExceptionName;
    exports.ExceptionCode = errors.ExceptionCode;
    exports.ParseError = errors.ParseError;
    var dom = require_dom();
    exports.Attr = dom.Attr;
    exports.CDATASection = dom.CDATASection;
    exports.CharacterData = dom.CharacterData;
    exports.Comment = dom.Comment;
    exports.Document = dom.Document;
    exports.DocumentFragment = dom.DocumentFragment;
    exports.DocumentType = dom.DocumentType;
    exports.DOMImplementation = dom.DOMImplementation;
    exports.Element = dom.Element;
    exports.Entity = dom.Entity;
    exports.EntityReference = dom.EntityReference;
    exports.LiveNodeList = dom.LiveNodeList;
    exports.NamedNodeMap = dom.NamedNodeMap;
    exports.Node = dom.Node;
    exports.NodeList = dom.NodeList;
    exports.Notation = dom.Notation;
    exports.ProcessingInstruction = dom.ProcessingInstruction;
    exports.Text = dom.Text;
    exports.XMLSerializer = dom.XMLSerializer;
    var domParser = require_dom_parser();
    exports.DOMParser = domParser.DOMParser;
    exports.normalizeLineEndings = domParser.normalizeLineEndings;
    exports.onErrorStopParsing = domParser.onErrorStopParsing;
    exports.onWarningStopParsing = domParser.onWarningStopParsing;
  }
});

// src/errors/XdmError.ts
var XdmError = class extends Error {
  code;
  detailMessage;
  location;
  details;
  related;
  frames;
  suggestions;
  causes;
  constructor(code, message, location, details, context = {}) {
    super(`[${code}] ${message}`);
    this.name = "XdmError";
    this.code = code;
    this.detailMessage = message;
    if (location !== void 0) {
      this.location = location;
    }
    if (details !== void 0) {
      this.details = details;
    }
    this.related = context.related ?? [];
    this.frames = context.frames ?? [];
    this.suggestions = context.suggestions ?? [];
    this.causes = context.causes ?? [];
  }
};

// src/diagnostics/report.ts
function diagnosticReportFromError(error) {
  if (!(error instanceof XdmError)) {
    const report2 = {
      code: "WEAVER_INTERNAL_UNKNOWN",
      phase: "internal",
      severity: "error",
      category: "internal",
      message: error instanceof Error ? error.message : String(error),
      related: [],
      frames: [],
      details: [],
      suggestions: [],
      causes: []
    };
    assertValidDiagnostic(report2);
    return report2;
  }
  const primary = toSourceSpan(error.location);
  const report = {
    code: error.code,
    phase: classifyPhase(error.code),
    severity: "error",
    category: classifyCategory(error.code),
    message: error.detailMessage,
    related: toRelatedSpans(error.related, error.frames),
    frames: error.frames.map((frame) => toDiagnosticFrame(frame)),
    details: toDiagnosticDetails(error.details),
    suggestions: toDiagnosticSuggestions(error.suggestions),
    causes: error.causes.map((cause) => diagnosticReportFromError(cause))
  };
  const normalizedReport = primary !== void 0 ? { ...report, primary } : report;
  assertValidDiagnostic(normalizedReport);
  return normalizedReport;
}
function assertValidDiagnostic(report) {
  if (report.code.length === 0) {
    throw new Error("Diagnostic code must be non-empty.");
  }
  const detailKeys = /* @__PURE__ */ new Set();
  for (const detail of report.details) {
    if (detail.key.length === 0) {
      throw new Error("Diagnostic detail keys must be non-empty.");
    }
    if (detailKeys.has(detail.key)) {
      throw new Error(`Duplicate diagnostic detail key ${detail.key}.`);
    }
    detailKeys.add(detail.key);
  }
  assertRequiredDetails(report, detailKeys);
  if (report.primary !== void 0) {
    assertValidSpan(report.primary);
  }
  for (const related of report.related) {
    assertValidSpan(related.span);
  }
  for (const frame of report.frames) {
    if (frame.span !== void 0) {
      assertValidSpan(frame.span);
    }
  }
  for (const cause of report.causes) {
    assertValidDiagnostic(cause);
  }
}
var REQUIRED_DETAIL_KEYS = {
  XPST0017: ["functionName", "actualArity"],
  XPTY0004: ["expectedType", "actualType"],
  XTDE0040: ["mode"],
  XTSE0165: ["href"]
};
function classifyPhase(code) {
  if (code === "WEAVER_XML_STYLESHEET_PARSE_ERROR") {
    return "compile";
  }
  if (code === "WEAVER_XML_SOURCE_PARSE_ERROR") {
    return "runtime";
  }
  if (code.startsWith("XPST") || code.startsWith("XTSE")) {
    return "compile";
  }
  if (code.startsWith("SENR") || code.startsWith("SERE")) {
    return "serialization";
  }
  if (code.startsWith("WEAVER_CODEGEN")) {
    return "codegen";
  }
  if (code.startsWith("WEAVER_XSLT_")) {
    return "runtime";
  }
  if (code.startsWith("XPDY") || code.startsWith("XPTY") || code.startsWith("XTDE") || code.startsWith("FO")) {
    return "runtime";
  }
  return "internal";
}
function classifyCategory(code) {
  if (code === "WEAVER_XML_STYLESHEET_PARSE_ERROR" || code === "WEAVER_XML_SOURCE_PARSE_ERROR") {
    return "syntax";
  }
  if (code === "XPST0008") {
    return "resolution";
  }
  if (code.startsWith("XPST")) {
    return "syntax";
  }
  if (code.startsWith("XPTY")) {
    return "type";
  }
  if (code.startsWith("XTSE")) {
    return "analysis";
  }
  if (code.startsWith("SENR") || code.startsWith("SERE")) {
    return "serialization";
  }
  if (code.startsWith("WEAVER_XSLT_")) {
    return "execution";
  }
  if (code.startsWith("XPDY") || code.startsWith("XTDE") || code.startsWith("FO")) {
    return "execution";
  }
  return "internal";
}
function toSourceSpan(location) {
  if (location?.line === void 0 || location.column === void 0 || location.offset === void 0) {
    return void 0;
  }
  return {
    ...location.source !== void 0 ? { uri: location.source } : {},
    offsetStart: location.offset,
    offsetEnd: location.endOffset ?? location.offset + 1,
    lineStart: location.line,
    columnStart: location.column,
    lineEnd: location.endLine ?? location.line,
    columnEnd: location.endColumn ?? location.column + 1
  };
}
function toDiagnosticDetails(details) {
  if (details === void 0) {
    return [];
  }
  return Object.entries(details).map(([key, value]) => ({ key, value }));
}
function toRelatedSpans(related, frames) {
  const explicit = related.flatMap((entry) => {
    const span = toSourceSpan(entry.location);
    return span === void 0 ? [] : [{ label: entry.label, span }];
  });
  const derived = frames.flatMap((frame) => {
    const span = toSourceSpan(frame.location);
    return span === void 0 ? [] : [{
      label: `${frame.kind} ${frame.label}`,
      span
    }];
  });
  return dedupeRelatedSpans([...explicit, ...derived]);
}
function toDiagnosticSuggestions(suggestions) {
  return suggestions.map((suggestion) => ({
    kind: suggestion.kind,
    label: suggestion.label,
    ...suggestion.replacement === void 0 ? {} : { replacement: suggestion.replacement },
    ...suggestion.confidence === void 0 ? {} : { confidence: suggestion.confidence }
  }));
}
function toDiagnosticFrame(frame) {
  const span = toSourceSpan(frame.location);
  return span === void 0 ? {
    kind: frame.kind,
    label: frame.label
  } : {
    kind: frame.kind,
    label: frame.label,
    span
  };
}
function dedupeRelatedSpans(related) {
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const entry of related) {
    const key = [
      entry.span.uri ?? "",
      entry.span.offsetStart,
      entry.span.offsetEnd,
      entry.span.lineStart,
      entry.span.columnStart
    ].join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}
function assertRequiredDetails(report, detailKeys) {
  const requiredKeys = REQUIRED_DETAIL_KEYS[report.code];
  if (requiredKeys === void 0) {
    return;
  }
  for (const key of requiredKeys) {
    if (!detailKeys.has(key)) {
      throw new Error(`Diagnostic ${report.code} must include detail ${key}.`);
    }
  }
}
function assertValidSpan(span) {
  if (span.offsetEnd < span.offsetStart) {
    throw new Error("Diagnostic span offsetEnd must be >= offsetStart.");
  }
  if (span.lineEnd < span.lineStart) {
    throw new Error("Diagnostic span lineEnd must be >= lineStart.");
  }
  if (span.lineEnd === span.lineStart && span.columnEnd < span.columnStart) {
    throw new Error("Diagnostic span columnEnd must be >= columnStart on a single line.");
  }
}

// src/diagnostics/order.ts
function sortDiagnostics(reports) {
  for (const report of reports) {
    assertValidDiagnostic(report);
  }
  return [...reports].sort(compareDiagnostics);
}
function compareDiagnostics(left, right) {
  const leftPrimary = left.primary;
  const rightPrimary = right.primary;
  if (leftPrimary !== void 0 && rightPrimary !== void 0) {
    const byUri = (leftPrimary.uri ?? "").localeCompare(rightPrimary.uri ?? "");
    if (byUri !== 0) {
      return byUri;
    }
    const byOffsetStart = leftPrimary.offsetStart - rightPrimary.offsetStart;
    if (byOffsetStart !== 0) {
      return byOffsetStart;
    }
    const byOffsetEnd = leftPrimary.offsetEnd - rightPrimary.offsetEnd;
    if (byOffsetEnd !== 0) {
      return byOffsetEnd;
    }
  } else if (leftPrimary !== void 0) {
    return -1;
  } else if (rightPrimary !== void 0) {
    return 1;
  }
  const byCode = left.code.localeCompare(right.code);
  if (byCode !== 0) {
    return byCode;
  }
  return left.message.localeCompare(right.message);
}

// src/xml/parse.ts
var import_xmldom = __toESM(require_lib(), 1);

// src/errors/codes.ts
var XPST0003 = "XPST0003";
var XPST0008 = "XPST0008";
var XPST0017 = "XPST0017";
var XPST0081 = "XPST0081";
var XPDY0002 = "XPDY0002";
var XPTY0004 = "XPTY0004";
var XPTY0019 = "XPTY0019";
var FORG0001 = "FORG0001";
var FORG0005 = "FORG0005";
var FORG0006 = "FORG0006";
var FORX0001 = "FORX0001";
var FORX0002 = "FORX0002";
var FORX0003 = "FORX0003";
var FORX0004 = "FORX0004";
var FOAR0001 = "FOAR0001";
var FOCH0001 = "FOCH0001";
var FOCH0002 = "FOCH0002";
var FOER0000 = "FOER0000";
var FOTY0014 = "FOTY0014";
var XTSE0010 = "XTSE0010";
var XTSE0090 = "XTSE0090";
var XTSE0165 = "XTSE0165";
var XTSE0500 = "XTSE0500";
var XTSE0580 = "XTSE0580";
var XTSE0620 = "XTSE0620";
var XTSE0630 = "XTSE0630";
var XTSE0650 = "XTSE0650";
var XTSE0660 = "XTSE0660";
var XTSE0670 = "XTSE0670";
var XTSE0680 = "XTSE0680";
var XTSE0690 = "XTSE0690";
var XTDE0040 = "XTDE0040";
var XTDE0050 = "XTDE0050";
var XTDE0640 = "XTDE0640";
var XTDE0700 = "XTDE0700";
var WEAVER_XSLT_NATIVE_UNSUPPORTED = "WEAVER_XSLT_NATIVE_UNSUPPORTED";
var WEAVER_XML_SOURCE_PARSE_ERROR = "WEAVER_XML_SOURCE_PARSE_ERROR";
var WEAVER_XML_STYLESHEET_PARSE_ERROR = "WEAVER_XML_STYLESHEET_PARSE_ERROR";

// src/errors/XPathError.ts
var XPathError = class extends XdmError {
  constructor(code, message, location, details, context) {
    super(code, message, location, details, context);
    this.name = "XPathError";
  }
};

// src/errors/XsltError.ts
var XsltError = class extends XdmError {
  constructor(code, message, location, details, context) {
    super(code, message, location, details, context);
    this.name = "XsltError";
  }
};

// src/xml/sourceLocations.ts
function getNodeSourceLocation(source, node, sourceName = "<xml>") {
  const locatedNode = node;
  const line = normalizeLineNumber(locatedNode.lineNumber);
  const column = locatedNode.columnNumber;
  if (line === void 0 || column === void 0) {
    return void 0;
  }
  const lineStartOffsets = computeLineStartOffsets(source);
  const lineStartOffset = lineStartOffsets[line - 1];
  if (lineStartOffset === void 0) {
    return void 0;
  }
  const offset = lineStartOffset + Math.max(0, column - 1);
  return {
    source: sourceName,
    line,
    column,
    offset,
    endLine: line,
    endColumn: column + 1,
    endOffset: offset + 1
  };
}
function getAttributeValueSourceLocation(source, element, attributeName, sourceName = "<xml>") {
  const attribute = element.getAttributeNode(attributeName);
  if (attribute === null) {
    return void 0;
  }
  const line = normalizeLineNumber(attribute.lineNumber);
  const column = attribute.columnNumber;
  if (line === void 0 || column === void 0) {
    return void 0;
  }
  const lineStartOffsets = computeLineStartOffsets(source);
  const lineStartOffset = lineStartOffsets[line - 1];
  if (lineStartOffset === void 0) {
    return void 0;
  }
  const lineText = getLineText(source, lineStartOffsets, line);
  if (lineText === void 0) {
    return void 0;
  }
  const valueRange = findAttributeValueRange(lineText, attribute);
  if (valueRange === void 0) {
    return getNodeSourceLocation(source, attribute, sourceName);
  }
  return {
    source: sourceName,
    line,
    column: valueRange.startColumn,
    offset: lineStartOffset + valueRange.startOffset,
    endLine: line,
    endColumn: valueRange.endColumn,
    endOffset: lineStartOffset + valueRange.endOffset
  };
}
function getElementNameSourceLocation(source, element, sourceName = "<xml>") {
  const locatedNode = element;
  const line = normalizeLineNumber(locatedNode.lineNumber);
  const column = locatedNode.columnNumber;
  if (line === void 0 || column === void 0) {
    return void 0;
  }
  const lineStartOffsets = computeLineStartOffsets(source);
  const lineStartOffset = lineStartOffsets[line - 1];
  if (lineStartOffset === void 0) {
    return void 0;
  }
  const startColumn = column + 1;
  const startOffset = lineStartOffset + Math.max(0, startColumn - 1);
  const endColumn = startColumn + element.nodeName.length;
  const endOffset = startOffset + element.nodeName.length;
  return {
    source: sourceName,
    line,
    column: startColumn,
    offset: startOffset,
    endLine: line,
    endColumn,
    endOffset
  };
}
function computeLineStartOffsets(source) {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "\r") {
      if (source[index + 1] === "\n") {
        index += 1;
      }
      offsets.push(index + 1);
      continue;
    }
    if (character === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
}
function getLineText(source, lineStartOffsets, line) {
  const lineStartOffset = lineStartOffsets[line - 1];
  if (lineStartOffset === void 0) {
    return void 0;
  }
  const nextLineOffset = lineStartOffsets[line] ?? source.length;
  let lineEndOffset = nextLineOffset;
  if (lineEndOffset > lineStartOffset && source[lineEndOffset - 1] === "\n") {
    lineEndOffset -= 1;
  }
  if (lineEndOffset > lineStartOffset && source[lineEndOffset - 1] === "\r") {
    lineEndOffset -= 1;
  }
  return source.slice(lineStartOffset, lineEndOffset);
}
function findAttributeValueRange(lineText, attribute) {
  const assignmentIndex = lineText.indexOf(`${attribute.name}=`);
  if (assignmentIndex === -1) {
    return void 0;
  }
  const quoteIndex = assignmentIndex + attribute.name.length + 1;
  const quoteCharacter = lineText[quoteIndex];
  if (quoteCharacter !== '"' && quoteCharacter !== "'") {
    return void 0;
  }
  const valueStartOffset = quoteIndex + 1;
  const valueEndOffset = lineText.indexOf(quoteCharacter, valueStartOffset);
  if (valueEndOffset === -1) {
    return void 0;
  }
  return {
    startOffset: valueStartOffset,
    endOffset: valueEndOffset,
    startColumn: valueStartOffset + 1,
    endColumn: valueEndOffset + 1
  };
}
function normalizeLineNumber(lineNumber) {
  if (lineNumber === void 0) {
    return void 0;
  }
  return lineNumber <= 0 ? 1 : lineNumber;
}

// src/xml/parse.ts
function parseXml(source, options = {}) {
  const stripped = source.charCodeAt(0) === 65279 ? source.slice(1) : source;
  const parser = new import_xmldom.DOMParser({
    onError: () => {
    }
  });
  let document;
  try {
    document = parser.parseFromString(stripped, "text/xml");
  } catch (error) {
    throw translateXmlParseError(error, stripped, options);
  }
  stripXmlDeclarationProcessingInstruction(document);
  return document;
}
function translateXmlParseError(error, source, options) {
  if (!isXmlDomParseError(error) || options.role === void 0) {
    return error;
  }
  const message = normalizeXmlParseMessage(error.message);
  const location = createParseErrorLocation(source, options.sourceName, error.locator);
  const suggestion = createParseSuggestion(options.role);
  if (options.role === "stylesheet") {
    return new XsltError(
      WEAVER_XML_STYLESHEET_PARSE_ERROR,
      `Stylesheet XML is not well-formed: ${message}.`,
      location,
      void 0,
      { suggestions: [suggestion] }
    );
  }
  return new XsltError(
    WEAVER_XML_SOURCE_PARSE_ERROR,
    `Source XML is not well-formed: ${message}.`,
    location,
    void 0,
    { suggestions: [suggestion] }
  );
}
function isXmlDomParseError(error) {
  return error instanceof Error && typeof error.message === "string" && "locator" in error;
}
function normalizeXmlParseMessage(message) {
  return message.endsWith(".") ? message.slice(0, -1) : message;
}
function createParseSuggestion(role) {
  return role === "stylesheet" ? {
    kind: "fix",
    label: "fix the XML well-formedness error in the stylesheet document",
    confidence: 1
  } : {
    kind: "fix",
    label: "supply a well-formed XML source document",
    confidence: 1
  };
}
function createParseErrorLocation(source, sourceName, locator) {
  const line = locator?.lineNumber;
  const column = locator?.columnNumber;
  if (line === void 0 || column === void 0) {
    return sourceName === void 0 ? void 0 : { source: sourceName };
  }
  const offset = computeNormalizedOffset(source, line, column);
  return {
    ...sourceName === void 0 ? {} : { source: sourceName },
    offset,
    endOffset: offset + 1,
    line,
    column,
    endLine: line,
    endColumn: column + 1
  };
}
function computeNormalizedOffset(source, line, column) {
  const normalizedSource = source.replace(/\r\n/g, "\n").replace(/[\r\u0085\u2028\u2029]/g, "\n");
  const lines = normalizedSource.split("\n");
  let offset = 0;
  for (let index = 0; index < line - 1; index += 1) {
    offset += (lines[index] ?? "").length + 1;
  }
  return offset + Math.max(column - 1, 0);
}
function stripXmlDeclarationProcessingInstruction(document) {
  const toRemove = [];
  for (let index = 0; index < document.childNodes.length; index += 1) {
    const child = document.childNodes.item(index);
    if (child?.nodeType === 7 && child.nodeName === "xml") {
      toRemove.push(child);
    }
  }
  for (const child of toRemove) {
    document.removeChild(child);
  }
}

// src/xslt/diagnostics.ts
function prependXsltErrorFrame(error, frame, related) {
  if (!(error instanceof XdmError)) {
    return error;
  }
  return new XsltError(
    error.code,
    error.detailMessage,
    error.location,
    error.details,
    {
      related: related === void 0 ? error.related : [related, ...error.related],
      frames: [frame, ...error.frames],
      suggestions: error.suggestions,
      causes: error.causes.length === 0 ? [error] : error.causes
    }
  );
}
function computeLevenshteinDistance(left, right) {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0] ?? 0;
    previousRow[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const temp = previousRow[rightIndex] ?? 0;
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previousRow[rightIndex] = Math.min(
        (previousRow[rightIndex] ?? 0) + 1,
        (previousRow[rightIndex - 1] ?? 0) + 1,
        previousDiagonal + substitutionCost
      );
      previousDiagonal = temp;
    }
  }
  return previousRow[right.length] ?? right.length;
}

// src/xslt/compile/analyze.ts
function analyzeStylesheet(ir, options = {}) {
  const reachableNamedTemplateNames = collectReachableNamedTemplateNames(ir);
  const reachableGlobalBindingNames = collectReachableGlobalBindingNames(ir);
  const templatePriorityConflictReports = collectTemplatePriorityConflictDiagnostics(ir);
  const sampleDocumentReports = collectSampleDocumentNameDiagnostics(ir, options.sampleDocument);
  const globalBindingReports = ir.globalBindings.flatMap((binding) => {
    if (reachableGlobalBindingNames.has(binding.name)) {
      return [];
    }
    return binding.kind === "param" ? [createUnusedGlobalParamDiagnostic(binding)] : [createUnusedGlobalVariableDiagnostic(binding)];
  });
  const templateReports = ir.templates.flatMap((template) => {
    const reports = [];
    if (template.name !== void 0 && template.match === void 0 && !reachableNamedTemplateNames.has(template.name)) {
      reports.push(createUnusedNamedTemplateDiagnostic(template));
    }
    const bindingUsage = collectTemplateBindingUsage(template);
    for (const param of template.params) {
      if (!bindingUsage.usedTemplateParamNames.has(param.name)) {
        reports.push(createUnusedTemplateParamDiagnostic(template, param));
      }
    }
    for (const variable of bindingUsage.unusedLocalVariables) {
      reports.push(createUnusedLocalVariableDiagnostic(template, variable));
    }
    return reports;
  });
  return [...globalBindingReports, ...templatePriorityConflictReports, ...sampleDocumentReports, ...templateReports];
}
function collectReachableNamedTemplateNames(ir) {
  const namedTemplates = new Map(
    ir.templates.flatMap((template) => template.name === void 0 ? [] : [[template.name, template]])
  );
  const reachableNamedTemplateNames = /* @__PURE__ */ new Set();
  const visitTemplate = (template) => {
    visitTemplateParams(template.params);
    visitInstructions(template.body);
  };
  const visitTemplateParams = (params) => {
    for (const param of params) {
      if (param.body !== void 0) {
        visitInstructions(param.body);
      }
    }
  };
  const visitWithParams = (withParams) => {
    for (const withParam of withParams) {
      if (withParam.body !== void 0) {
        visitInstructions(withParam.body);
      }
    }
  };
  const visitGlobalBinding = (binding) => {
    if (binding.body !== void 0) {
      visitInstructions(binding.body);
    }
  };
  const visitNamedTemplateByName = (name) => {
    if (reachableNamedTemplateNames.has(name)) {
      return;
    }
    const namedTemplate = namedTemplates.get(name);
    if (namedTemplate === void 0) {
      return;
    }
    reachableNamedTemplateNames.add(name);
    visitTemplate(namedTemplate);
  };
  const visitInstructions = (instructions) => {
    for (const instruction of instructions) {
      switch (instruction.kind) {
        case "literalElement":
        case "comment":
        case "if":
        case "forEach":
          visitInstructions(instruction.body);
          break;
        case "choose":
          for (const branch of instruction.whenBranches) {
            visitInstructions(branch.body);
          }
          if (instruction.otherwiseBody !== void 0) {
            visitInstructions(instruction.otherwiseBody);
          }
          break;
        case "variable":
          if (instruction.body !== void 0) {
            visitInstructions(instruction.body);
          }
          break;
        case "callTemplate":
          visitWithParams(instruction.withParams);
          visitNamedTemplateByName(instruction.name);
          break;
        case "applyTemplates":
          visitWithParams(instruction.withParams);
          break;
        default:
          break;
      }
    }
  };
  for (const binding of ir.globalBindings) {
    visitGlobalBinding(binding);
  }
  for (const template of ir.templates) {
    if (template.match !== void 0) {
      visitTemplate(template);
    }
  }
  return reachableNamedTemplateNames;
}
function collectReachableGlobalBindingNames(ir) {
  const globalBindings = new Map(ir.globalBindings.map((binding) => [binding.name, binding]));
  const namedTemplates = new Map(
    ir.templates.flatMap((template) => template.name === void 0 ? [] : [[template.name, template]])
  );
  const reachableGlobalBindingNames = /* @__PURE__ */ new Set();
  const visitedTemplates = /* @__PURE__ */ new Set();
  const visitNamedTemplateByName = (name) => {
    const template = namedTemplates.get(name);
    if (template === void 0) {
      return;
    }
    visitTemplate(template);
  };
  const visitGlobalBindingByName = (name) => {
    if (reachableGlobalBindingNames.has(name)) {
      return;
    }
    const binding = globalBindings.get(name);
    if (binding === void 0) {
      return;
    }
    reachableGlobalBindingNames.add(name);
    visitGlobalBinding(binding);
  };
  const callbacks = {
    onUnresolvedVariableReference: visitGlobalBindingByName,
    onCallTemplate: visitNamedTemplateByName
  };
  const visitTemplate = (template) => {
    if (visitedTemplates.has(template)) {
      return;
    }
    visitedTemplates.add(template);
    collectTemplateBindingUsage(template, callbacks);
  };
  const visitGlobalBinding = (binding) => {
    const usage = createMutableTemplateBindingUsage();
    const initialScope = /* @__PURE__ */ new Map();
    if (binding.select !== void 0) {
      visitXPathForBindingUsage(binding.select, initialScope, usage, callbacks);
    }
    if (binding.body !== void 0) {
      visitInstructionsForBindingUsage(binding.body, initialScope, usage, callbacks);
    }
  };
  for (const template of ir.templates) {
    if (template.match !== void 0) {
      visitTemplate(template);
    }
  }
  return reachableGlobalBindingNames;
}
function collectTemplatePriorityConflictDiagnostics(ir) {
  const priorTemplates = [];
  const reports = [];
  for (const template of ir.templates) {
    const pattern = getComparableTemplateMatchPattern(template, ir);
    if (pattern === void 0) {
      continue;
    }
    const priority = getTemplateEffectivePriority(template);
    const shadowingTemplate = findLastShadowingTemplateWithMinimumPriority(priorTemplates, pattern, priority);
    if (shadowingTemplate !== void 0) {
      reports.push(createUnreachableTemplateMatchDiagnostic(template, shadowingTemplate, priority));
    }
    const conflictingTemplate = findLastOverlappingTemplateWithPriority(priorTemplates, pattern, priority);
    if (conflictingTemplate !== void 0) {
      reports.push(createTemplatePriorityConflictDiagnostic(template, conflictingTemplate, priority));
    }
    priorTemplates.push({ template, priority, pattern });
  }
  return reports;
}
function findLastOverlappingTemplateWithPriority(templates, pattern, priority) {
  for (let index = templates.length - 1; index >= 0; index -= 1) {
    if (templates[index]?.priority === priority && templateMatchPatternsOverlap(templates[index].pattern, pattern)) {
      return templates[index]?.template;
    }
  }
  return void 0;
}
function findLastShadowingTemplateWithMinimumPriority(templates, pattern, minimumPriorityExclusive) {
  for (let index = templates.length - 1; index >= 0; index -= 1) {
    if ((templates[index]?.priority ?? Number.NEGATIVE_INFINITY) > minimumPriorityExclusive && templateMatchPatternSubsumes(templates[index].pattern, pattern)) {
      return templates[index]?.template;
    }
  }
  return void 0;
}
function getComparableTemplateMatchPattern(template, ir) {
  if (template.match === void 0 || template.match.kind !== "path") {
    return void 0;
  }
  const match = template.match;
  if (match.base !== void 0) {
    return void 0;
  }
  const steps = [];
  for (const step of match.steps) {
    if (step.kind !== "step" || step.axis !== "child" || step.predicates.length > 0) {
      return void 0;
    }
    const stepKey = getComparableTemplateMatchStep(step, ir);
    if (stepKey === void 0) {
      return void 0;
    }
    steps.push(stepKey);
  }
  return {
    absolute: match.absolute,
    steps
  };
}
function getComparableTemplateMatchStep(step, ir) {
  if (step.nodeTest.kind === "wildcardTest") {
    return step.nodeTest.prefix === void 0 && step.nodeTest.localName === void 0 ? { kind: "wildcard" } : void 0;
  }
  if (step.nodeTest.kind === "kindTest") {
    return step.nodeTest.name === "node" || step.nodeTest.name === "text" ? { kind: step.nodeTest.name } : void 0;
  }
  if (step.nodeTest.kind !== "nameTest") {
    return void 0;
  }
  return { kind: "name", name: normalizeTemplateMatchName(step.nodeTest.name, ir) };
}
function templateMatchPatternsOverlap(left, right) {
  if (left.absolute && right.absolute) {
    return left.steps.length === right.steps.length && comparableStepSequencesOverlap(left.steps, right.steps);
  }
  if (left.absolute) {
    return absoluteAndRelativePatternsOverlap(left, right);
  }
  if (right.absolute) {
    return absoluteAndRelativePatternsOverlap(right, left);
  }
  return suffixComparablePatternsOverlap(left.steps, right.steps);
}
function templateMatchPatternSubsumes(earlier, later) {
  if (earlier.absolute) {
    return later.absolute && earlier.steps.length === later.steps.length && comparableStepSequenceSubsumes(earlier.steps, later.steps);
  }
  if (earlier.steps.length > later.steps.length) {
    return false;
  }
  return comparableStepSequenceSubsumes(
    earlier.steps,
    later.steps.slice(later.steps.length - earlier.steps.length)
  );
}
function absoluteAndRelativePatternsOverlap(absolutePattern, relativePattern) {
  if (relativePattern.steps.length > absolutePattern.steps.length) {
    return false;
  }
  return comparableStepSequencesOverlap(
    absolutePattern.steps.slice(absolutePattern.steps.length - relativePattern.steps.length),
    relativePattern.steps
  );
}
function suffixComparablePatternsOverlap(left, right) {
  const [longer, shorter] = left.length >= right.length ? [left, right] : [right, left];
  return comparableStepSequencesOverlap(longer.slice(longer.length - shorter.length), shorter);
}
function comparableStepSequencesOverlap(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (!comparableStepsOverlap(left[index], right[index])) {
      return false;
    }
  }
  return true;
}
function comparableStepSequenceSubsumes(earlier, later) {
  if (earlier.length !== later.length) {
    return false;
  }
  for (let index = 0; index < earlier.length; index += 1) {
    if (!comparableStepSubsumes(earlier[index], later[index])) {
      return false;
    }
  }
  return true;
}
function comparableStepsOverlap(left, right) {
  if (left.kind === "node" || right.kind === "node") {
    return true;
  }
  if (left.kind === "text" || right.kind === "text") {
    return left.kind === "text" && right.kind === "text";
  }
  if (left.kind === "wildcard" || right.kind === "wildcard") {
    return true;
  }
  return left.name === right.name;
}
function comparableStepSubsumes(earlier, later) {
  if (earlier.kind === "node") {
    return true;
  }
  if (earlier.kind === "text") {
    return later.kind === "text";
  }
  if (earlier.kind === "wildcard") {
    return later.kind === "wildcard" || later.kind === "name";
  }
  return later.kind === "name" && earlier.name === later.name;
}
function normalizeTemplateMatchName(name, ir) {
  const eqName = tryNormalizeEqName(name);
  if (eqName !== void 0) {
    return eqName;
  }
  const separator = name.indexOf(":");
  if (separator < 0) {
    return ir.defaultElementNamespace.length === 0 ? name : `{${ir.defaultElementNamespace}}${name}`;
  }
  const prefix = name.slice(0, separator);
  const localName = name.slice(separator + 1);
  const namespaceUri = ir.namespaces[prefix];
  return namespaceUri === void 0 ? name : `{${namespaceUri}}${localName}`;
}
function tryNormalizeEqName(name) {
  if (!name.startsWith("Q{")) {
    return void 0;
  }
  const endBrace = name.indexOf("}");
  if (endBrace < 0) {
    return void 0;
  }
  const namespaceUri = name.slice(2, endBrace);
  const localName = name.slice(endBrace + 1);
  if (localName.length === 0) {
    return void 0;
  }
  return namespaceUri.length === 0 ? localName : `{${namespaceUri}}${localName}`;
}
function isRootTemplateRule(template) {
  return template.match?.kind === "path" && template.match.absolute && template.match.base === void 0 && template.match.steps.length === 0;
}
function getTemplateEffectivePriority(template) {
  if (template.priority !== void 0) {
    return template.priority;
  }
  if (template.match === void 0 || template.match.kind !== "path") {
    return Number.NEGATIVE_INFINITY;
  }
  if (isRootTemplateRule(template)) {
    return 0.5;
  }
  const match = template.match;
  if (match.base !== void 0 || match.steps.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }
  if (match.absolute) {
    return 0.5;
  }
  const step = match.steps[match.steps.length - 1];
  if (step?.kind !== "step") {
    return Number.NEGATIVE_INFINITY;
  }
  if (step.nodeTest.kind === "nameTest") {
    return 0;
  }
  if (step.nodeTest.kind === "wildcardTest") {
    return -0.5;
  }
  if (step.nodeTest.kind === "kindTest" && (step.nodeTest.name === "node" || step.nodeTest.name === "text")) {
    return -0.5;
  }
  return Number.NEGATIVE_INFINITY;
}
function collectTemplateBindingUsage(template, callbacks = {}) {
  const usage = createMutableTemplateBindingUsage();
  let scope = /* @__PURE__ */ new Map();
  for (const param of template.params) {
    visitTemplateParamValue(param, scope, usage, callbacks);
    scope = extendScope(scope, param.name, { kind: "templateParam", name: param.name });
  }
  visitInstructionsForBindingUsage(template.body, scope, usage, callbacks);
  return {
    usedTemplateParamNames: usage.usedTemplateParamNames,
    unusedLocalVariables: usage.localVariables.filter((variable) => !usage.usedLocalVariableIds.has(variable.id)).map((variable) => variable.instruction)
  };
}
function createMutableTemplateBindingUsage() {
  return {
    usedTemplateParamNames: /* @__PURE__ */ new Set(),
    localVariables: [],
    usedLocalVariableIds: /* @__PURE__ */ new Set(),
    nextLocalVariableId: 0
  };
}
function visitTemplateParamValue(param, scope, usage, callbacks) {
  if (param.select !== void 0) {
    visitXPathForBindingUsage(param.select, scope, usage, callbacks);
  }
  if (param.body !== void 0) {
    visitInstructionsForBindingUsage(param.body, scope, usage, callbacks);
  }
}
function visitInstructionsForBindingUsage(instructions, initialScope, usage, callbacks) {
  let scope = initialScope;
  for (const instruction of instructions) {
    switch (instruction.kind) {
      case "literalElement":
      case "comment":
        visitInstructionsForBindingUsage(instruction.body, scope, usage, callbacks);
        break;
      case "if":
        visitXPathForBindingUsage(instruction.test, scope, usage, callbacks);
        visitInstructionsForBindingUsage(instruction.body, scope, usage, callbacks);
        break;
      case "choose":
        for (const branch of instruction.whenBranches) {
          visitXPathForBindingUsage(branch.test, scope, usage, callbacks);
          visitInstructionsForBindingUsage(branch.body, scope, usage, callbacks);
        }
        if (instruction.otherwiseBody !== void 0) {
          visitInstructionsForBindingUsage(instruction.otherwiseBody, scope, usage, callbacks);
        }
        break;
      case "forEach":
        visitXPathForBindingUsage(instruction.select, scope, usage, callbacks);
        visitInstructionsForBindingUsage(instruction.body, scope, usage, callbacks);
        break;
      case "variable": {
        if (instruction.select !== void 0) {
          visitXPathForBindingUsage(instruction.select, scope, usage, callbacks);
        }
        if (instruction.body !== void 0) {
          visitInstructionsForBindingUsage(instruction.body, scope, usage, callbacks);
        }
        const id = usage.nextLocalVariableId;
        usage.nextLocalVariableId += 1;
        usage.localVariables.push({ id, instruction });
        scope = extendScope(scope, instruction.name, { kind: "localVariable", id });
        break;
      }
      case "callTemplate":
        visitWithParamsForBindingUsage(instruction.withParams, scope, usage, callbacks);
        callbacks.onCallTemplate?.(instruction.name);
        break;
      case "applyTemplates":
        if (instruction.select !== void 0) {
          visitXPathForBindingUsage(instruction.select, scope, usage, callbacks);
        }
        visitWithParamsForBindingUsage(instruction.withParams, scope, usage, callbacks);
        break;
      case "valueOf":
        visitXPathForBindingUsage(instruction.select, scope, usage, callbacks);
        break;
      default:
        break;
    }
  }
}
function visitWithParamsForBindingUsage(withParams, scope, usage, callbacks) {
  for (const withParam of withParams) {
    if (withParam.select !== void 0) {
      visitXPathForBindingUsage(withParam.select, scope, usage, callbacks);
    }
    if (withParam.body !== void 0) {
      visitInstructionsForBindingUsage(withParam.body, scope, usage, callbacks);
    }
  }
}
function visitXPathForBindingUsage(expression, scope, usage, callbacks) {
  switch (expression.kind) {
    case "array":
      for (const member of expression.members) {
        visitXPathForBindingUsage(member, scope, usage, callbacks);
      }
      break;
    case "binary":
      visitXPathForBindingUsage(expression.left, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.right, scope, usage, callbacks);
      break;
    case "filter":
      visitXPathForBindingUsage(expression.base, scope, usage, callbacks);
      for (const predicate of expression.predicates) {
        visitXPathForBindingUsage(predicate, scope, usage, callbacks);
      }
      break;
    case "functionCall":
      for (const argument of expression.arguments) {
        visitXPathForBindingUsage(argument, scope, usage, callbacks);
      }
      break;
    case "if":
      visitXPathForBindingUsage(expression.test, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.thenBranch, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.elseBranch, scope, usage, callbacks);
      break;
    case "let": {
      const letScope = visitScopedBindings(expression.bindings, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.returnExpr, letScope, usage, callbacks);
      break;
    }
    case "for": {
      const forScope = visitScopedBindings(expression.bindings, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.returnExpr, forScope, usage, callbacks);
      break;
    }
    case "quantified": {
      const quantifiedScope = visitScopedBindings(expression.bindings, scope, usage, callbacks);
      visitXPathForBindingUsage(expression.satisfiesExpr, quantifiedScope, usage, callbacks);
      break;
    }
    case "path":
      if (expression.base !== void 0) {
        visitXPathForBindingUsage(expression.base, scope, usage, callbacks);
      }
      for (const step of expression.steps) {
        if (step.kind === "step") {
          for (const predicate of step.predicates) {
            visitXPathForBindingUsage(predicate, scope, usage, callbacks);
          }
        } else {
          visitXPathForBindingUsage(step, scope, usage, callbacks);
        }
      }
      break;
    case "sequence":
      for (const item of expression.items) {
        visitXPathForBindingUsage(item, scope, usage, callbacks);
      }
      break;
    case "unary":
      visitXPathForBindingUsage(expression.operand, scope, usage, callbacks);
      break;
    case "variable": {
      const binding = scope.get(expression.name);
      if (binding?.kind === "templateParam") {
        usage.usedTemplateParamNames.add(binding.name);
      }
      if (binding?.kind === "localVariable") {
        usage.usedLocalVariableIds.add(binding.id);
      }
      if (binding === void 0) {
        callbacks.onUnresolvedVariableReference?.(expression.name);
      }
      break;
    }
    default:
      break;
  }
}
function visitScopedBindings(bindings, initialScope, usage, callbacks) {
  let scope = initialScope;
  for (const binding of bindings) {
    visitXPathForBindingUsage(binding.value, scope, usage, callbacks);
    scope = extendScope(scope, binding.name, { kind: "xpathVariable" });
  }
  return scope;
}
function extendScope(scope, name, binding) {
  return new Map(scope).set(name, binding);
}
function createUnusedNamedTemplateDiagnostic(template) {
  const primary = toSourceSpan2(template.location);
  const frame = createTemplateFrame(template, primary);
  return createAnalysisWarning({
    code: "WEAVER_ANALYZE_UNUSED_TEMPLATE",
    message: `Named template ${template.name ?? "<anonymous>"} is never called from any matched template.`,
    primary,
    frames: frame === void 0 ? [] : [frame],
    details: template.name === void 0 ? [] : [{ key: "templateName", value: template.name }],
    suggestions: [{
      kind: "hint",
      label: "remove the template or add an xsl:call-template that reaches it from a matched template",
      confidence: 1
    }]
  });
}
function createUnusedTemplateParamDiagnostic(template, param) {
  const primary = toSourceSpan2(param.location);
  const frame = createTemplateFrame(template, primary);
  return createAnalysisWarning({
    code: "WEAVER_ANALYZE_UNUSED_TEMPLATE_PARAM",
    message: `Template parameter ${param.name} is never referenced within its template.`,
    primary,
    frames: frame === void 0 ? [] : [frame],
    details: [{ key: "paramName", value: param.name }],
    suggestions: [{
      kind: "hint",
      label: `remove the parameter or reference $${param.name} from the template body or parameter defaults`,
      confidence: 1
    }]
  });
}
function createUnusedLocalVariableDiagnostic(template, variable) {
  const primary = toSourceSpan2(variable.location);
  const frame = createTemplateFrame(template, primary);
  return createAnalysisWarning({
    code: "WEAVER_ANALYZE_UNUSED_VARIABLE",
    message: `Local variable ${variable.name} is never referenced within its scope.`,
    primary,
    frames: frame === void 0 ? [] : [frame],
    details: [{ key: "variableName", value: variable.name }],
    suggestions: [{
      kind: "hint",
      label: `remove the variable or reference $${variable.name} later in the same scope`,
      confidence: 1
    }]
  });
}
function createUnusedGlobalParamDiagnostic(binding) {
  const primary = toSourceSpan2(binding.location);
  const frame = createGlobalBindingFrame(binding, primary);
  return createAnalysisWarning({
    code: "WEAVER_ANALYZE_UNUSED_GLOBAL_PARAM",
    message: `Stylesheet parameter ${binding.name} is never referenced from any reachable template or global binding.`,
    primary,
    frames: frame === void 0 ? [] : [frame],
    details: [{ key: "paramName", value: binding.name }],
    suggestions: [{
      kind: "hint",
      label: `remove the stylesheet parameter or reference $${binding.name} from a reachable template or global binding`,
      confidence: 1
    }]
  });
}
function createUnusedGlobalVariableDiagnostic(binding) {
  const primary = toSourceSpan2(binding.location);
  const frame = createGlobalBindingFrame(binding, primary);
  return createAnalysisWarning({
    code: "WEAVER_ANALYZE_UNUSED_GLOBAL_VARIABLE",
    message: `Stylesheet variable ${binding.name} is never referenced from any reachable template or global binding.`,
    primary,
    frames: frame === void 0 ? [] : [frame],
    details: [{ key: "variableName", value: binding.name }],
    suggestions: [{
      kind: "hint",
      label: `remove the stylesheet variable or reference $${binding.name} from a reachable template or global binding`,
      confidence: 1
    }]
  });
}
function createTemplatePriorityConflictDiagnostic(template, earlierTemplate, priority) {
  const primary = toSourceSpan2(template.location);
  const frame = createTemplateFrame(template, primary);
  const earlierSpan = toSourceSpan2(earlierTemplate.location);
  const earlierPriority = getTemplateEffectivePriority(earlierTemplate);
  const earlierRelatedLabel = createEarlierTemplateRelatedLabel("earlier overlapping template", earlierTemplate);
  return createAnalysisWarning({
    code: "WEAVER_ANALYZE_PRIORITY_CONFLICT",
    message: `Template match ${JSON.stringify(template.matchText ?? "<unknown>")} has the same effective priority ${priority} as an earlier overlapping template; declaration order decides which one wins.`,
    related: earlierSpan === void 0 ? [] : [{ label: earlierRelatedLabel, span: earlierSpan }],
    primary,
    frames: frame === void 0 ? [] : [frame],
    details: [
      ...template.matchText === void 0 ? [] : [{ key: "matchPattern", value: template.matchText }],
      { key: "priority", value: priority },
      ...earlierTemplate.matchText === void 0 ? [] : [{ key: "earlierMatchPattern", value: earlierTemplate.matchText }],
      { key: "earlierPriority", value: earlierPriority }
    ],
    suggestions: [{
      kind: "hint",
      label: "set an explicit priority or narrow one of the overlapping match patterns",
      confidence: 1
    }]
  });
}
function createUnreachableTemplateMatchDiagnostic(template, shadowingTemplate, priority) {
  const primary = toSourceSpan2(template.location);
  const frame = createTemplateFrame(template, primary);
  const shadowingSpan = toSourceSpan2(shadowingTemplate.location);
  const shadowingPriority = getTemplateEffectivePriority(shadowingTemplate);
  const shadowingRelatedLabel = createEarlierTemplateRelatedLabel("shadowing template", shadowingTemplate);
  return createAnalysisWarning({
    code: "WEAVER_ANALYZE_UNREACHABLE_TEMPLATE_MATCH",
    message: `Template match ${JSON.stringify(template.matchText ?? "<unknown>")} is unreachable because an earlier overlapping template has higher effective priority ${shadowingPriority}.`,
    related: shadowingSpan === void 0 ? [] : [{ label: shadowingRelatedLabel, span: shadowingSpan }],
    primary,
    frames: frame === void 0 ? [] : [frame],
    details: [
      ...template.matchText === void 0 ? [] : [{ key: "matchPattern", value: template.matchText }],
      { key: "priority", value: priority },
      ...shadowingTemplate.matchText === void 0 ? [] : [{ key: "shadowingMatchPattern", value: shadowingTemplate.matchText }],
      { key: "shadowingPriority", value: shadowingPriority }
    ],
    suggestions: [{
      kind: "hint",
      label: "raise the template priority or narrow the earlier overlapping match pattern",
      confidence: 1
    }]
  });
}
function createAnalysisWarning(report) {
  const normalizedReport = {
    code: report.code,
    phase: "compile",
    severity: "warning",
    category: "analysis",
    message: report.message,
    ...report.primary === void 0 ? {} : { primary: report.primary },
    related: report.related ?? [],
    frames: report.frames,
    details: report.details,
    suggestions: report.suggestions,
    causes: []
  };
  assertValidDiagnostic(normalizedReport);
  return normalizedReport;
}
function collectSampleDocumentNameDiagnostics(ir, sampleDocument) {
  if (sampleDocument === void 0) {
    return [];
  }
  const sampleNames = collectSampleDocumentNames(sampleDocument);
  if (sampleNames.elementNames.size === 0 && sampleNames.attributeNames.size === 0) {
    return [];
  }
  const reports = [];
  for (const context of collectXPathExpressionContexts(ir)) {
    visitXPathForSampleDocumentTypos(context.expression, (step) => {
      const report = createSampleDocumentNameDiagnostic(step, context, sampleNames, ir);
      if (report !== void 0) {
        reports.push(report);
      }
    });
  }
  return reports;
}
function collectSampleDocumentNames(sampleDocument) {
  const document = parseXml(sampleDocument, { role: "source-document", sourceName: "<sample-document>" });
  const elementNames = /* @__PURE__ */ new Map();
  const attributeNames = /* @__PURE__ */ new Map();
  const visitElement = (element) => {
    const elementName = element.localName ?? element.nodeName;
    if (elementName.length > 0) {
      addSampleDocumentName(elementNames, element.namespaceURI ?? "", elementName);
    }
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index);
      const attributeName = attribute?.localName ?? attribute?.nodeName;
      if (attributeName !== void 0 && attributeName.length > 0 && attributeName !== "xmlns" && attribute?.prefix !== "xmlns") {
        addSampleDocumentName(attributeNames, attribute?.namespaceURI ?? "", attributeName);
      }
    }
    for (let index = 0; index < element.childNodes.length; index += 1) {
      const child = element.childNodes.item(index);
      if (child?.nodeType === 1) {
        visitElement(child);
      }
    }
  };
  const root = document.documentElement;
  if (root !== null) {
    visitElement(root);
  }
  return {
    elementNames,
    attributeNames
  };
}
function addSampleDocumentName(namesByNamespace, namespaceUri, localName) {
  const names = namesByNamespace.get(namespaceUri);
  if (names !== void 0) {
    names.add(localName);
    return;
  }
  namesByNamespace.set(namespaceUri, /* @__PURE__ */ new Set([localName]));
}
function collectXPathExpressionContexts(ir) {
  const contexts = [];
  const pushContext = (expression, expressionText, expressionLocation, ownerName, attributeName, frameKind) => {
    if (expression === void 0 || expressionText === void 0) {
      return;
    }
    contexts.push({
      expression,
      expressionText,
      expressionLocation,
      ownerName,
      attributeName,
      ...frameKind === void 0 ? {} : { frameKind }
    });
  };
  const visitInstructions = (instructions) => {
    for (const instruction of instructions) {
      switch (instruction.kind) {
        case "literalElement":
        case "comment":
          visitInstructions(instruction.body);
          break;
        case "if":
          pushContext(instruction.test, instruction.testText, instruction.location, "xsl:if", "test");
          visitInstructions(instruction.body);
          break;
        case "choose":
          for (const branch of instruction.whenBranches) {
            pushContext(branch.test, branch.testText, branch.location, "xsl:when", "test");
            visitInstructions(branch.body);
          }
          if (instruction.otherwiseBody !== void 0) {
            visitInstructions(instruction.otherwiseBody);
          }
          break;
        case "forEach":
          pushContext(instruction.select, instruction.selectText, instruction.location, "xsl:for-each", "select");
          visitInstructions(instruction.body);
          break;
        case "variable":
          pushContext(instruction.select, instruction.selectText, instruction.location, "xsl:variable", "select");
          if (instruction.body !== void 0) {
            visitInstructions(instruction.body);
          }
          break;
        case "callTemplate":
          visitWithParams(instruction.withParams);
          break;
        case "applyTemplates":
          pushContext(instruction.select, instruction.selectText, instruction.location, "xsl:apply-templates", "select");
          visitWithParams(instruction.withParams);
          break;
        case "valueOf":
          pushContext(instruction.select, instruction.selectText, instruction.location, "xsl:value-of", "select");
          break;
        default:
          break;
      }
    }
  };
  const visitWithParams = (withParams) => {
    for (const withParam of withParams) {
      pushContext(withParam.select, withParam.selectText, withParam.location, "xsl:with-param", "select");
      if (withParam.body !== void 0) {
        visitInstructions(withParam.body);
      }
    }
  };
  for (const binding of ir.globalBindings) {
    pushContext(binding.select, binding.selectText, binding.location, `xsl:${binding.kind}`, "select");
    if (binding.body !== void 0) {
      visitInstructions(binding.body);
    }
  }
  for (const template of ir.templates) {
    pushContext(template.match, template.matchText, template.location, "xsl:template", "match", "template");
    for (const param of template.params) {
      pushContext(param.select, param.selectText, param.location, "xsl:param", "select");
      if (param.body !== void 0) {
        visitInstructions(param.body);
      }
    }
    visitInstructions(template.body);
  }
  return contexts;
}
function visitXPathForSampleDocumentTypos(expression, onStep) {
  switch (expression.kind) {
    case "array":
      for (const member of expression.members) {
        visitXPathForSampleDocumentTypos(member, onStep);
      }
      break;
    case "binary":
      visitXPathForSampleDocumentTypos(expression.left, onStep);
      visitXPathForSampleDocumentTypos(expression.right, onStep);
      break;
    case "filter":
      visitXPathForSampleDocumentTypos(expression.base, onStep);
      for (const predicate of expression.predicates) {
        visitXPathForSampleDocumentTypos(predicate, onStep);
      }
      break;
    case "functionCall":
      for (const argument of expression.arguments) {
        visitXPathForSampleDocumentTypos(argument, onStep);
      }
      break;
    case "if":
      visitXPathForSampleDocumentTypos(expression.test, onStep);
      visitXPathForSampleDocumentTypos(expression.thenBranch, onStep);
      visitXPathForSampleDocumentTypos(expression.elseBranch, onStep);
      break;
    case "let":
    case "for":
      for (const binding of expression.bindings) {
        visitXPathForSampleDocumentTypos(binding.value, onStep);
      }
      visitXPathForSampleDocumentTypos(expression.returnExpr, onStep);
      break;
    case "quantified":
      for (const binding of expression.bindings) {
        visitXPathForSampleDocumentTypos(binding.value, onStep);
      }
      visitXPathForSampleDocumentTypos(expression.satisfiesExpr, onStep);
      break;
    case "path":
      if (expression.base !== void 0) {
        visitXPathForSampleDocumentTypos(expression.base, onStep);
      }
      for (const step of expression.steps) {
        if (step.kind === "step") {
          onStep(step);
          for (const predicate of step.predicates) {
            visitXPathForSampleDocumentTypos(predicate, onStep);
          }
        } else {
          visitXPathForSampleDocumentTypos(step, onStep);
        }
      }
      break;
    case "sequence":
      for (const item of expression.items) {
        visitXPathForSampleDocumentTypos(item, onStep);
      }
      break;
    case "unary":
      visitXPathForSampleDocumentTypos(expression.operand, onStep);
      break;
    default:
      break;
  }
}
function createSampleDocumentNameDiagnostic(step, context, sampleDocument, ir) {
  if (step.nodeTest.kind !== "nameTest") {
    return void 0;
  }
  const nameInfo = resolveNameTestForSample(step.nodeTest.name, step.axis, ir);
  if (nameInfo === void 0) {
    return void 0;
  }
  const candidateNames = getSampleDocumentCandidateNames(step.axis, nameInfo.namespaceUri, sampleDocument);
  if (candidateNames === void 0) {
    return void 0;
  }
  if (candidateNames.has(nameInfo.localName)) {
    return void 0;
  }
  const nearest = [...candidateNames].map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(nameInfo.localName, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  const suggestedName = `${nameInfo.prefix}${nearest.candidate}`;
  const primary = mapXPathSpanToSourceSpan(context.expressionLocation, step.nodeTest.span);
  const frame = createXPathExpressionFrame(context, primary);
  const kindLabel = step.axis === "attribute" ? "attribute" : "element";
  return createAnalysisWarning({
    code: step.axis === "attribute" ? "WEAVER_ANALYZE_UNKNOWN_SAMPLE_ATTRIBUTE_NAME" : "WEAVER_ANALYZE_UNKNOWN_SAMPLE_ELEMENT_NAME",
    message: `XPath ${kindLabel} name test ${JSON.stringify(step.nodeTest.name)} does not appear in the supplied sample document.`,
    primary,
    frames: frame === void 0 ? [] : [frame],
    details: [
      { key: "nameTest", value: step.nodeTest.name },
      { key: "suggestedName", value: suggestedName }
    ],
    suggestions: [{
      kind: "fix",
      label: `did you mean ${JSON.stringify(suggestedName)}?`,
      replacement: suggestedName,
      confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / suggestedName.length
    }]
  });
}
function getSampleDocumentCandidateNames(axis, namespaceUri, sampleDocument) {
  const namesByNamespace = axis === "attribute" ? sampleDocument.attributeNames : sampleDocument.elementNames;
  return namesByNamespace.get(namespaceUri);
}
function resolveNameTestForSample(name, axis, ir) {
  if (name.startsWith("Q{")) {
    const endBrace = name.indexOf("}");
    if (endBrace >= 0) {
      return {
        prefix: name.slice(0, endBrace + 1),
        localName: name.slice(endBrace + 1),
        namespaceUri: name.slice(2, endBrace)
      };
    }
  }
  const separator = name.indexOf(":");
  if (separator < 0) {
    return {
      prefix: "",
      localName: name,
      namespaceUri: axis === "attribute" ? "" : ir.defaultElementNamespace
    };
  }
  const prefix = name.slice(0, separator);
  const namespaceUri = resolveSampleNameNamespacePrefix(prefix, ir);
  if (namespaceUri === void 0) {
    return void 0;
  }
  return {
    prefix: `${prefix}:`,
    localName: name.slice(separator + 1),
    namespaceUri
  };
}
function resolveSampleNameNamespacePrefix(prefix, ir) {
  if (prefix === "xml") {
    return "http://www.w3.org/XML/1998/namespace";
  }
  return ir.namespaces[prefix];
}
function mapXPathSpanToSourceSpan(location, span) {
  if (location?.line === void 0 || location.column === void 0 || location.offset === void 0) {
    return void 0;
  }
  return {
    ...location.source === void 0 ? {} : { uri: location.source },
    offsetStart: location.offset + span.start,
    offsetEnd: location.offset + span.end,
    lineStart: location.line + span.line - 1,
    columnStart: span.line === 1 ? location.column + span.column - 1 : span.column,
    lineEnd: location.line + span.endLine - 1,
    columnEnd: span.endLine === 1 ? location.column + span.endColumn - 1 : span.endColumn
  };
}
function createXPathExpressionFrame(context, primary) {
  const label = context.frameKind === "template" ? `${context.attributeName}=${JSON.stringify(context.expressionText)}` : `${context.ownerName} ${context.attributeName}=${JSON.stringify(context.expressionText)}`;
  return primary === void 0 ? { kind: context.frameKind ?? "instruction", label } : { kind: context.frameKind ?? "instruction", label, span: primary };
}
function createTemplateFrame(template, primary) {
  const label = template.name ?? template.matchText;
  if (label === void 0) {
    return void 0;
  }
  return primary === void 0 ? { kind: "template", label } : { kind: "template", label, span: primary };
}
function createGlobalBindingFrame(binding, primary) {
  const label = `xsl:${binding.kind} name="${binding.name}"`;
  return primary === void 0 ? { kind: "instruction", label } : { kind: "instruction", label, span: primary };
}
function createEarlierTemplateRelatedLabel(prefix, template) {
  return template.matchText === void 0 ? prefix : `${prefix} match=${JSON.stringify(template.matchText)}`;
}
function toSourceSpan2(location) {
  if (location?.line === void 0 || location.column === void 0 || location.offset === void 0) {
    return void 0;
  }
  return {
    ...location.source !== void 0 ? { uri: location.source } : {},
    offsetStart: location.offset,
    offsetEnd: location.endOffset ?? location.offset + 1,
    lineStart: location.line,
    columnStart: location.column,
    lineEnd: location.endLine ?? location.line,
    columnEnd: location.endColumn ?? location.column + 1
  };
}

// src/xslt/compile/ir.ts
var STYLESHEET_IR_VERSION = "1.0";

// src/xslt/compile/xsltElementHelpers.ts
var XSLT_NAMESPACE = "http://www.w3.org/1999/XSL/Transform";
function isXsltElement(element, localName) {
  return element.namespaceURI === XSLT_NAMESPACE && (element.localName ?? element.nodeName) === localName;
}
function hasMeaningfulTemplateContent(element) {
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes.item(index);
    if (node === null) {
      continue;
    }
    if (node.nodeType === node.ELEMENT_NODE) {
      return true;
    }
    if ((node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) && (node.nodeValue ?? "").trim().length > 0) {
      return true;
    }
  }
  return false;
}
function childElements(element) {
  const children = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (child !== null && child.nodeType === child.ELEMENT_NODE) {
      children.push(child);
    }
  }
  return children;
}
function descendantElements(element) {
  const descendants = [];
  for (const child of childElements(element)) {
    descendants.push(child);
    descendants.push(...descendantElements(child));
  }
  return descendants;
}
function leadingTemplateParamElements(templateElement) {
  const params = [];
  for (let index = 0; index < templateElement.childNodes.length; index += 1) {
    const node = templateElement.childNodes.item(index);
    if (node === null) {
      continue;
    }
    if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) {
      if ((node.nodeValue ?? "").trim().length === 0) {
        continue;
      }
      break;
    }
    if (node.nodeType !== node.ELEMENT_NODE) {
      continue;
    }
    const element = node;
    if (!isXsltElement(element, "param")) {
      break;
    }
    params.push(element);
  }
  return params;
}
function parseRequiredAttribute(element) {
  return parseBooleanFlagAttribute(element, "required");
}
function isTunnelParamElement(element) {
  return parseBooleanFlagAttribute(element, "tunnel");
}
function parseBooleanFlagAttribute(element, attributeName) {
  const rawValue = element.getAttribute(attributeName);
  if (rawValue === null) {
    return false;
  }
  const normalized = rawValue.trim().toLowerCase();
  return normalized === "yes" || normalized === "true" || normalized === "1";
}

// src/xslt/compile/compilerSupport.ts
var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
var STYLESHEET_SOURCE_NAME = "<stylesheet>";
var SUPPORTED_XSLT_INSTRUCTION_NAMES = ["apply-templates", "call-template", "choose", "comment", "for-each", "if", "otherwise", "text", "value-of", "variable", "when"];
function assertNoSelectAndContent(element, stylesheetXml, select, ownerName, detailKey, bindingName) {
  if (select === void 0 || !hasMeaningfulTemplateContent(element)) {
    return;
  }
  throw createXsltStaticError(
    `${ownerName} cannot specify both a select attribute and a sequence constructor.`,
    getAttributeValueSourceLocation(stylesheetXml, element, "select", STYLESHEET_SOURCE_NAME) ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    {
      [detailKey]: bindingName
    },
    {
      suggestions: [{
        kind: "fix",
        label: `remove select="..." or remove ${ownerName} content`,
        confidence: 1
      }]
    },
    XTSE0620
  );
}
function assertAllowedXsltAttributes(element, stylesheetXml, instructionName, allowedAttributeNames) {
  const allowed = new Set(allowedAttributeNames);
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute === null) {
      continue;
    }
    if (attribute.prefix === "xmlns" || attribute.nodeName === "xmlns" || attribute.namespaceURI === XMLNS_NAMESPACE) {
      continue;
    }
    const attributeName = attribute.nodeName;
    const localName = attribute.localName ?? attributeName;
    if (attribute.namespaceURI === XSLT_NAMESPACE) {
      throw createXsltStaticError(
        `${instructionName} cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, STYLESHEET_SOURCE_NAME) ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
        {
          attributeName,
          instructionName
        },
        {
          suggestions: [{
            kind: "fix",
            label: `remove ${attributeName} from ${instructionName}`,
            confidence: 1
          }]
        },
        XTSE0090
      );
    }
    if ((attribute.namespaceURI === null || attribute.namespaceURI.length === 0) && !allowed.has(localName)) {
      const suggestion = createAttributeSuggestion(localName, allowedAttributeNames);
      throw createXsltStaticError(
        `${instructionName} has an unsupported attribute ${attributeName}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, STYLESHEET_SOURCE_NAME) ?? getNodeSourceLocation(stylesheetXml, attribute, STYLESHEET_SOURCE_NAME),
        {
          attributeName,
          instructionName
        },
        suggestion === void 0 ? {
          suggestions: [{
            kind: "fix",
            label: `remove ${attributeName} from ${instructionName}`,
            confidence: 1
          }]
        } : { suggestions: [suggestion] },
        XTSE0090
      );
    }
  }
}
function createAttributeSuggestion(rawName, allowedAttributeNames) {
  const nearest = allowedAttributeNames.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(rawName, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean ${nearest.candidate}="..."?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length
  };
}
function assertNoDuplicateWithParam(existingParams, withParam, stylesheetXml, element, parentInstructionName) {
  if (!existingParams.some((existing) => existing.name === withParam.name)) {
    return;
  }
  throw createXsltStaticError(
    `${parentInstructionName} cannot declare duplicate xsl:with-param name ${withParam.name}.`,
    withParam.location ?? getAttributeValueSourceLocation(stylesheetXml, element, "name", STYLESHEET_SOURCE_NAME) ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
    {
      paramName: withParam.name
    },
    {
      suggestions: [{
        kind: "fix",
        label: `rename or remove one of the duplicate xsl:with-param declarations for ${withParam.name}`,
        confidence: 1
      }]
    },
    XTSE0670
  );
}
function createInstructionSuggestion(element) {
  const localName = element.localName ?? element.nodeName;
  const nearest = SUPPORTED_XSLT_INSTRUCTION_NAMES.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(localName, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean xsl:${nearest.candidate}?`,
    replacement: `xsl:${nearest.candidate}`,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length
  };
}
function createXsltStaticError(message, location, detailsOrContext, contextOrCode, maybeCode) {
  const details = isErrorContext(detailsOrContext) ? void 0 : detailsOrContext;
  const context = isErrorContext(detailsOrContext) ? detailsOrContext : isErrorContext(contextOrCode) ? contextOrCode : void 0;
  const code = typeof contextOrCode === "string" ? contextOrCode : maybeCode ?? XTSE0010;
  return new XsltError(code, message, location, details, context);
}
function isErrorContext(value) {
  return typeof value === "object" && value !== null && ("related" in value || "frames" in value || "suggestions" in value || "causes" in value);
}

// src/xpath/eval/arityValidation.ts
var EXACT_ARITY_NAMES = /* @__PURE__ */ new Map([
  ["0", ["fn:position", "fn:last", "fn:error", "fn:true", "fn:false"]],
  ["1", [
    "fn:count",
    "fn:exists",
    "fn:empty",
    "fn:exactly-one",
    "fn:one-or-more",
    "fn:zero-or-one",
    "fn:boolean",
    "fn:not",
    "fn:codepoints-to-string",
    "fn:upper-case",
    "fn:lower-case",
    "fn:min",
    "fn:max",
    "fn:avg",
    "fn:distinct-values",
    "fn:data",
    "fn:reverse",
    "fn:head",
    "fn:tail"
  ]],
  ["2", ["fn:deep-equal", "fn:QName", "fn:trace", "map:entry", "fn:remove", "fn:contains", "fn:starts-with", "fn:ends-with"]],
  ["3", ["fn:translate"]]
]);
var RANGE_ARITY_NAMES = /* @__PURE__ */ new Map([
  [">=2", ["fn:concat"]],
  ["0..1", ["fn:string", "fn:string-length", "fn:normalize-space", "fn:number", "fn:name", "fn:local-name", "fn:namespace-uri", "fn:generate-id", "fn:node-name", "fn:root"]],
  ["1..2", ["fn:string-join", "fn:sum"]],
  ["1..3", ["fn:tokenize"]],
  ["2..3", ["fn:substring", "fn:subsequence", "fn:matches"]],
  ["3..4", ["fn:replace"]]
]);
var FUNCTION_ARITY_REQUIREMENTS = /* @__PURE__ */ new Map();
for (const [requirement, names] of EXACT_ARITY_NAMES) {
  for (const name of names) {
    FUNCTION_ARITY_REQUIREMENTS.set(name, requirement);
  }
}
for (const [requirement, names] of RANGE_ARITY_NAMES) {
  for (const name of names) {
    FUNCTION_ARITY_REQUIREMENTS.set(name, requirement);
  }
}
function createArityValidationHelpers(createXPathError2) {
  function requireArity2(name, args, expected, span) {
    if (args.length !== expected) {
      throwArityError2(name, args.length, String(expected), span);
    }
  }
  function validateFunctionCallSignature2(name, actualArity, span) {
    const arityRequirement = FUNCTION_ARITY_REQUIREMENTS.get(name);
    if (arityRequirement === void 0) {
      throw createXPathError2(XPST0017, `Unknown function ${name}.`, span, {
        functionName: name,
        actualArity
      }, createFunctionSuggestionContext(name));
    }
    if (!matchesArityRequirement(actualArity, arityRequirement)) {
      throwArityError2(name, actualArity, arityRequirement, span);
    }
  }
  function throwArityError2(name, actualArity, arityRequirement, span) {
    const requirementLabel = arityRequirement.includes("..") ? arityRequirement.replace("..", " or ") : arityRequirement === ">=2" ? "at least 2" : arityRequirement;
    throw createXPathError2(XPST0017, `Function ${name} expects ${requirementLabel} arguments but got ${actualArity}.`, span, {
      functionName: name,
      actualArity,
      arityRequirement
    });
  }
  return {
    requireArity: requireArity2,
    validateFunctionCallSignature: validateFunctionCallSignature2,
    throwArityError: throwArityError2
  };
}
function lookupFunctionArityRequirement(name) {
  return FUNCTION_ARITY_REQUIREMENTS.get(name);
}
function listKnownFunctionNames() {
  return [...FUNCTION_ARITY_REQUIREMENTS.keys()];
}
function createFunctionNameSuggestion(name) {
  const candidatePrefix = name.startsWith("map:") ? "map:" : "fn:";
  const hasExplicitPrefix = name.includes(":");
  const displayName = hasExplicitPrefix ? name : candidatePrefix === "fn:" ? name : `${candidatePrefix}${name}`;
  const nearest = listKnownFunctionNames().filter((candidate) => candidate.startsWith(candidatePrefix)).map((candidate) => {
    const displayCandidate = hasExplicitPrefix || candidatePrefix !== "fn:" ? candidate : candidate.slice(3);
    return {
      displayCandidate,
      distance: computeLevenshteinDistance2(displayName, displayCandidate)
    };
  }).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean ${nearest.displayCandidate}(...)?`,
    replacement: nearest.displayCandidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.displayCandidate.length
  };
}
function createFunctionSuggestionContext(name) {
  const suggestion = createFunctionNameSuggestion(name);
  return suggestion === void 0 ? void 0 : { suggestions: [suggestion] };
}
function computeLevenshteinDistance2(left, right) {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0] ?? 0;
    previousRow[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const temp = previousRow[rightIndex] ?? 0;
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previousRow[rightIndex] = Math.min(
        (previousRow[rightIndex] ?? 0) + 1,
        (previousRow[rightIndex - 1] ?? 0) + 1,
        previousDiagonal + substitutionCost
      );
      previousDiagonal = temp;
    }
  }
  return previousRow[right.length] ?? right.length;
}
function matchesArityRequirement(actualArity, arityRequirement) {
  switch (arityRequirement) {
    case "0":
    case "1":
    case "2":
    case "3":
      return actualArity === Number(arityRequirement);
    case ">=2":
      return actualArity >= 2;
    case "0..1":
      return actualArity === 0 || actualArity === 1;
    case "1..2":
      return actualArity === 1 || actualArity === 2;
    case "1..3":
      return actualArity === 1 || actualArity === 2 || actualArity === 3;
    case "2..3":
      return actualArity === 2 || actualArity === 3;
    case "3..4":
      return actualArity === 3 || actualArity === 4;
    default:
      return false;
  }
}

// src/xslt/compile/extensionFunctions.ts
var PREDEFINED_NAMESPACE_PREFIXES = /* @__PURE__ */ new Map([
  ["array", "http://www.w3.org/2005/xpath-functions/array"],
  ["fn", "http://www.w3.org/2005/xpath-functions"],
  ["map", "http://www.w3.org/2005/xpath-functions/map"],
  ["math", "http://www.w3.org/2005/xpath-functions/math"],
  ["xml", "http://www.w3.org/XML/1998/namespace"],
  ["xs", "http://www.w3.org/2001/XMLSchema"]
]);
function validateXPathFunctionCalls(ast, options) {
  walkXPathAst(ast, options);
}
function walkXPathAst(ast, options) {
  switch (ast.kind) {
    case "array":
      for (const member of ast.members) {
        walkXPathAst(member, options);
      }
      return;
    case "binary":
      walkXPathAst(ast.left, options);
      walkXPathAst(ast.right, options);
      return;
    case "contextItem":
    case "number":
    case "string":
    case "variable":
      return;
    case "filter":
      walkFilterExpression(ast, options);
      return;
    case "for":
      walkForExpression(ast, options);
      return;
    case "functionCall":
      validateFunctionCall(ast, options);
      for (const argument of ast.arguments) {
        walkXPathAst(argument, options);
      }
      return;
    case "if":
      walkIfExpression(ast, options);
      return;
    case "let":
      walkLetExpression(ast, options);
      return;
    case "path":
      walkPathExpression(ast, options);
      return;
    case "quantified":
      walkQuantifiedExpression(ast, options);
      return;
    case "sequence":
      walkSequenceExpression(ast, options);
      return;
    case "unary":
      walkXPathAst(ast.operand, options);
      return;
  }
}
function walkFilterExpression(ast, options) {
  walkXPathAst(ast.base, options);
  for (const predicate of ast.predicates) {
    walkXPathAst(predicate, options);
  }
}
function walkForExpression(ast, options) {
  walkBindings(ast.bindings, options);
  walkXPathAst(ast.returnExpr, options);
}
function walkIfExpression(ast, options) {
  walkXPathAst(ast.test, options);
  walkXPathAst(ast.thenBranch, options);
  walkXPathAst(ast.elseBranch, options);
}
function walkLetExpression(ast, options) {
  walkBindings(ast.bindings, options);
  walkXPathAst(ast.returnExpr, options);
}
function walkQuantifiedExpression(ast, options) {
  walkBindings(ast.bindings, options);
  walkXPathAst(ast.satisfiesExpr, options);
}
function walkSequenceExpression(ast, options) {
  for (const item of ast.items) {
    walkXPathAst(item, options);
  }
}
function walkBindings(bindings, options) {
  for (const binding of bindings) {
    walkXPathAst(binding.value, options);
  }
}
function walkPathExpression(ast, options) {
  if (ast.base !== void 0) {
    walkXPathAst(ast.base, options);
  }
  for (const step of ast.steps) {
    if (step.kind === "step") {
      walkStepExpression(step, options);
      continue;
    }
    walkXPathAst(step, options);
  }
}
function walkStepExpression(step, options) {
  for (const predicate of step.predicates) {
    walkXPathAst(predicate, options);
  }
}
function validateFunctionCall(ast, options) {
  const resolved = resolveFunctionName(ast.callee, options);
  if (resolved.kind === "builtin") {
    const arityRequirement = lookupFunctionArityRequirement(resolved.name);
    if (arityRequirement === void 0) {
      const suggestion = createFunctionNameSuggestion2(ast.callee, resolved, options);
      throwFunctionValidationError(
        XPST0017,
        `Unknown function ${ast.callee} with arity ${ast.arguments.length}.`,
        ast.span,
        options,
        {
          functionName: ast.callee,
          actualArity: ast.arguments.length
        },
        suggestion
      );
    }
    if (!matchesArityRequirement(ast.arguments.length, arityRequirement)) {
      throwFunctionValidationError(
        XPST0017,
        `Function ${ast.callee} expects ${formatArityRequirement(arityRequirement)} arguments but got ${ast.arguments.length}.`,
        ast.span,
        options,
        {
          functionName: ast.callee,
          actualArity: ast.arguments.length,
          arityRequirement
        }
      );
    }
    return;
  }
  const signature = options.extensionFunctions.get(resolved.normalizedName);
  if (signature === void 0) {
    const suggestion = createFunctionNameSuggestion2(ast.callee, resolved, options);
    throwFunctionValidationError(
      XPST0017,
      `Unknown function ${ast.callee} with arity ${ast.arguments.length}.`,
      ast.span,
      options,
      {
        functionName: ast.callee,
        actualArity: ast.arguments.length
      },
      suggestion
    );
  }
  if (ast.arguments.length < signature.minimumArity || signature.maximumArity !== void 0 && ast.arguments.length > signature.maximumArity) {
    const arityRequirement = signature.maximumArity === void 0 ? `>=${signature.minimumArity}` : signature.minimumArity === signature.maximumArity ? String(signature.minimumArity) : `${signature.minimumArity}..${signature.maximumArity}`;
    throwFunctionValidationError(
      XPST0017,
      `Function ${ast.callee} expects ${formatArityRequirement(arityRequirement)} arguments but got ${ast.arguments.length}.`,
      ast.span,
      options,
      {
        functionName: ast.callee,
        actualArity: ast.arguments.length,
        arityRequirement,
        signature: signature.signatureText
      }
    );
  }
  for (let index = 0; index < ast.arguments.length && index < signature.parameters.length; index += 1) {
    const parameter = signature.parameters[index];
    if (parameter.inferredTypes.length === 0 || parameter.inferredTypes.includes("unknown")) {
      continue;
    }
    const actualType = inferXPathAstType(ast.arguments[index]);
    if (actualType.kind === "unknown" || parameter.inferredTypes.includes(actualType.kind)) {
      continue;
    }
    throwFunctionValidationError(
      XPTY0004,
      `Extension function ${ast.callee} argument ${index + 1} expects ${parameter.typeText} but got ${actualType.display}.`,
      ast.arguments[index].span,
      options,
      {
        expectedType: parameter.typeText,
        actualType: actualType.display,
        functionName: ast.callee,
        signature: signature.signatureText,
        argumentPosition: index + 1
      }
    );
  }
}
function resolveFunctionName(callee, options) {
  if (!callee.includes(":")) {
    return { kind: "builtin", name: `fn:${callee}` };
  }
  const separator = callee.indexOf(":");
  const prefix = callee.slice(0, separator);
  const localName = callee.slice(separator + 1);
  if (prefix === "fn" || prefix === "map") {
    return { kind: "builtin", name: `${prefix}:${localName}` };
  }
  const namespaceUri = options.namespaces[prefix] ?? PREDEFINED_NAMESPACE_PREFIXES.get(prefix);
  if (namespaceUri === void 0) {
    throwFunctionValidationError(
      XPST0081,
      `Unknown namespace prefix ${JSON.stringify(prefix)} in function call ${callee}.`,
      createPrefixSpan(prefix),
      options,
      {
        namespacePrefix: prefix,
        qName: callee
      }
    );
  }
  return {
    kind: "extension",
    normalizedName: `{${namespaceUri}}${localName}`,
    prefix,
    namespaceUri
  };
}
function createFunctionNameSuggestion2(callee, resolved, options) {
  const candidateNames = resolved.kind === "builtin" ? listKnownFunctionNames().filter((name) => name.startsWith(resolved.name.startsWith("map:") ? "map:" : "fn:")) : [...options.extensionFunctions.values()].filter((signature) => signature.namespaceUri === resolved.namespaceUri).map((signature) => `${resolved.prefix}:${signature.localName}`);
  const nearest = candidateNames.map((candidateName) => {
    const displayCandidate = toSuggestedFunctionDisplayName(candidateName, callee, resolved.kind);
    return {
      candidateName,
      displayCandidate,
      distance: computeLevenshteinDistance(callee, displayCandidate)
    };
  }).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean ${nearest.displayCandidate}(...)?`,
    replacement: nearest.displayCandidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.displayCandidate.length
  };
}
function toSuggestedFunctionDisplayName(candidateName, callee, kind) {
  if (kind === "builtin" && !callee.includes(":") && candidateName.startsWith("fn:")) {
    return candidateName.slice(3);
  }
  return candidateName;
}
function inferXPathAstType(ast) {
  switch (ast.kind) {
    case "number":
      return { kind: "number", display: "number" };
    case "string":
      return { kind: "string", display: "string" };
    case "binary":
      if (ast.operator === "+" || ast.operator === "-" || ast.operator === "*" || ast.operator === "div" || ast.operator === "idiv" || ast.operator === "mod" || ast.operator === "to") {
        return { kind: "number", display: "number" };
      }
      if (ast.operator === "and" || ast.operator === "or" || ast.operator === "=" || ast.operator === "!=" || ast.operator === "<" || ast.operator === "<=" || ast.operator === ">" || ast.operator === ">=" || ast.operator === "eq" || ast.operator === "ne" || ast.operator === "lt" || ast.operator === "le" || ast.operator === "gt" || ast.operator === "ge" || ast.operator === "is" || ast.operator === "<<" || ast.operator === ">>") {
        return { kind: "boolean", display: "boolean" };
      }
      if (ast.operator === "||") {
        return { kind: "string", display: "string" };
      }
      return { kind: "unknown", display: "unknown" };
    case "functionCall": {
      const normalized = ast.callee.includes(":") ? ast.callee : `fn:${ast.callee}`;
      if (normalized === "fn:true" || normalized === "fn:false" || normalized === "fn:boolean" || normalized === "fn:not" || normalized === "fn:exists" || normalized === "fn:empty" || normalized === "fn:deep-equal") {
        return { kind: "boolean", display: "boolean" };
      }
      if (normalized === "fn:count" || normalized === "fn:last" || normalized === "fn:position" || normalized === "fn:string-length" || normalized === "fn:number" || normalized === "fn:sum" || normalized === "fn:min" || normalized === "fn:max" || normalized === "fn:avg") {
        return { kind: "number", display: "number" };
      }
      if (normalized === "fn:string" || normalized === "fn:normalize-space" || normalized === "fn:upper-case" || normalized === "fn:lower-case" || normalized === "fn:concat" || normalized === "fn:substring" || normalized === "fn:translate" || normalized === "fn:name" || normalized === "fn:local-name" || normalized === "fn:namespace-uri") {
        return { kind: "string", display: "string" };
      }
      return { kind: "unknown", display: "unknown" };
    }
    case "if": {
      const thenType = inferXPathAstType(ast.thenBranch);
      const elseType = inferXPathAstType(ast.elseBranch);
      return thenType.kind === elseType.kind ? thenType : { kind: "unknown", display: "unknown" };
    }
    case "unary":
      return { kind: "number", display: "number" };
    default:
      return { kind: "unknown", display: "unknown" };
  }
}
function throwFunctionValidationError(code, message, span, options, details, suggestion) {
  const primaryLocation = mapXPathSpanToSourceLocation(options.expressionLocation, span);
  const frameKind = options.frameKind ?? "instruction";
  const frameLabel = frameKind === "template" ? `${options.attributeName}="${options.expressionText}"` : `${options.ownerName} ${options.attributeName}="${options.expressionText}"`;
  throw createXsltStaticError(
    message,
    primaryLocation ?? options.expressionLocation,
    details,
    {
      frames: [{
        kind: frameKind,
        label: frameLabel,
        ...options.expressionLocation === void 0 ? {} : { location: options.expressionLocation }
      }],
      ...suggestion === void 0 ? {} : { suggestions: [suggestion] },
      ...primaryLocation !== void 0 && options.expressionLocation !== void 0 && primaryLocation.offset !== options.expressionLocation.offset ? {
        related: [{
          label: frameKind === "template" ? "containing template" : "containing instruction",
          location: options.expressionLocation
        }]
      } : {}
    },
    code
  );
}
function mapXPathSpanToSourceLocation(expressionLocation, span) {
  if (expressionLocation?.line === void 0 || expressionLocation.column === void 0 || expressionLocation.offset === void 0) {
    return void 0;
  }
  const source = expressionLocation.source;
  return {
    ...source === void 0 ? {} : { source },
    line: expressionLocation.line + span.line - 1,
    column: span.line === 1 ? expressionLocation.column + span.column - 1 : span.column,
    offset: expressionLocation.offset + span.start,
    endLine: expressionLocation.line + span.endLine - 1,
    endColumn: span.endLine === 1 ? expressionLocation.column + span.endColumn - 1 : span.endColumn,
    endOffset: expressionLocation.offset + span.end
  };
}
function formatArityRequirement(arityRequirement) {
  if (arityRequirement.includes("..")) {
    return arityRequirement.replace("..", " or ");
  }
  if (arityRequirement.startsWith(">=")) {
    return `at least ${arityRequirement.slice(2)}`;
  }
  return arityRequirement;
}
function createPrefixSpan(prefix) {
  return {
    start: 0,
    end: prefix.length,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: prefix.length + 1
  };
}

// src/xslt/compile/instructionCompilers.ts
function compileApplyTemplatesInstruction(element, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:apply-templates", ["mode", "select"]);
  const select = element.getAttribute("select") ?? void 0;
  const mode = element.getAttribute("mode");
  const withParams = [];
  const location = select === void 0 ? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName) : getAttributeValueSourceLocation(stylesheetXml, element, "select", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  if (mode !== null) {
    throw helpers.createXsltStaticError(
      "xsl:apply-templates mode is not yet implemented in the current MVP+3 slice.",
      getAttributeValueSourceLocation(stylesheetXml, element, "mode", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'remove mode="..." and use the default mode in the current MVP+3 slice',
          replacement: "mode",
          confidence: 1
        }]
      }
    );
  }
  for (const child of helpers.childElements(element)) {
    if (!helpers.isXsltElement(child, "with-param")) {
      throw helpers.createXsltStaticError(
        `xsl:apply-templates only supports xsl:with-param children; found ${child.nodeName}.`,
        getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
        {
          suggestions: [{
            kind: "fix",
            label: "replace the child with xsl:with-param or remove it from xsl:apply-templates",
            confidence: 1
          }]
        }
      );
    }
    const withParam = helpers.compileWithParam(child, stylesheetXml);
    helpers.assertNoDuplicateWithParam(withParams, withParam, stylesheetXml, child, "xsl:apply-templates");
    withParams.push(withParam);
  }
  return {
    kind: "applyTemplates",
    withParams,
    ...location === void 0 ? {} : { location },
    ...select === void 0 ? {} : { selectText: select },
    ...select === void 0 ? {} : { select: helpers.parseXPathInContext(select, location, "xsl:apply-templates", "select") }
  };
}
function compileCallTemplateInstruction(element, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:call-template", ["name"]);
  const rawName = element.getAttribute("name");
  if (rawName === null || rawName.length === 0) {
    throw helpers.createXsltStaticError(
      "xsl:call-template requires a name attribute.",
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'add a name="..." attribute to xsl:call-template',
          replacement: 'name="..."',
          confidence: 1
        }]
      }
    );
  }
  const withParams = [];
  for (const child of helpers.childElements(element)) {
    if (!helpers.isXsltElement(child, "with-param")) {
      throw helpers.createXsltStaticError(
        `xsl:call-template only supports xsl:with-param children; found ${child.nodeName}.`,
        getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
        {
          suggestions: [{
            kind: "fix",
            label: "replace the child with xsl:with-param or remove it from xsl:call-template",
            confidence: 1
          }]
        }
      );
    }
    const withParam = helpers.compileWithParam(child, stylesheetXml);
    helpers.assertNoDuplicateWithParam(withParams, withParam, stylesheetXml, child, "xsl:call-template");
    withParams.push(withParam);
  }
  const location = getAttributeValueSourceLocation(stylesheetXml, element, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const name = helpers.normalizeXsltQName(rawName, element, stylesheetXml, "name", "xsl:call-template");
  return {
    kind: "callTemplate",
    name,
    withParams,
    ...location === void 0 ? {} : { location }
  };
}
function compileVariableInstruction(element, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:variable", ["as", "name", "select"]);
  const rawName = element.getAttribute("name");
  if (rawName === null || rawName.length === 0) {
    throw helpers.createXsltStaticError(
      "xsl:variable requires a name attribute.",
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'add a name="..." attribute to xsl:variable',
          replacement: 'name="..."',
          confidence: 1
        }]
      }
    );
  }
  const select = element.getAttribute("select") ?? void 0;
  helpers.assertNoSelectAndContent(
    element,
    stylesheetXml,
    select,
    "xsl:variable",
    "variableName",
    rawName
  );
  const body = select === void 0 && helpers.hasMeaningfulTemplateContent(element) ? helpers.compileInstructions(element.childNodes, stylesheetXml) : void 0;
  const selectLocation = select === void 0 ? void 0 : getAttributeValueSourceLocation(stylesheetXml, element, "select", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const location = getAttributeValueSourceLocation(stylesheetXml, element, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const name = helpers.normalizeXsltQName(rawName, element, stylesheetXml, "name", "xsl:variable");
  return {
    kind: "variable",
    name,
    ...select === void 0 ? {} : { select: helpers.parseXPathInContext(select, selectLocation, "xsl:variable", "select") },
    ...select === void 0 ? {} : { selectText: select },
    ...body === void 0 ? {} : { body },
    ...location === void 0 ? {} : { location }
  };
}
function compileIfInstruction(element, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:if", ["test"]);
  const test = element.getAttribute("test");
  if (test === null || test.length === 0) {
    throw helpers.createXsltStaticError(
      "xsl:if requires a test attribute.",
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'add a test="..." attribute to xsl:if',
          replacement: 'test="..."',
          confidence: 1
        }]
      }
    );
  }
  const location = getAttributeValueSourceLocation(stylesheetXml, element, "test", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  return {
    kind: "if",
    test: helpers.parseXPathInContext(test, location, "xsl:if", "test"),
    testText: test,
    body: helpers.compileInstructions(element.childNodes, stylesheetXml),
    ...location === void 0 ? {} : { location }
  };
}
function compileChooseInstruction(element, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:choose", []);
  const whenBranches = [];
  let otherwiseBody;
  let otherwiseLocation;
  let seenOtherwise = false;
  for (const child of helpers.childElements(element)) {
    if (helpers.isXsltElement(child, "when")) {
      helpers.assertAllowedXsltAttributes(child, stylesheetXml, "xsl:when", ["test"]);
      if (seenOtherwise) {
        throw helpers.createXsltStaticError(
          "xsl:when cannot appear after xsl:otherwise within xsl:choose.",
          getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName)
        );
      }
      const test = child.getAttribute("test");
      if (test === null || test.length === 0) {
        throw helpers.createXsltStaticError(
          "xsl:when requires a test attribute.",
          getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
          {
            suggestions: [{
              kind: "fix",
              label: 'add a test="..." attribute to xsl:when',
              replacement: 'test="..."',
              confidence: 1
            }]
          }
        );
      }
      const location2 = getAttributeValueSourceLocation(stylesheetXml, child, "test", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName);
      whenBranches.push({
        test: helpers.parseXPathInContext(test, location2, "xsl:when", "test"),
        testText: test,
        body: helpers.compileInstructions(child.childNodes, stylesheetXml),
        ...location2 === void 0 ? {} : { location: location2 }
      });
      continue;
    }
    if (helpers.isXsltElement(child, "otherwise")) {
      helpers.assertAllowedXsltAttributes(child, stylesheetXml, "xsl:otherwise", []);
      if (seenOtherwise) {
        throw helpers.createXsltStaticError(
          "xsl:choose cannot contain more than one xsl:otherwise.",
          getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName)
        );
      }
      seenOtherwise = true;
      otherwiseBody = helpers.compileInstructions(child.childNodes, stylesheetXml);
      otherwiseLocation = getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName);
      continue;
    }
    throw helpers.createXsltStaticError(
      `xsl:choose only supports xsl:when and xsl:otherwise children; found ${child.nodeName}.`,
      getElementNameSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName)
    );
  }
  if (whenBranches.length === 0) {
    throw helpers.createXsltStaticError(
      "xsl:choose requires at least one xsl:when child.",
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName)
    );
  }
  const location = getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  return {
    kind: "choose",
    whenBranches,
    ...otherwiseBody === void 0 ? {} : { otherwiseBody },
    ...otherwiseLocation === void 0 ? {} : { otherwiseLocation },
    ...location === void 0 ? {} : { location }
  };
}
function compileForEachInstruction(element, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:for-each", ["select"]);
  const select = element.getAttribute("select");
  if (select === null || select.length === 0) {
    throw helpers.createXsltStaticError(
      "xsl:for-each requires a select attribute.",
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'add a select="..." attribute to xsl:for-each',
          replacement: 'select="..."',
          confidence: 1
        }]
      }
    );
  }
  const location = getAttributeValueSourceLocation(stylesheetXml, element, "select", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  return {
    kind: "forEach",
    select: helpers.parseXPathInContext(select, location, "xsl:for-each", "select"),
    selectText: select,
    body: helpers.compileInstructions(element.childNodes, stylesheetXml),
    ...location === void 0 ? {} : { location }
  };
}
function compileValueOfInstruction(element, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:value-of", ["select", "separator"]);
  const select = element.getAttribute("select");
  if (select === null || select.length === 0) {
    throw helpers.createXsltStaticError(
      "xsl:value-of requires a select attribute.",
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'add a select="..." attribute to xsl:value-of',
          replacement: 'select="..."',
          confidence: 1
        }]
      }
    );
  }
  const location = getAttributeValueSourceLocation(stylesheetXml, element, "select", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const separator = element.getAttribute("separator") ?? void 0;
  return {
    kind: "valueOf",
    select: helpers.parseXPathInContext(select, location, "xsl:value-of", "select"),
    selectText: select,
    ...location === void 0 ? {} : { location },
    ...separator === void 0 ? {} : { separator }
  };
}

// src/xslt/compile/literalResultNamespaces.ts
function collectInheritedNamespaceAttributes(element, stylesheetXml, excludedNamespaces, xsltNamespace, stylesheetSourceName) {
  const namespaceAttributes = /* @__PURE__ */ new Map();
  const ancestors = [];
  let current = element.parentNode;
  while (current !== null) {
    if (current.nodeType === current.ELEMENT_NODE) {
      ancestors.unshift(current);
    }
    current = current.parentNode;
  }
  for (const ancestor of ancestors) {
    for (let index = 0; index < ancestor.attributes.length; index += 1) {
      const attribute = ancestor.attributes.item(index);
      if (attribute === null || !isNamespaceDeclaration(attribute) || attribute.value === xsltNamespace) {
        continue;
      }
      if (excludedNamespaces.excludeAllNamespaces || excludedNamespaces.excludedNamespaceNames.has(attribute.name)) {
        continue;
      }
      if (!namespaceAttributes.has(attribute.name)) {
        namespaceAttributes.set(attribute.name, attribute.value);
      }
    }
  }
  const attributes = [];
  for (const [name, value] of namespaceAttributes) {
    if (element.hasAttribute(name)) {
      continue;
    }
    const sourceAttribute = ancestors.flatMap((ancestor) => Array.from(ancestor.attributes)).find((attribute) => attribute.name === name && attribute.value === value);
    const location = sourceAttribute === void 0 ? void 0 : getNodeSourceLocation(stylesheetXml, sourceAttribute, stylesheetSourceName);
    attributes.push({
      name,
      value,
      ...location === void 0 ? {} : { location }
    });
  }
  return attributes;
}
function collectExcludedNamespaceState(element) {
  const excludedNamespaceNames = /* @__PURE__ */ new Set();
  let excludeAllNamespaces = false;
  let current = element;
  while (current !== null) {
    if (current.nodeType === current.ELEMENT_NODE) {
      const excludedPrefixes = current.getAttribute("exclude-result-prefixes");
      if (excludedPrefixes !== null) {
        for (const prefix of excludedPrefixes.trim().split(/\s+/)) {
          if (prefix.length === 0) {
            continue;
          }
          if (prefix === "#all") {
            excludeAllNamespaces = true;
            excludedNamespaceNames.clear();
            continue;
          }
          excludedNamespaceNames.add(prefix === "#default" ? "xmlns" : `xmlns:${prefix}`);
        }
      }
    }
    current = current.parentNode;
  }
  return {
    excludedNamespaceNames,
    excludeAllNamespaces
  };
}
function isExcludeResultPrefixesAttribute(attribute) {
  return (attribute.namespaceURI === null || attribute.namespaceURI.length === 0) && attribute.name === "exclude-result-prefixes";
}
function isNamespaceDeclaration(attribute) {
  return attribute.name === "xmlns" || attribute.prefix === "xmlns";
}

// src/xslt/compile/literalResult.ts
function compileLiteralResultElement(element, stylesheetXml, compileInstructions, xsltNamespace, stylesheetSourceName) {
  const location = getNodeSourceLocation(stylesheetXml, element, stylesheetSourceName);
  return {
    kind: "literalElement",
    name: element.tagName,
    attributes: compileLiteralResultAttributes(element, stylesheetXml, xsltNamespace, stylesheetSourceName),
    body: compileInstructions(element.childNodes, stylesheetXml),
    ...location === void 0 ? {} : { location }
  };
}
function compileLiteralResultAttribute(attribute, stylesheetXml, excludedNamespaces, xsltNamespace, stylesheetSourceName) {
  if (isExcludeResultPrefixesAttribute(attribute)) {
    return void 0;
  }
  if (isNamespaceDeclaration(attribute)) {
    if (attribute.value === xsltNamespace) {
      return void 0;
    }
    if (excludedNamespaces.excludeAllNamespaces || excludedNamespaces.excludedNamespaceNames.has(attribute.name)) {
      return void 0;
    }
  }
  const location = getNodeSourceLocation(stylesheetXml, attribute, stylesheetSourceName);
  return {
    name: attribute.name,
    value: attribute.value,
    ...location === void 0 ? {} : { location }
  };
}
function compileLiteralResultAttributes(element, stylesheetXml, xsltNamespace, stylesheetSourceName) {
  const excludedNamespaces = collectExcludedNamespaceState(element);
  const attributes = collectInheritedNamespaceAttributes(
    element,
    stylesheetXml,
    excludedNamespaces,
    xsltNamespace,
    stylesheetSourceName
  );
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute === null) {
      continue;
    }
    const compiledAttribute = compileLiteralResultAttribute(
      attribute,
      stylesheetXml,
      excludedNamespaces,
      xsltNamespace,
      stylesheetSourceName
    );
    if (compiledAttribute !== void 0) {
      attributes.push(compiledAttribute);
    }
  }
  return attributes;
}

// src/xslt/compile/instructionEntrypoints.ts
function createInstructionEntrypoints(helpers) {
  function compileWithParam(element, stylesheetXml) {
    helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:with-param", ["as", "name", "select", "tunnel"]);
    const rawName = element.getAttribute("name");
    if (rawName === null || rawName.length === 0) {
      throw helpers.createXsltStaticError(
        "xsl:with-param requires a name attribute.",
        getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
        {
          suggestions: [{
            kind: "fix",
            label: 'add a name="..." attribute to xsl:with-param',
            replacement: 'name="..."',
            confidence: 1
          }]
        }
      );
    }
    const select = element.getAttribute("select") ?? void 0;
    helpers.assertNoSelectAndContent(
      element,
      stylesheetXml,
      select,
      "xsl:with-param",
      "paramName",
      rawName
    );
    const body = select === void 0 && helpers.hasMeaningfulTemplateContent(element) ? compileInstructions(element.childNodes, stylesheetXml) : void 0;
    const selectLocation = select === void 0 ? void 0 : getAttributeValueSourceLocation(stylesheetXml, element, "select", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
    const location = getAttributeValueSourceLocation(stylesheetXml, element, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
    const name = helpers.normalizeXsltQName(rawName, element, stylesheetXml, "name", "xsl:with-param");
    return {
      name,
      ...select === void 0 ? {} : { select: helpers.parseXPathInContext(select, selectLocation, "xsl:with-param", "select") },
      ...select === void 0 ? {} : { selectText: select },
      ...body === void 0 ? {} : { body },
      ...location === void 0 ? {} : { location }
    };
  }
  function compileInstructions(nodes, stylesheetXml) {
    const instructions = [];
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes.item(index);
      if (node === null) {
        continue;
      }
      const instruction = compileInstruction(node, stylesheetXml);
      if (instruction !== void 0) {
        instructions.push(instruction);
      }
    }
    return instructions;
  }
  const instructionCompilerHelpers = {
    stylesheetSourceName: helpers.stylesheetSourceName,
    isXsltElement: helpers.isXsltElement,
    assertAllowedXsltAttributes: helpers.assertAllowedXsltAttributes,
    createXsltStaticError: helpers.createXsltStaticError,
    parseXPathInContext: helpers.parseXPathInContext,
    compileInstructions,
    childElements: helpers.childElements,
    compileWithParam,
    assertNoDuplicateWithParam: helpers.assertNoDuplicateWithParam,
    normalizeXsltQName: helpers.normalizeXsltQName,
    assertNoSelectAndContent: helpers.assertNoSelectAndContent,
    hasMeaningfulTemplateContent: helpers.hasMeaningfulTemplateContent
  };
  function compileInstruction(node, stylesheetXml) {
    if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE) {
      const text = node.nodeValue ?? "";
      const location = getNodeSourceLocation(stylesheetXml, node, helpers.stylesheetSourceName);
      return text.trim().length === 0 ? void 0 : {
        kind: "literalText",
        text,
        ...location === void 0 ? {} : { location }
      };
    }
    if (node.nodeType !== node.ELEMENT_NODE) {
      return void 0;
    }
    const element = node;
    if (helpers.isXsltElement(element, "apply-templates")) {
      return compileApplyTemplatesInstruction(element, stylesheetXml, instructionCompilerHelpers);
    }
    if (helpers.isXsltElement(element, "call-template")) {
      return compileCallTemplateInstruction(element, stylesheetXml, instructionCompilerHelpers);
    }
    if (helpers.isXsltElement(element, "variable")) {
      return compileVariableInstruction(element, stylesheetXml, instructionCompilerHelpers);
    }
    if (helpers.isXsltElement(element, "if")) {
      return compileIfInstruction(element, stylesheetXml, instructionCompilerHelpers);
    }
    if (helpers.isXsltElement(element, "comment")) {
      helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:comment", []);
      const location = getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
      return {
        kind: "comment",
        body: compileInstructions(element.childNodes, stylesheetXml),
        ...location === void 0 ? {} : { location }
      };
    }
    if (helpers.isXsltElement(element, "choose")) {
      return compileChooseInstruction(element, stylesheetXml, instructionCompilerHelpers);
    }
    if (helpers.isXsltElement(element, "for-each")) {
      return compileForEachInstruction(element, stylesheetXml, instructionCompilerHelpers);
    }
    if (helpers.isXsltElement(element, "value-of")) {
      return compileValueOfInstruction(element, stylesheetXml, instructionCompilerHelpers);
    }
    if (helpers.isXsltElement(element, "text")) {
      helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:text", []);
      const location = getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
      return {
        kind: "literalText",
        text: element.textContent ?? "",
        ...location === void 0 ? {} : { location }
      };
    }
    if (element.namespaceURI === helpers.xsltNamespace) {
      const suggestion = helpers.createInstructionSuggestion(element);
      throw helpers.createXsltStaticError(
        `Unsupported XSLT instruction ${element.nodeName} in current MVP+3 slice.`,
        getElementNameSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
        {
          instructionName: element.nodeName
        },
        suggestion === void 0 ? void 0 : { suggestions: [suggestion] }
      );
    }
    return compileLiteralResultElement(
      element,
      stylesheetXml,
      compileInstructions,
      helpers.xsltNamespace,
      helpers.stylesheetSourceName
    );
  }
  return {
    compileInstructions,
    compileInstruction
  };
}

// src/xpath/lex/lexer.ts
var KEYWORD_KINDS = {
  and: "and",
  div: "div",
  eq: "eq",
  else: "else",
  except: "except",
  every: "every",
  for: "for",
  ge: "ge",
  gt: "gt",
  if: "if",
  idiv: "idiv",
  in: "in",
  intersect: "intersect",
  is: "is",
  let: "let",
  le: "le",
  lt: "lt",
  mod: "mod",
  ne: "ne",
  or: "or",
  return: "return",
  satisfies: "satisfies",
  some: "some",
  then: "then",
  to: "to",
  union: "union"
};
function tokenize(expression) {
  const state = {
    expression,
    index: 0,
    line: 1,
    column: 1
  };
  const tokens = [];
  while (!isAtEnd(state)) {
    skipWhitespace(state);
    if (isAtEnd(state)) {
      break;
    }
    const start = capturePosition(state);
    const current = peekChar(state);
    if (current === void 0) {
      break;
    }
    if (isDigit(current) || current === "." && isDigit(peekChar(state, 1))) {
      readNumber(state);
      tokens.push(makeToken(state, start, "number"));
      continue;
    }
    if (current === '"' || current === "'") {
      readString(state, current);
      tokens.push(makeToken(state, start, "string"));
      continue;
    }
    if (isNameStart(current)) {
      const name = readName(state);
      const kind = Object.prototype.hasOwnProperty.call(KEYWORD_KINDS, name) ? KEYWORD_KINDS[name] : "name";
      tokens.push(makeToken(state, start, kind));
      continue;
    }
    switch (current) {
      case "/": {
        advanceChar(state);
        if (peekChar(state) === "/") {
          advanceChar(state);
          tokens.push(makeToken(state, start, "slashSlash"));
        } else {
          tokens.push(makeToken(state, start, "slash"));
        }
        break;
      }
      case "(": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "leftParen"));
        break;
      }
      case ")": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "rightParen"));
        break;
      }
      case "[": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "leftBracket"));
        break;
      }
      case "]": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "rightBracket"));
        break;
      }
      case ".": {
        advanceChar(state);
        if (peekChar(state) === ".") {
          advanceChar(state);
          tokens.push(makeToken(state, start, "dotDot"));
        } else {
          tokens.push(makeToken(state, start, "dot"));
        }
        break;
      }
      case ",": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "comma"));
        break;
      }
      case "@": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "at"));
        break;
      }
      case "$": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "dollar"));
        break;
      }
      case "+": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "plus"));
        break;
      }
      case "-": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "minus"));
        break;
      }
      case "*": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "star"));
        break;
      }
      case "=": {
        advanceChar(state);
        tokens.push(makeToken(state, start, "equals"));
        break;
      }
      case "!": {
        advanceChar(state);
        if (peekChar(state) !== "=") {
          tokens.push(makeToken(state, start, "bang"));
          break;
        }
        advanceChar(state);
        tokens.push(makeToken(state, start, "notEquals"));
        break;
      }
      case "<": {
        advanceChar(state);
        if (peekChar(state) === "<") {
          advanceChar(state);
          tokens.push(makeToken(state, start, "nodeBefore"));
        } else if (peekChar(state) === "=") {
          advanceChar(state);
          tokens.push(makeToken(state, start, "lessThanOrEqual"));
        } else {
          tokens.push(makeToken(state, start, "lessThan"));
        }
        break;
      }
      case ">": {
        advanceChar(state);
        if (peekChar(state) === ">") {
          advanceChar(state);
          tokens.push(makeToken(state, start, "nodeAfter"));
        } else if (peekChar(state) === "=") {
          advanceChar(state);
          tokens.push(makeToken(state, start, "greaterThanOrEqual"));
        } else {
          tokens.push(makeToken(state, start, "greaterThan"));
        }
        break;
      }
      case ":": {
        advanceChar(state);
        if (peekChar(state) === "=") {
          advanceChar(state);
          tokens.push(makeToken(state, start, "assign"));
          break;
        }
        if (peekChar(state) === ":") {
          advanceChar(state);
          tokens.push(makeToken(state, start, "doubleColon"));
          break;
        }
        tokens.push(makeToken(state, start, "colon"));
        break;
      }
      case "|": {
        advanceChar(state);
        if (peekChar(state) === "|") {
          advanceChar(state);
          tokens.push(makeToken(state, start, "concat"));
        } else {
          tokens.push(makeToken(state, start, "pipe"));
        }
        break;
      }
      default:
        throw unexpectedCharacter(start, current);
    }
  }
  const eofStart = capturePosition(state);
  tokens.push({
    kind: "eof",
    value: "",
    span: {
      start: state.index,
      end: state.index,
      line: eofStart.line,
      column: eofStart.column,
      endLine: eofStart.line,
      endColumn: eofStart.column
    }
  });
  return tokens;
}
function makeToken(state, start, kind) {
  return {
    kind,
    value: state.expression.slice(start.index, state.index),
    span: {
      start: start.index,
      end: state.index,
      line: start.line,
      column: start.column,
      endLine: state.line,
      endColumn: state.column
    }
  };
}
function capturePosition(state) {
  return {
    index: state.index,
    line: state.line,
    column: state.column
  };
}
function isAtEnd(state) {
  return state.index >= state.expression.length;
}
function peekChar(state, lookahead = 0) {
  return state.expression[state.index + lookahead];
}
function advanceChar(state) {
  const current = state.expression[state.index];
  if (current === void 0) {
    return void 0;
  }
  state.index += 1;
  if (current === "\r") {
    if (state.expression[state.index] === "\n") {
      state.index += 1;
    }
    state.line += 1;
    state.column = 1;
    return current;
  }
  if (current === "\n") {
    state.line += 1;
    state.column = 1;
    return current;
  }
  state.column += 1;
  return current;
}
function skipWhitespace(state) {
  while (true) {
    const current = peekChar(state);
    if (current === void 0 || !isWhitespace(current)) {
      return;
    }
    advanceChar(state);
  }
}
function readNumber(state) {
  if (peekChar(state) === ".") {
    advanceChar(state);
    readDigits(state);
    readExponentPart(state);
    return;
  }
  readDigits(state);
  if (peekChar(state) === "." && peekChar(state, 1) !== ".") {
    advanceChar(state);
    readDigits(state);
  }
  readExponentPart(state);
}
function readExponentPart(state) {
  const current = peekChar(state);
  if (current !== "e" && current !== "E") {
    return;
  }
  const signOffset = peekChar(state, 1) === "+" || peekChar(state, 1) === "-" ? 2 : 1;
  if (!isDigit(peekChar(state, signOffset))) {
    return;
  }
  advanceChar(state);
  if (peekChar(state) === "+" || peekChar(state) === "-") {
    advanceChar(state);
  }
  readDigits(state);
}
function readDigits(state) {
  while (true) {
    const current = peekChar(state);
    if (current === void 0 || !isDigit(current)) {
      return;
    }
    advanceChar(state);
  }
}
function readString(state, quote) {
  const start = capturePosition(state);
  advanceChar(state);
  while (true) {
    const current = peekChar(state);
    if (current === void 0) {
      throw new XPathError(XPST0003, "Unterminated string literal.", {
        source: "<xpath>",
        line: start.line,
        column: start.column,
        offset: start.index,
        endLine: state.line,
        endColumn: state.column,
        endOffset: state.index
      });
    }
    advanceChar(state);
    if (current !== quote) {
      continue;
    }
    if (peekChar(state) === quote) {
      advanceChar(state);
      continue;
    }
    return;
  }
}
function readName(state) {
  const startIndex = state.index;
  advanceChar(state);
  while (true) {
    const current = peekChar(state);
    if (current === void 0 || !isNameChar(current)) {
      break;
    }
    advanceChar(state);
  }
  if (peekChar(state) === ":" && peekChar(state, 1) !== ":" && isNameStart(peekChar(state, 1))) {
    advanceChar(state);
    advanceChar(state);
    while (true) {
      const current = peekChar(state);
      if (current === void 0 || !isNameChar(current)) {
        break;
      }
      advanceChar(state);
    }
  }
  return state.expression.slice(startIndex, state.index);
}
function unexpectedCharacter(start, character) {
  return new XPathError(XPST0003, `Unexpected character ${JSON.stringify(character)}.`, {
    source: "<xpath>",
    line: start.line,
    column: start.column,
    offset: start.index,
    endLine: start.line,
    endColumn: start.column + 1,
    endOffset: start.index + 1
  });
}
function isWhitespace(character) {
  return character === " " || character === "	" || character === "\n" || character === "\r";
}
function isDigit(character) {
  return character !== void 0 && character >= "0" && character <= "9";
}
function isNameStart(character) {
  return character !== void 0 && /[A-Za-z_]/.test(character);
}
function isNameChar(character) {
  return /[A-Za-z0-9_.-]/.test(character);
}

// src/xpath/parse/parser.ts
function parseXPath(expression) {
  const parser = new Parser(tokenize(expression));
  const ast = parser.parseExpression();
  parser.expect("eof", "Expected the end of the XPath expression.");
  return ast;
}
var Parser = class {
  tokens;
  index = 0;
  constructor(tokens) {
    this.tokens = tokens;
  }
  parseExpression() {
    const first = this.parseExprSingle();
    if (this.match("comma") === void 0) {
      return first;
    }
    const items = [first];
    do {
      items.push(this.parseExprSingle());
    } while (this.match("comma") !== void 0);
    return {
      kind: "sequence",
      items,
      span: mergeSpans(items[0].span, items[items.length - 1].span)
    };
  }
  parseExprSingle() {
    if (this.current().kind === "some" || this.current().kind === "every") {
      return this.parseQuantifiedExpression();
    }
    if (this.current().kind === "for") {
      return this.parseForExpression();
    }
    if (this.current().kind === "if") {
      return this.parseIfExpression();
    }
    if (this.current().kind === "let") {
      return this.parseLetExpression();
    }
    return this.parseOrExpression();
  }
  current() {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1];
  }
  expect(kind, message) {
    const token = this.current();
    if (token.kind !== kind) {
      throw createParseError(message, token.span);
    }
    this.index += 1;
    return token;
  }
  match(kind) {
    const token = this.current();
    if (token.kind !== kind) {
      return void 0;
    }
    this.index += 1;
    return token;
  }
  matchAny(kinds) {
    const token = this.current();
    if (!kinds.includes(token.kind)) {
      return void 0;
    }
    this.index += 1;
    return token;
  }
  peek(offset = 1) {
    return this.tokens[this.index + offset] ?? this.tokens[this.tokens.length - 1];
  }
  parseOrExpression() {
    return this.parseBinaryChain(this.parseAndExpression.bind(this), ["or"]);
  }
  parseAndExpression() {
    return this.parseBinaryChain(this.parseComparisonExpression.bind(this), ["and"]);
  }
  parseComparisonExpression() {
    const comparisonKinds = [
      "equals",
      "eq",
      "ge",
      "is",
      "notEquals",
      "gt",
      "le",
      "lessThan",
      "lessThanOrEqual",
      "lt",
      "nodeAfter",
      "nodeBefore",
      "greaterThan",
      "greaterThanOrEqual",
      "ne"
    ];
    const left = this.parseStringConcatExpression();
    const operatorToken = this.matchAny(comparisonKinds);
    if (operatorToken === void 0) {
      return left;
    }
    const right = this.parseStringConcatExpression();
    if (comparisonKinds.includes(this.current().kind)) {
      throw createParseError("Only one comparison operator is allowed per expression unless parenthesized.", this.current().span);
    }
    return {
      kind: "binary",
      operator: tokenKindToBinaryOperator(operatorToken.kind),
      left,
      right,
      span: mergeSpans(left.span, right.span)
    };
  }
  parseRangeExpression() {
    return this.parseBinaryChain(this.parseAdditiveExpression.bind(this), ["to"]);
  }
  parseStringConcatExpression() {
    return this.parseBinaryChain(this.parseRangeExpression.bind(this), ["concat"]);
  }
  parseAdditiveExpression() {
    return this.parseBinaryChain(this.parseMultiplicativeExpression.bind(this), ["plus", "minus"]);
  }
  parseMultiplicativeExpression() {
    return this.parseBinaryChain(this.parseUnaryExpression.bind(this), ["star", "div", "idiv", "mod"]);
  }
  parseSimpleMapExpression() {
    return this.parseBinaryChain(this.parseUnionExpression.bind(this), ["bang"]);
  }
  parseUnionExpression() {
    return this.parseBinaryChain(this.parseIntersectExceptExpression.bind(this), ["pipe", "union"]);
  }
  parseIntersectExceptExpression() {
    return this.parseBinaryChain(this.parsePostfixExpression.bind(this), ["intersect", "except"]);
  }
  parseBinaryChain(parseOperand, operatorKinds) {
    let expression = parseOperand();
    while (true) {
      const operatorToken = this.matchAny(operatorKinds);
      if (operatorToken === void 0) {
        return expression;
      }
      const right = parseOperand();
      expression = {
        kind: "binary",
        operator: tokenKindToBinaryOperator(operatorToken.kind),
        left: expression,
        right,
        span: mergeSpans(expression.span, right.span)
      };
    }
  }
  parseUnaryExpression() {
    const operatorToken = this.matchAny(["plus", "minus"]);
    if (operatorToken === void 0) {
      return this.parseSimpleMapExpression();
    }
    const operand = this.parseUnaryExpression();
    const expression = {
      kind: "unary",
      operator: operatorToken.kind === "plus" ? "+" : "-",
      operand,
      span: mergeSpans(operatorToken.span, operand.span)
    };
    return expression;
  }
  parseIfExpression() {
    const ifToken = this.expect("if", "Expected if to start the conditional expression.");
    this.expect("leftParen", "Expected ( after if.");
    const test = this.parseExpression();
    this.expect("rightParen", "Expected ) after the if test expression.");
    this.expect("then", "Expected then after the if test expression.");
    const thenBranch = this.parseExprSingle();
    this.expect("else", "Expected else after the then branch.");
    const elseBranch = this.parseExprSingle();
    return {
      kind: "if",
      test,
      thenBranch,
      elseBranch,
      span: mergeSpans(ifToken.span, elseBranch.span)
    };
  }
  parseForExpression() {
    const forToken = this.expect("for", "Expected for to start the iteration expression.");
    const bindings = this.parseFlowBindings("for");
    this.expect("return", "Expected return after the for input expression.");
    const returnExpr = this.parseExprSingle();
    return {
      kind: "for",
      bindings,
      returnExpr,
      span: mergeSpans(forToken.span, returnExpr.span)
    };
  }
  parseQuantifiedExpression() {
    const quantifierToken = this.matchAny(["some", "every"]);
    if (quantifierToken === void 0) {
      throw createParseError("Expected some or every to start the quantified expression.", this.current().span);
    }
    const bindings = this.parseFlowBindings("quantified");
    this.expect("satisfies", "Expected satisfies after the quantified input expression.");
    const satisfiesExpr = this.parseExprSingle();
    return {
      kind: "quantified",
      quantifier: quantifierToken.kind === "some" ? "some" : "every",
      bindings,
      satisfiesExpr,
      span: mergeSpans(quantifierToken.span, satisfiesExpr.span)
    };
  }
  parseFlowBindings(kind) {
    const bindings = [];
    while (true) {
      this.expect("dollar", `Expected $ to start the ${kind} binding.`);
      const name = this.expect("name", `Expected a variable name in the ${kind} binding.`);
      this.expect("in", `Expected in after the ${kind} variable.`);
      const value = this.parseExprSingle();
      bindings.push({
        name: name.value,
        value,
        span: mergeSpans(name.span, value.span)
      });
      if (this.match("comma") === void 0) {
        break;
      }
    }
    return bindings;
  }
  parseLetExpression() {
    const letToken = this.expect("let", "Expected let to start the binding expression.");
    const bindings = [];
    while (true) {
      this.expect("dollar", "Expected $ to start a let binding.");
      const name = this.expect("name", "Expected a variable name in the let binding.");
      this.expect("assign", "Expected := in the let binding.");
      const value = this.parseExprSingle();
      bindings.push({
        name: name.value,
        value,
        span: mergeSpans(name.span, value.span)
      });
      if (this.match("comma") === void 0) {
        break;
      }
    }
    this.expect("return", "Expected return after the let bindings.");
    const returnExpr = this.parseExprSingle();
    return {
      kind: "let",
      bindings,
      returnExpr,
      span: mergeSpans(letToken.span, returnExpr.span)
    };
  }
  parsePostfixExpression() {
    let expression = isInitialPathExpressionStart(this.current(), this.peek()) ? this.parsePathExpression() : this.parseSimplePrimaryExpression();
    while (true) {
      if (this.current().kind === "leftBracket") {
        expression = this.parseFilterExpression(expression);
        continue;
      }
      if (this.current().kind === "slash" || this.current().kind === "slashSlash") {
        expression = this.parseRelativePathExpression(expression);
        continue;
      }
      return expression;
    }
  }
  parseSimplePrimaryExpression() {
    const token = this.current();
    switch (token.kind) {
      case "leftBracket":
        return this.parseArrayConstructor();
      case "number":
        return this.parseNumberLiteral();
      case "string":
        return this.parseStringLiteral();
      case "dollar":
        return this.parseVariableReference();
      case "name":
        if (this.peek().kind === "leftParen" && !isKindTestName(token.value)) {
          return this.parseFunctionCallExpression();
        }
        return this.parsePathExpression();
      case "leftParen":
        return this.parseSequenceExpression();
      case "dot":
        this.index += 1;
        return { kind: "contextItem", span: token.span };
      default:
        throw createParseError(`Unexpected token ${JSON.stringify(token.value)}.`, token.span);
    }
  }
  parseNumberLiteral() {
    const token = this.expect("number", "Expected a numeric literal.");
    return {
      kind: "number",
      lexeme: token.value,
      value: Number(token.value),
      span: token.span
    };
  }
  parseStringLiteral() {
    const token = this.expect("string", "Expected a string literal.");
    return {
      kind: "string",
      lexeme: token.value,
      value: unescapeStringLiteral(token.value),
      span: token.span
    };
  }
  parseVariableReference() {
    const start = this.expect("dollar", "Expected a variable sigil.");
    const name = this.expect("name", "Expected a variable name.");
    return {
      kind: "variable",
      name: name.value,
      span: mergeSpans(start.span, name.span)
    };
  }
  parseFunctionCallExpression() {
    const callee = this.expect("name", "Expected a function name.");
    this.expect("leftParen", "Expected ( after the function name.");
    const args = [];
    if (this.current().kind !== "rightParen") {
      while (true) {
        args.push(this.parseExprSingle());
        if (this.match("comma") === void 0) {
          break;
        }
      }
    }
    const rightParen = this.expect("rightParen", "Expected ) to close the function call.");
    return {
      kind: "functionCall",
      callee: callee.value,
      arguments: args,
      span: mergeSpans(callee.span, rightParen.span)
    };
  }
  parseSequenceExpression() {
    const leftParen = this.expect("leftParen", "Expected ( to start the sequence constructor.");
    const items = [];
    if (this.current().kind !== "rightParen") {
      while (true) {
        items.push(this.parseExprSingle());
        if (this.match("comma") === void 0) {
          break;
        }
      }
    }
    const rightParen = this.expect("rightParen", "Expected ) to close the sequence constructor.");
    return {
      kind: "sequence",
      items,
      span: mergeSpans(leftParen.span, rightParen.span)
    };
  }
  parseArrayConstructor() {
    const leftBracket = this.expect("leftBracket", "Expected [ to start the array constructor.");
    const members = [];
    if (this.current().kind !== "rightBracket") {
      while (true) {
        members.push(this.parseExprSingle());
        if (this.match("comma") === void 0) {
          break;
        }
      }
    }
    const rightBracket = this.expect("rightBracket", "Expected ] to close the array constructor.");
    return {
      kind: "array",
      members,
      span: mergeSpans(leftBracket.span, rightBracket.span)
    };
  }
  parsePathExpression() {
    const startToken = this.current();
    const steps = [];
    let absolute = false;
    if (this.match("slashSlash") !== void 0) {
      absolute = true;
      steps.push(createSyntheticDescendantOrSelfStep(startToken.span));
      if (!isPathSegmentStart(this.current(), this.peek())) {
        throw createParseError("Expected a path segment after //.", this.current().span);
      }
      steps.push(this.parsePathSegment());
    } else if (this.match("slash") !== void 0) {
      absolute = true;
      if (isPathSegmentStart(this.current(), this.peek())) {
        steps.push(this.parsePathSegment());
      }
    } else {
      steps.push(this.parsePathSegment());
    }
    while (true) {
      const slashToken = this.match("slashSlash") ?? this.match("slash");
      if (slashToken === void 0) {
        break;
      }
      if (slashToken.kind === "slashSlash") {
        steps.push(createSyntheticDescendantOrSelfStep(slashToken.span));
      }
      if (!isPathSegmentStart(this.current(), this.peek())) {
        throw createParseError("Expected a path segment after /.", slashToken.span);
      }
      steps.push(this.parsePathSegment());
    }
    const endSpan = steps[steps.length - 1]?.span ?? startToken.span;
    return {
      kind: "path",
      absolute,
      steps,
      span: mergeSpans(startToken.span, endSpan)
    };
  }
  parseRelativePathExpression(base) {
    const startSpan = base.span;
    const steps = [];
    while (true) {
      const slashToken = this.match("slashSlash") ?? this.match("slash");
      if (slashToken === void 0) {
        break;
      }
      if (slashToken.kind === "slashSlash") {
        steps.push(createSyntheticDescendantOrSelfStep(slashToken.span));
      }
      if (!isPathSegmentStart(this.current(), this.peek())) {
        throw createParseError("Expected a path segment after /.", slashToken.span);
      }
      steps.push(this.parsePathSegment());
    }
    const endSpan = steps[steps.length - 1]?.span ?? base.span;
    return {
      kind: "path",
      absolute: false,
      base,
      steps,
      span: mergeSpans(startSpan, endSpan)
    };
  }
  parseFilterExpression(base) {
    const predicates = [];
    let span = base.span;
    while (this.match("leftBracket") !== void 0) {
      const predicate = this.parseExpression();
      const rightBracket = this.expect("rightBracket", "Expected ] to close the predicate.");
      predicates.push(predicate);
      span = mergeSpans(base.span, rightBracket.span);
    }
    return {
      kind: "filter",
      base,
      predicates,
      span
    };
  }
  parseStepExpression() {
    const startToken = this.current();
    if (this.match("dot") !== void 0) {
      return this.finishStep(startToken.span, "self", {
        kind: "kindTest",
        name: "node",
        span: startToken.span
      });
    }
    if (this.match("dotDot") !== void 0) {
      return this.finishStep(startToken.span, "parent", {
        kind: "kindTest",
        name: "node",
        span: startToken.span
      });
    }
    let axis = "child";
    if (this.match("at") !== void 0) {
      axis = "attribute";
    } else if (this.current().kind === "name" && this.peek().kind === "doubleColon") {
      const axisToken = this.expect("name", "Expected an axis name.");
      this.expect("doubleColon", "Expected :: after the axis name.");
      axis = parseAxisName(axisToken);
    }
    const nodeTest = this.parseNodeTest();
    return this.finishStep(startToken.span, axis, nodeTest);
  }
  finishStep(startSpan, axis, nodeTest) {
    const predicates = [];
    let span = mergeSpans(startSpan, nodeTest.span);
    while (this.match("leftBracket") !== void 0) {
      const predicate = this.parseExpression();
      const rightBracket = this.expect("rightBracket", "Expected ] to close the predicate.");
      predicates.push(predicate);
      span = mergeSpans(startSpan, rightBracket.span);
    }
    return {
      kind: "step",
      axis,
      nodeTest,
      predicates,
      span
    };
  }
  parseNodeTest() {
    const wildcard = this.match("star");
    if (wildcard !== void 0) {
      const colon2 = this.match("colon");
      if (colon2 !== void 0) {
        const localName = this.expect("name", "Expected a local name after *:.");
        return {
          kind: "wildcardTest",
          localName: localName.value,
          span: mergeSpans(wildcard.span, localName.span)
        };
      }
      return {
        kind: "wildcardTest",
        span: wildcard.span
      };
    }
    const token = this.expect("name", "Expected a node test.");
    const colon = this.match("colon");
    if (colon !== void 0) {
      this.expect("star", "Expected * after the node-test prefix and colon.");
      return {
        kind: "wildcardTest",
        prefix: token.value,
        span: mergeSpans(token.span, colon.span)
      };
    }
    if (this.match("leftParen") === void 0) {
      return {
        kind: "nameTest",
        name: token.value,
        span: token.span
      };
    }
    const rightParen = this.expect("rightParen", "Expected ) to close the node test.");
    if (!isKindTestName(token.value)) {
      throw createParseError(`Unsupported kind test ${JSON.stringify(token.value)}.`, token.span);
    }
    return {
      kind: "kindTest",
      name: token.value,
      span: mergeSpans(token.span, rightParen.span)
    };
  }
  parsePathSegment() {
    if (this.current().kind === "leftParen") {
      return this.parsePostfixExpression();
    }
    if (this.current().kind === "name" && this.peek().kind === "leftParen" && !isKindTestName(this.current().value)) {
      return this.parseFunctionCallExpression();
    }
    return this.parseStepExpression();
  }
};
function createSyntheticDescendantOrSelfStep(span) {
  return {
    kind: "step",
    axis: "descendant-or-self",
    nodeTest: { kind: "kindTest", name: "node", span },
    predicates: [],
    span
  };
}
function parseAxisName(token) {
  if (token.value === "ancestor" || token.value === "ancestor-or-self" || token.value === "child" || token.value === "descendant" || token.value === "descendant-or-self" || token.value === "following" || token.value === "following-sibling" || token.value === "namespace" || token.value === "parent" || token.value === "preceding" || token.value === "preceding-sibling" || token.value === "self") {
    return token.value;
  }
  if (token.value === "attribute") {
    return "attribute";
  }
  throw createParseError(`Unsupported axis ${JSON.stringify(token.value)}.`, token.span);
}
function tokenKindToBinaryOperator(kind) {
  switch (kind) {
    case "bang":
      return "!";
    case "concat":
      return "||";
    case "pipe":
    case "union":
      return "|";
    case "except":
      return "except";
    case "plus":
      return "+";
    case "minus":
      return "-";
    case "star":
      return "*";
    case "div":
      return "div";
    case "idiv":
      return "idiv";
    case "intersect":
      return "intersect";
    case "mod":
      return "mod";
    case "equals":
      return "=";
    case "eq":
      return "eq";
    case "ge":
      return "ge";
    case "is":
      return "is";
    case "notEquals":
      return "!=";
    case "gt":
      return "gt";
    case "le":
      return "le";
    case "lessThan":
      return "<";
    case "lessThanOrEqual":
      return "<=";
    case "lt":
      return "lt";
    case "nodeAfter":
      return ">>";
    case "nodeBefore":
      return "<<";
    case "greaterThan":
      return ">";
    case "greaterThanOrEqual":
      return ">=";
    case "ne":
      return "ne";
    case "to":
      return "to";
    case "and":
      return "and";
    case "or":
      return "or";
    default:
      throw new Error(`Unhandled binary token kind ${kind}.`);
  }
}
function unescapeStringLiteral(lexeme) {
  const quote = lexeme[0] ?? '"';
  const body = lexeme.slice(1, -1);
  return body.split(`${quote}${quote}`).join(quote);
}
function isKindTestName(value) {
  return value === "comment" || value === "node" || value === "processing-instruction" || value === "text";
}
function isStepStart(token) {
  return token.kind === "dot" || token.kind === "dotDot" || token.kind === "at" || token.kind === "name" || token.kind === "star";
}
function isPathSegmentStart(token, next) {
  return token.kind === "leftParen" || isStepStart(token) || token.kind === "name" && next.kind === "leftParen";
}
function isInitialPathExpressionStart(token, next) {
  if (token.kind === "slash" || token.kind === "slashSlash" || token.kind === "at" || token.kind === "star" || token.kind === "dotDot") {
    return true;
  }
  if (token.kind === "name") {
    return next.kind !== "leftParen" || token.value === "node" || token.value === "text";
  }
  return false;
}
function createParseError(message, span) {
  return new XPathError(XPST0003, message, {
    source: "<xpath>",
    line: span.line,
    column: span.column,
    offset: span.start,
    endLine: span.endLine,
    endColumn: span.endColumn,
    endOffset: span.end
  });
}
function mergeSpans(start, end) {
  return {
    start: start.start,
    end: end.end,
    line: start.line,
    column: start.column,
    endLine: end.endLine,
    endColumn: end.endColumn
  };
}

// src/xslt/compile/xsltNameResolution.ts
function normalizeXsltQName(name, element, stylesheetXml, attributeName, ownerName) {
  const eqName = tryNormalizeEqName2(name);
  if (eqName !== void 0) {
    return eqName;
  }
  const separator = name.indexOf(":");
  if (separator < 0) {
    return name;
  }
  const prefix = name.slice(0, separator);
  const localName = name.slice(separator + 1);
  const namespaceUri = lookupNamespaceUri(element, prefix);
  if (namespaceUri === void 0) {
    throw createXsltStaticError(
      `Unknown namespace prefix ${JSON.stringify(prefix)} in ${ownerName} ${attributeName}.`,
      getAttributeValueSourceLocation(stylesheetXml, element, attributeName, STYLESHEET_SOURCE_NAME) ?? getNodeSourceLocation(stylesheetXml, element, STYLESHEET_SOURCE_NAME),
      {
        namespacePrefix: prefix,
        qName: name
      },
      XPST0081
    );
  }
  return `{${namespaceUri}}${localName}`;
}
function parseXPathInContext(expression, location, ownerName, attributeName, frameKind = "instruction") {
  try {
    return parseXPath(expression);
  } catch (error) {
    const frameLabel = frameKind === "template" ? `${attributeName}="${expression}"` : `${ownerName} ${attributeName}="${expression}"`;
    throw prependXsltErrorFrame(
      error,
      {
        kind: frameKind,
        label: frameLabel,
        ...location === void 0 ? {} : { location }
      },
      location === void 0 ? void 0 : {
        label: frameKind === "template" ? "containing template" : "containing instruction",
        location
      }
    );
  }
}
function isSupportedTemplateMatch(ast) {
  if (ast.kind !== "path") {
    return false;
  }
  const path = ast;
  if (path.base !== void 0) {
    return false;
  }
  if (path.absolute && path.steps.length === 0) {
    return true;
  }
  if (path.steps.length === 0) {
    return false;
  }
  for (const step of path.steps) {
    if (step?.kind !== "step" || !isSupportedTemplateStep(step)) {
      return false;
    }
  }
  return true;
}
function tryNormalizeEqName2(name) {
  if (!name.startsWith("Q{")) {
    return void 0;
  }
  const endBrace = name.indexOf("}");
  if (endBrace < 0) {
    return void 0;
  }
  const namespaceUri = name.slice(2, endBrace);
  const localName = name.slice(endBrace + 1);
  if (localName.length === 0) {
    return void 0;
  }
  return namespaceUri.length === 0 ? localName : `{${namespaceUri}}${localName}`;
}
function lookupNamespaceUri(element, prefix) {
  for (let current = element; current !== null; current = current.parentNode) {
    if (current.nodeType !== current.ELEMENT_NODE) {
      continue;
    }
    const currentElement = current;
    for (let index = 0; index < currentElement.attributes.length; index += 1) {
      const attribute = currentElement.attributes.item(index);
      if (attribute?.prefix === "xmlns" && attribute.localName === prefix) {
        return attribute.value;
      }
    }
  }
  return void 0;
}
function isSupportedTemplateStep(step) {
  if (step.axis !== "child" || step.predicates.length > 0) {
    return false;
  }
  return step.nodeTest.kind === "nameTest" || step.nodeTest.kind === "wildcardTest" || step.nodeTest.kind === "kindTest" && step.nodeTest.name === "node" || step.nodeTest.kind === "kindTest" && step.nodeTest.name === "text";
}

// src/xslt/compile/stylesheetCompilers.ts
var SUPPORTED_XSLT_STYLESHEET_ATTRIBUTES = ["exclude-result-prefixes", "version", "xpath-default-namespace"];
var KNOWN_LATER_XSLT_STYLESHEET_ATTRIBUTES = [
  "default-collation",
  "default-mode",
  "default-validation",
  "expand-text",
  "extension-element-prefixes",
  "id",
  "input-type-annotations",
  "use-when"
];
var SUPPORTED_XSLT_OUTPUT_ATTRIBUTES = ["method"];
var SUPPORTED_XSLT_OUTPUT_METHODS = ["xml"];
var KNOWN_LATER_XSLT_OUTPUT_METHODS = ["html", "json", "text"];
var KNOWN_LATER_XSLT_OUTPUT_ATTRIBUTES = [
  "byte-order-mark",
  "cdata-section-elements",
  "doctype-public",
  "doctype-system",
  "encoding",
  "escape-uri-attributes",
  "html-version",
  "include-content-type",
  "indent",
  "item-separator",
  "media-type",
  "name",
  "normalization-form",
  "omit-xml-declaration",
  "parameter-document",
  "standalone",
  "suppress-indentation",
  "undeclare-prefixes",
  "use-character-maps",
  "version"
];
function collectStylesheetStaticContext(root) {
  const namespaces = {};
  for (let index = 0; index < root.attributes.length; index += 1) {
    const attribute = root.attributes.item(index);
    if (attribute === null) {
      continue;
    }
    if (attribute.prefix === "xmlns" && attribute.localName !== null && attribute.localName.length > 0) {
      namespaces[attribute.localName] = attribute.value;
    }
  }
  return {
    namespaces,
    defaultElementNamespace: root.getAttribute("xpath-default-namespace") ?? ""
  };
}
function assertNoDuplicateNamedTemplates(root, stylesheetXml, helpers) {
  const namedTemplates = /* @__PURE__ */ new Map();
  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, "template")) {
      continue;
    }
    const rawName = child.getAttribute("name");
    if (rawName === null || rawName.length === 0) {
      continue;
    }
    const name = helpers.normalizeXsltQName(rawName, child, stylesheetXml, "name", "xsl:template");
    if (!namedTemplates.has(name)) {
      namedTemplates.set(name, child);
      continue;
    }
    throw helpers.createXsltStaticError(
      `Stylesheet cannot declare duplicate named xsl:template ${name}.`,
      getAttributeValueSourceLocation(stylesheetXml, child, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
      {
        templateName: name
      },
      {
        suggestions: [{
          kind: "fix",
          label: `rename or remove one of the duplicate named templates for ${name}`,
          confidence: 1
        }]
      },
      XTSE0660
    );
  }
}
function assertNoDuplicateGlobalBindings(root, stylesheetXml, helpers) {
  const globalBindings = /* @__PURE__ */ new Map();
  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, "param") && !helpers.isXsltElement(child, "variable")) {
      continue;
    }
    const rawName = child.getAttribute("name");
    if (rawName === null || rawName.length === 0) {
      continue;
    }
    const name = helpers.normalizeXsltQName(rawName, child, stylesheetXml, "name", child.localName === "param" ? "xsl:param" : "xsl:variable");
    if (!globalBindings.has(name)) {
      globalBindings.set(name, child);
      continue;
    }
    throw helpers.createXsltStaticError(
      `Stylesheet cannot declare duplicate global binding ${name}.`,
      getAttributeValueSourceLocation(stylesheetXml, child, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, child, helpers.stylesheetSourceName),
      {
        bindingName: name
      },
      {
        suggestions: [{
          kind: "fix",
          label: `rename or remove one of the duplicate global bindings for ${name}`,
          confidence: 1
        }]
      },
      XTSE0630
    );
  }
}
function assertNoUnknownCalledTemplates(root, stylesheetXml, helpers) {
  const namedTemplates = collectNamedTemplateDisplayNames(root, stylesheetXml, helpers);
  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, "template") && !helpers.isXsltElement(child, "param") && !helpers.isXsltElement(child, "variable")) {
      continue;
    }
    for (const element of descendantElements(child)) {
      if (!helpers.isXsltElement(element, "call-template")) {
        continue;
      }
      const rawName = element.getAttribute("name");
      if (rawName === null || rawName.length === 0) {
        continue;
      }
      const name = helpers.normalizeXsltQName(rawName, element, stylesheetXml, "name", "xsl:call-template");
      if (namedTemplates.has(name)) {
        continue;
      }
      const suggestion = createNamedTemplateReferenceSuggestion(rawName, namedTemplates);
      throw helpers.createXsltStaticError(
        `xsl:call-template cannot target undeclared template ${name}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
        {
          templateName: name
        },
        suggestion === void 0 ? {
          suggestions: [{
            kind: "fix",
            label: `declare xsl:template name="${rawName}" or update xsl:call-template`,
            confidence: 1
          }]
        } : { suggestions: [suggestion] },
        XTSE0650
      );
    }
  }
}
function assertNoInvalidCallTemplateParams(root, stylesheetXml, helpers) {
  const namedTemplates = collectNamedTemplateSignatures(root, stylesheetXml, helpers);
  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, "template") && !helpers.isXsltElement(child, "param") && !helpers.isXsltElement(child, "variable")) {
      continue;
    }
    for (const element of descendantElements(child)) {
      if (!helpers.isXsltElement(element, "call-template")) {
        continue;
      }
      const rawName = element.getAttribute("name");
      if (rawName === null || rawName.length === 0) {
        continue;
      }
      if (!helpers.childElements(element).every((entry) => helpers.isXsltElement(entry, "with-param"))) {
        continue;
      }
      if (!helpers.childElements(element).every((entry) => canValidateCallTemplateWithParam(entry, helpers))) {
        continue;
      }
      const targetName = helpers.normalizeXsltQName(rawName, element, stylesheetXml, "name", "xsl:call-template");
      const signature = namedTemplates.get(targetName);
      if (signature === void 0) {
        continue;
      }
      const suppliedParams = /* @__PURE__ */ new Set();
      for (const withParamElement of helpers.childElements(element)) {
        const withParamName = withParamElement.getAttribute("name");
        if (withParamName === null || withParamName.length === 0 || isTunnelParamElement(withParamElement)) {
          continue;
        }
        const normalizedWithParamName = helpers.normalizeXsltQName(withParamName, withParamElement, stylesheetXml, "name", "xsl:with-param");
        suppliedParams.add(normalizedWithParamName);
        if (signature.nonTunnelParams.has(normalizedWithParamName)) {
          continue;
        }
        const suggestion = createCallTemplateParamSuggestion(withParamName, signature.nonTunnelParamDisplayNames);
        throw helpers.createXsltStaticError(
          `xsl:call-template cannot pass undeclared parameter ${normalizedWithParamName} to template ${targetName}.`,
          getAttributeValueSourceLocation(stylesheetXml, withParamElement, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, withParamElement, helpers.stylesheetSourceName),
          {
            parameterName: normalizedWithParamName,
            templateName: targetName
          },
          suggestion === void 0 ? {
            suggestions: [{
              kind: "fix",
              label: `declare xsl:param name="${withParamName}" on template ${rawName} or remove the xsl:with-param`,
              confidence: 1
            }]
          } : { suggestions: [suggestion] },
          XTSE0680
        );
      }
      for (const requiredParam of signature.requiredNonTunnelParams) {
        if (suppliedParams.has(requiredParam.name)) {
          continue;
        }
        throw helpers.createXsltStaticError(
          `xsl:call-template must supply required parameter ${requiredParam.name} to template ${targetName}.`,
          getAttributeValueSourceLocation(stylesheetXml, element, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
          {
            parameterName: requiredParam.name,
            templateName: targetName
          },
          {
            suggestions: [{
              kind: "fix",
              label: `add xsl:with-param name="${stripClarkNotation(requiredParam.name)}" to xsl:call-template or make the parameter optional`,
              confidence: 1
            }]
          },
          XTSE0690
        );
      }
    }
  }
}
function compileTopLevelDeclaration(element, stylesheetXml, helpers) {
  if (helpers.isXsltElement(element, "template")) {
    return helpers.compileTemplateRule(element, stylesheetXml);
  }
  if (helpers.isXsltElement(element, "param")) {
    return helpers.compileTopLevelParam(element, stylesheetXml);
  }
  if (helpers.isXsltElement(element, "variable")) {
    return helpers.compileTopLevelVariable(element, stylesheetXml);
  }
  if (helpers.isXsltElement(element, "strip-space")) {
    validateStripSpaceDeclaration(element, stylesheetXml, helpers);
    return void 0;
  }
  if (helpers.isXsltElement(element, "output")) {
    validateOutputDeclaration(element, stylesheetXml, helpers);
    return void 0;
  }
  if (helpers.isXsltElement(element, "include") || helpers.isXsltElement(element, "import")) {
    const href = element.getAttribute("href") ?? "";
    throw helpers.createXsltStaticError(
      `Stylesheet ${element.localName ?? element.nodeName} declarations are not yet implemented in the current MVP+3 slice.`,
      getAttributeValueSourceLocation(stylesheetXml, element, "href", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        href
      },
      {
        suggestions: [{
          kind: "fix",
          label: `inline or remove xsl:${element.localName ?? element.nodeName} in the current MVP+3 slice`,
          confidence: 1
        }]
      },
      XTSE0165
    );
  }
  if (element.namespaceURI === helpers.xsltNamespace) {
    throw helpers.createXsltStaticError(
      `Unsupported top-level XSLT declaration ${element.nodeName} in current MVP+3 slice.`,
      getElementNameSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        declarationName: element.nodeName
      },
      {
        suggestions: [{
          kind: "fix",
          label: `remove unsupported top-level declaration ${element.nodeName} in the current MVP+3 slice`,
          confidence: 1
        }]
      }
    );
  }
  throw helpers.createXsltStaticError(
    `Unsupported top-level stylesheet element ${element.nodeName} in current MVP+3 slice.`,
    getElementNameSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
    {
      elementName: element.nodeName
    },
    {
      suggestions: [{
        kind: "fix",
        label: "move result elements inside xsl:template bodies in the current MVP+3 slice",
        confidence: 1
      }]
    }
  );
}
function validateStylesheetRootAttributes(root, stylesheetXml, helpers) {
  const supported = new Set(SUPPORTED_XSLT_STYLESHEET_ATTRIBUTES);
  const knownLater = new Set(KNOWN_LATER_XSLT_STYLESHEET_ATTRIBUTES);
  const candidateAttributes = [
    ...SUPPORTED_XSLT_STYLESHEET_ATTRIBUTES,
    ...KNOWN_LATER_XSLT_STYLESHEET_ATTRIBUTES
  ];
  const instructionName = root.nodeName;
  for (let index = 0; index < root.attributes.length; index += 1) {
    const attribute = root.attributes.item(index);
    if (attribute === null) {
      continue;
    }
    if (attribute.prefix === "xmlns" || attribute.nodeName === "xmlns" || attribute.namespaceURI === helpers.xmlnsNamespace) {
      continue;
    }
    const attributeName = attribute.nodeName;
    const localName = attribute.localName ?? attributeName;
    if (attribute.namespaceURI === helpers.xsltNamespace) {
      throw helpers.createXsltStaticError(
        `${instructionName} cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(stylesheetXml, root, attributeName, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName
        },
        {
          suggestions: [{
            kind: "fix",
            label: `remove ${attributeName} from ${instructionName}`,
            confidence: 1
          }]
        },
        XTSE0090
      );
    }
    if (attribute.namespaceURI !== null && attribute.namespaceURI.length > 0) {
      continue;
    }
    if (supported.has(localName)) {
      continue;
    }
    if (knownLater.has(localName)) {
      throw helpers.createXsltStaticError(
        `${instructionName} attribute ${attributeName} is not yet implemented in the current MVP+3 slice.`,
        getAttributeValueSourceLocation(stylesheetXml, root, attributeName, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName
        },
        {
          suggestions: [{
            kind: "fix",
            label: `remove ${attributeName} from ${instructionName} in the current MVP+3 slice`,
            confidence: 1
          }]
        },
        XTSE0090
      );
    }
    const suggestion = helpers.createAttributeSuggestion(localName, candidateAttributes);
    throw helpers.createXsltStaticError(
      `${instructionName} has an unsupported attribute ${attributeName}.`,
      getAttributeValueSourceLocation(stylesheetXml, root, attributeName, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
      {
        attributeName,
        instructionName
      },
      suggestion === void 0 ? {
        suggestions: [{
          kind: "fix",
          label: `remove ${attributeName} from ${instructionName}`,
          confidence: 1
        }]
      } : { suggestions: [suggestion] },
      XTSE0090
    );
  }
}
function validateStripSpaceDeclaration(element, stylesheetXml, helpers) {
  const supported = ["elements"];
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute === null) {
      continue;
    }
    if (attribute.prefix === "xmlns" || attribute.nodeName === "xmlns" || attribute.namespaceURI === helpers.xmlnsNamespace) {
      continue;
    }
    const attributeName = attribute.nodeName;
    const localName = attribute.localName ?? attributeName;
    if (attribute.namespaceURI === helpers.xsltNamespace) {
      throw helpers.createXsltStaticError(
        `xsl:strip-space cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName: "xsl:strip-space"
        },
        {
          suggestions: [{
            kind: "fix",
            label: `remove ${attributeName} from xsl:strip-space`,
            confidence: 1
          }]
        },
        XTSE0090
      );
    }
    if ((attribute.namespaceURI === null || attribute.namespaceURI.length === 0) && !supported.includes(localName)) {
      const suggestion = helpers.createAttributeSuggestion(localName, supported);
      throw helpers.createXsltStaticError(
        `xsl:strip-space has an unsupported attribute ${attributeName}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName: "xsl:strip-space"
        },
        suggestion === void 0 ? {
          suggestions: [{
            kind: "fix",
            label: `remove ${attributeName} from xsl:strip-space`,
            confidence: 1
          }]
        } : { suggestions: [suggestion] },
        XTSE0090
      );
    }
  }
}
function validateOutputDeclaration(element, stylesheetXml, helpers) {
  const supported = new Set(SUPPORTED_XSLT_OUTPUT_ATTRIBUTES);
  const knownLater = new Set(KNOWN_LATER_XSLT_OUTPUT_ATTRIBUTES);
  const candidateAttributes = [
    ...SUPPORTED_XSLT_OUTPUT_ATTRIBUTES,
    ...KNOWN_LATER_XSLT_OUTPUT_ATTRIBUTES
  ];
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute === null) {
      continue;
    }
    if (attribute.prefix === "xmlns" || attribute.nodeName === "xmlns" || attribute.namespaceURI === helpers.xmlnsNamespace) {
      continue;
    }
    const attributeName = attribute.nodeName;
    const localName = attribute.localName ?? attributeName;
    if (attribute.namespaceURI === helpers.xsltNamespace) {
      throw helpers.createXsltStaticError(
        `xsl:output cannot use an attribute in the XSLT namespace: ${attributeName}.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName: "xsl:output"
        },
        {
          suggestions: [{
            kind: "fix",
            label: `remove ${attributeName} from xsl:output`,
            confidence: 1
          }]
        },
        XTSE0090
      );
    }
    if (attribute.namespaceURI !== null && attribute.namespaceURI.length > 0) {
      continue;
    }
    if (supported.has(localName)) {
      continue;
    }
    if (knownLater.has(localName)) {
      throw helpers.createXsltStaticError(
        `xsl:output attribute ${attributeName} is not yet implemented in the current MVP+3 slice.`,
        getAttributeValueSourceLocation(stylesheetXml, element, attributeName, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
        {
          attributeName,
          instructionName: "xsl:output"
        },
        {
          suggestions: [{
            kind: "fix",
            label: `remove ${attributeName} from xsl:output or omit xsl:output in the current MVP+3 slice`,
            confidence: 1
          }]
        },
        XTSE0090
      );
    }
    const suggestion = helpers.createAttributeSuggestion(localName, candidateAttributes);
    throw helpers.createXsltStaticError(
      `xsl:output has an unsupported attribute ${attributeName}.`,
      getAttributeValueSourceLocation(stylesheetXml, element, attributeName, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, attribute, helpers.stylesheetSourceName),
      {
        attributeName,
        instructionName: "xsl:output"
      },
      suggestion === void 0 ? {
        suggestions: [{
          kind: "fix",
          label: `remove ${attributeName} from xsl:output`,
          confidence: 1
        }]
      } : { suggestions: [suggestion] },
      XTSE0090
    );
  }
  const method = element.getAttribute("method");
  if (method === null) {
    return;
  }
  if (SUPPORTED_XSLT_OUTPUT_METHODS.includes(method)) {
    return;
  }
  if (KNOWN_LATER_XSLT_OUTPUT_METHODS.includes(method)) {
    throw helpers.createXsltStaticError(
      `xsl:output method ${JSON.stringify(method)} is not yet implemented in the current MVP+3 slice.`,
      getAttributeValueSourceLocation(stylesheetXml, element, "method", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        method,
        instructionName: "xsl:output"
      },
      {
        suggestions: [{
          kind: "fix",
          label: 'use method="xml" or omit xsl:output in the current MVP+3 slice',
          confidence: 1
        }]
      },
      XTSE0090
    );
  }
  const outputSuggestion = createOutputMethodSuggestion(method);
  throw helpers.createXsltStaticError(
    `xsl:output has an unsupported method ${JSON.stringify(method)}.`,
    getAttributeValueSourceLocation(stylesheetXml, element, "method", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
    {
      method,
      instructionName: "xsl:output"
    },
    outputSuggestion === void 0 ? {
      suggestions: [{
        kind: "fix",
        label: 'use method="xml" or omit xsl:output in the current MVP+3 slice',
        confidence: 1
      }]
    } : { suggestions: [outputSuggestion] },
    XTSE0090
  );
}
function collectNamedTemplateDisplayNames(root, stylesheetXml, helpers) {
  const namedTemplates = /* @__PURE__ */ new Map();
  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, "template")) {
      continue;
    }
    const rawName = child.getAttribute("name");
    if (rawName === null || rawName.length === 0) {
      continue;
    }
    namedTemplates.set(helpers.normalizeXsltQName(rawName, child, stylesheetXml, "name", "xsl:template"), rawName);
  }
  return namedTemplates;
}
function collectNamedTemplateSignatures(root, stylesheetXml, helpers) {
  const signatures = /* @__PURE__ */ new Map();
  for (const child of helpers.childElements(root)) {
    if (!helpers.isXsltElement(child, "template")) {
      continue;
    }
    const rawName = child.getAttribute("name");
    if (rawName === null || rawName.length === 0) {
      continue;
    }
    const normalizedName = helpers.normalizeXsltQName(rawName, child, stylesheetXml, "name", "xsl:template");
    const nonTunnelParams = /* @__PURE__ */ new Set();
    const nonTunnelParamDisplayNames = /* @__PURE__ */ new Map();
    const requiredNonTunnelParams = [];
    for (const paramElement of leadingTemplateParamElements(child)) {
      if (isTunnelParamElement(paramElement)) {
        continue;
      }
      const paramRawName = paramElement.getAttribute("name");
      if (paramRawName === null || paramRawName.length === 0) {
        continue;
      }
      const normalizedParamName = helpers.normalizeXsltQName(paramRawName, paramElement, stylesheetXml, "name", "xsl:param");
      nonTunnelParams.add(normalizedParamName);
      nonTunnelParamDisplayNames.set(normalizedParamName, paramRawName);
      if (parseRequiredAttribute(paramElement)) {
        requiredNonTunnelParams.push({ name: normalizedParamName });
      }
    }
    signatures.set(normalizedName, {
      nonTunnelParams,
      nonTunnelParamDisplayNames,
      requiredNonTunnelParams
    });
  }
  return signatures;
}
function stripClarkNotation(name) {
  if (!name.startsWith("{")) {
    return name;
  }
  const closingBrace = name.indexOf("}");
  return closingBrace < 0 ? name : name.slice(closingBrace + 1);
}
function canValidateCallTemplateWithParam(element, helpers) {
  if (!helpers.isXsltElement(element, "with-param")) {
    return false;
  }
  const name = element.getAttribute("name");
  if (name === null || name.length === 0) {
    return false;
  }
  const select = element.getAttribute("select") ?? void 0;
  return select === void 0 || !helpers.hasMeaningfulTemplateContent(element);
}
function createNamedTemplateReferenceSuggestion(rawName, namedTemplates) {
  const candidates = [...namedTemplates.values()];
  const nearest = candidates.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(rawName, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean xsl:call-template name="${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length
  };
}
function createCallTemplateParamSuggestion(rawName, declaredParams) {
  const candidates = [...declaredParams.values()];
  const nearest = candidates.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(rawName, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean xsl:with-param name="${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length
  };
}
function createOutputMethodSuggestion(rawMethod) {
  const candidates = [
    ...SUPPORTED_XSLT_OUTPUT_METHODS,
    ...KNOWN_LATER_XSLT_OUTPUT_METHODS
  ];
  const nearest = candidates.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(rawMethod, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean method="${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length
  };
}

// src/xslt/compile/topLevelCompilers.ts
function compileTopLevelVariableDeclaration(element, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:variable", ["as", "name", "select"]);
  const rawName = element.getAttribute("name");
  if (rawName === null || rawName.length === 0) {
    throw helpers.createXsltStaticError(
      "xsl:variable requires a name attribute.",
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'add a name="..." attribute to xsl:variable',
          replacement: 'name="..."',
          confidence: 1
        }]
      }
    );
  }
  const select = element.getAttribute("select") ?? void 0;
  helpers.assertNoSelectAndContent(
    element,
    stylesheetXml,
    select,
    "xsl:variable",
    "variableName",
    rawName
  );
  const body = select === void 0 && helpers.hasMeaningfulTemplateContent(element) ? helpers.compileInstructions(element.childNodes, stylesheetXml) : void 0;
  const selectLocation = select === void 0 ? void 0 : getAttributeValueSourceLocation(stylesheetXml, element, "select", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const location = getAttributeValueSourceLocation(stylesheetXml, element, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const name = helpers.normalizeXsltQName(rawName, element, stylesheetXml, "name", "xsl:variable");
  return {
    kind: "variable",
    name,
    ...select === void 0 ? {} : { select: helpers.parseXPathInContext(select, selectLocation, "xsl:variable", "select") },
    ...select === void 0 ? {} : { selectText: select },
    ...body === void 0 ? {} : { body },
    ...location === void 0 ? {} : { location }
  };
}
function compileTopLevelParamDeclaration(element, stylesheetXml, helpers) {
  const param = compileTemplateParamDeclaration(element, stylesheetXml, helpers);
  return {
    kind: "param",
    ...param
  };
}
function compileTemplateRuleDeclaration(templateElement, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(templateElement, stylesheetXml, "xsl:template", ["exclude-result-prefixes", "match", "mode", "name", "priority"]);
  const modeText = templateElement.getAttribute("mode");
  if (modeText !== null) {
    throw helpers.createXsltStaticError(
      "xsl:template mode is not yet implemented in the current MVP+3 slice.",
      getAttributeValueSourceLocation(stylesheetXml, templateElement, "mode", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, templateElement, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'remove mode="..." and use the default mode in the current MVP+3 slice',
          confidence: 1
        }]
      }
    );
  }
  const matchText = templateElement.getAttribute("match") ?? void 0;
  const rawName = templateElement.getAttribute("name") ?? void 0;
  const priorityText = templateElement.getAttribute("priority");
  const priority = priorityText === null ? void 0 : Number(priorityText);
  if (matchText === void 0 && rawName === void 0) {
    throw helpers.createXsltStaticError(
      "xsl:template must declare either match or name.",
      getNodeSourceLocation(stylesheetXml, templateElement, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'add match="..." or name="..." to xsl:template',
          confidence: 1
        }]
      }
    );
  }
  const matchLocation = matchText === void 0 ? void 0 : getAttributeValueSourceLocation(stylesheetXml, templateElement, "match", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, templateElement, helpers.stylesheetSourceName);
  const match = matchText === void 0 ? void 0 : helpers.parseXPathInContext(matchText, matchLocation, "xsl:template", "match", "template");
  if (match !== void 0 && !helpers.isSupportedTemplateMatch(match)) {
    throw helpers.createXsltStaticError(
      `Unsupported template match pattern ${JSON.stringify(matchText)} in current MVP+3 slice.`,
      matchLocation,
      {
        suggestions: [{
          kind: "fix",
          label: "use one of the currently supported child-only match patterns: /, /name, name, section/item, *, node(), or text()",
          confidence: 1
        }]
      }
    );
  }
  const location = matchText !== void 0 ? matchLocation : rawName !== void 0 ? getAttributeValueSourceLocation(stylesheetXml, templateElement, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, templateElement, helpers.stylesheetSourceName) : getNodeSourceLocation(stylesheetXml, templateElement, helpers.stylesheetSourceName);
  const name = rawName === void 0 ? void 0 : helpers.normalizeXsltQName(rawName, templateElement, stylesheetXml, "name", "xsl:template");
  const { params, body } = compileTemplateContentDeclaration(templateElement, stylesheetXml, helpers);
  return {
    ...match === void 0 ? {} : { match },
    ...matchText === void 0 ? {} : { matchText },
    ...location === void 0 ? {} : { location },
    ...name === void 0 ? {} : { name },
    modes: [],
    ...priority === void 0 || Number.isNaN(priority) ? {} : { priority },
    params,
    body
  };
}
function compileTemplateContentDeclaration(templateElement, stylesheetXml, helpers) {
  const params = [];
  const body = [];
  let seenBodyInstruction = false;
  for (let index = 0; index < templateElement.childNodes.length; index += 1) {
    const node = templateElement.childNodes.item(index);
    if (node === null) {
      continue;
    }
    if (node.nodeType === node.ELEMENT_NODE) {
      const element = node;
      if (helpers.isXsltElement(element, "param")) {
        if (seenBodyInstruction) {
          throw helpers.createXsltStaticError(
            "xsl:param must appear before other template content.",
            getElementNameSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName)
          );
        }
        const param = compileTemplateParamDeclaration(element, stylesheetXml, helpers);
        if (params.some((existing) => existing.name === param.name)) {
          throw helpers.createXsltStaticError(
            `xsl:template cannot declare duplicate xsl:param name ${param.name}.`,
            param.location ?? getAttributeValueSourceLocation(stylesheetXml, element, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
            {
              paramName: param.name
            },
            {
              suggestions: [{
                kind: "fix",
                label: `rename or remove one of the duplicate xsl:param declarations for ${param.name}`,
                confidence: 1
              }]
            },
            XTSE0580
          );
        }
        params.push(param);
        continue;
      }
    }
    const instruction = helpers.compileInstruction(node, stylesheetXml);
    if (instruction !== void 0) {
      seenBodyInstruction = true;
      body.push(instruction);
    }
  }
  return { params, body };
}
function compileTemplateParamDeclaration(element, stylesheetXml, helpers) {
  helpers.assertAllowedXsltAttributes(element, stylesheetXml, "xsl:param", ["as", "name", "required", "select", "tunnel"]);
  const rawName = element.getAttribute("name");
  if (rawName === null || rawName.length === 0) {
    throw helpers.createXsltStaticError(
      "xsl:param requires a name attribute.",
      getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'add a name="..." attribute to xsl:param',
          replacement: 'name="..."',
          confidence: 1
        }]
      }
    );
  }
  const select = element.getAttribute("select") ?? void 0;
  helpers.assertNoSelectAndContent(
    element,
    stylesheetXml,
    select,
    "xsl:param",
    "paramName",
    rawName
  );
  const required = helpers.parseRequiredAttribute(element);
  const requiredLocation = getAttributeValueSourceLocation(stylesheetXml, element, "required", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  if (required && select !== void 0) {
    throw helpers.createXsltStaticError(
      'xsl:param with required="yes" cannot also specify a select attribute.',
      requiredLocation,
      {
        paramName: rawName
      },
      {
        suggestions: [{
          kind: "fix",
          label: 'remove required="yes" or remove select="..." from xsl:param',
          confidence: 1
        }]
      }
    );
  }
  if (required && helpers.hasMeaningfulTemplateContent(element)) {
    throw helpers.createXsltStaticError(
      'xsl:param with required="yes" cannot also specify a sequence constructor.',
      requiredLocation,
      {
        paramName: rawName
      },
      {
        suggestions: [{
          kind: "fix",
          label: 'remove required="yes" or remove xsl:param content',
          confidence: 1
        }]
      }
    );
  }
  const body = select === void 0 && helpers.hasMeaningfulTemplateContent(element) ? helpers.compileInstructions(element.childNodes, stylesheetXml) : void 0;
  const asType = element.getAttribute("as") ?? void 0;
  const selectLocation = select === void 0 ? void 0 : getAttributeValueSourceLocation(stylesheetXml, element, "select", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const location = getAttributeValueSourceLocation(stylesheetXml, element, "name", helpers.stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, element, helpers.stylesheetSourceName);
  const name = helpers.normalizeXsltQName(rawName, element, stylesheetXml, "name", "xsl:param");
  return {
    name,
    ...asType === void 0 ? {} : { asType },
    ...required ? { required: true } : {},
    ...select === void 0 ? {} : { select: helpers.parseXPathInContext(select, selectLocation, "xsl:param", "select") },
    ...select === void 0 ? {} : { selectText: select },
    ...body === void 0 ? {} : { body },
    ...location === void 0 ? {} : { location }
  };
}

// src/xslt/compile/compiler.ts
function compileStylesheet(stylesheetXml, options = {}) {
  const stylesheetSourceName = options.sourceName ?? STYLESHEET_SOURCE_NAME;
  const stylesheetDocument = parseXml(stylesheetXml, {
    role: "stylesheet",
    sourceName: stylesheetSourceName
  });
  const root = stylesheetDocument.documentElement;
  if (root === null) {
    throw createXsltStaticError("Stylesheet has no document element.");
  }
  if (!isXsltElement(root, "stylesheet") && !isXsltElement(root, "transform")) {
    throw createXsltStaticError(
      "Stylesheet document element must be xsl:stylesheet or xsl:transform.",
      getNodeSourceLocation(stylesheetXml, root, stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: "wrap the stylesheet in an xsl:stylesheet or xsl:transform document element",
          confidence: 1
        }]
      }
    );
  }
  const { namespaces, defaultElementNamespace } = collectStylesheetStaticContext(root);
  const compilerHelpers = createCompilerHelpers(stylesheetSourceName, namespaces, options.extensionFunctions ?? /* @__PURE__ */ new Map());
  validateStylesheetRootAttributes(root, stylesheetXml, compilerHelpers.stylesheetHelpers);
  const version = root.getAttribute("version");
  if (version === null || version.length === 0) {
    throw createXsltStaticError(
      "Stylesheet module must declare a version attribute.",
      getAttributeValueSourceLocation(stylesheetXml, root, "version", stylesheetSourceName) ?? getNodeSourceLocation(stylesheetXml, root, stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: 'add version="3.0" to the stylesheet document element',
          replacement: 'version="3.0"',
          confidence: 1
        }]
      },
      XTSE0500
    );
  }
  assertNoDuplicateNamedTemplates(root, stylesheetXml, compilerHelpers.stylesheetHelpers);
  assertNoDuplicateGlobalBindings(root, stylesheetXml, compilerHelpers.stylesheetHelpers);
  assertNoUnknownCalledTemplates(root, stylesheetXml, compilerHelpers.stylesheetHelpers);
  assertNoInvalidCallTemplateParams(root, stylesheetXml, compilerHelpers.stylesheetHelpers);
  const templates = [];
  const globalBindings = [];
  const location = getNodeSourceLocation(stylesheetXml, root, stylesheetSourceName);
  for (const child of childElements(root)) {
    const declaration = compileTopLevelDeclaration(child, stylesheetXml, compilerHelpers.stylesheetHelpers);
    if (declaration === void 0) {
      continue;
    }
    if ("body" in declaration && "modes" in declaration) {
      templates.push(declaration);
      continue;
    }
    globalBindings.push(declaration);
  }
  if (templates.length === 0) {
    throw createXsltStaticError(
      "Stylesheet must declare at least one xsl:template.",
      getNodeSourceLocation(stylesheetXml, root, stylesheetSourceName),
      {
        suggestions: [{
          kind: "fix",
          label: "add at least one xsl:template to the stylesheet",
          confidence: 1
        }]
      }
    );
  }
  return {
    version: STYLESHEET_IR_VERSION,
    xsltVersion: "3.0",
    ...location === void 0 ? {} : { location },
    namespaces,
    defaultElementNamespace,
    globalBindings,
    templates
  };
}
function createCompilerHelpers(stylesheetSourceName, namespaces, extensionFunctions) {
  const parseXPathInCompileContext = (expression, location, ownerName, attributeName, frameKind) => {
    const ast = parseXPathInContext(expression, location, ownerName, attributeName, frameKind);
    validateXPathFunctionCalls(ast, {
      expressionText: expression,
      ownerName,
      attributeName,
      namespaces,
      extensionFunctions,
      ...location === void 0 ? {} : { expressionLocation: location },
      ...frameKind === void 0 ? {} : { frameKind }
    });
    return ast;
  };
  const baseCompilerHelpers = {
    stylesheetSourceName,
    isXsltElement,
    assertAllowedXsltAttributes,
    createXsltStaticError,
    parseXPathInContext: parseXPathInCompileContext,
    normalizeXsltQName,
    assertNoSelectAndContent,
    hasMeaningfulTemplateContent
  };
  const instructionEntrypointHelpers = {
    ...baseCompilerHelpers,
    xsltNamespace: XSLT_NAMESPACE,
    childElements,
    assertNoDuplicateWithParam,
    createInstructionSuggestion
  };
  const { compileInstructions, compileInstruction } = createInstructionEntrypoints(instructionEntrypointHelpers);
  const topLevelHelpers = {
    ...baseCompilerHelpers,
    compileInstructions,
    compileInstruction,
    isSupportedTemplateMatch,
    parseRequiredAttribute
  };
  function compileTopLevelVariable(element, localStylesheetXml) {
    return compileTopLevelVariableDeclaration(element, localStylesheetXml, topLevelHelpers);
  }
  function compileTopLevelParam(element, localStylesheetXml) {
    return compileTopLevelParamDeclaration(element, localStylesheetXml, topLevelHelpers);
  }
  function compileTemplateRule(templateElement, localStylesheetXml) {
    return compileTemplateRuleDeclaration(templateElement, localStylesheetXml, topLevelHelpers);
  }
  const stylesheetHelpers = {
    ...baseCompilerHelpers,
    xsltNamespace: XSLT_NAMESPACE,
    xmlnsNamespace: XMLNS_NAMESPACE,
    createAttributeSuggestion,
    childElements,
    compileTemplateRule,
    compileTopLevelParam,
    compileTopLevelVariable
  };
  return {
    topLevelHelpers,
    stylesheetHelpers
  };
}

// src/xslt/codegen/plan.ts
function createEmitPlan(ir, options) {
  return {
    stylesheet: ir,
    moduleSpecifier: options.runtimeModuleSpecifier ?? "@arakendo/weaver-xslt/runtime",
    sourcePath: options.path ?? "<stylesheet>",
    digest: options.digest,
    serializedIr: JSON.stringify(ir, null, 2)
  };
}

// src/xslt/codegen/ts-ir.ts
function tsRawExpression(code) {
  return { code };
}
function tsStringLiteral(value) {
  return { code: JSON.stringify(value) };
}
function tsCallExpression(callee, args) {
  return {
    code: `${callee}(${args.map((arg) => arg.code).join(", ")})`
  };
}
function tsBinaryExpression(left, operator, right) {
  return {
    code: `(${left.code} ${operator} ${right.code})`
  };
}
function tsConditionalExpression(test, whenTrue, whenFalse) {
  return {
    code: `(${test.code} ? ${whenTrue.code} : ${whenFalse.code})`
  };
}
function tsConcatExpression(expressions) {
  const nonEmptyExpressions = expressions.filter((expression) => expression.code.length > 0 && expression.code !== '""');
  if (nonEmptyExpressions.length === 0) {
    return tsStringLiteral("");
  }
  if (nonEmptyExpressions.length === 1) {
    return nonEmptyExpressions[0] ?? tsStringLiteral("");
  }
  return {
    code: nonEmptyExpressions.map((expression) => expression.code).join(" +\n    ")
  };
}
function renderTsExpression(expression) {
  return expression.code;
}
function renderTsModule(module) {
  return `${module.statements.join("\n")}
`;
}

// src/xslt/codegen/provenance.ts
function renderTemplateProvenanceComment(template, sourcePath) {
  return renderLocationComment(
    template.matchText !== void 0 ? `match=${JSON.stringify(template.matchText)}` : template.name !== void 0 ? `name=${JSON.stringify(template.name)}` : "template",
    template.location,
    sourcePath
  );
}
function renderInstructionProvenanceComment(instruction, sourcePath) {
  const label = instructionLabel(instruction);
  if (label === void 0) {
    return void 0;
  }
  return renderLocationComment(label, instruction.location, sourcePath);
}
function renderWhenProvenanceComment(branch, sourcePath) {
  return renderLocationComment("xsl:when", branch.location, sourcePath);
}
function renderOtherwiseProvenanceComment(location, sourcePath) {
  return renderLocationComment("xsl:otherwise", location, sourcePath);
}
function renderCommentedArrowFunction(comment, parameters, bodyCode) {
  return `${parameters} => (
  ${comment}
  ${bodyCode}
)`;
}
function renderLocationComment(label, location, sourcePath) {
  const source = sourcePath ?? location?.source;
  const line = location?.line;
  const locationLabel = source === void 0 ? void 0 : line === void 0 ? source : `${source}:${line}`;
  return locationLabel === void 0 ? `/** ${label} */` : `/** ${label} (${locationLabel}) */`;
}
function instructionLabel(instruction) {
  switch (instruction.kind) {
    case "literalElement":
      return `literal ${instruction.name}`;
    case "comment":
      return "xsl:comment";
    case "valueOf":
      return "xsl:value-of";
    case "applyTemplates":
      return "xsl:apply-templates";
    case "if":
      return "xsl:if";
    case "forEach":
      return "xsl:for-each";
    case "callTemplate":
      return "xsl:call-template";
    case "choose":
      return "xsl:choose";
    default:
      return void 0;
  }
}

// src/xslt/codegen/nativeApplyTemplates.ts
function tryGetRootApplyTemplatesShape(ir) {
  if (ir.templates.length !== 2) {
    return void 0;
  }
  const rootTemplate = ir.templates.find((template) => isRootTemplateShape(template));
  const childTemplate = ir.templates.find((template) => template !== rootTemplate);
  if (rootTemplate === void 0 || childTemplate === void 0) {
    return void 0;
  }
  const childMatchPath = getSimpleMatchPath(childTemplate);
  if (childMatchPath === void 0) {
    return void 0;
  }
  return {
    rootTemplate,
    childTemplate,
    childMatchAbsolute: childTemplate.match?.kind === "path" ? childTemplate.match.absolute : false,
    childMatchPath
  };
}
function tryGetRootApplyTemplatesPlan(ir) {
  const rootTemplate = ir.templates.find((template) => isRootTemplateShape(template));
  if (rootTemplate === void 0) {
    return void 0;
  }
  const rootApplyTemplates = findSingleApplyTemplatesInstruction(rootTemplate.body);
  if (rootApplyTemplates === void 0) {
    return void 0;
  }
  const remainingTemplates = ir.templates.filter((template) => template !== rootTemplate);
  if (remainingTemplates.length === 0) {
    return void 0;
  }
  const childPlan = tryBuildApplyTemplatesTemplatePlan(rootApplyTemplates, remainingTemplates);
  if (childPlan === void 0) {
    return void 0;
  }
  return {
    rootTemplate,
    childPlans: childPlan.plans
  };
}
function emitPlannedApplyTemplatesInstruction(instruction, childPlans, contextNodeIdentifier, runtimeHelpers, emitInstructionSequence2, tryGetSimpleChildPath2, createTemplateInvocationSetup, context = {}, sourcePath) {
  if (childPlans.length === 0) {
    return void 0;
  }
  const childTemplateCallbacks = childPlans.map((childPlan) => {
    const invocationSetup = createTemplateInvocationSetup(
      childPlan.template.params,
      instruction.withParams,
      runtimeHelpers,
      context.variableBindings,
      contextNodeIdentifier,
      "templateNode",
      context.positionExpression,
      context.lastExpression
    );
    if (invocationSetup === void 0) {
      return void 0;
    }
    const nestedPlans = childPlan.nestedPlans;
    const childCallbackParameters = "(templateNode, templateIndex, templateNodes)";
    const childBody = emitInstructionSequence2(childPlan.template.body, runtimeHelpers, nestedPlans === void 0 ? {
      contextNodeIdentifier: "templateNode",
      positionExpression: "(templateIndex + 1)",
      lastExpression: "templateNodes.length",
      variableBindings: invocationSetup.variableBindings
    } : {
      contextNodeIdentifier: "templateNode",
      positionExpression: "(templateIndex + 1)",
      lastExpression: "templateNodes.length",
      variableBindings: invocationSetup.variableBindings,
      renderApplyTemplates: (nestedInstruction, nestedContextNodeIdentifier, nestedContext) => emitPlannedApplyTemplatesInstruction(
        nestedInstruction,
        nestedPlans,
        nestedContextNodeIdentifier,
        runtimeHelpers,
        emitInstructionSequence2,
        tryGetSimpleChildPath2,
        createTemplateInvocationSetup,
        {
          ...nestedContext.positionExpression === void 0 ? {} : { positionExpression: nestedContext.positionExpression },
          ...nestedContext.lastExpression === void 0 ? {} : { lastExpression: nestedContext.lastExpression },
          variableBindings: invocationSetup.variableBindings
        },
        sourcePath
      )
    });
    if (childBody === void 0) {
      return void 0;
    }
    const callbackBody = invocationSetup.setupStatements.length === 0 ? childBody.code : `(() => {
${invocationSetup.setupStatements.map((statement) => `  ${statement}`).join("\n")}
  return ${childBody.code};
})()`;
    return {
      plan: childPlan,
      callback: renderCommentedArrowFunction(
        renderTemplateProvenanceComment(childPlan.template, sourcePath),
        childCallbackParameters,
        callbackBody
      )
    };
  });
  if (childTemplateCallbacks.some((callback) => callback === void 0)) {
    return void 0;
  }
  const definedCallbacks = childTemplateCallbacks.filter((callback) => callback !== void 0);
  const renderMatchedNode = definedCallbacks.length === 1 ? definedCallbacks[0].callback : (() => {
    runtimeHelpers.add("matchesTemplatePath");
    const dispatchLines = definedCallbacks.map(
      ({ plan, callback }) => `if (matchesTemplatePath(templateNode, ${JSON.stringify(plan.matchPath)}, ${plan.matchAbsolute ? "true" : "false"})) { return (${callback})(templateNode); }`
    );
    return ["(templateNode) => {", ...dispatchLines.map((line) => `  ${line}`), '  return "";', "}"].join("\n");
  })();
  if (instruction.select === void 0) {
    runtimeHelpers.add("applyBuiltInTemplatesByPath");
    return tsRawExpression(
      childPlans.every((childPlan) => childPlan.matchAbsolute) ? `applyBuiltInTemplatesByPath(document, ${JSON.stringify(childPlans[0].matchPath)}, ${renderMatchedNode}, true)` : `applyBuiltInTemplatesByPath(${contextNodeIdentifier}, ${JSON.stringify(childPlans[0].matchPath)}, ${renderMatchedNode})`
    );
  }
  const selectPath = getSimpleSelectPath(instruction.select);
  if (selectPath === void 0 || !childPlans.some((childPlan) => selectPathMatchesTemplate(selectPath.steps, childPlan.matchPath, childPlan.matchAbsolute))) {
    return void 0;
  }
  runtimeHelpers.add("selectSimplePathNodesByStepPlan");
  return tsRawExpression(
    `selectSimplePathNodesByStepPlan(${selectPath.absolute ? "document" : contextNodeIdentifier}, ${JSON.stringify(selectPath.steps)}).map(${renderMatchedNode}).join("")`
  );
}
function tryBuildApplyTemplatesTemplatePlan(instruction, templates) {
  const candidates = getTemplateMatchCandidates(templates);
  if (candidates === void 0) {
    return void 0;
  }
  const matchingCandidates = sortMatchingCandidates(getMatchingApplyTemplatesCandidates(instruction, candidates));
  if (matchingCandidates.length === 0) {
    return void 0;
  }
  const matchedTemplates = new Set(matchingCandidates.map((candidate) => candidate.template));
  const remainingTemplates = templates.filter((template) => !matchedTemplates.has(template));
  const plans = [];
  for (const matchedCandidate of matchingCandidates) {
    const nestedInstruction = findSingleApplyTemplatesInstruction(matchedCandidate.template.body);
    if (nestedInstruction === void 0) {
      plans.push({
        template: matchedCandidate.template,
        matchAbsolute: matchedCandidate.matchAbsolute,
        matchPath: matchedCandidate.matchPath
      });
      continue;
    }
    const nestedPlan = tryBuildApplyTemplatesTemplatePlan(nestedInstruction, remainingTemplates);
    if (nestedPlan === void 0) {
      return void 0;
    }
    plans.push({
      template: matchedCandidate.template,
      matchAbsolute: matchedCandidate.matchAbsolute,
      matchPath: matchedCandidate.matchPath,
      nestedPlans: nestedPlan.plans
    });
  }
  return {
    plans,
    remainingTemplates
  };
}
function getTemplateMatchCandidates(templates) {
  const candidates = templates.map((template, templateIndex) => {
    const matchPath = getSimpleMatchPath(template);
    if (matchPath === void 0) {
      return void 0;
    }
    return {
      template,
      matchAbsolute: template.match?.kind === "path" ? template.match.absolute : false,
      matchPath,
      priority: getTemplatePriority(template),
      templateIndex
    };
  });
  if (candidates.some((candidate) => candidate === void 0)) {
    return void 0;
  }
  return candidates.filter((candidate) => candidate !== void 0);
}
function getMatchingApplyTemplatesCandidates(instruction, candidates) {
  if (instruction.select === void 0) {
    const absoluteCandidates = candidates.filter((candidate) => candidate.matchAbsolute);
    if (absoluteCandidates.length > 0) {
      return absoluteCandidates;
    }
    const relativeCandidates = candidates.filter((candidate) => !candidate.matchAbsolute);
    const maxLength = relativeCandidates.reduce((currentMax, candidate) => Math.max(currentMax, candidate.matchPath.length), 0);
    return relativeCandidates.filter((candidate) => candidate.matchPath.length === maxLength);
  }
  const selectPath = getSimpleSelectPath(instruction.select);
  if (selectPath === void 0) {
    return [];
  }
  return candidates.filter(
    (candidate) => selectPathMatchesTemplate(selectPath.steps, candidate.matchPath, candidate.matchAbsolute)
  );
}
function sortMatchingCandidates(candidates) {
  return [...candidates].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }
    return right.templateIndex - left.templateIndex;
  });
}
function isRootTemplateShape(template) {
  return template.name === void 0 && template.modes.length === 0 && template.params.length === 0 && template.match !== void 0 && template.match.kind === "path" && template.match.absolute && template.match.base === void 0 && template.match.steps.length === 0;
}
function getSimpleMatchPath(template) {
  if (template.name !== void 0 || template.modes.length > 0 || template.match === void 0 || template.match.kind !== "path" || template.match.base !== void 0 || template.match.steps.length === 0) {
    return void 0;
  }
  const path = [];
  for (const step of template.match.steps) {
    if (step.kind !== "step" || step.axis !== "child" || step.predicates.length > 0) {
      return void 0;
    }
    if (step.nodeTest.kind === "nameTest") {
      if (step.nodeTest.name.includes(":")) {
        return void 0;
      }
      path.push(step.nodeTest.name);
      continue;
    }
    if (step.nodeTest.kind === "wildcardTest") {
      path.push("*");
      continue;
    }
    return void 0;
  }
  return path;
}
function getTemplatePriority(template) {
  if (template.priority !== void 0) {
    return template.priority;
  }
  if (template.match === void 0 || template.match.kind !== "path") {
    return Number.NEGATIVE_INFINITY;
  }
  if (isRootTemplateShape(template)) {
    return 0.5;
  }
  const match = template.match;
  if (match.base !== void 0 || match.steps.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }
  if (match.absolute) {
    return 0.5;
  }
  const step = match.steps[match.steps.length - 1];
  if (step?.kind !== "step") {
    return Number.NEGATIVE_INFINITY;
  }
  if (step.nodeTest.kind === "nameTest") {
    return 0;
  }
  if (step.nodeTest.kind === "wildcardTest") {
    return -0.5;
  }
  if (step.nodeTest.kind === "kindTest" && (step.nodeTest.name === "node" || step.nodeTest.name === "text")) {
    return -0.5;
  }
  return Number.NEGATIVE_INFINITY;
}
function selectPathMatchesTemplate(selectPath, templatePath, templateIsAbsolute) {
  const selectSegments = selectPath.map((step) => typeof step === "string" ? step : step.name);
  if (templateIsAbsolute) {
    return selectSegments.length === templatePath.length && pathsOverlapAtOffset(selectSegments, templatePath, 0);
  }
  return selectSegments.length >= templatePath.length && pathsOverlapAtOffset(selectSegments, templatePath, selectSegments.length - templatePath.length);
}
function pathsOverlapAtOffset(path, suffix, offset) {
  for (let index = 0; index < suffix.length; index += 1) {
    if (!segmentsOverlap(path[offset + index], suffix[index])) {
      return false;
    }
  }
  return true;
}
function segmentsOverlap(left, right) {
  if (left === void 0 || right === void 0) {
    return false;
  }
  return left === "*" || right === "*" || left === right;
}
function findSingleApplyTemplatesInstruction(instructions) {
  const matches = [];
  const visit = (items) => {
    for (const instruction of items) {
      switch (instruction.kind) {
        case "applyTemplates":
          matches.push(instruction);
          break;
        case "literalElement":
        case "if":
        case "forEach":
          visit(instruction.body);
          break;
        case "choose":
          for (const branch of instruction.whenBranches) {
            visit(branch.body);
          }
          if (instruction.otherwiseBody !== void 0) {
            visit(instruction.otherwiseBody);
          }
          break;
        default:
          break;
      }
    }
  };
  visit(instructions);
  return matches.length === 1 ? matches[0] : void 0;
}
function getSimpleSelectPath(ast) {
  if (!("kind" in ast) || ast.kind !== "path" || ast.base !== void 0) {
    return void 0;
  }
  const steps = [];
  for (const step of ast.steps) {
    if (step.kind !== "step" || step.axis !== "child" || step.predicates.length > 1) {
      return void 0;
    }
    const predicate = step.predicates[0];
    const predicatePlan = predicate === void 0 ? {} : tryGetSupportedStepPositionPredicate(predicate);
    if (predicate !== void 0 && predicatePlan === void 0) {
      return void 0;
    }
    if (step.nodeTest.kind === "nameTest") {
      if (step.nodeTest.name.includes(":")) {
        return void 0;
      }
      steps.push({ name: step.nodeTest.name, ...predicatePlan ?? {} });
      continue;
    }
    if (step.nodeTest.kind === "wildcardTest") {
      steps.push({ name: "*", ...predicatePlan ?? {} });
      continue;
    }
    return void 0;
  }
  return {
    absolute: ast.absolute,
    steps
  };
}
function tryGetSupportedStepPositionPredicate(predicate) {
  if (predicate.kind === "number") {
    return Number.isInteger(predicate.value) && predicate.value >= 1 ? { position: predicate.value } : void 0;
  }
  if (isZeroArgFunctionCall(predicate, "last")) {
    return { position: "last" };
  }
  if (predicate.kind === "functionCall" && predicate.callee === "not" && predicate.arguments.length === 1) {
    const [argument] = predicate.arguments;
    return argument === void 0 ? void 0 : tryGetSupportedNegatedStepPositionPredicate(argument);
  }
  if (predicate.kind !== "binary") {
    return void 0;
  }
  if (predicate.operator === "and") {
    const leftPlan = tryGetSupportedStepPositionPredicate(predicate.left);
    const rightPlan = tryGetSupportedStepPositionPredicate(predicate.right);
    return leftPlan === void 0 || rightPlan === void 0 ? void 0 : mergeSupportedStepPositionPlans(leftPlan, rightPlan);
  }
  if (predicate.operator === "or") {
    const leftPlan = tryGetSupportedStepPositionPredicate(predicate.left);
    const rightPlan = tryGetSupportedStepPositionPredicate(predicate.right);
    return leftPlan === void 0 || rightPlan === void 0 ? void 0 : unionSupportedStepPositionPlans(leftPlan, rightPlan);
  }
  const leftPosition = isZeroArgFunctionCall(predicate.left, "position");
  const rightPosition = isZeroArgFunctionCall(predicate.right, "position");
  const leftLast = isZeroArgFunctionCall(predicate.left, "last");
  const rightLast = isZeroArgFunctionCall(predicate.right, "last");
  const leftNumber = predicate.left.kind === "number" ? predicate.left.value : void 0;
  const rightNumber = predicate.right.kind === "number" ? predicate.right.value : void 0;
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  const moduloPlan = tryGetSupportedPositionModuloComparison(predicate);
  const lastDivisorPlan = tryGetSupportedPositionLastDivisorComparison(predicate);
  const lastDivisorRangePlan = tryGetSupportedPositionLastDivisorRangeComparison(predicate);
  const lastOffsetPlan = tryGetSupportedPositionLastOffsetComparison(predicate);
  const lastRangePlan = tryGetSupportedPositionLastRangeComparison(predicate);
  if (moduloPlan !== void 0) {
    return moduloPlan;
  }
  if (lastDivisorPlan !== void 0) {
    return lastDivisorPlan;
  }
  if (lastDivisorRangePlan !== void 0) {
    return lastDivisorRangePlan;
  }
  if (lastOffsetPlan !== void 0) {
    return lastOffsetPlan;
  }
  if (lastRangePlan !== void 0) {
    return lastRangePlan;
  }
  if (operator !== void 0 && leftPosition && rightNumber !== void 0) {
    return createSupportedStepPositionComparison(operator, rightNumber);
  }
  if (operator !== void 0 && rightPosition && leftNumber !== void 0) {
    return createSupportedStepPositionComparison(reverseComparisonOperator(operator), leftNumber);
  }
  if (leftPosition && rightLast || leftLast && rightPosition) {
    return operator === void 0 ? void 0 : createSupportedPositionLastComparison(operator);
  }
  return void 0;
}
function createSupportedStepPositionComparison(operator, value) {
  if (!Number.isInteger(value) || value < 1) {
    return void 0;
  }
  switch (operator) {
    case "=":
    case "eq":
      return { position: value };
    case ">":
    case "gt":
      return { minimumPosition: value + 1 };
    case ">=":
    case "ge":
      return { minimumPosition: value };
    case "<":
    case "lt":
      return value === 1 ? { maximumPosition: 0 } : { maximumPosition: value - 1 };
    case "<=":
    case "le":
      return { maximumPosition: value };
    case "!=":
    case "ne":
      return { excludedPosition: value };
    default:
      return void 0;
  }
}
function tryGetSupportedNegatedStepPositionPredicate(predicate) {
  if (predicate.kind === "functionCall" && predicate.callee === "not" && predicate.arguments.length === 1) {
    const [argument] = predicate.arguments;
    return argument === void 0 ? void 0 : tryGetSupportedStepPositionPredicate(argument);
  }
  if (predicate.kind === "binary" && predicate.operator === "or") {
    const leftPlan = tryGetSupportedNegatedStepPositionPredicate(predicate.left);
    const rightPlan = tryGetSupportedNegatedStepPositionPredicate(predicate.right);
    return leftPlan === void 0 || rightPlan === void 0 ? void 0 : mergeSupportedStepPositionPlans(leftPlan, rightPlan);
  }
  if (predicate.kind === "binary" && predicate.operator === "and") {
    const leftPlan = tryGetSupportedNegatedStepPositionPredicate(predicate.left);
    const rightPlan = tryGetSupportedNegatedStepPositionPredicate(predicate.right);
    return leftPlan === void 0 || rightPlan === void 0 ? void 0 : unionSupportedStepPositionPlans(leftPlan, rightPlan);
  }
  const negatedLastOffsetPlan = tryGetSupportedNegatedPositionLastOffsetComparison(predicate);
  if (negatedLastOffsetPlan !== void 0) {
    return negatedLastOffsetPlan;
  }
  const negatedLastDivisorPlan = tryGetSupportedNegatedPositionLastDivisorComparison(predicate);
  if (negatedLastDivisorPlan !== void 0) {
    return negatedLastDivisorPlan;
  }
  const negatedLastDivisorRangePlan = tryGetSupportedNegatedPositionLastDivisorRangeComparison(predicate);
  if (negatedLastDivisorRangePlan !== void 0) {
    return negatedLastDivisorRangePlan;
  }
  const negatedLastRangePlan = tryGetSupportedNegatedPositionLastRangeComparison(predicate);
  if (negatedLastRangePlan !== void 0) {
    return negatedLastRangePlan;
  }
  const negatedModuloPlan = tryGetSupportedNegatedPositionModuloComparison(predicate);
  if (negatedModuloPlan !== void 0) {
    return negatedModuloPlan;
  }
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const leftPosition = isZeroArgFunctionCall(predicate.left, "position");
  const rightPosition = isZeroArgFunctionCall(predicate.right, "position");
  const leftLast = isZeroArgFunctionCall(predicate.left, "last");
  const rightLast = isZeroArgFunctionCall(predicate.right, "last");
  const leftNumber = predicate.left.kind === "number" ? predicate.left.value : void 0;
  const rightNumber = predicate.right.kind === "number" ? predicate.right.value : void 0;
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== void 0 && leftPosition && rightNumber !== void 0) {
    return createSupportedStepPositionComparison(negateComparisonOperator(operator), rightNumber);
  }
  if (operator !== void 0 && rightPosition && leftNumber !== void 0) {
    return createSupportedStepPositionComparison(reverseComparisonOperator(negateComparisonOperator(operator)), leftNumber);
  }
  if (operator !== void 0 && (leftPosition && rightLast || leftLast && rightPosition)) {
    return createSupportedPositionLastComparison(negateComparisonOperator(operator));
  }
  return void 0;
}
function negateComparisonOperator(operator) {
  switch (operator) {
    case "=":
      return "!=";
    case "eq":
      return "ne";
    case "!=":
      return "=";
    case "ne":
      return "eq";
    case "<":
      return ">=";
    case "lt":
      return "ge";
    case "<=":
      return ">";
    case "le":
      return "gt";
    case ">":
      return "<=";
    case "gt":
      return "le";
    case ">=":
      return "<";
    case "ge":
      return "lt";
  }
}
function createSupportedPositionLastComparison(operator) {
  switch (operator) {
    case "=":
    case "eq":
      return { position: "last" };
    case "!=":
    case "ne":
    case "<":
    case "lt":
      return { maximumPositionFromLastOffset: 1 };
    case ">=":
    case "ge":
      return { position: "last" };
    case "<=":
    case "le":
      return {};
    case ">":
    case "gt":
      return { maximumPosition: 0 };
  }
}
function tryGetSupportedNegatedPositionLastOffsetComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== "=" && operator !== "eq" && operator !== "!=" && operator !== "ne") {
    return void 0;
  }
  if (isZeroArgFunctionCall(predicate.left, "position")) {
    const lastOffset = tryGetLastOffsetValue(predicate.right);
    return lastOffset === void 0 ? void 0 : createSupportedNegatedPositionLastOffsetComparison(operator, lastOffset);
  }
  if (isZeroArgFunctionCall(predicate.right, "position")) {
    const lastOffset = tryGetLastOffsetValue(predicate.left);
    return lastOffset === void 0 ? void 0 : createSupportedNegatedPositionLastOffsetComparison(operator, lastOffset);
  }
  return void 0;
}
function createSupportedNegatedPositionLastOffsetComparison(operator, lastOffset) {
  switch (operator) {
    case "=":
    case "eq":
      return createSupportedNegatedPositionLastOffsetPlan(lastOffset);
    case "!=":
    case "ne":
      return { positionFromLastOffset: lastOffset };
  }
  return void 0;
}
function createSupportedNegatedPositionLastOffsetPlan(lastOffset) {
  if (lastOffset === 0) {
    return { maximumPositionFromLastOffset: 1 };
  }
  return {
    alternatives: [
      { maximumPositionFromLastOffset: lastOffset + 1 },
      { includedPositionFromLastOffsets: Array.from({ length: lastOffset }, (_, index) => index) }
    ]
  };
}
function tryGetSupportedNegatedPositionLastRangeComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator === void 0) {
    return void 0;
  }
  if (isZeroArgFunctionCall(predicate.left, "position")) {
    return createSupportedNegatedPositionLastRangePlan(operator, predicate.right);
  }
  if (isZeroArgFunctionCall(predicate.right, "position")) {
    return createSupportedNegatedPositionLastRangePlan(reverseComparisonOperator(operator), predicate.left);
  }
  return void 0;
}
function createSupportedNegatedPositionLastRangePlan(operator, ast) {
  const lastOffset = tryGetLastOffsetValue(ast);
  if (lastOffset === void 0) {
    return void 0;
  }
  switch (operator) {
    case "<":
    case "lt":
      return { includedPositionFromLastOffsets: Array.from({ length: lastOffset + 1 }, (_, index) => index) };
    case "<=":
    case "le":
      return lastOffset === 0 ? { maximumPosition: 0 } : { includedPositionFromLastOffsets: Array.from({ length: lastOffset }, (_, index) => index) };
    case ">":
    case "gt":
      return { maximumPositionFromLastOffset: lastOffset };
    case ">=":
    case "ge":
      return { maximumPositionFromLastOffset: lastOffset + 1 };
    default:
      return void 0;
  }
}
function tryGetSupportedNegatedPositionModuloComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== "=" && operator !== "eq") {
    return void 0;
  }
  const leftModuloDivisor = tryGetPositionModuloDivisor(predicate.left);
  const rightModuloDivisor = tryGetPositionModuloDivisor(predicate.right);
  const leftNumber = predicate.left.kind === "number" ? predicate.left.value : void 0;
  const rightNumber = predicate.right.kind === "number" ? predicate.right.value : void 0;
  if (leftModuloDivisor !== void 0 && rightNumber !== void 0) {
    return createSupportedNegatedModuloPlan(leftModuloDivisor, rightNumber);
  }
  if (rightModuloDivisor !== void 0 && leftNumber !== void 0) {
    return createSupportedNegatedModuloPlan(rightModuloDivisor, leftNumber);
  }
  return void 0;
}
function createSupportedNegatedModuloPlan(divisor, remainder) {
  if (!Number.isInteger(remainder) || remainder < 0 || remainder >= divisor) {
    return void 0;
  }
  const alternatives = [];
  for (let candidateRemainder = 0; candidateRemainder < divisor; candidateRemainder += 1) {
    if (candidateRemainder === remainder) {
      continue;
    }
    alternatives.push({
      positionModuloDivisor: divisor,
      positionModuloRemainder: candidateRemainder
    });
  }
  return alternatives.length === 0 ? { maximumPosition: 0 } : { alternatives };
}
function tryGetSupportedPositionModuloComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== "=" && operator !== "eq") {
    return void 0;
  }
  const leftModuloDivisor = tryGetPositionModuloDivisor(predicate.left);
  const rightModuloDivisor = tryGetPositionModuloDivisor(predicate.right);
  const leftNumber = predicate.left.kind === "number" ? predicate.left.value : void 0;
  const rightNumber = predicate.right.kind === "number" ? predicate.right.value : void 0;
  if (leftModuloDivisor !== void 0 && rightNumber !== void 0) {
    return createSupportedPositionModuloPlan(leftModuloDivisor, rightNumber);
  }
  if (rightModuloDivisor !== void 0 && leftNumber !== void 0) {
    return createSupportedPositionModuloPlan(rightModuloDivisor, leftNumber);
  }
  return void 0;
}
function reverseComparisonOperator(operator) {
  switch (operator) {
    case ">":
      return "<";
    case "gt":
      return "lt";
    case ">=":
      return "<=";
    case "ge":
      return "le";
    case "<":
      return ">";
    case "lt":
      return "gt";
    case "<=":
      return ">=";
    case "le":
      return "ge";
    default:
      return operator;
  }
}
function getSupportedPositionComparisonOperator(operator) {
  switch (operator) {
    case "=":
    case "eq":
    case ">":
    case "gt":
    case ">=":
    case "ge":
    case "<":
    case "lt":
    case "<=":
    case "le":
    case "!=":
    case "ne":
      return operator;
    default:
      return void 0;
  }
}
function isZeroArgFunctionCall(ast, callee) {
  return ast.kind === "functionCall" && ast.callee === callee && ast.arguments.length === 0;
}
function tryGetPositionModuloDivisor(ast) {
  if (ast.kind !== "binary" || ast.operator !== "mod") {
    return void 0;
  }
  if (!isZeroArgFunctionCall(ast.left, "position") || ast.right.kind !== "number") {
    return void 0;
  }
  const divisor = ast.right.value;
  if (!Number.isInteger(divisor) || divisor <= 0) {
    return void 0;
  }
  return divisor;
}
function createSupportedPositionModuloPlan(divisor, remainder) {
  if (!Number.isInteger(remainder) || remainder < 0 || remainder >= divisor) {
    return void 0;
  }
  return {
    positionModuloDivisor: divisor,
    positionModuloRemainder: remainder
  };
}
function tryGetSupportedPositionLastDivisorComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== "=" && operator !== "eq" && operator !== "!=" && operator !== "ne") {
    return void 0;
  }
  if (isZeroArgFunctionCall(predicate.left, "position")) {
    const value = tryGetLastDivisorPolynomialValue(predicate.right);
    return value === void 0 ? void 0 : createSupportedPositionLastDivisorComparison(operator, value);
  }
  if (isZeroArgFunctionCall(predicate.right, "position")) {
    const value = tryGetLastDivisorPolynomialValue(predicate.left);
    return value === void 0 ? void 0 : createSupportedPositionLastDivisorComparison(operator, value);
  }
  return void 0;
}
function tryGetSupportedPositionLastDivisorRangeComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator === void 0 || operator === "=" || operator === "eq" || operator === "!=" || operator === "ne") {
    return void 0;
  }
  if (isZeroArgFunctionCall(predicate.left, "position")) {
    const value = tryGetLastDivisorPolynomialValue(predicate.right);
    return value === void 0 ? void 0 : createSupportedPositionLastDivisorRangeComparison(operator, value);
  }
  if (isZeroArgFunctionCall(predicate.right, "position")) {
    const value = tryGetLastDivisorPolynomialValue(predicate.left);
    return value === void 0 ? void 0 : createSupportedPositionLastDivisorRangeComparison(reverseComparisonOperator(operator), value);
  }
  return void 0;
}
function createSupportedPositionLastDivisorRangeComparison(operator, value) {
  const linearOffset = value.constantNumerator / value.denominator;
  const canUseLinearConstraint = value.quadraticNumerator === 0 && value.linearNumerator > 0 && Number.isInteger(linearOffset);
  switch (operator) {
    case "<":
    case "lt":
      return canUseLinearConstraint ? value.linearNumerator !== 1 ? { maximumPositionExclusiveTotalFractions: [{ denominator: value.denominator, numerator: value.linearNumerator, offset: linearOffset }] } : linearOffset === 0 ? { maximumPositionExclusiveTotalDivisors: [value.denominator] } : { maximumPositionExclusiveTotalDivisorOffsets: [{ divisor: value.denominator, offset: linearOffset }] } : { maximumPositionExclusiveTotalPolynomials: [value] };
    case "<=":
    case "le":
      return canUseLinearConstraint ? value.linearNumerator !== 1 ? { maximumPositionInclusiveTotalFractions: [{ denominator: value.denominator, numerator: value.linearNumerator, offset: linearOffset }] } : linearOffset === 0 ? { maximumPositionInclusiveTotalDivisors: [value.denominator] } : { maximumPositionInclusiveTotalDivisorOffsets: [{ divisor: value.denominator, offset: linearOffset }] } : { maximumPositionInclusiveTotalPolynomials: [value] };
    case ">":
    case "gt":
      return canUseLinearConstraint ? value.linearNumerator !== 1 ? { minimumPositionExclusiveTotalFractions: [{ denominator: value.denominator, numerator: value.linearNumerator, offset: linearOffset }] } : linearOffset === 0 ? { minimumPositionExclusiveTotalDivisors: [value.denominator] } : { minimumPositionExclusiveTotalDivisorOffsets: [{ divisor: value.denominator, offset: linearOffset }] } : { minimumPositionExclusiveTotalPolynomials: [value] };
    case ">=":
    case "ge":
      return canUseLinearConstraint ? value.linearNumerator !== 1 ? { minimumPositionInclusiveTotalFractions: [{ denominator: value.denominator, numerator: value.linearNumerator, offset: linearOffset }] } : linearOffset === 0 ? { minimumPositionInclusiveTotalDivisors: [value.denominator] } : { minimumPositionInclusiveTotalDivisorOffsets: [{ divisor: value.denominator, offset: linearOffset }] } : { minimumPositionInclusiveTotalPolynomials: [value] };
    default:
      return void 0;
  }
}
function createSupportedPositionLastDivisorComparison(operator, value) {
  const linearOffset = value.constantNumerator / value.denominator;
  const canUseLinearConstraint = value.quadraticNumerator === 0 && value.linearNumerator > 0 && Number.isInteger(linearOffset);
  if (value.quadraticNumerator === 0 && value.linearNumerator <= 0) {
    return void 0;
  }
  switch (operator) {
    case "=":
    case "eq":
      return canUseLinearConstraint ? {
        positionTotalDivisor: value.denominator,
        ...value.linearNumerator === 1 ? {} : { positionTotalNumerator: value.linearNumerator },
        ...linearOffset === 0 ? {} : { positionTotalOffset: linearOffset }
      } : {
        positionTotalPolynomialDenominator: value.denominator,
        positionTotalPolynomialQuadraticNumerator: value.quadraticNumerator,
        ...value.linearNumerator === 0 ? {} : { positionTotalPolynomialLinearNumerator: value.linearNumerator },
        ...value.constantNumerator === 0 ? {} : { positionTotalPolynomialConstantNumerator: value.constantNumerator }
      };
    case "!=":
    case "ne":
      return canUseLinearConstraint ? value.linearNumerator !== 1 ? { excludedPositionTotalFractions: [{ denominator: value.denominator, numerator: value.linearNumerator, offset: linearOffset }] } : linearOffset === 0 ? { excludedPositionTotalDivisors: [value.denominator] } : { excludedPositionTotalDivisorOffsets: [{ divisor: value.denominator, offset: linearOffset }] } : {
        excludedPositionTotalPolynomials: [{
          denominator: value.denominator,
          quadraticNumerator: value.quadraticNumerator,
          linearNumerator: value.linearNumerator,
          constantNumerator: value.constantNumerator
        }]
      };
    default:
      return void 0;
  }
}
function tryGetSupportedNegatedPositionLastDivisorComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== "=" && operator !== "eq" && operator !== "!=" && operator !== "ne") {
    return void 0;
  }
  if (isZeroArgFunctionCall(predicate.left, "position")) {
    const value = tryGetLastDivisorPolynomialValue(predicate.right);
    return value === void 0 ? void 0 : createSupportedPositionLastDivisorComparison(negateComparisonOperator(operator), value);
  }
  if (isZeroArgFunctionCall(predicate.right, "position")) {
    const value = tryGetLastDivisorPolynomialValue(predicate.left);
    return value === void 0 ? void 0 : createSupportedPositionLastDivisorComparison(negateComparisonOperator(operator), value);
  }
  return void 0;
}
function tryGetSupportedNegatedPositionLastDivisorRangeComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator === void 0 || operator === "=" || operator === "eq" || operator === "!=" || operator === "ne") {
    return void 0;
  }
  if (isZeroArgFunctionCall(predicate.left, "position")) {
    const value = tryGetLastDivisorPolynomialValue(predicate.right);
    return value === void 0 ? void 0 : createSupportedPositionLastDivisorRangeComparison(negateComparisonOperator(operator), value);
  }
  if (isZeroArgFunctionCall(predicate.right, "position")) {
    const value = tryGetLastDivisorPolynomialValue(predicate.left);
    return value === void 0 ? void 0 : createSupportedPositionLastDivisorRangeComparison(reverseComparisonOperator(negateComparisonOperator(operator)), value);
  }
  return void 0;
}
function tryGetSupportedPositionLastOffsetComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator !== "=" && operator !== "eq" && operator !== "!=" && operator !== "ne") {
    return void 0;
  }
  if (isZeroArgFunctionCall(predicate.left, "position")) {
    const lastOffset = tryGetLastOffsetValue(predicate.right);
    return lastOffset === void 0 ? void 0 : createSupportedPositionLastOffsetComparison(operator, lastOffset);
  }
  if (isZeroArgFunctionCall(predicate.right, "position")) {
    const lastOffset = tryGetLastOffsetValue(predicate.left);
    return lastOffset === void 0 ? void 0 : createSupportedPositionLastOffsetComparison(operator, lastOffset);
  }
  return void 0;
}
function createSupportedPositionLastOffsetComparison(operator, lastOffset) {
  switch (operator) {
    case "=":
    case "eq":
      return { positionFromLastOffset: lastOffset };
    case "!=":
    case "ne":
      return createSupportedNegatedPositionLastOffsetPlan(lastOffset);
  }
  return void 0;
}
function tryGetLastOffsetValue(ast) {
  if (isZeroArgFunctionCall(ast, "last")) {
    return 0;
  }
  if (ast.kind !== "binary" || ast.operator !== "-") {
    return void 0;
  }
  if (!isZeroArgFunctionCall(ast.left, "last") || ast.right.kind !== "number") {
    return void 0;
  }
  const offset = ast.right.value;
  return Number.isInteger(offset) && offset >= 0 ? offset : void 0;
}
function tryGetLastDivisorValue(ast) {
  if (ast.kind !== "binary" || ast.operator !== "div") {
    return void 0;
  }
  if (!isZeroArgFunctionCall(ast.left, "last") || ast.right.kind !== "number") {
    return void 0;
  }
  const divisor = ast.right.value;
  return Number.isInteger(divisor) && divisor > 0 ? divisor : void 0;
}
function tryGetLastDivisorOffsetValue(ast) {
  const divisor = tryGetLastDivisorValue(ast);
  if (divisor !== void 0) {
    return { divisor, offset: 0 };
  }
  if (ast.kind !== "binary" || ast.operator !== "+" && ast.operator !== "-") {
    return void 0;
  }
  const leftDivisor = tryGetLastDivisorValue(ast.left);
  if (leftDivisor === void 0 || ast.right.kind !== "number" || !Number.isInteger(ast.right.value)) {
    return void 0;
  }
  return {
    divisor: leftDivisor,
    offset: ast.operator === "+" ? ast.right.value : -ast.right.value
  };
}
function tryGetLastDivisorLinearValue(ast) {
  if (ast.kind === "sequence" && ast.items.length === 1) {
    const [item] = ast.items;
    return item === void 0 ? void 0 : tryGetLastDivisorLinearValue(item);
  }
  if (ast.kind === "number") {
    return Number.isInteger(ast.value) ? { denominator: 1, numerator: 0, offset: ast.value } : void 0;
  }
  const divisorOffset = tryGetLastDivisorOffsetValue(ast);
  if (divisorOffset !== void 0) {
    return { denominator: divisorOffset.divisor, numerator: 1, offset: divisorOffset.offset };
  }
  if (ast.kind !== "binary") {
    return void 0;
  }
  if (ast.operator === "*") {
    if (ast.left.kind === "number" && Number.isInteger(ast.left.value) && ast.left.value > 0) {
      const rightValue2 = tryGetLastDivisorLinearValue(ast.right);
      return rightValue2 === void 0 ? void 0 : scaleLastDivisorLinearValue(rightValue2, ast.left.value);
    }
    if (ast.right.kind === "number" && Number.isInteger(ast.right.value) && ast.right.value > 0) {
      const leftValue2 = tryGetLastDivisorLinearValue(ast.left);
      return leftValue2 === void 0 ? void 0 : scaleLastDivisorLinearValue(leftValue2, ast.right.value);
    }
    return void 0;
  }
  if (ast.operator !== "+" && ast.operator !== "-") {
    return void 0;
  }
  const leftValue = tryGetLastDivisorLinearValue(ast.left);
  const rightValue = tryGetLastDivisorLinearValue(ast.right);
  if (leftValue === void 0 || rightValue === void 0) {
    return void 0;
  }
  const denominator = getLeastCommonMultiple(leftValue.denominator, rightValue.denominator);
  const signedRightNumerator = ast.operator === "+" ? rightValue.numerator : -rightValue.numerator;
  const signedRightOffset = ast.operator === "+" ? rightValue.offset : -rightValue.offset;
  const numerator = leftValue.numerator * (denominator / leftValue.denominator) + signedRightNumerator * (denominator / rightValue.denominator);
  const offset = leftValue.offset + signedRightOffset;
  if (numerator === 0) {
    return { denominator: 1, numerator: 0, offset };
  }
  const greatestCommonDivisor = getGreatestCommonDivisor(Math.abs(numerator), denominator);
  return {
    denominator: denominator / greatestCommonDivisor,
    numerator: numerator / greatestCommonDivisor,
    offset
  };
}
function scaleLastDivisorLinearValue(value, factor) {
  if (value.numerator === 0) {
    return {
      denominator: 1,
      numerator: 0,
      offset: value.offset * factor
    };
  }
  const scaledNumerator = value.numerator * factor;
  const greatestCommonDivisor = getGreatestCommonDivisor(Math.abs(scaledNumerator), value.denominator);
  return {
    denominator: value.denominator / greatestCommonDivisor,
    numerator: scaledNumerator / greatestCommonDivisor,
    offset: value.offset * factor
  };
}
function tryGetLastDivisorPolynomialValue(ast) {
  const linearValue = tryGetLastDivisorLinearValue(ast);
  if (linearValue !== void 0) {
    return {
      denominator: linearValue.denominator,
      quadraticNumerator: 0,
      linearNumerator: linearValue.numerator,
      constantNumerator: linearValue.offset * linearValue.denominator
    };
  }
  if (ast.kind !== "binary" || ast.operator !== "*") {
    return void 0;
  }
  const leftValue = tryGetLastDivisorPolynomialValue(ast.left);
  const rightValue = tryGetLastDivisorPolynomialValue(ast.right);
  if (leftValue === void 0 || rightValue === void 0 || leftValue.quadraticNumerator !== 0 || rightValue.quadraticNumerator !== 0) {
    return void 0;
  }
  return normalizeLastDivisorPolynomialValue({
    denominator: leftValue.denominator * rightValue.denominator,
    quadraticNumerator: leftValue.linearNumerator * rightValue.linearNumerator,
    linearNumerator: leftValue.linearNumerator * rightValue.constantNumerator + rightValue.linearNumerator * leftValue.constantNumerator,
    constantNumerator: leftValue.constantNumerator * rightValue.constantNumerator
  });
}
function normalizeLastDivisorPolynomialValue(value) {
  if (value.quadraticNumerator === 0 && value.linearNumerator === 0 && value.constantNumerator === 0) {
    return {
      denominator: 1,
      quadraticNumerator: 0,
      linearNumerator: 0,
      constantNumerator: 0
    };
  }
  const coefficients = [
    Math.abs(value.quadraticNumerator),
    Math.abs(value.linearNumerator),
    Math.abs(value.constantNumerator),
    value.denominator
  ].filter((coefficient) => coefficient !== 0);
  const greatestCommonDivisor = coefficients.reduce(
    (divisor, coefficient) => getGreatestCommonDivisor(divisor, coefficient)
  );
  return greatestCommonDivisor === 1 ? value : {
    denominator: value.denominator / greatestCommonDivisor,
    quadraticNumerator: value.quadraticNumerator / greatestCommonDivisor,
    linearNumerator: value.linearNumerator / greatestCommonDivisor,
    constantNumerator: value.constantNumerator / greatestCommonDivisor
  };
}
function tryGetSupportedPositionLastRangeComparison(predicate) {
  if (predicate.kind !== "binary") {
    return void 0;
  }
  const operator = getSupportedPositionComparisonOperator(predicate.operator);
  if (operator === void 0) {
    return void 0;
  }
  if (isZeroArgFunctionCall(predicate.left, "position")) {
    return createSupportedPositionLastRangeComparison(operator, predicate.right);
  }
  if (isZeroArgFunctionCall(predicate.right, "position")) {
    return createSupportedPositionLastRangeComparison(reverseComparisonOperator(operator), predicate.left);
  }
  return void 0;
}
function createSupportedPositionLastRangeComparison(operator, ast) {
  const lastOffset = tryGetLastOffsetValue(ast);
  if (lastOffset === void 0) {
    return void 0;
  }
  switch (operator) {
    case "<":
    case "lt":
      return { maximumPositionFromLastOffset: lastOffset + 1 };
    case "<=":
    case "le":
      return { maximumPositionFromLastOffset: lastOffset };
    case ">":
    case "gt":
      return { includedPositionFromLastOffsets: Array.from({ length: lastOffset }, (_, index) => index) };
    case ">=":
    case "ge":
      return { includedPositionFromLastOffsets: Array.from({ length: lastOffset + 1 }, (_, index) => index) };
    default:
      return void 0;
  }
}
function mergeSupportedStepPositionPlans(left, right) {
  if (left.alternatives !== void 0 || right.alternatives !== void 0) {
    const leftAlternatives = getSupportedStepPositionAlternatives(left);
    const rightAlternatives = getSupportedStepPositionAlternatives(right);
    if (leftAlternatives === void 0 || rightAlternatives === void 0) {
      return void 0;
    }
    const mergedAlternatives = [];
    for (const leftAlternative of leftAlternatives) {
      for (const rightAlternative of rightAlternatives) {
        const mergedAlternative = mergeSupportedStepPositionPlans(leftAlternative, rightAlternative);
        if (mergedAlternative === void 0) {
          return void 0;
        }
        mergedAlternatives.push(mergedAlternative);
      }
    }
    return mergedAlternatives.length === 1 ? mergedAlternatives[0] : { alternatives: mergedAlternatives };
  }
  if (left.includedPositions !== void 0 || right.includedPositions !== void 0) {
    return void 0;
  }
  const position = getMergedExactPosition(left, right);
  if (position === void 0 && (left.position !== void 0 || right.position !== void 0)) {
    return void 0;
  }
  const positionTotalConstraint = getMergedPositionTotalConstraint(left, right);
  if (positionTotalConstraint === void 0 && (left.positionTotalDivisor !== void 0 || right.positionTotalDivisor !== void 0 || left.positionTotalPolynomialDenominator !== void 0 || right.positionTotalPolynomialDenominator !== void 0)) {
    return void 0;
  }
  const positionFromLastOffset = getMergedPositionFromLastOffset(left, right);
  if (positionFromLastOffset === void 0 && (left.positionFromLastOffset !== void 0 || right.positionFromLastOffset !== void 0)) {
    return void 0;
  }
  const excludedPositions = getMergedExcludedPositions(left, right);
  const excludedPositionTotalDivisors = getMergedExcludedPositionTotalDivisors(left, right);
  const excludedPositionTotalDivisorOffsets = getMergedExcludedPositionTotalDivisorOffsets(left, right);
  const excludedPositionTotalFractions = getMergedExcludedPositionTotalFractions(left, right);
  const excludedPositionTotalPolynomials = getMergedExcludedPositionTotalPolynomials(left, right);
  const maximumPositionExclusiveTotalDivisors = getMergedDivisorConstraintValues(left, right, "maximumPositionExclusiveTotalDivisors");
  const maximumPositionExclusiveTotalDivisorOffsets = getMergedDivisorOffsetConstraintValues(left, right, "maximumPositionExclusiveTotalDivisorOffsets");
  const maximumPositionExclusiveTotalFractions = getMergedFractionConstraintValues(left, right, "maximumPositionExclusiveTotalFractions");
  const maximumPositionExclusiveTotalPolynomials = getMergedPolynomialConstraintValues(left, right, "maximumPositionExclusiveTotalPolynomials");
  const maximumPositionInclusiveTotalDivisors = getMergedDivisorConstraintValues(left, right, "maximumPositionInclusiveTotalDivisors");
  const maximumPositionInclusiveTotalDivisorOffsets = getMergedDivisorOffsetConstraintValues(left, right, "maximumPositionInclusiveTotalDivisorOffsets");
  const maximumPositionInclusiveTotalFractions = getMergedFractionConstraintValues(left, right, "maximumPositionInclusiveTotalFractions");
  const maximumPositionInclusiveTotalPolynomials = getMergedPolynomialConstraintValues(left, right, "maximumPositionInclusiveTotalPolynomials");
  const minimumPositionExclusiveTotalDivisors = getMergedDivisorConstraintValues(left, right, "minimumPositionExclusiveTotalDivisors");
  const minimumPositionExclusiveTotalDivisorOffsets = getMergedDivisorOffsetConstraintValues(left, right, "minimumPositionExclusiveTotalDivisorOffsets");
  const minimumPositionExclusiveTotalFractions = getMergedFractionConstraintValues(left, right, "minimumPositionExclusiveTotalFractions");
  const minimumPositionExclusiveTotalPolynomials = getMergedPolynomialConstraintValues(left, right, "minimumPositionExclusiveTotalPolynomials");
  const minimumPositionInclusiveTotalDivisors = getMergedDivisorConstraintValues(left, right, "minimumPositionInclusiveTotalDivisors");
  const minimumPositionInclusiveTotalDivisorOffsets = getMergedDivisorOffsetConstraintValues(left, right, "minimumPositionInclusiveTotalDivisorOffsets");
  const minimumPositionInclusiveTotalFractions = getMergedFractionConstraintValues(left, right, "minimumPositionInclusiveTotalFractions");
  const minimumPositionInclusiveTotalPolynomials = getMergedPolynomialConstraintValues(left, right, "minimumPositionInclusiveTotalPolynomials");
  const excludedPosition = excludedPositions.length === 1 ? excludedPositions[0] : void 0;
  const includedPositionFromLastOffsets = getMergedIncludedPositionFromLastOffsets(left, right);
  const sharedConstraints = {
    ...position === void 0 ? {} : { position },
    ...positionTotalConstraint === void 0 ? {} : positionTotalConstraint.quadraticNumerator === 0 && positionTotalConstraint.linearNumerator > 0 && positionTotalConstraint.constantNumerator % positionTotalConstraint.denominator === 0 ? {
      positionTotalDivisor: positionTotalConstraint.denominator,
      ...positionTotalConstraint.linearNumerator === 1 ? {} : { positionTotalNumerator: positionTotalConstraint.linearNumerator },
      ...positionTotalConstraint.constantNumerator / positionTotalConstraint.denominator === 0 ? {} : { positionTotalOffset: positionTotalConstraint.constantNumerator / positionTotalConstraint.denominator }
    } : {
      positionTotalPolynomialDenominator: positionTotalConstraint.denominator,
      positionTotalPolynomialQuadraticNumerator: positionTotalConstraint.quadraticNumerator,
      ...positionTotalConstraint.linearNumerator === 0 ? {} : { positionTotalPolynomialLinearNumerator: positionTotalConstraint.linearNumerator },
      ...positionTotalConstraint.constantNumerator === 0 ? {} : { positionTotalPolynomialConstantNumerator: positionTotalConstraint.constantNumerator }
    },
    ...positionFromLastOffset === void 0 ? {} : { positionFromLastOffset },
    ...left.minimumPosition === void 0 && right.minimumPosition === void 0 ? {} : { minimumPosition: Math.max(left.minimumPosition ?? 1, right.minimumPosition ?? 1) },
    ...left.maximumPosition === void 0 && right.maximumPosition === void 0 ? {} : {
      maximumPosition: Math.min(
        left.maximumPosition ?? Number.POSITIVE_INFINITY,
        right.maximumPosition ?? Number.POSITIVE_INFINITY
      )
    },
    ...left.maximumPositionFromLastOffset === void 0 && right.maximumPositionFromLastOffset === void 0 ? {} : {
      maximumPositionFromLastOffset: Math.max(
        left.maximumPositionFromLastOffset ?? 0,
        right.maximumPositionFromLastOffset ?? 0
      )
    },
    ...excludedPositions.length === 0 ? {} : excludedPosition !== void 0 ? { excludedPosition } : { excludedPositions },
    ...excludedPositionTotalDivisors.length === 0 ? {} : { excludedPositionTotalDivisors },
    ...excludedPositionTotalDivisorOffsets.length === 0 ? {} : { excludedPositionTotalDivisorOffsets },
    ...excludedPositionTotalFractions.length === 0 ? {} : { excludedPositionTotalFractions },
    ...excludedPositionTotalPolynomials.length === 0 ? {} : { excludedPositionTotalPolynomials },
    ...maximumPositionExclusiveTotalDivisors.length === 0 ? {} : { maximumPositionExclusiveTotalDivisors },
    ...maximumPositionExclusiveTotalDivisorOffsets.length === 0 ? {} : { maximumPositionExclusiveTotalDivisorOffsets },
    ...maximumPositionExclusiveTotalFractions.length === 0 ? {} : { maximumPositionExclusiveTotalFractions },
    ...maximumPositionExclusiveTotalPolynomials.length === 0 ? {} : { maximumPositionExclusiveTotalPolynomials },
    ...maximumPositionInclusiveTotalDivisors.length === 0 ? {} : { maximumPositionInclusiveTotalDivisors },
    ...maximumPositionInclusiveTotalDivisorOffsets.length === 0 ? {} : { maximumPositionInclusiveTotalDivisorOffsets },
    ...maximumPositionInclusiveTotalFractions.length === 0 ? {} : { maximumPositionInclusiveTotalFractions },
    ...maximumPositionInclusiveTotalPolynomials.length === 0 ? {} : { maximumPositionInclusiveTotalPolynomials },
    ...minimumPositionExclusiveTotalDivisors.length === 0 ? {} : { minimumPositionExclusiveTotalDivisors },
    ...minimumPositionExclusiveTotalDivisorOffsets.length === 0 ? {} : { minimumPositionExclusiveTotalDivisorOffsets },
    ...minimumPositionExclusiveTotalFractions.length === 0 ? {} : { minimumPositionExclusiveTotalFractions },
    ...minimumPositionExclusiveTotalPolynomials.length === 0 ? {} : { minimumPositionExclusiveTotalPolynomials },
    ...minimumPositionInclusiveTotalDivisors.length === 0 ? {} : { minimumPositionInclusiveTotalDivisors },
    ...minimumPositionInclusiveTotalDivisorOffsets.length === 0 ? {} : { minimumPositionInclusiveTotalDivisorOffsets },
    ...minimumPositionInclusiveTotalFractions.length === 0 ? {} : { minimumPositionInclusiveTotalFractions },
    ...minimumPositionInclusiveTotalPolynomials.length === 0 ? {} : { minimumPositionInclusiveTotalPolynomials },
    ...includedPositionFromLastOffsets === void 0 ? {} : { includedPositionFromLastOffsets }
  };
  const mergedModuloPlan = mergeSupportedStepPositionModuloPlans(left, right);
  if (mergedModuloPlan === void 0) {
    return void 0;
  }
  if (mergedModuloPlan.alternatives === void 0) {
    return {
      ...sharedConstraints,
      ...mergedModuloPlan
    };
  }
  return {
    alternatives: mergedModuloPlan.alternatives.map((alternative) => ({
      ...sharedConstraints,
      ...alternative
    }))
  };
}
function mergeSupportedStepPositionModuloPlans(left, right) {
  const leftHasModulo = left.positionModuloDivisor !== void 0 || left.positionModuloRemainder !== void 0;
  const rightHasModulo = right.positionModuloDivisor !== void 0 || right.positionModuloRemainder !== void 0;
  if (!leftHasModulo && !rightHasModulo) {
    return {};
  }
  if (!leftHasModulo) {
    return {
      ...right.positionModuloDivisor === void 0 ? {} : { positionModuloDivisor: right.positionModuloDivisor },
      ...right.positionModuloRemainder === void 0 ? {} : { positionModuloRemainder: right.positionModuloRemainder }
    };
  }
  if (!rightHasModulo) {
    return {
      ...left.positionModuloDivisor === void 0 ? {} : { positionModuloDivisor: left.positionModuloDivisor },
      ...left.positionModuloRemainder === void 0 ? {} : { positionModuloRemainder: left.positionModuloRemainder }
    };
  }
  if (left.positionModuloDivisor === void 0 || left.positionModuloRemainder === void 0 || right.positionModuloDivisor === void 0 || right.positionModuloRemainder === void 0) {
    return void 0;
  }
  const moduloDivisor = getLeastCommonMultiple(left.positionModuloDivisor, right.positionModuloDivisor);
  const alternatives = [];
  for (let remainder = 0; remainder < moduloDivisor; remainder += 1) {
    if (remainder % left.positionModuloDivisor === left.positionModuloRemainder && remainder % right.positionModuloDivisor === right.positionModuloRemainder) {
      alternatives.push({
        positionModuloDivisor: moduloDivisor,
        positionModuloRemainder: remainder
      });
    }
  }
  if (alternatives.length === 0) {
    return { maximumPosition: 0 };
  }
  return alternatives.length === 1 ? alternatives[0] : { alternatives };
}
function getLeastCommonMultiple(left, right) {
  return left / getGreatestCommonDivisor(left, right) * right;
}
function getGreatestCommonDivisor(left, right) {
  let dividend = left;
  let divisor = right;
  while (divisor !== 0) {
    const remainder = dividend % divisor;
    dividend = divisor;
    divisor = remainder;
  }
  return dividend;
}
function unionSupportedStepPositionPlans(left, right) {
  const leftAlternatives = getSupportedStepPositionAlternatives(left);
  const rightAlternatives = getSupportedStepPositionAlternatives(right);
  if (leftAlternatives === void 0 || rightAlternatives === void 0) {
    return void 0;
  }
  return {
    alternatives: [...leftAlternatives, ...rightAlternatives]
  };
}
function getSupportedStepPositionAlternatives(plan) {
  return plan.alternatives ?? [plan];
}
function getMergedExcludedPositions(left, right) {
  return [.../* @__PURE__ */ new Set([
    ...left.excludedPosition === void 0 ? [] : [left.excludedPosition],
    ...left.excludedPositions ?? [],
    ...right.excludedPosition === void 0 ? [] : [right.excludedPosition],
    ...right.excludedPositions ?? []
  ])].sort((first, second) => first - second);
}
function getMergedIncludedPositionFromLastOffsets(left, right) {
  if (left.includedPositionFromLastOffsets === void 0) {
    return right.includedPositionFromLastOffsets;
  }
  if (right.includedPositionFromLastOffsets === void 0) {
    return left.includedPositionFromLastOffsets;
  }
  return left.includedPositionFromLastOffsets.filter((offset) => right.includedPositionFromLastOffsets?.includes(offset));
}
function getMergedExcludedPositionTotalDivisors(left, right) {
  return [.../* @__PURE__ */ new Set([
    ...left.excludedPositionTotalDivisors ?? [],
    ...right.excludedPositionTotalDivisors ?? []
  ])].sort((first, second) => first - second);
}
function getMergedExcludedPositionTotalDivisorOffsets(left, right) {
  return [...new Map(
    [
      ...left.excludedPositionTotalDivisorOffsets ?? [],
      ...right.excludedPositionTotalDivisorOffsets ?? []
    ].map((value) => [`${value.divisor}:${value.offset}`, value])
  ).values()].sort((first, second) => first.divisor - second.divisor || first.offset - second.offset);
}
function getMergedExcludedPositionTotalFractions(left, right) {
  return [...new Map(
    [
      ...left.excludedPositionTotalFractions ?? [],
      ...right.excludedPositionTotalFractions ?? []
    ].map((value) => [`${value.denominator}:${value.numerator}:${value.offset}`, value])
  ).values()].sort(
    (first, second) => first.denominator - second.denominator || first.numerator - second.numerator || first.offset - second.offset
  );
}
function getMergedExcludedPositionTotalPolynomials(left, right) {
  return [...new Map(
    [
      ...left.excludedPositionTotalPolynomials ?? [],
      ...right.excludedPositionTotalPolynomials ?? []
    ].map((value) => [`${value.denominator}:${value.quadraticNumerator}:${value.linearNumerator}:${value.constantNumerator}`, value])
  ).values()].sort(
    (first, second) => first.denominator - second.denominator || first.quadraticNumerator - second.quadraticNumerator || first.linearNumerator - second.linearNumerator || first.constantNumerator - second.constantNumerator
  );
}
function getMergedDivisorConstraintValues(left, right, key) {
  return [.../* @__PURE__ */ new Set([
    ...left[key] ?? [],
    ...right[key] ?? []
  ])].sort((first, second) => first - second);
}
function getMergedDivisorOffsetConstraintValues(left, right, key) {
  return [...new Map(
    [
      ...left[key] ?? [],
      ...right[key] ?? []
    ].map((value) => [`${value.divisor}:${value.offset}`, value])
  ).values()].sort((first, second) => first.divisor - second.divisor || first.offset - second.offset);
}
function getMergedFractionConstraintValues(left, right, key) {
  return [...new Map(
    [
      ...left[key] ?? [],
      ...right[key] ?? []
    ].map((value) => [`${value.denominator}:${value.numerator}:${value.offset}`, value])
  ).values()].sort(
    (first, second) => first.denominator - second.denominator || first.numerator - second.numerator || first.offset - second.offset
  );
}
function getMergedPolynomialConstraintValues(left, right, key) {
  return [...new Map(
    [
      ...left[key] ?? [],
      ...right[key] ?? []
    ].map((value) => [`${value.denominator}:${value.quadraticNumerator}:${value.linearNumerator}:${value.constantNumerator}`, value])
  ).values()].sort(
    (first, second) => first.denominator - second.denominator || first.quadraticNumerator - second.quadraticNumerator || first.linearNumerator - second.linearNumerator || first.constantNumerator - second.constantNumerator
  );
}
function getMergedExactPosition(left, right) {
  if (left.position === void 0) {
    return right.position;
  }
  if (right.position === void 0) {
    return left.position;
  }
  return left.position === right.position ? left.position : void 0;
}
function getMergedPositionFromLastOffset(left, right) {
  if (left.positionFromLastOffset === void 0) {
    return right.positionFromLastOffset;
  }
  if (right.positionFromLastOffset === void 0) {
    return left.positionFromLastOffset;
  }
  return left.positionFromLastOffset === right.positionFromLastOffset ? left.positionFromLastOffset : void 0;
}
function getPositionTotalConstraint(plan) {
  if (plan.positionTotalPolynomialDenominator !== void 0) {
    return {
      denominator: plan.positionTotalPolynomialDenominator,
      quadraticNumerator: plan.positionTotalPolynomialQuadraticNumerator ?? 0,
      linearNumerator: plan.positionTotalPolynomialLinearNumerator ?? 0,
      constantNumerator: plan.positionTotalPolynomialConstantNumerator ?? 0
    };
  }
  if (plan.positionTotalDivisor === void 0) {
    return void 0;
  }
  return {
    denominator: plan.positionTotalDivisor,
    quadraticNumerator: 0,
    linearNumerator: plan.positionTotalNumerator ?? 1,
    constantNumerator: (plan.positionTotalOffset ?? 0) * plan.positionTotalDivisor
  };
}
function getMergedPositionTotalConstraint(left, right) {
  const leftConstraint = getPositionTotalConstraint(left);
  if (leftConstraint === void 0) {
    return getPositionTotalConstraint(right);
  }
  const rightConstraint = getPositionTotalConstraint(right);
  if (rightConstraint === void 0) {
    return leftConstraint;
  }
  return leftConstraint.denominator === rightConstraint.denominator && leftConstraint.quadraticNumerator === rightConstraint.quadraticNumerator && leftConstraint.linearNumerator === rightConstraint.linearNumerator && leftConstraint.constantNumerator === rightConstraint.constantNumerator ? leftConstraint : void 0;
}

// src/xslt/codegen/emitInstructions.ts
function tryCreateNativeTransformPlan(ir, sourcePath) {
  const namedInitialTemplatePlan = tryCreateNamedInitialTemplateNativePlan(ir, sourcePath);
  if (namedInitialTemplatePlan !== void 0) {
    return namedInitialTemplatePlan;
  }
  const mixedInitialTemplatePlan = tryCreateSingleTemplateWithNamedInitialTemplateNativePlan(ir, sourcePath);
  if (mixedInitialTemplatePlan !== void 0) {
    return mixedInitialTemplatePlan;
  }
  const singleTemplatePlan = tryCreateSingleTemplateNativePlan(ir, sourcePath);
  if (singleTemplatePlan !== void 0) {
    return singleTemplatePlan;
  }
  const rootApplyTemplatesPlan = tryCreateRootApplyTemplatesNativePlan(ir, sourcePath);
  if (rootApplyTemplatesPlan !== void 0) {
    return rootApplyTemplatesPlan;
  }
  return tryCreateMatchedTemplateApplyTemplatesNativePlan(ir, sourcePath);
}
function tryCreateNamedInitialTemplateNativePlan(ir, sourcePath) {
  const runtimeHelpers = /* @__PURE__ */ new Set(["createCompiledDocument"]);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === void 0) {
    return void 0;
  }
  if (ir.templates.length !== 1) {
    return void 0;
  }
  const [template] = ir.templates;
  if (template === void 0 || template.name === void 0 || template.match !== void 0 || template.modes.length > 0) {
    return void 0;
  }
  const templateParamSetup = tryCreateTemplateParamSetup(
    template.params,
    runtimeHelpers,
    globalBindingSetup.variableBindings,
    "document"
  );
  if (templateParamSetup === void 0) {
    return void 0;
  }
  runtimeHelpers.add("normalizeNativeTemplateName");
  runtimeHelpers.add("prependNativeInitialTemplateError");
  runtimeHelpers.add("throwMissingNativeInitialTemplate");
  runtimeHelpers.add("throwUnsupportedNativeInitialMode");
  const bodyExpression = emitInstructionSequence(template.body, runtimeHelpers, {
    contextNodeIdentifier: "document",
    variableBindings: templateParamSetup.variableBindings,
    ...sourcePath === void 0 ? {} : { sourcePath }
  });
  if (bodyExpression === void 0) {
    return void 0;
  }
  const outputExpression = tsRawExpression(
    `(() => { try { return ${bodyExpression.code}; } catch (error) { throw prependNativeInitialTemplateError(error, ${JSON.stringify(template.name)}, ${JSON.stringify(template.location)}); } })()`
  );
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [
    outputExpression.code,
    ...templateParamSetup.setupStatements
  ]);
  const needsDocumentBinding = hasDocumentReference([
    outputExpression.code,
    ...templateParamSetup.setupStatements,
    ...finalizedGlobalBindingSetup
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add("createCompiledDocument");
  }
  return {
    entryTemplate: template,
    initialTemplateName: template.name,
    needsDocumentBinding,
    currentNodeExpression: tsRawExpression("document"),
    currentNodeMayBeNull: false,
    needsCurrentNodeBinding: false,
    setupStatements: [...finalizedGlobalBindingSetup, ...templateParamSetup.setupStatements],
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort()
  };
}
function tryCreateSingleTemplateWithNamedInitialTemplateNativePlan(ir, sourcePath) {
  const runtimeHelpers = /* @__PURE__ */ new Set(["createCompiledDocument"]);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === void 0) {
    return void 0;
  }
  if (ir.templates.length !== 2) {
    return void 0;
  }
  const defaultTemplates = ir.templates.filter(
    (template) => template.name === void 0 && template.modes.length === 0 && template.params.length === 0
  );
  if (defaultTemplates.length !== 1) {
    return void 0;
  }
  const [defaultTemplate] = defaultTemplates;
  const initialTemplate = ir.templates.find((template) => template !== defaultTemplate);
  if (defaultTemplate === void 0 || initialTemplate === void 0 || initialTemplate.name === void 0 || initialTemplate.match !== void 0 || initialTemplate.modes.length > 0) {
    return void 0;
  }
  const defaultContext = createTemplateContextPlan(defaultTemplate, runtimeHelpers);
  if (defaultContext === void 0) {
    return void 0;
  }
  const defaultOutputExpression = emitInstructionSequence(defaultTemplate.body, runtimeHelpers, {
    variableBindings: globalBindingSetup.variableBindings,
    ...sourcePath === void 0 ? {} : { sourcePath }
  });
  if (defaultOutputExpression === void 0) {
    return void 0;
  }
  const templateParamSetup = tryCreateTemplateParamSetup(
    initialTemplate.params,
    runtimeHelpers,
    globalBindingSetup.variableBindings,
    "document"
  );
  if (templateParamSetup === void 0) {
    return void 0;
  }
  runtimeHelpers.add("normalizeNativeTemplateName");
  runtimeHelpers.add("prependNativeInitialTemplateError");
  runtimeHelpers.add("throwMissingNativeInitialTemplate");
  runtimeHelpers.add("throwUnsupportedNativeInitialMode");
  const initialBodyExpression = emitInstructionSequence(initialTemplate.body, runtimeHelpers, {
    contextNodeIdentifier: "document",
    variableBindings: templateParamSetup.variableBindings,
    ...sourcePath === void 0 ? {} : { sourcePath }
  });
  if (initialBodyExpression === void 0) {
    return void 0;
  }
  const initialOutputExpression = tsRawExpression(
    `(() => { try { return ${initialBodyExpression.code}; } catch (error) { throw prependNativeInitialTemplateError(error, ${JSON.stringify(initialTemplate.name)}, ${JSON.stringify(initialTemplate.location)}); } })()`
  );
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [
    defaultContext.currentNodeExpression.code,
    defaultOutputExpression.code,
    initialOutputExpression.code,
    ...templateParamSetup.setupStatements
  ]);
  const needsDefaultCurrentNodeBinding = defaultContext.currentNodeMayBeNull || defaultOutputExpression.code.includes("currentNode");
  const needsDocumentBinding = hasDocumentReference([
    ...needsDefaultCurrentNodeBinding ? [defaultContext.currentNodeExpression.code] : [],
    defaultOutputExpression.code,
    initialOutputExpression.code,
    ...templateParamSetup.setupStatements,
    ...finalizedGlobalBindingSetup
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add("createCompiledDocument");
  }
  return {
    entryTemplate: defaultTemplate,
    initialTemplateName: initialTemplate.name,
    initialTemplateEntryTemplate: initialTemplate,
    needsDocumentBinding,
    currentNodeExpression: defaultContext.currentNodeExpression,
    currentNodeMayBeNull: defaultContext.currentNodeMayBeNull,
    needsCurrentNodeBinding: needsDefaultCurrentNodeBinding,
    setupStatements: finalizedGlobalBindingSetup,
    outputExpression: defaultOutputExpression,
    initialTemplateCurrentNodeExpression: tsRawExpression("document"),
    initialTemplateCurrentNodeMayBeNull: false,
    initialTemplateNeedsCurrentNodeBinding: false,
    initialTemplateSetupStatements: [...finalizedGlobalBindingSetup, ...templateParamSetup.setupStatements],
    initialTemplateOutputExpression: initialOutputExpression,
    runtimeHelpers: [...runtimeHelpers].sort()
  };
}
function tryCreateSingleTemplateNativePlan(ir, sourcePath) {
  const runtimeHelpers = /* @__PURE__ */ new Set(["createCompiledDocument"]);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === void 0) {
    return void 0;
  }
  if (ir.templates.length === 0) {
    return void 0;
  }
  const primaryTemplates = ir.templates.filter(
    (template2) => template2.name === void 0 && template2.modes.length === 0 && template2.params.length === 0
  );
  if (primaryTemplates.length !== 1) {
    return void 0;
  }
  const [template] = primaryTemplates;
  if (template === void 0) {
    return void 0;
  }
  const namedTemplates = /* @__PURE__ */ new Map();
  for (const candidate of ir.templates) {
    if (candidate === template) {
      continue;
    }
    if (candidate.name === void 0 || candidate.match !== void 0 || candidate.modes.length > 0) {
      return void 0;
    }
    namedTemplates.set(candidate.name, candidate);
  }
  const templateContext = createTemplateContextPlan(template, runtimeHelpers);
  if (templateContext === void 0) {
    return void 0;
  }
  const outputExpression = emitInstructionSequence(template.body, runtimeHelpers, namedTemplates.size === 0 ? {
    variableBindings: globalBindingSetup.variableBindings
  } : {
    namedTemplates,
    activeNamedTemplateNames: [],
    variableBindings: globalBindingSetup.variableBindings,
    ...sourcePath === void 0 ? {} : { sourcePath }
  });
  if (outputExpression === void 0) {
    return void 0;
  }
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [
    templateContext.currentNodeExpression.code,
    outputExpression.code
  ]);
  const needsCurrentNodeBinding = templateContext.currentNodeMayBeNull || outputExpression.code.includes("currentNode");
  const needsDocumentBinding = hasDocumentReference([
    ...needsCurrentNodeBinding ? [templateContext.currentNodeExpression.code] : [],
    outputExpression.code,
    ...finalizedGlobalBindingSetup
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add("createCompiledDocument");
  }
  return {
    entryTemplate: template,
    needsDocumentBinding,
    currentNodeExpression: templateContext.currentNodeExpression,
    currentNodeMayBeNull: templateContext.currentNodeMayBeNull,
    needsCurrentNodeBinding,
    setupStatements: finalizedGlobalBindingSetup,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort()
  };
}
function tryCreateRootApplyTemplatesNativePlan(ir, sourcePath) {
  const runtimeHelpers = /* @__PURE__ */ new Set(["createCompiledDocument"]);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === void 0) {
    return void 0;
  }
  const shape = tryGetRootApplyTemplatesShape(ir);
  const recursivePlan = shape === void 0 ? tryGetRootApplyTemplatesPlan(ir) : void 0;
  if (shape === void 0 && recursivePlan === void 0) {
    return void 0;
  }
  const rootTemplate = shape?.rootTemplate ?? recursivePlan?.rootTemplate;
  const childPlans = shape === void 0 ? recursivePlan?.childPlans : [{
    template: shape.childTemplate,
    matchAbsolute: shape.childMatchAbsolute,
    matchPath: shape.childMatchPath
  }];
  if (rootTemplate === void 0 || childPlans === void 0) {
    return void 0;
  }
  const outputExpression = emitInstructionSequence(rootTemplate.body, runtimeHelpers, {
    contextNodeIdentifier: "document",
    variableBindings: globalBindingSetup.variableBindings,
    renderApplyTemplates: (instruction, contextNodeIdentifier, context) => emitPlannedApplyTemplatesInstruction(
      instruction,
      childPlans,
      contextNodeIdentifier,
      runtimeHelpers,
      emitInstructionSequence,
      tryGetSimpleChildPath,
      tryCreateTemplateInvocationSetup,
      context,
      sourcePath
    )
  });
  if (outputExpression === void 0) {
    return void 0;
  }
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [outputExpression.code]);
  const needsDocumentBinding = hasDocumentReference([
    outputExpression.code,
    ...finalizedGlobalBindingSetup
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add("createCompiledDocument");
  }
  return {
    entryTemplate: rootTemplate,
    needsDocumentBinding,
    currentNodeExpression: tsRawExpression("document"),
    currentNodeMayBeNull: false,
    needsCurrentNodeBinding: false,
    setupStatements: finalizedGlobalBindingSetup,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort()
  };
}
function tryCreateMatchedTemplateApplyTemplatesNativePlan(ir, sourcePath) {
  const runtimeHelpers = /* @__PURE__ */ new Set(["createCompiledDocument"]);
  const globalBindingSetup = tryCreateGlobalBindingSetup(ir.globalBindings, runtimeHelpers);
  if (globalBindingSetup === void 0) {
    return void 0;
  }
  if (ir.templates.length !== 2) {
    return void 0;
  }
  const primaryTemplate = ir.templates.find(
    (template) => template.name === void 0 && template.modes.length === 0 && template.params.length === 0 && template.match !== void 0 && template.match.kind === "path" && template.match.absolute && template.match.base === void 0
  );
  const childTemplate = ir.templates.find((template) => template !== primaryTemplate);
  if (primaryTemplate === void 0 || childTemplate === void 0) {
    return void 0;
  }
  if (childTemplate.name !== void 0 || childTemplate.modes.length > 0 || childTemplate.match === void 0 || childTemplate.match.kind !== "path" || childTemplate.match.absolute || childTemplate.match.base !== void 0) {
    return void 0;
  }
  const childMatchSegments = childTemplate.match.steps.map((step) => {
    if (step.kind !== "step" || step.axis !== "child" || step.predicates.length > 0 || step.nodeTest.kind !== "nameTest" || step.nodeTest.name.includes(":")) {
      return void 0;
    }
    return step.nodeTest.name;
  });
  const childMatchPath = childMatchSegments.filter((segment) => segment !== void 0);
  if (childMatchPath.length === 0 || childMatchPath.length !== childMatchSegments.length) {
    return void 0;
  }
  const templateContext = createTemplateContextPlan(primaryTemplate, runtimeHelpers);
  if (templateContext === void 0) {
    return void 0;
  }
  const outputExpression = emitInstructionSequence(primaryTemplate.body, runtimeHelpers, {
    variableBindings: globalBindingSetup.variableBindings,
    renderApplyTemplates: (instruction, contextNodeIdentifier, context) => emitPlannedApplyTemplatesInstruction(
      instruction,
      [{
        template: childTemplate,
        matchAbsolute: false,
        matchPath: childMatchPath
      }],
      contextNodeIdentifier,
      runtimeHelpers,
      emitInstructionSequence,
      tryGetSimpleChildPath,
      tryCreateTemplateInvocationSetup,
      context,
      sourcePath
    )
  });
  if (outputExpression === void 0) {
    return void 0;
  }
  const finalizedGlobalBindingSetup = finalizeGlobalBindingSetup(globalBindingSetup, [
    templateContext.currentNodeExpression.code,
    outputExpression.code
  ]);
  const needsCurrentNodeBinding = templateContext.currentNodeMayBeNull || outputExpression.code.includes("currentNode");
  const needsDocumentBinding = hasDocumentReference([
    ...needsCurrentNodeBinding ? [templateContext.currentNodeExpression.code] : [],
    outputExpression.code,
    ...finalizedGlobalBindingSetup
  ]);
  if (needsDocumentBinding) {
    runtimeHelpers.add("createCompiledDocument");
  }
  return {
    entryTemplate: primaryTemplate,
    needsDocumentBinding,
    currentNodeExpression: templateContext.currentNodeExpression,
    currentNodeMayBeNull: templateContext.currentNodeMayBeNull,
    needsCurrentNodeBinding,
    setupStatements: finalizedGlobalBindingSetup,
    outputExpression,
    runtimeHelpers: [...runtimeHelpers].sort()
  };
}
function tryCreateGlobalBindingSetup(bindings, runtimeHelpers) {
  if (bindings.length === 0) {
    return {
      bindingPlans: [],
      variableBindings: /* @__PURE__ */ new Map()
    };
  }
  const variableBindings = /* @__PURE__ */ new Map();
  const bindingSetupPlans = [];
  const bindingPlans = bindings.map((binding, index) => ({
    binding,
    identifier: `global_${binding.kind}_${sanitizeIdentifierFragment(binding.name)}_${index}`,
    getterIdentifier: `get_global_${binding.kind}_${sanitizeIdentifierFragment(binding.name)}_${index}`,
    stateIdentifier: `global_${binding.kind}_${sanitizeIdentifierFragment(binding.name)}_${index}_state`,
    cacheIdentifier: `global_${binding.kind}_${sanitizeIdentifierFragment(binding.name)}_${index}_cache`
  }));
  for (const plan of bindingPlans) {
    const bindingReference = tsRawExpression(`${plan.getterIdentifier}()`);
    variableBindings.set(plan.binding.name, bindingReference);
    if (!plan.binding.name.startsWith("{}")) {
      variableBindings.set(`{}${plan.binding.name}`, bindingReference);
    }
  }
  runtimeHelpers.add("prependNativeGlobalBindingError");
  runtimeHelpers.add("throwCircularNativeGlobalBinding");
  runtimeHelpers.add("throwMissingNativeStylesheetParameter");
  for (const plan of bindingPlans) {
    const { binding, identifier, getterIdentifier, stateIdentifier, cacheIdentifier } = plan;
    const setupStatements = [];
    const defaultValueExpression = binding.body !== void 0 ? emitTemporaryTreeBindingExpression(binding.body, runtimeHelpers, "document", { variableBindings }) : binding.select === void 0 ? tsStringLiteral("") : emitVariableValueExpression(binding.select, runtimeHelpers, "document", { variableBindings });
    if (defaultValueExpression === void 0) {
      return void 0;
    }
    setupStatements.push(`let ${stateIdentifier} = 0;`);
    setupStatements.push(`const ${cacheIdentifier} = new Map();`);
    setupStatements.push(`function ${getterIdentifier}() {`);
    setupStatements.push(`  if (${stateIdentifier} === 2) { return ${cacheIdentifier}.get("value"); }`);
    setupStatements.push(`  if (${stateIdentifier} === 1) { throwCircularNativeGlobalBinding(${JSON.stringify(binding.kind)}, ${JSON.stringify(binding.name)}, ${JSON.stringify(binding.location)}); }`);
    setupStatements.push(`  ${stateIdentifier} = 1;`);
    setupStatements.push("  try {");
    if (binding.kind === "param") {
      setupStatements.push(
        `    const raw_${identifier} = ctx.parameters?.[${JSON.stringify(binding.name)}] ?? ctx.parameters?.[${JSON.stringify(binding.name.startsWith("{}") ? binding.name : `{}${binding.name}`)}];`
      );
      if (binding.required) {
        setupStatements.push(`    if (raw_${identifier} === undefined) { throwMissingNativeStylesheetParameter(${JSON.stringify(binding.name)}, Object.keys(ctx.parameters ?? {}), ${JSON.stringify(binding.location)}); }`);
        setupStatements.push(`    ${cacheIdentifier}.set("value", String(raw_${identifier}));`);
      } else {
        setupStatements.push(
          `    ${cacheIdentifier}.set("value", raw_${identifier} === undefined ? ${defaultValueExpression.code} : String(raw_${identifier}));`
        );
      }
    } else {
      setupStatements.push(`    ${cacheIdentifier}.set("value", ${defaultValueExpression.code});`);
    }
    setupStatements.push(`    ${stateIdentifier} = 2;`);
    setupStatements.push(`    return ${cacheIdentifier}.get("value");`);
    setupStatements.push("  } catch (error) {");
    setupStatements.push(`    ${stateIdentifier} = 0;`);
    setupStatements.push(`    throw prependNativeGlobalBindingError(error, ${JSON.stringify(binding.kind)}, ${JSON.stringify(binding.name)}, ${JSON.stringify(binding.selectText)}, ${JSON.stringify(binding.location)});`);
    setupStatements.push("  }");
    setupStatements.push("}");
    bindingSetupPlans.push({ getterIdentifier, setupStatements });
  }
  return {
    bindingPlans: bindingSetupPlans,
    variableBindings
  };
}
function finalizeGlobalBindingSetup(setup, referenceSources) {
  if (setup.bindingPlans.length === 0) {
    return [];
  }
  const selectedGetters = /* @__PURE__ */ new Set();
  const pendingGetters = [];
  const enqueueGetter = (getterIdentifier) => {
    if (selectedGetters.has(getterIdentifier)) {
      return;
    }
    selectedGetters.add(getterIdentifier);
    pendingGetters.push(getterIdentifier);
  };
  for (const plan of setup.bindingPlans) {
    if (referenceSources.some((source) => source.includes(`${plan.getterIdentifier}(`))) {
      enqueueGetter(plan.getterIdentifier);
    }
  }
  while (pendingGetters.length > 0) {
    const getterIdentifier = pendingGetters.pop();
    const plan = setup.bindingPlans.find((candidate) => candidate.getterIdentifier === getterIdentifier);
    if (plan === void 0) {
      continue;
    }
    const setupSource = plan.setupStatements.join("\n");
    for (const dependencyPlan of setup.bindingPlans) {
      if (setupSource.includes(`${dependencyPlan.getterIdentifier}(`)) {
        enqueueGetter(dependencyPlan.getterIdentifier);
      }
    }
  }
  return setup.bindingPlans.filter((plan) => selectedGetters.has(plan.getterIdentifier)).flatMap((plan) => plan.setupStatements);
}
function hasDocumentReference(referenceSources) {
  return referenceSources.some((source) => /\bdocument\b/.test(source));
}
function tryCreateTemplateParamSetup(params, runtimeHelpers, parentBindings, contextNodeIdentifier) {
  if (params.length === 0) {
    return {
      setupStatements: [],
      variableBindings: new Map(parentBindings)
    };
  }
  runtimeHelpers.add("throwMissingNativeTemplateParameter");
  const setupStatements = [];
  const variableBindings = new Map(parentBindings);
  for (const [index, param] of params.entries()) {
    const identifier = `template_param_${sanitizeIdentifierFragment(param.name)}_${index}`;
    if (param.required) {
      setupStatements.push(
        `const ${identifier} = (() => { throwMissingNativeTemplateParameter(${JSON.stringify(param.name)}, [], ${JSON.stringify(param.location)}); })();`
      );
    } else {
      const valueExpression = param.body !== void 0 ? emitTemporaryTreeBindingExpression(param.body, runtimeHelpers, contextNodeIdentifier, { variableBindings }) : param.select === void 0 ? tsStringLiteral("") : emitVariableValueExpression(param.select, runtimeHelpers, contextNodeIdentifier, { variableBindings });
      if (valueExpression === void 0) {
        return void 0;
      }
      setupStatements.push(`const ${identifier} = ${valueExpression.code};`);
    }
    const bindingReference = tsRawExpression(identifier);
    variableBindings.set(param.name, bindingReference);
    if (!param.name.startsWith("{}")) {
      variableBindings.set(`{}${param.name}`, bindingReference);
    }
  }
  return {
    setupStatements,
    variableBindings
  };
}
function tryCreateTemplateInvocationSetup(params, withParams, runtimeHelpers, parentBindings, callerContextNodeIdentifier, calleeContextNodeIdentifier, callerPositionExpression, callerLastExpression, calleePositionExpression, calleeLastExpression) {
  if (params.length === 0 && withParams.length === 0) {
    return {
      setupStatements: [],
      variableBindings: new Map(parentBindings)
    };
  }
  runtimeHelpers.add("throwMissingNativeTemplateParameter");
  const setupStatements = [];
  const variableBindings = new Map(parentBindings);
  const providedBindings = /* @__PURE__ */ new Map();
  for (const [index, withParam] of withParams.entries()) {
    const identifier = `call_template_param_${sanitizeIdentifierFragment(withParam.name)}_${index}`;
    const valueExpression = withParam.body !== void 0 ? emitTemporaryTreeBindingExpression(withParam.body, runtimeHelpers, callerContextNodeIdentifier, {
      ...callerPositionExpression === void 0 ? {} : { positionExpression: callerPositionExpression },
      ...callerLastExpression === void 0 ? {} : { lastExpression: callerLastExpression },
      ...parentBindings === void 0 ? {} : { variableBindings: parentBindings }
    }) : withParam.select === void 0 ? tsStringLiteral("") : emitVariableValueExpression(withParam.select, runtimeHelpers, callerContextNodeIdentifier, {
      ...callerPositionExpression === void 0 ? {} : { positionExpression: callerPositionExpression },
      ...callerLastExpression === void 0 ? {} : { lastExpression: callerLastExpression },
      ...parentBindings === void 0 ? {} : { variableBindings: parentBindings }
    });
    if (valueExpression === void 0) {
      return void 0;
    }
    setupStatements.push(`const ${identifier} = ${valueExpression.code};`);
    const bindingReference = tsRawExpression(identifier);
    providedBindings.set(withParam.name, bindingReference);
    if (!withParam.name.startsWith("{}")) {
      providedBindings.set(`{}${withParam.name}`, bindingReference);
    }
  }
  const providedNames = withParams.map((withParam) => withParam.name);
  for (const [index, param] of params.entries()) {
    const identifier = `template_param_${sanitizeIdentifierFragment(param.name)}_${index}`;
    const providedBinding = providedBindings.get(param.name) ?? (param.name.startsWith("{}") ? void 0 : providedBindings.get(`{}${param.name}`));
    if (providedBinding !== void 0) {
      setupStatements.push(`const ${identifier} = ${providedBinding.code};`);
    } else if (param.required) {
      setupStatements.push(
        `const ${identifier} = (() => { throwMissingNativeTemplateParameter(${JSON.stringify(param.name)}, ${JSON.stringify(providedNames)}, ${JSON.stringify(param.location)}); })();`
      );
    } else {
      const valueExpression = param.body !== void 0 ? emitTemporaryTreeBindingExpression(param.body, runtimeHelpers, calleeContextNodeIdentifier, {
        ...calleePositionExpression === void 0 ? {} : { positionExpression: calleePositionExpression },
        ...calleeLastExpression === void 0 ? {} : { lastExpression: calleeLastExpression },
        variableBindings
      }) : param.select === void 0 ? tsStringLiteral("") : emitVariableValueExpression(param.select, runtimeHelpers, calleeContextNodeIdentifier, {
        ...calleePositionExpression === void 0 ? {} : { positionExpression: calleePositionExpression },
        ...calleeLastExpression === void 0 ? {} : { lastExpression: calleeLastExpression },
        variableBindings
      });
      if (valueExpression === void 0) {
        return void 0;
      }
      setupStatements.push(`const ${identifier} = ${valueExpression.code};`);
    }
    const bindingReference = tsRawExpression(identifier);
    variableBindings.set(param.name, bindingReference);
    if (!param.name.startsWith("{}")) {
      variableBindings.set(`{}${param.name}`, bindingReference);
    }
  }
  return {
    setupStatements,
    variableBindings
  };
}
function createTemplateContextPlan(template, runtimeHelpers) {
  if (template.match === void 0 || template.match.kind !== "path") {
    return void 0;
  }
  if (template.match.absolute && template.match.base === void 0 && template.match.steps.length === 0) {
    return {
      currentNodeExpression: tsRawExpression("document"),
      currentNodeMayBeNull: false
    };
  }
  const matchPath = tryGetSimpleMatchPath(template.match);
  if (matchPath === void 0) {
    return void 0;
  }
  runtimeHelpers.add("selectSimplePathNode");
  return {
    currentNodeExpression: tsCallExpression("selectSimplePathNode", [
      tsRawExpression("document"),
      tsRawExpression(JSON.stringify(matchPath))
    ]),
    currentNodeMayBeNull: true
  };
}
function emitInstructionSequence(instructions, runtimeHelpers, options = {}) {
  const expressions = [];
  const contextNodeIdentifier = options.contextNodeIdentifier ?? "currentNode";
  for (const instruction of instructions) {
    if (instruction.kind === "variable") {
      const bindingExpression = emitVariableBindingExpression(instruction, runtimeHelpers, contextNodeIdentifier, options);
      if (bindingExpression === void 0) {
        return void 0;
      }
      const variableIdentifier = `variable_${sanitizeIdentifierFragment(instruction.name)}_${expressions.length}`;
      const variableBindings = new Map(options.variableBindings ?? []);
      const bindingReference = tsRawExpression(variableIdentifier);
      variableBindings.set(instruction.name, bindingReference);
      if (!instruction.name.startsWith("{}")) {
        variableBindings.set(`{}${instruction.name}`, bindingReference);
      }
      const remainingExpression = emitInstructionSequence(
        instructions.slice(expressions.length + 1),
        runtimeHelpers,
        {
          ...options,
          contextNodeIdentifier,
          variableBindings
        }
      );
      if (remainingExpression === void 0) {
        return void 0;
      }
      const outputExpression = expressions.length === 0 ? remainingExpression : tsConcatExpression([...expressions, remainingExpression]);
      return tsRawExpression(`(() => { const ${variableIdentifier} = ${bindingExpression.code}; return ${outputExpression.code}; })()`);
    }
    const emitted = emitInstruction(instruction, runtimeHelpers, contextNodeIdentifier, options);
    if (emitted === void 0) {
      return void 0;
    }
    expressions.push(emitted);
  }
  return tsConcatExpression(expressions);
}
function emitInstruction(instruction, runtimeHelpers, contextNodeIdentifier, options) {
  const annotateInstruction = (expression) => {
    if (expression === void 0) {
      return void 0;
    }
    const comment = renderInstructionProvenanceComment(instruction, options.sourcePath);
    if (comment === void 0) {
      return expression;
    }
    return tsRawExpression(`(
  ${comment}
  ${expression.code}
)`);
  };
  switch (instruction.kind) {
    case "literalElement": {
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier
      });
      if (body === void 0) {
        return void 0;
      }
      return annotateInstruction(tsConcatExpression([
        tsStringLiteral(`<${instruction.name}${emitAttributes(instruction.attributes)}>`),
        body,
        tsStringLiteral(`</${instruction.name}>`)
      ]));
    }
    case "literalText":
      return tsStringLiteral(escapeTextLiteral(instruction.text));
    case "comment": {
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier
      });
      if (body === void 0) {
        return void 0;
      }
      return annotateInstruction(tsConcatExpression([
        tsStringLiteral("<!--"),
        body,
        tsStringLiteral("-->")
      ]));
    }
    case "valueOf": {
      if (instruction.select.kind === "contextItem") {
        runtimeHelpers.add("escapeText");
        runtimeHelpers.add("stringValueOfNode");
        return tsCallExpression("escapeText", [
          tsCallExpression("stringValueOfNode", [
            tsRawExpression(contextNodeIdentifier)
          ])
        ]);
      }
      if (instruction.select.kind === "variable") {
        const variableExpression = resolveVariableBindingExpression(instruction.select.name, options.variableBindings);
        if (variableExpression === void 0) {
          return void 0;
        }
        runtimeHelpers.add("escapeText");
        runtimeHelpers.add("stringValueOfNativeValue");
        return annotateInstruction(tsCallExpression("escapeText", [
          tsCallExpression("stringValueOfNativeValue", [variableExpression])
        ]));
      }
      if (instruction.select.kind === "functionCall" && instruction.select.arguments.length === 0) {
        let numericExpression;
        if (instruction.select.callee === "position") {
          numericExpression = options.positionExpression ?? "1";
        }
        if (instruction.select.callee === "last") {
          numericExpression = options.lastExpression ?? "1";
        }
        if (numericExpression !== void 0) {
          runtimeHelpers.add("escapeText");
          return annotateInstruction(tsCallExpression("escapeText", [
            tsRawExpression(`String(${numericExpression})`)
          ]));
        }
        if (instruction.select.callee === "name") {
          runtimeHelpers.add("escapeText");
          runtimeHelpers.add("nameOfNode");
          return annotateInstruction(tsCallExpression("escapeText", [
            tsCallExpression("nameOfNode", [
              tsRawExpression(contextNodeIdentifier)
            ])
          ]));
        }
        if (instruction.select.callee === "local-name") {
          runtimeHelpers.add("escapeText");
          runtimeHelpers.add("localNameOfNode");
          return annotateInstruction(tsCallExpression("escapeText", [
            tsCallExpression("localNameOfNode", [
              tsRawExpression(contextNodeIdentifier)
            ])
          ]));
        }
      }
      if (instruction.select.kind === "functionCall" && instruction.select.arguments.length === 1) {
        const [argument] = instruction.select.arguments;
        if (argument !== void 0 && argument.kind === "path") {
          const simplePath = tryResolveSimpleChildPath(argument, contextNodeIdentifier, options.variableBindings);
          if (simplePath !== void 0) {
            if (instruction.select.callee === "name") {
              runtimeHelpers.add("escapeText");
              runtimeHelpers.add("nameOfNode");
              runtimeHelpers.add("selectSimplePathNode");
              return annotateInstruction(tsCallExpression("escapeText", [
                tsCallExpression("nameOfNode", [
                  tsCallExpression("selectSimplePathNode", [
                    simplePath.startNodeExpression,
                    tsRawExpression(JSON.stringify(simplePath.segments))
                  ])
                ])
              ]));
            }
            if (instruction.select.callee === "local-name") {
              runtimeHelpers.add("escapeText");
              runtimeHelpers.add("localNameOfNode");
              runtimeHelpers.add("selectSimplePathNode");
              return annotateInstruction(tsCallExpression("escapeText", [
                tsCallExpression("localNameOfNode", [
                  tsCallExpression("selectSimplePathNode", [
                    simplePath.startNodeExpression,
                    tsRawExpression(JSON.stringify(simplePath.segments))
                  ])
                ])
              ]));
            }
            if (instruction.select.callee === "count") {
              runtimeHelpers.add("escapeText");
              runtimeHelpers.add("selectSimplePathNodes");
              return annotateInstruction(tsCallExpression("escapeText", [
                tsRawExpression(`String(selectSimplePathNodes(${simplePath.startNodeExpression.code}, ${JSON.stringify(simplePath.segments)}).length)`)
              ]));
            }
          }
        }
      }
      if (instruction.select.kind !== "path") {
        return void 0;
      }
      const pathValue = emitPathStringValueExpression(
        instruction.select,
        runtimeHelpers,
        contextNodeIdentifier,
        options.variableBindings
      );
      if (pathValue === void 0) {
        return void 0;
      }
      runtimeHelpers.add("escapeText");
      return annotateInstruction(tsCallExpression("escapeText", [pathValue]));
    }
    case "if": {
      const testExpression = emitTestExpression(
        instruction.test,
        runtimeHelpers,
        contextNodeIdentifier,
        options.positionExpression,
        options.lastExpression
      );
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier
      });
      if (testExpression === void 0 || body === void 0) {
        return void 0;
      }
      return annotateInstruction(tsConditionalExpression(testExpression, body, tsStringLiteral("")));
    }
    case "choose": {
      const annotateBranchBody = (comment, body) => tsRawExpression(`(
  ${comment}
  ${body.code}
)`);
      const branches = [];
      for (const branch of instruction.whenBranches) {
        const testExpression = emitTestExpression(
          branch.test,
          runtimeHelpers,
          contextNodeIdentifier,
          options.positionExpression,
          options.lastExpression
        );
        const bodyExpression = emitInstructionSequence(branch.body, runtimeHelpers, {
          ...options,
          contextNodeIdentifier
        });
        if (testExpression === void 0 || bodyExpression === void 0) {
          return void 0;
        }
        branches.push({
          test: testExpression,
          body: annotateBranchBody(renderWhenProvenanceComment(branch, options.sourcePath), bodyExpression)
        });
      }
      if (branches.length === 0) {
        return void 0;
      }
      let otherwiseExpression = instruction.otherwiseBody === void 0 ? tsStringLiteral("") : emitInstructionSequence(instruction.otherwiseBody, runtimeHelpers, {
        ...options,
        contextNodeIdentifier
      });
      if (otherwiseExpression === void 0) {
        return void 0;
      }
      if (instruction.otherwiseBody !== void 0) {
        otherwiseExpression = annotateBranchBody(
          renderOtherwiseProvenanceComment(instruction.otherwiseLocation, options.sourcePath),
          otherwiseExpression
        );
      }
      for (let index = branches.length - 1; index >= 0; index -= 1) {
        const branch = branches[index];
        if (branch === void 0) {
          return void 0;
        }
        otherwiseExpression = tsConditionalExpression(branch.test, branch.body, otherwiseExpression);
      }
      return annotateInstruction(otherwiseExpression);
    }
    case "forEach": {
      const simplePath = tryGetSimpleChildPath(instruction.select);
      const body = emitInstructionSequence(instruction.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier: "currentNode",
        positionExpression: "(currentIndex + 1)",
        lastExpression: "currentNodes.length"
      });
      if (simplePath === void 0 || body === void 0) {
        return void 0;
      }
      runtimeHelpers.add("selectSimplePathNodes");
      const startNode = simplePath.absolute ? "document" : contextNodeIdentifier;
      const callbackParameters = body.code.includes("currentIndex") || body.code.includes("currentNodes.length") ? "(currentNode, currentIndex, currentNodes)" : "(currentNode)";
      return annotateInstruction(tsRawExpression(
        `selectSimplePathNodes(${startNode}, ${JSON.stringify(simplePath.segments)}).map(${callbackParameters} => ${body.code}).join("")`
      ));
    }
    case "callTemplate": {
      const namedTemplate = options.namedTemplates?.get(instruction.name);
      if (namedTemplate === void 0 || namedTemplate.match !== void 0 || namedTemplate.modes.length > 0) {
        return void 0;
      }
      const activeNamedTemplateNames = options.activeNamedTemplateNames ?? [];
      if (activeNamedTemplateNames.includes(instruction.name)) {
        return void 0;
      }
      const invocationSetup = tryCreateTemplateInvocationSetup(
        namedTemplate.params,
        instruction.withParams,
        runtimeHelpers,
        options.variableBindings,
        contextNodeIdentifier,
        contextNodeIdentifier,
        options.positionExpression,
        options.lastExpression,
        options.positionExpression,
        options.lastExpression
      );
      if (invocationSetup === void 0) {
        return void 0;
      }
      const body = emitInstructionSequence(namedTemplate.body, runtimeHelpers, {
        ...options,
        contextNodeIdentifier,
        activeNamedTemplateNames: [...activeNamedTemplateNames, instruction.name],
        variableBindings: invocationSetup.variableBindings
      });
      if (body === void 0) {
        return void 0;
      }
      const invocationBody = invocationSetup.setupStatements.length === 0 ? body.code : `(() => {
${invocationSetup.setupStatements.map((statement) => `  ${statement}`).join("\n")}
  return ${body.code};
})()`;
      return annotateInstruction(tsRawExpression(
        `(${renderCommentedArrowFunction(
          renderTemplateProvenanceComment(namedTemplate, options.sourcePath),
          "()",
          invocationBody
        )})()`
      ));
    }
    case "applyTemplates":
      return annotateInstruction(options.renderApplyTemplates?.(instruction, contextNodeIdentifier, {
        ...options.positionExpression === void 0 ? {} : { positionExpression: options.positionExpression },
        ...options.lastExpression === void 0 ? {} : { lastExpression: options.lastExpression },
        ...options.variableBindings === void 0 ? {} : { variableBindings: options.variableBindings }
      }));
    default:
      return void 0;
  }
}
function emitTestExpression(ast, runtimeHelpers, contextNodeIdentifier, positionExpression = "1", lastExpression = "1") {
  switch (ast.kind) {
    case "binary":
      return emitBinaryTestExpression(ast, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
    case "functionCall":
      return emitFunctionCallTestExpression(ast, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
    case "path": {
      const simplePath = tryGetSimpleChildPath(ast);
      if (simplePath === void 0) {
        return void 0;
      }
      runtimeHelpers.add("selectSimplePathExists");
      const startNode = simplePath.absolute ? "document" : contextNodeIdentifier;
      return tsCallExpression("selectSimplePathExists", [
        tsRawExpression(startNode),
        tsRawExpression(JSON.stringify(simplePath.segments))
      ]);
    }
    default:
      return void 0;
  }
}
function emitFunctionCallTestExpression(ast, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression) {
  if (ast.callee === "true" && ast.arguments.length === 0) {
    return tsRawExpression("true");
  }
  if (ast.callee === "false" && ast.arguments.length === 0) {
    return tsRawExpression("false");
  }
  if (ast.callee === "position" && ast.arguments.length === 0) {
    return tsRawExpression(`(${positionExpression}) !== 0`);
  }
  if (ast.callee === "last" && ast.arguments.length === 0) {
    return tsRawExpression(`(${lastExpression}) !== 0`);
  }
  if (ast.callee !== "not" || ast.arguments.length !== 1) {
    return void 0;
  }
  const [argument] = ast.arguments;
  if (argument === void 0) {
    return void 0;
  }
  const testExpression = emitTestExpression(argument, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
  if (testExpression === void 0) {
    return void 0;
  }
  return tsRawExpression(`(!${testExpression.code})`);
}
function emitBinaryTestExpression(ast, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression) {
  if (ast.operator === "and" || ast.operator === "or") {
    const left2 = emitTestExpression(ast.left, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
    const right2 = emitTestExpression(ast.right, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
    if (left2 === void 0 || right2 === void 0) {
      return void 0;
    }
    return tsBinaryExpression(left2, ast.operator === "and" ? "&&" : "||", right2);
  }
  const operator = mapComparisonOperator(ast.operator);
  if (operator === void 0) {
    return void 0;
  }
  const left = emitComparisonOperand(ast.left, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
  const right = emitComparisonOperand(ast.right, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression);
  if (left === void 0 || right === void 0 || left.kind !== right.kind) {
    return void 0;
  }
  return tsBinaryExpression(left.expression, operator, right.expression);
}
function emitComparisonOperand(ast, runtimeHelpers, contextNodeIdentifier, positionExpression, lastExpression) {
  switch (ast.kind) {
    case "number":
      return {
        kind: "number",
        expression: tsRawExpression(ast.lexeme)
      };
    case "string":
      return {
        kind: "string",
        expression: tsStringLiteral(ast.value)
      };
    case "path": {
      const pathValue = emitPathStringValueExpression(ast, runtimeHelpers, contextNodeIdentifier);
      if (pathValue === void 0) {
        return void 0;
      }
      return {
        kind: "string",
        expression: pathValue
      };
    }
    case "functionCall":
      if (ast.arguments.length !== 0) {
        return void 0;
      }
      if (ast.callee === "position") {
        return {
          kind: "number",
          expression: tsRawExpression(positionExpression)
        };
      }
      if (ast.callee === "last") {
        return {
          kind: "number",
          expression: tsRawExpression(lastExpression)
        };
      }
      return void 0;
    default:
      return void 0;
  }
}
function mapComparisonOperator(operator) {
  switch (operator) {
    case "=":
    case "eq":
      return "===";
    case "!=":
    case "ne":
      return "!==";
    case "<":
    case "lt":
      return "<";
    case "<=":
    case "le":
      return "<=";
    case ">":
    case "gt":
      return ">";
    case ">=":
    case "ge":
      return ">=";
    default:
      return void 0;
  }
}
function emitAttributes(attributes) {
  return attributes.map((attribute) => ` ${attribute.name}="${escapeAttributeLiteral(attribute.value)}"`).join("");
}
function tryGetSimpleMatchPath(ast) {
  if (!ast.absolute || ast.base !== void 0 || ast.steps.length === 0) {
    return void 0;
  }
  const path = [];
  for (const step of ast.steps) {
    if (step.kind !== "step" || step.axis !== "child" || step.predicates.length > 0 || step.nodeTest.kind !== "nameTest" || step.nodeTest.name.includes(":")) {
      return void 0;
    }
    path.push(step.nodeTest.name);
  }
  return path;
}
function tryGetSimpleChildPath(ast) {
  if (!("kind" in ast) || ast.kind !== "path" || ast.base !== void 0) {
    return void 0;
  }
  const segments = tryGetSimpleChildSegments(ast);
  if (segments === void 0) {
    return void 0;
  }
  return {
    absolute: ast.absolute,
    segments
  };
}
function tryResolveSimpleChildPath(ast, contextNodeIdentifier, variableBindings) {
  const segments = tryGetSimpleChildSegments(ast);
  if (segments === void 0) {
    return void 0;
  }
  if (ast.base === void 0) {
    return {
      startNodeExpression: ast.absolute ? tsRawExpression("document") : tsRawExpression(contextNodeIdentifier),
      segments
    };
  }
  if (ast.base.kind !== "variable") {
    return void 0;
  }
  const variableExpression = resolveVariableBindingExpression(ast.base.name, variableBindings);
  if (variableExpression === void 0) {
    return void 0;
  }
  return {
    startNodeExpression: variableExpression,
    segments
  };
}
function tryGetSimpleChildSegments(ast) {
  const names = [];
  for (const step of ast.steps) {
    if (step.kind !== "step" || step.axis !== "child" || step.predicates.length > 0) {
      return void 0;
    }
    if (step.nodeTest.kind === "nameTest") {
      if (step.nodeTest.name.includes(":")) {
        return void 0;
      }
      names.push(step.nodeTest.name);
      continue;
    }
    if (step.nodeTest.kind === "wildcardTest") {
      names.push("*");
      continue;
    }
    return void 0;
  }
  return names;
}
function emitPathStringValueExpression(ast, runtimeHelpers, contextNodeIdentifier, variableBindings) {
  if (variableBindings === void 0) {
    const simplePath = tryGetSimpleChildPath(ast);
    if (simplePath !== void 0) {
      runtimeHelpers.add("selectSimplePathText");
      return tsCallExpression("selectSimplePathText", [
        tsRawExpression(simplePath.absolute ? "document" : contextNodeIdentifier),
        tsRawExpression(JSON.stringify(simplePath.segments))
      ]);
    }
  } else {
    const simplePath = tryResolveSimpleChildPath(ast, contextNodeIdentifier, variableBindings);
    if (simplePath !== void 0) {
      runtimeHelpers.add("selectSimplePathText");
      return tsCallExpression("selectSimplePathText", [
        simplePath.startNodeExpression,
        tsRawExpression(JSON.stringify(simplePath.segments))
      ]);
    }
  }
  const descendantPath = tryGetSimpleDescendantNamePath(ast);
  if (descendantPath === void 0) {
    return void 0;
  }
  runtimeHelpers.add("selectDescendantElementTextByName");
  return tsCallExpression("selectDescendantElementTextByName", [
    tsRawExpression(descendantPath.absolute ? "document" : contextNodeIdentifier),
    tsStringLiteral(descendantPath.localName)
  ]);
}
function tryGetSimpleDescendantNamePath(ast) {
  if (ast.base !== void 0 || ast.steps.length !== 2) {
    return void 0;
  }
  const [leadingStep, terminalStep] = ast.steps;
  if (leadingStep === void 0 || leadingStep.kind !== "step" || leadingStep.axis !== "descendant-or-self" || leadingStep.predicates.length > 0 || leadingStep.nodeTest.kind !== "kindTest" || leadingStep.nodeTest.name !== "node" || terminalStep === void 0 || terminalStep.kind !== "step" || terminalStep.axis !== "child" || terminalStep.predicates.length > 0 || terminalStep.nodeTest.kind !== "nameTest" || terminalStep.nodeTest.name.includes(":")) {
    return void 0;
  }
  return {
    absolute: ast.absolute,
    localName: terminalStep.nodeTest.name
  };
}
function escapeTextLiteral(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function escapeAttributeLiteral(value) {
  return escapeTextLiteral(value).replaceAll('"', "&quot;");
}
function emitVariableBindingExpression(instruction, runtimeHelpers, contextNodeIdentifier, options) {
  if (instruction.body !== void 0) {
    return emitTemporaryTreeBindingExpression(instruction.body, runtimeHelpers, contextNodeIdentifier, options);
  }
  if (instruction.select === void 0) {
    return tsStringLiteral("");
  }
  return emitVariableValueExpression(instruction.select, runtimeHelpers, contextNodeIdentifier, options);
}
function emitTemporaryTreeBindingExpression(body, runtimeHelpers, contextNodeIdentifier, options) {
  const serializedBody = emitInstructionSequence(body, runtimeHelpers, {
    contextNodeIdentifier,
    ...options.positionExpression === void 0 ? {} : { positionExpression: options.positionExpression },
    ...options.lastExpression === void 0 ? {} : { lastExpression: options.lastExpression },
    ...options.variableBindings === void 0 ? {} : { variableBindings: options.variableBindings }
  });
  if (serializedBody === void 0) {
    return void 0;
  }
  runtimeHelpers.add("createTemporaryTreeNode");
  return tsCallExpression("createTemporaryTreeNode", [serializedBody]);
}
function emitVariableValueExpression(ast, runtimeHelpers, contextNodeIdentifier, options) {
  switch (ast.kind) {
    case "contextItem":
      runtimeHelpers.add("stringValueOfNode");
      return tsCallExpression("stringValueOfNode", [tsRawExpression(contextNodeIdentifier)]);
    case "string":
      return tsStringLiteral(ast.value);
    case "number":
      return tsRawExpression(`String(${ast.lexeme})`);
    case "variable":
      return resolveVariableBindingExpression(ast.name, options.variableBindings);
    case "path": {
      const pathValue = emitPathStringValueExpression(ast, runtimeHelpers, contextNodeIdentifier);
      if (pathValue === void 0) {
        return void 0;
      }
      return pathValue;
    }
    case "functionCall": {
      if (ast.arguments.length === 0) {
        if (ast.callee === "position") {
          return tsRawExpression(`String(${options.positionExpression ?? "1"})`);
        }
        if (ast.callee === "last") {
          return tsRawExpression(`String(${options.lastExpression ?? "1"})`);
        }
        if (ast.callee === "name") {
          runtimeHelpers.add("nameOfNode");
          return tsCallExpression("nameOfNode", [tsRawExpression(contextNodeIdentifier)]);
        }
        if (ast.callee === "local-name") {
          runtimeHelpers.add("localNameOfNode");
          return tsCallExpression("localNameOfNode", [tsRawExpression(contextNodeIdentifier)]);
        }
      }
      if (ast.arguments.length === 1) {
        const [argument] = ast.arguments;
        if (argument === void 0 || argument.kind !== "path") {
          return void 0;
        }
        const simplePath = tryGetSimpleChildPath(argument);
        if (simplePath === void 0) {
          return void 0;
        }
        const startNode = simplePath.absolute ? "document" : contextNodeIdentifier;
        if (ast.callee === "name") {
          runtimeHelpers.add("nameOfNode");
          runtimeHelpers.add("selectSimplePathNode");
          return tsCallExpression("nameOfNode", [
            tsCallExpression("selectSimplePathNode", [
              tsRawExpression(startNode),
              tsRawExpression(JSON.stringify(simplePath.segments))
            ])
          ]);
        }
        if (ast.callee === "local-name") {
          runtimeHelpers.add("localNameOfNode");
          runtimeHelpers.add("selectSimplePathNode");
          return tsCallExpression("localNameOfNode", [
            tsCallExpression("selectSimplePathNode", [
              tsRawExpression(startNode),
              tsRawExpression(JSON.stringify(simplePath.segments))
            ])
          ]);
        }
        if (ast.callee === "count") {
          runtimeHelpers.add("selectSimplePathNodes");
          return tsRawExpression(`String(selectSimplePathNodes(${startNode}, ${JSON.stringify(simplePath.segments)}).length)`);
        }
      }
      return void 0;
    }
    default:
      return void 0;
  }
}
function resolveVariableBindingExpression(name, variableBindings) {
  if (variableBindings === void 0) {
    return void 0;
  }
  return variableBindings.get(name) ?? (name.startsWith("{}") ? void 0 : variableBindings.get(`{}${name}`));
}
function sanitizeIdentifierFragment(name) {
  return name.replaceAll(/[^A-Za-z0-9_]/g, "_");
}

// src/xslt/codegen/emit.ts
function emitStylesheetModule(ir, options) {
  const plan = createEmitPlan(ir, options);
  const nativePlan = tryCreateNativeTransformPlan(plan.stylesheet, plan.sourcePath);
  const typeBlock = createStylesheetTypeBlock(ir);
  if (nativePlan !== void 0) {
    const initialModeGuardStatements = [
      "  if (ctx.initialMode !== undefined) {",
      "    throwUnsupportedNativeInitialMode(ctx.initialMode);",
      "  }"
    ];
    const missingInitialTemplateGuardStatements = nativePlan.initialTemplateName !== void 0 ? [] : [
      "  if (ctx.initialTemplate !== undefined) {",
      "    throwMissingNativeInitialTemplate(ctx.initialTemplate, []);",
      "  }"
    ];
    const initialTemplateValueStatements = nativePlan.initialTemplateName === void 0 ? [] : [
      "  const requestedInitialTemplate = ctx.initialTemplate === undefined",
      "    ? undefined",
      `    : normalizeNativeTemplateName(ctx.initialTemplate, ${JSON.stringify(ir.namespaces)}, ${JSON.stringify(ir.defaultElementNamespace)});`
    ];
    const initialTemplateGuardStatements = nativePlan.initialTemplateName === void 0 ? [] : [
      "  if (requestedInitialTemplate !== undefined && requestedInitialTemplate !== " + JSON.stringify(nativePlan.initialTemplateName) + ") {",
      "    throwMissingNativeInitialTemplate(ctx.initialTemplate, [" + JSON.stringify(nativePlan.initialTemplateName) + "]);",
      "  }"
    ];
    const defaultBodyStatements = [
      ...nativePlan.setupStatements.length === 0 ? ["  void ctx;"] : [],
      ...nativePlan.needsDocumentBinding ? ["  const document = createCompiledDocument(sourceXml);"] : ["  createCompiledDocument(sourceXml);"],
      ...nativePlan.setupStatements.map((statement) => `  ${statement}`),
      ...nativePlan.needsCurrentNodeBinding ? [`  const currentNode = ${renderTsExpression(nativePlan.currentNodeExpression)};`] : [],
      ...nativePlan.currentNodeMayBeNull ? [
        "  if (currentNode === null) {",
        '    return { output: "" };',
        "  }"
      ] : [],
      "  return {",
      "    output:",
      `      ${renderTsExpression(nativePlan.outputExpression)},`,
      "  };"
    ];
    const wrappedDefaultBodyStatements = nativePlan.initialTemplateEntryTemplate !== void 0 ? defaultBodyStatements : nativePlan.initialTemplateName === void 0 ? defaultBodyStatements : [
      "  try {",
      ...defaultBodyStatements.map((statement) => `  ${statement.slice(2)}`),
      "  } catch (error) {",
      `    throw prependNativeInitialTemplateError(error, ${JSON.stringify(nativePlan.initialTemplateName)}, ${JSON.stringify(nativePlan.entryTemplate.location)});`,
      "  }"
    ];
    const initialTemplateBodyStatements = nativePlan.initialTemplateEntryTemplate === void 0 ? [] : [
      "  if (requestedInitialTemplate === " + JSON.stringify(nativePlan.initialTemplateName) + ") {",
      "    try {",
      ...(nativePlan.initialTemplateSetupStatements ?? []).length === 0 ? ["      void ctx;"] : [],
      ...nativePlan.needsDocumentBinding ? ["      const document = createCompiledDocument(sourceXml);"] : ["      createCompiledDocument(sourceXml);"],
      ...(nativePlan.initialTemplateSetupStatements ?? []).map((statement) => `      ${statement}`),
      ...nativePlan.initialTemplateNeedsCurrentNodeBinding ?? false ? [`      const currentNode = ${renderTsExpression(nativePlan.initialTemplateCurrentNodeExpression)};`] : [],
      ...nativePlan.initialTemplateCurrentNodeMayBeNull ?? false ? [
        "      if (currentNode === null) {",
        '        return { output: "" };',
        "      }"
      ] : [],
      "      return {",
      "        output:",
      `          ${renderTsExpression(nativePlan.initialTemplateOutputExpression)},`,
      "      };",
      "    } catch (error) {",
      `      throw prependNativeInitialTemplateError(error, ${JSON.stringify(nativePlan.initialTemplateName)}, ${JSON.stringify(nativePlan.initialTemplateEntryTemplate.location)});`,
      "    }",
      "  }"
    ];
    return renderTsModule({
      statements: [
        `import { ${[.../* @__PURE__ */ new Set(["throwMissingNativeInitialTemplate", "throwUnsupportedNativeInitialMode", ...nativePlan.runtimeHelpers])].join(", ")} } from ${JSON.stringify(plan.moduleSpecifier)};`,
        `import type { TransformContext, TransformResult } from ${JSON.stringify(plan.moduleSpecifier)};`,
        ...typeBlock.importStatements,
        "",
        ...typeBlock.typeStatements,
        ...typeBlock.typeStatements.length > 0 ? [""] : [],
        `export const source = { path: ${JSON.stringify(plan.sourcePath)}, digest: ${JSON.stringify(plan.digest)} } as const;`,
        "",
        renderTemplateProvenanceComment(nativePlan.entryTemplate, plan.sourcePath),
        `export function transform(sourceXml: string, ctx: ${typeBlock.transformContextTypeName} = {}): TransformResult {`,
        ...initialModeGuardStatements,
        ...missingInitialTemplateGuardStatements,
        ...initialTemplateValueStatements,
        ...initialTemplateGuardStatements,
        ...initialTemplateBodyStatements,
        ...wrappedDefaultBodyStatements,
        "}",
        "",
        "export default { source, transform };"
      ]
    });
  }
  return renderTsModule({
    statements: [
      `import { transformCompiledStylesheet } from ${JSON.stringify(plan.moduleSpecifier)};`,
      `import type { StylesheetIR, TransformContext, TransformResult } from ${JSON.stringify(plan.moduleSpecifier)};`,
      ...typeBlock.importStatements,
      "",
      `const stylesheet = ${plan.serializedIr} satisfies StylesheetIR;`,
      "",
      ...typeBlock.typeStatements,
      ...typeBlock.typeStatements.length > 0 ? [""] : [],
      `export const source = { path: ${JSON.stringify(plan.sourcePath)}, digest: ${JSON.stringify(plan.digest)} } as const;`,
      "",
      `export function transform(sourceXml: string, ctx: ${typeBlock.transformContextTypeName} = {}): TransformResult {`,
      "  return transformCompiledStylesheet(stylesheet, sourceXml, ctx);",
      "}",
      "",
      "export default { source, transform };"
    ]
  });
}
function emitStylesheetDeclarationModule(ir, options) {
  const plan = createEmitPlan(ir, options);
  const typeBlock = createStylesheetTypeBlock(ir);
  const statements = [
    `import type { TransformContext, TransformResult } from ${JSON.stringify(plan.moduleSpecifier)};`
  ];
  statements.push(...typeBlock.importStatements);
  statements.push("");
  statements.push(`export declare const source: { readonly path: ${JSON.stringify(plan.sourcePath)}; readonly digest: ${JSON.stringify(plan.digest)}; };`);
  statements.push("");
  statements.push(...typeBlock.typeStatements.map((statement) => statement.replace("export interface", "export interface").replace("export type", "export type")));
  statements.push("");
  statements.push("export declare function transform(sourceXml: string, ctx?: StylesheetTransformContext): TransformResult;");
  statements.push("");
  statements.push("declare const _default: {");
  statements.push("  readonly source: typeof source;");
  statements.push("  readonly transform: typeof transform;");
  statements.push("};");
  statements.push("");
  statements.push("export default _default;");
  return renderTsModule({ statements });
}
function mapStylesheetParamTypeToTs(declaredType, xmldomTypes) {
  if (declaredType === void 0) {
    return "unknown";
  }
  const trimmedType = declaredType.trim();
  const occurrence = trimmedType.at(-1);
  const baseType = occurrence === "?" || occurrence === "*" || occurrence === "+" ? trimmedType.slice(0, -1).trim() : trimmedType;
  const mappedBaseType = mapStylesheetBaseTypeToTs(baseType, xmldomTypes);
  if (occurrence === "*" || occurrence === "+") {
    return mappedBaseType.includes("|") ? `readonly (${mappedBaseType})[]` : `readonly ${mappedBaseType}[]`;
  }
  return mappedBaseType;
}
function mapStylesheetBaseTypeToTs(baseType, xmldomTypes) {
  switch (baseType) {
    case "xs:string":
      return "string";
    case "xs:integer":
    case "xs:double":
    case "xs:decimal":
    case "xs:float":
      return "number";
    case "xs:boolean":
      return "boolean";
    case "element()":
    case "element(*)":
      xmldomTypes.add("Element");
      return "Element";
    case "document-node()":
    case "document-node(element())":
    case "document-node(element(*))":
      xmldomTypes.add("Document");
      return "Document";
    case "node()":
      xmldomTypes.add("Node");
      return "Node";
    default:
      return "unknown";
  }
}
function createStylesheetTypeBlock(ir) {
  const parameters = ir.globalBindings.filter((binding) => binding.kind === "param");
  if (parameters.length === 0) {
    return {
      importStatements: [],
      typeStatements: [],
      transformContextTypeName: "TransformContext"
    };
  }
  const xmldomTypes = /* @__PURE__ */ new Set();
  const parameterLines = parameters.map((parameter) => {
    const typeText = mapStylesheetParamTypeToTs(parameter.asType, xmldomTypes);
    const optionalToken = parameter.required ? "" : "?";
    return `  readonly ${JSON.stringify(parameter.name)}${optionalToken}: ${typeText};`;
  });
  return {
    importStatements: xmldomTypes.size > 0 ? [`import type { ${[...xmldomTypes].sort().join(", ")} } from '@xmldom/xmldom';`] : [],
    typeStatements: [
      "export interface StylesheetParameters extends Readonly<Record<string, unknown>> {",
      ...parameterLines,
      "}",
      "",
      'export type StylesheetTransformContext = Omit<TransformContext, "parameters"> & {',
      "  readonly parameters?: StylesheetParameters;",
      "};"
    ],
    transformContextTypeName: "StylesheetTransformContext"
  };
}

// src/processor/runtimeArtifacts.ts
function compileStylesheetRuntimeArtifacts(stylesheetSource, options = {}) {
  const digest = createStylesheetDigest(stylesheetSource);
  const sourcePath = options.path ?? "<stylesheet>";
  const ir = compileStylesheet(stylesheetSource, {
    ...options.sourceName === void 0 && options.path === void 0 ? {} : { sourceName: options.sourceName ?? options.path },
    ...options.extensionFunctions === void 0 ? {} : { extensionFunctions: options.extensionFunctions }
  });
  const emitOptions = {
    digest,
    ...options.path === void 0 ? {} : { path: options.path },
    ...options.runtimeModuleSpecifier === void 0 ? {} : { runtimeModuleSpecifier: options.runtimeModuleSpecifier }
  };
  const emittedModule = emitStylesheetModule(ir, emitOptions);
  const sourceBaseName = fileBasename(sourcePath);
  const module = appendSourceMappingUrl(
    emittedModule,
    `${sourceBaseName}.map`
  );
  const diagnostics = sortDiagnostics(analyzeStylesheet(ir, {
    ...options.sampleDocument === void 0 ? {} : { sampleDocument: options.sampleDocument }
  }));
  return {
    ir,
    module,
    declaration: emitStylesheetDeclarationModule(ir, emitOptions),
    digest,
    sourceMap: createStylesheetSourceMap(
      module,
      stylesheetSource,
      sourceBaseName
    ),
    diagnostics
  };
}
function createStylesheetDigest(source) {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function fileBasename(path) {
  const normalizedPath = path.replace(/\\/g, "/");
  const slashIndex = normalizedPath.lastIndexOf("/");
  return slashIndex >= 0 ? normalizedPath.slice(slashIndex + 1) : normalizedPath;
}
function appendSourceMappingUrl(moduleSource, sourceMapFileName) {
  const sourceMapFooter = `//# source${"MappingURL="}${sourceMapFileName}`;
  return `${moduleSource.slice(0, -1)}
${sourceMapFooter}
`;
}
function createStylesheetSourceMap(moduleSource, stylesheetSource, sourcePath) {
  const generatedLineCount = countLines(moduleSource);
  const sourceLineCount = Math.max(countLines(stylesheetSource), 1);
  let currentSourceLine;
  let previousSourceLine = 0;
  const mappings = [];
  const moduleLines = moduleSource.endsWith("\n") ? moduleSource.slice(0, -1).split("\n") : moduleSource.split("\n");
  for (let generatedLineIndex = 0; generatedLineIndex < generatedLineCount; generatedLineIndex += 1) {
    const moduleLine = moduleLines[generatedLineIndex] ?? "";
    const anchoredSourceLine = readProvenanceLineNumber(moduleLine);
    if (anchoredSourceLine !== void 0) {
      currentSourceLine = Math.min(Math.max(anchoredSourceLine - 1, 0), sourceLineCount - 1);
    }
    if (currentSourceLine === void 0 || isCommentOnlyGeneratedLine(moduleLine) || isGeneratedOnlyLine(moduleLine)) {
      mappings.push("");
      continue;
    }
    mappings.push(`${encodeVlq(0)}${encodeVlq(0)}${encodeVlq(currentSourceLine - previousSourceLine)}${encodeVlq(0)}`);
    previousSourceLine = currentSourceLine;
  }
  return `${JSON.stringify({
    version: 3,
    file: `${sourcePath}.ts`,
    sources: [sourcePath],
    sourcesContent: [stylesheetSource],
    names: [],
    mappings: mappings.join(";")
  }, null, 2)}
`;
}
function countLines(text) {
  if (text.length === 0) {
    return 1;
  }
  return text.endsWith("\n") ? text.slice(0, -1).split("\n").length : text.split("\n").length;
}
function readProvenanceLineNumber(moduleLine) {
  const match = /:(\d+)\) \*\/$/.exec(moduleLine.trim());
  if (match === null) {
    return void 0;
  }
  return Number.parseInt(match[1] ?? "", 10);
}
function isCommentOnlyGeneratedLine(moduleLine) {
  const trimmedLine = moduleLine.trim();
  return trimmedLine.startsWith("/** ") && trimmedLine.endsWith(" */");
}
function isGeneratedOnlyLine(moduleLine) {
  const trimmedLine = moduleLine.trim();
  if (trimmedLine.length === 0) {
    return true;
  }
  return trimmedLine.startsWith("import ") || trimmedLine.startsWith("export const source = ") || trimmedLine === "export default { source, transform };" || trimmedLine.startsWith("//# sourceMappingURL=");
}
function encodeVlq(value) {
  let remaining = value < 0 ? (-value << 1) + 1 : value << 1;
  let encoded = "";
  do {
    let digit = remaining & 31;
    remaining >>>= 5;
    if (remaining > 0) {
      digit |= 32;
    }
    encoded += BASE64_VLQ_DIGITS[digit] ?? "";
  } while (remaining > 0);
  return encoded;
}
var BASE64_VLQ_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// src/xslt/eval/templateDispatch.ts
var PREDEFINED_NAMESPACE_PREFIXES2 = /* @__PURE__ */ new Map([
  ["array", "http://www.w3.org/2005/xpath-functions/array"],
  ["fn", "http://www.w3.org/2005/xpath-functions"],
  ["map", "http://www.w3.org/2005/xpath-functions/map"],
  ["math", "http://www.w3.org/2005/xpath-functions/math"],
  ["xml", "http://www.w3.org/XML/1998/namespace"],
  ["xs", "http://www.w3.org/2001/XMLSchema"]
]);
function findNamedTemplate(name, templates) {
  for (let index = templates.length - 1; index >= 0; index -= 1) {
    const candidate = templates[index];
    if (candidate?.name === name) {
      return candidate;
    }
  }
  return void 0;
}
function normalizeTemplateName(name, staticContext) {
  if (name.startsWith("{")) {
    return name;
  }
  const eqName = tryNormalizeEqName3(name);
  if (eqName !== void 0) {
    return eqName;
  }
  const separator = name.indexOf(":");
  if (separator < 0) {
    return name;
  }
  const prefix = name.slice(0, separator);
  const localName = name.slice(separator + 1);
  const namespaceUri = staticContext.namespaces.get(prefix) ?? PREDEFINED_NAMESPACE_PREFIXES2.get(prefix);
  return namespaceUri === void 0 ? name : `{${namespaceUri}}${localName}`;
}
function createInitialTemplateSuggestion(name, templates) {
  const candidates = templates.map((template) => template.name).filter((candidate) => candidate !== void 0).map(formatTemplateSuggestionName);
  const nearest = candidates.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(name, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean initialTemplate "${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length
  };
}
function createNamedTemplateCallSuggestion(name, templates) {
  const lookupName = formatTemplateSuggestionName(name);
  const candidates = templates.map((template) => template.name).filter((candidate) => candidate !== void 0).map(formatTemplateSuggestionName);
  const nearest = candidates.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(lookupName, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean xsl:call-template name="${nearest.candidate}"?`,
    replacement: nearest.candidate,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / nearest.candidate.length
  };
}
function formatTemplateSuggestionName(name) {
  if (!name.startsWith("{")) {
    return name;
  }
  const closingBrace = name.indexOf("}");
  return closingBrace < 0 ? name : name.slice(closingBrace + 1);
}
function findBestMatchingTemplate(node, templates, staticContext) {
  let bestTemplate;
  let bestTemplateIndex = -1;
  for (let index = 0; index < templates.length; index += 1) {
    const candidate = templates[index];
    if (!templateMatchesNode(candidate, node, staticContext)) {
      continue;
    }
    if (bestTemplate === void 0) {
      bestTemplate = candidate;
      bestTemplateIndex = index;
      continue;
    }
    const candidatePriority = getTemplatePriority2(candidate);
    const bestPriority = getTemplatePriority2(bestTemplate);
    if (candidatePriority > bestPriority || candidatePriority === bestPriority && index > bestTemplateIndex) {
      bestTemplate = candidate;
      bestTemplateIndex = index;
    }
  }
  return bestTemplate;
}
function tryNormalizeEqName3(name) {
  if (!name.startsWith("Q{")) {
    return void 0;
  }
  const endBrace = name.indexOf("}");
  if (endBrace < 0) {
    return void 0;
  }
  const namespaceUri = name.slice(2, endBrace);
  const localName = name.slice(endBrace + 1);
  if (localName.length === 0) {
    return void 0;
  }
  return namespaceUri.length === 0 ? localName : `{${namespaceUri}}${localName}`;
}
function isRootTemplateRule2(template) {
  if (template.match === void 0 || template.match.kind !== "path") {
    return false;
  }
  const match = template.match;
  return match.absolute && match.base === void 0 && match.steps.length === 0;
}
function templateMatchesNode(template, node, staticContext) {
  if (template.match === void 0 || template.match.kind !== "path") {
    return false;
  }
  if (isRootTemplateRule2(template)) {
    return node.nodeType === node.DOCUMENT_NODE;
  }
  if (node.nodeType === node.DOCUMENT_NODE) {
    return false;
  }
  const match = template.match;
  if (match.base !== void 0 || match.steps.length === 0) {
    return false;
  }
  return pathMatchesNode(match, node, staticContext);
}
function pathMatchesNode(path, node, staticContext) {
  let current = node;
  for (let index = path.steps.length - 1; index >= 0; index -= 1) {
    const step = path.steps[index];
    if (step?.kind !== "step" || current === null || !stepMatchesNode(step, current, staticContext)) {
      return false;
    }
    current = current.parentNode;
  }
  return !path.absolute || current?.nodeType === node.DOCUMENT_NODE;
}
function stepMatchesNode(step, node, staticContext) {
  if (step.axis !== "child" || step.predicates.length > 0) {
    return false;
  }
  if (step.nodeTest.kind === "wildcardTest") {
    return node.nodeType === node.ELEMENT_NODE;
  }
  if (step.nodeTest.kind === "nameTest") {
    if (node.nodeType !== node.ELEMENT_NODE) {
      return false;
    }
    return matchesQualifiedNodeName(step.nodeTest.name, node, staticContext);
  }
  if (step.nodeTest.kind !== "kindTest") {
    return false;
  }
  if (step.nodeTest.name === "node") {
    return true;
  }
  return step.nodeTest.name === "text" && (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE);
}
function matchesQualifiedNodeName(name, node, staticContext) {
  const separator = name.indexOf(":");
  const localName = (node.localName ?? node.nodeName).includes(":") ? node.localName ?? node.nodeName : node.localName ?? node.nodeName;
  if (separator >= 0) {
    const prefix = name.slice(0, separator);
    const namespaceUri = staticContext.namespaces.get(prefix) ?? PREDEFINED_NAMESPACE_PREFIXES2.get(prefix);
    if (namespaceUri === void 0) {
      return false;
    }
    return localName === name.slice(separator + 1) && (node.namespaceURI ?? "") === namespaceUri;
  }
  return localName === name && (node.namespaceURI ?? "") === staticContext.defaultElementNamespace;
}
function getTemplatePriority2(template) {
  if (template.priority !== void 0) {
    return template.priority;
  }
  return getDefaultTemplatePriority(template);
}
function getDefaultTemplatePriority(template) {
  if (template.match === void 0 || template.match.kind !== "path") {
    return Number.NEGATIVE_INFINITY;
  }
  if (isRootTemplateRule2(template)) {
    return 0.5;
  }
  const match = template.match;
  if (match.base !== void 0 || match.steps.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }
  if (match.absolute) {
    return 0.5;
  }
  const step = match.steps[match.steps.length - 1];
  if (step?.kind !== "step") {
    return Number.NEGATIVE_INFINITY;
  }
  if (step.nodeTest.kind === "nameTest") {
    return 0;
  }
  if (step.nodeTest.kind === "wildcardTest") {
    return -0.5;
  }
  if (step.nodeTest.kind === "kindTest" && (step.nodeTest.name === "node" || step.nodeTest.name === "text")) {
    return -0.5;
  }
  return Number.NEGATIVE_INFINITY;
}

// src/xdm/types.ts
function createXdmBoolean(value) {
  return { xdmKind: "atomic", type: "xs:boolean", value };
}
function createXdmNumber(value, lexicalForm) {
  return lexicalForm === void 0 ? { xdmKind: "atomic", type: "xs:double", value } : { xdmKind: "atomic", type: "xs:double", value, lexicalForm };
}
function createXdmInteger(value) {
  return { xdmKind: "atomic", type: "xs:integer", value };
}
function createXdmString(value) {
  return { xdmKind: "atomic", type: "xs:string", value };
}
function createXdmQName(value) {
  return { xdmKind: "atomic", type: "xs:QName", value };
}
function createXdmNode(node) {
  return { xdmKind: "node", node };
}
function createXdmMap(entries) {
  return { xdmKind: "map", entries };
}
function createXdmArray(members) {
  return { xdmKind: "array", members };
}

// src/xdm/sequence.ts
var ArraySequence = class {
  #items;
  constructor(items) {
    this.#items = Array.from(items);
  }
  get size() {
    return this.#items.length;
  }
  toArray() {
    return this.#items;
  }
  [Symbol.iterator]() {
    return this.#items[Symbol.iterator]();
  }
};
function createSequence(items) {
  return new ArraySequence(items);
}
function materialize(seq) {
  return seq.toArray();
}

// src/xpath/eval/comparisonHelpers.ts
function createComparisonHelpers(dependencies) {
  function compareGeneral2(operator, leftItems, rightItems, span) {
    leftItems = expandArrayItems(leftItems);
    rightItems = expandArrayItems(rightItems);
    if (leftItems.length === 0 || rightItems.length === 0) {
      return false;
    }
    for (const leftItem of leftItems) {
      for (const rightItem of rightItems) {
        if (compareGeneralItems(operator, leftItem, rightItem, span)) {
          return true;
        }
      }
    }
    return false;
  }
  function compareGeneralItems(operator, leftItem, rightItem, span) {
    const left = atomizeGeneralComparisonOperand(leftItem);
    const right = atomizeGeneralComparisonOperand(rightItem);
    if (left.source === "qname" || right.source === "qname") {
      throw dependencies.createXPathError(XPTY0004, "General comparison requires comparable type families.", span, {
        expectedType: "comparable general comparison operands",
        actualType: `${left.source} vs ${right.source}`
      });
    }
    if (left.source === "boolean" || right.source === "boolean") {
      if (left.source === "boolean" && right.source === "boolean") {
        return compareScalars(operator, left.value, right.value);
      }
      if (left.source === "boolean" && right.source === "node") {
        return compareScalars(operator, left.value, dependencies.effectiveBooleanValue([rightItem], span));
      }
      if (left.source === "node" && right.source === "boolean") {
        return compareScalars(operator, dependencies.effectiveBooleanValue([leftItem], span), right.value);
      }
      throw dependencies.createXPathError(XPTY0004, "General comparison requires comparable type families.", span, {
        expectedType: "comparable general comparison operands",
        actualType: `${left.source} vs ${right.source}`
      });
    }
    if (left.source === "number" || right.source === "number") {
      const numericLeft = toGeneralComparisonNumber(left, span);
      const numericRight = toGeneralComparisonNumber(right, span);
      return compareScalars(operator, numericLeft, numericRight);
    }
    return compareScalars(operator, left.value, right.value);
  }
  function atomizeGeneralComparisonOperand(item) {
    if (item.xdmKind === "node") {
      return {
        value: item.node.textContent ?? "",
        source: "node"
      };
    }
    const atomic = item;
    switch (atomic.type) {
      case "xs:boolean":
        return { value: atomic.value, source: "boolean" };
      case "xs:double":
      case "xs:integer":
        return { value: atomic.value, source: "number" };
      case "xs:QName":
        return { value: atomic.value, source: "qname" };
      case "xs:string":
        return { value: atomic.value, source: "string" };
    }
  }
  function expandArrayItems(items) {
    const expanded = [];
    for (const item of items) {
      if (item.xdmKind === "array") {
        for (const member of item.members) {
          expanded.push(...expandArrayItems(member));
        }
        continue;
      }
      expanded.push(item);
    }
    return expanded;
  }
  function toGeneralComparisonNumber(operand, span) {
    if (operand.source === "number") {
      return operand.value;
    }
    if (operand.source === "node") {
      const coerced = coerceNumericValue(operand.value);
      if (coerced !== void 0) {
        return coerced;
      }
    }
    throw dependencies.createXPathError(XPTY0004, "General comparison requires comparable type families.", span, {
      expectedType: "matching comparable operands",
      actualType: operand.source
    });
  }
  function atomizeItems2(items) {
    return expandArrayItems(items).map((item) => {
      if (item.xdmKind === "node") {
        return item.node.textContent ?? "";
      }
      return item.value;
    });
  }
  function atomizedNumericValues2(items, span, functionName) {
    return expandArrayItems(items).map((item) => {
      if (item.xdmKind === "node") {
        const numericValue = coerceNumericValue(item.node.textContent ?? "");
        if (numericValue === void 0) {
          throw dependencies.createXPathError(FORG0001, `Function ${functionName} could not convert an atomized value to a number.`, span, {
            functionName,
            expectedType: "numeric lexical value after atomization",
            actualType: "node()"
          });
        }
        return numericValue;
      }
      const atomic = item;
      if (atomic.type === "xs:boolean") {
        throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires comparable values after atomization.`, span, {
          functionName,
          expectedType: "numeric or string value after atomization",
          actualType: "xs:boolean"
        });
      }
      if (atomic.type === "xs:double" || atomic.type === "xs:integer") {
        return atomic.value;
      }
      throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires comparable values after atomization.`, span, {
        functionName,
        expectedType: "numeric value after atomization",
        actualType: atomic.type
      });
    });
  }
  function atomizedComparableValues2(items, span, functionName) {
    const values = expandArrayItems(items).map((item) => atomizeComparableItem(item, span, functionName));
    if (values.length <= 1) {
      const numericValues2 = values.map((value) => typeof value === "boolean" ? void 0 : typeof value === "number" ? value : coerceNumericValue(value));
      return numericValues2.every((value) => value !== void 0) ? numericValues2 : values;
    }
    const numericValues = values.map((value) => typeof value === "boolean" ? void 0 : typeof value === "number" ? value : coerceNumericValue(value));
    if (numericValues.every((value) => value !== void 0)) {
      return numericValues;
    }
    const sawBoolean = values.some((value) => typeof value === "boolean");
    if (sawBoolean) {
      if (values.every((value) => typeof value === "boolean")) {
        return values;
      }
      throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires values from a comparable type family.`, span, {
        functionName,
        expectedType: "all numeric, all string-like, or all boolean values",
        actualType: values.map(describeAtomizedValueType).join(", ")
      });
    }
    const sawNumber = values.some((value) => typeof value === "number");
    const sawString = values.some((value) => typeof value === "string");
    if (sawNumber && sawString) {
      throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires values from a comparable type family.`, span, {
        functionName,
        expectedType: "all numeric or all string-like values",
        actualType: values.map(describeAtomizedValueType).join(", ")
      });
    }
    return values;
  }
  function atomizeComparableItem(item, span, functionName) {
    if (item.xdmKind === "node") {
      return item.node.textContent ?? "";
    }
    const atomic = item;
    if (atomic.type === "xs:boolean") {
      return atomic.value;
    }
    if (atomic.type === "xs:double" || atomic.type === "xs:integer") {
      return atomic.value;
    }
    if (atomic.type === "xs:string") {
      return atomic.value;
    }
    throw dependencies.createXPathError(FORG0006, `Function ${functionName} requires comparable values after atomization.`, span, {
      functionName,
      expectedType: "numeric or string value after atomization",
      actualType: atomic.type
    });
  }
  function compareComparableValues2(left, right) {
    if (typeof left === "boolean" && typeof right === "boolean") {
      return Number(left) - Number(right);
    }
    if (typeof left === "number" && typeof right === "number") {
      if (Number.isNaN(left) || Number.isNaN(right)) {
        return Number.isNaN(left) ? Number.isNaN(right) ? 0 : -1 : 1;
      }
      return left === right ? 0 : left < right ? -1 : 1;
    }
    return left === right ? 0 : left < right ? -1 : 1;
  }
  function deepEqualSequences2(leftItems, rightItems) {
    if (leftItems.length !== rightItems.length) {
      return false;
    }
    for (let index = 0; index < leftItems.length; index += 1) {
      if (!deepEqualItems(leftItems[index], rightItems[index])) {
        return false;
      }
    }
    return true;
  }
  function deepEqualItems(left, right) {
    if (left.xdmKind !== right.xdmKind) {
      return false;
    }
    if (left.xdmKind === "node" && right.xdmKind === "node") {
      return deepEqualNodes(left.node, right.node);
    }
    if (left.xdmKind === "atomic" && right.xdmKind === "atomic") {
      return deepEqualAtomicValues(left, right);
    }
    return left === right;
  }
  function deepEqualAtomicValues(left, right) {
    if (left.type !== right.type) {
      return false;
    }
    if (left.type === "xs:double" && right.type === "xs:double") {
      return Number.isNaN(left.value) && Number.isNaN(right.value) || left.value === right.value;
    }
    return left.value === right.value;
  }
  function deepEqualNodes(left, right) {
    if (left.nodeType !== right.nodeType) {
      return false;
    }
    if ((left.namespaceURI ?? "") !== (right.namespaceURI ?? "")) {
      return false;
    }
    if ((left.nodeName ?? "") !== (right.nodeName ?? "")) {
      return false;
    }
    if ((left.nodeValue ?? "") !== (right.nodeValue ?? "")) {
      return false;
    }
    if (!deepEqualAttributes(left, right)) {
      return false;
    }
    const leftChildren = [...left.childNodes];
    const rightChildren = [...right.childNodes];
    if (leftChildren.length !== rightChildren.length) {
      return false;
    }
    for (let index = 0; index < leftChildren.length; index += 1) {
      if (!deepEqualNodes(leftChildren[index], rightChildren[index])) {
        return false;
      }
    }
    return true;
  }
  function deepEqualAttributes(left, right) {
    const leftAttributes = getNodeAttributes(left);
    const rightAttributes = getNodeAttributes(right);
    const leftCount = leftAttributes?.length ?? 0;
    const rightCount = rightAttributes?.length ?? 0;
    if (leftCount !== rightCount) {
      return false;
    }
    for (let index = 0; index < leftCount; index += 1) {
      const leftAttribute = leftAttributes?.item(index);
      if (leftAttribute === null || leftAttribute === void 0) {
        return false;
      }
      const rightAttribute = leftAttribute.namespaceURI ? rightAttributes?.getNamedItemNS(leftAttribute.namespaceURI, leftAttribute.localName ?? leftAttribute.nodeName) : rightAttributes?.getNamedItem(leftAttribute.nodeName);
      if (rightAttribute === null || rightAttribute === void 0) {
        return false;
      }
      if ((leftAttribute.value ?? "") !== (rightAttribute.value ?? "")) {
        return false;
      }
    }
    return true;
  }
  function getNodeAttributes(node) {
    const candidate = node;
    return candidate.attributes ?? void 0;
  }
  function atomizeSingleton2(items, span) {
    items = expandArrayItems(items);
    if (items.length === 0) {
      return void 0;
    }
    if (items.length !== 1) {
      throw dependencies.createXPathError(XPTY0004, "Value comparisons require singleton operands.", span, {
        expectedType: "singleton operand",
        actualType: dependencies.describeItemsType(items)
      });
    }
    const [item] = items;
    if (item?.xdmKind === "node") {
      return item.node.textContent ?? "";
    }
    return item.value;
  }
  function compareValueOperands2(operator, left, right, span) {
    if (typeof left === "boolean" || typeof right === "boolean") {
      if (typeof left !== "boolean" || typeof right !== "boolean") {
        throw dependencies.createXPathError(XPTY0004, "Value comparisons require matching operand types.", span, {
          expectedType: "matching operand types",
          actualType: `${describeAtomizedValueType(left)} vs ${describeAtomizedValueType(right)}`
        });
      }
      return compareScalars(operator, left, right);
    }
    if (typeof left === "number" || typeof right === "number") {
      if (typeof left !== "number" || typeof right !== "number") {
        throw dependencies.createXPathError(XPTY0004, "Value comparisons require matching operand types.", span, {
          expectedType: "matching operand types",
          actualType: `${describeAtomizedValueType(left)} vs ${describeAtomizedValueType(right)}`
        });
      }
      return compareScalars(operator, left, right);
    }
    return compareScalars(operator, left, right);
  }
  function coerceNumericValue(value) {
    if (typeof value === "number") {
      return value;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? void 0 : parsed;
  }
  function compareScalars(operator, left, right) {
    switch (operator) {
      case "=":
      case "eq":
        return left === right;
      case "!=":
      case "ne":
        return left !== right;
      case "<":
      case "lt":
        return left < right;
      case "<=":
      case "le":
        return left <= right;
      case ">":
      case "gt":
        return left > right;
      case ">=":
      case "ge":
        return left >= right;
    }
  }
  function describeAtomizedValueType(value) {
    if (typeof value === "boolean") {
      return "xs:boolean";
    }
    if (typeof value === "number") {
      return "xs:double";
    }
    return "xs:string";
  }
  return {
    compareGeneral: compareGeneral2,
    atomizeItems: atomizeItems2,
    atomizedNumericValues: atomizedNumericValues2,
    atomizedComparableValues: atomizedComparableValues2,
    compareComparableValues: compareComparableValues2,
    deepEqualSequences: deepEqualSequences2,
    atomizeSingleton: atomizeSingleton2,
    compareValueOperands: compareValueOperands2
  };
}

// src/xpath/eval/names.ts
var PREDEFINED_NAMESPACE_PREFIXES3 = /* @__PURE__ */ new Map([
  ["array", "http://www.w3.org/2005/xpath-functions/array"],
  ["fn", "http://www.w3.org/2005/xpath-functions"],
  ["map", "http://www.w3.org/2005/xpath-functions/map"],
  ["math", "http://www.w3.org/2005/xpath-functions/math"],
  ["xml", "http://www.w3.org/XML/1998/namespace"],
  ["xs", "http://www.w3.org/2001/XMLSchema"]
]);
function resolveStaticallyKnownNamespaceUri(staticContext, prefix) {
  return staticContext.namespaces.get(prefix) ?? PREDEFINED_NAMESPACE_PREFIXES3.get(prefix);
}
function matchesQualifiedNodeName2(name, node, staticContext, isAttributeAxis) {
  const separator = name.indexOf(":");
  const localName = getNodeLocalName(node);
  if (separator >= 0) {
    const prefix = name.slice(0, separator);
    const namespaceUri = resolveStaticallyKnownNamespaceUri(staticContext, prefix);
    if (namespaceUri === void 0) {
      return false;
    }
    return localName === name.slice(separator + 1) && (node.namespaceURI ?? "") === namespaceUri;
  }
  const expectedNamespace = isAttributeAxis ? "" : staticContext.defaultElementNamespace;
  return localName === name && (node.namespaceURI ?? "") === expectedNamespace;
}
function getNodeNameValue(node) {
  if (node === void 0) {
    return "";
  }
  const namespacePrefix = getNamespaceDeclarationPrefix(node.node);
  if (namespacePrefix !== void 0) {
    return namespacePrefix;
  }
  const rawName = node.node.nodeName;
  return rawName.startsWith("#") ? "" : rawName;
}
function getLocalNameValue(node) {
  const name = getNodeNameValue(node);
  return getLocalNameFromQName(name);
}
function getNamespaceUriValue(node) {
  if (node === void 0) {
    return "";
  }
  return node.node.namespaceURI ?? "";
}
function getLocalNameFromQName(name) {
  if (name.length === 0) {
    return "";
  }
  const separator = name.indexOf(":");
  return separator >= 0 ? name.slice(separator + 1) : name;
}
function getNodeLocalName(node) {
  const rawName = node.nodeName;
  if (rawName.startsWith("#")) {
    return "";
  }
  const separator = rawName.indexOf(":");
  return separator >= 0 ? rawName.slice(separator + 1) : rawName;
}
function getNodePrefix(node) {
  const rawName = node.nodeName;
  if (rawName.startsWith("#")) {
    return "";
  }
  const separator = rawName.indexOf(":");
  return separator >= 0 ? rawName.slice(0, separator) : "";
}
function getNamespaceDeclarationPrefix(node) {
  if (node.nodeName === "xmlns") {
    return "";
  }
  if (node.nodeName.startsWith("xmlns:")) {
    return node.nodeName.slice("xmlns:".length);
  }
  return void 0;
}
function getNamespaceNodePrefix(node) {
  return getNamespaceDeclarationPrefix(node) ?? "";
}

// src/xpath/eval/contextHelpers.ts
function createContextHelpers(dependencies) {
  function requireContextItem2(context, span) {
    const items = coerceValueToItems(context.contextItem, span);
    const item = items[0];
    if (item === void 0) {
      throw dependencies.createXPathError(XPDY0002, "The XPath expression requires a context item.", span);
    }
    if (items.length !== 1) {
      throw dependencies.createXPathError(XPTY0004, "The XPath expression requires a single context item.", span, {
        expectedType: "singleton item()",
        actualType: dependencies.describeItemsType(items)
      });
    }
    return item;
  }
  function requireContextNode2(context, span) {
    const item = requireContextItem2(context, span);
    if (!isXdmNode2(item)) {
      throw dependencies.createXPathError(XPDY0002, "The XPath expression requires a context node.", span);
    }
    return item;
  }
  function isXdmNode2(value) {
    return value !== null && value !== void 0 && typeof value === "object" && "xdmKind" in value && "node" in value && value.xdmKind === "node";
  }
  function isXdmAtomicValue(value) {
    return value !== null && value !== void 0 && typeof value === "object" && "xdmKind" in value && value.xdmKind === "atomic";
  }
  function isXdmSequence(value) {
    return value !== null && value !== void 0 && typeof value === "object" && "toArray" in value && typeof value.toArray === "function";
  }
  function resolveVariableReference2(name, context, span) {
    const separator = name.indexOf(":");
    const value = separator >= 0 ? resolvePrefixedVariableReference(name, separator, context, span) : context.variables.get(name) ?? context.variables.get(`{}${name}`);
    if (value === void 0) {
      throw dependencies.createXPathError(XPST0008, `Unknown variable $${name}.`, span);
    }
    return coerceValueToItems(resolveDeferredVariableValue(value), span);
  }
  function resolvePrefixedVariableReference(name, separator, context, span) {
    const prefix = name.slice(0, separator);
    const localName = name.slice(separator + 1);
    const namespaceUri = resolveStaticallyKnownNamespaceUri(context.staticContext, prefix);
    if (namespaceUri === void 0) {
      throw dependencies.createXPathError(XPST0081, `Unknown namespace prefix ${JSON.stringify(prefix)} in variable reference.`, span, {
        namespacePrefix: prefix,
        variableName: name
      });
    }
    return context.variables.get(`{${namespaceUri}}${localName}`) ?? context.variables.get(name);
  }
  function resolveDeferredVariableValue(value) {
    if (typeof value !== "object" || value === null) {
      return value;
    }
    const evaluate2 = value.evaluate;
    return typeof evaluate2 === "function" ? evaluate2() : value;
  }
  function coerceValueToItems(value, span) {
    if (value === null || value === void 0) {
      return [];
    }
    if (isXdmSequence(value)) {
      return [...materialize(value)];
    }
    if (isXdmNode2(value) || isXdmAtomicValue(value)) {
      return [value];
    }
    if (Array.isArray(value)) {
      return value.flatMap((entry) => coerceValueToItems(entry, span));
    }
    if (typeof value === "boolean") {
      return [createXdmBoolean(value)];
    }
    if (typeof value === "number") {
      return [createXdmNumber(value)];
    }
    if (typeof value === "string") {
      return [createXdmString(value)];
    }
    throw dependencies.createXPathError(XPTY0004, "Unsupported external value in the dynamic context.", span, {
      expectedType: "supported XDM value",
      actualType: describeExternalValueType(value)
    });
  }
  return {
    requireContextItem: requireContextItem2,
    requireContextNode: requireContextNode2,
    isXdmNode: isXdmNode2,
    resolveVariableReference: resolveVariableReference2,
    coerceValueToItems
  };
}
function describeExternalValueType(value) {
  if (value === null) {
    return "null";
  }
  if (value === void 0) {
    return "undefined";
  }
  if (Array.isArray(value)) {
    return "Array";
  }
  if (typeof value === "object" && "constructor" in value) {
    const constructorName = value.constructor?.name;
    if (constructorName !== void 0 && constructorName.length > 0) {
      return constructorName;
    }
  }
  return typeof value;
}

// src/xpath/eval/flowExpressions.ts
function createFlowExpressionEvaluator(dependencies) {
  function evaluateLetExpression2(bindings, returnExpr, context) {
    const variables = new Map(context.variables);
    for (const binding of bindings) {
      variables.set(binding.name, dependencies.evaluateExpression(binding.value, { ...context, variables }));
    }
    return dependencies.evaluateExpression(returnExpr, {
      ...context,
      variables
    });
  }
  function evaluateForExpression2(bindings, returnExpr, context) {
    return evaluateFlowBindings(
      bindings,
      context,
      (variables) => dependencies.evaluateExpression(returnExpr, {
        ...context,
        variables
      })
    );
  }
  function evaluateQuantifiedExpression2(quantifier, bindings, satisfiesExpr, context) {
    if (quantifier === "some") {
      return evaluateFlowBindings(bindings, context, (variables) => {
        const result = dependencies.effectiveBooleanValue(
          dependencies.evaluateExpression(satisfiesExpr, {
            ...context,
            variables
          }),
          satisfiesExpr.span
        );
        return result ? [createXdmBoolean(true)] : [];
      }).length > 0;
    }
    let sawBinding = false;
    const failures = evaluateFlowBindings(bindings, context, (variables) => {
      sawBinding = true;
      const result = dependencies.effectiveBooleanValue(
        dependencies.evaluateExpression(satisfiesExpr, {
          ...context,
          variables
        }),
        satisfiesExpr.span
      );
      return result ? [] : [createXdmBoolean(false)];
    });
    return sawBinding ? failures.length === 0 : true;
  }
  function evaluateFlowBindings(bindings, context, project, variables = new Map(context.variables), index = 0) {
    if (index >= bindings.length) {
      return project(variables);
    }
    const binding = bindings[index];
    const input = dependencies.evaluateExpression(binding.value, {
      ...context,
      variables
    });
    const results = [];
    for (const item of input) {
      const nextVariables = new Map(variables);
      nextVariables.set(binding.name, [item]);
      results.push(...evaluateFlowBindings(bindings, context, project, nextVariables, index + 1));
    }
    return results;
  }
  return {
    evaluateLetExpression: evaluateLetExpression2,
    evaluateForExpression: evaluateForExpression2,
    evaluateQuantifiedExpression: evaluateQuantifiedExpression2
  };
}

// src/xpath/eval/navigation.ts
function getRootNode(item) {
  let current = item.node;
  let parent = getParentNode(current);
  while (parent !== null) {
    current = parent;
    parent = getParentNode(current);
  }
  return createXdmNode(current);
}
function selectAxis(step, node) {
  switch (step.axis) {
    case "ancestor":
      return collectAncestors(node, false).map(createXdmNode);
    case "ancestor-or-self":
      return collectAncestors(node, true).map(createXdmNode);
    case "attribute":
      return collectAttributes(node).map(createXdmNode);
    case "child":
      return collectChildren(node).map(createXdmNode);
    case "descendant":
      return collectDescendants(node).map(createXdmNode);
    case "descendant-or-self":
      return collectDescendantsOrSelf(node).map(createXdmNode);
    case "following":
      return collectFollowingNodes(node).map(createXdmNode);
    case "following-sibling":
      return collectFollowingSiblings(node).map(createXdmNode);
    case "namespace":
      return collectNamespaceNodes(node).map(createXdmNode);
    case "parent":
      return collectParent(node).map(createXdmNode);
    case "preceding":
      return collectPrecedingNodes(node).map(createXdmNode);
    case "preceding-sibling":
      return collectPrecedingSiblings(node).map(createXdmNode);
    case "self":
      return [createXdmNode(node)];
  }
}
function compareNodeOrder(left, right) {
  if (left === right) {
    return 0;
  }
  const leftPath = getDocumentOrderPath(left);
  const rightPath = getDocumentOrderPath(right);
  const length = Math.min(leftPath.length, rightPath.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftPath[index];
    const rightPart = rightPath[index];
    if (leftPart !== rightPart) {
      return leftPart < rightPart ? -1 : 1;
    }
  }
  return leftPath.length < rightPath.length ? -1 : 1;
}
function normalizeNodeSequence(items) {
  const uniqueNodes = /* @__PURE__ */ new Map();
  for (const item of items) {
    if (!uniqueNodes.has(item.node)) {
      uniqueNodes.set(item.node, item);
    }
  }
  return [...uniqueNodes.values()].sort((left, right) => compareNodeOrder(left.node, right.node));
}
function getParentNode(node) {
  const ownerElement = node;
  return node.parentNode ?? ownerElement.ownerElement ?? null;
}
function collectAttributes(node) {
  const attributes = node.attributes;
  if (attributes === void 0) {
    return [];
  }
  const items = [];
  for (let index = 0; index < attributes.length; index += 1) {
    const attribute = attributes.item(index);
    if (attribute !== null) {
      items.push(attribute);
    }
  }
  return items;
}
function collectNamespaceNodes(node) {
  const items = [];
  const seenPrefixes = /* @__PURE__ */ new Set();
  let current = node;
  while (current !== null) {
    for (const attribute of collectAttributes(current)) {
      const prefix = getNamespaceDeclarationPrefix(attribute);
      if (prefix === void 0 || seenPrefixes.has(prefix)) {
        continue;
      }
      seenPrefixes.add(prefix);
      items.push(attribute);
    }
    current = current.parentNode;
  }
  return items;
}
function collectChildren(node) {
  const items = [];
  const children = node.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const child = children.item(index);
    if (child !== null) {
      items.push(child);
    }
  }
  return items;
}
function collectDescendants(node) {
  const items = [];
  for (const child of collectChildren(node)) {
    items.push(child);
    items.push(...collectDescendants(child));
  }
  return items;
}
function collectDescendantsOrSelf(node) {
  return [node, ...collectDescendants(node)];
}
function collectParent(node) {
  const parent = getParentNode(node);
  return parent === null ? [] : [parent];
}
function collectAncestors(node, includeSelf) {
  const items = [];
  if (includeSelf) {
    items.push(node);
  }
  let current = getParentNode(node);
  while (current !== null) {
    items.push(current);
    current = getParentNode(current);
  }
  return items;
}
function collectFollowingSiblings(node) {
  const parent = getParentNode(node);
  if (parent === null) {
    return [];
  }
  const siblings = parent.childNodes;
  const items = [];
  let seenCurrent = false;
  for (let index = 0; index < siblings.length; index += 1) {
    const sibling = siblings.item(index);
    if (sibling === null) {
      continue;
    }
    if (seenCurrent) {
      items.push(sibling);
      continue;
    }
    if (sibling === node) {
      seenCurrent = true;
    }
  }
  return items;
}
function collectPrecedingSiblings(node) {
  const parent = getParentNode(node);
  if (parent === null) {
    return [];
  }
  const siblings = parent.childNodes;
  const items = [];
  for (let index = 0; index < siblings.length; index += 1) {
    const sibling = siblings.item(index);
    if (sibling === null) {
      continue;
    }
    if (sibling === node) {
      break;
    }
    items.push(sibling);
  }
  return items.reverse();
}
function collectFollowingNodes(node) {
  const items = [];
  let current = node;
  while (current !== null && getParentNode(current) !== null) {
    for (const sibling of collectFollowingSiblings(current)) {
      items.push(sibling);
      items.push(...collectDescendants(sibling));
    }
    current = getParentNode(current);
  }
  return items;
}
function collectPrecedingNodes(node) {
  const items = [];
  let current = node;
  while (current !== null && getParentNode(current) !== null) {
    for (const sibling of collectPrecedingSiblings(current)) {
      items.push(...collectDescendantsOrSelfReverse(sibling));
    }
    current = getParentNode(current);
  }
  return items;
}
function collectDescendantsOrSelfReverse(node) {
  const items = [];
  for (const child of collectChildren(node).reverse()) {
    items.push(...collectDescendantsOrSelfReverse(child));
  }
  items.push(node);
  return items;
}
function getDocumentOrderPath(node) {
  const path = [];
  let current = node;
  while (current !== null) {
    path.unshift(getNodeSiblingIndex(current));
    current = current.parentNode;
  }
  return path;
}
function getNodeSiblingIndex(node) {
  const parent = node.parentNode;
  if (parent === null) {
    return 0;
  }
  const siblings = parent.childNodes;
  for (let index = 0; index < siblings.length; index += 1) {
    if (siblings.item(index) === node) {
      return index;
    }
  }
  return 0;
}

// src/xpath/eval/comparisonEvaluation.ts
function createComparisonEvaluator(dependencies) {
  function compareNodes2(operator, leftItems, rightItems, span) {
    const left = requireSingletonNode(leftItems, span, "left");
    const right = requireSingletonNode(rightItems, span, "right");
    if (left === void 0 || right === void 0) {
      return [];
    }
    if (operator === "is") {
      return [createXdmBoolean(left.node === right.node)];
    }
    const order = compareNodeOrder(left.node, right.node);
    return [createXdmBoolean(operator === "<<" ? order < 0 : order > 0)];
  }
  function compareValue2(operator, leftItems, rightItems, span) {
    const leftValue = dependencies.atomizeSingleton(leftItems, span);
    const rightValue = dependencies.atomizeSingleton(rightItems, span);
    if (leftValue === void 0 || rightValue === void 0) {
      return [];
    }
    return [createXdmBoolean(dependencies.compareValueOperands(operator, leftValue, rightValue, span))];
  }
  function requireSingletonNode(items, span, side) {
    if (items.length === 0) {
      return void 0;
    }
    if (items.length !== 1 || items[0]?.xdmKind !== "node") {
      throw dependencies.createXPathError(XPTY0004, `Node comparisons require a singleton node on the ${side} side.`, span, {
        expectedType: "singleton node()",
        actualType: dependencies.describeItemsType(items),
        operandRole: side
      });
    }
    return items[0];
  }
  return {
    compareNodes: compareNodes2,
    compareValue: compareValue2
  };
}

// src/xpath/eval/pathEvaluation.ts
function createPathEvaluator(dependencies) {
  function evaluateFilterExpression2(ast, context) {
    let items = dependencies.evaluateExpression(ast.base, context);
    for (const predicate of ast.predicates) {
      const size = items.length;
      items = items.filter((item, index) => {
        const predicateResult = dependencies.evaluateExpression(predicate, {
          ...context,
          contextItem: item,
          contextPosition: index + 1,
          contextSize: size
        });
        return predicateMatches(predicateResult, index + 1, predicate.span);
      });
    }
    return items;
  }
  function evaluatePath2(ast, context) {
    let items = ast.absolute ? [getRootNode(dependencies.requireContextNode(context, ast.span))] : ast.base === void 0 ? [dependencies.requireContextNode(context, ast.span)] : dependencies.evaluateExpression(ast.base, context);
    if (ast.absolute && ast.steps.length === 0) {
      return items;
    }
    for (const step of ast.steps) {
      items = applyPathSegment(step, items, context);
    }
    return items;
  }
  function applyPathSegment(segment, input, context) {
    if (segment.kind === "step") {
      return applyStep(segment, requireNodeSequence2(input, segment.span), context);
    }
    if (segment.kind === "functionCall") {
      dependencies.validateFunctionCallSignature(
        segment.callee.includes(":") ? segment.callee : `fn:${segment.callee}`,
        segment.arguments.length,
        segment.span
      );
    }
    return applyExpressionPathSegment(segment, requireNodeSequence2(input, segment.span), context);
  }
  function applyExpressionPathSegment(segment, input, context) {
    const size = input.length;
    return input.flatMap(
      (item, index) => dependencies.evaluateExpression(segment, {
        ...context,
        contextItem: item,
        contextPosition: index + 1,
        contextSize: size
      })
    );
  }
  function requireNodeSequence2(items, span) {
    const nodes = [];
    for (const item of items) {
      if (!dependencies.isXdmNode(item)) {
        throw dependencies.createXPathError(XPTY0019, "Path expressions require node inputs.", span, {
          expectedType: "node()*",
          actualType: dependencies.describeItemsType(items)
        });
      }
      nodes.push(item);
    }
    return nodes;
  }
  function applyStep(step, input, context) {
    let selected = input.flatMap((item) => selectAxis(step, item.node));
    selected = selected.filter((item) => matchesNodeTest(step, item.node, context));
    for (const predicate of step.predicates) {
      const size = selected.length;
      selected = selected.filter((item, index) => {
        const predicateResult = dependencies.evaluateExpression(predicate, {
          ...context,
          contextItem: item,
          contextPosition: index + 1,
          contextSize: size
        });
        return predicateMatches(predicateResult, index + 1, predicate.span);
      });
    }
    return normalizeNodeSequence(selected);
  }
  function matchesNodeTest(step, node, context) {
    if (step.nodeTest.kind === "wildcardTest") {
      if (step.axis === "namespace") {
        if (step.nodeTest.prefix !== void 0) {
          return false;
        }
        return step.nodeTest.localName === void 0 || getNamespaceNodePrefix(node) === step.nodeTest.localName;
      }
      if (!matchesPrincipalNodeKind(step, node)) {
        return false;
      }
      if (step.nodeTest.prefix !== void 0) {
        return getNodePrefix(node) === step.nodeTest.prefix;
      }
      return step.nodeTest.localName === void 0 || getNodeLocalName(node) === step.nodeTest.localName;
    }
    if (step.nodeTest.kind === "kindTest") {
      if (step.nodeTest.name === "node") {
        return true;
      }
      if (step.nodeTest.name === "comment") {
        return node.nodeType === 8;
      }
      if (step.nodeTest.name === "text") {
        return node.nodeType === 3;
      }
      return node.nodeType === 7;
    }
    if (step.axis === "namespace") {
      return getNamespaceNodePrefix(node) === step.nodeTest.name;
    }
    if (!matchesPrincipalNodeKind(step, node)) {
      return false;
    }
    return matchesQualifiedNodeName2(step.nodeTest.name, node, context.staticContext, step.axis === "attribute");
  }
  function matchesPrincipalNodeKind(step, node) {
    if (step.axis === "attribute") {
      return node.nodeType === 2;
    }
    if (step.axis === "namespace") {
      return getNamespaceDeclarationPrefix(node) !== void 0;
    }
    return node.nodeType === 1;
  }
  function predicateMatches(result, position, span) {
    if (result.length === 0) {
      return false;
    }
    if (result.length === 1 && result[0]?.xdmKind === "atomic") {
      const atomic = result[0];
      if (atomic.type === "xs:double" || atomic.type === "xs:integer") {
        return atomic.value === position;
      }
      if (atomic.type === "xs:boolean") {
        return atomic.value === true;
      }
    }
    return dependencies.effectiveBooleanValue(result, span);
  }
  return {
    evaluateFilterExpression: evaluateFilterExpression2,
    evaluatePath: evaluatePath2
  };
}

// src/xpath/eval/scalarHelpers.ts
function createScalarHelpers(dependencies) {
  function evaluateConcatOperandString2(ast, context, span) {
    const items = dependencies.evaluateExpression(ast, context);
    if (items.length === 0) {
      return "";
    }
    if (items.length !== 1) {
      throw dependencies.createXPathError(XPTY0004, "Operator || requires empty-sequence() or a singleton item operand.", span, {
        expectedType: "empty-sequence() or singleton item()",
        actualType: dependencies.describeItemsType(items)
      });
    }
    return coerceItemToStringValue(items[0], span);
  }
  function coerceItemToStringValue(item, span) {
    if (item.xdmKind === "node") {
      return item.node.textContent ?? "";
    }
    if (item.xdmKind !== "atomic") {
      throw dependencies.createXPathError(FOTY0014, "The string value is not defined for this item kind.", span, {
        expectedType: "node() or atomic value",
        actualType: dependencies.describeItemType(item)
      });
    }
    const atomic = item;
    if (atomic.type === "xs:boolean") {
      return atomic.value === true ? "true" : "false";
    }
    if (atomic.type === "xs:double") {
      if (atomic.lexicalForm !== void 0) {
        return atomic.lexicalForm;
      }
      const value = atomic.value;
      if (Number.isNaN(value)) {
        return "NaN";
      }
      if (value === Number.POSITIVE_INFINITY) {
        return "INF";
      }
      if (value === Number.NEGATIVE_INFINITY) {
        return "-INF";
      }
      if (Object.is(value, -0) || value === 0) {
        return "0";
      }
      const absolute = Math.abs(value);
      if (absolute >= 1e6 || absolute < 1e-6) {
        return value.toExponential().replace("e", "E").replace(/E\+/, "E").replace(/(\.\d*?)0+E/, "$1E").replace(/\.E/, "E").replace(/E(-?)0+(\d+)/, "E$1$2");
      }
    }
    return String(atomic.value);
  }
  function requireSingleNumber2(items, span) {
    const item = items[0];
    if (items.length !== 1 || item?.xdmKind !== "atomic" || item.type !== "xs:double" && item.type !== "xs:integer") {
      throw dependencies.createXPathError(XPTY0004, "Expected a single numeric value.", span, {
        expectedType: "xs:double or xs:integer",
        actualType: dependencies.describeItemsType(items)
      });
    }
    return item.value;
  }
  function requireSingleInteger2(items, span, description) {
    const value = requireSingleNumber2(items, span);
    if (!Number.isInteger(value)) {
      throw dependencies.createXPathError(XPTY0004, `${description} must be an integer in this slice.`, span, {
        expectedType: "xs:integer",
        actualType: "xs:double"
      });
    }
    return value;
  }
  function createNumberLiteralValue2(value, lexeme) {
    if (isDecimalLiteralLexeme(lexeme)) {
      return createXdmNumber(value, normalizeUnsignedDecimalLiteralLexeme(lexeme));
    }
    return createXdmNumber(value);
  }
  function normalizeSignedDecimalLiteralLexeme2(operator, lexeme) {
    const normalized = normalizeUnsignedDecimalLiteralLexeme(lexeme);
    return operator === "-" ? `-${normalized}` : normalized;
  }
  return {
    evaluateConcatOperandString: evaluateConcatOperandString2,
    requireSingleNumber: requireSingleNumber2,
    requireSingleInteger: requireSingleInteger2,
    createNumberLiteralValue: createNumberLiteralValue2,
    normalizeSignedDecimalLiteralLexeme: normalizeSignedDecimalLiteralLexeme2
  };
}
function isDecimalLiteralLexeme(lexeme) {
  return lexeme.includes(".") && !/[eE]/.test(lexeme);
}
function normalizeUnsignedDecimalLiteralLexeme(lexeme) {
  const normalized = lexeme.startsWith(".") ? `0${lexeme}` : lexeme;
  return normalized.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

// src/xpath/eval/builtinFunctionSupport.ts
var GENERATED_NODE_IDS = /* @__PURE__ */ new WeakMap();
var nextGeneratedNodeId = 1;
function createBuiltinFunctionSupport(helpers) {
  function evaluateOptionalSingletonItemArg(name, args, context, span) {
    if (args.length === 0) {
      return helpers.requireContextItem(context, span);
    }
    helpers.requireArity(name, args, 1, span);
    const items = helpers.evaluateExpression(args[0], context);
    if (items.length === 0) {
      return void 0;
    }
    if (items.length !== 1) {
      throw helpers.createXPathError(XPTY0004, `Function ${name} requires an empty sequence or singleton item.`, span, {
        functionName: name,
        expectedType: "empty-sequence() or singleton item()",
        actualType: helpers.describeItemsType(items)
      });
    }
    return items[0];
  }
  function evaluateOptionalSingletonNodeArg(name, args, context, span) {
    const item = evaluateOptionalSingletonItemArg(name, args, context, span);
    if (item === void 0) {
      return void 0;
    }
    if (item.xdmKind !== "node") {
      throw helpers.createXPathError(XPTY0004, `Function ${name} requires a node argument.`, span, {
        functionName: name,
        expectedType: "node()",
        actualType: helpers.describeItemType(item)
      });
    }
    return item;
  }
  function evaluateSingletonStringishArg(arg, context, span, name) {
    const items = helpers.evaluateExpression(arg, context);
    if (items.length === 0) {
      return void 0;
    }
    if (items.length !== 1) {
      throw helpers.createXPathError(XPTY0004, `Function ${name} requires empty-sequence() or a singleton item argument.`, span, {
        functionName: name,
        expectedType: "empty-sequence() or singleton item()",
        actualType: helpers.describeItemsType(items)
      });
    }
    return items[0];
  }
  function itemToStringValue2(item, span) {
    if (item === void 0) {
      return "";
    }
    if (item.xdmKind === "node") {
      return item.node.textContent ?? "";
    }
    if (item.xdmKind !== "atomic") {
      throw helpers.createXPathError(FOTY0014, "The string value is not defined for this item kind.", span ?? {
        line: 1,
        column: 1,
        start: 0,
        endLine: 1,
        endColumn: 1,
        end: 0
      }, {
        expectedType: "node() or atomic value",
        actualType: helpers.describeItemType(item)
      });
    }
    const atomic = item;
    if (atomic.type === "xs:boolean") {
      return atomic.value === true ? "true" : "false";
    }
    if (atomic.type === "xs:double") {
      if (atomic.lexicalForm !== void 0) {
        return atomic.lexicalForm;
      }
      return formatXPathDoubleString(atomic.value);
    }
    if (atomic.type === "xs:integer") {
      return String(atomic.value);
    }
    return String(atomic.value);
  }
  function xpathTokenize(input, regex) {
    if (input.length === 0) {
      return [];
    }
    const tokens = [];
    regex.lastIndex = 0;
    let nextStart = 0;
    let match = regex.exec(input);
    while (match !== null) {
      tokens.push(input.slice(nextStart, match.index));
      nextStart = match.index + match[0].length;
      match = regex.exec(input);
    }
    tokens.push(input.slice(nextStart));
    return tokens;
  }
  function xpathTokenizeOnWhitespace(input) {
    const normalized = normalizeSpace(input);
    return normalized.length === 0 ? [] : normalized.split(" ");
  }
  function xpathSubstring(source, roundedStart, roundedLength) {
    if (Number.isNaN(roundedStart) || roundedLength !== void 0 && Number.isNaN(roundedLength)) {
      return "";
    }
    const characters = Array.from(source);
    const endThreshold = roundedLength === void 0 ? void 0 : roundedStart + roundedLength;
    return characters.filter((_, index) => {
      const position = index + 1;
      return position >= roundedStart && (endThreshold === void 0 || position < endThreshold);
    }).join("");
  }
  function xpathRound(value) {
    return Math.round(value);
  }
  function roundToPrecision(value, precision) {
    if (!Number.isFinite(value) || Number.isNaN(value) || precision === 0) {
      return xpathRound(value);
    }
    return Number(`${xpathRound(Number(`${value}e${precision}`))}e${-precision}`);
  }
  function validateSupportedCollationArg(functionName, arg, context, span) {
    if (arg === void 0) {
      return;
    }
    const collation = itemToStringValue2(evaluateSingletonStringishArg(arg, context, span, functionName), span);
    if (collation.length > 0 && collation !== "http://www.w3.org/2005/xpath-functions/collation/codepoint") {
      throw helpers.createXPathError(FOCH0002, `Function ${functionName} received an unsupported collation.`, span, {
        functionName,
        collation
      });
    }
  }
  function codepointsToString(items, span) {
    let result = "";
    for (const item of items) {
      if (item.xdmKind !== "atomic" || item.type !== "xs:double" && item.type !== "xs:integer") {
        throw helpers.createXPathError(XPTY0004, "Function fn:codepoints-to-string requires numeric codepoint arguments.", span, {
          expectedType: "xs:integer*",
          actualType: helpers.describeItemsType([item])
        });
      }
      const codepoint = item.value;
      if (!Number.isInteger(codepoint) || !isValidXmlCodepoint(codepoint)) {
        throw helpers.createXPathError(FOCH0001, "Function fn:codepoints-to-string received an invalid XML character codepoint.", span, {
          codepoint
        });
      }
      result += String.fromCodePoint(codepoint);
    }
    return result;
  }
  function stringToCodepoints(item, span) {
    return Array.from(itemToStringValue2(item, span), (character) => createXdmInteger(character.codePointAt(0)));
  }
  function itemToNumberValue(item) {
    if (item === void 0) {
      return Number.NaN;
    }
    if (item.xdmKind === "node") {
      return Number(item.node.textContent ?? "");
    }
    const atomic = item;
    if (atomic.type === "xs:boolean") {
      return atomic.value === true ? 1 : 0;
    }
    return Number(atomic.value);
  }
  function createAtomicValueFromAtomized(value) {
    if (typeof value === "boolean") {
      return createXdmBoolean(value);
    }
    if (typeof value === "number") {
      return createXdmNumber(value);
    }
    return createXdmString(value);
  }
  function normalizeSpace(value) {
    return value.replace(/^[\u0009\u000A\u000D\u0020]+|[\u0009\u000A\u000D\u0020]+$/g, "").replace(/[\u0009\u000A\u000D\u0020]+/g, " ");
  }
  function xpathTranslate(input, mapFrom, mapTo) {
    const fromChars = Array.from(mapFrom);
    const toChars = Array.from(mapTo);
    const mapping = /* @__PURE__ */ new Map();
    for (let index = 0; index < fromChars.length; index += 1) {
      const char = fromChars[index];
      if (mapping.has(char)) {
        continue;
      }
      mapping.set(char, index < toChars.length ? toChars[index] : null);
    }
    let result = "";
    for (const char of Array.from(input)) {
      const replacement = mapping.get(char);
      if (replacement === void 0) {
        result += char;
        continue;
      }
      if (replacement !== null) {
        result += replacement;
      }
    }
    return result;
  }
  function getGeneratedNodeId(node) {
    if (node === void 0) {
      return "";
    }
    const existing = GENERATED_NODE_IDS.get(node.node);
    if (existing !== void 0) {
      return existing;
    }
    const generated = `d${nextGeneratedNodeId}`;
    nextGeneratedNodeId += 1;
    GENERATED_NODE_IDS.set(node.node, generated);
    return generated;
  }
  return {
    evaluateOptionalSingletonItemArg,
    evaluateOptionalSingletonNodeArg,
    evaluateSingletonStringishArg,
    itemToStringValue: itemToStringValue2,
    xpathTokenize,
    xpathTokenizeOnWhitespace,
    xpathSubstring,
    xpathRound,
    roundToPrecision,
    validateSupportedCollationArg,
    codepointsToString,
    stringToCodepoints,
    itemToNumberValue,
    createAtomicValueFromAtomized,
    normalizeSpace,
    xpathTranslate,
    getGeneratedNodeId
  };
}
function formatXPathDoubleString(value) {
  if (Number.isNaN(value)) {
    return "NaN";
  }
  if (value === Number.POSITIVE_INFINITY) {
    return "INF";
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return "-INF";
  }
  if (Object.is(value, -0) || value === 0) {
    return "0";
  }
  const absolute = Math.abs(value);
  if (absolute >= 1e6 || absolute < 1e-6) {
    return value.toExponential().replace("e", "E").replace(/E\+/, "E").replace(/(\.\d*?)0+E/, "$1E").replace(/\.E/, "E").replace(/E(-?)0+(\d+)/, "E$1$2");
  }
  return String(value);
}
function isValidXmlCodepoint(codepoint) {
  return codepoint === 9 || codepoint === 10 || codepoint === 13 || codepoint >= 32 && codepoint <= 55295 || codepoint >= 57344 && codepoint <= 65533 || codepoint >= 65536 && codepoint <= 1114111;
}

// src/xpath/eval/builtinNodeFunctions.ts
function createBuiltinNodeFunctionEvaluator(support) {
  function evaluateNodeBuiltinFunction(normalized, args, context, span) {
    switch (normalized) {
      case "fn:root": {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        if (item === void 0) {
          return [];
        }
        return [getRootNode(item)];
      }
      case "fn:name": {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getNodeNameValue(item))];
      }
      case "fn:local-name": {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getLocalNameValue(item))];
      }
      case "fn:namespace-uri": {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(getNamespaceUriValue(item))];
      }
      case "fn:generate-id": {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        return [createXdmString(support.getGeneratedNodeId(item))];
      }
      case "fn:node-name": {
        const item = support.evaluateOptionalSingletonNodeArg(normalized, args, context, span);
        const name = getNodeNameValue(item);
        return name.length === 0 ? [] : [createXdmQName(name)];
      }
      default:
        return void 0;
    }
  }
  return {
    evaluateNodeBuiltinFunction
  };
}

// src/xpath/eval/builtinNumericFunctions.ts
function createBuiltinNumericFunctionEvaluator(helpers, support) {
  function evaluateNumericBuiltinFunction(normalized, args, context, span) {
    switch (normalized) {
      case "fn:number": {
        const item = support.evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmNumber(support.itemToNumberValue(item))];
      }
      case "fn:sum": {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, "1..2", span);
        }
        const values = helpers.atomizedNumericValues(helpers.evaluateExpression(args[0], context), span, normalized);
        if (values.length === 0) {
          if (args.length === 1) {
            return [createXdmNumber(0)];
          }
          return helpers.evaluateExpression(args[1], context);
        }
        return [createXdmNumber(values.reduce((total, value) => total + value, 0))];
      }
      case "fn:min": {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, "1..2", span);
        }
        support.validateSupportedCollationArg(normalized, args[1], context, span);
        const values = helpers.atomizedComparableValues(helpers.evaluateExpression(args[0], context), span, normalized);
        return values.length === 0 ? [] : [support.createAtomicValueFromAtomized(values.reduce(
          (current, candidate) => helpers.compareComparableValues(candidate, current) < 0 ? candidate : current
        ))];
      }
      case "fn:max": {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, "1..2", span);
        }
        support.validateSupportedCollationArg(normalized, args[1], context, span);
        const values = helpers.atomizedComparableValues(helpers.evaluateExpression(args[0], context), span, normalized);
        return values.length === 0 ? [] : [support.createAtomicValueFromAtomized(values.reduce(
          (current, candidate) => helpers.compareComparableValues(candidate, current) > 0 ? candidate : current
        ))];
      }
      case "fn:avg": {
        helpers.requireArity(normalized, args, 1, span);
        const values = helpers.atomizedNumericValues(helpers.evaluateExpression(args[0], context), span, normalized);
        return values.length === 0 ? [] : [createXdmNumber(values.reduce((total, value) => total + value, 0) / values.length)];
      }
      case "fn:distinct-values": {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.atomizeItems(helpers.evaluateExpression(args[0], context));
        const distinct = /* @__PURE__ */ new Set();
        const results = [];
        for (const item of items) {
          const key = `${typeof item}:${String(item)}`;
          if (distinct.has(key)) {
            continue;
          }
          distinct.add(key);
          results.push(support.createAtomicValueFromAtomized(item));
        }
        return results;
      }
      case "fn:data": {
        if (args.length === 0) {
          const item = helpers.requireContextItem(context, span);
          return helpers.atomizeItems([item]).map(support.createAtomicValueFromAtomized);
        }
        helpers.requireArity(normalized, args, 1, span);
        return helpers.atomizeItems(helpers.evaluateExpression(args[0], context)).map(support.createAtomicValueFromAtomized);
      }
      case "fn:abs": {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0], context);
        return items.length === 0 ? [] : [createXdmNumber(Math.abs(helpers.requireSingleNumber(items, span)))];
      }
      case "fn:floor": {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0], context);
        return items.length === 0 ? [] : [createXdmNumber(Math.floor(helpers.requireSingleNumber(items, span)))];
      }
      case "fn:ceiling": {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0], context);
        return items.length === 0 ? [] : [createXdmNumber(Math.ceil(helpers.requireSingleNumber(items, span)))];
      }
      case "fn:round": {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, "1..2", span);
        }
        const roundedItems = helpers.evaluateExpression(args[0], context);
        if (roundedItems.length === 0) {
          return [];
        }
        return [createXdmNumber(support.roundToPrecision(
          helpers.requireSingleNumber(roundedItems, span),
          args.length === 2 ? helpers.requireSingleInteger(helpers.evaluateExpression(args[1], context), span, "Round precision") : 0
        ))];
      }
      default:
        return void 0;
    }
  }
  return {
    evaluateNumericBuiltinFunction
  };
}

// src/xpath/eval/builtinSequenceFunctions.ts
function createBuiltinSequenceFunctionEvaluator(helpers, support) {
  function evaluateSequenceBuiltinFunction(normalized, args, context, span) {
    switch (normalized) {
      case "fn:position":
        helpers.requireArity(normalized, args, 0, span);
        helpers.requireContextItem(context, span);
        return [createXdmInteger(context.contextPosition)];
      case "fn:last":
        helpers.requireArity(normalized, args, 0, span);
        helpers.requireContextItem(context, span);
        return [createXdmInteger(context.contextSize)];
      case "fn:count":
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmInteger(helpers.evaluateExpression(args[0], context).length)];
      case "fn:exists":
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmBoolean(helpers.evaluateExpression(args[0], context).length > 0)];
      case "fn:empty":
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmBoolean(helpers.evaluateExpression(args[0], context).length === 0)];
      case "fn:exactly-one": {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0], context);
        if (items.length !== 1) {
          throw helpers.createXPathError(FORG0005, "Function fn:exactly-one requires exactly one item.", span, {
            functionName: normalized,
            expectedType: "exactly one item()",
            actualType: helpers.describeItemsType(items)
          });
        }
        return [items[0]];
      }
      case "fn:one-or-more": {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0], context);
        if (items.length === 0) {
          throw helpers.createXPathError(FORG0005, "Function fn:one-or-more requires at least one item.", span, {
            functionName: normalized,
            expectedType: "one or more item()",
            actualType: helpers.describeItemsType(items)
          });
        }
        return items;
      }
      case "fn:zero-or-one": {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0], context);
        if (items.length > 1) {
          throw helpers.createXPathError(FORG0005, "Function fn:zero-or-one requires zero or one item.", span, {
            functionName: normalized,
            expectedType: "zero or one item()",
            actualType: helpers.describeItemsType(items)
          });
        }
        return items;
      }
      case "fn:reverse":
        helpers.requireArity(normalized, args, 1, span);
        return [...helpers.evaluateExpression(args[0], context)].reverse();
      case "fn:head": {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0], context);
        return items.length === 0 ? [] : [items[0]];
      }
      case "fn:tail": {
        helpers.requireArity(normalized, args, 1, span);
        const items = helpers.evaluateExpression(args[0], context);
        return items.slice(1);
      }
      case "fn:remove": {
        helpers.requireArity(normalized, args, 2, span);
        const items = helpers.evaluateExpression(args[0], context);
        const position = Math.trunc(helpers.requireSingleNumber(helpers.evaluateExpression(args[1], context), span));
        if (position < 1 || position > items.length) {
          return items;
        }
        return items.filter((_, index) => index !== position - 1);
      }
      case "fn:subsequence": {
        if (args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, "2..3", span);
        }
        const items = helpers.evaluateExpression(args[0], context);
        const start = support.xpathRound(helpers.requireSingleNumber(helpers.evaluateExpression(args[1], context), span));
        if (args.length === 2) {
          return items.filter((_, index) => index + 1 >= start);
        }
        const length = support.xpathRound(helpers.requireSingleNumber(helpers.evaluateExpression(args[2], context), span));
        const end = start + length;
        return items.filter((_, index) => {
          const position = index + 1;
          return position >= start && position < end;
        });
      }
      default:
        return void 0;
    }
  }
  return {
    evaluateSequenceBuiltinFunction
  };
}

// src/xpath/eval/regex.ts
var XML_NAME_START_CHAR_CLASS = ":A-Z_a-z\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\u{10000}-\\u{EFFFF}";
var XML_NAME_CHAR_CLASS = `${XML_NAME_START_CHAR_CLASS}\\-.0-9\\xB7\\u0300-\\u036F\\u203F-\\u2040`;
var SCHEMA_PROPERTY_BLOCK_ALIAS_ENTRIES = [
  ["IsBasicLatin", "\\x00-\\x7F"],
  ["IsGreekandCoptic", "\\u0370-\\u03FF"],
  ["IsIPAExtensions", "\\u0250-\\u02AF"],
  ["IsSpacingModifierLetters", "\\u02B0-\\u02FF"],
  ["IsCyrillic", "\\u0400-\\u04FF"],
  ["IsArmenian", "\\u0530-\\u058F"],
  ["IsHebrew", "\\u0590-\\u05FF"],
  ["IsArabic", "\\u0600-\\u06FF"],
  ["IsSyriac", "\\u0700-\\u074F"],
  ["IsThaana", "\\u0780-\\u07BF"],
  ["IsDevanagari", "\\u0900-\\u097F"],
  ["IsBengali", "\\u0980-\\u09FF"],
  ["IsGurmukhi", "\\u0A00-\\u0A7F"],
  ["IsGujarati", "\\u0A80-\\u0AFF"],
  ["IsOriya", "\\u0B00-\\u0B7F"],
  ["IsTamil", "\\u0B80-\\u0BFF"],
  ["IsTelugu", "\\u0C00-\\u0C7F"],
  ["IsKannada", "\\u0C80-\\u0CFF"],
  ["IsMalayalam", "\\u0D00-\\u0D7F"],
  ["IsSinhala", "\\u0D80-\\u0DFF"],
  ["IsThai", "\\u0E00-\\u0E7F"],
  ["IsLao", "\\u0E80-\\u0EFF"],
  ["IsTibetan", "\\u0F00-\\u0FFF"],
  ["IsMyanmar", "\\u1000-\\u109F"],
  ["IsGeorgian", "\\u10A0-\\u10FF"],
  ["IsHangulJamo", "\\u1100-\\u11FF"],
  ["IsEthiopic", "\\u1200-\\u137F"],
  ["IsCherokee", "\\u13A0-\\u13FF"],
  ["IsUnifiedCanadianAboriginalSyllabics", "\\u1400-\\u167F"],
  ["IsGeneralPunctuation", "\\u2000-\\u206F"],
  ["IsSuperscriptsandSubscripts", "\\u2070-\\u209F"],
  ["IsCurrencySymbols", "\\u20A0-\\u20CF"],
  ["IsCombiningDiacriticalMarksforSymbols", "\\u20D0-\\u20FF"],
  ["IsLetterlikeSymbols", "\\u2100-\\u214F"],
  ["IsNumberForms", "\\u2150-\\u218F"],
  ["IsArrows", "\\u2190-\\u21FF"],
  ["IsMathematicalOperators", "\\u2200-\\u22FF"],
  ["IsMiscellaneousTechnical", "\\u2300-\\u23FF"],
  ["IsControlPictures", "\\u2400-\\u243F"],
  ["IsOpticalCharacterRecognition", "\\u2440-\\u245F"],
  ["IsEnclosedAlphanumerics", "\\u2460-\\u24FF"],
  ["IsBoxDrawing", "\\u2500-\\u257F"],
  ["IsBlockElements", "\\u2580-\\u259F"],
  ["IsGeometricShapes", "\\u25A0-\\u25FF"],
  ["IsMiscellaneousSymbols", "\\u2600-\\u26FF"],
  ["IsDingbats", "\\u2700-\\u27BF"],
  ["IsBraillePatterns", "\\u2800-\\u28FF"],
  ["IsCJKRadicalsSupplement", "\\u2E80-\\u2EFF"],
  ["IsKangxiRadicals", "\\u2F00-\\u2FDF"],
  ["IsIdeographicDescriptionCharacters", "\\u2FF0-\\u2FFF"],
  ["IsCJKSymbolsandPunctuation", "\\u3000-\\u303F"],
  ["IsHiragana", "\\u3040-\\u309F"],
  ["IsKatakana", "\\u30A0-\\u30FF"],
  ["IsBopomofo", "\\u3100-\\u312F"],
  ["IsHangulCompatibilityJamo", "\\u3130-\\u318F"],
  ["IsKanbun", "\\u3190-\\u319F"],
  ["IsBopomofoExtended", "\\u31A0-\\u31BF"],
  ["IsEnclosedCJKLettersandMonths", "\\u3200-\\u32FF"],
  ["IsCJKCompatibility", "\\u3300-\\u33FF"],
  ["IsCJKUnifiedIdeographsExtensionA", "\\u3400-\\u4DBF"],
  ["IsCJKUnifiedIdeographs", "\\u4E00-\\u9FFF"],
  ["IsYiSyllables", "\\uA000-\\uA48F"],
  ["IsYiRadicals", "\\uA490-\\uA4CF"],
  ["IsHangulSyllables", "\\uAC00-\\uD7A3"],
  ["IsPrivateUseArea", "\\uE000-\\uF8FF"],
  ["IsCJKCompatibilityIdeographs", "\\uF900-\\uFAFF"],
  ["IsAlphabeticPresentationForms", "\\uFB00-\\uFB4F"],
  ["IsArabicPresentationForms-A", "\\uFB50-\\uFDFF"],
  ["IsCombiningHalfMarks", "\\uFE20-\\uFE2F"],
  ["IsCJKCompatibilityForms", "\\uFE30-\\uFE4F"],
  ["IsSmallFormVariants", "\\uFE50-\\uFE6F"],
  ["IsArabicPresentationForms-B", "\\uFE70-\\uFEFF"],
  ["IsHalfwidthandFullwidthForms", "\\uFF00-\\uFFEF"],
  ["IsSpecials", "\\uFFF0-\\uFFFF"],
  ["IsLatin-1Supplement", "\\x80-\\xFF"],
  ["IsLatinExtended-A", "\\u0100-\\u017F"],
  ["IsLatinExtended-B", "\\u0180-\\u024F"],
  ["IsCombiningDiacriticalMarks", "\\u0300-\\u036F"],
  ["IsOgham", "\\u1680-\\u169F"],
  ["IsRunic", "\\u16A0-\\u16FF"],
  ["IsKhmer", "\\u1780-\\u17FF"],
  ["IsMongolian", "\\u1800-\\u18AF"],
  ["IsLatinExtendedAdditional", "\\u1E00-\\u1EFF"],
  ["IsGreekExtended", "\\u1F00-\\u1FFF"],
  ["IsHighSurrogates", "\\uD800-\\uDB7F"],
  ["IsLowSurrogates", "\\uDC00-\\uDFFF"],
  ["IsOldItalic", "\\u{10300}-\\u{1032F}"],
  ["IsGothic", "\\u{10330}-\\u{1034F}"],
  ["IsDeseret", "\\u{10400}-\\u{1044F}"],
  ["IsByzantineMusicalSymbols", "\\u{1D000}-\\u{1D0FF}"],
  ["IsMusicalSymbols", "\\u{1D100}-\\u{1D1FF}"],
  ["IsMathematicalAlphanumericSymbols", "\\u{1D400}-\\u{1D7FF}"],
  ["IsCJKUnifiedIdeographsExtensionB", "\\u{20000}-\\u{2A6DF}"],
  ["IsCJKCompatibilityIdeographsSupplement", "\\u{2F800}-\\u{2FA1F}"],
  ["IsTags", "\\u{E0000}-\\u{E007F}"],
  ["IsSupplementaryPrivateUseArea-A", "\\u{F0000}-\\u{FFFFD}"],
  ["IsSupplementaryPrivateUseArea-B", "\\u{100000}-\\u{10FFFD}"]
];
var SCHEMA_PROPERTY_CLASS_ALIASES = Object.fromEntries(SCHEMA_PROPERTY_BLOCK_ALIAS_ENTRIES);
function compileRegex(pattern, flags, span, global = false) {
  validateXPathRegexPattern(pattern, flags, span);
  const translatedPattern = translateRegexPattern(pattern, flags, span);
  const ecmaFlags = toEcmaRegexFlags(flags, span, global, translatedPattern);
  try {
    return new RegExp(translatedPattern, ecmaFlags);
  } catch {
    throw createRegexError(FORX0002, "Invalid regular expression for the current ECMAScript-compatible regex slice.", span);
  }
}
function compileRegexRejectingZeroLengthMatches(pattern, flags, span) {
  const regex = compileRegex(pattern, flags, span, true);
  if (matchesZeroLength(regex)) {
    throw createRegexError(FORX0003, "Regular expressions for this function must not match a zero-length string.", span);
  }
  return regex;
}
function translateReplacementString(replacement, span) {
  let result = "";
  for (let index = 0; index < replacement.length; index += 1) {
    const char = replacement[index];
    if (char === "\\") {
      const escapedChar = replacement[index + 1];
      if (escapedChar === "\\") {
        result += "\\";
        index += 1;
        continue;
      }
      if (escapedChar === "$") {
        result += "$$";
        index += 1;
        continue;
      }
      throw createRegexError(FORX0004, "Invalid replacement string for fn:replace.", span);
    }
    if (char === "$") {
      const next = replacement[index + 1];
      if (next === void 0 || !/[0-9]/.test(next)) {
        throw createRegexError(FORX0004, "Invalid replacement string for fn:replace.", span);
      }
      if (next === "0") {
        result += "$&";
        index += 1;
        continue;
      }
      result += "$";
      let digitIndex = index + 1;
      while (digitIndex < replacement.length && /[0-9]/.test(replacement[digitIndex])) {
        result += replacement[digitIndex];
        digitIndex += 1;
      }
      index = digitIndex - 1;
      continue;
    }
    result += char;
  }
  return result;
}
function toEcmaRegexFlags(flags, span, global = false, translatedPattern) {
  let result = global ? "g" : "";
  for (const flag of flags) {
    if (flag === "i" || flag === "s") {
      if (!result.includes(flag)) {
        result += flag;
      }
      continue;
    }
    if (flag === "m") {
      continue;
    }
    if (flag === "q" || flag === "x") {
      continue;
    }
    throw createRegexError(
      FORX0001,
      `Unsupported regular expression flag ${flag} in the current ECMAScript-compatible regex slice.`,
      span
    );
  }
  if (translatedPattern !== void 0 && (flags.includes("i") || needsUnicodeRegexFlag(translatedPattern)) && !result.includes("u")) {
    result += "u";
  }
  return result;
}
function needsUnicodeRegexFlag(translatedPattern) {
  return translatedPattern.includes("\\u{") || translatedPattern.includes("\\p{") || translatedPattern.includes("\\P{") || [...translatedPattern].some((character) => character.codePointAt(0) > 65535);
}
function validateXPathRegexPattern(pattern, flags, span) {
  if (flags.includes("q")) {
    return;
  }
  let inCharacterClass = false;
  let escaped = false;
  let canQuantify = false;
  let nestedCharacterClassDepth = 0;
  let groupCount = 0;
  const openGroups = [];
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (escaped) {
      const propertyEscape = parsePropertyEscape(pattern, index - 1);
      if (propertyEscape !== void 0) {
        index = propertyEscape.endIndex;
        escaped = false;
        if (!inCharacterClass) {
          canQuantify = true;
        }
        continue;
      }
      if (char === "p" || char === "P") {
        throw createRegexError(
          FORX0002,
          `Invalid Unicode property escape \\${char} in XPath regular expression syntax.`,
          span
        );
      }
      if (inCharacterClass && /[0-9]/.test(char)) {
        throw createRegexError(
          FORX0002,
          `Invalid back-reference \\${char} inside a character class.`,
          span
        );
      }
      if (char === "0") {
        throw createRegexError(
          FORX0002,
          "Invalid back-reference \\0 in XPath regular expression syntax.",
          span
        );
      }
      if (!inCharacterClass && /[1-9]/.test(char)) {
        const backReference = resolveXPathNumericBackReference(pattern, index, groupCount, openGroups, span);
        index = backReference.endIndex;
      }
      if (/[A-Za-z]/.test(char) && !isSupportedXPathRegexEscape(char)) {
        throw createRegexError(
          FORX0002,
          `Unsupported XPath regular expression escape \\${char}.`,
          span
        );
      }
      escaped = false;
      if (!inCharacterClass) {
        canQuantify = true;
      }
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (inCharacterClass) {
      if (char === "[") {
        nestedCharacterClassDepth += 1;
        continue;
      }
      if (char === "]") {
        if (nestedCharacterClassDepth === 0) {
          inCharacterClass = false;
          canQuantify = true;
        } else {
          nestedCharacterClassDepth -= 1;
        }
      }
      continue;
    }
    if (char === "[") {
      inCharacterClass = true;
      nestedCharacterClassDepth = 0;
      canQuantify = false;
      continue;
    }
    if (char === "]") {
      throw createRegexError(FORX0002, "Invalid character class range syntax for the current regex slice.", span);
    }
    if (char === "(") {
      if (pattern[index + 1] === "?") {
        if (pattern[index + 2] !== ":") {
          throw createRegexError(
            FORX0002,
            "Unsupported group construct in XPath regular expression syntax.",
            span
          );
        }
        openGroups.push(void 0);
        canQuantify = false;
        index += 2;
        continue;
      }
      groupCount += 1;
      openGroups.push(groupCount);
      canQuantify = false;
      continue;
    }
    if (char === ")" && openGroups.length > 0) {
      openGroups.pop();
      canQuantify = true;
      continue;
    }
    if (char === "{") {
      const quantifier = parseXPathQuantifier(pattern, index, canQuantify, span);
      index = quantifier.endIndex;
      canQuantify = false;
      continue;
    }
    if (char === "?" || char === "*" || char === "+") {
      if (!canQuantify) {
        throw createRegexError(FORX0002, "Invalid quantifier syntax in XPath regular expression.", span);
      }
      if (pattern[index + 1] === "?") {
        index += 1;
      }
      canQuantify = false;
      continue;
    }
    if (char === "|") {
      canQuantify = false;
      continue;
    }
    if (char === "^" || char === "$") {
      canQuantify = true;
      continue;
    }
    canQuantify = true;
  }
}
function resolveXPathNumericBackReference(pattern, startIndex, groupCount, openGroups, span) {
  let endIndex = startIndex + 1;
  while (endIndex < pattern.length && /[0-9]/.test(pattern[endIndex])) {
    endIndex += 1;
  }
  const digits = pattern.slice(startIndex, endIndex);
  for (let prefixLength = digits.length; prefixLength >= 1; prefixLength -= 1) {
    const reference = Number(digits.slice(0, prefixLength));
    if (reference === 0) {
      continue;
    }
    if (reference > groupCount) {
      continue;
    }
    if (openGroups.includes(reference)) {
      throw createRegexError(
        FORX0002,
        `Invalid back-reference \\\\${reference} to a group that is not yet closed.`,
        span
      );
    }
    return {
      reference,
      suffix: digits.slice(prefixLength),
      endIndex: endIndex - 1
    };
  }
  throw createRegexError(
    FORX0002,
    `Invalid back-reference \\\\${digits} to a group that is not yet closed.`,
    span
  );
}
function matchesZeroLength(regex) {
  const probeFlags = regex.flags.replace("g", "");
  for (const sample of ["", "a", "0", " ", "\n", "aa"]) {
    const probeRegex = new RegExp(regex.source, probeFlags);
    const match = probeRegex.exec(sample);
    if (match !== null && match[0].length === 0) {
      return true;
    }
  }
  return false;
}
function translateRegexPattern(pattern, flags, span) {
  if (flags.includes("q")) {
    return escapeRegexLiteral(pattern);
  }
  let translated = translateXmlNameEscapes(pattern, span);
  if (flags.includes("x")) {
    translated = stripExpandedWhitespace(translated);
  }
  if (flags.includes("m")) {
    translated = rewriteMultilineAnchors(translated);
  }
  return translated;
}
function rewriteMultilineAnchors(pattern) {
  let result = "";
  let inCharacterClass = false;
  let escaped = false;
  for (const char of pattern) {
    if (escaped) {
      if (!inCharacterClass && /\s/.test(char)) {
        escaped = false;
        continue;
      }
      result += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }
    if (char === "[" && !inCharacterClass) {
      inCharacterClass = true;
      result += char;
      continue;
    }
    if (char === "]" && inCharacterClass) {
      inCharacterClass = false;
      result += char;
      continue;
    }
    if (!inCharacterClass && char === "^") {
      result += "(?:^|(?<=\\n)(?!$))";
      continue;
    }
    if (!inCharacterClass && char === "$") {
      result += "(?:$|(?=\\n))";
      continue;
    }
    result += char;
  }
  return result;
}
function escapeRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function stripExpandedWhitespace(pattern) {
  let result = "";
  let inCharacterClass = false;
  let escaped = false;
  let inComment = false;
  for (const char of pattern) {
    if (inComment) {
      if (char === "\n" || char === "\r") {
        inComment = false;
      }
      continue;
    }
    if (escaped) {
      if (!inCharacterClass && /\s/.test(char)) {
        escaped = false;
        continue;
      }
      result += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }
    if (char === "[" && !inCharacterClass) {
      inCharacterClass = true;
      result += char;
      continue;
    }
    if (char === "]" && inCharacterClass) {
      inCharacterClass = false;
      result += char;
      continue;
    }
    if (!inCharacterClass && /\s/.test(char)) {
      continue;
    }
    if (!inCharacterClass && char === "#") {
      inComment = true;
      continue;
    }
    result += char;
  }
  return result;
}
function translateXmlNameEscapes(pattern, span) {
  let result = "";
  let groupCount = 0;
  const openGroups = [];
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "[") {
      const translatedClass = translateCharacterClass(pattern, index, span);
      result += translatedClass.source;
      index = translatedClass.endIndex;
      continue;
    }
    if (char === "\\") {
      const propertyEscape = parsePropertyEscape(pattern, index);
      if (propertyEscape !== void 0) {
        result += translatePropertyEscape(propertyEscape, false);
        index = propertyEscape.endIndex;
        continue;
      }
      const next = pattern[index + 1];
      if (next === void 0) {
        result += "\\";
        continue;
      }
      if (/[1-9]/.test(next)) {
        const backReference = resolveXPathNumericBackReference(pattern, index + 1, groupCount, openGroups, span);
        result += `\\${backReference.reference}`;
        if (backReference.suffix.length > 0) {
          result += `(?:${escapeRegexLiteral(backReference.suffix)})`;
        }
        index = backReference.endIndex;
        continue;
      }
      if (next === "i" || next === "I" || next === "c" || next === "C") {
        result += translateXmlNameEscape(next);
      } else if (next === "d" || next === "D" || next === "w" || next === "W") {
        result += translateXPathRegexEscape(next, false);
      } else if (next === "-") {
        result += "-";
      } else {
        result += `\\${next}`;
      }
      index += 1;
      continue;
    }
    if (char === "(") {
      if (pattern[index + 1] !== "?") {
        groupCount += 1;
        openGroups.push(groupCount);
      }
      result += char;
      continue;
    }
    if (char === "^" || char === "$") {
      result += `(?:${char})`;
      continue;
    }
    if (char === ")" && openGroups.length > 0) {
      openGroups.pop();
      result += char;
      continue;
    }
    result += char;
  }
  return result;
}
function translateCharacterClass(pattern, startIndex, span) {
  let index = startIndex + 1;
  let escaped = false;
  let nestedCharacterClassDepth = 0;
  while (index < pattern.length) {
    const char = pattern[index];
    if (escaped) {
      escaped = false;
      index += 1;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      index += 1;
      continue;
    }
    if (char === "[") {
      nestedCharacterClassDepth += 1;
      index += 1;
      continue;
    }
    if (char === "]") {
      if (nestedCharacterClassDepth === 0) {
        break;
      }
      nestedCharacterClassDepth -= 1;
      index += 1;
      continue;
    }
    index += 1;
  }
  if (index >= pattern.length || pattern[index] !== "]") {
    throw createRegexError(FORX0002, "Invalid character class range syntax for the current regex slice.", span);
  }
  const content = pattern.slice(startIndex + 1, index);
  return {
    source: translateCharacterClassContent(content, span),
    endIndex: index
  };
}
function translateCharacterClassContent(content, span) {
  const outerNegated = content.startsWith("^");
  const body = outerNegated ? content.slice(1) : content;
  if (body.length === 0) {
    throw createRegexError(FORX0002, "Empty character classes are not valid in the current regex slice.", span);
  }
  const subtraction = splitTopLevelCharacterClassSubtraction(body);
  if (subtraction !== void 0) {
    const basePattern = outerNegated ? translateCharacterClassContent(`^${subtraction.base}`, span) : translateCharacterClassContent(subtraction.base, span);
    const subtractPattern = translateCharacterClassContent(subtraction.subtract, span);
    return subtractSingleCharacterPattern(basePattern, subtractPattern);
  }
  return outerNegated ? complementSingleCharacterPattern(translateSimpleCharacterClass(body, span)) : translateSimpleCharacterClass(body, span);
}
function translateSimpleCharacterClass(content, span) {
  const terms = tokenizeCharacterClassTerms(content, span);
  const hasComplementXmlEscape = terms.some((term) => term.kind === "xml-complement");
  if (!hasComplementXmlEscape) {
    const translatedBody = terms.map((term) => characterClassTermToClassBody(term)).join("");
    return `[${translatedBody}]`;
  }
  const translatedTerms = terms.map((term) => characterClassTermToAlternationAtom(term));
  return `(?:${translatedTerms.join("|")})`;
}
function splitTopLevelCharacterClassSubtraction(content) {
  let escaped = false;
  let nestedCharacterClassDepth = 0;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "[") {
      nestedCharacterClassDepth += 1;
      continue;
    }
    if (char === "]") {
      if (nestedCharacterClassDepth > 0) {
        nestedCharacterClassDepth -= 1;
      }
      continue;
    }
    if (char !== "-" || nestedCharacterClassDepth !== 0 || content[index + 1] !== "[") {
      continue;
    }
    const nestedRange = findMatchingCharacterClassRange(content, index + 1);
    if (nestedRange === void 0 || nestedRange.endIndex !== content.length - 1) {
      continue;
    }
    return {
      base: content.slice(0, index),
      subtract: nestedRange.content
    };
  }
  return void 0;
}
function findMatchingCharacterClassRange(content, startIndex) {
  let escaped = false;
  let nestedCharacterClassDepth = 0;
  for (let index = startIndex + 1; index < content.length; index += 1) {
    const char = content[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "[") {
      nestedCharacterClassDepth += 1;
      continue;
    }
    if (char === "]") {
      if (nestedCharacterClassDepth === 0) {
        return {
          content: content.slice(startIndex + 1, index),
          endIndex: index
        };
      }
      nestedCharacterClassDepth -= 1;
    }
  }
  return void 0;
}
function subtractSingleCharacterPattern(basePattern, subtractPattern) {
  return `(?:(?!${toLookaheadPattern(subtractPattern)})${basePattern})`;
}
function complementSingleCharacterPattern(pattern) {
  return `(?:(?!${toLookaheadPattern(pattern)})[\\s\\S])`;
}
function toLookaheadPattern(pattern) {
  return pattern.startsWith("(?:") && pattern.endsWith(")") ? pattern : `(?:${pattern})`;
}
function tokenizeCharacterClassTerms(content, span) {
  const rawTokens = tokenizeCharacterClassRawTokens(content);
  validateCharacterClassRawTokens(rawTokens, span);
  const terms = [];
  for (let index = 0; index < rawTokens.length; index += 1) {
    const current = rawTokens[index];
    const next = rawTokens[index + 1];
    const afterNext = rawTokens[index + 2];
    const rangeStart = next === "-" ? getCharacterClassRangeEndpointSource(current) : void 0;
    const rangeEnd = next === "-" && afterNext !== void 0 ? getCharacterClassRangeEndpointSource(afterNext) : void 0;
    if (rangeStart !== void 0 && rangeEnd !== void 0) {
      terms.push({ kind: "range", start: rangeStart, end: rangeEnd });
      index += 2;
      continue;
    }
    terms.push(toCharacterClassTerm(current));
  }
  return terms;
}
function tokenizeCharacterClassRawTokens(content) {
  const rawTokens = [];
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const propertyEscape = char === "\\" ? parsePropertyEscape(content, index) : void 0;
    if (propertyEscape !== void 0) {
      rawTokens.push(translatePropertyEscape(propertyEscape, true));
      index = propertyEscape.endIndex;
      continue;
    }
    if (char === "\\" && index + 1 < content.length) {
      const escape = content[index + 1];
      rawTokens.push(
        escape === "d" || escape === "D" || escape === "w" || escape === "W" ? translateXPathRegexEscape(escape, true) : `\\${escape}`
      );
      index += 1;
      continue;
    }
    rawTokens.push(char);
  }
  return rawTokens;
}
function validateCharacterClassRawTokens(rawTokens, span) {
  for (const token of rawTokens) {
    if (token === "[" || token === "]") {
      throw createRegexError(FORX0002, "Invalid character class range syntax for the current regex slice.", span);
    }
  }
  const consumedRangeEndpoints = /* @__PURE__ */ new Set();
  for (let index = 0; index < rawTokens.length; index += 1) {
    if (rawTokens[index] !== "-") {
      continue;
    }
    if (index === 0 || index === rawTokens.length - 1) {
      continue;
    }
    const previousIndex = index - 1;
    const nextIndex = index + 1;
    const previous = getCharacterClassRangeEndpointSource(rawTokens[previousIndex]);
    const next = getCharacterClassRangeEndpointSource(rawTokens[nextIndex]);
    if (consumedRangeEndpoints.has(previousIndex) || consumedRangeEndpoints.has(nextIndex) || previous === void 0 || next === void 0) {
      throw createRegexError(FORX0002, "Invalid character class range syntax for the current regex slice.", span);
    }
    consumedRangeEndpoints.add(previousIndex);
    consumedRangeEndpoints.add(nextIndex);
  }
}
function getCharacterClassRangeEndpointSource(token) {
  if (token.length === 1) {
    return token === "-" ? void 0 : token;
  }
  if (token.length === 2 && token[0] === "\\" && !/[0-9A-Za-z]/.test(token[1])) {
    return token;
  }
  return void 0;
}
function toCharacterClassTerm(token) {
  if (token === "\\i" || token === "\\c") {
    return { kind: "xml-positive", escape: token[1] };
  }
  if (token === "\\I" || token === "\\C") {
    return { kind: "xml-complement", escape: token[1] };
  }
  return { kind: "raw", raw: token };
}
function characterClassTermToClassBody(term) {
  switch (term.kind) {
    case "raw":
      return term.raw;
    case "range":
      return `${toGeneratedCharacterClassRangeEndpoint(term.start)}-${toGeneratedCharacterClassRangeEndpoint(term.end)}`;
    case "xml-positive":
      return translateXmlNameEscapeInCharacterClass(term.escape);
    case "xml-complement":
      return translateXmlNameEscape(term.escape);
  }
}
function characterClassTermToAlternationAtom(term) {
  switch (term.kind) {
    case "xml-positive":
      return `[${translateXmlNameEscapeInCharacterClass(term.escape)}]`;
    case "xml-complement":
      return term.escape === "I" ? `[^${XML_NAME_START_CHAR_CLASS}]` : `[^${XML_NAME_CHAR_CLASS}]`;
    case "range":
      return `[${toGeneratedCharacterClassRangeEndpoint(term.start)}-${toGeneratedCharacterClassRangeEndpoint(term.end)}]`;
    case "raw":
      return `[${toGeneratedCharacterClassRawSource(term.raw)}]`;
  }
}
function toGeneratedCharacterClassRawSource(raw) {
  if (raw.length === 1) {
    return escapeGeneratedCharacterClassLiteral(raw);
  }
  return raw;
}
function toGeneratedCharacterClassRangeEndpoint(endpoint) {
  return endpoint.length === 1 ? escapeGeneratedCharacterClassLiteral(endpoint) : endpoint;
}
function escapeGeneratedCharacterClassLiteral(char) {
  return /[-\\\]^]/.test(char) ? `\\${char}` : char;
}
function translateXmlNameEscape(escape) {
  switch (escape) {
    case "i":
      return `[${XML_NAME_START_CHAR_CLASS}]`;
    case "I":
      return `[^${XML_NAME_START_CHAR_CLASS}]`;
    case "c":
      return `[${XML_NAME_CHAR_CLASS}]`;
    case "C":
      return `[^${XML_NAME_CHAR_CLASS}]`;
  }
}
function translateXmlNameEscapeInCharacterClass(escape) {
  switch (escape) {
    case "i":
      return XML_NAME_START_CHAR_CLASS;
    case "c":
      return XML_NAME_CHAR_CLASS;
  }
}
function translateXPathRegexEscape(escape, inCharacterClass) {
  switch (escape) {
    case "d":
      return "\\p{Nd}";
    case "D":
      return "\\P{Nd}";
    case "w":
      return inCharacterClass ? "\\p{L}\\p{M}\\p{N}\\p{S}" : "[\\p{L}\\p{M}\\p{N}\\p{S}]";
    case "W":
      return inCharacterClass ? "\\p{P}\\p{Z}\\p{C}" : "[\\p{P}\\p{Z}\\p{C}]";
  }
}
function parsePropertyEscape(pattern, startIndex) {
  if (pattern[startIndex] !== "\\") {
    return void 0;
  }
  const escape = pattern[startIndex + 1];
  if (escape !== "p" && escape !== "P" || pattern[startIndex + 2] !== "{") {
    return void 0;
  }
  const endIndex = pattern.indexOf("}", startIndex + 3);
  if (endIndex === -1) {
    return void 0;
  }
  return {
    kind: "property",
    escape,
    name: pattern.slice(startIndex + 3, endIndex),
    source: pattern.slice(startIndex, endIndex + 1),
    endIndex
  };
}
function translatePropertyEscape(propertyEscape, inCharacterClass) {
  const classBodyAlias = SCHEMA_PROPERTY_CLASS_ALIASES[propertyEscape.name];
  if (classBodyAlias !== void 0) {
    if (inCharacterClass) {
      return propertyEscape.escape === "p" ? classBodyAlias : `^${classBodyAlias}`;
    }
    return propertyEscape.escape === "p" ? `[${classBodyAlias}]` : `[^${classBodyAlias}]`;
  }
  return propertyEscape.source;
}
function createRegexError(code, message, span) {
  return new XPathError(code, message, {
    source: "<xpath>",
    line: span.line,
    column: span.column,
    offset: span.start,
    endLine: span.endLine,
    endColumn: span.endColumn,
    endOffset: span.end
  });
}
function isSupportedXPathRegexEscape(escape) {
  return ["C", "D", "I", "P", "S", "W", "c", "d", "i", "n", "p", "r", "s", "t", "w"].includes(escape);
}
function parseXPathQuantifier(pattern, startIndex, canQuantify, span) {
  if (!canQuantify) {
    throw createRegexError(FORX0002, "Invalid quantifier syntax in XPath regular expression.", span);
  }
  let index = startIndex + 1;
  let lowerBound = "";
  while (index < pattern.length && /[0-9]/.test(pattern[index])) {
    lowerBound += pattern[index];
    index += 1;
  }
  if (lowerBound.length === 0) {
    throw createRegexError(FORX0002, "Invalid quantifier syntax in XPath regular expression.", span);
  }
  if (pattern[index] === "}") {
    return { endIndex: pattern[index + 1] === "?" ? index + 1 : index };
  }
  if (pattern[index] !== ",") {
    throw createRegexError(FORX0002, "Invalid quantifier syntax in XPath regular expression.", span);
  }
  index += 1;
  let upperBound = "";
  while (index < pattern.length && /[0-9]/.test(pattern[index])) {
    upperBound += pattern[index];
    index += 1;
  }
  if (pattern[index] !== "}") {
    throw createRegexError(FORX0002, "Invalid quantifier syntax in XPath regular expression.", span);
  }
  if (upperBound.length > 0 && Number(upperBound) < Number(lowerBound)) {
    throw createRegexError(FORX0002, "Invalid quantifier syntax in XPath regular expression.", span);
  }
  return { endIndex: pattern[index + 1] === "?" ? index + 1 : index };
}

// src/xpath/eval/builtinStringFunctions.ts
function createBuiltinStringFunctionEvaluator(helpers, support) {
  function evaluateStringBuiltinFunction(normalized, args, context, span) {
    switch (normalized) {
      case "fn:string": {
        const item = support.evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmString(support.itemToStringValue(item, span))];
      }
      case "fn:string-length": {
        const item = support.evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmInteger(Array.from(support.itemToStringValue(item, span)).length)];
      }
      case "fn:substring": {
        if (args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, "2..3", span);
        }
        const source = support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span);
        const start = support.xpathRound(helpers.requireSingleNumber(helpers.evaluateExpression(args[1], context), span));
        if (args.length === 2) {
          return [createXdmString(support.xpathSubstring(source, start))];
        }
        const length = support.xpathRound(helpers.requireSingleNumber(helpers.evaluateExpression(args[2], context), span));
        return [createXdmString(support.xpathSubstring(source, start, length))];
      }
      case "fn:codepoints-to-string": {
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmString(support.codepointsToString(helpers.evaluateExpression(args[0], context), span))];
      }
      case "fn:string-to-codepoints": {
        helpers.requireArity(normalized, args, 1, span);
        return support.stringToCodepoints(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span);
      }
      case "fn:concat": {
        if (args.length < 2) {
          helpers.throwArityError(normalized, args.length, ">=2", span);
        }
        return [createXdmString(args.map((arg) => support.itemToStringValue(support.evaluateSingletonStringishArg(arg, context, span, normalized), span)).join(""))];
      }
      case "fn:string-join": {
        if (args.length !== 1 && args.length !== 2) {
          helpers.throwArityError(normalized, args.length, "1..2", span);
        }
        const items = helpers.evaluateExpression(args[0], context);
        let separator = "";
        if (args.length === 2) {
          const separatorItems = helpers.evaluateExpression(args[1], context);
          if (separatorItems.length !== 1) {
            throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton separator argument.`, span, {
              functionName: normalized,
              expectedType: "singleton item() as separator",
              actualType: helpers.describeItemsType(separatorItems)
            });
          }
          separator = support.itemToStringValue(separatorItems[0], span);
        }
        return [createXdmString(items.map((item) => support.itemToStringValue(item, span)).join(separator))];
      }
      case "fn:matches": {
        if (args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, "2..3", span);
        }
        const input = support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span);
        const patternItems = helpers.evaluateExpression(args[1], context);
        if (patternItems.length !== 1) {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton pattern argument.`, span, {
            functionName: normalized,
            expectedType: "singleton item() as pattern",
            actualType: helpers.describeItemsType(patternItems)
          });
        }
        const pattern = support.itemToStringValue(patternItems[0], span);
        let flags = "";
        if (args.length === 3) {
          const flagItems = helpers.evaluateExpression(args[2], context);
          if (flagItems.length !== 1) {
            throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton flags argument.`, span, {
              functionName: normalized,
              expectedType: "singleton item() as flags",
              actualType: helpers.describeItemsType(flagItems)
            });
          }
          flags = support.itemToStringValue(flagItems[0], span);
        }
        return [createXdmBoolean(compileRegex(pattern, flags, span).test(input))];
      }
      case "fn:replace": {
        if (args.length !== 3 && args.length !== 4) {
          helpers.throwArityError(normalized, args.length, "3..4", span);
        }
        const input = support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span);
        const patternItems = helpers.evaluateExpression(args[1], context);
        if (patternItems.length !== 1) {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton pattern argument.`, span, {
            functionName: normalized,
            expectedType: "singleton item() as pattern",
            actualType: helpers.describeItemsType(patternItems)
          });
        }
        const pattern = support.itemToStringValue(patternItems[0], span);
        const flags = args.length === 4 ? support.itemToStringValue(support.evaluateSingletonStringishArg(args[3], context, span, normalized), span) : "";
        const replacementItems = helpers.evaluateExpression(args[2], context);
        if (replacementItems.length !== 1) {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton replacement argument.`, span, {
            functionName: normalized,
            expectedType: "singleton item() as replacement",
            actualType: helpers.describeItemsType(replacementItems)
          });
        }
        const replacement = support.itemToStringValue(replacementItems[0], span);
        return [createXdmString(
          input.replace(
            compileRegexRejectingZeroLengthMatches(pattern, flags, span),
            flags.includes("q") ? replacement.replace(/\$/g, "$$$$") : translateReplacementString(replacement, span)
          )
        )];
      }
      case "fn:tokenize": {
        if (args.length !== 1 && args.length !== 2 && args.length !== 3) {
          helpers.throwArityError(normalized, args.length, "1..3", span);
        }
        const input = support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span);
        if (args.length === 1) {
          return support.xpathTokenizeOnWhitespace(input).map(createXdmString);
        }
        const patternItems = helpers.evaluateExpression(args[1], context);
        if (patternItems.length !== 1) {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton pattern argument.`, span, {
            functionName: normalized,
            expectedType: "singleton item() as pattern",
            actualType: helpers.describeItemsType(patternItems)
          });
        }
        const pattern = support.itemToStringValue(patternItems[0], span);
        const flags = args.length === 3 ? support.itemToStringValue(support.evaluateSingletonStringishArg(args[2], context, span, normalized), span) : "";
        return support.xpathTokenize(input, compileRegexRejectingZeroLengthMatches(pattern, flags, span)).map(createXdmString);
      }
      case "fn:normalize-space": {
        const item = support.evaluateOptionalSingletonItemArg(normalized, args, context, span);
        return [createXdmString(support.normalizeSpace(support.itemToStringValue(item, span)))];
      }
      case "fn:translate": {
        helpers.requireArity(normalized, args, 3, span);
        const input = support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span);
        const mapFrom = support.itemToStringValue(support.evaluateSingletonStringishArg(args[1], context, span, normalized), span);
        const mapTo = support.itemToStringValue(support.evaluateSingletonStringishArg(args[2], context, span, normalized), span);
        return [createXdmString(support.xpathTranslate(input, mapFrom, mapTo))];
      }
      case "fn:contains":
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span).includes(
              support.itemToStringValue(support.evaluateSingletonStringishArg(args[1], context, span, normalized), span)
            )
          )
        ];
      case "fn:starts-with":
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span).startsWith(
              support.itemToStringValue(support.evaluateSingletonStringishArg(args[1], context, span, normalized), span)
            )
          )
        ];
      case "fn:ends-with":
        helpers.requireArity(normalized, args, 2, span);
        return [
          createXdmBoolean(
            support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span).endsWith(
              support.itemToStringValue(support.evaluateSingletonStringishArg(args[1], context, span, normalized), span)
            )
          )
        ];
      case "fn:upper-case": {
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmString(support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span).toUpperCase())];
      }
      case "fn:lower-case": {
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmString(support.itemToStringValue(support.evaluateSingletonStringishArg(args[0], context, span, normalized), span).toLowerCase())];
      }
      default:
        return void 0;
    }
  }
  return {
    evaluateStringBuiltinFunction
  };
}

// src/xpath/eval/builtinFunctions.ts
function createBuiltinFunctionEvaluator(helpers) {
  const support = createBuiltinFunctionSupport(helpers);
  const {
    evaluateOptionalSingletonItemArg,
    evaluateSingletonStringishArg,
    itemToStringValue: itemToStringValue2
  } = support;
  const { evaluateStringBuiltinFunction } = createBuiltinStringFunctionEvaluator(helpers, support);
  const { evaluateSequenceBuiltinFunction } = createBuiltinSequenceFunctionEvaluator(helpers, support);
  const { evaluateNodeBuiltinFunction } = createBuiltinNodeFunctionEvaluator(support);
  const { evaluateNumericBuiltinFunction } = createBuiltinNumericFunctionEvaluator(helpers, support);
  function evaluateFunctionCall2(callee, args, context, span) {
    const normalized = callee.includes(":") ? callee : `fn:${callee}`;
    const stringResult = evaluateStringBuiltinFunction(normalized, args, context, span);
    if (stringResult !== void 0) {
      return stringResult;
    }
    const sequenceResult = evaluateSequenceBuiltinFunction(normalized, args, context, span);
    if (sequenceResult !== void 0) {
      return sequenceResult;
    }
    const nodeResult = evaluateNodeBuiltinFunction(normalized, args, context, span);
    if (nodeResult !== void 0) {
      return nodeResult;
    }
    const numericResult = evaluateNumericBuiltinFunction(normalized, args, context, span);
    if (numericResult !== void 0) {
      return numericResult;
    }
    switch (normalized) {
      case "fn:deep-equal":
        helpers.requireArity(normalized, args, 2, span);
        return [createXdmBoolean(helpers.deepEqualSequences(
          helpers.evaluateExpression(args[0], context),
          helpers.evaluateExpression(args[1], context)
        ))];
      case "fn:QName":
        helpers.requireArity(normalized, args, 2, span);
        evaluateSingletonStringishArg(args[0], context, span, normalized);
        return [createXdmQName(itemToStringValue2(evaluateSingletonStringishArg(args[1], context, span, normalized)))];
      case "map:entry": {
        helpers.requireArity(normalized, args, 2, span);
        const keyItems = helpers.evaluateExpression(args[0], context);
        if (keyItems.length !== 1 || keyItems[0]?.xdmKind !== "atomic") {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires a singleton atomic key argument.`, span, {
            functionName: normalized,
            expectedType: "singleton atomic key",
            actualType: helpers.describeItemsType(keyItems)
          });
        }
        return [createXdmMap([{ key: keyItems[0], value: helpers.evaluateExpression(args[1], context) }])];
      }
      case "fn:local-name-from-QName": {
        helpers.requireArity(normalized, args, 1, span);
        const item = evaluateOptionalSingletonItemArg(normalized, args, context, span);
        if (item === void 0) {
          return [];
        }
        const atomic = item.xdmKind === "atomic" ? item : void 0;
        if (atomic === void 0 || atomic.type !== "xs:QName") {
          throw helpers.createXPathError(XPTY0004, `Function ${normalized} requires an xs:QName argument.`, span, {
            functionName: normalized,
            expectedType: "xs:QName?",
            actualType: helpers.describeItemType(item)
          });
        }
        return [createXdmString(getLocalNameFromQName(atomic.value))];
      }
      case "fn:error":
        helpers.requireArity(normalized, args, 0, span);
        throw helpers.createXPathError(FOER0000, "fn:error() was invoked.", span, {
          functionName: normalized
        });
      case "fn:trace":
        helpers.requireArity(normalized, args, 2, span);
        evaluateSingletonStringishArg(args[1], context, span, normalized);
        return helpers.evaluateExpression(args[0], context);
      case "fn:boolean":
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmBoolean(helpers.effectiveBooleanValue(helpers.evaluateExpression(args[0], context), span))];
      case "fn:not":
        helpers.requireArity(normalized, args, 1, span);
        return [createXdmBoolean(!helpers.effectiveBooleanValue(helpers.evaluateExpression(args[0], context), span))];
      case "fn:true":
        helpers.requireArity(normalized, args, 0, span);
        return [createXdmBoolean(true)];
      case "fn:false":
        helpers.requireArity(normalized, args, 0, span);
        return [createXdmBoolean(false)];
      default: {
        const suggestion = createFunctionNameSuggestion(callee);
        throw helpers.createXPathError(XPST0017, `Unknown function ${callee} with arity ${args.length}.`, span, {
          functionName: callee,
          actualArity: args.length
        }, suggestion === void 0 ? void 0 : { suggestions: [suggestion] });
      }
    }
  }
  return {
    evaluateFunctionCall: evaluateFunctionCall2
  };
}

// src/xpath/eval/evaluator.ts
function evaluate(ast, context) {
  return createSequence(evaluateExpression(ast, context));
}
function evaluateEffectiveBooleanValue(ast, context) {
  return effectiveBooleanValue(evaluateExpression(ast, context), ast.span);
}
var {
  requireContextItem,
  requireContextNode,
  isXdmNode,
  resolveVariableReference
} = createContextHelpers({
  createXPathError,
  describeItemsType
});
function evaluateExpression(ast, context) {
  switch (ast.kind) {
    case "array":
      return [createXdmArray(ast.members.map((member) => evaluateExpression(member, context)))];
    case "binary":
      return evaluateBinaryExpression(ast.operator, ast.left, ast.right, context, ast.span);
    case "contextItem":
      return [requireContextItem(context, ast.span)];
    case "filter":
      return evaluateFilterExpression(ast, context);
    case "for":
      return evaluateForExpression(ast.bindings, ast.returnExpr, context);
    case "functionCall":
      return evaluateFunctionCall(ast.callee, ast.arguments, context, ast.span);
    case "if":
      return effectiveBooleanValue(evaluateExpression(ast.test, context), ast.test.span) ? evaluateExpression(ast.thenBranch, context) : evaluateExpression(ast.elseBranch, context);
    case "quantified":
      return [
        createXdmBoolean(
          evaluateQuantifiedExpression(ast.quantifier, ast.bindings, ast.satisfiesExpr, context)
        )
      ];
    case "let":
      return evaluateLetExpression(ast.bindings, ast.returnExpr, context);
    case "number":
      return [createNumberLiteralValue(ast.value, ast.lexeme)];
    case "string":
      return [createXdmString(ast.value)];
    case "sequence":
      return ast.items.flatMap((item) => evaluateExpression(item, context));
    case "unary": {
      const operand = requireSingleNumber(evaluateExpression(ast.operand, context), ast.operand.span);
      if (ast.operand.kind === "number" && isDecimalLiteralLexeme2(ast.operand.lexeme)) {
        return [createXdmNumber(
          ast.operator === "-" ? -operand : operand,
          normalizeSignedDecimalLiteralLexeme(ast.operator, ast.operand.lexeme)
        )];
      }
      return [createXdmNumber(ast.operator === "-" ? -operand : operand)];
    }
    case "variable":
      return resolveVariableReference(ast.name, context, ast.span);
    case "path":
      return evaluatePath(ast, context);
  }
}
function evaluateBinaryExpression(operator, leftAst, rightAst, context, span) {
  if (operator === "!") {
    const leftItems = evaluateExpression(leftAst, context);
    const size = leftItems.length;
    return leftItems.flatMap((item, index) => evaluateExpression(rightAst, {
      ...context,
      contextItem: item,
      contextPosition: index + 1,
      contextSize: size
    }));
  }
  if (operator === "and") {
    const leftValue = effectiveBooleanValue(evaluateExpression(leftAst, context), leftAst.span);
    if (!leftValue) {
      return [createXdmBoolean(false)];
    }
    return [createXdmBoolean(effectiveBooleanValue(evaluateExpression(rightAst, context), rightAst.span))];
  }
  if (operator === "or") {
    const leftValue = effectiveBooleanValue(evaluateExpression(leftAst, context), leftAst.span);
    if (leftValue) {
      return [createXdmBoolean(true)];
    }
    return [createXdmBoolean(effectiveBooleanValue(evaluateExpression(rightAst, context), rightAst.span))];
  }
  if (operator === "+" || operator === "-" || operator === "*" || operator === "div" || operator === "idiv" || operator === "mod") {
    const left = requireSingleNumber(evaluateExpression(leftAst, context), leftAst.span);
    const right = requireSingleNumber(evaluateExpression(rightAst, context), rightAst.span);
    if ((operator === "idiv" || operator === "mod") && right === 0) {
      throw createXPathError(FOAR0001, "Division by zero.", span);
    }
    switch (operator) {
      case "+":
        return [createXdmNumber(left + right)];
      case "-":
        return [createXdmNumber(left - right)];
      case "*":
        return [createXdmNumber(left * right)];
      case "div":
        return [createXdmNumber(left / right)];
      case "idiv":
        return [createXdmNumber(Math.trunc(left / right))];
      case "mod":
        return [createXdmNumber(left % right)];
    }
  }
  if (operator === "to") {
    return evaluateRangeExpression(leftAst, rightAst, context);
  }
  if (operator === "||") {
    return [createXdmString(
      evaluateConcatOperandString(leftAst, context, span) + evaluateConcatOperandString(rightAst, context, span)
    )];
  }
  if (operator === "|") {
    return normalizeNodeSequence([
      ...requireNodeSequence(evaluateExpression(leftAst, context), leftAst.span),
      ...requireNodeSequence(evaluateExpression(rightAst, context), rightAst.span)
    ]);
  }
  if (operator === "intersect") {
    const left = requireNodeSequence(evaluateExpression(leftAst, context), leftAst.span);
    const right = new Set(requireNodeSequence(evaluateExpression(rightAst, context), rightAst.span).map((item) => item.node));
    return normalizeNodeSequence(left.filter((item) => right.has(item.node)));
  }
  if (operator === "except") {
    const right = new Set(requireNodeSequence(evaluateExpression(rightAst, context), rightAst.span).map((item) => item.node));
    return normalizeNodeSequence(
      requireNodeSequence(evaluateExpression(leftAst, context), leftAst.span).filter((item) => !right.has(item.node))
    );
  }
  if (operator === "eq" || operator === "ne" || operator === "lt" || operator === "le" || operator === "gt" || operator === "ge") {
    return compareValue(
      operator,
      evaluateExpression(leftAst, context),
      evaluateExpression(rightAst, context),
      span
    );
  }
  if (operator === "is" || operator === "<<" || operator === ">>") {
    return compareNodes(
      operator,
      evaluateExpression(leftAst, context),
      evaluateExpression(rightAst, context),
      span
    );
  }
  return [
    createXdmBoolean(
      compareGeneral(
        operator,
        evaluateExpression(leftAst, context),
        evaluateExpression(rightAst, context),
        span
      )
    )
  ];
}
function evaluateRangeExpression(leftAst, rightAst, context) {
  const start = requireSingleInteger(evaluateExpression(leftAst, context), leftAst.span, "Range expression start");
  const end = requireSingleInteger(evaluateExpression(rightAst, context), rightAst.span, "Range expression end");
  if (start > end) {
    return [];
  }
  const items = [];
  for (let value = start; value <= end; value += 1) {
    items.push(createXdmNumber(value));
  }
  return items;
}
function isDecimalLiteralLexeme2(lexeme) {
  return lexeme.includes(".") && !/[eE]/.test(lexeme);
}
function requireNodeSequence(items, span) {
  const nodes = [];
  for (const item of items) {
    if (!isXdmNode(item)) {
      throw createXPathError(XPTY0019, "Path expressions require node inputs.", span, {
        expectedType: "node()*",
        actualType: describeItemsType(items)
      });
    }
    nodes.push(item);
  }
  return nodes;
}
function effectiveBooleanValue(items, span) {
  if (items.length === 0) {
    return false;
  }
  if (items[0]?.xdmKind === "node") {
    return true;
  }
  if (items.length !== 1 || items[0]?.xdmKind !== "atomic") {
    throw createXPathError(FORG0006, "Effective boolean value is not defined for this sequence.", span, {
      expectedType: "node(), xs:boolean, xs:string, or xs:double",
      actualType: describeItemsType(items)
    });
  }
  const atomic = items[0];
  if (atomic.type === "xs:boolean") {
    return atomic.value;
  }
  if (atomic.type === "xs:double" || atomic.type === "xs:integer") {
    return atomic.value !== 0 && !Number.isNaN(atomic.value);
  }
  if (atomic.type === "xs:string") {
    return atomic.value.length > 0;
  }
  throw createXPathError(FORG0006, "Effective boolean value is not defined for this atomic type.", span, {
    expectedType: "node(), xs:boolean, xs:string, xs:double, or xs:integer",
    actualType: atomic.type
  });
}
var {
  requireArity,
  validateFunctionCallSignature,
  throwArityError
} = createArityValidationHelpers(createXPathError);
var {
  compareGeneral,
  atomizeItems,
  atomizedNumericValues,
  atomizedComparableValues,
  compareComparableValues,
  deepEqualSequences,
  atomizeSingleton,
  compareValueOperands
} = createComparisonHelpers({
  createXPathError,
  effectiveBooleanValue,
  describeItemsType
});
var { compareNodes, compareValue } = createComparisonEvaluator({
  createXPathError,
  describeItemsType,
  atomizeSingleton,
  compareValueOperands
});
var {
  evaluateConcatOperandString,
  requireSingleNumber,
  requireSingleInteger,
  createNumberLiteralValue,
  normalizeSignedDecimalLiteralLexeme
} = createScalarHelpers({
  evaluateExpression,
  createXPathError,
  describeItemsType,
  describeItemType
});
var { evaluateFunctionCall } = createBuiltinFunctionEvaluator({
  evaluateExpression,
  requireArity,
  throwArityError,
  createXPathError,
  describeItemsType,
  describeItemType,
  effectiveBooleanValue,
  requireContextItem,
  requireSingleNumber,
  requireSingleInteger,
  atomizedNumericValues,
  atomizedComparableValues,
  atomizeItems,
  deepEqualSequences,
  compareComparableValues
});
var { evaluateFilterExpression, evaluatePath } = createPathEvaluator({
  evaluateExpression,
  effectiveBooleanValue,
  requireContextNode,
  isXdmNode,
  describeItemsType,
  createXPathError,
  validateFunctionCallSignature
});
var {
  evaluateLetExpression,
  evaluateForExpression,
  evaluateQuantifiedExpression
} = createFlowExpressionEvaluator({
  evaluateExpression,
  effectiveBooleanValue
});
function createXPathError(code, message, span, details, context) {
  return new XPathError(code, message, {
    source: "<xpath>",
    line: span.line,
    column: span.column,
    offset: span.start,
    endLine: span.endLine,
    endColumn: span.endColumn,
    endOffset: span.end
  }, details, context);
}
function describeItemsType(items) {
  if (items.length === 0) {
    return "empty-sequence()";
  }
  if (items.length === 1) {
    return describeItemType(items[0]);
  }
  const uniqueTypes = [...new Set(items.map((item) => describeItemType(item)))];
  return `sequence(${items.length}) of ${uniqueTypes.join(" | ")}`;
}
function describeItemType(item) {
  if (item.xdmKind === "node") {
    return "node()";
  }
  if (item.xdmKind === "map") {
    return "map(*)";
  }
  if (item.xdmKind === "array") {
    return "array(*)";
  }
  return item.type;
}

// src/xslt/eval/temporaryTree.ts
function buildTemporaryTree(serializedContent) {
  const temporaryDocument = parseXml(`<temporary-root>${serializedContent}</temporary-root>`);
  const fragment = temporaryDocument.createDocumentFragment();
  const wrapper = temporaryDocument.documentElement;
  if (wrapper === null) {
    return createXdmNode(fragment);
  }
  while (wrapper.firstChild !== null) {
    fragment.appendChild(wrapper.firstChild);
  }
  return createXdmNode(fragment);
}

// src/xslt/eval/transform.ts
function runTransform(ir, sourceXml, options) {
  if (options.initialMode !== void 0) {
    throw new XsltError(
      XTDE0040,
      "Initial modes are not yet implemented in the current MVP+3 slice.",
      void 0,
      { mode: options.initialMode },
      {
        suggestions: [{
          kind: "fix",
          label: "omit initialMode and use the default mode in the current MVP+3 slice",
          confidence: 1
        }]
      }
    );
  }
  const sourceDocument = parseXml(sourceXml, { role: "source-document", sourceName: "<source-xml>" });
  const staticContext = createStaticContext(ir, options);
  const globalVariables = evaluateGlobalBindings(
    ir,
    ir.globalBindings,
    staticContext,
    createXdmNode(sourceDocument),
    options.parameters
  );
  if (options.initialTemplate !== void 0) {
    const initialContext = createContext(createXdmNode(sourceDocument), staticContext, 1, 1, globalVariables);
    return {
      output: renderInitialTemplate(options.initialTemplate, ir, initialContext)
    };
  }
  return {
    output: applyTemplatesToItems(
      [createXdmNode(sourceDocument)],
      ir,
      staticContext,
      globalVariables
    )
  };
}
function createStaticContext(ir, options) {
  return {
    namespaces: new Map(Object.entries(ir.namespaces)),
    defaultElementNamespace: ir.defaultElementNamespace,
    ...options.baseUri === void 0 ? {} : { baseUri: options.baseUri }
  };
}
function createContext(item, staticContext, position, size, variables = /* @__PURE__ */ new Map()) {
  return {
    staticContext,
    contextItem: item,
    contextPosition: position,
    contextSize: size,
    variables
  };
}
function applyTemplatesToItems(items, ir, staticContext, variables = /* @__PURE__ */ new Map(), location, withParams = []) {
  if (items.some((item) => asXdmNode(item) === void 0)) {
    throw createApplyTemplatesNodeSequenceError(items, location);
  }
  return items.map((item, index) => {
    const nodeItem = item;
    const context = createContext(nodeItem, staticContext, index + 1, items.length, variables);
    return applyTemplateToNode(nodeItem.node, ir, context, withParams);
  }).join("");
}
function applyTemplateToNode(node, ir, context, withParams = []) {
  const template = findBestMatchingTemplate(node, ir.templates, context.staticContext);
  if (template !== void 0) {
    try {
      return renderTemplate(template, withParams, ir, context);
    } catch (error) {
      throw prependXsltErrorFrame(
        error,
        createTemplateFrame2(template),
        createRelatedLocation("enclosing template", template.location)
      );
    }
  }
  return renderBuiltInTemplate(node, ir, context.staticContext, context.variables);
}
function renderInitialTemplate(name, ir, context) {
  const normalizedName = normalizeTemplateName(name, context.staticContext);
  const template = findNamedTemplate(normalizedName, ir.templates);
  if (template === void 0) {
    const suggestion = createInitialTemplateSuggestion(name, ir.templates);
    throw new XsltError(
      XTSE0010,
      `Initial template ${name} is not declared in the current stylesheet.`,
      void 0,
      {
        initialTemplate: name
      },
      suggestion === void 0 ? {
        suggestions: [{
          kind: "fix",
          label: `declare xsl:template name="${name}" or omit initialTemplate`,
          confidence: 1
        }]
      } : { suggestions: [suggestion] }
    );
  }
  try {
    return renderTemplate(template, [], ir, context);
  } catch (error) {
    throw prependXsltErrorFrame(
      error,
      createTemplateFrame2(template),
      createRelatedLocation("initial template", template.location)
    );
  }
}
function renderInstructions(instructions, ir, context) {
  let output = "";
  let currentContext = context;
  for (const instruction of instructions) {
    if (instruction.kind === "variable") {
      currentContext = bindVariableInstruction(instruction, ir, currentContext);
      continue;
    }
    output += renderInstruction(instruction, ir, currentContext);
  }
  return output;
}
function renderInstruction(instruction, ir, context) {
  switch (instruction.kind) {
    case "literalText":
      return escapeText(instruction.text);
    case "comment":
      return `<!--${renderInstructions(instruction.body, ir, context)}-->`;
    case "variable":
      return "";
    case "literalElement": {
      const attributes = instruction.attributes.map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`).join("");
      const body = renderInstructions(instruction.body, ir, context);
      return `<${instruction.name}${attributes}>${body}</${instruction.name}>`;
    }
    case "if": {
      try {
        return evaluateEffectiveBooleanValue(instruction.test, context) ? renderInstructions(instruction.body, ir, context) : "";
      } catch (error) {
        throw prependXsltErrorFrame(
          error,
          createInstructionFrame(`xsl:if test="${instruction.testText}"`, instruction.location),
          createRelatedLocation("containing instruction", instruction.location)
        );
      }
    }
    case "choose": {
      for (const branch of instruction.whenBranches) {
        try {
          if (evaluateEffectiveBooleanValue(branch.test, context)) {
            return renderInstructions(branch.body, ir, context);
          }
        } catch (error) {
          throw prependXsltErrorFrame(
            error,
            createInstructionFrame(`xsl:when test="${branch.testText}"`, branch.location),
            createRelatedLocation("containing instruction", branch.location)
          );
        }
      }
      return instruction.otherwiseBody === void 0 ? "" : renderInstructions(instruction.otherwiseBody, ir, context);
    }
    case "forEach": {
      try {
        const items = [...evaluate(instruction.select, context)];
        return items.map((item, index) => renderInstructions(
          instruction.body,
          ir,
          {
            ...context,
            contextItem: item,
            contextPosition: index + 1,
            contextSize: items.length
          }
        )).join("");
      } catch (error) {
        throw prependXsltErrorFrame(
          error,
          createInstructionFrame(`xsl:for-each select="${instruction.selectText}"`, instruction.location),
          createRelatedLocation("containing instruction", instruction.location)
        );
      }
    }
    case "callTemplate": {
      const template = findNamedTemplate(instruction.name, ir.templates);
      if (template === void 0) {
        const suggestion = createNamedTemplateCallSuggestion(instruction.name, ir.templates);
        throw new XsltError(
          XTSE0650,
          `Named template ${instruction.name} is not declared in the current stylesheet.`,
          instruction.location,
          {
            templateName: instruction.name
          },
          suggestion === void 0 ? void 0 : { suggestions: [suggestion] }
        );
      }
      try {
        return renderTemplate(template, instruction.withParams, ir, context);
      } catch (error) {
        throw prependXsltErrorFrame(
          error,
          createTemplateFrame2(template),
          createRelatedLocation("called template", template.location)
        );
      }
    }
    case "valueOf": {
      try {
        const items = [...evaluate(instruction.select, context)];
        const separator = instruction.separator ?? " ";
        return escapeText(items.map(itemToStringValue).join(separator));
      } catch (error) {
        throw prependXsltErrorFrame(
          error,
          createInstructionFrame(`xsl:value-of select="${instruction.selectText}"`, instruction.location),
          createRelatedLocation("containing instruction", instruction.location)
        );
      }
    }
    case "applyTemplates": {
      try {
        const items = instruction.select === void 0 ? getChildNodeItems(context.contextItem) : [...evaluate(instruction.select, context)];
        return applyTemplatesToItems(
          items,
          ir,
          context.staticContext,
          context.variables,
          instruction.location,
          instruction.withParams
        );
      } catch (error) {
        throw prependXsltErrorFrame(
          error,
          createInstructionFrame(
            instruction.selectText === void 0 ? "xsl:apply-templates" : `xsl:apply-templates select="${instruction.selectText}"`,
            instruction.location
          ),
          createRelatedLocation("caller instruction", instruction.location)
        );
      }
    }
  }
}
function bindVariableInstruction(instruction, ir, context) {
  try {
    const value = evaluateBindingValue(instruction, ir, context);
    const variables = new Map(context.variables);
    variables.set(instruction.name, value);
    variables.set(`{}${instruction.name}`, value);
    return {
      ...context,
      variables
    };
  } catch (error) {
    throw prependXsltErrorFrame(
      error,
      createInstructionFrame(
        instruction.selectText === void 0 ? `xsl:variable name="${instruction.name}"` : `xsl:variable name="${instruction.name}" select="${instruction.selectText}"`,
        instruction.location
      ),
      createRelatedLocation("containing instruction", instruction.location)
    );
  }
}
function renderTemplate(template, withParams, ir, context) {
  const variables = bindTemplateParams(template.params, withParams, ir, context);
  return renderInstructions(template.body, ir, {
    ...context,
    variables
  });
}
function bindTemplateParams(params, withParams, ir, context) {
  if (params.length === 0 && withParams.length === 0) {
    return context.variables;
  }
  const provided = /* @__PURE__ */ new Map();
  for (const withParam of withParams) {
    provided.set(withParam.name, evaluateBindingValue(withParam, ir, context));
  }
  const variables = new Map(context.variables);
  for (const param of params) {
    const value = provided.has(param.name) ? provided.get(param.name) : param.required ? throwMissingTemplateParam(param, [...provided.keys()]) : evaluateBindingValue(param, ir, {
      ...context,
      variables
    });
    variables.set(param.name, value);
    variables.set(`{}${param.name}`, value);
  }
  return variables;
}
function evaluateBindingValue(binding, ir, context) {
  if (binding.select !== void 0) {
    return [...evaluate(binding.select, context)];
  }
  if (binding.body === void 0) {
    return [createXdmString("")];
  }
  return evaluateTemporaryTree(binding.body, ir, context);
}
function evaluateTemporaryTree(body, ir, context) {
  return [buildTemporaryTree(renderInstructions(body, ir, context))];
}
function throwMissingTemplateParam(param, providedNames) {
  const suggestion = createMissingTemplateParamSuggestion(param.name, providedNames);
  throw new XsltError(
    XTDE0700,
    `Required template parameter $${param.name} was not supplied.`,
    param.location,
    {
      parameterName: param.name
    },
    suggestion === void 0 ? void 0 : { suggestions: [suggestion] }
  );
}
function getChildNodeItems(item) {
  const nodeItem = asXdmNode(item);
  if (nodeItem === void 0) {
    return [];
  }
  const children = [];
  for (let index = 0; index < nodeItem.node.childNodes.length; index += 1) {
    const child = nodeItem.node.childNodes.item(index);
    if (child !== null) {
      children.push(createXdmNode(child));
    }
  }
  return children;
}
function renderBuiltInTemplate(node, ir, staticContext, variables) {
  if (node.nodeType === node.DOCUMENT_NODE || node.nodeType === node.ELEMENT_NODE) {
    return applyTemplatesToItems(getChildNodeItems(createXdmNode(node)), ir, staticContext, variables);
  }
  if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE || node.nodeType === node.ATTRIBUTE_NODE) {
    return escapeText(node.nodeValue ?? "");
  }
  return "";
}
function itemToStringValue(item) {
  const nodeItem = asXdmNode(item);
  if (nodeItem !== void 0) {
    return nodeItem.node.textContent ?? "";
  }
  return String(item.value);
}
function evaluateGlobalBindings(ir, bindings, staticContext, contextItem, parameters) {
  if (bindings.length === 0 && parameters === void 0) {
    return /* @__PURE__ */ new Map();
  }
  const externalParameters = normalizeExternalParameters(parameters, staticContext);
  const runtimeBindings = /* @__PURE__ */ new Map();
  for (const binding of bindings) {
    let state = "pending";
    let cachedValue;
    const deferredBinding = {
      evaluate: () => {
        if (state === "done") {
          return cachedValue;
        }
        if (state === "evaluating") {
          throw new XsltError(
            XTDE0640,
            `Circular top-level ${binding.kind} dependency involving $${binding.name}.`,
            binding.location,
            { variableName: binding.name }
          );
        }
        state = "evaluating";
        try {
          if (binding.kind === "param" && externalParameters.values.has(binding.name)) {
            cachedValue = externalParameters.values.get(binding.name);
          } else if (binding.kind === "param" && binding.required) {
            const suggestion = createMissingStylesheetParameterSuggestion(binding.name, externalParameters.normalizedNames);
            throw new XsltError(
              XTDE0050,
              `Required stylesheet parameter $${binding.name} was not supplied.`,
              binding.location,
              {
                parameterName: binding.name
              },
              suggestion === void 0 ? void 0 : { suggestions: [suggestion] }
            );
          } else {
            const context = createContext(contextItem, staticContext, 1, 1, runtimeBindings);
            cachedValue = evaluateBindingValue(binding, ir, context);
          }
          state = "done";
          runtimeBindings.set(binding.name, cachedValue);
          runtimeBindings.set(`{}${binding.name}`, cachedValue);
          return cachedValue;
        } catch (error) {
          state = "pending";
          throw prependXsltErrorFrame(
            error,
            createInstructionFrame(
              binding.selectText === void 0 ? `xsl:${binding.kind} name="${binding.name}"` : `xsl:${binding.kind} name="${binding.name}" select="${binding.selectText}"`,
              binding.location
            ),
            createRelatedLocation(`top-level ${binding.kind}`, binding.location)
          );
        }
      }
    };
    runtimeBindings.set(binding.name, deferredBinding);
    runtimeBindings.set(`{}${binding.name}`, deferredBinding);
  }
  for (const binding of bindings) {
    const deferredBinding = runtimeBindings.get(binding.name);
    if (typeof deferredBinding === "object" && deferredBinding !== null && "evaluate" in deferredBinding) {
      deferredBinding.evaluate();
    }
  }
  return runtimeBindings;
}
function normalizeExternalParameters(parameters, staticContext) {
  if (parameters === void 0) {
    return {
      values: /* @__PURE__ */ new Map(),
      normalizedNames: []
    };
  }
  const bindings = /* @__PURE__ */ new Map();
  const normalizedNames = [];
  for (const [name, value] of Object.entries(parameters)) {
    const normalizedName = normalizeTemplateName(name, staticContext);
    normalizedNames.push(normalizedName);
    bindings.set(normalizedName, value);
    if (!normalizedName.startsWith("{")) {
      bindings.set(`{}${normalizedName}`, value);
    }
  }
  return {
    values: bindings,
    normalizedNames
  };
}
function createMissingStylesheetParameterSuggestion(expectedName, providedNames) {
  const expectedDisplayName = expectedName.startsWith("{") ? expectedName : formatTemplateSuggestionName(expectedName);
  const nearest = providedNames.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(
      formatTemplateSuggestionName(expectedDisplayName),
      formatTemplateSuggestionName(candidate)
    )
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean to pass parameters["${expectedDisplayName}"]?`,
    replacement: expectedDisplayName,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / formatTemplateSuggestionName(expectedDisplayName).length
  };
}
function createMissingTemplateParamSuggestion(expectedName, providedNames) {
  const expectedDisplayName = formatTemplateSuggestionName(expectedName);
  const nearest = providedNames.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(expectedDisplayName, formatTemplateSuggestionName(candidate))
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean xsl:with-param name="${expectedDisplayName}"?`,
    replacement: expectedDisplayName,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / expectedDisplayName.length
  };
}
function asXdmNode(item) {
  return typeof item === "object" && item !== null && item.xdmKind === "node" ? item : void 0;
}
function createTemplateFrame2(template) {
  if (template.matchText !== void 0) {
    return {
      kind: "template",
      label: `match="${template.matchText}"`,
      ...template.location === void 0 ? {} : { location: template.location }
    };
  }
  if (template.name !== void 0) {
    return {
      kind: "template",
      label: `name="${template.name}"`,
      ...template.location === void 0 ? {} : { location: template.location }
    };
  }
  return {
    kind: "template",
    label: "<anonymous>",
    ...template.location === void 0 ? {} : { location: template.location }
  };
}
function createInstructionFrame(label, location) {
  return {
    kind: "instruction",
    label,
    ...location === void 0 ? {} : { location }
  };
}
function createApplyTemplatesNodeSequenceError(items, location) {
  return new XsltError(
    XPTY0004,
    "xsl:apply-templates requires a sequence of nodes.",
    location,
    {
      expectedType: "node()*",
      actualType: describeItemsType2(items)
    },
    {
      suggestions: [{
        kind: "fix",
        label: "use a node-selecting expression for xsl:apply-templates",
        confidence: 1
      }]
    }
  );
}
function describeItemsType2(items) {
  if (items.length === 0) {
    return "empty-sequence()";
  }
  if (items.length === 1) {
    return describeItemType2(items[0]);
  }
  const uniqueTypes = [...new Set(items.map((item) => describeItemType2(item)))];
  return `sequence(${items.length}) of ${uniqueTypes.join(" | ")}`;
}
function describeItemType2(item) {
  if (item.xdmKind === "node") {
    return "node()";
  }
  if (item.xdmKind === "map") {
    return "map(*)";
  }
  if (item.xdmKind === "array") {
    return "array(*)";
  }
  return item.type;
}
function createRelatedLocation(label, location) {
  return location === void 0 ? void 0 : { label, location };
}
function escapeText(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

// src/runtime/index.ts
function createCompiledDocument(sourceXml) {
  return parseXml(sourceXml, { role: "source-document", sourceName: "<source-xml>" });
}
function createTemporaryTreeNode(serializedContent) {
  const temporaryDocument = parseXml(`<temporary-root>${serializedContent}</temporary-root>`);
  const fragment = temporaryDocument.createDocumentFragment();
  const wrapper = temporaryDocument.documentElement;
  if (wrapper === null) {
    return fragment;
  }
  while (wrapper.firstChild !== null) {
    fragment.appendChild(wrapper.firstChild);
  }
  return fragment;
}
function selectSimplePathNode(startNode, path) {
  let current = startNode;
  for (const segment of path) {
    const next = findChildElement(current, segment);
    if (next === null) {
      return null;
    }
    current = next;
  }
  return current;
}
function selectSimplePathNodes(startNode, path) {
  let currentNodes = [startNode];
  for (const segment of path) {
    const nextNodes = [];
    for (const currentNode of currentNodes) {
      for (let index = 0; index < currentNode.childNodes.length; index += 1) {
        const child = currentNode.childNodes.item(index);
        if (child === null || child.nodeType !== child.ELEMENT_NODE) {
          continue;
        }
        const childLocalName = child.localName ?? child.nodeName;
        if ((segment === "*" || childLocalName === segment) && (child.namespaceURI ?? "") === "") {
          nextNodes.push(child);
        }
      }
    }
    if (nextNodes.length === 0) {
      return [];
    }
    currentNodes = nextNodes;
  }
  return currentNodes;
}
function selectSimplePathNodesByStepPlan(startNode, path) {
  let currentNodes = [startNode];
  for (const step of path) {
    const nextNodes = [];
    for (const currentNode of currentNodes) {
      const matchingChildren = [];
      for (let index = 0; index < currentNode.childNodes.length; index += 1) {
        const child = currentNode.childNodes.item(index);
        if (child === null || child.nodeType !== child.ELEMENT_NODE) {
          continue;
        }
        const childLocalName = child.localName ?? child.nodeName;
        if ((step.name === "*" || childLocalName === step.name) && (child.namespaceURI ?? "") === "") {
          matchingChildren.push(child);
        }
      }
      if (!hasSimplePathStepPositionConstraints(step)) {
        nextNodes.push(...matchingChildren);
        continue;
      }
      nextNodes.push(
        ...matchingChildren.filter((_, index) => matchesSimplePathStepPositionPlan(step, index + 1, matchingChildren.length))
      );
    }
    if (nextNodes.length === 0) {
      return [];
    }
    currentNodes = nextNodes;
  }
  return currentNodes;
}
function hasSimplePathStepPositionConstraints(plan) {
  return plan.position !== void 0 || plan.positionTotalDivisor !== void 0 || plan.positionTotalNumerator !== void 0 || plan.positionTotalOffset !== void 0 || plan.positionTotalPolynomialDenominator !== void 0 || plan.positionTotalPolynomialQuadraticNumerator !== void 0 || plan.positionTotalPolynomialLinearNumerator !== void 0 || plan.positionTotalPolynomialConstantNumerator !== void 0 || plan.excludedPositionTotalDivisors !== void 0 || plan.excludedPositionTotalDivisorOffsets !== void 0 || plan.excludedPositionTotalFractions !== void 0 || plan.excludedPositionTotalPolynomials !== void 0 || plan.maximumPositionExclusiveTotalDivisors !== void 0 || plan.maximumPositionExclusiveTotalDivisorOffsets !== void 0 || plan.maximumPositionExclusiveTotalFractions !== void 0 || plan.maximumPositionExclusiveTotalPolynomials !== void 0 || plan.maximumPositionInclusiveTotalDivisors !== void 0 || plan.maximumPositionInclusiveTotalDivisorOffsets !== void 0 || plan.maximumPositionInclusiveTotalFractions !== void 0 || plan.maximumPositionInclusiveTotalPolynomials !== void 0 || plan.minimumPositionExclusiveTotalDivisors !== void 0 || plan.minimumPositionExclusiveTotalDivisorOffsets !== void 0 || plan.minimumPositionExclusiveTotalFractions !== void 0 || plan.minimumPositionExclusiveTotalPolynomials !== void 0 || plan.minimumPositionInclusiveTotalDivisors !== void 0 || plan.minimumPositionInclusiveTotalDivisorOffsets !== void 0 || plan.minimumPositionInclusiveTotalFractions !== void 0 || plan.minimumPositionInclusiveTotalPolynomials !== void 0 || plan.positionFromLastOffset !== void 0 || plan.includedPositions !== void 0 || plan.includedPositionFromLastOffsets !== void 0 || plan.maximumPositionFromLastOffset !== void 0 || plan.minimumPosition !== void 0 || plan.maximumPosition !== void 0 || plan.excludedPosition !== void 0 || plan.excludedPositions !== void 0 || plan.positionModuloDivisor !== void 0 || plan.positionModuloRemainder !== void 0 || plan.alternatives !== void 0;
}
function matchesSimplePathStepPositionPlan(plan, position, totalPositions) {
  if (plan.alternatives !== void 0) {
    return plan.alternatives.some((alternative) => matchesSimplePathStepPositionPlan(alternative, position, totalPositions));
  }
  const maximumPosition = Math.min(
    plan.maximumPosition ?? totalPositions,
    plan.maximumPositionFromLastOffset === void 0 ? totalPositions : totalPositions - plan.maximumPositionFromLastOffset
  );
  const matchesExactPosition = plan.position === void 0 ? true : plan.position === "last" ? position === totalPositions : position === plan.position;
  const positionTotalNumerator = plan.positionTotalNumerator ?? (plan.positionTotalDivisor === void 0 ? void 0 : 1);
  const matchesPositionTotalDivisor = plan.positionTotalDivisor === void 0 ? true : positionTotalNumerator !== void 0 && position * plan.positionTotalDivisor === totalPositions * positionTotalNumerator + (plan.positionTotalOffset ?? 0) * plan.positionTotalDivisor;
  const matchesPositionTotalPolynomial = plan.positionTotalPolynomialDenominator === void 0 ? true : position * plan.positionTotalPolynomialDenominator === totalPositions * totalPositions * (plan.positionTotalPolynomialQuadraticNumerator ?? 0) + totalPositions * (plan.positionTotalPolynomialLinearNumerator ?? 0) + (plan.positionTotalPolynomialConstantNumerator ?? 0);
  const matchesPositionFromLastOffset = plan.positionFromLastOffset === void 0 ? true : position === totalPositions - plan.positionFromLastOffset;
  const matchesIncludedPositions = plan.includedPositions === void 0 && plan.includedPositionFromLastOffsets === void 0 ? true : (plan.includedPositions?.includes(position) ?? false) || (plan.includedPositionFromLastOffsets?.some((offset) => position === totalPositions - offset) ?? false);
  const matchesExcludedPositionTotalDivisors = !(plan.excludedPositionTotalDivisors?.some(
    (divisor) => position * divisor === totalPositions
  ) ?? false);
  const matchesExcludedPositionTotalDivisorOffsets = !(plan.excludedPositionTotalDivisorOffsets?.some(
    ({ divisor, offset }) => position * divisor === totalPositions + offset * divisor
  ) ?? false);
  const matchesExcludedPositionTotalFractions = !(plan.excludedPositionTotalFractions?.some(
    ({ denominator, numerator, offset }) => position * denominator === totalPositions * numerator + offset * denominator
  ) ?? false);
  const matchesExcludedPositionTotalPolynomials = !(plan.excludedPositionTotalPolynomials?.some(
    ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) => position * denominator === totalPositions * totalPositions * quadraticNumerator + totalPositions * linearNumerator + constantNumerator
  ) ?? false);
  const matchesMaximumPositionExclusiveTotalDivisors = plan.maximumPositionExclusiveTotalDivisors?.every(
    (divisor) => position * divisor < totalPositions
  ) ?? true;
  const matchesMaximumPositionExclusiveTotalDivisorOffsets = plan.maximumPositionExclusiveTotalDivisorOffsets?.every(
    ({ divisor, offset }) => position * divisor < totalPositions + offset * divisor
  ) ?? true;
  const matchesMaximumPositionExclusiveTotalFractions = plan.maximumPositionExclusiveTotalFractions?.every(
    ({ denominator, numerator, offset }) => position * denominator < totalPositions * numerator + offset * denominator
  ) ?? true;
  const matchesMaximumPositionExclusiveTotalPolynomials = plan.maximumPositionExclusiveTotalPolynomials?.every(
    ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) => position * denominator < totalPositions * totalPositions * quadraticNumerator + totalPositions * linearNumerator + constantNumerator
  ) ?? true;
  const matchesMaximumPositionInclusiveTotalDivisors = plan.maximumPositionInclusiveTotalDivisors?.every(
    (divisor) => position * divisor <= totalPositions
  ) ?? true;
  const matchesMaximumPositionInclusiveTotalDivisorOffsets = plan.maximumPositionInclusiveTotalDivisorOffsets?.every(
    ({ divisor, offset }) => position * divisor <= totalPositions + offset * divisor
  ) ?? true;
  const matchesMaximumPositionInclusiveTotalFractions = plan.maximumPositionInclusiveTotalFractions?.every(
    ({ denominator, numerator, offset }) => position * denominator <= totalPositions * numerator + offset * denominator
  ) ?? true;
  const matchesMaximumPositionInclusiveTotalPolynomials = plan.maximumPositionInclusiveTotalPolynomials?.every(
    ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) => position * denominator <= totalPositions * totalPositions * quadraticNumerator + totalPositions * linearNumerator + constantNumerator
  ) ?? true;
  const matchesMinimumPositionExclusiveTotalDivisors = plan.minimumPositionExclusiveTotalDivisors?.every(
    (divisor) => position * divisor > totalPositions
  ) ?? true;
  const matchesMinimumPositionExclusiveTotalDivisorOffsets = plan.minimumPositionExclusiveTotalDivisorOffsets?.every(
    ({ divisor, offset }) => position * divisor > totalPositions + offset * divisor
  ) ?? true;
  const matchesMinimumPositionExclusiveTotalFractions = plan.minimumPositionExclusiveTotalFractions?.every(
    ({ denominator, numerator, offset }) => position * denominator > totalPositions * numerator + offset * denominator
  ) ?? true;
  const matchesMinimumPositionExclusiveTotalPolynomials = plan.minimumPositionExclusiveTotalPolynomials?.every(
    ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) => position * denominator > totalPositions * totalPositions * quadraticNumerator + totalPositions * linearNumerator + constantNumerator
  ) ?? true;
  const matchesMinimumPositionInclusiveTotalDivisors = plan.minimumPositionInclusiveTotalDivisors?.every(
    (divisor) => position * divisor >= totalPositions
  ) ?? true;
  const matchesMinimumPositionInclusiveTotalDivisorOffsets = plan.minimumPositionInclusiveTotalDivisorOffsets?.every(
    ({ divisor, offset }) => position * divisor >= totalPositions + offset * divisor
  ) ?? true;
  const matchesMinimumPositionInclusiveTotalFractions = plan.minimumPositionInclusiveTotalFractions?.every(
    ({ denominator, numerator, offset }) => position * denominator >= totalPositions * numerator + offset * denominator
  ) ?? true;
  const matchesMinimumPositionInclusiveTotalPolynomials = plan.minimumPositionInclusiveTotalPolynomials?.every(
    ({ denominator, quadraticNumerator, linearNumerator, constantNumerator }) => position * denominator >= totalPositions * totalPositions * quadraticNumerator + totalPositions * linearNumerator + constantNumerator
  ) ?? true;
  const matchesModulo = plan.positionModuloDivisor === void 0 || plan.positionModuloRemainder === void 0 ? true : position % plan.positionModuloDivisor === plan.positionModuloRemainder;
  return matchesExactPosition && matchesPositionTotalDivisor && matchesPositionTotalPolynomial && matchesPositionFromLastOffset && position >= (plan.minimumPosition ?? 1) && position <= maximumPosition && matchesIncludedPositions && matchesExcludedPositionTotalDivisors && matchesExcludedPositionTotalDivisorOffsets && matchesExcludedPositionTotalFractions && matchesExcludedPositionTotalPolynomials && matchesMaximumPositionExclusiveTotalDivisors && matchesMaximumPositionExclusiveTotalDivisorOffsets && matchesMaximumPositionExclusiveTotalFractions && matchesMaximumPositionExclusiveTotalPolynomials && matchesMaximumPositionInclusiveTotalDivisors && matchesMaximumPositionInclusiveTotalDivisorOffsets && matchesMaximumPositionInclusiveTotalFractions && matchesMaximumPositionInclusiveTotalPolynomials && matchesMinimumPositionExclusiveTotalDivisors && matchesMinimumPositionExclusiveTotalDivisorOffsets && matchesMinimumPositionExclusiveTotalFractions && matchesMinimumPositionExclusiveTotalPolynomials && matchesMinimumPositionInclusiveTotalDivisors && matchesMinimumPositionInclusiveTotalDivisorOffsets && matchesMinimumPositionInclusiveTotalFractions && matchesMinimumPositionInclusiveTotalPolynomials && position !== plan.excludedPosition && !(plan.excludedPositions?.includes(position) ?? false) && matchesModulo;
}
function selectDescendantElementsByName(startNode, localName) {
  const matches = [];
  collectDescendantElementsByName(startNode, localName, matches);
  return matches;
}
function selectDescendantElementTextByName(startNode, localName) {
  const node = selectDescendantElementsByName(startNode, localName)[0];
  if (node === void 0) {
    return "";
  }
  return collectStringValue(node);
}
function matchesTemplatePath(node, path, absolute = false) {
  let current = node;
  for (let index = path.length - 1; index >= 0; index -= 1) {
    if (current === null || current.nodeType !== current.ELEMENT_NODE) {
      return false;
    }
    const segment = path[index];
    const currentLocalName = current.localName ?? current.nodeName;
    if (segment !== "*" && (currentLocalName !== segment || (current.namespaceURI ?? "") !== "")) {
      return false;
    }
    current = current.parentNode;
  }
  return !absolute || current?.nodeType === node.DOCUMENT_NODE;
}
function applyBuiltInTemplatesByPath(startNode, path, renderMatchedNode, absolute = false) {
  if (path.length === 0) {
    return "";
  }
  return renderBuiltInTemplateChildren(startNode, path, renderMatchedNode, absolute);
}
function selectSimplePathText(startNode, path) {
  const node = selectSimplePathNode(startNode, path);
  if (node === null) {
    return "";
  }
  return collectStringValue(node);
}
function selectSimplePathExists(startNode, path) {
  return selectSimplePathNode(startNode, path) !== null;
}
function stringValueOfNode(node) {
  return collectStringValue(node);
}
function stringValueOfNativeValue(value) {
  if (value === null || value === void 0) {
    return "";
  }
  if (typeof value === "object" && "nodeType" in value) {
    return stringValueOfNode(value);
  }
  return String(value);
}
function nameOfNode(node) {
  if (node === null || node.nodeType === node.DOCUMENT_NODE) {
    return "";
  }
  return node.nodeName ?? "";
}
function localNameOfNode(node) {
  if (node === null || node.nodeType === node.DOCUMENT_NODE) {
    return "";
  }
  return node.localName ?? node.nodeName ?? "";
}
function escapeText2(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function throwCircularNativeGlobalBinding(bindingKind, variableName, location) {
  throw new XsltError(
    XTDE0640,
    `Circular top-level ${bindingKind} dependency involving $${variableName}.`,
    location,
    { variableName }
  );
}
function throwMissingNativeStylesheetParameter(parameterName, providedNames = [], location) {
  const suggestion = createMissingStylesheetParameterSuggestion2(parameterName, providedNames);
  throw new XsltError(
    XTDE0050,
    `Required stylesheet parameter $${parameterName} was not supplied.`,
    location,
    { parameterName },
    suggestion === void 0 ? void 0 : { suggestions: [suggestion] }
  );
}
function throwMissingNativeTemplateParameter(parameterName, providedNames = [], location) {
  const suggestion = createMissingTemplateParameterSuggestion(parameterName, providedNames);
  throw new XsltError(
    XTDE0700,
    `Required template parameter $${parameterName} was not supplied.`,
    location,
    { parameterName },
    suggestion === void 0 ? void 0 : { suggestions: [suggestion] }
  );
}
function throwUnsupportedNativeInitialMode(mode) {
  throw new XsltError(
    XTDE0040,
    "Initial modes are not yet implemented in the current MVP+3 slice.",
    void 0,
    { mode },
    {
      suggestions: [{
        kind: "fix",
        label: "omit initialMode and use the default mode in the current MVP+3 slice",
        confidence: 1
      }]
    }
  );
}
function prependNativeInitialTemplateError(error, templateName, location) {
  if (!(error instanceof XdmError)) {
    return error;
  }
  const frame = {
    kind: "template",
    label: `name="${templateName}"`,
    ...location === void 0 ? {} : { location }
  };
  const related = location === void 0 ? void 0 : {
    label: "initial template",
    location
  };
  return new XsltError(
    error.code,
    error.detailMessage,
    error.location,
    error.details,
    {
      related: related === void 0 ? error.related : [related, ...error.related],
      frames: [frame, ...error.frames],
      suggestions: error.suggestions,
      causes: error.causes.length === 0 ? [error] : error.causes
    }
  );
}
function createMissingStylesheetParameterSuggestion2(expectedName, providedNames) {
  const nearest = providedNames.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(expectedName, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean to pass parameters["${expectedName}"]?`,
    replacement: expectedName,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / expectedName.length
  };
}
function createMissingTemplateParameterSuggestion(expectedName, providedNames) {
  const nearest = providedNames.map((candidate) => ({
    candidate,
    distance: computeLevenshteinDistance(expectedName, candidate)
  })).sort((left, right) => left.distance - right.distance)[0];
  if (nearest === void 0 || nearest.distance > 2) {
    return void 0;
  }
  return {
    kind: "fix",
    label: `did you mean xsl:with-param name="${expectedName}"?`,
    replacement: expectedName,
    confidence: nearest.distance === 0 ? 1 : 1 - nearest.distance / expectedName.length
  };
}
function prependNativeGlobalBindingError(error, bindingKind, variableName, selectText, location) {
  if (!(error instanceof XdmError)) {
    return error;
  }
  const frame = {
    kind: "instruction",
    label: selectText === void 0 ? `xsl:${bindingKind} name="${variableName}"` : `xsl:${bindingKind} name="${variableName}" select="${selectText}"`,
    ...location === void 0 ? {} : { location }
  };
  const related = location === void 0 ? void 0 : {
    label: `top-level ${bindingKind}`,
    location
  };
  return new XsltError(
    error.code,
    error.detailMessage,
    error.location,
    error.details,
    {
      related: related === void 0 ? error.related : [related, ...error.related],
      frames: [frame, ...error.frames],
      suggestions: error.suggestions,
      causes: error.causes.length === 0 ? [error] : error.causes
    }
  );
}
function findChildElement(node, localName) {
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child === null || child.nodeType !== child.ELEMENT_NODE) {
      continue;
    }
    const childLocalName = child.localName ?? child.nodeName;
    if (childLocalName === localName && (child.namespaceURI ?? "") === "") {
      return child;
    }
  }
  return null;
}
function collectDescendantElementsByName(node, localName, matches) {
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child === null || child.nodeType !== child.ELEMENT_NODE) {
      continue;
    }
    const childLocalName = child.localName ?? child.nodeName;
    if (childLocalName === localName && (child.namespaceURI ?? "") === "") {
      matches.push(child);
    }
    collectDescendantElementsByName(child, localName, matches);
  }
}
function renderBuiltInTemplateChildren(node, path, renderMatchedNode, absolute) {
  const childNodes = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child !== null) {
      childNodes.push(child);
    }
  }
  let output = "";
  for (const [index, child] of childNodes.entries()) {
    if (child.nodeType !== child.ELEMENT_NODE) {
      if (child !== null) {
        output += renderBuiltInTemplateNode(child, path, renderMatchedNode, absolute, index, childNodes);
      }
      continue;
    }
    output += renderBuiltInTemplateNode(child, path, renderMatchedNode, absolute, index, childNodes);
  }
  return output;
}
function renderBuiltInTemplateNode(node, path, renderMatchedNode, absolute, index, nodes) {
  if (matchesSimplePath(node, path, absolute)) {
    return renderMatchedNode(node, index, nodes);
  }
  if (node.nodeType === node.DOCUMENT_NODE || node.nodeType === node.ELEMENT_NODE) {
    return renderBuiltInTemplateChildren(node, path, renderMatchedNode, absolute);
  }
  if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE || node.nodeType === node.ATTRIBUTE_NODE) {
    return escapeText2(node.nodeValue ?? "");
  }
  return "";
}
function matchesSimplePath(node, path, absolute) {
  let current = node;
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const segment = path[index];
    if (segment === void 0 || !isUnqualifiedElementNamed(current, segment)) {
      return false;
    }
    current = current?.parentNode ?? null;
  }
  return !absolute || current?.nodeType === current?.DOCUMENT_NODE;
}
function isUnqualifiedElementNamed(node, localName) {
  if (node === null || node.nodeType !== node.ELEMENT_NODE) {
    return false;
  }
  const nodeLocalName = node.localName ?? node.nodeName;
  return nodeLocalName === localName && (node.namespaceURI ?? "") === "";
}
function collectStringValue(node) {
  if (node.nodeType === node.TEXT_NODE || node.nodeType === node.CDATA_SECTION_NODE || node.nodeType === node.ATTRIBUTE_NODE) {
    return node.nodeValue ?? "";
  }
  let value = "";
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child !== null) {
      value += collectStringValue(child);
    }
  }
  return value;
}

// src/processor/XsltProcessor.ts
var XsltProcessor = class _XsltProcessor {
  stylesheetSource;
  stylesheetSourceName;
  compiledStylesheet;
  constructor(stylesheetSource, options = {}) {
    this.stylesheetSource = stylesheetSource;
    this.stylesheetSourceName = options.sourceName;
  }
  static fromIr(stylesheetSource, ir, options = {}) {
    const processor = new _XsltProcessor(stylesheetSource, options);
    processor.compiledStylesheet = {
      ir,
      nativePlan: tryCreateNativeTransformPlan(ir, options.sourceName)
    };
    return processor;
  }
  /**
   * Transform an XML source document using the compiled stylesheet.
   *
   * @param _sourceXml - Serialized XML source document.
   * @param _options - Optional transform parameters.
   */
  transform(_sourceXml, _options = {}) {
    const compiledStylesheet = this.getCompiledStylesheet();
    validateInitialModeOption(_options);
    validateInitialTemplateOption(_options, compiledStylesheet.ir);
    const executionInfo = this.resolveExecution(_options, compiledStylesheet.nativePlan, compiledStylesheet.ir);
    const result = executionInfo?.resolved === "native" && compiledStylesheet.nativePlan !== void 0 ? executeNativeTransformPlan(compiledStylesheet.nativePlan, _sourceXml, _options) : runTransform(compiledStylesheet.ir, _sourceXml, _options);
    return executionInfo === void 0 ? result : {
      ...result,
      execution: executionInfo
    };
  }
  getCompiledStylesheet() {
    if (this.compiledStylesheet !== void 0) {
      return this.compiledStylesheet;
    }
    if (this.stylesheetSource.length === 0) {
      throw new XsltError(
        XTSE0010,
        "Stylesheet source is empty.",
        void 0,
        void 0,
        {
          suggestions: [{
            kind: "fix",
            label: "provide an xsl:stylesheet or xsl:transform document before running the transform",
            confidence: 1
          }]
        }
      );
    }
    const ir = compileStylesheet(
      this.stylesheetSource,
      this.stylesheetSourceName === void 0 ? void 0 : { sourceName: this.stylesheetSourceName }
    );
    this.compiledStylesheet = {
      ir,
      nativePlan: tryCreateNativeTransformPlan(ir, this.stylesheetSourceName)
    };
    return this.compiledStylesheet;
  }
  resolveExecution(options, nativePlan, ir) {
    const requested = options.execution;
    if (requested === void 0) {
      return void 0;
    }
    if (requested === "interpreter") {
      return {
        requested,
        resolved: "interpreter"
      };
    }
    if (nativePlan !== void 0 && this.supportsNativeExecution(options, nativePlan, ir)) {
      return {
        requested,
        resolved: "native"
      };
    }
    const fallbackReason = createExecutionFallbackReason(
      "unsupported_stylesheet",
      "The current stylesheet is outside the native-supported slice for M6.25.",
      [
        {
          kind: "fix",
          label: 'retry with execution="native" to get a hard unsupported-native error while simplifying the stylesheet',
          confidence: 1
        },
        {
          kind: "hint",
          label: "simplify the select/match shape toward the documented native slice if you want to stay on the native path",
          confidence: 0.9
        }
      ]
    );
    if (requested === "native") {
      throw new XsltError(
        WEAVER_XSLT_NATIVE_UNSUPPORTED,
        "Requested native execution is not available for this transform.",
        void 0,
        {
          requestedExecution: requested,
          fallbackCode: fallbackReason.code
        },
        {
          suggestions: [
            {
              kind: "fix",
              label: 'use execution="auto" to allow interpreter fallback while the native surface is still landing',
              confidence: 1
            },
            {
              kind: "fix",
              label: 'use execution="interpreter" to stay on the stable runtime path',
              confidence: 0.9
            }
          ]
        }
      );
    }
    return {
      requested,
      resolved: "interpreter",
      fallbackReason
    };
  }
  supportsNativeExecution(options, nativePlan, ir) {
    if (options.initialMode !== void 0) {
      return false;
    }
    if (nativePlan.initialTemplateName === void 0) {
      return options.initialTemplate === void 0;
    }
    if (options.initialTemplate === void 0) {
      return nativePlan.initialTemplateEntryTemplate !== void 0;
    }
    const normalizedInitialTemplate = normalizeTemplateName(options.initialTemplate, {
      namespaces: new Map(Object.entries(ir.namespaces)),
      defaultElementNamespace: ir.defaultElementNamespace,
      ...options.baseUri === void 0 ? {} : { baseUri: options.baseUri }
    });
    return normalizedInitialTemplate === nativePlan.initialTemplateName;
  }
};
function validateInitialTemplateOption(options, ir) {
  if (options.initialTemplate === void 0) {
    return;
  }
  const normalizedName = normalizeTemplateName(options.initialTemplate, {
    namespaces: new Map(Object.entries(ir.namespaces)),
    defaultElementNamespace: ir.defaultElementNamespace,
    ...options.baseUri === void 0 ? {} : { baseUri: options.baseUri }
  });
  const template = findNamedTemplate(normalizedName, ir.templates);
  if (template !== void 0) {
    return;
  }
  const suggestion = createInitialTemplateSuggestion(options.initialTemplate, ir.templates);
  throw new XsltError(
    XTSE0010,
    `Initial template ${options.initialTemplate} is not declared in the current stylesheet.`,
    void 0,
    { initialTemplate: options.initialTemplate },
    suggestion === void 0 ? {
      suggestions: [{
        kind: "fix",
        label: `declare xsl:template name="${options.initialTemplate}" or omit initialTemplate`,
        confidence: 1
      }]
    } : { suggestions: [suggestion] }
  );
}
function validateInitialModeOption(options) {
  if (options.initialMode === void 0) {
    return;
  }
  throwUnsupportedNativeInitialMode(options.initialMode);
}
function executeNativeTransformPlan(plan, sourceXml, context) {
  const useInitialTemplateEntry = context.initialTemplate !== void 0 && plan.initialTemplateName !== void 0;
  const activeEntryTemplate = useInitialTemplateEntry && plan.initialTemplateEntryTemplate !== void 0 ? plan.initialTemplateEntryTemplate : plan.entryTemplate;
  const activeCurrentNodeExpression = useInitialTemplateEntry && plan.initialTemplateCurrentNodeExpression !== void 0 ? plan.initialTemplateCurrentNodeExpression : plan.currentNodeExpression;
  const activeCurrentNodeMayBeNull = useInitialTemplateEntry && plan.initialTemplateCurrentNodeMayBeNull !== void 0 ? plan.initialTemplateCurrentNodeMayBeNull : plan.currentNodeMayBeNull;
  const activeNeedsCurrentNodeBinding = useInitialTemplateEntry && plan.initialTemplateNeedsCurrentNodeBinding !== void 0 ? plan.initialTemplateNeedsCurrentNodeBinding : plan.needsCurrentNodeBinding;
  const activeSetupStatements = useInitialTemplateEntry && plan.initialTemplateSetupStatements !== void 0 ? plan.initialTemplateSetupStatements : plan.setupStatements;
  const activeOutputExpression = useInitialTemplateEntry && plan.initialTemplateOutputExpression !== void 0 ? plan.initialTemplateOutputExpression : plan.outputExpression;
  const activeInitialTemplateName = useInitialTemplateEntry ? plan.initialTemplateName : void 0;
  const helperBindings = plan.runtimeHelpers.length === 0 ? "" : `const { ${plan.runtimeHelpers.join(", ")} } = helpers;`;
  const nativeBodyStatements = [
    ...activeSetupStatements.length === 0 ? ["void ctx;"] : [],
    ...plan.needsDocumentBinding ? ["const document = createCompiledDocument(sourceXml);"] : ["createCompiledDocument(sourceXml);"],
    ...activeSetupStatements,
    ...activeNeedsCurrentNodeBinding ? [`const currentNode = ${activeCurrentNodeExpression.code};`] : [],
    ...activeCurrentNodeMayBeNull ? [
      "if (currentNode === null) {",
      '  return { output: "" };',
      "}"
    ] : [],
    "return {",
    `  output: ${activeOutputExpression.code},`,
    "};"
  ];
  const wrappedBodyStatements = activeInitialTemplateName === void 0 ? nativeBodyStatements : [
    "try {",
    ...nativeBodyStatements.map((statement) => `  ${statement}`),
    "} catch (error) {",
    `  throw prependNativeInitialTemplateError(error, ${JSON.stringify(activeInitialTemplateName)}, ${JSON.stringify(activeEntryTemplate.location)});`,
    "}"
  ];
  const executeNative = new Function(
    "sourceXml",
    "ctx",
    "helpers",
    [
      '"use strict";',
      helperBindings,
      ...wrappedBodyStatements
    ].filter((statement) => statement.length > 0).join("\n")
  );
  return executeNative(sourceXml, context, NATIVE_RUNTIME_HELPERS);
}
function createExecutionFallbackReason(code, message, suggestions) {
  return suggestions === void 0 ? { code, message } : { code, message, suggestions };
}
var NATIVE_RUNTIME_HELPERS = {
  applyBuiltInTemplatesByPath,
  createCompiledDocument,
  createTemporaryTreeNode,
  escapeText: escapeText2,
  localNameOfNode,
  matchesTemplatePath,
  selectDescendantElementTextByName,
  nameOfNode,
  selectDescendantElementsByName,
  selectSimplePathExists,
  selectSimplePathNode,
  selectSimplePathNodesByStepPlan,
  selectSimplePathNodes,
  selectSimplePathText,
  stringValueOfNativeValue,
  stringValueOfNode,
  prependNativeGlobalBindingError,
  prependNativeInitialTemplateError,
  throwCircularNativeGlobalBinding,
  throwMissingNativeStylesheetParameter,
  throwMissingNativeTemplateParameter
};

// src/workbench.ts
var CompiledStylesheet = class _CompiledStylesheet {
  stylesheet;
  diagnostics;
  generatedTs;
  sourceMap;
  processor;
  constructor(stylesheet, diagnostics, processor, generatedTs, sourceMap) {
    this.stylesheet = stylesheet;
    this.diagnostics = diagnostics;
    this.processor = processor;
    if (generatedTs !== void 0) {
      this.generatedTs = generatedTs;
    }
    if (sourceMap !== void 0) {
      this.sourceMap = sourceMap;
    }
  }
  static create(stylesheet, diagnostics, processor, generatedTs, sourceMap) {
    return new _CompiledStylesheet(
      stylesheet,
      diagnostics,
      processor,
      generatedTs,
      sourceMap
    );
  }
  transform(sourceXml, options) {
    try {
      const result = this.processor.transform(sourceXml.text, options ?? {});
      const notices = createFallbackNotices(result.execution);
      return {
        ok: true,
        diagnostics: this.diagnostics,
        output: result.output,
        ...result.execution === void 0 ? {} : { execution: result.execution },
        ...notices.length === 0 ? {} : { notices }
      };
    } catch (error) {
      return {
        ok: false,
        diagnostics: sortDiagnostics([...this.diagnostics, diagnosticReportFromError(error)])
      };
    }
  }
};
function compile(request) {
  try {
    const artifacts = compileStylesheetRuntimeArtifacts(request.stylesheet.text, {
      path: request.stylesheet.uri,
      ...request.options?.sampleDocument === void 0 ? {} : { sampleDocument: request.options.sampleDocument.text }
    });
    const processor = XsltProcessor.fromIr(request.stylesheet.text, artifacts.ir, {
      sourceName: request.stylesheet.uri
    });
    const sourceMap = request.options?.emitSourceMap === false ? void 0 : StructuredWeaverSourceMap.create(request.stylesheet, artifacts.module, artifacts.sourceMap);
    return {
      ok: true,
      diagnostics: artifacts.diagnostics,
      stylesheet: CompiledStylesheet.create(
        request.stylesheet,
        artifacts.diagnostics,
        processor,
        request.options?.emitGeneratedTs === false ? void 0 : artifacts.module,
        sourceMap
      ),
      ...request.options?.emitGeneratedTs === false ? {} : { generatedTs: artifacts.module },
      ...sourceMap === void 0 ? {} : { sourceMap }
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [diagnosticReportFromError(error)]
    };
  }
}
function transform(request) {
  return request.stylesheet.transform(request.sourceXml, request.options);
}
function compileAndTransform(request) {
  const compileResult = compile({
    stylesheet: request.stylesheet,
    options: {
      ...request.options?.emitGeneratedTs === void 0 ? {} : { emitGeneratedTs: request.options.emitGeneratedTs },
      ...request.options?.emitSourceMap === void 0 ? {} : { emitSourceMap: request.options.emitSourceMap },
      ...request.options?.sampleDocument === void 0 ? {} : { sampleDocument: request.options.sampleDocument }
    }
  });
  if (!compileResult.ok) {
    return compileResult;
  }
  const transformResult = transform({
    stylesheet: compileResult.stylesheet,
    sourceXml: request.sourceXml,
    options: getTransformOptions(request.options)
  });
  if (!transformResult.ok) {
    return {
      ...transformResult,
      ...compileResult.generatedTs === void 0 ? {} : { generatedTs: compileResult.generatedTs },
      ...compileResult.sourceMap === void 0 ? {} : { sourceMap: compileResult.sourceMap }
    };
  }
  return {
    ...transformResult,
    stylesheet: compileResult.stylesheet,
    ...compileResult.generatedTs === void 0 ? {} : { generatedTs: compileResult.generatedTs },
    ...compileResult.sourceMap === void 0 ? {} : { sourceMap: compileResult.sourceMap }
  };
}
function getTransformOptions(options) {
  if (options === void 0) {
    return {};
  }
  return {
    ...options.initialTemplate === void 0 ? {} : { initialTemplate: options.initialTemplate },
    ...options.initialMode === void 0 ? {} : { initialMode: options.initialMode },
    ...options.execution === void 0 ? {} : { execution: options.execution },
    ...options.parameters === void 0 ? {} : { parameters: options.parameters },
    ...options.baseUri === void 0 ? {} : { baseUri: options.baseUri }
  };
}
function createFallbackNotices(execution) {
  const fallbackReason = execution?.fallbackReason;
  if (execution === void 0 || fallbackReason === void 0) {
    return [];
  }
  return [createFallbackNotice(execution, fallbackReason)];
}
function createFallbackNotice(execution, fallbackReason) {
  return {
    severity: "warning",
    code: "native_fallback",
    message: fallbackReason.message,
    details: [
      { key: "requestedExecution", value: execution.requested },
      { key: "resolvedExecution", value: execution.resolved },
      { key: "fallbackCode", value: fallbackReason.code }
    ],
    ...fallbackReason.suggestions === void 0 ? {} : {
      suggestions: fallbackReason.suggestions.map((suggestion) => ({
        kind: suggestion.kind,
        label: suggestion.label,
        ...suggestion.confidence === void 0 ? {} : { confidence: suggestion.confidence },
        ...suggestion.replacement === void 0 ? {} : { replacement: suggestion.replacement }
      }))
    }
  };
}
var StructuredWeaverSourceMap = class _StructuredWeaverSourceMap {
  raw;
  sourceUri;
  generatedUri;
  sourceLineInfos;
  generatedLineInfos;
  mappings;
  constructor(raw, sourceUri, generatedUri, sourceLineInfos, generatedLineInfos, mappings) {
    this.raw = raw;
    this.sourceUri = sourceUri;
    this.generatedUri = generatedUri;
    this.sourceLineInfos = sourceLineInfos;
    this.generatedLineInfos = generatedLineInfos;
    this.mappings = mappings;
  }
  static create(stylesheet, generatedTs, raw) {
    const payload = JSON.parse(raw);
    return new _StructuredWeaverSourceMap(
      raw,
      stylesheet.uri,
      buildGeneratedUri(stylesheet.uri, payload.file),
      createLineInfos(stylesheet.text),
      createLineInfos(generatedTs),
      parseLineMappings(payload.mappings ?? "")
    );
  }
  mapSourceToGenerated(span) {
    if (span.uri !== void 0 && span.uri !== this.sourceUri) {
      return [];
    }
    const matchedLines = this.mappings.filter((mapping) => overlapsLineRange(span.lineStart, span.lineEnd, mapping.sourceLine, mapping.sourceLine)).map((mapping) => mapping.generatedLine);
    return createMergedLineSpans(this.generatedUri, this.generatedLineInfos, matchedLines);
  }
  mapGeneratedToSource(span) {
    if (span.uri !== void 0 && span.uri !== this.generatedUri) {
      return [];
    }
    const matchedLines = this.mappings.filter((mapping) => overlapsLineRange(span.lineStart, span.lineEnd, mapping.generatedLine, mapping.generatedLine)).map((mapping) => mapping.sourceLine);
    return createMergedLineSpans(this.sourceUri, this.sourceLineInfos, matchedLines);
  }
};
function buildGeneratedUri(sourceUri, sourceMapFileName) {
  if (sourceMapFileName !== void 0 && sourceMapFileName.length > 0) {
    const slashIndex = Math.max(sourceUri.lastIndexOf("/"), sourceUri.lastIndexOf("\\"));
    if (slashIndex >= 0) {
      return `${sourceUri.slice(0, slashIndex + 1)}${sourceMapFileName}`;
    }
  }
  return `${sourceUri}.ts`;
}
function createLineInfos(text) {
  const lines = splitMappedLines(text);
  const infos = [];
  let startOffset = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    infos.push({
      lineNumber: index + 1,
      startOffset,
      endOffset: startOffset + line.length,
      length: line.length
    });
    startOffset += line.length + 1;
  }
  return infos;
}
function splitMappedLines(text) {
  if (text.length === 0) {
    return [""];
  }
  return text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
}
function parseLineMappings(mappingsText) {
  if (mappingsText.length === 0) {
    return [];
  }
  const mappings = [];
  let previousSourceIndex = 0;
  let previousSourceLine = 0;
  let previousSourceColumn = 0;
  const generatedLines = mappingsText.split(";");
  for (let generatedLineIndex = 0; generatedLineIndex < generatedLines.length; generatedLineIndex += 1) {
    const generatedLine = generatedLines[generatedLineIndex] ?? "";
    if (generatedLine.length === 0) {
      continue;
    }
    let previousGeneratedColumn = 0;
    for (const segment of generatedLine.split(",")) {
      if (segment.length === 0) {
        continue;
      }
      const decoded = decodeVlqSegment(segment);
      if (decoded.length < 4) {
        continue;
      }
      previousGeneratedColumn += decoded[0] ?? 0;
      previousSourceIndex += decoded[1] ?? 0;
      previousSourceLine += decoded[2] ?? 0;
      previousSourceColumn += decoded[3] ?? 0;
      if (previousSourceIndex !== 0) {
        continue;
      }
      mappings.push({
        generatedLine: generatedLineIndex + 1,
        sourceLine: previousSourceLine + 1
      });
    }
  }
  return mappings;
}
function decodeVlqSegment(segment) {
  const values = [];
  let value = 0;
  let shift = 0;
  for (const character of segment) {
    const digit = BASE64_VLQ_DIGITS2.indexOf(character);
    if (digit < 0) {
      continue;
    }
    const continuation = (digit & 32) !== 0;
    value += (digit & 31) << shift;
    if (continuation) {
      shift += 5;
      continue;
    }
    const isNegative = (value & 1) === 1;
    values.push(isNegative ? -(value - 1 >> 1) : value >> 1);
    value = 0;
    shift = 0;
  }
  return values;
}
function overlapsLineRange(lineStart, lineEnd, candidateStart, candidateEnd) {
  return lineStart <= candidateEnd && candidateStart <= lineEnd;
}
function createMergedLineSpans(uri, lineInfos, lineNumbers) {
  const uniqueSortedLineNumbers = [...new Set(lineNumbers)].filter((lineNumber) => lineNumber >= 1 && lineNumber <= lineInfos.length).sort((left, right) => left - right);
  if (uniqueSortedLineNumbers.length === 0) {
    return [];
  }
  const spans = [];
  let rangeStart = uniqueSortedLineNumbers[0];
  let previousLine = rangeStart;
  for (let index = 1; index < uniqueSortedLineNumbers.length; index += 1) {
    const lineNumber = uniqueSortedLineNumbers[index];
    if (lineNumber === previousLine + 1) {
      previousLine = lineNumber;
      continue;
    }
    spans.push(createLineRangeSpan(uri, lineInfos, rangeStart, previousLine));
    rangeStart = lineNumber;
    previousLine = lineNumber;
  }
  spans.push(createLineRangeSpan(uri, lineInfos, rangeStart, previousLine));
  return spans;
}
function createLineRangeSpan(uri, lineInfos, lineStart, lineEnd) {
  const start = lineInfos[lineStart - 1];
  const end = lineInfos[lineEnd - 1];
  return {
    uri,
    offsetStart: start.startOffset,
    offsetEnd: end.endOffset,
    lineStart,
    columnStart: 1,
    lineEnd,
    columnEnd: end.length + 1
  };
}
var BASE64_VLQ_DIGITS2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// scripts/workbench-site/worker.ts
self.addEventListener("message", (event) => {
  const request = event.data;
  const result = compileAndTransform({
    stylesheet: request.stylesheet,
    sourceXml: request.sourceXml,
    options: {
      emitGeneratedTs: true,
      execution: "auto"
    }
  });
  const response = {
    requestId: request.requestId,
    ok: result.ok,
    generatedTs: result.generatedTs ?? "",
    output: result.ok ? result.output : "",
    diagnostics: result.diagnostics.map(formatDiagnostic2),
    notices: result.ok ? (result.notices ?? []).map(formatNotice) : [],
    execution: result.ok && result.execution !== void 0 ? `${result.execution.requested} -> ${result.execution.resolved}` : ""
  };
  self.postMessage(response);
});
function formatDiagnostic2(diagnostic) {
  const location = diagnostic.primary === void 0 ? "" : ` (${diagnostic.primary.uri ?? "<memory>"}:${diagnostic.primary.lineStart}:${diagnostic.primary.columnStart})`;
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}${location}`;
}
function formatNotice(notice) {
  return `${notice.severity.toUpperCase()} ${notice.code}: ${notice.message}`;
}
