/**
 * Debugging. Done wrong.
 */
"use strict";

/**
 * Start JS-REPL library.
 *
 * Adapted from js-repl from Daisuke Homma.
 *
 * Modernized and poked for Obsidian by an obsessive girl
 * who probably should be doing other things, but instead
 * is hiding in Obsidian.
 */
const jsrepl = {};

{
  // namespace boundary

  jsrepl.config = {};
  const config = jsrepl.config;

  config.rootElementId = "js-repl";
  config.prompt = ">";
  config.resultPrompt = "↳";
  config.errorPrompt = "⛔️";
  config.warningPrompt = "⚠️";
  config.keyboardPaddingPx = 0;

  config.suggestionLimit = 28;

  config.debug = false;
} // namespace boundary

{
  // namespace boundary

  jsrepl.hyperscript = function (tag, ...args) {
    const elem = handleTag(tag);
    handleArgs(elem, args);

    return elem;
  };

  // utility functions
  const isNull = (val) => val == null;
  const isString = (val) => typeof val === "string";
  const isNumber = (val) => typeof val === "number";
  const isDate = (val) => val instanceof Date;
  const isBoolean = (val) => typeof val === "boolean";
  const isHTMLElement = (val) =>
    val instanceof Node || val instanceof HTMLElement;
  const isObject = (val) => typeof val === "object";
  const toCamel = (str) =>
    str.replace(/-([a-z])/g, (match, p1) => p1.toUpperCase());

  const handleTag = (tag) => {
    if (!isString(tag)) {
      console.error("tag should be a string");
    }

    const [t1, id] = tag.split("#");
    const [t2, ...cls] = t1.split(".");
    const klass = cls.join(" ");

    const t3 = t2 || "div";

    const elem = document.createElement(t3);

    if (id !== undefined) {
      elem.id = id;
    }
    elem.className = klass;

    return elem;
  };

  const handleArgs = (elem, args) => {
    const handleStyle = (style) => {
      for (var prop in style) {
        elem.style[toCamel(prop)] = style[prop];
      }
    };

    const handle = (val) => {
      if (isNull(val)) {
        // children - null
        // do nothing
      } else if (isString(val)) {
        // children - string

        elem.innerText = val;
      } else if (isNumber(val) || isDate(val) || isBoolean(val)) {
        // children - other data

        elem.innerText = val.toString();
      } else if (isHTMLElement(val)) {
        // children - HTMLElement

        elem.appendChild(val);
      } else if (Array.isArray(val)) {
        // children - Array

        val.forEach((v) => elem.appendChild(v));
      } else if (isObject(val)) {
        // Attribute

        for (var prop in val) {
          if (prop == "style") {
            handleStyle(val[prop]);
          } else {
            elem[prop] = val[prop];
          }
        }
      } else {
      }
    };

    args.forEach(handle);
  };
} // namespace boundary

{
  // namespace boundary

  const debug = function (str) {};

  // no debug
  const nebug = function () {};

  jsrepl.debug = debug;
  jsrepl.nebug = nebug;
} // namespace boundary

{
  // namespace boundary

  const history = function () {
    this.history = [];
    this.current = -1;
  };

  jsrepl.history = history;

  history.prototype.push = function (code) {
    jsrepl.nebug("history: push code.");

    if (code == null || code == "" || typeof code === "undefined") {
      return;
    }

    jsrepl.nebug("history: push", this.current, code);

    this.history.push(code);
    this.current = this.history.length - 1;
  };

  history.prototype.previous = function () {
    jsrepl.nebug("history: prev.", this.current);

    if (this.current < 0) {
      return null;
    }

    const ret = this.history[this.current];
    jsrepl.nebug("history: prev", this.current, this.history[this.current]);

    if (this.current != 0) {
      this.current--;
    }

    return ret;
  };

  history.prototype.next = function () {
    jsrepl.nebug("history: next", this.current);

    if (this.current == this.history.length - 1) {
      return null;
    }

    this.current++;
    jsrepl.nebug("history: next", this.current, this.history[this.current]);

    return this.history[this.current];
  };
} // namespace boundary

