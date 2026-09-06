import logging
from typing import Optional

def setup_logger(name: str = "VoC-Gemini", level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(level)
        try:
            from rich.logging import RichHandler
            handler = RichHandler(rich_tracebacks=True, markup=True)
        except ImportError:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s"))
        logger.addHandler(handler)
    return logger

logger = setup_logger()