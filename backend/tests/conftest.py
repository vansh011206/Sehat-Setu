"""
Pytest configuration and global fixtures for SehatSetu test suite.
"""

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def clear_cache_and_disable_throttling(settings):
    """
    Clears Django cache and disables rate limit throttling across unit tests
    to prevent test suite throttle collisions (429 Too Many Requests).
    """
    cache.clear()
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_CLASSES": [],
    }
