IPython = (function(IPython) {

    var utils = IPython.utils;

    var is_date = function(obj) {
        return Object.prototype.toString.call(points.x[0]) === '[object Date]';
    };

    var equals = function (obj1, obj2) {
        if (is_date(obj1)) {
            return obj1.valueOf() === obj2.valueOf();
        }
        else {return obj1 === obj2;}
    };

    var Plot = function(plot_element, segments, format_label) {
        this.w = 800,
        this.h = 300;
        this.segments = segments;
        this.points2d = points2d = d3.merge(segments);
        this.points = points = {
            'x': points2d.map(function(v){return v[0];}),
            'y': points2d.map(function(v){return v[1];})
            };
        this.single_points = segments
            .filter(function (d) {return d.length === 1;})
            .map(function(d) {return d[0];});

        this.x = d3.scale.linear()
                 .domain([d3.min(points.x),
                          d3.max(points.x)])
                 .range([0, this.w]);
        this.y = d3.scale.linear()
                 .domain([d3.max(points.y),
                          d3.min(points.y)])
                 .range([0, this.h]);
        this.format_label = format_label ? format_label : function(point){return "(" + point[0] + ", " + point[1] + ")";};
        this.label_margin = 5;
        this.plot_element = d3.select(plot_element[0]);
        this.uuid = utils.uuid();
        this.zoom_gap = 50;
        this.zoom_h = 40;
        this.zoom_y_scale = this.zoom_h / this.h;
        this.zoom_handle_extra = 5;
        this.zoom_underline_offset = 1;

        this.create_svg();
    };

    Plot.prototype.closest_value_index = function(mouse_x){
        var that = this;
        var bisect_index = d3.bisect(that.points.x, mouse_x);
        if (bisect_index === that.points.x.length || bisect_index === 0) {
            return bisect_index;
        }
        if ((that.points.x[bisect_index - 1] - mouse_x) < (mouse_x - that.points.x[bisect_index])){
            return bisect_index;
        }
        else return bisect_index - 1;
    };

    Plot.prototype.create_svg = function() {
        var that = this;

        var x = this.x,
            y = this.y,
            w = this.w,
            h = this.h,
            points = this.points,
            points2d = this.points2d,
            label_margin = this.label_margin;

        var m = [10, 10, 20, 80],
            title = title ? title : 'graph of data',
            desc = desc ? desc : 'graph of data';

        var x_zoom = this.x_zoom = x.copy(),
            x_axis = this.x_axis = d3.svg.axis().scale(x).tickSize(-h).tickSubdivide(true),
            y_axis = this.y_axis = d3.svg.axis().scale(y).tickSize(-w).ticks(4).orient("left");

        var svg = this.plot_element
            .append("svg:svg")
            .attr("width", w + m[1] + m[3])
            .attr("height", h + m[0] + m[2] + this.zoom_gap + this.zoom_h);

        var main = this.main = svg.append("svg:g")
            .attr("id", "main-" + this.uuid)
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

        var graph = main.append("svg:g")
            .attr("id", "graph-" + this.uuid);

        var clip_id = "clip-" + this.uuid;

        // clip path - don't draw outside this box
        var clip = main.append("svg:clipPath")
            .attr("id", clip_id)
            .append("svg:rect")
            .attr("width", w)
            .attr("height", h);

        graph.attr("clip-path", "url(#" + clip_id + ")");

        // add the area path for data sections
        graph.append("svg:g")
            .attr("class", "graph areas");

        // Add the x-axis.
        main.append("svg:g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + h + ")")
            .call(x_axis);

        // Add the y-axis.
        main.append("svg:g")
            .attr("class", "y axis")
            .call(y_axis);

        // add the line path for data sections
        graph.append("svg:g")
            .attr("class", "graph lines");

        graph.append("svg:g")
            .attr("class", "graph points");

        // add a locator to graph
        var locator = this.locator = main.append("svg:g")
            .attr("class", "locator")
            .attr("visibility", "hidden");
        locator.append("svg:path");
        locator.append("svg:circle")
            .attr("r", 3.);
        var locator_label = this.locator_label = locator.append("svg:g")
            .attr("class", "locator-label");
        locator_label.append("svg:rect");
        locator_label.append("svg:text")
            .attr("dx", label_margin);

        // add a hitbox for grabbing mouseover events on the main time
        // series graph per SVG spec, pointer-events can only be applied
        // to graphics elements
        // note: possibly a bug in Firefox: if you attach this hitbox
        // rectangle to g#graph, events on the rect don't get dispatched
        var graph_hitbox = main.append("svg:rect")
            .attr("width", w)
            .attr("height", h)
            .attr("visibility", "hidden")
            .attr("pointer-events", "all");

        var zoom_offset = h + m[0] + this.zoom_gap;
        var zoom_context = this.zoom_context = svg.append("svg:g")
            .attr("class", "zoom-context")
            .attr("transform", "translate(" + m[3] + ", " + zoom_offset + ")");
        var zoom_graph = this.zoom_context.append("svg:g")
            .attr("class", "zoom-graph")
            .attr("transform", "scale(1," + this.zoom_y_scale + ")");
        zoom_graph.append("svg:g")
            .attr("class", "graph areas");
        zoom_graph.append("svg:g")
            .attr("class", "graph lines");
        zoom_graph.append("svg:g")
            .attr("class", "graph points");

        this.zoom_box_under_line = zoom_context.append("svg:path")
                .attr("class", "zoom-box-under-line");
        this.zoom_box = zoom_context.append("svg:rect")
                .attr("class", "zoom-box")
                .attr("pointer-events", "all")
                .attr("visibility", "hidden")
                .attr("height", this.zoom_h);
        this.zoom_box_left_mask = zoom_context.append("svg:rect")
                .attr("class", "zoom-box-mask")
                .attr("height", this.zoom_h);
        this.zoom_box_right_mask = zoom_context.append("svg:rect")
                .attr("class", "zoom-box-mask")
                .attr("height", this.zoom_h);
        this.zoom_box_left_handle = zoom_context.append("svg:path")
                .attr("class", "zoom-box-handle left");
        this.zoom_box_right_handle = zoom_context.append("svg:path")
                .attr("class", "zoom-box-handle right");

        // resize domain to be a little further out
        var y_domain_offset = (y.domain()[1] - y.domain()[0]) * .025;
        y.domain([y.domain()[0] - y_domain_offset, y.domain()[1] + y_domain_offset]);

        // SVG line generator
        var line = this.line = d3.svg.line()
            .x(function(d) {return x(d[0]);})
            .y(function(d) {return y(d[1]);});

        // SVG area generator, for the fill
        var area = this.area = d3.svg.area()
            .x(function(d) { return x(d[0]); })
            .y0(h)
            .y1(function(d) { return y(d[1]); });

        this.render(graph);
        this.render(zoom_graph);

        // set up locator mouse events
        graph_hitbox.on("mousemove", function(d) {
            var mouse = d3.svg.mouse(this);
            that.move_locator(mouse);
        });

        graph_hitbox.on("mouseout", function (d) {
            locator
                .attr("visibility", "hidden");
        });

        graph_hitbox.on("mouseover", function (d) {
            locator
                .attr("visibility", "visible");
        });

        // note: this is all a bit hacky but d3.behavior.zoom() is
        //       being refactored to work with domain extents, so it
        //       should be possible for all of this to look a whole
        //       lot simpler/cleaner very soon. See PR:
        //       https://github.com/mbostock/d3/pull/488
        this.previous_zoom_scale = 1;
        graph_hitbox.call(d3.behavior.zoom().on("zoom", function() {
            var orig_domain = that.x.domain(),
                entire_domain = that.x_zoom.domain();
            d3.event.transform(that.x);

            // don't zoom beyond our range of x values
            if(that.x.domain()[0] < entire_domain[0]) {
                that.x.domain([entire_domain[0], that.x.domain()[1]]);
            };
            if(that.x.domain()[1] > entire_domain[1]) {
                that.x.domain([that.x.domain()[0], entire_domain[1]]);
            };

            // if we're at an edge and dragging closer to that edge,
            // then we don't want to change anything
            var new_domain = that.x.domain();
            var domain_size_change = (orig_domain[1] - orig_domain[0]) - (new_domain[1] - new_domain[0]);
            var scale_change = (that.previous_zoom_scale - d3.event.scale);
            if (!scale_change && domain_size_change.toFixed(10)) {
                if (equals(new_domain[0], entire_domain[0]) || equals(new_domain[1], entire_domain[1])) {
                    that.x.domain(orig_domain);
                }
            };

            that.render(graph);
            that.previous_zoom_scale = d3.event.scale;
        }));

        // Adjust graph when dragging the zoom box
        this.zoom_box.call(d3.behavior.drag().on("drag", function(d, i){
            new_start = x_zoom.invert(x_zoom(x.domain()[0]) + d3.event.dx);
            new_end = x_zoom.invert(x_zoom(x.domain()[1]) + d3.event.dx);

            if (x_zoom.domain()[0] < new_start && new_end < x_zoom.domain()[1]){
                x.domain([new_start, new_end]);
                that.render(graph);
            }
        }));

        // Adjust graph when dragging left zoom handle
        this.zoom_box_left_handle.call(d3.behavior.drag().on("drag", function(d, i){
            new_start = x_zoom.invert(x_zoom(x.domain()[0]) + d3.event.dx);

            if (x_zoom.domain()[0] < new_start && new_start < x.domain()[1]){
                x.domain([new_start, x.domain()[1]]);
                that.render(graph);
            }
        }));

        // Adjust graph when dragging right zoom handle
        this.zoom_box_right_handle.call(d3.behavior.drag().on("drag", function(d, i){
            new_end = x_zoom.invert(x_zoom(x.domain()[1]) + d3.event.dx);

            if (new_end < x_zoom.domain()[1] && x.domain()[0] < new_end){
                x.domain([x.domain()[0], new_end]);
                that.render(graph);
            }
        }));
    };

    Plot.prototype.move_locator = function(mouse){
        var x = this.x,
            y = this.y,
            h = this.h,
            w = this.w,
            points = this.points,
            points2d = this.points2d,
            locator = this.locator,
            locator_label = this.locator_label,
            label_margin = this.label_margin;

        // note: there's a bug in WebKit/Chrome where pointer is
        // offset if window is zoomed

        // get x value where the mouse pointer is
        var mouse_x = x.invert(mouse[0]);

        var closest_point = points2d[this.closest_value_index(mouse_x)];

        // catch cases where closest_point is off the edge of the
        // graph; this is necessary due to FF workaround (see:
        // comments near graph_hitbox above)
        if (closest_point === undefined){
            return;
        }
        var x_value = x(closest_point[0]);
        var y_value = y(closest_point[1]);
        locator.select("path")
            .attr("d", d3.svg.line()([[x_value, 0], [x_value, h]]));
        locator.select("circle")
            .attr("cx", x_value)
            .attr("cy", y_value);
        locator_label.select("text")
            .text(this.format_label(closest_point));
        var text_bbox = locator_label.select("text")[0][0].getBBox();
        var x_offset = (x_value + text_bbox.width) < w ? x_value : x_value - text_bbox.width - label_margin * 2,
        y_offset = (y_value - text_bbox.height);
        locator_label
            .attr("transform", "translate(" + x_offset + ", 0)");
        locator_label.select("text")
            .attr("dy", text_bbox.height);
        locator_label.select("rect")
            .attr("width", text_bbox.width + label_margin * 2)
            .attr("height", text_bbox.height + label_margin);
    };

    Plot.prototype.render = function(context){
        var that = this;
        var graph_areas = context.select(".graph.areas");
        var graph_lines = context.select(".graph.lines");
        var graph_points = context.select(".graph.points");
        var x = this.x,
            y = this.y,
            h = this.h;

        var single_points = this.single_points;

        that.main.select(".x.axis").call(that.x_axis);

        var area_select = graph_areas.selectAll("path.area").data(that.segments);
        area_select.enter()
            .insert("svg:path")
            .attr("class", "area")
            .attr("d", function(d){return that.area(d);});
        area_select
            .attr("d", function(d){return that.area(d);});
        area_select.exit().remove();

        var line_select = graph_lines.selectAll("path.line").data(that.segments);
        line_select.enter()
            .insert("svg:path") .attr("class", "line")
            .attr("d", function(d){return that.line(d);});
        line_select
            .attr("d", function(d){return that.line(d);});
        line_select.exit().remove();

        var point_select = graph_points.selectAll("circle").data(single_points);
        point_select.enter()
            .insert("svg:circle")
            .attr("class", "point")
            .attr("r", 1)
            .attr("cx", function(d){return x(d[0]);})
            .attr("cy", function(d){return y(d[1]);});
        point_select
            .attr("cx", function(d){return x(d[0]);})
            .attr("cy", function(d){return y(d[1]);});
        point_select.exit().remove();

        var point_line_select = graph_points.selectAll("path.line").data(single_points);
        point_line_select.enter()
            .insert("svg:path")
            .attr("class", "line")
            .attr("d", function(d){
                return d3.svg.line()([[x(d[0]), y(d[1])], [x(d[0]), h]]);});
        point_line_select
            .attr("class", "line")
            .attr("d", function(d){
                return d3.svg.line()([[x(d[0]), y(d[1])], [x(d[0]), h]]);});
        point_line_select.exit().remove();


        that.update_zoom_box();
    };

    Plot.prototype.update_zoom_box = function(){
        var that = this;

        var x = that.x,
            x_zoom = that.x_zoom,
            zoom_h = that.zoom_h,
            zoom_handle_extra = that.zoom_handle_extra,
            zoom_underline_offset = that.zoom_underline_offset;

        var left_side = x_zoom(x.domain()[0]);
        var right_side = x_zoom(x.domain()[1]);

        that.zoom_box_left_mask
            .attr("width", left_side > 0 ? left_side : 0);
        that.zoom_box_left_handle
            .attr("d", d3.svg.line()([[left_side, 0 - zoom_handle_extra], [left_side, zoom_h]]));
        that.zoom_box
            .attr("x", left_side)
            .attr("width", right_side - left_side);
        that.zoom_box_under_line
            .attr("d", d3.svg.line()([[left_side, zoom_h - zoom_underline_offset], [right_side, zoom_h - zoom_underline_offset]]));
        that.zoom_box_right_handle
            .attr("d", d3.svg.line()([[right_side, 0 - zoom_handle_extra], [right_side, zoom_h]]));
        that.zoom_box_right_mask
            .attr("x", right_side)
            .attr("width", that.w - right_side > 0 ? that.w - right_side : 0);
    };

    IPython.Plot = Plot;

    return IPython;
}(IPython));
