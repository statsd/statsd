/*
Flot plugin for selecting regions.

The plugin defines the following options:

  selection: {
    mode: null or "x" or "y" or "xy",
    color: color
  }

You enable selection support by setting the mode to one of "x", "y" or
"xy". In "x" mode, the user will only be able to specify the x range,
similarly for "y" mode. For "xy", the selection becomes a rectangle
where both ranges can be specified. "color" is color of the selection.

When selection support is enabled, a "plotselected" event will be emitted
on the DOM element you passed into the plot function. The event
handler gets one extra parameter with the ranges selected on the axes,
like this:

  placeholder.bind("plotselected", function(event, ranges) {
    alert("You selected " + ranges.xaxis.from + " to " + ranges.xaxis.to)
    // similar for yaxis, secondary axes are in x2axis
    // and y2axis if present
  });

The "plotselected" event is only fired when the user has finished
making the selection. A "plotselecting" event is fired during the
process with the same parameters as the "plotselected" event, in case
you want to know what's happening while it's happening,

A "plotunselected" event with no arguments is emitted when the user
clicks the mouse to remove the selection.

The plugin allso adds the following methods to the plot object:

- setSelection(ranges, preventEvent)

  Set the selection rectangle. The passed in ranges is on the same
  form as returned in the "plotselected" event. If the selection
  mode is "x", you should put in either an xaxis (or x2axis) object,
  if the mode is "y" you need to put in an yaxis (or y2axis) object
  and both xaxis/x2axis and yaxis/y2axis if the selection mode is
  "xy", like this:

    setSelection({ xaxis: { from: 0, to: 10 }, yaxis: { from: 40, to: 60 } });

  setSelection will trigger the "plotselected" event when called. If
  you don't want that to happen, e.g. if you're inside a
  "plotselected" handler, pass true as the second parameter.
  
- clearSelection(preventEvent)

  Clear the selection rectangle. Pass in true to avoid getting a
  "plotunselected" event.

- getSelection()

  Returns the current selection in the same format as the
  "plotselected" event. If there's currently no selection, the
  function returns null.

*/

