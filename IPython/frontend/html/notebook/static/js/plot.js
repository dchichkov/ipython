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
        this.points = points;
        this.plot_element = d3.select(element[0])
        this.uuid = utils.uuid();

        this.create_svg();
    };

    Plot.prototype.create_svg = function() {
        var x = this.x,
            y = this.y,
            w = this.w,
            h = this.h,
            points = this.points;

        var m = [10, 10, 20, 80],
            title = title ? title : 'graph of data',
            desc = desc ? desc : 'graph of data';

        var xAxis = d3.svg.axis().scale(x).tickSize(-h).tickSubdivide(true),
            yAxis = d3.svg.axis().scale(y).tickSize(-w).ticks(4).orient("left");

        var points2d = d3.zip(points.x, points.y);

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

        // resize domain to be a little further out
        var yDomOffset = (y.domain()[1] - y.domain()[0]) * .025
        y.domain([y.domain()[0] - yDomOffset, y.domain()[1] + yDomOffset])

        // SVG line generator
        var line = d3.svg.line()
            .x(function(d) {return x(d[0])})
            .y(function(d) {return y(d[1])});

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
            .attr("d", function(d){return area(d)});
        areaSelect
            .attr("d", function(d){return area(d)});
        areaSelect.exit().remove();

        var lineSelect = lines.selectAll("path.line").data([points2d]);
        lineSelect.enter()
            .insert("svg:path")
            .attr("class", "line")
            .attr("d", function(d){return line(d)});
        lineSelect
            .attr("d", function(d){return line(d)});
        lineSelect.exit().remove();
    };

    IPython.Plot = Plot;

    return IPython;
}(IPython));







