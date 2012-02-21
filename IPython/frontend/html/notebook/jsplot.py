"""experimental javascript plotting
"""
import sys

from IPython.core.display import display, Javascript

try:
    import simplejson as json
except ImportError:
    import json


def plot(x, y):
    points = [zip(x, y)]
    return Javascript("new IPython.Plot(element, %s);" % json.dumps(points))


def line(x, y):
    plot_ctx = current_plot_context()
    plot_ctx.points.append(zip(x, y))


class plot_context:
    def __enter__(self):
        plot_ctx = current_plot_context()
        plot_ctx.points = []
        plot_ctx.instructions = []

    def __exit__(self, type, value, traceback):
        plot_ctx = current_plot_context()
        js_instructions = [instruction.render_to("plot")
                           for instruction in plot_ctx.instructions]
        init_plot_js = "var plot = new IPython.Plot(element)"
        js_str = ';'.join([init_plot_js] + js_instructions)
        display(Javascript(js_str))


def current_plot_context():
    """returns the current plot context"""
    return sys.modules[__name__]


class Line(object):
    def __init__(self, x, y):
        self.points = [zip(x, y)]
        plot_ctx = current_plot_context()
        plot_ctx.instructions.append(self)

    def render_to(self, js_plot_var):
        return "%s.add_graph_element(new IPython.Plot.Line(%s))" % (
            js_plot_var, json.dumps(self.points))


class Area(object):
    def __init__(self, x, y):
        self.points = [zip(x, y)]
        plot_ctx = current_plot_context()
        plot_ctx.instructions.append(self)

    def render_to(self, js_plot_var):
        return "%s.add_graph_element(new IPython.Plot.Area(%s))" % (
            js_plot_var, json.dumps(self.points))