(function ($) {
    function init(plot) {
        var selection = {
                first: { x: -1, y: -1}, second: { x: -1, y: -1},
                show: false,
                active: false
            };

        // FIXME: The drag handling implemented here should be
        // abstracted out, there's some similar code from a library in
        // the navigation plugin, this should be massaged a bit to fit
        // the Flot cases here better and reused. Doing this would
        // make this plugin much slimmer.
        var savedhandlers = {};

        function onMouseMove(e) {
            if (selection.active) {
                plot.getPlaceholder().trigger("plotselecting", [ getSelection() ]);

                updateSelection(e);
            }
        }

        function onMouseDown(e) {
            if (e.which != 1)  // only accept left-click
                return;
            
            // cancel out any text selections
            document.body.focus();

            // prevent text selection and drag in old-school browsers
            if (document.onselectstart !== undefined && savedhandlers.onselectstart == null) {
                savedhandlers.onselectstart = document.onselectstart;
                document.onselectstart = function () { return false; };
            }
            if (document.ondrag !== undefined && savedhandlers.ondrag == null) {
                savedhandlers.ondrag = document.ondrag;
                document.ondrag = function () { return false; };
            }

            setSelectionPos(selection.first, e);

            selection.active = true;
            
            $(document).one("mouseup", onMouseUp);
        }

        function onMouseUp(e) {
            // revert drag stuff for old-school browsers
            if (document.onselectstart !== undefined)
                document.onselectstart = savedhandlers.onselectstart;
            if (document.ondrag !== undefined)
                document.ondrag = savedhandlers.ondrag;

            // no more draggy-dee-drag
            selection.active = false;
            updateSelection(e);

            if (selectionIsSane())
                triggerSelectedEvent();
            else {
                // this counts as a clear
                plot.getPlaceholder().trigger("plotunselected", [ ]);
                plot.getPlaceholder().trigger("plotselecting", [ null ]);
            }

            return false;
        }

        function getSelection() {
            if (!selectionIsSane())
                return null;

            var x1 = Math.min(selection.first.x, selection.second.x),
                x2 = Math.max(selection.first.x, selection.second.x),
                y1 = Math.max(selection.first.y, selection.second.y),
                y2 = Math.min(selection.first.y, selection.second.y);

            var r = {};
            var axes = plot.getAxes();
            if (axes.xaxis.used)
                r.xaxis = { from: axes.xaxis.c2p(x1), to: axes.xaxis.c2p(x2) };
            if (axes.x2axis.used)
                r.x2axis = { from: axes.x2axis.c2p(x1), to: axes.x2axis.c2p(x2) };
            if (axes.yaxis.used)
                r.yaxis = { from: axes.yaxis.c2p(y1), to: axes.yaxis.c2p(y2) };
            if (axes.y2axis.used)
                r.y2axis = { from: axes.y2axis.c2p(y1), to: axes.y2axis.c2p(y2) };
            return r;
        }

        function triggerSelectedEvent() {
            var r = getSelection();

            plot.getPlaceholder().trigger("plotselected", [ r ]);

            // backwards-compat stuff, to be removed in future
            var axes = plot.getAxes();
            if (axes.xaxis.used && axes.yaxis.used)
                plot.getPlaceholder().trigger("selected", [ { x1: r.xaxis.from, y1: r.yaxis.from, x2: r.xaxis.to, y2: r.yaxis.to } ]);
        }

        function clamp(min, value, max) {
            return value < min? min: (value > max? max: value);
        }

        function setSelectionPos(pos, e) {
            var o = plot.getOptions();
            var offset = plot.getPlaceholder().offset();
            var plotOffset = plot.getPlotOffset();
            pos.x = clamp(0, e.pageX - offset.left - plotOffset.left, plot.width());
            pos.y = clamp(0, e.pageY - offset.top - plotOffset.top, plot.height());

            if (o.selection.mode == "y")
                pos.x = pos == selection.first? 0: plot.width();

            if (o.selection.mode == "x")
                pos.y = pos == selection.first? 0: plot.height();
        }

        function updateSelection(pos) {
            if (pos.pageX == null)
                return;

            setSelectionPos(selection.second, pos);
            if (selectionIsSane()) {
                selection.show = true;
                plot.triggerRedrawOverlay();
            }
            else
                clearSelection(true);
        }

        function clearSelection(preventEvent) {
            if (selection.show) {
                selection.show = false;
                plot.triggerRedrawOverlay();
                if (!preventEvent)
                    plot.getPlaceholder().trigger("plotunselected", [ ]);
            }
        }

        function setSelection(ranges, preventEvent) {
            var axis, range, axes = plot.getAxes();
            var o = plot.getOptions();

            if (o.selection.mode == "y") {
                selection.first.x = 0;
                selection.second.x = plot.width();
            }
            else {
                axis = ranges["xaxis"]? axes["xaxis"]: (ranges["x2axis"]? axes["x2axis"]: axes["xaxis"]);
                range = ranges["xaxis"] || ranges["x2axis"] || { from:ranges["x1"], to:ranges["x2"] }
                selection.first.x = axis.p2c(Math.min(range.from, range.to));
                selection.second.x = axis.p2c(Math.max(range.from, range.to));
            }

            if (o.selection.mode == "x") {
                selection.first.y = 0;
                selection.second.y = plot.height();
            }
            else {
                axis = ranges["yaxis"]? axes["yaxis"]: (ranges["y2axis"]? axes["y2axis"]: axes["yaxis"]);
                range = ranges["yaxis"] || ranges["y2axis"] || { from:ranges["y1"], to:ranges["y2"] }
                selection.first.y = axis.p2c(Math.min(range.from, range.to));
                selection.second.y = axis.p2c(Math.max(range.from, range.to));
            }

            selection.show = true;
            plot.triggerRedrawOverlay();
            if (!preventEvent)
                triggerSelectedEvent();
        }

        function selectionIsSane() {
            var minSize = 5;
            return Math.abs(selection.second.x - selection.first.x) >= minSize &&
                Math.abs(selection.second.y - selection.first.y) >= minSize;
        }

        plot.clearSelection = clearSelection;
        plot.setSelection = setSelection;
        plot.getSelection = getSelection;

        plot.hooks.bindEvents.push(function(plot, eventHolder) {
            var o = plot.getOptions();
            if (o.selection.mode != null)
                eventHolder.mousemove(onMouseMove);

            if (o.selection.mode != null)
                eventHolder.mousedown(onMouseDown);
        });


        plot.hooks.drawOverlay.push(function (plot, ctx) {
            // draw selection
            if (selection.show && selectionIsSane()) {
                var plotOffset = plot.getPlotOffset();
                var o = plot.getOptions();

                ctx.save();
                ctx.translate(plotOffset.left, plotOffset.top);

                var c = $.color.parse(o.selection.color);

                ctx.strokeStyle = c.scale('a', 0.8).toString();
                ctx.lineWidth = 1;
                ctx.lineJoin = "round";
                ctx.fillStyle = c.scale('a', 0.4).toString();

                var x = Math.min(selection.first.x, selection.second.x),
                    y = Math.min(selection.first.y, selection.second.y),
                    w = Math.abs(selection.second.x - selection.first.x),
                    h = Math.abs(selection.second.y - selection.first.y);

                ctx.fillRect(x, y, w, h);
                ctx.strokeRect(x, y, w, h);

                ctx.restore();
            }
        });
    }

    $.plot.plugins.push({
        init: init,
        options: {
            selection: {
                mode: null, // one of null, "x", "y" or "xy"
                color: "#e8cfac"
            }
        },
        name: 'selection',
        version: '1.0'
    });
})(jQuery);
