"""Utility functions for input sanitization."""

import re


def sanitize_user_input(text: str) -> str:
    """Basic sanitization of user input before sending to LLM."""
    # Remove potential prompt injection attempts
    cleaned = text.strip()
    # Limit length
    if len(cleaned) > 2000:
        cleaned = cleaned[:2000]
    return cleaned