{
  // namespace boundary

  const h = jsrepl.hyperscript;

  const repl = function (root) {
    this.root = root;
    this.width = root.width;
    this.height = root.height;
    this.container = root.parentElement;

    this.view = null;
    this.logArea = null;
    this.currentArea = null;
    this.prompt = null;
    this.editArea = null;
    this.paddingArea = null;
    this.toolbar = null;

    this.currentLog = null;

    this.history = null;

    this.init();
  };

  jsrepl.repl = repl;

  repl.prototype.init = function () {
    if (app.isMobile) {
      this.createToolbar();
    }
    this.createView();

    this.isClearing = false;

    this.showingLogs = true;
    this.showingWarnings = true;
    this.showingErrors = true;
    this.showingResults = true;
    this.showingUndefineds = false;
    this.activeFilter = null;

    this.lastSuggestionText = null;

    this.history = new jsrepl.history();

    this.editArea.focus();
    this.log = new jsrepl.log(this);
    this.hookConsole();
    this.extendConsole();

    // Subscribe to all error messages.
    window.addEventListener("error", (e) => {
      repl.logError(e.message, e.filename, e.lineno, e.colno, e.error);
      return true;
    });
  };

  repl.format = function (args) {
    let formatString = args[0];
    const formatPattern = RegExp("%[.0]?[0-9]*[oOdisf]");

    // If we can't handle this, pass it through exactly.
    if (formatString.match == undefined) {
      return args;
    }

    // If this looks like it's using printf-style matching,
    // use this as a formatting string.
    // TODO: this heuristic may not be right
    if (formatString.match(formatPattern)) {
      // Search for replacement patterns for each argument.
      for (let i = 1; i < args.length; ++i) {
        let replacement = args[i];
        formatString = formatString.replace(formatPattern, replacement);
      }

      return formatString;
    }
    // Otherwise, this is likely just multiple lines of output.
    // Join them together.
    else {
      let result = args[0];

      // Argument collections don't have `join`. :(
      for (let i = 1; i < args.length; ++i) {
        result += `\n${args[i]}`;
      }

      return result;
    }
  };

  repl.doLogging = function () {
    const elem = h("div.repl-console-log", repl.format(arguments));
    window.repl.logArea.appendChild(elem);
    window.coreLog.apply(window.console, arguments);
  };

  repl.doWarning = function () {
    const resultText = h(
      "div.repl-console-warning-inner",
      repl.format(arguments)
    );

    const elem = h(
      "div.repl-console-warning",
      h("div.repl-console-prompt", jsrepl.config.warningPrompt),
      resultText
    );

    window.repl.logArea.appendChild(elem);
    window.coreWarn.apply(window.console, arguments);
  };

  repl.logErrorInternal = function (message) {
    const resultText = h("div.repl-console-error-inner", message);

    const elem = h(
      "div.repl-console-error",
      h("div.repl-console-prompt", jsrepl.config.errorPrompt),
      resultText
    );

    window.repl.logArea.appendChild(elem);
    window.repl.applyCurrentFiltersTo();
  };

  repl.doError = function () {
    repl.logErrorInternal(repl.format(arguments));
    window.coreError.apply(window.console, arguments);
  };

  repl.logError = function (msg, url, line, column, err) {
    // Capacitor's error messaging doesn't repeat itself,
    // so we'll have to output everything.
    if (app.isMobile) {
      repl.logErrorInternal(
        `${msg} (${url}:${line}:${column})\n\n${err.stack}`
      );
    }
    // Electron, on the other hand, gives us a nice, full message in the stack.
    else {
      repl.logErrorInternal(err.stack);
    }
  };

  repl.prototype.hookConsole = function () {
    if (!window.coreLog) {
      window.coreLog = window.console.log;
      window.coreWarn = window.console.warn;
      window.coreError = window.console.error;
      window.coreOnError = window.onerror;
      window.console.log = repl.doLogging;
      window.console.warn = repl.doWarning;
      window.console.error = repl.doError;
      window.console.info = repl.doLogging;
    }
  };

  repl.prototype.generateErrorForTesting = function () {
    3 + WrOnG;
  };

  //
  // TOOLBAR STUFF
  //

  repl.prototype.createToolbar = function () {
    // Create a button that triggers tab completion on mobile.

    // Create a button that clears tab completion on mobile.
    // Create our toolbar.
    this.toolbar = h(
      "div.repl-toolbar#repl-toolbar",
      {},
      h(
        "a.repl-button#repl-tab-button",
        { onclick: (e) => this.handleTabCompletion(false, true) },
        "➟"
      ),
      h(
        "a.repl-button#repl-clear-tab-button",
        { onclick: (e) => this.clearTabSuggestions() },
        "✖"
      ),
      h("span.repl-spacer"),
      h(
        "a.repl-button.wide",
        {
          onclick: (e) => {
            this.editArea.innerText += ".";
            this.setCaretAtEnd();
          },
        },
        "."
      ),
      h(
        "a.repl-button.wide",
        {
          onclick: (e) => {
            this.editArea.innerText += "[";
            this.setCaretAtEnd();
          },
        },
        "["
      ),
      h(
        "a.repl-button.wide",
        {
          onclick: (e) => {
            this.editArea.innerText += "]";
            this.setCaretAtEnd();
          },
        },
        "]"
      ),
      h(
        "a.repl-button#repl-newline-button",
        {
          onclick: (e) => {
            this.editArea.innerText += "\n";
            this.setCaretAtEnd();
          },
        },
        "↲"
      )
    );

    // Finally, squish it into our DOM.
    this.root.appendChild(this.toolbar);
  };

  //
  // Main UI.
  //
  repl.prototype.getMobileToolbarPadding = function () {
    const toolbarPluginName = "advanced-toolbar";

    if (app.plugins.enabledPlugins.has(toolbarPluginName)) {
      const toolbarPlugin = app.plugins.getPlugin(toolbarPluginName);
      const toolbarAlwaysShown = toolbarPlugin.settings.alwaysShowToolbar;

      if (toolbarAlwaysShown) {
        const numRows = toolbarPlugin.settings.rowCount;
        const rowHeight = toolbarPlugin.settings.rowHeight;
        return numRows * rowHeight;
      }
    }

    return 0;
  };

  repl.prototype.createView = function () {
    this.logArea = h("div.repl-log-area#repl-log-area", {
      style: { width: this.width },
    });

    this.prompt = h("div.repl-prompt#repl-prompt", jsrepl.config.prompt);

    this.editArea = h("div.repl-edit-area#repl-edit-area", {
      contentEditable: true,
      tabindex: "100",
      onkeypress: (e) => this.onEditAreaKeyPress(e),
      onkeydown: (e) => this.onEditAreaKeyDown(e),
      onfocus: (e) => this.onEditAreaFocus(e),
    });

    this.currentArea = h(
      "div#currentArea",
      {
        style: { width: "100%", display: "flex" },
        ontouchstart: (e) => this.onViewTouchStart(e),
      },
      this.prompt,
      this.editArea
    );

    this.paddingArea = h("div#paddingArea", {
      style: { display: "block" },
    });

    // Figure out how to handle bottom spacing to avoid
    // our toolbar.
    let paddingBottom = "";
    if (this.toolbar && !app.isMobile) {
      paddingBottom = "32px";
    } else if (app.isMobile) {
      // On mobile, we'll want to override the root style, rather than
      // the style of the local plugin.
      paddingBottom = this.getMobileToolbarPadding();
      this.root.style.paddingBottom = "42px";
    }

    // HyperScript Notation
    this.view = h(
      "div.repl-viewport#repl-viewport",
      {
        style: {
          width: this.width,
          height: this.height,
          paddingBottom: paddingBottom,
        },
      },
      this.logArea,
      this.currentArea,
      this.paddingArea
    );

    // Add a hook to the body's event listener, so we can detect tabs.
    document.body.addEventListener("keyup", (e) => {
      // Handle TAB presses; which we'll use for our suggestion engine.
      if (e.key == "Tab") {
        if (!e.target) {
          return;
        }

        // If we're targeting the edit area, use this
        // for tab completion.
        if (e.target == this.editArea) {
          this.handleTabCompletion(e.shiftKey);
          return;
        }

        // If we're targeting one of our suggestions,
        // cycle through them.
        if (this.isTabSuggestion(e.target)) {
          this.handleTabSuggestionCycle(e.target, e.shiftKey);
          return;
        }
      }

      // If we get an ESC key, we'll do some special actions.
      if (e.key == "Escape") {
        // If we're targeting the edit area, drop the
        // existing set of tab suggestions.
        if (e.target == this.editArea) {
          this.clearTabSuggestions();
          return;
        }

        // If we're targeting one of our suggestions,
        // drop our presumption of it.
        if (this.isTabSuggestion(e.target)) {
          this.dropPresumption();
          return;
        }
      }

      //
      // If we get a CTRL + L to our EditArea, clear it.
      //
      // I never user this, so at least one person should know how much
      // I love her.~
      //
      if (e.key == "l" && e.ctrlKey && e.target == this.editArea) {
        clear();
        e.preventDefault();
        return;
      }

      // If we're addressing a keypress to a TabSuggestion other
      // than a TAB or ESC, we'll accept the suggestion and pass
      // the event through to our editArea.
      if (this.isTabSuggestion(e.target)) {
        this.acceptPresumption();

        // FIXME: this can't be right
        if (e.key.length == "1") {
          this.editArea.innerText += e.key;
        }

        // Create a synthetic variant of this event, and
        // pass it to the editArea.
        let eventData = {
          key: e.key,
          code: e.code,
          location: e.location,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        };

        let proxyEventDown = new KeyboardEvent("keydown", e);
        let proxyEventUp = new KeyboardEvent("keyup", e);
        this.editArea.dispatchEvent(proxyEventDown);
        this.editArea.dispatchEvent(proxyEventUp);

        this.setCaretAtEnd();
      }

      // Finally, if we're touching our edit area in any other way,
      // this should clear our suggestions.
      if (e.target === this.editArea && this.lastSuggestionText) {
        this.clearTabSuggestions();
      }
    });

    this.root.appendChild(this.view);
  };

  repl.prototype.scrollDown = function () {
    this.root.scrollTo(0, this.root.scrollHeight);
  };

  repl.prototype.processCode = function (code) {
    const log = new jsrepl.log(this);
    this.currentLog = log;

    this.clearTabSuggestions();
    this.applyCurrentFiltersTo();

    log.code(code);
    const [result, isError] = this.evalCode(code);

    // This logic is wrong, but it's quick to write and
    // simulates a thing. Fix it later.
    // I TOLD YOU THIS WAS A HACK
    if (this.isClearing) {
      this.isClearing = false;
    } else {
      if (isError) {
        log.errorResult(result);
      } else {
        log.result(result);
      }
    }

    this.history.push(code);

    this.resetEditArea();
    this.scrollDown();
  };

  repl.prototype.printAsObject = function (obj) {
    return typeof obj === "object";
  };

  repl.prototype.escapeHTML = function (text) {
    return new Option(text).innerHTML;
  };

  repl.prototype.formatArray = function (obj, pathToObject) {
    // Coalesce each piece of the array into a printable form.
    let toPrint = Object.entries(obj).map((pairs) => {
      const [key, value] = pairs;

      if (this.printAsObject(value)) {
        let encodedKey = this.escapeHTML(key);
        let innerJs = `repl.editArea.innerText = '${pathToObject}[${encodedKey}]'; repl.handleEnterKey(); void(0)`;
        return `<a href="javascript: ${innerJs}">${value}</a>`;
      } else {
        return this.escapeHTML(value);
      }
    });

    return `[${toPrint.join(", ")}]`;
  };

  repl.prototype.formatObject = function (obj, pathToObject) {
    // Special cases for null and undefined.
    if (obj === null) {
      return "<em>null</em>";
    } else if (obj === undefined) {
      return "<em>undefined</em>";
    }

    // Special cases for arrays.
    if (obj instanceof Array) {
      return this.formatArray(obj, pathToObject);
    }

    // Otherwise, this is an object.

    let result = "{\n";

    for (const [key, value] of Object.entries(obj)) {
      let innerResult = "";
      let escapedKey = this.escapeHTML(key);
      let escapedValue = this.escapeHTML(value);

      if (this.printAsObject(value)) {
        // FIXME: escape values here and clean this up
        let innerJs = `repl.editArea.innerText = '${pathToObject}.${key}'; repl.handleEnterKey(); void(0)`;
        innerResult = `&nbsp;${escapedKey}: <a href="javascript: ${innerJs}">[...]</a>`;
      } else {
        innerResult = `&nbsp;${escapedKey}: ${escapedValue}\n`;
      }

      result += `<p class="repl-inner-result">${innerResult}</p>`;
    }

    return result + "}";
  };

  /**
   * Converts from a .stack trace string to a nice stack trace.
   */
  repl.prototype.generateStackTrace = function (e) {
    // TODO
    let trace = this.escapeHTML(e.stack);

    // HACK: strip extraneous error messages on Desktop
    if (!app.isMobile) {
      let desktopStripper = /\(eval at repl\.evalCode[\s\S]*/m;
      trace = trace.replace(desktopStripper, "");
      desktopStripper = /\at repl\.evalCode[\s\S]*/m;
      trace = trace.replace(desktopStripper, "");
    }
    // HACK: try to get together a better message on mobile
    else {
      let summary = `${e.name} -- ${e.message}`;
      let context = `(:${e.line}:${e.column})`;
      let mobileStripper = /eval@\[native code\]\s*@\s*@\s*@\s*@[\s\S]*/m;
      trace = trace.replace(mobileStripper, "");

      if (trace) {
        trace = `${summary} ${context}\n${trace}`;
      } else {
        trace = summary;
      }
    }

    return trace.replace("\n", "<br/>");
  };

  /**
   * Removes "corrections" mobile phones like to make, to make
   * for a slightly more usable console.
   */
  repl.prototype.demangleCode = function (code) {
    code = code.replace(/\u2018|\u2019|\u201A|\uFFFD/g, "'");
    code = code.replace(/\u201c|\u201d|\u201e/g, '"');
    code = code.replace(/\u02C6/g, "^");
    code = code.replace(/\u2039/g, "<");
    code = code.replace(/\u203A/g, ">");
    code = code.replace(/\u2013/g, "-");
    code = code.replace(/\u2014/g, "--");
    code = code.replace(/\u2026/g, "...");
    code = code.replace(/\u00A9/g, "(c)");
    code = code.replace(/\u00AE/g, "(r)");
    code = code.replace(/\u2122/g, "TM");
    code = code.replace(/\u00BC/g, "1/4");
    code = code.replace(/\u00BD/g, "1/2");
    code = code.replace(/\u00BE/g, "3/4");
    code = code.replace(/[\u02DC|\u00A0]/g, " ");

    return code;
  };

  repl.prototype.evalCode = function (code) {
    let result;
    let isError = false;

    code = this.demangleCode(code);

    try {
      // Note: the (0,eval) changes the eval semantics, because
      // JS gives special meaning to eval called under the global name eval,
      // as opposed to any other reference. We want this to act in the global
      // scope, rather than binding to our function scope; so we have to call
      // it with a reference, rather than the global name eval.
      result = (0, eval)(code);

      if (this.printAsObject(result)) {
        // FIXME: do pathToObject sanely
        result = this.formatObject(result, code);
      } else if (result) {
        result = this.escapeHTML(result);
      }
    } catch (e) {
      result = this.generateStackTrace(e);
      isError = true;
    }

    return [result, isError];
  };

  repl.prototype._setVisibilityBySelector = function (
    selector,
    should_show,
    root
  ) {
    root = root || this.root;
    let elements = root.querySelectorAll(selector);

    for (let element of elements) {
      if (should_show) {
        element.style.height = "auto";
        element.style.visibility = "visible";
      } else {
        element.style.height = "0px";
        element.style.visibility = "hidden";
      }
    }
  };

  repl.prototype._filterBySuccessor = function (
    selector,
    should_show,
    should_hide,
    root
  ) {
    root = root || this.root;
    let elements = root.querySelectorAll(selector);

    for (let element of elements) {
      if (element.nextElementSibling) {
        if (element.nextElementSibling.style.visibility != "hidden") {
          element.style.height = "auto";
          element.style.visibility = "visible";
        } else {
          element.style.height = "0px";
          element.style.visibility = "hidden";
        }
      }
    }
  };

  repl.prototype._filterBySelectorAndContents = function (
    selector,
    keyword,
    root,
    includePrevious
  ) {
    root = root || this.root;
    let elements = root.querySelectorAll(selector);

    for (let element of elements) {
      let isMatch;

      if (keyword instanceof RegExp) {
        isMatch = element.innerText.match(keyword);
      } else {
        isMatch = element.innerText.contains(keyword);
      }

      if (isMatch) {
        //element.style.height = "auto";
        //element.style.visibility = "visible";
      } else {
        element.style.height = "0px";
        element.style.visibility = "hidden";
      }
    }
  };

  repl.prototype.defaultToTrue = function (value) {
    if (value === undefined) {
      return true;
    }

    return value;
  };

  repl.prototype.showErrors = function (should_show, root) {
    should_show = this.defaultToTrue(should_show);

    this.showingErrors = should_show;
    this._setVisibilityBySelector(".repl-console-error", should_show, root);
    this.scrollDown();
  };

  repl.prototype.showWarnings = function (should_show, root) {
    should_show = this.defaultToTrue(should_show);

    this.showingWarnings = should_show;
    this._setVisibilityBySelector(".repl-console-warning", should_show, root);
    this.scrollDown();
  };

  repl.prototype.showLogs = function (should_show, root) {
    should_show = this.defaultToTrue(should_show);

    this.showingLogs = should_show;
    this._setVisibilityBySelector(".repl-console-log", should_show, root);
    this.scrollDown();
  };

  repl.prototype.showUndefineds = function (should_show, root) {
    should_show = this.defaultToTrue(should_show);

    this.showingUndefineds = should_show;
    this._setVisibilityBySelector(".repl-result-undefined", should_show, root);
    this.scrollDown();
  };

  repl.prototype.showInfo = function (should_show, root) {
    this.showLogs(should_show, root);
    this.scrollDown();
  };

  repl.prototype.showResults = function (should_show, root) {
    should_show = this.defaultToTrue(should_show);

    this.showingResults = should_show;
    this._setVisibilityBySelector(".repl-log-code", should_show, root);
    this.scrollDown();
  };

  repl.prototype.filterView = function (keyword, root) {
    if (keyword === null) {
      this.unfilterView();
      return;
    }

    this.activeFilter = keyword;
    this._filterBySelectorAndContents(".repl-console-error", keyword, root);
    this._filterBySelectorAndContents(".repl-result-error", keyword, root);
    this._filterBySelectorAndContents(".repl-console-warning", keyword, root);
    this._filterBySelectorAndContents(".repl-result-warning", keyword, root);
    this._filterBySelectorAndContents(".repl-console-log", keyword, root);
    this._filterBySelectorAndContents(".repl-console-log", keyword, root);
    this._filterBySelectorAndContents(".repl-result", keyword, root);
    this._filterBySelectorAndContents(".repl-log-result", keyword, root);
    this._filterBySuccessor(".repl-log-code", root);
    this.scrollDown();
  };

  repl.prototype.unfilterView = function (root) {
    this.activeFilter = null;
    this._setVisibilityBySelector(".repl-console-error", true, root);
    this._setVisibilityBySelector(".repl-result-error", true, root);
    this._setVisibilityBySelector(".repl-console-warning", true, root);
    this._setVisibilityBySelector(".repl-result-warning", true, root);
    this._setVisibilityBySelector(".repl-console-log", true, root);
    this._setVisibilityBySelector(".repl-console-log", true, root);
    this._setVisibilityBySelector(".repl-result", true, root);
    this._setVisibilityBySelector(".repl-log-result", true, root);
    this._setVisibilityBySelector(".repl-log-code", true, root);
    this.scrollDown();
  };

  repl.prototype.applyCurrentFiltersTo = function () {
    let newElement = this.root;

    this.showLogs(this.showingLogs, newElement);
    this.showWarnings(this.showingWarnings, newElement);
    this.showErrors(this.showingErrors, newElement);
    this.showResults(this.showingResults, newElement);
    this.showUndefineds(this.showingUndefineds, newElement);
    this.filterView(this.activeFilter, newElement);
  };

  repl.prototype.extendConsole = function () {
    console.showUndefineds = this.showUndefineds.bind(this);
    console.showUndefs = this.showUndefineds.bind(this);
    console.showErrors = this.showErrors.bind(this);
    console.showWarnings = this.showWarnings.bind(this);
    console.showLogs = this.showLogs.bind(this);
    console.showInfo = this.showInfo.bind(this);
    console.showInfos = this.showInfo.bind(this);
    console.showResults = this.showResults.bind(this);

    console.hideUndefineds = this.showUndefineds.bind(this, false);
    console.hideUndefs = this.showUndefineds.bind(this, false);
    console.hideErrors = this.showErrors.bind(this, false);
    console.hideWarnings = this.showWarnings.bind(this, false);
    console.hideLogs = this.showLogs.bind(this, false);
    console.hideInfo = this.showInfo.bind(this, false);
    console.hideInfos = this.showInfo.bind(this, false);
    console.hideResults = this.showResults.bind(this, false);

    console.filter = this.filterView.bind(this);
    console.unfilter = this.unfilterView.bind(this);
  };

  repl.prototype.splitCompletionComponents = function (str) {
    //
    // NOTE: this heuristic is pretty much definitely not right,
    // but it'll work for now.
    //

    // Get the last whitespace-delineated section of our input.
    let lastPhrase = str.split(/\s/).last();

    // And try to split off our stem.
    for (let i = lastPhrase.length; i > 0; ) {
      // Move backwards through the string.
      // Doing this first ensures we start from the last character.
      --i;

      // If we run into a dot or a [, everything before the char is our
      // stem; and everything after is the thing we're trying to complete.
      if (".[".contains(lastPhrase[i])) {
        const stem = lastPhrase.substr(0, i);
        const rest = lastPhrase.substr(i + 1);

        return [stem, lastPhrase[i], rest];
      }
    }

    // If we didn't run into any of that, the entire thing is the
    // remainder we're trying to complete, and "window" is our
    // implicit stem.
    return ["window", ".", lastPhrase];
  };

  //
  // Handle tab completion.
  //
  repl.prototype.handleTabCompletion = function (shiftHeld, fromButton) {
    let context;

    const currentText = this.editArea.innerText;

    if (!fromButton && currentText === this.lastSuggestionText) {
      this.focusFirstTabSuggestion(shiftHeld);
      return;
    }

    const [contextText, operator, stem] =
      this.splitCompletionComponents(currentText);

    try {
      context = eval(contextText);
    } catch (e) {
      return;
    }

    // If our context isn't an object, we can't complete on it.
    if (typeof context != "object") {
      return;
    }

    // Otherwise, our completion candidates are all of the keys
    // in our context object.
    let candidates = [];
    let potentialCandidates = Object.getOwnPropertyNames(context);

    for (let potentialCandidate of potentialCandidates) {
      if (potentialCandidate.startsWith(stem)) {
        candidates.push(potentialCandidate);
      }
    }

    // If we have exactly one candidate, accept it as a completion.
    if (candidates.length === 1) {
      this.insertTabCompletion(candidates.first(), stem);
    }
    // Otherwise, display a list of tab suggestions.
    else {
      this.displayTabSuggestions(candidates, stem);
      this.lastSuggestionText = currentText;
      this.lastContextText = contextText;
      this.lastOperator = operator;
    }
  };

  repl.prototype.displayTabSuggestions = function (candidates, stem) {
    // Clear any existing suggestions.
    this.clearTabSuggestions();

    // FIXME: move me to somewhere else; this is silly
    // leftover oddness from base code.
    if (!this.currentLog) {
      this.currentLog = new jsrepl.log(this);
    }

    // Special case: if we have no suggestions, indicate so.
    if (candidates.length == 0) {
      /**
       * Uncomment this if you're the kind of sadist who puts the
       * bell (or visual bell) on in your terminal to let you know
       * about failed suggestion attempts. But, seriously, what?
       */
      /*
          this.currentLog.suggestions(
              '<em class="no-suggestions">No suggestions.</em>',
              );
          */
      return;
    }

    // Limit ourselves to a fixed number of suggestions...
    const truncatedCandidates = candidates.slice(
      0,
      jsrepl.config.suggestionLimit
    );
    const wasTruncated = truncatedCandidates.length != candidates.length;

    // ... format those suggestions...
    let formattedCandidates = truncatedCandidates.map((candidate) => {
      let formatted = candidate.replace(stem, `<u><b>${stem}</b></u>`);
      let innerJs = `repl.insertTabCompletion('${candidate}', '${stem}', true); void(0);`;

      // I _think_ we can get away with not escaping these, since the candidates can from an interface where quotes are invalid.
      return `<a class="repl-suggestion" data-suggestion="${candidate}" href="javascript: ${innerJs}">${formatted}</a>`;
    });

    // If this was truncated, add a indicator.
    if (wasTruncated) {
      const remaining = candidates.length - truncatedCandidates.length;

      formattedCandidates.push(
        `<span class="faint">[... ${remaining} omitted.]<span>`
      );
    }

    // Finally, print out the candidates.
    this.currentLog.suggestions(formattedCandidates.join("\t"));
  };

  //
  // Returns true iff the given element is a REPL tab suggestion.
  //
  repl.prototype.isTabSuggestion = function (element) {
    if (element === null) {
      return false;
    }

    if (!element.classList) {
      return false;
    }

    return element.classList.contains("repl-suggestion");
  };

  //
  // Cycles to the next tab suggestion, if possible.
  //
  repl.prototype.handleTabSuggestionCycle = function (currentElement, reverse) {
    let nextElement;

    if (reverse) {
      nextElement = currentElement.previousElementSibling;
    } else {
      nextElement = currentElement.nextElementSibling;
    }

    // Case 1: we have additional suggestions to cycle through.
    // In this case, the next element should be another suggestion.
    if (this.isTabSuggestion(nextElement)) {
      // In this case, we'll just focus that element.
      this.presumeSuggestion(nextElement);
    }

    // Case 2: we're out of suggestions; focus our text editor.
    else {
      this.dropPresumption();
    }
  };

  //
  // Inserts a tab completion into our console.
  //
  repl.prototype.insertTabCompletion = function (
    completion,
    stem,
    acceptPresumes
  ) {
    // If we're presuming a completion, already, we'll just accept it.
    if (acceptPresumes && this.lastSuggestionText != this.editArea.innerText) {
      this.editArea.focus();
    }
    // Otherwise, we'll need to fill in the tab completion.
    else {
      // Remove the stem from our completion, so we have just the part
      // that needs adding. This is a single replace, and the string should
      // have been conditioned such that this always will work.
      const completionToAdd = completion.replace(stem, "");

      // Stick the remainder on our text...
      this.editArea.innerText += completionToAdd;
    }

    // ... clear any existing suggestions ...
    this.clearTabSuggestions();

    // ... and ensure our caret is after it.
    this.setCaretAtEnd();
  };

  //
  // Clears any tab suggestion nodes that have been generated.
  //
  repl.prototype.clearTabSuggestions = function () {
    let elements = this.root.querySelectorAll(".repl-suggestions");
    for (let element of elements) {
      element.remove();
    }

    this.lastSuggestionText = null;
  };

  //
  // Focuses the first tab suggestion; for use with tab cycling.
  //
  repl.prototype.focusFirstTabSuggestion = function (reverse) {
    let elements = this.root.querySelectorAll(".repl-suggestions a");
    let element;

    if (reverse) {
      element = elements[elements.length - 1];
    } else {
      element = elements[0];
    }

    if (element) {
      this.presumeSuggestion(element);
    }
  };

  repl.prototype.presumeSuggestion = function (suggestionElement) {
    let contextText = this.lastContextText;

    if (contextText && this.lastSuggestionText) {
      const contextIsWindow = contextText.startsWith("window");
      const userHadWindow = this.lastSuggestionText.startsWith("window");

      // Special case behavior for things that start with window.
      // We can leave off the "window." without changing anything; so
      // we'll try to match what the user had typed.
      if (contextIsWindow && !userHadWindow) {
        // Trim out the unnecessary "window".
        if (contextText == "window") {
          contextText = "";
        } else {
          contextText = contextText.replace(/^window\./, "");
        }
      }
    } else {
      contextText = "";
    }

    // Use a dot to connect iff we have a previous element.
    let operator = contextText ? "." : "";

    this.editArea.innerText =
      contextText + operator + suggestionElement.dataset.suggestion;
    this.setCaretAtEnd();
    suggestionElement.focus();
  };

  repl.prototype.dropPresumption = function () {
    this.editArea.innerText = this.lastSuggestionText;
    this.editArea.focus();
    this.setCaretAtEnd();
  };

  repl.prototype.acceptPresumption = function () {
    this.clearTabSuggestions();
    this.editArea.focus();
    this.setCaretAtEnd();
  };

  repl.prototype.acceptSuggestionAndProxyEvent = function (e) {};
} // namespace boundary

{
  // namespace boundary

  const repl = jsrepl.repl;

  repl.prototype.resetEditArea = function () {
    this.resetCaret();
    this.editArea.innerHTML = "";
    // this.editArea.textContent = "";

    jsrepl.nebug(this.editArea.innerText);
  };

  repl.prototype.setEditAreaPrevious = function () {
    const code = this.history.previous();
    if (code != null) {
      jsrepl.nebug(code);
      this.editArea.innerHTML = code;
      this.setCaretAtEnd();
    }
  };

  repl.prototype.setEditAreaNext = function () {
    const code = this.history.next();
    this.editArea.innerHTML = code;
  };

  repl.prototype.setCaret = function (pos) {
    const elem = this.editArea;
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(elem.firstChild, pos);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  repl.prototype.setCaretAtEnd = function () {
    const elem = this.editArea;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(elem);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  repl.prototype.resetCaret = function () {
    const pos = 0;

    // It seems this doesn't work somehow.
    // this.setCaret(pos);
  };

  /*
    repl.prototype.setCaretAtEnd = function () {
        const pos = this.editArea.innerHTML.length;
        this.setCaret(pos);
    };
    */

  repl.prototype.clearScreen = function () {
    const h = this.height - this.editArea.offsetHeight;
    this.paddingArea.style.height = h + "px";
    document.body.scrollTop = 1000;

    // this.view.scrollTop = this.view.scrollHeight;
    // this.view.scrollTop = 100;
    // this.paddingArea.scrollIntoView();

    // this.editArea.scrollIntoView(true);

    jsrepl.nebug("clear screen");
    jsrepl.nebug(this.height);
    jsrepl.nebug(this.view.clientHeight);
    jsrepl.nebug(this.view.offsetHeight);
    jsrepl.nebug(this.view.scrollHeight);
    jsrepl.nebug(this.view.scrollTop);
    jsrepl.nebug(this.editArea.clientHeight);
    jsrepl.nebug(this.editArea.offsetHeight);
    jsrepl.nebug(this.paddingArea.clientHeight);
  };

  repl.prototype.handleCancel = function () {
    const log = new jsrepl.log(this);
    this.currentLog = log;

    const code = this.editArea.innerText;

    this.history.push(code);
    log.code(code);

    this.resetEditArea();
  };
} // namespace boundary

{
  // namespace boundary

  const repl = jsrepl.repl;

  repl.prototype.onViewTouchStart = function (e) {
    this.editArea.focus();
  };

  repl.prototype.onEditAreaFocus = function (e) {};

  // FIXME: should this be keyup?
  repl.prototype.onEditAreaKeyDown = function (e) {
    // when ctrl key is pressed.
    if (e.ctrlKey) {
      if (e.key == "l") {
        this.clearScreen();
      } else if (e.key == "p") {
        // History back
        this.setEditAreaPrevious();
        e.preventDefault();
      } else if (e.key == "n") {
        // History forward
        this.setEditAreaNext();
        e.preventDefault();
      }
    } else {
      if (this.editArea.innerText.contains("\n")) {
        return;
      }

      if (e.key == "ArrowUp") {
        // History back
        this.setEditAreaPrevious();
        e.preventDefault();
      } else if (e.key == "ArrowDown") {
        // History forward
        this.setEditAreaNext();
        e.preventDefault();
      }
    }
  };

  repl.prototype.onEditAreaKeyPress = function (e) {
    jsrepl.nebug(e);
    jsrepl.nebug(e.keyCode);
    jsrepl.nebug(e.key);

    if (e.key == "Enter" && !e.shiftKey) {
      this.handleEnterKey(e);
    } else if (e.key == "c") {
      if (e.ctrlKey) {
        this.handleCancel();
      }
    }
  };

  repl.prototype.handleEnterKey = function (event) {
    const code = this.editArea.innerText;

    if (event !== undefined) {
      event.preventDefault();
    }

    this.processCode(code);
  };
} // namespace boundary

{
  // namespace boundary

  const h = jsrepl.hyperscript;

  const log = function (repl) {
    this.repl = repl;
    this.width = repl.width;

    this.codeElem = null;
    this.outputElem = [];
    this.resultElem = null;
  };

  jsrepl.log = log;

  log.prototype.code = function (code) {
    const elem = h(
      "div.repl-log-code",
      h("div.repl-result-prompt", jsrepl.config.prompt),
      h("div.repl-code-text", code)
    );

    this.repl.logArea.appendChild(elem);
  };

  log.prototype.output = function (output) {
    const elem = h(
      "div.output",
      { style: { width: this.width } },
      h("div.repl-log-output", content)
    );

    this.repl.logArea.appendChild(elem);
  };

  log.prototype.suggestions = function (suggestions) {
    this.result(suggestions, "repl-suggestions", "", this.repl.view);
    this.repl.scrollDown();
  };

  log.prototype.result = function (result, klass, prompt, container) {
    klass = klass || "repl-result";
    container = container || this.repl.logArea;
    prompt = prompt === undefined ? jsrepl.config.resultPrompt : prompt;
    let resultText = h("div.repl-result-text", "");
    resultText.innerHTML = result;

    let visibility = "visible";
    let height = "auto";

    if (result === undefined) {
      klass = "repl-result-undefined";
      visibility = this.repl.showingUndefineds ? "visible" : "hidden";
      height = this.repl.showingUndefineds ? "auto" : "0px";
    }

    const elem = h(
      `div.${klass}`,
      h("div.repl-result-prompt", prompt),
      resultText,
      {
        style: {
          visibility: visibility,
          height: height,
        },
      }
    );

    container.appendChild(elem);
  };

  log.prototype.errorResult = function (result) {
    let resultText = h("div.repl-result-error-inner", "");
    resultText.innerHTML = result;

    const elem = h(
      "div.repl-result-error",
      h("div.repl-result-prompt", jsrepl.config.errorPrompt),
      resultText
    );

    this.repl.logArea.appendChild(elem);
  };

  log.prototype.warnResult = function (result) {
    let resultText = h("div.repl-result-warning-inner", "");
    resultText.innerHTML = result;

    const elem = h(
      "div.repl-result-warning",
      h("div.repl-result-prompt", jsrepl.config.warnPrompt),
      resultText
    );

    this.repl.applyCurrentFiltersTo();
    this.repl.logArea.appendChild(elem);
  };
} // namespace boundary

{
  // namespace boundary

  const console = function (repl) {
    this.repl = repl;
  };
} // namespace boundary

/**
 * Hacked-on utility functions for the console.
 */

window.clear = function () {
  repl.logArea.innerHTML = "";
  repl.isClearing = true;
};

/**
 * Start Obsidian plugin.
 */

var obsidian = require("obsidian");

// String that identifies our type of panels.
const VIEW_TYPE_REPL = "repl";

/**
 * The REPL panel itself.
 */
class ReplView extends obsidian.ItemView {
  constructor(leaf) {
    super(leaf);
  }
  getViewType() {
    return VIEW_TYPE_REPL;
  }
  getDisplayText() {
    return "Console";
  }
  getIcon() {
    return "feather-terminal";
  }
  onClose() {}
  async onOpen() {
    const container = this.containerEl.children[1];

    // Create a container to hold our REPL...
    container.empty();
    let element = container.createEl("div", { cls: "obsidian-repl" });

    // .. and squish our REPL into it.
    window.repl = new jsrepl.repl(element);
  }
}

class ObsidianRepl extends obsidian.Plugin {
  async onload() {
    this.registerView(VIEW_TYPE_REPL, (leaf) => new ReplView(leaf));

    // FIXME: remove
    this.addRibbonIcon("feather-terminal", "Open Console", () => {
      this.activateView();
    });
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_REPL);
  }

  async activateView() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_REPL);

    await this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_REPL,
      active: true,
    });

    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_REPL)[0]
    );
  }
}

module.exports = ObsidianRepl;
