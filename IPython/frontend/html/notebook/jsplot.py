"""experimental javascript plotting
"""
from IPython.core.display import Javascript

try:
    import simplejson as json
except ImportError:
    import json


def plot(x, y):
    points = [zip(x, y)]
    return Javascript("new IPython.Plot(element, %s);" % json.dumps(points))
