IPython = (function(IPython) {

    var utils = IPython.utils;

    var Plot = function(element, points) {
        this.w = 800,
        this.h = 300;
        this.x = d3.scale.linear()
                 .domain([d3.min(points.x),
                          d3.max(points.x)])
                  .range([0, this.w]),
        this.y = d3.scale.linear()
                 .domain([d3.max(points.y),
                          d3.min(points.y)])
                 .range([0, this.h]);
        this.label_margin = 5;
        this.points = points;
        this.points2d = d3.zip(points.x, points.y);
        this.plot_element = d3.select(element[0]);
        this.uuid = utils.uuid();

        this.create_svg();
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

        var xAxis = d3.svg.axis().scale(x).tickSize(-h).tickSubdivide(true),
            yAxis = d3.svg.axis().scale(y).tickSize(-w).ticks(4).orient("left");

        var svg = this.plot_element
            .append("svg:svg")
            .attr("width", w + m[1] + m[3])
            .attr("height", h + m[0] + m[2]);

        var main = svg.append("svg:g")
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

        graph.attr("clip-path", "url(" + clip_id + ")");

        // add the area path for data sections
        graph.append("svg:g")
            .attr("class", "graph areas");

        // Add the x-axis.
        main.append("svg:g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + h + ")")
            .call(xAxis);

        // Add the y-axis.
        main.append("svg:g")
            .attr("class", "y axis")
            .call(yAxis);

        // add the line path for data sections
        graph.append("svg:g")
            .attr("class", "graph lines");

        graph.append("svg:g")
            .attr("class", "graph points");

        // add a locator to graph
        var locator = main.append("svg:g")
            .attr("class", "locator");
        locator.append("svg:path");
        locator.append("svg:circle")
            .attr("r", 3.);
        var locator_label = locator.append("svg:g")
            .attr("class", "locator-label");
        locator_label.append("svg:rect");
        locator_label.append("svg:text")
            .attr("dx", label_margin);

        this.locator = locator;
        this.locator_label = locator_label;

        // add a hitbox for grabbing mouseover events on the main time
        // series graph per SVG spec, pointer-events can only be applied
        // to graphics elements
        // note: possibly a bug in Firefox: if you attach this hitbox
        // rectangle to g#graph, events on the rect don't get dispatched
        var graphHitbox = main.append("svg:rect")
            .attr("id", "hitbox")
            .attr("width", w)
            .attr("height", h)
            .attr("visibility", "hidden")
            .attr("pointer-events", "all");


        // resize domain to be a little further out
        var y_domain_offset = (y.domain()[1] - y.domain()[0]) * .025;
        y.domain([y.domain()[0] - y_domain_offset, y.domain()[1] + y_domain_offset]);

        // SVG line generator
        var line = d3.svg.line()
            .x(function(d) {return x(d[0]);})
            .y(function(d) {return y(d[1]);});

        // SVG area generator, for the fill
        var area = d3.svg.area()
            .x(function(d) { return x(d[0]); })
            .y0(h)
            .y1(function(d) { return y(d[1]); });

        var areas = graph.select(".graph.areas");
        var lines = graph.select(".graph.lines");

        main.select(".x.axis").call(xAxis);

        var areaSelect = areas.selectAll("path.area").data([points2d]);
        areaSelect.enter()
            .insert("svg:path")
            .attr("class", "area")
            .attr("d", function(d){return area(d);});
        areaSelect
            .attr("d", function(d){return area(d);});
        areaSelect.exit().remove();

        var lineSelect = lines.selectAll("path.line").data([points2d]);
        lineSelect.enter()
            .insert("svg:path") .attr("class", "line")
            .attr("d", function(d){return line(d);});
        lineSelect
            .attr("d", function(d){return line(d)});
        lineSelect.exit().remove();

        // set up locator mouse events
        graphHitbox.on("mousemove", function(d) {
            var mouse = d3.svg.mouse(this);
            that.move_locator(mouse);
        });

        graphHitbox.on("mouseout", function (d) {
            locator
                .attr("visibility", "hidden");
        });

        graphHitbox.on("mouseover", function (d) {
            locator
                .attr("visibility", "visible");
        });

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
        // comments near graphHitbox above)
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
            .text("(" + closest_point[0] + ", " + closest_point[1] + ")");
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

    IPython.Plot = Plot;

    return IPython;
}(IPython));
