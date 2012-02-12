"""experimental javascript plotting
"""
from IPython.core.display import Javascript

try:
    import simplejson as json
except ImportError:
    import json


def plot(x, y):
    points = {'x': x, 'y': y}
    return Javascript("plot(element, %s);" % json.dumps(points))
