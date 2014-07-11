Statsd For Chrome
=================

### Installation:

1. Download and install [Google Chrome](https://www.google.com/intl/en/chrome/browser/)
2. Open the drop down menu at the top right, and navigate to and select "Settings"
3. Select "Extensions" from the left menu bar, and check "Developer mode" on the top right
4. Select "Load unpacked extension..." and select /statsd/chrome/
5. Select "Launch" and you should now have a statsd instance running in your browser!

### What This Does:

* Allows statsd to run in a chrome packaged app (the same type you would download from the chrome app store)
* Uses pure chrome APIs, so node.js is never needed
* Runs in chrome, so it's still using the V8 JavaScript engine, so performance is still great
* Makes statsd very easily portable, since all it relies on is chrome
* The actual interface in the app is specified in app.js, it shows some basic stats and an embedded graphite window, by default
* But the great benefit of this method is that graphite will, in the future, no longer be required, since any browser JavaScript data visualization toolkit could be built as a backend right into the app

### How It Does It:

* While lots of code changes were necessary to make this work, this merge only includes them in source/ and bundle.js, so as not to pollute the main repo
* Uses [browserify](https://github.com/substack/node-browserify) to handle the conversion, with [chrome-net](https://github.com/feross/chrome-net) and [chrome-dgram](https://github.com/feross/chrome-dgram) handling the wrapping of chrome's networking APIs

### Why It Does It:

* This project was done to assist [Ripple Labs](https://www.ripple.com/) in easy tracking and monitoring of data, but the code created is fully general.

### Caveats:

* While the bundled chrome app can be run out of the box as is without any additional installations, browserify is required for compiling a new version, if that is ever needed
* Config editing has to be done inside bundle.js (or config.js if you are planning on re-bundling)--this is unfortunate, but no obvious workaround presented itself

*For more information, including all the code that went into this, see:
<https://github.com/evhub/statsd>*
