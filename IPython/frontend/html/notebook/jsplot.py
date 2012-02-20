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

    def __exit__(self, type, value, traceback):
        plot_ctx = current_plot_context()
        js = Javascript("new IPython.Plot(element, %s);" % json.dumps(
            plot_ctx.points))
        display(js)


def current_plot_context():
    """returns the current plot context"""
    return sys.modules[__name__]
