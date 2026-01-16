"""
Thumbnail generation service for stream previews.
Uses ffmpeg to capture frames from HLS/RTSP streams.
"""
import os
import subprocess
import logging
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Thumbnail settings
THUMBNAIL_DIR = os.getenv('THUMBNAIL_DIR', '/tmp/thumbnails')
THUMBNAIL_WIDTH = int(os.getenv('THUMBNAIL_WIDTH', '320'))
THUMBNAIL_HEIGHT = int(os.getenv('THUMBNAIL_HEIGHT', '180'))
THUMBNAIL_QUALITY = int(os.getenv('THUMBNAIL_QUALITY', '80'))
THUMBNAIL_CACHE_SECONDS = int(os.getenv('THUMBNAIL_CACHE_SECONDS', '300'))
FFMPEG_TIMEOUT = int(os.getenv('FFMPEG_TIMEOUT', '10'))

# HLS port (same as in streams.py)
HLS_PORT = int(os.getenv('MEDIAMTX_HLS_PORT', '8893'))


class ThumbnailService:
    """Service for generating and managing stream thumbnails."""

    def __init__(self):
        self.thumbnail_dir = Path(THUMBNAIL_DIR)
        self.thumbnail_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Thumbnail service initialized, dir: {self.thumbnail_dir}")

    def _get_thumbnail_path(self, stream_path: str, node_id: int) -> Path:
        """Get the thumbnail file path for a stream."""
        # Use hash to create safe filename
        key = f"{node_id}_{stream_path}"
        filename = hashlib.md5(key.encode()).hexdigest() + ".jpg"
        return self.thumbnail_dir / filename

    def _get_hls_url(self, stream_path: str, node_api_url: str) -> str:
        """Derive HLS URL from node API URL."""
        parsed = urlparse(node_api_url)
        return f"http://{parsed.hostname}:{HLS_PORT}/{stream_path}/index.m3u8"

    def _is_thumbnail_fresh(self, thumb_path: Path) -> bool:
        """Check if thumbnail is still fresh (within cache time)."""
        if not thumb_path.exists():
            return False

        mtime = datetime.fromtimestamp(thumb_path.stat().st_mtime)
        return datetime.now() - mtime < timedelta(seconds=THUMBNAIL_CACHE_SECONDS)

    def generate_thumbnail(
        self,
        stream_path: str,
        node_id: int,
        node_api_url: str,
        force: bool = False
    ) -> Optional[str]:
        """
        Generate a thumbnail for a stream.

        Args:
            stream_path: The stream path in MediaMTX
            node_id: The node ID
            node_api_url: The node's API URL
            force: Force regeneration even if cached

        Returns:
            Path to the thumbnail file, or None if failed
        """
        thumb_path = self._get_thumbnail_path(stream_path, node_id)

        # Check cache
        if not force and self._is_thumbnail_fresh(thumb_path):
            logger.debug(f"Using cached thumbnail for {stream_path}")
            return str(thumb_path)

        # Get HLS URL
        hls_url = self._get_hls_url(stream_path, node_api_url)

        try:
            # Use ffmpeg to capture a frame from HLS stream
            cmd = [
                'ffmpeg',
                '-y',  # Overwrite output
                '-i', hls_url,
                '-vframes', '1',  # Capture 1 frame
                '-vf', f'scale={THUMBNAIL_WIDTH}:{THUMBNAIL_HEIGHT}',
                '-q:v', str(100 - THUMBNAIL_QUALITY),  # Quality (lower is better for ffmpeg)
                '-f', 'image2',
                str(thumb_path)
            ]

            logger.debug(f"Running ffmpeg for {stream_path}: {' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=FFMPEG_TIMEOUT,
                text=True
            )

            if result.returncode == 0 and thumb_path.exists():
                logger.info(f"Generated thumbnail for {stream_path}")
                return str(thumb_path)
            else:
                logger.warning(f"ffmpeg failed for {stream_path}: {result.stderr[:200]}")
                return None

        except subprocess.TimeoutExpired:
            logger.warning(f"Thumbnail generation timeout for {stream_path}")
            return None
        except Exception as e:
            logger.error(f"Error generating thumbnail for {stream_path}: {e}")
            return None

    def get_cached_thumbnail(
        self,
        stream_path: str,
        node_id: int
    ) -> Optional[str]:
        """
        Get cached thumbnail only (no generation).

        Returns:
            Path to thumbnail file if exists and fresh, None otherwise
        """
        thumb_path = self._get_thumbnail_path(stream_path, node_id)

        if self._is_thumbnail_fresh(thumb_path):
            return str(thumb_path)

        return None

    def get_thumbnail(
        self,
        stream_path: str,
        node_id: int,
        node_api_url: str
    ) -> Optional[str]:
        """
        Get thumbnail for a stream (generate if needed).

        Returns:
            Path to thumbnail file, or None if not available
        """
        thumb_path = self._get_thumbnail_path(stream_path, node_id)

        # Return cached if fresh
        if self._is_thumbnail_fresh(thumb_path):
            return str(thumb_path)

        # Generate new thumbnail
        return self.generate_thumbnail(stream_path, node_id, node_api_url)

    def get_thumbnail_url(self, stream_path: str, node_id: int) -> str:
        """Get the API URL for a stream's thumbnail."""
        key = f"{node_id}_{stream_path}"
        filename = hashlib.md5(key.encode()).hexdigest()
        return f"/api/streams/thumbnail/{filename}.jpg"

    def cleanup_old_thumbnails(self, max_age_hours: int = 24):
        """Remove thumbnails older than max_age_hours."""
        cutoff = datetime.now() - timedelta(hours=max_age_hours)
        removed = 0

        for thumb_file in self.thumbnail_dir.glob("*.jpg"):
            mtime = datetime.fromtimestamp(thumb_file.stat().st_mtime)
            if mtime < cutoff:
                thumb_file.unlink()
                removed += 1

        if removed:
            logger.info(f"Cleaned up {removed} old thumbnails")

        return removed


# Singleton instance
thumbnail_service = ThumbnailService()
